import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STAGES, LEVEL_GROUPS, SCENARIO_KINDS, MILESTONE_STATUSES, type MechanicsRegister, type EvidenceLink, type State, type Mechanic, type Stage } from './mechanics-types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const labels = { mapping: 'Mapped', reference: 'Reference evidence', rules: 'Rules tests', playable: 'Playable scenario', integration: 'Integration tests', recovery: 'Save / retry', acceptance: 'Original-level acceptance', hardware: 'Physical play' };
const states: Record<State, string> = { open: 'Open', partial: 'Partial', covered: 'Covered slice' };
// HTML text and double-quoted attributes share this encoder. JSON script data
// has a separate raw-text encoder below; never insert input into JS or CSS.
const esc = (value: string | number) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const uniq = (items: string[], name: string) => { if (new Set(items).size !== items.length) throw new Error(`Duplicate ${name}`); };

// Every registered stage is one evidence checkpoint; partial/open earn no credit.
export function registerCompletion(mechanics: readonly Pick<Mechanic, 'stages'>[], stages: readonly Stage[] = STAGES) {
  const total = mechanics.length * stages.length;
  const covered = mechanics.reduce((sum, mechanic) => sum + stages.filter(stage => mechanic.stages[stage] === 'covered').length, 0);
  const percent = total === 0 ? 0 : covered === total ? 100 : Math.min(99.9, Math.round(covered / total * 1000) / 10);
  return { covered, total, percent, display: percent.toFixed(1) + '%' };
}

function completionMethod(data: MechanicsRegister) {
  const completion = registerCompletion(data.mechanics);
  const partial = data.mechanics.reduce((sum, m) => sum + STAGES.filter(s => m.stages[s] === 'partial').length, 0);
  const psi = data.mechanics.filter(m => m.id.startsWith('PSI-') && m.id !== 'PSI-01').length * STAGES.length;
  return `${completion.covered} / ${completion.total} covered checkpoints / all registered evidence checkpoints (${data.mechanics.length} rows × ${STAGES.length} stages). Mapping, reference, rules, playable, integration, save/retry recovery, original-level acceptance and physical play each count once per row. Only covered earns credit; partial/open earn zero. Global across filters. Whole-game evidence coverage: ${completion.covered} covered, ${partial} partial, ${completion.total - completion.covered - partial} open. All eight stages have equal weight; ${data.mechanics.length * 2} cells are original-level acceptance plus hardware, and ${psi} cells are PSI effects. Broad aggregate rows measure evidence, not software effort, playable-testbed completion, source parity or overall game completion. New accepted playable slices can leave broad rows partial and the percentage unchanged. The earlier roughly 60% was a subjective estimate of a smaller authored functional testbed, not this measured denominator. No replacement effort percentage is calculated. 100% requires every checkpoint covered; near-complete values are capped at 99.9%.`;
}

export async function validateRegister(data: MechanicsRegister, root = ROOT) {
  assertPlainData(data);
  assertDashboardShape(data);
  if (data.schemaVersion !== 1 || !Number.isSafeInteger(data.acceptedThrough) || data.acceptedThrough < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.assessedOn) || !/^[a-f0-9]{40}$/.test(data.reviewedHead)) throw new Error('Invalid register identity');
  uniq(data.mechanics.map(m => m.id), 'mechanic ID');
  uniq(data.scenarios.map(s => s.id), 'scenario ID');
  uniq(data.levels.map(l => l.id), 'level ID');
  uniq(data.acceptanceChecks.map(c => c.id), 'acceptance ID');
  for (const s of data.scenarios) {
    if (typeof s.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(s.id)) throw new Error(`Invalid scenario ID ${s.id}`);
    if (!SCENARIO_KINDS.includes(s.kind)) throw new Error(`Invalid scenario kind ${s.kind}`);
  }
  for (const l of data.levels) {
    if (typeof l.id !== 'string' || !/^map-[1-9]\d*$/.test(l.id)) throw new Error(`Invalid level ID ${l.id}`);
    if (!LEVEL_GROUPS.includes(l.group)) throw new Error(`Invalid level group ${l.group}`);
  }
  for (const c of data.acceptanceChecks) if (typeof c.id !== 'string' || !/^[A-Z][A-Z0-9]*-\d{2}$/.test(c.id)) throw new Error(`Invalid acceptance ID ${c.id}`);
  // Uniqueness must hold in the rendered document, including across domains.
  const reservedIds = ['main', 'overview', 'register', 'acceptance', 'levels', 'scenarios', 'evidence', 'method', 'export', 'print', 'register-completion', 'register-progress', 'completion-counts', 'completion-method', 'search', 'family', 'mapping', 'results', 'clear', 'expand', 'collapse', 'no-results', 'level-group', 'register-data', 'testbed-capability', 'training43-software', ...data.dashboards.flatMap(d => d.milestones.map(m => m.id)), ...data.acceptedProofs.map(p => p.id)];
  uniq([...reservedIds, ...data.mechanics.map(m => m.id), ...data.levels.map(l => l.id), ...data.acceptanceChecks.map(c => c.id), ...data.scenarios.map(s => `scenario-${s.id}`)], 'rendered document ID');
  uniq(data.baseline.sourcePins.map(p => p.file), 'source identity pin');
  if (!data.baseline.sourcePins.length || data.baseline.sourcePins.some(p => !p.file || !/^[a-f0-9]{64}$/.test(p.sha256))) throw new Error('Invalid original source identity pins');
  const ids = new Set(data.mechanics.map(m => m.id)), scenarios = new Set(data.scenarios.map(s => s.id));
  const paths = new Set(data.baseline.evidence);
  for (const path of ['docs/mechanics/README.md', 'tools/audit-mechanics-levels.ts', 'tests/mechanics-register.test.ts', 'tests/browser/mechanics-register.spec.ts']) paths.add(path);
  const knownState = (state: string) => { if (!Object.hasOwn(states, state)) throw new Error(`Unknown state ${state}`); };
  for (const m of data.mechanics) {
    if (!/^[A-Z]+-\d{2}$/.test(m.id) || m.baseline !== data.baseline.id || !m.original || !m.source || !m.mappingScope || !m.next) throw new Error(`Incomplete mechanic ${m.id}`);
    if (Object.keys(m.stages).length !== STAGES.length) throw new Error(`Stage count differs for ${m.id}`);
    for (const stage of STAGES) knownState(m.stages[stage]);
    if (m.stages.mapping === 'covered' && !m.evidence.length) throw new Error(`Mapped row lacks evidence: ${m.id}`);
    if (m.stages.rules === 'covered' && !m.tests.some(t => t.path.endsWith('.test.ts'))) throw new Error(`Rules claim lacks tests: ${m.id}`);
    if (m.stages.playable === 'covered' && !m.scenarios.length) throw new Error(`Playable claim lacks scenario: ${m.id}`);
    if (m.stages.integration === 'covered' && !m.tests.some(t => t.path.endsWith('.spec.ts'))) throw new Error(`Integration claim lacks browser test: ${m.id}`);
    if (m.stages.acceptance === 'covered' || m.stages.hardware === 'covered') throw new Error(`Accepted level/hardware needs a reviewed receipt schema before activation: ${m.id}`);
    for (const s of m.scenarios) if (!scenarios.has(s)) throw new Error(`Unknown scenario ${s}`);
    for (const l of [...m.evidence, ...m.tests, ...m.implementation]) { if (!l.scope || !l.label) throw new Error('Unscoped evidence'); paths.add(l.path); }
  }
  const first = data.levels.filter(l => l.firstAcceptance);
  if (first.length !== 1 || first[0]!.id !== 'map-43') throw new Error('Training43 must remain the explicit first acceptance case');
  for (const l of data.levels) {
    if (!/^[a-f0-9]{64}$/.test(l.sha256) || l.acceptance !== 'open') throw new Error(`Level identity/acceptance invalid ${l.id}`);
    uniq(l.interactions.map(i => i.mechanic), `interaction in ${l.id}`);
    for (const i of l.interactions) {
      if (!ids.has(i.mechanic)) throw new Error(`Unknown mechanic ${i.mechanic}`);
      if (!['required','reachable-optional','inactive','present-unverified','unknown'].includes(i.classification) || !i.basis) throw new Error('Invalid interaction');
      if (l.id !== 'map-43' && ['required','reachable-optional'].includes(i.classification)) throw new Error('Static inventory cannot grant reachability or required-mechanic status');
    }
  }
  for (const c of data.acceptanceChecks) {
    knownState(c.state);
    if (c.state === 'covered') throw new Error(`Acceptance gate needs a reviewed receipt schema before activation: ${c.id}`);
    if (!c.requirement) throw new Error('Missing acceptance requirement');
    c.evidence.forEach(p => paths.add(p));
  }
  data.dashboards.forEach(d => d.milestones.forEach(m => m.evidence.forEach(e => paths.add(e.path))));
  data.scenarios.forEach(s => paths.add(s.path));
  for (const path of paths) {
    if (!/^(docs|tests|src|tools)\/[a-zA-Z0-9/_.-]+$/.test(path) || path.split('/').includes('..') || path.includes('.local') || !/\.(md|ts|html|json)$/.test(path)) throw new Error(`Unsafe evidence path ${path}`);
    try { await access(resolve(root, path)); } catch { throw new Error(`Missing evidence file ${path}`); }
  }
  validateDashboards(data);
  return { mechanics: data.mechanics.length, levels: data.levels.length, links: paths.size };
}

