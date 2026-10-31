import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { inventoryMechanics } from '../tools/audit-mechanics-levels';
import { registerCompletion, renderHtml, renderMarkdown, validateRegister } from '../tools/build-mechanics-register';
import { STAGES, type State, type MechanicsRegister } from '../tools/mechanics-types';

const load = async () => JSON.parse(await readFile(new URL('../docs/mechanics/register.json', import.meta.url), 'utf8')) as MechanicsRegister;
function editorFixture() {
  const bytes = new Uint8Array(157738);
  return { bytes, view: new DataView(bytes.buffer), cell(index: number, word: number) { this.view.setUint32(28478 + index * 4, word, false); } };
}

test('register has valid graph, real evidence links and exactly one first acceptance target', async () => {
  const data = await load();
  expect((await validateRegister(data)).levels).toBe(47);
  expect(data.levels.filter(l => l.firstAcceptance).map(l => l.id)).toEqual(['map-43']);
  expect(data.levels.filter(l => l.group === 'training').map(l => l.id)).toEqual(['map-43','map-44','map-45','map-46','map-47']);
});

test('generated HTML and Markdown stay in sync with the canonical register', async () => {
  const data = await load();
  expect((await readFile(new URL('../docs/mechanics/index.html', import.meta.url), 'utf8')).replaceAll('\r\n', '\n')).toBe(renderHtml(data));
  expect((await readFile(new URL('../docs/mechanics/CHECKLIST.md', import.meta.url), 'utf8')).replaceAll('\r\n', '\n')).toBe(renderMarkdown(data));
});

test('graph validation rejects orphan links, unsupported coverage and inflated static-level requirements', async () => {
  const data = await load();
  const orphan = structuredClone(data); orphan.levels[0]!.interactions[0]!.mechanic = 'NO-99';
  await expect(validateRegister(orphan)).rejects.toThrow('Unknown mechanic');
  const claim = structuredClone(data); claim.mechanics[0]!.stages.hardware = 'covered';
  await expect(validateRegister(claim)).rejects.toThrow('reviewed receipt');
  const gate = structuredClone(data); gate.acceptanceChecks[0]!.state = 'covered';
  await expect(validateRegister(gate)).rejects.toThrow('reviewed receipt');
  const inheritedState = structuredClone(data);
  Object.assign(inheritedState.mechanics[0]!.stages, { mapping: 'toString' });
  await expect(validateRegister(inheritedState)).rejects.toThrow('Unknown state');
  const staticClaim = structuredClone(data); staticClaim.levels.find(l => l.id === 'map-44')!.interactions[0]!.classification = 'required';
  await expect(validateRegister(staticClaim)).rejects.toThrow('Static inventory cannot grant');
  const missing = structuredClone(data); missing.mechanics[0]!.evidence[0]!.path = 'docs/no-such-evidence.md';
  await expect(validateRegister(missing)).rejects.toThrow('Missing evidence');
});

test('static inventory excludes stale machinery, no-op signs and high item flags', async () => {
  const fixture = editorFixture();
  fixture.view.setUint8(542 + 9616 + 3, 2); // direction without door position
  fixture.view.setUint8(542 + 9294 + 2, 8); // height without lift position
  fixture.cell(1, 8 | (3 << 19)); // unused/no-op panel dispatch
  fixture.view.setUint32(114958, 0x89000000, false); // item low byte is zero
  const result = await inventoryMechanics(fixture.bytes);
  for (const id of ['ENV-01','ENV-02','ENV-05','ENV-07','INV-04','AI-01']) expect(result.find(i => i.mechanic === id)?.classification).toBe('inactive');
});

test('static panel/pad/door/water/item observations never establish reachability', async () => {
  const fixture = editorFixture();
  fixture.cell(0, 8 | (1 << 19));
  fixture.cell(1, 1 | (1 << 9));
  fixture.cell(2, 4);
  fixture.cell(3, 32); // a closed egg with zero timer is present
  fixture.view.setUint16(542 + 9616, 4, false);
  fixture.view.setUint32(114958, 1, false);
  const result = await inventoryMechanics(fixture.bytes);
  for (const id of ['ENV-01','ENV-02','ENV-05','ENV-08','INV-04','AI-03']) expect(result.find(i => i.mechanic === id)?.classification).toBe('present-unverified');
  expect(result.some(i => ['required','reachable-optional'].includes(i.classification))).toBe(false);
});

test('floor pad type requires floor-present bit and graphics selectors do not create monsters', async () => {
  const fixture = editorFixture(); fixture.cell(0, 1 << 9); fixture.view.setUint8(530, 12); fixture.view.setUint8(531, 17);
  const result = await inventoryMechanics(fixture.bytes);
  expect(result.find(i => i.mechanic === 'ENV-02')?.classification).toBe('inactive');
  expect(result.find(i => i.mechanic === 'AI-01')?.classification).toBe('inactive');
});

