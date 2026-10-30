import { mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cellIndex, type Facing, type LevelData, type Position } from '../src/contracts';
import type { EditorRecord } from '../src/import/editor-map';
import { resolveTraversal } from '../src/sim/traversal';
import { classifyInteractions, classifyTextTriggers, generateAcceptanceCase, CONSUMER, PINS, WITNESS_LIMITS, snapshotAcceptanceWitness, parseAcceptanceWitness, readAcceptanceWitness, sourceWetCandidate,
  validateAcceptanceCase, verifyRawInputs, type AcceptanceCase, type RawCaseInputs } from '../tools/training43-acceptance-case';

const from = { x: 2, y: 3, z: 2 }, wet = { x: 2, y: 2, z: 1 };
function fixture(): LevelData {
  const level: LevelData = { schemaVersion: 1, id: 'synthetic-wet-case', name: 'Synthetic only',
    source: { kind: 'synthetic', revision: 'synthetic', sha256: null }, size: { width: 5, depth: 5, height: 4 },
    layers: [Array<number>(100).fill(66), Array<number>(100).fill(0), Array<number>(100).fill(0)],
    starts: [{ ...from, facing: 0 }, { x: 1, y: 3, z: 2, facing: 0 },
      { x: 3, y: 3, z: 2, facing: 0 }, { x: 3, y: 4, z: 2, facing: 0 }],
    exit: { x: 4, y: 4, z: 2 }, unsupportedMechanics: [] };
  level.starts.forEach(p => put(level, p, 1));
  put(level, from, 0); put(level, { ...from, z: 1 }, (18 << 11) | 2);
  put(level, { ...wet, z: 2 }, 0);
  put(level, wet, ((10 << 28) | 32 | 4 | (2 << 17)) >>> 0);
  put(level, { ...wet, z: 0 }, 66);
  return level;
}
function put(level: LevelData, p: Position, value: number) { level.layers[0][cellIndex(level, p)] = value >>> 0; }
function row(index: number, position: number, messageOffset = 0): EditorRecord {
  return { index, offset: index * 6, rawHex: '000000000000', nonzero: position !== 0 || messageOffset !== 0,
    fields: { position, messageOffset } };
}
const k = (p: Position) => `${p.x},${p.y},${p.z}`;

