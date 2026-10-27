import { describe, expect, it } from 'vitest';
import { prepareShootingArgument as prepare, type ShootingArgumentInput as Input } from '../src/character/shooting-argument';

// Synthetic pointers, registers and prior storage; no original image or layout.
function fixture(): Input {
  return { profile: 'ocs-item-argument-before-fitness', invocation: 'diagnostic-player-hit-prefix', targetIndex: 0,
    parameterOrigin: { revision: 'ocs-runtime', tableSha256: '633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc',
      rowSha256: '7dc1eba2a060d7fded68734c0498a86dab78e21e9245990ea618d526ac430411',
      rowIndex: 24, itemId: 25, category: 0, damage: 20, duration: 5 },
    registers: { d: [0xbeef0000, 0xabcd9876, 0xfedcba98, 0, 0xffffffff, 123, 456, 789],
      a: Array.from({ length: 8 }, (_, i) => ({ anchor: `synthetic${i}`, byteOffset: i * 7 })) },
    statisticsReference: { anchor: 'syntheticStats', byteOffset: 3 }, stackPrior: [0, 0xffffffff, 0xaabbccdd, 0x12345678] };
}
function objects(value: unknown): object[] {
  return value && typeof value === 'object' ? [value, ...Object.values(value).flatMap(objects)] : [];
}
describe('disconnected pre-fitness item argument', () => {
  it('clears complete damage/duration registers, preserves context and prepares the complete saved frame before the call', () => {
    const input = fixture(), before = structuredClone(input), result = prepare(input), { snapshots, candidate } = result;
    expect(snapshots.map(s => s.step)).toEqual(Array.from({ length: 19 }, (_, i) => i));
    expect(snapshots[1]!.registers.d[1]).toBe(0xabcd0000);
    expect(snapshots[2]!.registers.d[0]).toBe(0);
    expect(snapshots[4]!.registers.d[0]).toBe(0);
    expect(snapshots[5]!.registers.d[0]).toBe(20);
    expect(snapshots[6]!.registers.d[2]).toBe(0);
    expect(snapshots[7]!.registers.d[2]).toBe(5);
    expect([8, 9, 10].map(i => snapshots[i]!.registers.d[0])).toEqual([100, 25600, 51200]);
    expect(candidate.registers.d).toEqual([51200, 0, 0, ...input.registers.d.slice(3)]);
    expect(candidate.registers.a).toEqual([input.registers.a[5], input.statisticsReference, input.registers.a[5],
      ...input.registers.a.slice(3, 7), { ...input.registers.a[7], byteOffset: input.registers.a[7]!.byteOffset - 16 }]);
    expect(candidate.savedFrame).toEqual([51200, input.registers.a[0], input.registers.a[1], input.registers.a[5]]);
    expect(candidate.boundary).toBe('before-fitness-call'); expect(result.definedStatus).toEqual({ x: 0 });
    expect(input).toEqual(before);
    for (const s of snapshots) {
      expect(s.registers.d.slice(3)).toEqual(input.registers.d.slice(3));
      expect(s.registers.a.slice(3, 7)).toEqual(input.registers.a.slice(3, 7));
    }
    // No restore/pop: old A0/A1 remain in frame after actual argument registers change.
    expect(snapshots[11]!.registers.a[0]).toEqual(input.registers.a[0]);
    expect(snapshots[11]!.registers.a[1]).toEqual(input.registers.a[1]);
    expect(candidate.registers.a[7]).toEqual(snapshots[11]!.registers.a[7]);
  });

  it('records the two source reads followed by reverse MOVEM writes with exact complete prior/new longs', () => {
    const input = fixture(), result = prepare(input);
    expect(result.records).toEqual([
      { kind: 'read', step: 4, field: 'damage', width: 1, value: 20 },
      { kind: 'read', step: 6, field: 'duration', width: 1, value: 5 },
      { kind: 'write', step: 10, slot: 3, register: 'a2', width: 4, before: 0x12345678, after: input.registers.a[5] },
      { kind: 'write', step: 10, slot: 2, register: 'a1', width: 4, before: 0xaabbccdd, after: input.registers.a[1] },
      { kind: 'write', step: 10, slot: 1, register: 'a0', width: 4, before: 0xffffffff, after: input.registers.a[0] },
      { kind: 'write', step: 10, slot: 0, register: 'd0', width: 4, before: 0, after: 51200 },
    ]);
    const frame: unknown[] = [...input.stackPrior];
    for (const record of result.records) {
      if (record.kind === 'read') expect(input.parameterOrigin[record.field]).toBe(record.value);
      else { expect(frame[record.slot]).toBe(record.before); frame[record.slot] = record.after; }
    }
    expect(frame).toEqual(result.candidate.savedFrame);
    expect(result.records.filter(r => r.kind === 'write').map(r => r.slot)).toEqual([3, 2, 1, 0]);
  });

  it('returns deeply frozen detached candidates, instruction snapshots and receipts even with reference aliases', () => {
    const input = fixture(); (input.registers.a as unknown[])[2] = input.registers.a[5];
    input.statisticsReference = input.registers.a[0]!;
    const originals = new Set(objects(input)); objects(input).forEach(Object.freeze);
    const result = prepare(input), expected = structuredClone(result);
    for (const object of objects(result)) { expect(Object.isFrozen(object)).toBe(true); expect(originals.has(object)).toBe(false); }
    expect(() => Object.assign(result.candidate.registers.a[0]!, { anchor: 'changed' })).toThrow();
    expect(() => Object.assign(result.snapshots[0]!.registers.d, { 0: 1 })).toThrow();
    expect(result).toEqual(expected);
    const mutable = fixture(), detached = prepare(mutable), saved = structuredClone(detached);
    (mutable.registers.d as number[]).fill(0); mutable.registers.a[5]!.anchor = 'changed';
    (mutable.stackPrior as number[]).fill(99); mutable.statisticsReference.byteOffset = 999;
    expect(detached).toEqual(saved);
  });

  it('retains width endpoints and opaque pointer identities without normalizing context', () => {
    for (const n of [0, 0xffffffff]) {
      const input = fixture(); input.registers.d = [n === 0 ? 0 : 0xffff0000, ...Array<number>(7).fill(n)];
      input.stackPrior = Array<number>(4).fill(n);
      input.registers.a[7]!.byteOffset = -0x80000000 + 16;
      input.registers.a[0]!.byteOffset = 0x7fffffff;
      const result = prepare(input);
      expect(result.candidate.registers.d.slice(3)).toEqual(Array<number>(5).fill(n));
      expect(result.candidate.registers.a[7]!.byteOffset).toBe(-0x80000000);
      expect(result.candidate.savedFrame[1]).toEqual(input.registers.a[0]);
    }
    const input = fixture(); Object.setPrototypeOf(input, null); Object.setPrototypeOf(input.parameterOrigin, null);
    expect(prepare(input)).toEqual(prepare(fixture()));
  });

  it('atomically rejects other item/duration/damage/target/invocation profiles', () => {
    const changes: readonly (readonly [string, unknown])[] = [
      ['profile', 'other'], ['invocation', 'actual-hit'], ['targetIndex', 1],
      ...['revision', 'tableSha256', 'rowSha256', 'rowIndex', 'itemId', 'category', 'damage', 'duration'].map(k => [`parameterOrigin.${k}`, 1] as const),
      ['registers.d.0', 1], ['registers.a.7.byteOffset', -0x80000000 + 15],
    ] as const;
    for (const [path, value] of changes) {
      const input = fixture(); set(input, path, value); const before = structuredClone(input);
      expect(() => prepare(input)).toThrow(); expect(input).toEqual(before);
    }
    for (const value of [null, undefined, 0, [], {}, 'input']) expect(() => prepare(value as Input)).toThrow();
  });

  it('rejects malformed descriptors, shapes, prototypes and coercions with zero getters', () => {
    let calls = 0;
    const locations = (x: Input): object[] => [x, x.parameterOrigin, x.registers, x.registers.d, x.registers.a,
      ...x.registers.a, x.statisticsReference, x.stackPrior];
    for (let i = 0; i < locations(fixture()).length; i++) {
      for (const key of Object.keys(locations(fixture())[i]!)) {
        for (const defect of ['missing', 'getter', 'hidden']) {
          const input = fixture(), target = locations(input)[i]!;
          if (defect === 'missing') Reflect.deleteProperty(target, key);
          if (defect === 'getter') Object.defineProperty(target, key, { get: () => { calls++; throw Error('getter'); } });
          if (defect === 'hidden') Object.defineProperty(target, key, { enumerable: false });
          expect(() => prepare(input)).toThrow();
        }
      }
      for (const defect of ['symbol', 'extra', 'prototype']) {
        const input = fixture(), target = locations(input)[i]!;
        if (defect === 'symbol') Object.defineProperty(target, Symbol('x'), { value: 1 });
        if (defect === 'extra') Object.defineProperty(target, 'extra', { value: 1 });
        if (defect === 'prototype') Object.setPrototypeOf(target, { inherited: 1 });
        expect(() => prepare(input)).toThrow();
      }
    }
    const input = fixture(); set(input, 'registers.d.3', { valueOf: () => { calls++; return 0; } });
    expect(() => prepare(input)).toThrow(); expect(calls).toBe(0);
  });

  it('validates every retained register, prior long and reference width without coercion', () => {
    for (const path of [...Array.from({ length: 8 }, (_, i) => `registers.d.${i}`),
      ...Array.from({ length: 4 }, (_, i) => `stackPrior.${i}`)]) {
      for (const value of [-1, 0x100000000, 0.5, NaN, Infinity, '0', null, true, 0n]) {
        const input = fixture(); set(input, path, value); expect(() => prepare(input)).toThrow();
      }
    }
    for (const path of [...Array.from({ length: 8 }, (_, i) => `registers.a.${i}`), 'statisticsReference']) {
      for (const value of [-0x80000001, 0x80000000, 0.5, NaN, Infinity, '0', null, true, 0n]) {
        const input = fixture(); set(input, `${path}.byteOffset`, value); expect(() => prepare(input)).toThrow();
      }
      for (const anchor of ['', 'a b', 'a.b', '0abc', 'a'.repeat(65), 1, null]) {
        const input = fixture(); set(input, `${path}.anchor`, anchor); expect(() => prepare(input)).toThrow();
      }
    }
  });
});
function set(input: Input, path: string, value: unknown): void {
  const keys = path.split('.'); let target = input as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) target = target[key] as typeof target;
  target[keys.at(-1)!] = value;
}