test('generated HTML escapes prose and cannot terminate its embedded JSON script', async () => {
  const data = await load(); data.mechanics[0]!.original = '</script><img src=x onerror=alert(1)>';
  const html = renderHtml(data);
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('&lt;/script&gt;');
  expect(html).toContain('\\u003c/script>');
});

test('JSON metadata rejects invalid enums and identifiers at the maintenance boundary', async () => {
  const original = await load();
  const hostile = 'x"><img src=x onerror="window.__registerInjected=1">';
  for (const value of ['', hostile, 'toString', 'unknown', 42, null]) {
    for (const field of ['kind', 'group'] as const) {
      const data = structuredClone(original);
      if (field === 'kind') Object.assign(data.scenarios[0]!, { kind: value });
      else Object.assign(data.levels[1]!, { group: value });
      await expect(validateRegister(data)).rejects.toThrow(field === 'kind' ? 'scenario kind' : 'level group');
    }
  }
  for (const value of ['', hostile, 'has space', 'a#fragment', '../escape', 'a%22b', 42, null]) {
    for (const field of ['scenario', 'level', 'acceptance'] as const) {
      const data = structuredClone(original);
      const record = field === 'scenario' ? data.scenarios[0]! : field === 'level' ? data.levels[1]! : data.acceptanceChecks[0]!;
      Object.assign(record, { id: value });
      await expect(validateRegister(data)).rejects.toThrow(`Invalid ${field} ID`);
    }
  }
});

test('IDs cannot alias another record or an element from a different register domain', async () => {
  const original = await load();
  for (const field of ['scenarios', 'levels', 'acceptanceChecks'] as const) {
    const data = structuredClone(original);
    data[field][1]!.id = data[field][0]!.id;
    await expect(validateRegister(data)).rejects.toThrow('Duplicate');
  }
  const collision = structuredClone(original);
  collision.acceptanceChecks[0]!.id = collision.mechanics[0]!.id;
  await expect(validateRegister(collision)).rejects.toThrow('Duplicate rendered document ID');
});

test('hostile prose remains valid data while HTML encodes text, attributes and JSON separately', async () => {
  const data = await load();
  const prose = '" \' & <img src=x onerror="window.__registerInjected=1"> </script><script>window.__registerInjected=2</script>';
  data.mechanics[0]!.family = prose;
  data.mechanics[0]!.original = prose;
  data.scenarios[0]!.instructions = prose;
  data.levels[1]!.audit = prose;
  data.acceptanceChecks[0]!.requirement = prose;
  await expect(validateRegister(data)).resolves.toMatchObject({ mechanics: 86, levels: 47 });
  const html = renderHtml(data);
  expect(html).not.toContain('<img');
  expect(html).toContain('data-family="&quot; &#39; &amp; &lt;img');
  const embedded = html.match(/<script id="register-data" type="application\/json">([^]*?)<\/script>/)![1]!;
  expect(JSON.parse(embedded)).toEqual(data);
  expect(html.match(/<script(?:\s|>)/g)).toHaveLength(2);
});

test('HTML escaping does not relax evidence path, receipt or generated freshness gates', async () => {
  const original = await load();
  for (const path of ['../README.md', 'docs/../README.md', 'https://example.com/a.md', 'docs/%2e%2e/x.md', 'docs/.local/x.md', 'docs/x.html" onclick="bad', 'C:/secret.md']) {
    const data = structuredClone(original); data.mechanics[0]!.evidence[0]!.path = path;
    await expect(validateRegister(data)).rejects.toThrow('Unsafe evidence path');
  }
  const changed = structuredClone(original); changed.mechanics[0]!.title += ' changed';
  expect(renderHtml(changed)).not.toBe((await readFile(new URL('../docs/mechanics/index.html', import.meta.url), 'utf8')).replaceAll('\r\n', '\n'));
});

function completionRow(state: State) {
  return { stages: Object.fromEntries(STAGES.map(stage => [stage, state])) as MechanicsRegister['mechanics'][number]['stages'] };
}

test('register completion counts only covered checkpoints across the dynamic stage denominator', () => {
  expect(registerCompletion([])).toEqual({ covered: 0, total: 0, percent: 0, display: '0.0%' });
  expect(registerCompletion([completionRow('partial'), completionRow('open')])).toMatchObject({ covered: 0, total: 2 * STAGES.length, display: '0.0%' });
  const mixed = completionRow('open'); mixed.stages.mapping = 'covered'; mixed.stages.reference = 'partial';
  expect(registerCompletion([mixed])).toMatchObject({ covered: 1, total: STAGES.length, display: '12.5%' });
  expect(registerCompletion([mixed, completionRow('open')])).toMatchObject({ covered: 1, total: 2 * STAGES.length, display: '6.3%' });
  // Explicit stage lists exercise the helper's denominator independently of eight current stages.
  expect(registerCompletion([mixed], ['mapping', 'reference'])).toMatchObject({ covered: 1, total: 2, display: '50.0%' });
  expect(registerCompletion([completionRow('covered')])).toMatchObject({ covered: STAGES.length, total: STAGES.length, display: '100.0%' });
  expect(registerCompletion([mixed], [])).toMatchObject({ covered: 0, total: 0, display: '0.0%' });
});