describe('bounded source wet geometry candidates, never live traversal', () => {
  it('preserves the live refusal while proving the exact packed down/up pair', () => {
    const level = fixture(), before = structuredClone(level);
    expect(resolveTraversal(level, { ...from, facing: 0 }, 0)).toMatchObject({ reason: 'unsupported environment' });
    expect(sourceWetCandidate(level, from, 0)).toMatchObject({ status: 'candidate', step: { branch: 'stairs-down', target: wet } });
    expect(sourceWetCandidate(level, wet, 2)).toMatchObject({ status: 'candidate', step: { branch: 'stairs-up', target: from } });
    expect(level).toEqual(before);
  });
  it.each([0, 1, 2, 3] as Facing[])('uses the travel direction for both stair masks (%i)', direction => {
    const level = fixture();
    const d = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }][direction]!;
    const target = { x: from.x + d.x, y: from.y + d.y, z: 1 };
    put(level, { ...from, z: 1 }, ([18, 19, 16, 17][direction]! << 11) | 2);
    put(level, { ...target, z: 2 }, 0); put(level, target, 4 | (2 << 17));
    expect(sourceWetCandidate(level, from, direction)).toMatchObject({ status: 'candidate', step: { branch: 'stairs-down', target } });
  });
  it('requires presence bits instead of type metadata and never removes the water flag', () => {
    const level = fixture();
    put(level, { ...from, z: 1 }, 18 << 11);
    expect(sourceWetCandidate(level, from, 0).status).toBe('unknown');
    put(level, { ...from, z: 1 }, (18 << 11) | 2);
    put(level, wet, (10 << 28) >>> 0 | 4 | (2 << 17));
    expect(sourceWetCandidate(level, wet, 2).step.branch).toBe('level');
    expect(level.layers[0][cellIndex(level, wet)]! & 4).toBe(4);
  });
  it.each([1, 2, 64])('checks overhead floor/block/opaque masks (%i)', flag => {
    const level = fixture(); put(level, { ...wet, z: 2 }, flag);
    expect(sourceWetCandidate(level, wet, 2)).toMatchObject({ status: 'blocked', blocker: 'source stairs-up overhead mask' });
  });
  it.each([16, 256, 513, 1025, (12 << 28) | 32])('keeps unsupported effect flags unknown (%i)', flag => {
    const level = fixture(); put(level, wet, flag | 4 | (2 << 17));
    expect(sourceWetCandidate(level, from, 0).status).toBe('unknown');
  });
  it('does not call unsupported falling water reachable', () => {
    const level = fixture(); put(level, { ...wet, z: 0 }, 0);
    expect(sourceWetCandidate(level, from, 0)).toMatchObject({ status: 'unknown', blocker: expect.stringContaining('player_fall') });
    const classified = classifyInteractions(level, []);
    expect(classified.frontiers).toHaveLength(0);
    expect(classified.waters[0]).toMatchObject({ classification: 'unknown', candidateReachable: false });
  });
  it('separates candidate water from solid wet support and inaccessible water', () => {
    const level = fixture(); put(level, { x: 0, y: 0, z: 1 }, 66 | 4 | (2 << 17));
    put(level, { x: 4, y: 0, z: 1 }, 4 | (2 << 17));
    const result = classifyInteractions(level, []);
    expect(result.frontiers).toHaveLength(1);
    expect(result.waters.find(w => k(w.position) === k(wet))).toMatchObject({ candidateReachable: true, classification: 'unknown' });
    expect(result.waters.find(w => w.position.x === 0)).toMatchObject({ candidateReachable: false, classification: 'inactive' });
    expect(result.waters.find(w => w.position.x === 4)).toMatchObject({ candidateReachable: false, classification: 'unknown' });
    expect(result.candidateScope).toContain('NOT executed');
  });
  it('continues a supported corridor candidate without changing depth or inventing vertical movement', () => {
    const level = fixture(), next = { ...wet, y: wet.y - 1 };
    put(level, next, 4 | (2 << 17)); put(level, { ...next, z: 0 }, 66);
    const result = classifyInteractions(level, []);
    const candidate = result.waters.find(w => k(w.position) === k(next))!;
    expect(candidate.candidateReachable).toBe(true);
    expect(candidate.candidateRoute).toHaveLength(2);
    expect(candidate.candidateRoute!.map(s => s.branch)).toEqual(['stairs-down', 'level']);
    expect(result.waters.every(w => w.depth === 2)).toBe(true);
  });
  it('rejects malformed or sparse source geometry', () => {
    const level = fixture(); level.layers[0][0] = -1;
    expect(() => classifyInteractions(level, [])).toThrow('Malformed');
    const sparse = fixture(); delete sparse.layers[0][1];
    expect(() => classifyInteractions(sparse, [])).toThrow('Malformed');
  });
  it('rejects invalid direction and respects boundary', () => {
    expect(() => sourceWetCandidate(fixture(), from, 4 as Facing)).toThrow('direction');
    expect(sourceWetCandidate(fixture(), { ...from, x: -1 }, 0).status).toBe('blocked');
  });
});