function badge(state: State) { return `<span class="badge ${esc(state)}">${esc(states[state])}</span>`; }
function evidenceLinks(items: EvidenceLink[]) { return items.length ? `<ul class="evidence-list">${items.map(l => `<li><a href="../../${esc(l.path)}">${esc(l.label)}</a><span>${esc(l.scope)}</span></li>`).join('')}</ul>` : '<p class="quiet">No linked evidence for this layer. Open work.</p>'; }
function levelTag(id: string, title: string, classification: string) { return `<a class="tag ${esc(classification)}" href="#${esc(id)}">${esc(title)} <span>· ${esc(classification.replaceAll('-', ' '))}</span></a>`; }
function mechanicCard(m: Mechanic, data: MechanicsRegister) {
  const levels = data.levels.flatMap(l => l.interactions.filter(i => i.mechanic === m.id && i.classification !== 'inactive').map(i => ({ l, i })));
  return `<details class="mechanic" id="${esc(m.id)}" data-family="${esc(m.family)}" data-mapping="${esc(m.stages.mapping)}" data-search="${esc([m.id,m.title,m.family,m.original,m.mappingScope,...m.gaps].join(' ').toLowerCase())}">
    <summary><span class="identity"><span class="mono">${esc(m.id)}</span><strong>${esc(m.title)}</strong><span class="quiet">${esc(m.family)}</span></span>${badge(m.stages.mapping)}<span class="expander" aria-hidden="true">+</span></summary>
    <div class="card-body"><p class="original">${esc(m.original)}</p><dl><dt>Original revision</dt><dd>${esc(data.baseline.label)}</dd><dt>Source locator</dt><dd>${esc(m.source)} <span class="quiet">(local original source; not bundled)</span></dd><dt>Mapped scope</dt><dd>${esc(m.mappingScope)}</dd></dl>
    <div class="stage-grid">${STAGES.map(s => `<div><span>${esc(labels[s])}</span>${badge(m.stages[s])}</div>`).join('')}</div>
    <div class="evidence-grid"><section><h4>Reference &amp; behaviour</h4>${evidenceLinks(m.evidence)}</section><section><h4>Automated &amp; integration tests</h4>${evidenceLinks(m.tests)}</section><section><h4>Implementation</h4>${evidenceLinks(m.implementation)}</section></div>
    <h4>Playable scenarios</h4><div class="tags">${m.scenarios.length ? m.scenarios.map(id => { const s = data.scenarios.find(s => s.id === id)!; return `<a class="tag" href="#scenario-${esc(s.id)}">${esc(s.title)} <span>· ${esc(s.kind)}</span></a>`; }).join('') : '<span class="quiet">No linked playable scenario.</span>'}</div>
    <h4>Original-level relationships</h4><p class="quiet">Required/reachable optional are audited classifications. Present unverified is a candidate, not a required puzzle.</p><div class="tags">${levels.length ? levels.map(({l,i}) => levelTag(l.id,l.title,i.classification)).join('') : '<span class="quiet">No verified level relationship yet; level-specific audit required.</span>'}</div>
    <h4>Remaining gaps</h4><ul>${m.gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul><p class="next"><strong>Next evidence:</strong> ${esc(m.next)}</p>
    <a class="permalink" href="#${esc(m.id)}">Link to ${esc(m.id)}</a></div></details>`;
}