test('register completion never rounds incomplete evidence up to 100 percent', () => {
  const rows = Array.from({ length: 1000 }, () => completionRow('covered'));
  rows[0]!.stages.hardware = 'partial';
  expect(registerCompletion(rows)).toMatchObject({ covered: 1000 * STAGES.length - 1, total: 1000 * STAGES.length, display: '99.9%' });
  rows[0]!.stages.hardware = 'covered';
  expect(registerCompletion(rows).display).toBe('100.0%');
});

test('HTML and text report exact canonical counts without changing acceptance claims', async () => {
  const data = await load(), completion = registerCompletion(data.mechanics);
  expect(renderHtml(data)).toContain(`value="${completion.percent}"`);
  expect(renderHtml(data)).toContain(`${completion.covered} / ${completion.total} evidence checkpoints covered`);
  expect(renderMarkdown(data)).toContain(`Whole-game evidence coverage: ${completion.display}`);
  expect(renderMarkdown(data)).toContain(`${completion.covered} / ${completion.total} covered checkpoints / all registered evidence checkpoints`);
  const claim = structuredClone(data); claim.mechanics[0]!.stages.acceptance = 'covered';
  await expect(validateRegister(claim)).rejects.toThrow('reviewed receipt');
});

test('accepted126 dashboard separates capability lineage, proof and broad evidence arithmetic', async () => {
  const data = await load();
  expect(data.acceptedThrough).toBe(126);
  expect(data.reviewedHead).toBe('583aec99f50306988bf2b675fbc7c6b0c0c8b71e');
  expect(data.acceptedProofs.map(p => p.pr)).toEqual([112,114,115,116,118,120,122,124,126]);
  const before = registerCompletion(data.mechanics);
  expect(before).toMatchObject({ covered: 68, total: 688, display: '9.9%' });
  expect(data.mechanics.reduce((n,m) => n + STAGES.filter(s => m.stages[s] === 'partial').length, 0)).toBe(129);
  expect(data.mechanics.filter(m => m.id.startsWith('PSI-') && m.id !== 'PSI-01').length * STAGES.length).toBe(232);
  expect(data.mechanics.length * 2).toBe(172);
  const extended = structuredClone(data);
  extended.dashboards[0]!.milestones.push({ ...structuredClone(extended.dashboards[0]!.milestones[0]!), id: 'cap-extra-narrow-slice' });
  await validateRegister(extended);
  expect(registerCompletion(extended.mechanics)).toEqual(before);
  expect(renderHtml(extended)).toContain('14 listed milestones');
  const food = data.mechanics.find(m => m.id === 'INV-06')!;
  expect(food.stages.playable).toBe('partial'); expect(food.scenarios).toContain('consumables');
  expect(food.tests.some(t => t.path === 'tests/browser/training-consumables.spec.ts')).toBe(true);
  expect(food.implementation.some(t => t.path === 'src/items/consumable-use.ts')).toBe(true);
  for (const id of ['MOV-03','ENV-08','LIFE-03','LIFE-04']) {
    const row = data.mechanics.find(m => m.id === id)!;
    expect(row.scenarios).toContain('wet'); expect(row.stages.playable).toBe('partial');
    expect(row.tests.some(t => t.path === 'tests/browser/training-wet.spec.ts')).toBe(true);
  }
  expect(data.acceptanceChecks.find(c => c.id === 'T43-05')!.state).toBe('partial');
  expect(renderMarkdown(data)).toContain('No complete original level accepted.'); // retained explicit source limits
});

test('dashboard schema rejects unsafe enums, IDs, references, paths and receipt upgrades', async () => {
  const original = await load();
  const mutate = async (change: (data: MechanicsRegister) => void) => {
    const data = structuredClone(original); change(data); await expect(validateRegister(data)).rejects.toThrow();
  };
  for (const value of ['covered','toString','x"><img src=x onerror="bad">',null,42]) {
    await mutate(d => Object.assign(d.dashboards[0]!.milestones[0]!, { status: value }));
    await mutate(d => Object.assign(d.dashboards[0]!.milestones[0]!, { id: value }));
  }
  await mutate(d => { d.dashboards[0]!.milestones[0]!.id = 'overview'; });
  await mutate(d => { d.dashboards[0]!.milestones[0]!.id = 'scenario-wet'; });
  await mutate(d => { d.dashboards[0]!.milestones[0]!.id = d.dashboards[1]!.milestones[0]!.id; });
  await mutate(d => { d.dashboards[0]!.milestones[0]!.lineage = ['NO-99']; });
  await mutate(d => { d.dashboards[0]!.milestones[0]!.scenario = 'missing-scenario'; });
  await mutate(d => { d.dashboards[0]!.milestones[0]!.proofs = ['proof-117']; });
  await mutate(d => { d.acceptedProofs[0]!.pr = 117; });
  await mutate(d => { d.acceptedProofs[0]!.merge = 'invalid'; });
  await mutate(d => { d.acceptedProofs[0]!.reviewSha256 = 'invalid'; });
  await mutate(d => { d.acceptedProofs[0]!.automatic = 'javascript:bad'; });
  await mutate(d => { d.acceptedProofs[0]!.ci = ['0']; });
  for (const path of ['javascript:alert(1)','https://example.com/x.md','docs/../secret.md','docs/.local/a.md','docs/x.md" onclick="bad','docs/%2e%2e/x.md']) await mutate(d => { d.dashboards[0]!.milestones[0]!.evidence[0]!.path = path; });
  await mutate(d => { d.dashboards[0]!.milestones[0]!.evidence[0]!.path = 'docs/absent-dashboard-proof.md'; });
  await mutate(d => { Object.assign(d.dashboards[0]!.milestones[0]!, { extra: 'unsupported' }); });
});