describe('signs and positional text are independent dispatchers', () => {
  it('finds adjacent text signs without treating variants or used flags as button eligibility', () => {
    const level = fixture(); put(level, { x: 0, y: 3, z: 2 }, 66 | 8 | (7 << 23));
    const result = classifyInteractions(level, []);
    expect(result.signs).toHaveLength(1);
    expect(result.signs[0]).toMatchObject({ panelType: 0, variant: 7, classification: 'reachable-optional', activation: 'no button dispatch' });
    expect(result.signs[0]!.dryAdjacent).toHaveLength(1);
    expect(JSON.stringify(result.signs)).not.toContain('messageOffset');
  });
  it('keeps button and inaccessible sign consequences unknown', () => {
    const level = fixture(); put(level, { x: 0, y: 3, z: 2 }, 66 | 8 | (1 << 19));
    put(level, { x: 0, y: 0, z: 3 }, 66 | 8);
    expect(classifyInteractions(level, []).signs.map(s => s.classification)).toEqual(['unknown', 'unknown']);
  });
  it('ends at the first zero even with nonzero stale rows afterwards', () => {
    const level = fixture(); const target = cellIndex(level, from) * 4;
    expect(classifyTextTriggers(level, [row(0, 0, 4), row(1, target)], new Set([k(from)]), new Set())).toMatchObject([
      { classification: 'inactive', reason: 'zero terminator' }, { classification: 'inactive', reason: 'after first zero sentinel' }]);
  });
  it('skips consumed -1 without ending the table; preserves language/speaker eligibility', () => {
    const level = fixture(); const target = cellIndex(level, from) * 4;
    expect(classifyTextTriggers(level, [row(0, 0xffffffff), row(1, target), row(2, 0)], new Set([k(from)]), new Set())).toMatchObject([
      { classification: 'inactive', reason: 'consumed one-shot sentinel' },
      { classification: 'reachable-optional', reason: expect.stringContaining('lang=0 and speaker') }, { classification: 'inactive' }]);
  });
  it.each([[3, 0], [400, 0], [4, 3072], [4, 3060], [4, 0xffff]])('keeps invalid pointer/node offsets unknown (%i,%i)', (p, o) => {
    expect(classifyTextTriggers(fixture(), [row(0, p, o)], new Set(), new Set())[0]!.classification).toBe('unknown');
  });
  it('keeps a wet candidate trigger conditional and rejects malformed storage', () => {
    const level = fixture();
    expect(classifyTextTriggers(level, [row(0, cellIndex(level, wet) * 4)], new Set(), new Set([k(wet)]))[0]).toMatchObject({
      classification: 'unknown', reason: expect.stringContaining('wet candidate only') });
    expect(() => classifyTextTriggers(level, [row(0, NaN)], new Set(), new Set())).toThrow('Malformed');
  });
});

describe('source authority boundary', () => {
  const empty = () => Object.fromEntries(Object.keys(PINS).map(k => [k, new Uint8Array()])) as unknown as RawCaseInputs;
  it('does not accept source names or claimed hashes as authority', () => {
    expect(() => verifyRawInputs(empty())).toThrow('digest mismatch: map');
  });
  it('refuses accessor source inputs without evaluating them', () => {
    const input = empty(); let touched = false;
    Object.defineProperty(input, 'map', { get() { touched = true; throw new Error('getter'); } });
    expect(() => verifyRawInputs(input)).toThrow('Missing raw map'); expect(touched).toBe(false);
  });
  it('refuses missing and hidden extra source fields', () => {
    const input = empty(); Object.defineProperty(input, 'authority', { value: true });
    expect(() => verifyRawInputs(input)).toThrow('fields');
    expect(() => verifyRawInputs({ map: new Uint8Array() } as RawCaseInputs)).toThrow('fields');
  });
  it('rejects hidden/symbol/accessor/cyclic witness storage before reading raw sources', async () => {
    const hidden = Object.defineProperty({}, 'extra', { value: 1 });
    const symbol = { [Symbol('claim')]: 1 };
    let touched = false;
    const getter = Object.defineProperty({}, 'map', { enumerable: true, get() { touched = true; return 1; } });
    const cycle: { loop?: unknown } = {}; cycle.loop = cycle;
    const sparse = [1, 1]; delete sparse[0];
    for (const value of [hidden, symbol, getter, cycle, sparse, { value: NaN }]) {
      await expect(validateAcceptanceCase(value, empty())).rejects.toThrow(/JSON/);
    }
    expect(touched).toBe(false);
  });
});

