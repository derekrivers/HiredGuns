import { expect, test } from 'vitest';
import { compareReference } from '../tools/compare-reference';

const declared = { status: 'declared', source: 'synthetic authored fixture', scope: 'JSON comparator tests only' };
const fixture = () => ({ provenance: declared, state: { tick: 7, opaque: { untouched: [3, 4] } },
  events: [{ kind: 'write', before: 1, after: 2 }, { kind: 'return' }] });

test('exact state and ordered events compare repeatably without mutating either input', () => {
  const baseline = fixture(), candidate = structuredClone(baseline);
  const before = structuredClone([baseline, candidate]);
  const report = compareReference(baseline, candidate);
  expect(report.result).toBe('equal-with-declared-provenance');
  expect(report.firstMismatch).toBeNull();
  expect(report.ignoredPaths).toEqual([]);
  expect(report.provenance.independentlyVerified).toBe(false);
  expect(compareReference(baseline, candidate)).toEqual(report);
  expect([baseline, candidate]).toEqual(before);
});

test('an intentional synthetic state mismatch exposes useful path and both values', () => {
  const baseline = fixture(), candidate = fixture(); candidate.state.tick++;
  const report = compareReference(baseline, candidate);
  expect(report.result).toBe('different');
  expect(report.firstMismatch).toEqual({ kind: 'value', path: '/state/tick',
    baseline: { present: true, value: 7 }, candidate: { present: true, value: 8 } });
});

test('unknown fields are exact data and escaped JSON pointers identify nested differences', () => {
  const report = compareReference({ state: { 'opaque/a~b': [1, 2] }, events: [] }, { state: { 'opaque/a~b': [1, 3] }, events: [] });
  expect(report.firstMismatch?.path).toBe('/state/opaque~1a~0b/1');
  expect(report.result).toBe('different');
});

test('missing, extra, null and different types remain distinct', () => {
  const report = compareReference({ state: { missing: null, type: 1 }, events: [1, 2] },
    { state: { extra: false, type: '1' }, events: [1] });
  expect(report.mismatches.map(m => [m.kind, m.path])).toEqual([
    ['extra', '/state/extra'], ['missing', '/state/missing'], ['type', '/state/type'], ['missing', '/events/1'],
  ]);
  expect(report.mismatches[1]!.candidate).toEqual({ present: false });
  expect(report.mismatches[1]!.baseline).toEqual({ present: true, value: null });
});

test('event reordering fails even with identical final state; trailing events are extra', () => {
  const baseline = fixture(), candidate = fixture(); candidate.events.reverse();
  const report = compareReference(baseline, candidate);
  expect(report.result).toBe('different');
  expect(report.mismatches.every(m => m.path.startsWith('/events/'))).toBe(true);
  const extra = compareReference({ state: 0, events: [] }, { state: 0, events: ['unexpected'] });
  expect(extra.firstMismatch?.kind).toBe('extra');
});

test('array mismatch order is numeric, while object key insertion order is immaterial', () => {
  const a = Array.from({ length: 12 }, (_, i) => i), b = [...a]; b[2] = -1; b[10] = -1;
  expect(compareReference({ state: a, events: [] }, { state: b, events: [] }).mismatches.map(m => m.path)).toEqual(['/state/2', '/state/10']);
  expect(compareReference({ state: { a: 1, b: 2 }, events: [] }, { state: { b: 2, a: 1 }, events: [] }).valuesEqual).toBe(true);
});

test('missing or incomplete provenance makes otherwise equal values inconclusive', () => {
  for (const provenance of [undefined, { status: 'unknown', source: 'origin not established' }, { status: 'declared', source: 'missing scope' }]) {
    const input = { state: { tick: 7 }, events: [], ...(provenance ? { provenance } : {}) };
    const report = compareReference(input, input);
    expect(report.valuesEqual).toBe(true);
    expect(report.result).toBe('inconclusive');
    expect(report.provenance.baseline.status).toBe('unknown');
  }
});

test('declared provenance is reported independently on both sides, not asserted equal or verified', () => {
  const baseline = fixture(), candidate = { ...fixture(), provenance: { ...declared, source: 'candidate implementation' } };
  const report = compareReference(baseline, candidate);
  expect(report.provenance.candidate.source).toBe('candidate implementation');
  expect(report.provenance.baseline.source).toBe('synthetic authored fixture');
  expect(report.provenance.independentlyVerified).toBe(false);
});

test('preservation failures fail the comparison even when final values match', () => {
  const input = { ...fixture(), preservation: { before: { opaque: [1, 2] }, after: { opaque: [1, 3] } } };
  const report = compareReference(fixture(), input);
  expect(report.valuesEqual).toBe(true);
  expect(report.result).toBe('different');
  expect(report.preservation[0]!.status).toBe('not-supplied');
  expect(report.preservation[1]!.failures[0]!.path).toBe('/preservation/opaque/1');
  const unchanged = { ...fixture(), preservation: { before: { opaque: 1 }, after: { opaque: 1 } } };
  expect(compareReference(unchanged, unchanged).result).toBe('equal-with-declared-provenance');
});

test('unknown envelope fields and ignore requests reject rather than suppressing gameplay', () => {
  expect(() => compareReference({ ...fixture(), ignorePaths: ['/state/tick'] }, fixture())).toThrow('envelope');
  expect(() => compareReference({ ...fixture(), unknown: true }, fixture())).toThrow('envelope');
  expect(() => compareReference({ state: {}, events: {}, provenance: declared }, fixture())).toThrow('events');
});

test('non-JSON values, sparse arrays, accessors, cycles and malformed provenance reject', () => {
  const cycle: { self?: unknown } = {}; cycle.self = cycle;
  const sparse = new Array(3); sparse[0] = 1; sparse[2] = 3;
  for (const state of [NaN, Infinity, undefined, new Date(), sparse, cycle, { get value() { throw new Error('must not invoke getter'); } }]) {
    expect(() => compareReference({ state, events: [] }, fixture())).toThrow();
  }
  expect(() => compareReference({ ...fixture(), provenance: { status: 'accepted' } }, fixture())).toThrow('provenance status');
});