test('descriptor boundary refuses getters/prototypes/hidden/symbol/sparse/cycles before reading', async () => {
  const original = await load(); let reads = 0;
  const attempts: ((d: MechanicsRegister) => void)[] = [
    d => { Object.defineProperty(d, 'dashboards', { enumerable: true, get() { reads++; throw new Error('read'); } }); },
    d => { Object.defineProperty(d.dashboards[0]!.milestones[0]!, 'title', { enumerable: true, get() { reads++; throw new Error('read'); } }); },
    d => { Object.setPrototypeOf(d.dashboards[0]!, { inherited: true }); },
    d => { Object.defineProperty(d.dashboards[0]!, 'hidden', { value: true }); },
    d => { Object.assign(d.dashboards[0]!, { [Symbol('hidden')]: true }); },
    d => { delete d.dashboards[0]!.milestones[0]; },
    d => { Object.assign(d.dashboards[0]!.milestones, { extra: true }); },
    d => { Object.assign(d.dashboards[0]!, { cycle: d }); },
    d => { Object.defineProperty(d.dashboards[0]!, '__proto__', { enumerable: true, value: {} }); },
  ];
  for (const change of attempts) {
    const data = structuredClone(original); change(data);
    await expect(validateRegister(data)).rejects.toThrow();
    expect(() => renderHtml(data)).toThrow();
    expect(() => renderMarkdown(data)).toThrow();
  }
  expect(reads).toBe(0);
});

for (const throwing of [true, false]) test(`missing dashboard fields reject before inherited getters (${throwing ? 'throwing' : 'side effect'})`, async () => {
  const original = await load();
  // Includes the review's exact three missing fields, plus every nested record
  // field: a nonthrowing hook must not supply substitute data to a preview.
  const records = [
    (d: MechanicsRegister) => d,
    (d: MechanicsRegister) => d.dashboards[0]!,
    (d: MechanicsRegister) => d.dashboards[0]!.milestones[0]!,
    (d: MechanicsRegister) => d.dashboards[0]!.milestones[0]!.evidence[0]!,
    (d: MechanicsRegister) => d.acceptedProofs[0]!,
  ];
  for (const [index, record] of records.entries()) {
    const keys = index === 0 ? ['dashboards','acceptedProofs'] : Object.keys(record(original));
    for (const field of keys) for (const api of [validateRegister, renderHtml, renderMarkdown]) {
      const data = structuredClone(original), target = record(data);
      const saved = Object.getOwnPropertyDescriptor(target, field)!;
      Reflect.deleteProperty(target, field);
      const previous = Object.getOwnPropertyDescriptor(Object.prototype, field);
      let reads = 0, error: unknown;
      try {
        Object.defineProperty(Object.prototype, field, { configurable: true, get() {
          reads++;
          if (throwing) throw new Error('INHERITED_REVIEW117_HOOK');
          return saved.value;
        } });
        try { await api(data); } catch (caught) { error = caught; }
      } finally {
        if (previous) Object.defineProperty(Object.prototype, field, previous);
        else Reflect.deleteProperty(Object.prototype, field);
      }
      expect(reads, `${index}.${field} ${api.name}`).toBe(0);
      expect(error, `${index}.${field} ${api.name}`).toBeInstanceOf(Error);
      expect((error as Error).message).not.toBe('INHERITED_REVIEW117_HOOK');
    }
  }
});

test('lifecycle milestone selects accepted v16 controls and retains partial gates', async () => {
  const data = await load();
  const milestone = data.dashboards[1]!.milestones.find(m => m.id === 't43-lifecycle')!;
  expect(milestone.scenario).toBe('wet-lifecycle');
  expect(milestone.status).toBe('partial');
  expect(milestone.evidence[0]!.scope).toContain('T43-05/06 remain partial');
  expect(data.dashboards[1]!.milestones.find(m => m.id === 't43-entry')!.scenario).toBe('wet');
  const session = await readFile(new URL('../docs/training-session.md', import.meta.url), 'utf8');
  expect(session).toContain('Accepted bounded original-map wet extension (v15, PR115)');
  expect(session).toContain('every non-null requested hit, including zero');
});