describe('bounded descriptor snapshots and CLI parsing', () => {
  it('freezes exported policy authority recursively', () => {
    for (const object of [PINS, CONSUMER, CONSUMER.browser, CONSUMER.ownership, CONSUMER.refusesUntilProven, WITNESS_LIMITS]) {
      expect(Object.isFrozen(object)).toBe(true);
      expect(() => Object.defineProperty(object, Object.keys(object)[0]!, { value: false })).toThrow();
    }
  });
  it('copies data and shared subtrees independently without prototype setters', () => {
    const shared = { x: 1 }; const value = { a: shared, b: shared, nested: [1] };
    const snapshot = snapshotAcceptanceWitness(value);
    shared.x = 2; value.nested[0] = 3;
    expect(snapshot).toEqual({ a: { x: 1 }, b: { x: 1 }, nested: [1] });
    expect(snapshotAcceptanceWitness(JSON.parse('{"__proto__":{"x":1}}'))).toEqual(JSON.parse('{"__proto__":{"x":1}}'));
  });
  it('bounds depth, visits and repeated acyclic references deterministically', () => {
    let deep: unknown = 0;
    for (let i = 0; i <= WITNESS_LIMITS.depth; i++) deep = { x: deep };
    expect(() => snapshotAcceptanceWitness(deep)).toThrow('depth budget');
    let graph: unknown = {};
    for (let i = 0; i < 16; i++) graph = { a: graph, b: graph };
    expect(() => snapshotAcceptanceWitness(graph)).toThrow('visit budget');
    const many = Array.from({ length: 128 }, () => Array<number>(256).fill(0));
    expect(() => snapshotAcceptanceWitness(many)).toThrow('visit budget');
  });
  it('checks collection length before allocating or descending', () => {
    expect(() => snapshotAcceptanceWitness(new Array(0xffffffff))).toThrow('collection budget');
    expect(() => snapshotAcceptanceWitness(Object.fromEntries(Array.from({ length: 257 }, (_, i) => [i, 0])))).toThrow('collection budget');
    expect(() => snapshotAcceptanceWitness(Array<number>(257).fill(0))).toThrow('collection budget');
  });
  it('bounds individual strings, keys and aggregate string work', () => {
    expect(() => snapshotAcceptanceWitness('x'.repeat(4097))).toThrow('string budget');
    expect(() => snapshotAcceptanceWitness({ ['x'.repeat(4097)]: 1 })).toThrow('string budget');
    expect(() => snapshotAcceptanceWitness(Array<string>(65).fill('x'.repeat(4096)))).toThrow('string budget');
  });
  it('checks bytes and lexical nesting before parse, including escaped string brackets', () => {
    expect(() => parseAcceptanceWitness(' '.repeat(WITNESS_LIMITS.bytes + 1))).toThrow('byte budget');
    expect(() => parseAcceptanceWitness('"' + 'é'.repeat(WITNESS_LIMITS.bytes / 2) + '"')).toThrow('byte budget');
    expect(() => parseAcceptanceWitness('['.repeat(33) + '0' + ']'.repeat(33))).toThrow('nesting budget');
    const text = JSON.stringify({ text: '[{]}' + String.fromCharCode(92, 34) });
    expect(parseAcceptanceWitness(text)).toEqual(JSON.parse(text));
    expect(() => parseAcceptanceWitness('{')).toThrow();
  });
  it('checks sparse file size before reading/parsing and accepts bounded files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 't43-witness-'));
    const path = join(directory, 'witness.json');
    try {
      const file = await open(path, 'wx');
      await file.truncate(WITNESS_LIMITS.bytes + 1); await file.close();
      await expect(readAcceptanceWitness(path)).rejects.toThrow('byte budget');
      const small = await open(path, 'w'); await small.writeFile('{"ok":true}'); await small.close();
      expect(await readAcceptanceWitness(path)).toEqual({ ok: true });
    } finally { await rm(directory, { recursive: true }); }
  });
});

