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
  expect(renderMarkdown(data)).toContain(`Register completion: ${completion.display}`);
  expect(renderMarkdown(data)).toContain(`${completion.covered} / ${completion.total} covered checkpoints / all registered evidence checkpoints`);
  const claim = structuredClone(data); claim.mechanics[0]!.stages.acceptance = 'covered';
  await expect(validateRegister(claim)).rejects.toThrow('reviewed receipt');
});