test('all new rendered prose survives validation and stays inert in HTML, JSON and checklist', async () => {
  const data = await load(), hostile = '<img src=x onerror="window.__registerInjected=1"> </script><script>bad()</script> [link](javascript:bad) & \' "';
  for (const d of data.dashboards) {
    d.title = hostile; d.scope = hostile;
    for (const m of d.milestones) {
      m.title = hostile; m.scope = hostile; m.missing = hostile;
      for (const e of m.evidence) { e.label = hostile; e.scope = hostile; }
    }
  }
  await validateRegister(data);
  expect(renderHtml(data)).not.toContain('<img');
  expect(renderHtml(data)).toContain('\\u003c/script>');
  const md = renderMarkdown(data);
  expect(md).not.toContain('<img');
  expect(md).not.toContain('[link](javascript:bad)');
  expect(JSON.parse(renderHtml(data).match(/<script id="register-data" type="application\/json">([^]*?)<\/script>/)![1]!)).toEqual(data);
});

test('accepted118 records actual summary receipt and distinct accepted/source identities', async () => {
  const data = await load(), proof = data.acceptedProofs.find(p => p.pr === 118)!;
  expect(proof).toEqual({ id: 'proof-118', pr: 118,
    merge: 'decf689b2803772034bcae150544d1820395dcd5', head: 'b3710c91d980597b1e13905c3afd432a491ff76e',
    reviewSha256: 'f117875e938d538cec7436be22ba5b2f7e71aa89528b550b38745bd2fe20f848',
    ci: ['41071904326','41071757626'], automatic: '6525460623', receipt: '6525460623',
    receiptKind: 'actual-summary-state-completed-exact-no-findings;no separate receipt comment observed',
    tree: 'd78e3293e6f67e91c6d15c53631bb54f46510224', reviewedTree: 'a3b5964dbede6c20c16285c4db8661b3b176c8e4',
    sourceProofBase: 'db5d2930eb07ef98ddda1d09bb1968efed0f57d3' });
  expect(data.acceptedProofs.filter(p => p.pr !== 118 && p.pr !== 124 && p.pr !== 126).every(p => p.receiptKind === 'separate-receipt-comment' && p.automatic !== p.receipt)).toBe(true);
  for (const change of [
    { receiptKind: 'separate-receipt-comment' }, { receipt: '6525460624' },
    { receiptKind: 'unknown' }, { tree: '../bad' }, { reviewedTree: 42 }, { sourceProofBase: null },
  ]) {
    const bad = structuredClone(data); Object.assign(bad.acceptedProofs.find(p => p.pr === 118)!, change);
    await expect(validateRegister(bad)).rejects.toThrow();
  }
  const scenario = data.scenarios.find(s => s.id === 'wet-region')!;
  expect(scenario.path).toBe('docs/training43-wet-region.md');
  expect(scenario.instructions).toContain('Enable wet-region exploration');
  expect(scenario.scope).toContain('v17 paused chronological recovery');
  for (const dashboard of data.dashboards) {
    const milestone = dashboard.milestones.find(m => m.id.endsWith('-standing22'))!;
    expect(milestone.scenario).toBe('wet-region'); expect(milestone.proofs).toEqual(['proof-118']);
    expect(milestone.status).toBe('playable');
  }
});

for (const pr of [118,120,122,124,126]) test(`every${pr} proof field rejects inherited replacement and accessors before all API reads`, async () => {
  const original = await load();
  for (const field of Object.keys(original.acceptedProofs.find(p => p.pr === pr)!)) {
    for (const api of [validateRegister, renderHtml, renderMarkdown]) for (const throwing of [false,true]) {
      const data = structuredClone(original), target = data.acceptedProofs.find(p => p.pr === pr)!;
      const saved = Object.getOwnPropertyDescriptor(target, field)!;
      Reflect.deleteProperty(target, field);
      const previous = Object.getOwnPropertyDescriptor(Object.prototype, field);
      let reads = 0, error: unknown;
      try {
        Object.defineProperty(Object.prototype, field, { configurable: true, get() { reads++; if (throwing) throw new Error('HOOK118'); return saved.value; } });
        try { Reflect.get({}, field); } catch { /* positive inherited canary */ }
        if (reads !== 1) throw new Error('Inactive proof canary'); reads = 0;
        try { await api(data); } catch (caught) { error = caught; }
      } finally {
        if (previous) Object.defineProperty(Object.prototype, field, previous); else Reflect.deleteProperty(Object.prototype, field);
      }
      expect(reads, `${field}/${api.name}`).toBe(0); expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Missing own dashboard data field');
    }
    const data = structuredClone(original); let reads = 0;
    Object.defineProperty(data.acceptedProofs.find(p => p.pr === pr)!, field, { enumerable: true, get() { reads++; return ''; } });
    await expect(validateRegister(data)).rejects.toThrow();
    expect(() => renderHtml(data)).toThrow(); expect(() => renderMarkdown(data)).toThrow(); expect(reads).toBe(0);
  }
});