// Explicit opt-in only. No original fixture, filename discovery or original bytes in public CI.
const manifest = process.env.HIRED_GUNS_T43_CASE_INPUTS;
it.skipIf(!manifest)('private exact Training43 case: raw pins, actual approach and strict regeneration/tampering', async () => {
  const paths = JSON.parse(await readFile(manifest!, 'utf8')) as { inputs: Record<keyof typeof PINS, string>; casePath: string };
  const input = Object.fromEntries(await Promise.all((Object.keys(PINS) as (keyof typeof PINS)[]).map(async name =>
    [name, await readFile(paths.inputs[name])] as const))) as unknown as RawCaseInputs;
  const witness: unknown = JSON.parse(await readFile(paths.casePath, 'utf8'));
  const actual = await validateAcceptanceCase(witness, input);
  expect(actual.classification.waters).toHaveLength(23);
  expect(actual.classification.waters.filter(w => w.candidateReachable)).toHaveLength(22);
  expect(actual.classification.signs.map(s => s.classification)).toEqual(['reachable-optional', 'reachable-optional']);
  expect(actual.classification.textTriggers.every(t => t.classification === 'inactive')).toBe(true);
  expect(actual.dryApproachReplay).toMatchObject({ commands: 29, otherActorsUnmoved: true });
  expect(actual.setup.actor.race).toBe(4);
  expect(actual.helperInvocations.first.decision).toMatchObject({ nextCounter: 1, thresholdWord: 25, requestedHit: null });
  expect(actual.helperInvocations.second.decision!.nextCounter).toBe(2);
  expect(actual.helperInvocations.dryReturn.candidate.underwaterCount).toBe(0);
  expect(actual.helperInvocations.comparison.output).toMatchObject({ status: 'breath', inventoryStatus: 'processed' });
  expect(actual.helperInvocations.boundaries.map(b => b.output.damageRequest)).toEqual([null, null, { requestedHit: 5200 }]);
  expect(actual.bodyAndHeadContract.afterEntry.arrivedFirst & 0x60004).toBe(actual.entry.sourceWord & 0x60004);
  expect(actual.bodyAndHeadContract.afterReturn.departedFirst & 0x60004).toBe(actual.entry.sourceWord & 0x60004);
  expect(actual.wetSupport.sourceExpectedCalls.map(c => c.delayAfter)).toEqual([2, 1, 0]);
  // Mutate actual returned objects, including nested arrays: no canonical alias.
  for (const make of [() => generateAcceptanceCase(input), () => validateAcceptanceCase(witness, input)]) {
    const returned = await make();
    Object.defineProperty(returned.consumer, 'mandatoryNext', { value: false });
    Object.defineProperty(returned.consumer.browser, '0', { value: 'tampered' });
    Object.defineProperty(returned.consumer.refusesUntilProven, '0', { value: 'tampered' });
    Object.defineProperty(returned.pins, 'map', { value: 'tampered' });
    await expect(validateAcceptanceCase(returned, input)).rejects.toThrow('canonical');
    expect(await generateAcceptanceCase(input)).toEqual(actual);
  }
  const accessor = structuredClone(actual);
  const pendingAccessor = validateAcceptanceCase(accessor, input);
  let reads = 0;
  Object.defineProperty(accessor, 'format', { enumerable: true, get() { reads++; return actual.format; } });
  Object.defineProperty(accessor.setup.actor, 'race', { enumerable: true, get() { reads++; return 4; } });
  expect(await pendingAccessor).toEqual(actual); expect(reads).toBe(0);
  const invalid = structuredClone(actual); invalid.setup.actor.race = 1;
  const pendingInvalid = validateAcceptanceCase(invalid, input); invalid.setup.actor.race = 4;
  await expect(pendingInvalid).rejects.toThrow('canonical');
  const rawCopy = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, new Uint8Array(v)])) as RawCaseInputs;
  const pendingRaw = validateAcceptanceCase(witness, rawCopy);
  for (const bytes of Object.values(rawCopy)) bytes[0] = bytes[0]! ^ 1;
  expect(await pendingRaw).toEqual(actual);
  const changes: ((c: AcceptanceCase) => void)[] = [
    c => { c.classification.waters[0]!.classification = 'inactive'; },
    c => { c.classification.waters[0]!.candidateReachable = false; },
    c => { c.dryApproach[0]!.direction = 1; }, c => { c.entry.sourceWord ^= 4; },
    c => { c.helperInvocations.first.candidate.underwaterCount++; },
    c => { c.setup.actor.inventory.carried[0]!.damage++; },
    c => { Object.defineProperty(c.consumer, 'mandatoryNext', { value: false }); },
  ];
  for (const change of changes) {
    const altered = structuredClone(actual); change(altered);
    await expect(validateAcceptanceCase(altered, input)).rejects.toThrow('canonical');
  }
  for (const name of Object.keys(PINS) as (keyof typeof PINS)[]) {
    const wrong = { ...input, [name]: new Uint8Array(input[name]) }; wrong[name][0] = wrong[name][0]! ^ 1;
    await expect(generateAcceptanceCase(wrong)).rejects.toThrow(`digest mismatch: ${name}`);
  }
  expect(await generateAcceptanceCase(input)).toEqual(actual);
}, 30000);