export function renderHtml(data: MechanicsRegister) {
  assertPlainData(data);
  assertDashboardShape(data);
  const completion = registerCompletion(data.mechanics);
  const partialCells = data.mechanics.reduce((n, m) => n + STAGES.filter(s => m.stages[s] === 'partial').length, 0);
  const mapped = data.mechanics.filter(m => m.stages.mapping === 'covered').length;
  const partial = data.mechanics.filter(m => m.stages.mapping === 'partial').length;
  const refs = new Map<string, { scope: string; mechanics: string[] }>();
  for (const m of data.mechanics) for (const e of [...m.evidence,...m.tests,...m.implementation]) {
    const entry = refs.get(e.path) ?? { scope: e.scope, mechanics: [] }; entry.mechanics.push(m.id); refs.set(e.path,entry);
  }
  const familyOptions = [...new Set(data.mechanics.map(m => m.family))].map(f => `<option>${esc(f)}</option>`).join('');
  const levelCards = data.levels.map(l => `<details id="${esc(l.id)}" class="level ${l.firstAcceptance ? 'first' : ''}" ${l.firstAcceptance ? 'open' : ''} data-group="${esc(l.group)}"><summary><span class="identity"><span class="mono">${esc(l.id.toUpperCase())}</span><strong>${esc(l.title)}</strong><span class="quiet">${esc(l.firstAcceptance ? 'FIRST ACCEPTANCE TARGET' : l.group)}</span></span><span class="badge open">Acceptance open</span><span class="expander">+</span></summary><div class="card-body"><p>${esc(l.audit)}</p><dl><dt>Source</dt><dd>${esc(l.archivePath)}</dd><dt>SHA-256</dt><dd class="mono digest">${esc(l.sha256)}</dd><dt>Revision</dt><dd>${esc(l.revision)}</dd></dl><p class="quiet">Inactive means absent under this inventory predicate, not impossible through spawning or map mutations.</p><div class="interaction-list">${l.interactions.map(i => `<div><a href="#${esc(i.mechanic)}">${esc(i.mechanic)} · ${esc(data.mechanics.find(m => m.id === i.mechanic)!.title)}</a><span class="classification ${esc(i.classification)}">${esc(i.classification.replaceAll('-',' '))}</span><p>${esc(i.basis)}</p></div>`).join('')}</div><h4>Acceptance blockers</h4><ul>${l.blockers.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>${l.firstAcceptance ? '<a class="button" href="#acceptance">Open Training43 checklist →</a>' : ''}</div></details>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Traceable Hired Guns mechanics: original behaviour, mapping, evidence, tests, scenarios and original-level acceptance."><title>Hired Guns — Master Mechanics Register</title>
<style>
:root{color-scheme:dark;--bg:#0d141c;--panel:#131e29;--line:#2a3a49;--muted:#a4b3c1;--text:#ecf1f2;--green:#a4d7bb;--amber:#e7bd81;--red:#df9d97;--blue:#a5c9e9}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 "Segoe UI",Arial,sans-serif}a{color:var(--blue);text-underline-offset:3px}a:hover{color:white}button,input,select{font:inherit}button,.button{cursor:pointer;border:1px solid var(--line);border-radius:6px;background:#1b2c3b;color:var(--text);padding:9px 14px;text-decoration:none;display:inline-block}button:hover,.button:hover{border-color:var(--green)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--amber);outline-offset:4px}input,select{border:1px solid #536675;border-radius:6px;background:#101b26;color:var(--text);padding:10px;min-width:0;width:100%}.skip{position:fixed;left:12px;top:-80px;z-index:20;background:var(--bg);padding:12px}.skip:focus{top:12px}.shell{display:grid;grid-template-columns:235px minmax(0,1fr);min-height:100vh}.rail{position:sticky;top:0;height:100vh;border-right:1px solid var(--line);padding:32px 23px;display:flex;flex-direction:column;gap:32px}.brand{font-size:21px;letter-spacing:3px;font-weight:750;color:var(--green)}.brand small{display:block;font-size:10px;letter-spacing:2px;color:var(--muted);margin-top:5px}.rail nav{display:grid;gap:6px}.rail nav a{text-decoration:none;color:var(--muted);padding:9px 10px;border-left:2px solid transparent}.rail nav a[aria-current="page"]{border-color:var(--green);background:#1b2c34;color:white}.rail-note{font-size:12px;color:var(--muted);margin-top:auto}.rail-note strong{color:var(--text)}main{max-width:1540px;padding:45px 46px 75px;min-width:0}.topline{display:flex;justify-content:space-between;gap:16px;align-items:center}.eyebrow,.mono{font:12px/1.5 Consolas,"Courier New",monospace;letter-spacing:.6px}.eyebrow{text-transform:uppercase;color:var(--green);letter-spacing:1.5px}.quiet{color:var(--muted)}h1{font-size:clamp(32px,4vw,52px);line-height:1.12;letter-spacing:-1.5px;margin:14px 0 18px;font-weight:650}h2{font-size:27px;line-height:1.3;margin:0 0 12px;letter-spacing:-.4px}h3{font-size:20px;margin:0 0 12px}h4{font-size:14px;margin:23px 0 9px}p{margin:8px 0 16px}.lead{max-width:830px;font-size:18px;color:#bfccd5}.toolbar{display:flex;gap:8px;flex-wrap:wrap}.view{margin-top:35px}.view[hidden]{display:none}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:25px 0}.metric{padding:20px;border:1px solid var(--line);background:var(--panel);border-radius:8px}.metric strong{font-size:35px;line-height:1.2;font-weight:550;display:block;color:var(--green)}.metric span{font-size:13px;color:var(--muted)}.notice{border-left:3px solid var(--amber);padding:14px 18px;background:#24221e;margin:20px 0;border-radius:0 6px 6px 0}.notice p{margin:0}.badge{font-size:11px;font-weight:650;border:1px solid;border-radius:20px;padding:3px 9px;display:inline-block;white-space:nowrap}.covered{color:var(--green);background:#192e28;border-color:#3e6a57}.partial{color:var(--amber);background:#332c20;border-color:#75603c}.open{color:#c1cad3;background:#202b35;border-color:#536474}.grid-two{display:grid;grid-template-columns:1.2fr 1fr;gap:18px}.panel{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:25px}.panel ol,.panel ul{padding-left:21px}.legend{display:flex;flex-wrap:wrap;gap:16px;padding:16px 0}.legend>span{display:flex;align-items:center;gap:6px;font-size:12px}.filters{display:grid;grid-template-columns:2fr 1.1fr 1fr;gap:14px;padding:20px;background:var(--panel);border:1px solid var(--line);border-radius:8px;margin:20px 0}.filters label{font-size:12px;color:var(--muted)}.filters label>*{display:block;margin-top:5px}.result-line{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:12px 0}.result-line p{margin:0}.mechanic,.level{border:1px solid var(--line);border-radius:7px;background:var(--panel);margin:10px 0;overflow:hidden}.first{border-color:#6d8d7e}summary{cursor:pointer;list-style:none;padding:17px 20px;display:flex;align-items:center;gap:15px}summary::-webkit-details-marker{display:none}.identity{display:flex;align-items:baseline;gap:15px;flex:1;min-width:0;flex-wrap:wrap}.identity .mono{min-width:84px;color:var(--muted)}.identity .quiet{font-size:12px}.expander{font-size:22px;color:var(--muted);line-height:1}details[open]>summary{border-bottom:1px solid var(--line)}details[open]>summary .expander{transform:rotate(45deg)}.card-body{padding:10px 24px 24px;overflow-wrap:anywhere}.original{font-size:17px;color:#d9e3e9;margin-top:14px}dl{display:grid;grid-template-columns:125px minmax(0,1fr);gap:7px 14px;font-size:13px}dt{color:var(--muted)}dd{margin:0}.stage-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.stage-grid>div{border:1px solid var(--line);padding:10px;border-radius:5px}.stage-grid>div>span:first-child{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.evidence-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px}.evidence-list{list-style:none;padding:0;font-size:12px}.evidence-list li{margin:12px 0}.evidence-list span{display:block;color:var(--muted);margin-top:4px}.tags{display:flex;flex-wrap:wrap;gap:7px}.tag{text-decoration:none;border:1px solid var(--line);border-radius:4px;padding:5px 9px;font-size:12px;background:#0f1b26}.tag span{color:var(--muted)}.next{padding:12px 15px;background:#1a2b34;border-left:2px solid var(--green);margin-top:18px}.permalink{font-size:12px}.check{padding:18px 0;border-top:1px solid var(--line)}.check-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.check-head strong{flex:1}.check p{margin:8px 0;color:var(--muted)}.check a{font-size:12px}.interaction-list>div{display:grid;grid-template-columns:1fr auto;gap:3px 15px;border-top:1px solid var(--line);padding:13px 0}.interaction-list p{grid-column:1/-1;color:var(--muted);font-size:12px;margin:2px 0}.classification{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}.classification.required,.classification.reachable-optional{color:var(--green)}.classification.present-unverified,.classification.unknown{color:var(--amber)}.digest{overflow-wrap:anywhere}.scenario-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.scenario .kind{color:var(--amber);text-transform:uppercase;font-size:11px;letter-spacing:1px}.scenario h3{margin:10px 0}.scenario p{font-size:14px}.scenario .quiet{font-size:12px}.evidence-row{border-top:1px solid var(--line);padding:15px 0;overflow-wrap:anywhere}.evidence-row p{font-size:12px;color:var(--muted)}code{font:12px/1.6 Consolas,monospace;background:#0a1118;padding:3px 5px;overflow-wrap:anywhere}.command{padding:16px 0;border-top:1px solid var(--line)}.command code{display:block;padding:12px}.command p{font-size:13px;color:var(--muted)}.baseline{font-size:13px;color:var(--muted)}.empty{text-align:center;padding:35px;color:var(--muted)}footer{font-size:12px;color:var(--muted);border-top:1px solid var(--line);margin-top:35px;padding-top:20px}noscript{display:block;padding:20px;background:#332c20}body.no-js .view{display:block!important}
.title-row{display:flex;align-items:center;gap:28px;margin:14px 0 18px}.title-row h1{flex:1;margin:0;min-width:0}.register-completion{flex:0 0 230px;border-left:2px solid var(--green);padding:8px 0 8px 18px}.register-completion label{display:block;font-size:13px;color:var(--muted)}.completion-value{font-size:30px;line-height:1.3;color:var(--green)}.register-completion progress{display:block;width:100%;height:8px;margin:7px 0;accent-color:var(--green)}.completion-counts{display:block;font-size:12px;color:var(--muted)}.completion-method{margin:7px 0 0;font-size:12px}.completion-method summary{padding:0;display:list-item;list-style:disclosure-closed;color:var(--blue)}.completion-method[open]>summary{border:0}.completion-method p{margin:8px 0 0;color:var(--muted)}
@media(max-width:720px){.title-row{flex-direction:column;align-items:stretch;gap:16px}.register-completion{flex-basis:auto;padding:5px 0 5px 14px}.completion-value{font-size:26px}}
@media(max-width:1100px){main{padding:30px 25px}.shell{grid-template-columns:205px minmax(0,1fr)}.rail{padding:28px 15px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-two,.evidence-grid{grid-template-columns:1fr}.stage-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.identity .quiet{width:100%}}
@media(max-width:720px){.shell{display:block}.rail{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:20px;gap:17px}.brand small{display:inline;margin-left:12px}.rail nav{display:flex;flex-wrap:wrap;gap:5px}.rail nav a{font-size:12px;padding:6px 9px}.rail-note{display:none}main{padding:25px 16px}.topline{align-items:flex-start;flex-direction:column}.lead{font-size:16px}.filters,.scenario-grid{grid-template-columns:1fr}summary{padding:14px 12px;gap:9px}.identity{gap:4px}.identity .mono{width:100%;font-size:10px}.identity strong{font-size:14px}.identity .quiet{font-size:11px}.badge{font-size:10px;padding:3px 7px}.card-body{padding:8px 14px 18px}dl{grid-template-columns:1fr;gap:3px}dd{margin-bottom:7px}.interaction-list>div{grid-template-columns:1fr}.interaction-list p{grid-column:auto}.result-line{align-items:flex-start;flex-direction:column}.panel{padding:18px}.toolbar button,.toolbar .button{font-size:12px}h1{letter-spacing:-1px}.metric{padding:15px}.metric strong{font-size:28px}.brand{font-size:18px}.brand small{font-size:9px}}
@media print{body{color:#111;background:white}.rail,.toolbar,.filters,.result-line button{display:none}.shell{display:block}main{padding:0;max-width:none}.view{display:block!important}.view[hidden]{display:block!important}.panel,.metric,.mechanic,.level{background:white;color:#111;break-inside:avoid}.quiet,dt,.evidence-list span,.baseline{color:#444}.card-body{display:block!important}.badge{color:#222;background:white}.stage-grid{grid-template-columns:repeat(4,1fr)}a{color:#17466e}.notice{background:#eee}.original,.lead{color:#222}}
.milestone{border-top:1px solid #33404e;padding:16px 0;overflow-wrap:anywhere}.dashboard{margin-top:30px;overflow-wrap:anywhere}.dashboard dl{display:block}.dashboard dd{margin:0 0 12px}.dashboard dt{font-weight:bold}.dashboard code{overflow-wrap:anywhere}.milestone h4{margin:0 0 10px}.dashboard .badge{white-space:normal}</style></head>
<body class="no-js"><a class="skip" href="#main">Skip to register</a><div class="shell"><aside class="rail"><div class="brand">HIRED GUNS<small>REVIVAL / ENGINEERING INDEX</small></div><nav aria-label="Register sections"><a href="#overview" data-view="overview">01 · Overview</a><a href="#register" data-view="register">02 · Mechanics register</a><a href="#acceptance" data-view="acceptance">03 · Training43 acceptance</a><a href="#levels" data-view="levels">04 · Original levels</a><a href="#scenarios" data-view="scenarios">05 · Playable scenarios</a><a href="#evidence" data-view="evidence">06 · Evidence index</a><a href="#method" data-view="method">07 · Method &amp; updates</a></nav><div class="rail-note"><strong>Assessment · ${esc(data.assessedOn)}</strong><br>Accepted baseline PR${esc(data.acceptedThrough)}<br><span class="mono">${esc(data.reviewedHead.slice(0,12))}</span><br><br>Evidence → rules → play → integration → acceptance.<br><br><a href="../../index.html">Open game app ↗</a><br><a href="register.json">Source register JSON ↗</a><br><a href="CHECKLIST.md">Text checklist ↗</a></div></aside>
<main id="main"><div class="topline"><span class="eyebrow">Game-wide traceability / v1</span><div class="toolbar"><button id="export">Export register JSON</button><button id="print">Print checklist</button></div></div><div class="title-row"><h1>Master Mechanics<br>Register</h1><div class="register-completion" id="register-completion"><label for="register-progress">Whole-game evidence coverage</label><strong class="completion-value">${esc(completion.display)}</strong><progress id="register-progress" max="100" value="${esc(completion.percent)}" aria-describedby="completion-counts completion-method">${esc(completion.display)}</progress><span class="completion-counts" id="completion-counts">${esc(completion.covered)} / ${esc(completion.total)} evidence checkpoints covered</span><span class="completion-counts">${esc(partialCells)} partial · ${esc(completion.total - completion.covered - partialCells)} open · equal stage weights</span><details class="completion-method"><summary>How this is calculated</summary><p id="completion-method">${esc(completionMethod(data))}</p></details></div></div><p class="lead">A defined original rule, its mapping, and the evidence that carries it into a playable game. Open work stays visible at every step.</p><p class="baseline">${esc(data.baseline.label)} · assessed ${esc(data.assessedOn)} · main ${esc(data.reviewedHead.slice(0,12))}. This page is a dated assessment, not live CI.</p>
<noscript>All sections are available below. Expand individual records to read evidence. Search, filters and section navigation require JavaScript.</noscript>
<section class="view" id="overview"><h2>Coverage has several gates.</h2><p class="quiet">An implementation, a passing helper test and a finished original level are separate achievements.</p><div class="metrics"><div class="metric"><strong>${esc(data.mechanics.length)}</strong><span>mechanic / effect rows tracked</span></div><div class="metric"><strong>${esc(mapped)} <small>/ ${esc(partial)}</small></strong><span>mapped slices / partial mappings</span></div><div class="metric"><strong>${esc(data.levels.length)}</strong><span>editor maps inventoried</span></div><div class="metric"><strong>0</strong><span>complete original levels accepted</span></div></div><div class="notice"><p><strong>Whole-game evidence coverage.</strong> The title indicator counts covered evidence checkpoints across all rows and stages. No game-completion percentage is claimed. The earlier roughly 60% was a subjective estimate of a smaller authored functional testbed. It used a different scope and was not a measured whole-game percentage. These are traceability counts, not effort estimates. A covered slice does not certify an entire original subsystem.</p></div><div class="grid-two"><article class="panel"><span class="eyebrow">First complete original-level target</span><h3>Training43</h3><p>Four selected actors, a bounded dry route and PR115 supported wet entry/return plus PR116 bounded injury/death/corpse/manual-survivor/v16 recovery are accepted. Wider wet outcomes, broader lifecycle/all-dead/original timeout and complete original-level recovery remain open.</p><a class="button" href="#acceptance">Review the acceptance gates →</a><p class="quiet">Training44–47 are additional acceptance candidates. Their static interactions are now linked to this register.</p></article><article class="panel"><h3>What the evidence currently proves</h3><ol><li>Selected original helpers and integer rules have reference evidence.</li><li>Authored scenarios demonstrate inventory, falls, gates, a patrol and extraction.</li><li>Whole original-level and physical four-player acceptance remain open.</li></ol><a href="#register">Browse every mechanic →</a></article></div>${renderDashboards(data)}<h3 style="margin-top:30px">Read status in context</h3><div class="legend"><span>${badge('covered')} The stated slice has supporting links.</span><span>${badge('partial')} Some branches, integration or evidence remain.</span><span>${badge('open')} No sufficient evidence for this layer.</span></div><p class="quiet">${esc(data.scope)}</p></section>
<section class="view" id="register"><h2>Mechanics register</h2><p class="quiet">Expand a row for the original behaviour, exact mapped scope, code, reference documents, tests and related levels. Every row uses the named baseline above.</p><div class="filters"><label>Find a mechanic<input id="search" type="search" placeholder="Water, PSI, door, death, MOV-03…"></label><label>Family<select id="family" aria-label="Family"><option value="">All families</option>${familyOptions}</select></label><label>Mapping status<select id="mapping" aria-label="Mapping status"><option value="">All mapping states</option><option value="open">Open mapping</option><option value="partial">Partial mapping</option><option value="covered">Mapped slice</option></select></label></div><div class="result-line"><p id="results" aria-live="polite">${esc(data.mechanics.length)} mechanics</p><div class="toolbar"><button id="clear">Clear filters</button><button id="expand">Expand visible</button><button id="collapse">Collapse all</button></div></div><p id="no-results" class="empty" hidden>No matching mechanics. Clear filters to see the full register.</p>${data.mechanics.map(m => mechanicCard(m,data)).join('')}</section>
<section class="view" id="acceptance"><span class="eyebrow">Original level / first acceptance case</span><h2>Training43 acceptance checklist</h2><p>A dry route is established. Keyboard software acceptance requires every required and reachable optional interaction to work, with explicit source identity and recovery. Physical controller/TV and four-player human acceptance are DEFERRED separately and do not block keyboard software work.</p><p class="quiet">Read-only evidence gates. Update a gate in the source register only when its supporting receipt is reviewed; clicking a box cannot establish acceptance.</p><div class="panel">${data.acceptanceChecks.map(c=>`<article class="check" id="${esc(c.id)}"><div class="check-head"><span class="mono">${esc(c.id)}</span><strong>${esc(c.title)}</strong>${badge(c.state)}</div><p>${esc(c.requirement)}</p><div class="tags">${c.evidence.map(p=>`<a href="../../${esc(p)}">${esc(p.split('/').pop()!)}</a>`).join('')}</div></article>`).join('')}</div><p><a href="#map-43">Inspect Training43’s mapped interactions →</a></p></section>
<section class="view" id="levels"><h2>Original-level interaction index</h2><p>All 47 editor map identities were checked against the existing private catalogue. Training43 retains its earlier detailed audit. The other maps have a static source inventory, not a required-route or executable-runtime proof.</p><div class="notice"><p><strong>Present unverified ≠ required.</strong> Active-looking sentinels and flags identify audit candidates. Reachability, target binding and puzzle necessity still need evidence. Inactive slots never count as demonstrated gameplay.</p></div><label>Level group <select id="level-group" style="max-width:340px;margin:10px 0 20px"><option value="training">Training43–47</option><option value="campaign">Campaign-related maps</option><option value="action">Other action / development maps</option><option value="">All 47 maps</option></select></label>${levelCards}</section>
<section class="view" id="scenarios"><h2>Playable scenarios &amp; diagnostics</h2><p class="quiet">These are existing app modes and separate diagnostic pages. Authored practice is labelled explicitly and does not certify the original level.</p><div class="scenario-grid">${data.scenarios.map(s=>`<article id="scenario-${esc(s.id)}" class="panel scenario"><span class="kind">${esc(s.kind)}</span><h3>${esc(s.title)}</h3><p>${esc(s.instructions)}</p><p class="quiet">${esc(s.scope)}</p><a href="../../${esc(s.path)}">Instructions &amp; limitations →</a></article>`).join('')}</div></section>
<section class="view" id="evidence"><h2>Evidence, code &amp; test index</h2><p class="quiet">${esc(refs.size)} unique linked files. A test link records where verification lives; it does not assert a current passing run or that original-dependent cases ran rather than skipped.</p>${[...refs].sort(([a],[b])=>a.localeCompare(b)).map(([p,e])=>`<article class="evidence-row"><a href="../../${esc(p)}">${esc(p)}</a><p>${esc(e.scope)}</p><div class="tags">${[...new Set(e.mechanics)].map(id=>`<a class="tag" href="#${esc(id)}">${esc(id)}</a>`).join('')}</div></article>`).join('')}</section>
<section class="view" id="method"><h2>How this register is maintained</h2><p>${esc(data.baseline.description)}</p><div class="notice"><p><strong>The JSON is the source of truth.</strong> The HTML and Markdown checklist are generated from it. There is no live status polling or automatic acceptance upgrade.</p></div><ol><li>Add or split a mechanic when a source branch, item category, species or interaction is discovered. Keep stable IDs.</li><li>Define original behaviour and revision, with exact scope and remaining unknowns. Name adaptations explicitly.</li><li>Link reference evidence, rules tests, browser scenarios, integration tests and recovery cases. Record run receipts separately from file presence.</li><li>Audit each original level’s active callers and targets; promote present-unverified to required/reachable-optional only with level-specific evidence.</li><li>Update reviewed head/date after reconciling accepted changes. Rebuild and check all links before publishing a new assessment.</li><li>Close acceptance only with a reviewed receipt containing exact build/source identities, test commands/results/skips and physical observations.</li></ol><h3>Revision evidence</h3><ul>${data.baseline.evidence.map(p=>`<li><a href="../../${esc(p)}">${esc(p)}</a></li>`).join('')}</ul><h3>Original source identity pins</h3><p class="quiet">SHA-256 of the inspected older OCS source files. Names/hashes identify the local reference; assembly is not bundled.</p><dl>${data.baseline.sourcePins.map(p=>`<dt>${esc(p.file)}</dt><dd class="mono digest">${esc(p.sha256)}</dd>`).join('')}</dl><h3>Register tooling</h3><p><a href="README.md">Maintenance notes</a> · <a href="../../tools/audit-mechanics-levels.ts">Level inventory tool</a> · <a href="../../tests/mechanics-register.test.ts">Register validation tests</a> · <a href="../../tests/browser/mechanics-register.spec.ts">Browser verification</a></p><h3>Commands</h3>${data.commands.map(c=>`<article class="command"><strong>${esc(c.label)}</strong><code>${esc(c.command)}</code><p>${esc(c.scope)}</p></article>`).join('')}<h3>Known limits</h3><ul>${data.limitations.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><h3>Required acceptance receipt</h3><p>A future pass must name the mechanic or level, original revision/digests, accepted build commit, scenario, expected/observed outcomes, test command and pass/fail/skip totals, recovery replay, reviewer and any physical hardware/human observations. Original data and traces stay private. This initial register does not contain such a whole-level pass.</p></section>
<footer>Local engineering index · assessment ${esc(data.assessedOn)} · baseline ${esc(data.reviewedHead.slice(0,12))} · <a href="CHECKLIST.md">Text checklist</a> · <a href="register.json">Canonical JSON</a><br>Original source, map payloads, routes and raw traces are not bundled. Token usage unavailable.</footer></main></div>
<script id="register-data" type="application/json">${JSON.stringify(data).replaceAll('<','\\u003c')}</script>
<script>
document.body.classList.remove('no-js');
const views=[...document.querySelectorAll('.view')],cards=[...document.querySelectorAll('.mechanic')];
function show(id){views.forEach(v=>v.hidden=v.id!==id);document.querySelectorAll('[data-view]').forEach(a=>{if(a.dataset.view===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
function route(){let id;try{id=decodeURIComponent(location.hash.slice(1)||'overview');}catch{id='overview';}const target=document.getElementById(id);if(target){const view=target.classList.contains('view')?target:target.closest('.view');if(view){show(view.id);if(target.classList.contains('mechanic')){document.getElementById('search').value='';document.getElementById('family').value='';document.getElementById('mapping').value='';filter();target.open=true;}if(target.classList.contains('level')){document.getElementById('level-group').value='';filterLevels();target.open=true;}if(!target.classList.contains('view'))requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));else scrollTo(0,0);return;}}show('overview');}
function filter(){const q=document.getElementById('search').value.trim().toLowerCase(),f=document.getElementById('family').value,m=document.getElementById('mapping').value;let n=0;cards.forEach(c=>{c.hidden=!!((q&&!c.dataset.search.includes(q))||(f&&c.dataset.family!==f)||(m&&c.dataset.mapping!==m));if(!c.hidden)n++;});document.getElementById('results').textContent=n+' of '+cards.length+' mechanics shown';document.getElementById('no-results').hidden=n!==0;}
function filterLevels(){const group=document.getElementById('level-group').value;document.querySelectorAll('.level').forEach(l=>l.hidden=!!(group&&l.dataset.group!==group));}
['search','family','mapping'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',filter));
document.getElementById('clear').onclick=()=>{['search','family','mapping'].forEach(id=>document.getElementById(id).value='');filter();};
document.getElementById('expand').onclick=()=>cards.filter(c=>!c.hidden).forEach(c=>c.open=true);
document.getElementById('collapse').onclick=()=>cards.forEach(c=>c.open=false);
document.getElementById('level-group').onchange=filterLevels;
document.getElementById('print').onclick=()=>{const details=[...document.querySelectorAll('details')],saved=details.map(d=>d.open),hidden=[...document.querySelectorAll('[hidden]')];details.forEach(d=>d.open=true);hidden.forEach(e=>e.hidden=false);window.addEventListener('afterprint',()=>{details.forEach((d,i)=>d.open=saved[i]);hidden.forEach(e=>e.hidden=true);},{once:true});window.print();};
document.getElementById('export').onclick=()=>{const data=JSON.parse(document.getElementById('register-data').textContent),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='hired-guns-mechanics-register.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('hashchange',route);filterLevels();route();
</script></body></html>\n`;
}

export function renderMarkdown(data: MechanicsRegister) {
  assertPlainData(data);
  assertDashboardShape(data);
  const completion = registerCompletion(data.mechanics);
  return `# Master Mechanics Register — Whole-game evidence coverage: ${completion.display}\n\n${completionMethod(data)}\n\nAssessed ${data.assessedOn}; accepted main through PR${data.acceptedThrough}: \`${data.reviewedHead}\`.\n\n[Open the interactive HTML index](index.html) · [Canonical JSON](register.json)\n\n${data.scope}\n\nBaseline: **${data.baseline.label}**. ${data.baseline.description}\n\nCovered means only the stated slice. Linked files are not fresh run receipts. No whole-game completion percentage or complete original-level pass is claimed.\n\n${dashboardMarkdown(data)}\n\n## Training43: first original-level acceptance\n\n${data.acceptanceChecks.map(c=>`- [${c.state==='covered'?'x':' '}] **${c.id} ${c.title}** — ${states[c.state]}. ${c.requirement}`).join('\n')}\n\n## Mechanics\n\n| ID | Mechanic | Mapping | Reference | Rules | Playable | Integration | Recovery | Original level | Physical |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${data.mechanics.map(m=>`| [${m.id}](index.html#${m.id}) | ${m.title} | ${STAGES.map(s=>states[m.stages[s]]).join(' | ')} |`).join('\n')}\n\n${data.mechanics.map(m=>`### ${m.id} — ${m.title}\n\n**Original:** ${m.original}\n\n**Source:** ${m.source}; baseline ${m.baseline}.\n\n**Mapped scope:** ${m.mappingScope}\n\n**Evidence:** ${m.evidence.map(e=>`[${e.label}](../../${e.path})`).join(', ')||'Open'}\n\n**Tests:** ${m.tests.map(e=>`[${e.label}](../../${e.path})`).join(', ')||'Open'}\n\n**Scenarios:** ${m.scenarios.join(', ')||'None linked'}\n\n**Gaps:** ${m.gaps.join(' ')}\n\n**Next:** ${m.next}\n`).join('\n')}\n## Original-level relationships\n\nFlags/sentinels are static observations. Only Training43 has the existing detailed approach/route audit. Other map requirements and reachability remain unverified.\n\n${data.levels.map(l=>`### ${l.title}\n\n${l.archivePath}; SHA-256 \`${l.sha256}\`. ${l.revision}.\n\n${l.interactions.filter(i=>i.classification!=='inactive').map(i=>`- [${i.mechanic}](index.html#${i.mechanic}): **${i.classification}** — ${i.basis}`).join('\n')}\n`).join('\n')}\n## Maintenance\n\nEdit register.json, reconcile accepted main and evidence, then run \`npx tsx tools/build-mechanics-register.ts\`. Use \`--check\` to verify generated files and links. Original inputs remain private. See the HTML method section for acceptance receipt requirements.\n`;
}

async function main() {
  const check = process.argv.includes('--check');
  const data = JSON.parse(await readFile(resolve(ROOT,'docs/mechanics/register.json'),'utf8')) as MechanicsRegister;
  const totals = await validateRegister(data);
  for (const [name, content] of [['index.html',renderHtml(data)],['CHECKLIST.md',renderMarkdown(data)]]) {
    const file = resolve(ROOT,'docs/mechanics',name!);
    if (check) { if ((await readFile(file,'utf8')).replaceAll('\r\n', '\n') !== content) throw new Error(`Generated ${name} is stale; rebuild the mechanics register`); }
    else await writeFile(file, content!);
  }
  process.stdout.write(`${check?'Verified':'Built'} mechanics index: ${totals.mechanics} rows, ${totals.levels} maps, ${totals.links} existing linked files.\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });

// Reject active objects before reading any field. Public JSON and synthetic plain
// fixtures share this boundary; getters, prototypes and sparse/hidden extras do not.
function assertPlainData(value: unknown, ancestors = new Set<object>(), depth = 0, budget = { visits: 0 }) {
  if (++budget.visits > 100000 || depth > 32) throw new Error('Register data budget');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (typeof value !== 'object') throw new Error('Register must contain plain data');
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (prototype !== (array ? Array.prototype : Object.prototype) || ancestors.has(value)) throw new Error('Invalid register prototype/cycle');
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(k => typeof k !== 'string')) throw new Error('Register symbol key');
  const keys = Object.keys(descriptors).filter(k => !(array && k === 'length'));
  if (array && (keys.length !== (value as unknown[]).length || keys.some((k, i) => k !== String(i)))) throw new Error('Sparse/extra register array');
  for (const key of keys) {
    const descriptor = descriptors[key]!;
    if (['__proto__','prototype','constructor'].includes(key) || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error('Invalid register descriptor/key');
    assertPlainData(descriptor.value, ancestors, depth + 1, budget);
  }
  ancestors.delete(value);
}

// Plain-data validation checks fields that exist. Require every dashboard field
// through its own data descriptor before validation or preview code reads it:
// missing fields must never fall through to an Object.prototype accessor.
function assertDashboardShape(data: MechanicsRegister) {
  const own = (record: unknown, key: string): unknown => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid dashboard record shape');
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error('Missing own dashboard data field');
    return descriptor.value;
  };
  const exact = (record: unknown, keys: string[]) => {
    for (const key of keys) own(record, key);
    if (Object.keys(record as object).length !== keys.length) throw new Error('Invalid dashboard record shape');
  };
  const list = (record: unknown, key: string): unknown[] => {
    const value = own(record, key);
    if (!Array.isArray(value)) throw new Error('Invalid dashboard list');
    return value;
  };
  for (const proof of list(data, 'acceptedProofs')) {
    exact(proof, ['id','pr','merge','head','reviewSha256','ci','automatic','receipt']);
    list(proof, 'ci');
  }
  for (const dashboard of list(data, 'dashboards')) {
    exact(dashboard, ['id','title','scope','milestones']);
    for (const milestone of list(dashboard, 'milestones')) {
      exact(milestone, ['id','title','status','scope','lineage','scenario','evidence','missing','proofs']);
      list(milestone, 'lineage'); list(milestone, 'proofs');
      for (const evidence of list(milestone, 'evidence')) exact(evidence, ['path','label','scope']);
    }
  }
}

function validateDashboards(data: MechanicsRegister) {
  const exact = (value: unknown, keys: string[]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) throw new Error('Invalid dashboard record shape');
  };
  const text = (value: unknown) => { if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid dashboard text'); };
  const list = (value: unknown): unknown[] => { if (!Array.isArray(value)) throw new Error('Invalid dashboard list'); return value; };
  const id = (value: unknown) => { if (typeof value !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)) throw new Error('Invalid dashboard ID'); };
  list(data.dashboards); list(data.acceptedProofs);
  if (data.dashboards.length !== 2 || data.dashboards[0]?.id !== 'testbed-capability' || data.dashboards[1]?.id !== 'training43-software') throw new Error('Invalid dashboard domains');
  const lineage = new Set([...data.mechanics.map(m => m.id), ...data.acceptanceChecks.map(c => c.id)]);
  const scenario = new Set(data.scenarios.map(s => s.id));
  const proofIds = new Set(data.acceptedProofs.map(p => p.id));
  const allIds: string[] = [];
  for (const p of data.acceptedProofs) {
    exact(p, ['id','pr','merge','head','reviewSha256','ci','automatic','receipt']); id(p.id); allIds.push(p.id);
    if (!Number.isSafeInteger(p.pr) || p.pr < 1 || p.pr > data.acceptedThrough || p.id !== `proof-${p.pr}`) throw new Error('Invalid accepted proof PR');
    for (const hash of [p.merge,p.head]) if (typeof hash !== 'string' || !/^[a-f0-9]{40}$/.test(hash)) throw new Error('Invalid accepted proof commit');
    if (typeof p.reviewSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.reviewSha256)) throw new Error('Invalid accepted review hash');
    const numeric = [...list(p.ci), p.automatic, p.receipt];
    if (!p.ci.length || numeric.some(n => typeof n !== 'string' || !/^[1-9]\d*$/.test(n))) throw new Error('Invalid accepted proof receipt');
    uniq(p.ci, 'proof CI');
  }
  for (const d of data.dashboards) {
    exact(d, ['id','title','scope','milestones']); id(d.id); text(d.title); text(d.scope); list(d.milestones);
    if (!d.milestones.length) throw new Error('Empty dashboard scope');
    for (const m of d.milestones) {
      exact(m, ['id','title','status','scope','lineage','scenario','evidence','missing','proofs']); id(m.id); if (!m.id.startsWith(d.id === 'testbed-capability' ? 'cap-' : 't43-')) throw new Error('Invalid milestone ID domain'); allIds.push(m.id);
      for (const value of [m.title,m.scope,m.missing]) text(value);
      if (!MILESTONE_STATUSES.includes(m.status)) throw new Error('Invalid milestone status');
      for (const [values, known, name] of [[m.lineage,lineage,'lineage'],[m.proofs,proofIds,'proof']] as const) {
        list(values); uniq(values, `milestone ${name}`);
        if (values.some(v => typeof v !== 'string' || !known.has(v))) throw new Error(`Unknown milestone ${name}`);
      }
      if (!m.lineage.length || !scenario.has(m.scenario)) throw new Error('Missing milestone lineage/scenario');
      list(m.evidence);
      if (!m.evidence.length) throw new Error('Missing milestone evidence');
      for (const e of m.evidence) {
        exact(e, ['path','label','scope']); text(e.label); text(e.scope);
        if (typeof e.path !== 'string' || !/^(docs|tests|src|tools)\/[a-zA-Z0-9/_.-]+\.(md|ts|html|json)$/.test(e.path) || e.path.split('/').includes('..') || e.path.includes('.local')) throw new Error('Unsafe milestone evidence path');
      }
    }
  }
  uniq(allIds, 'dashboard ID');
  const existing = new Set(['main','overview','register','acceptance','levels','scenarios','evidence','method','export','print','register-data','register-completion','register-progress','completion-counts','completion-method','search','family','mapping','results','clear','expand','collapse','no-results','level-group', ...data.dashboards.map(d => d.id), ...data.mechanics.map(m => m.id), ...data.acceptanceChecks.map(c => c.id), ...data.levels.map(l => l.id), ...data.scenarios.map(s => `scenario-${s.id}`)]);
  if (allIds.some(id => existing.has(id))) throw new Error('Duplicate rendered dashboard ID');
}

function dashboardCounts(data: MechanicsRegister['dashboards'][number]) {
  return MILESTONE_STATUSES.map(status => `${data.milestones.filter(m => m.status === status).length} ${status}`).join(' · ');
}
function renderDashboards(data: MechanicsRegister) {
  return data.dashboards.map(d => `<section class="dashboard panel" id="${esc(d.id)}"><h3>${esc(d.title)}</h3><p>${esc(d.scope)}</p><p class="milestone-counts"><strong>${esc(d.milestones.length)} listed milestones: ${esc(dashboardCounts(d))}</strong></p>${d.milestones.map(m => `<article class="milestone" id="${esc(m.id)}"><h4>${esc(m.title)} <span class="badge">${esc(m.status)}</span></h4><p>${esc(m.scope)}</p><p><strong>Missing dependency / boundary:</strong> ${esc(m.missing)}</p><div class="tags">${m.lineage.map(id => `<a href="#${esc(id)}">${esc(id)}</a>`).join('')}<a href="#scenario-${esc(m.scenario)}">Runnable entry / controls</a>${m.proofs.map(id => `<a href="#${esc(id)}">${esc(id)}</a>`).join('')}</div>${evidenceLinks(m.evidence)}</article>`).join('')}</section>`).join('') + `<section class="dashboard panel"><h3>Accepted proof receipts</h3><p>Registry receipts transcribed for the accepted proof records below. Earlier capability links describe inherited accepted slices. File links identify proof definitions, not a new test run. This dashboard candidate still needs its own review.</p>${data.acceptedProofs.map(p => `<article class="milestone" id="${esc(p.id)}"><h4>Accepted PR${esc(p.pr)}</h4><dl><dt>Merge / implementation head</dt><dd class="mono">${esc(p.merge)} / ${esc(p.head)}</dd><dt>Independent review SHA-256</dt><dd class="mono">${esc(p.reviewSha256)}</dd><dt>CI runs / automatic review / receipt</dt><dd>${esc(p.ci.join(', '))} / ${esc(p.automatic)} / ${esc(p.receipt)}</dd></dl></article>`).join('')}</section>`;
}
function dashboardMarkdown(input: MechanicsRegister) {
  const md = (value: string) => esc(value).replaceAll('\\', '&#92;').replaceAll('`', '&#96;').replaceAll('[', '&#91;').replaceAll(']', '&#93;').replaceAll('*', '&#42;').replaceAll('_', '&#95;').replaceAll('\n', ' ');
  const data = { ...input, dashboards: input.dashboards.map(d => ({ ...d, title: md(d.title), scope: md(d.scope), milestones: d.milestones.map(m => ({ ...m, title: md(m.title), scope: md(m.scope), missing: md(m.missing), evidence: m.evidence.map(e => ({ ...e, label: md(e.label), scope: md(e.scope) })) })) })) };

  return (data.dashboards.map(d => `## ${d.title}\n\n${d.scope}\n\n${d.milestones.length} listed milestones: ${dashboardCounts(d)}.\n\n${d.milestones.map(m => `### ${m.id} — ${m.title}: ${m.status}\n\n${m.scope}\n\nMissing dependency / boundary: ${m.missing}\n\nLineage: ${m.lineage.map(id => `[${id}](index.html#${id})`).join(', ')}. [Entry and controls](index.html#scenario-${m.scenario}). ${m.proofs.map(id => `[${id}](index.html#${id})`).join(', ')}\n\n${m.evidence.map(e => `- [${e.label}](../../${e.path}): ${e.scope}`).join('\n')}`).join('\n\n')}`).join('\n\n') + `\n\n## Accepted proof receipts\n\n${data.acceptedProofs.map(p => `- PR${p.pr}: merge \`${p.merge}\`; implementation \`${p.head}\`; independent review SHA-256 \`${p.reviewSha256}\`; CI ${p.ci.join(', ')}; automatic ${p.automatic}; receipt ${p.receipt}.`).join('\n')}`).replace(/[ \t]+(?=\n)/g, '');
}