test('new proof fields escape invalid preview prose independently of semantic refusal', async () => {
  const data = await load(), proof = data.acceptedProofs.find(p => p.pr === 118)!;
  const hostile = '</script><img src=x onerror="bad()"> [link](javascript:bad)';
  Object.assign(proof, { tree: hostile, reviewedTree: hostile, sourceProofBase: hostile, receiptKind: hostile });
  await expect(validateRegister(data)).rejects.toThrow();
  expect(renderHtml(data)).not.toContain('<img');
  expect(renderMarkdown(data)).not.toContain('<img');
  expect(renderMarkdown(data)).not.toContain('[link](javascript:bad)');
});

test('accepted120 retains distinct union/source/base, separate receipt and unchanged broad credit', async () => {
  const data = await load(), p = data.acceptedProofs.find(p => p.pr === 120)!;
  expect(p).toMatchObject({merge:'9c11a985d79b28ef6c4e167966f1863647af5ba8',head:'79b3335571addf96c46464b25bb460ca28e9804d',tree:'574c5a954aa390883d79906bff80a803f2eb4009',reviewedTree:'fdb34eb8a0f7229d46482e5319bd483961b04653',sourceProofBase:'decf689b2803772034bcae150544d1820395dcd5',automatic:'6527929680',receipt:'6531111769',receiptKind:'separate-receipt-comment'});
  expect(p.tree).not.toBe(p.reviewedTree);
  for (const change of [{receipt:p.automatic},{receiptKind:'actual-summary-state-completed-exact-no-findings;no separate receipt comment observed'},{tree:'bad'},{reviewedTree:null},{sourceProofBase:42}]) {
    const bad=structuredClone(data);Object.assign(bad.acceptedProofs.find(p=>p.pr===120)!,change);await expect(validateRegister(bad)).rejects.toThrow();
  }
  // Tree/base extensions are conditional, not accepted arbitrarily on older records.
  const bad=structuredClone(data);Object.assign(bad.acceptedProofs[0]!,{tree:p.tree,reviewedTree:p.reviewedTree,sourceProofBase:p.sourceProofBase});await expect(validateRegister(bad)).rejects.toThrow();
  for(const board of data.dashboards){const m=board.milestones.find(m=>m.id.endsWith('-selected-all-dead'))!;expect(m.proofs).toEqual(['proof-120']);expect(m.scenario).toBe('wet-party');expect(m.status).toBe('playable');expect(m.missing).toContain('Accepted PR122');}
  expect(registerCompletion(data.mechanics)).toMatchObject({covered:68,total:688,display:'9.9%'});
  expect(data.mechanics.reduce((n,m)=>n+STAGES.filter(s=>m.stages[s]==='partial').length,0)).toBe(129);
  for(const c of data.acceptanceChecks)expect(c.state).not.toBe('covered');
  const text=await readFile(new URL('../docs/training43-completion.md',import.meta.url),'utf8');
  for(const claim of ['T43-R06 original99 timeout','59499','T43-R08 both signs/text','UNKNOWN/OPEN','source-evidenced inactive','not software gates'])expect(text).toContain(claim);
});

test('accepted120 invalid preview fields escape all contexts without weakening refusal',async()=>{
 const data=await load(),p=data.acceptedProofs.find(p=>p.pr===120)!;
 const hostile='</script><img src=x onerror="bad()"> [link](javascript:bad)';
 Object.assign(p,{tree:hostile,reviewedTree:hostile,sourceProofBase:hostile,receiptKind:hostile});
 await expect(validateRegister(data)).rejects.toThrow();expect(renderHtml(data)).not.toContain('<img');expect(renderHtml(data)).toContain('\\u003c/script>');expect(renderMarkdown(data)).not.toContain('[link](javascript:bad)');
});


test('accepted122 binds actual union, reviewed source, base and separate actual receipt without broad credit', async () => {
  const data = await load(), p = data.acceptedProofs.find(p => p.pr === 122)!;
  expect(p).toEqual({ id:'proof-122', pr:122, merge:'81353ad52118875195c925d668cc469ad72d106e', head:'7540c012f8a7bb9ee343b09628eecb0c85c4fb85',
    tree:'07126bf9a65a38fb15d3c4f75b6f915ad134b611', reviewedTree:'6f28744d18198aa929c042d9ca2041ee816e22f1', sourceProofBase:'9c11a985d79b28ef6c4e167966f1863647af5ba8',
    reviewSha256:'c7ad6b0b461bd0ea049cfea8b9e1d957650c8b5b3ddc5c01e93f03155a95e180', ci:['41136204108','41136195941'], automatic:'6533377523', receipt:'6534702086', receiptKind:'separate-receipt-comment' });
  expect(new Set([p.tree,p.reviewedTree,p.sourceProofBase]).size).toBe(3);
  for (const change of [{receipt:p.automatic},{receiptKind:'actual-summary-state-completed-exact-no-findings;no separate receipt comment observed'},{tree:null},{reviewedTree:'bad'},{sourceProofBase:42}]) {
    const bad = structuredClone(data); Object.assign(bad.acceptedProofs.find(p => p.pr === 122)!,change); await expect(validateRegister(bad)).rejects.toThrow();
  }
  for (const board of data.dashboards) {
    const m = board.milestones.find(m => m.id.endsWith('-source-timeout'))!;
    expect(m).toMatchObject({status:'playable',scenario:'source-timeout',proofs:['proof-122']});
    expect(m.missing).toContain('UNKNOWN/OPEN'); expect(m.missing).toContain('INCOMPLETE');
  }
  const scenario = data.scenarios.find(s => s.id === 'source-timeout')!;
  for (const value of ['Apply team to Training43','Enable original 99-unit timeout','fresh PAUSED tick zero','[1,3,0,5]','[0,0,3,4]','Save progress','Load progress']) expect(scenario.instructions).toContain(value);
  expect(registerCompletion(data.mechanics)).toMatchObject({covered:68,total:688,display:'9.9%'});
  for(const check of data.acceptanceChecks) expect(check.state).not.toBe('covered');
});

test('122 malformed records and late accessors refuse before any public API invokes a hook', async () => {
  const original = await load();
  for (const api of [validateRegister,renderHtml,renderMarkdown]) {
    for (const mode of ['null','custom','null-prototype','hidden','late-hook']) {
      const data = structuredClone(original), i = data.acceptedProofs.findIndex(p => p.pr === 122); let reads = 0;
      if(mode === 'null') Reflect.set(data.acceptedProofs,i,null);
      else if(mode === 'custom') Object.setPrototypeOf(data.acceptedProofs[i]!,{marker:true});
      else if(mode === 'null-prototype') Object.setPrototypeOf(data.acceptedProofs[i]!,null);
      else if(mode === 'hidden') Object.defineProperty(data.acceptedProofs[i]!,'sourceProofBase',{value:original.acceptedProofs[i]!.sourceProofBase,enumerable:false});
      else Object.defineProperty(data.acceptedProofs[i]!,'sourceProofBase',{enumerable:true,get(){reads++;throw new Error('LATE122');}});
      let error:unknown;try {await api(data);}catch(caught){error=caught;}
      expect(error,`${api.name}/${mode}`).toBeInstanceOf(Error);expect(reads).toBe(0);
    }
  }
  // Live own-accessor positive control distinguishes an inactive canary from refusal.
  let reads=0;const control={get tree(){reads++;return 'live';}};expect(control.tree).toBe('live');expect(reads).toBe(1);
});

test('accepted124 preserves source/union identity, same-summary receipt and bounded read-only scope', async () => {
  const data = await load(), p = data.acceptedProofs.find(p => p.pr === 124)!;
  expect(p).toEqual({id:'proof-124',pr:124,merge:'d122d69db59a2a46226b25349b50bc46ec510d43',head:'37ef7227b8c85528f85eca8c2d39a1f1790b18af',tree:'b35ab9f0609cf667df966e48db57a8dacda10f44',reviewedTree:'84a00052bdeaf50fac006325674b7a48a00fd4bd',sourceProofBase:'81353ad52118875195c925d668cc469ad72d106e',reviewSha256:'c0f8723ae11ddfcd1d33e8734b469a4f4d01b0da5ceb3709f998275a37ec5152',ci:['41145099476','41145081608'],automatic:'6535904450',receipt:'6535904450',receiptKind:'actual-summary-state-completed-exact-no-findings;no separate receipt comment observed'});
  for(const change of [{receipt:'6535904451'},{receiptKind:'separate-receipt-comment'},{tree:null},{reviewedTree:'bad'},{sourceProofBase:42}]) {
    const bad=structuredClone(data);Object.assign(bad.acceptedProofs.find(p=>p.pr===124)!,change);await expect(validateRegister(bad)).rejects.toThrow();
  }
  for(const board of data.dashboards) {
    expect(board.milestones.find(m=>m.id.endsWith('-sign-view'))).toMatchObject({status:'playable',scenario:'sign-view',proofs:['proof-124']});
    expect(board.milestones.find(m=>m.id.endsWith('-sign-view'))!.missing).toContain('UNKNOWN/OPEN');
  }
  expect(registerCompletion(data.mechanics)).toMatchObject({covered:68,total:688,display:'9.9%'});
  const doc=await readFile(new URL('../docs/training43-completion.md',import.meta.url),'utf8');
  for(const text of ['T43-R08','NO gameplay writes','slot57','UNKNOWN/OPEN','T43-R09','T43-R10'])expect(doc).toContain(text);
});

test('124 missing own fields and malformed descriptors refuse with live accessor controls', async () => {
  const original=await load();
  for(const api of [validateRegister,renderHtml,renderMarkdown]) for(const field of ['tree','reviewedTree','sourceProofBase','receiptKind']) {
    for(const mode of ['missing','hidden','own-accessor','inherited-value']) {
      const data=structuredClone(original),p=data.acceptedProofs.find(p=>p.pr===124)!;let reads=0;
      const value=Reflect.get(p,field);Reflect.deleteProperty(p,field);
      if(mode==='hidden')Object.defineProperty(p,field,{value,enumerable:false});
      if(mode==='own-accessor')Object.defineProperty(p,field,{enumerable:true,get(){reads++;throw new Error('LIVE124');}});
      if(mode==='inherited-value')Object.setPrototypeOf(p,{[field]:value});
      let error:unknown;try{await api(data);}catch(caught){error=caught;}
      expect(error,`${api.name}/${field}/${mode}`).toBeInstanceOf(Error);expect(reads).toBe(0);
    }
  }
  let reads=0;const live={get tree(){reads++;return 'active';}};expect(live.tree).toBe('active');expect(reads).toBe(1);
});


test('accepted126 requires same accepted/reviewed tree and honest same-summary receipt before filesystem work', async () => {
  const data = await load(), p = data.acceptedProofs.find(p => p.pr === 126)!;
  expect(p).toEqual({id:'proof-126',pr:126,merge:'583aec99f50306988bf2b675fbc7c6b0c0c8b71e',head:'1c246469ceebc2f56b82ead74898e4a5ed200041',tree:'139dd370a6f559dc2a4ce7c91480460b6e175ae6',reviewedTree:'139dd370a6f559dc2a4ce7c91480460b6e175ae6',sourceProofBase:'9940b3c318d358b0c9b3bfde9ee90013710d6fc4',reviewSha256:'dadeb8b12a8302ed9ab04c648356c9fd2eb08084c59c996775391260e40592ac',ci:['41156144749','41156099523'],automatic:'6537386819',receipt:'6537386819',receiptKind:'actual-summary-state-completed-exact-no-findings;no separate receipt comment observed'});
  await validateRegister(data); // Positive controls also keep all earlier lineage rules valid.
  for (const change of [{receipt:'6537386820'},{receiptKind:'separate-receipt-comment'},{receiptKind:'completed'},{tree:null},{reviewedTree:'bad'},{reviewedTree:p.sourceProofBase},{sourceProofBase:42},{sourceProofBase:p.tree},{sourceProofBase:p.head},{sourceProofBase:p.merge}]) {
    const bad=structuredClone(data);Object.assign(bad.acceptedProofs.find(p=>p.pr===126)!,change);
    // A missing evidence file must never mask the synchronous proof error.
    bad.dashboards[0]!.milestones[0]!.evidence[0]!.path='docs/absent126.md';
    await expect(validateRegister(bad)).rejects.toThrow(/Invalid (accepted|summary)/);
  }
  for(const [board,n] of data.dashboards.map((d,i)=>[d,i===0?13:12] as const)) {
    expect(board.milestones).toHaveLength(n);
    expect(board.milestones.filter(m=>m.id.endsWith('-corpse-pickup'))).toHaveLength(1);
    expect(board.milestones.at(-1)).toMatchObject({status:'playable',scenario:'corpse-pickup',proofs:['proof-126']});
  }
  expect(data.dashboards[0]!.milestones.filter(m=>m.status==='playable')).toHaveLength(11);
  expect(data.dashboards[1]!.milestones.filter(m=>m.status==='playable')).toHaveLength(9);
});

test('126 malformed shapes and getters refuse before all three public API reads with live controls',async()=>{
 const original=await load();
 for(const api of [validateRegister,renderHtml,renderMarkdown]) for(const mode of ['null','custom','null-prototype','hidden','extra','own-accessor']) {
  const data=structuredClone(original),i=data.acceptedProofs.findIndex(p=>p.pr===126),p=data.acceptedProofs[i]!;let reads=0;
  const control={get value(){reads++;return true;}};expect(control.value).toBe(true);expect(reads).toBe(1);reads=0;
  if(mode==='null')Reflect.set(data.acceptedProofs,i,null);
  else if(mode==='custom')Object.setPrototypeOf(p,{marker:true});
  else if(mode==='null-prototype')Object.setPrototypeOf(p,null);
  else if(mode==='hidden')Object.defineProperty(p,'tree',{value:p.tree,enumerable:false});
  else if(mode==='extra')Object.assign(p,{security:'passed'});
  else Object.defineProperty(p,'tree',{enumerable:true,get(){reads++;throw Error('LIVE126');}});
  let error:unknown;try{await api(data);}catch(e){error=e;}expect(error).toBeInstanceOf(Error);expect(reads).toBe(0);
 }
});

test('126 preview escaping retains hostile data as text and raw JSON less-than escapes',async()=>{
 const data=await load(),p=data.acceptedProofs.find(p=>p.pr===126)!;
 const hostile='</script><img src=x onerror="bad()"> [link](javascript:bad)';
 Object.assign(p,{tree:hostile,reviewedTree:hostile,sourceProofBase:hostile,receiptKind:hostile});
 await expect(validateRegister(data)).rejects.toThrow();
 const html=renderHtml(data);expect(html).not.toContain('<img');expect(html).toContain('\\u003c/script>');
 expect(renderMarkdown(data)).not.toContain('<img');expect(renderMarkdown(data)).not.toContain('[link](javascript:bad)');
});
