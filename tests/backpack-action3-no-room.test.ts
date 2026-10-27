import { describe, expect, it } from 'vitest';
import { OCS_ITEMS_SHA256 } from '../src/import/items';
import { transitionBackpackAction3NoRoom as transition, type BackpackAction3NoRoomInput as Input,
  type BackpackAction3NoRoomRecord as Record } from '../src/character/backpack-action3-no-room';

// Synthetic complete storage and table projection, never an original actor/table fixture.
function fixture(): Input {
  return {
    actor: { playerIndex: 0, secondaryDeadWord: 0, windowType: 1, controlMethod: 1, pendingAction: 3,
      currentCell: 73, oldCell: 19, selection: 0, itemCount: 30, previousPosition: 812, noRoomCount: 423,
      equipment: 0x03a1b2c3, temporary: 0xfedcba98,
      carried: Array.from({ length: 30 }, (_, i) => (1 + i % 2) * 0x1000000 + 0x20a040 + i),
      padding: [0xaabbccdd, 0x12345678, 0xfedcba98], spellWings: 0, usingGrenade: 0x4321,
      weight: 0x98765432, tooHeavy: 0, heavyCount: 23 },
    physique: 105, redrawFlag: 7,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256,
      records: Array.from({ length: 114 }, (_, i) => ({ itemId: i + 1,
        category: i < 3 ? [16, 16, 0][i]! : (i * 7) & 255,
        weight: i * 13 })) },
  };
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
}
function objects(value: unknown): object[] {
  return value && typeof value === 'object' ? [value, ...Object.values(value).flatMap(objects)] : [];
}

describe('bounded occupied action-three no-room', () => {
  it('preserves every complete entry and feedback byte, with four prior/new writes then two natural returns', () => {
    const input = fixture(), original = structuredClone(input), expected = structuredClone(input);
    Object.assign(expected.actor, { oldCell: input.actor.currentCell, pendingAction: 0, previousPosition: 0, noRoomCount: 150 });
    freeze(input);
    const result = transition(input);
    expect(result.candidate).toEqual(expected); expect(input).toEqual(original);
    expect(result.records).toEqual([
      { kind: 'write', target: 'actor.oldCell', width: 4, before: 19, after: 73 },
      { kind: 'write', target: 'actor.pendingAction', width: 1, before: 3, after: 0 },
      { kind: 'write', target: 'actor.previousPosition', width: 2, before: 812, after: 0 },
      { kind: 'write', target: 'actor.noRoomCount', width: 2, before: 423, after: 150 },
      { kind: 'insert-return', resultWord: 65535 },
      { kind: 'action-return', actor: 'actor', currentCell: 73 },
    ] satisfies Record[]);
    // Replay independently, rejecting stale prior values before any write.
    const replay = structuredClone(input);
    for (const record of result.records) if (record.kind === 'write') {
      const key = record.target.slice(6) as 'oldCell' | 'pendingAction' | 'previousPosition' | 'noRoomCount';
      expect(replay.actor[key]).toBe(record.before); replay.actor[key] = record.after;
    }
    expect(replay).toEqual(result.candidate);
    expect(result.candidate.actor.itemCount).toBe(30);
    expect([input.actor.equipment, ...input.actor.carried].filter(n => n >>> 24)).toHaveLength(31);
    expect(() => transition(result.candidate as Input)).toThrow(); // Consumed action, no repeat effects.
  });

  it('detaches and deeply freezes every output object, including every table row and record', () => {
    const input = fixture(), result = transition(input), expected = structuredClone(result);
    const inputs = new Set(objects(input));
    for (const object of objects(result)) {
      expect(Object.isFrozen(object)).toBe(true); expect(inputs.has(object)).toBe(false);
    }
    expect(() => Object.assign(result.candidate.items.records[0]!, { weight: 1 })).toThrow();
    expect(() => Object.assign(result.candidate.actor.carried, { 29: 0 })).toThrow();
    expect(() => Object.assign(result.records[0]!, { after: 0 })).toThrow();
    input.items.records[0]!.weight = 0; input.actor.weight = 0;
    (input.actor.carried as number[]).fill(0); (input.actor.padding as number[]).fill(0);
    expect(result).toEqual(expected);
  });

  it('retains opaque width endpoints, all padding IDs and redundant prior/new writes', () => {
    for (const n of [0, 0xffffffff]) {
      const input = fixture();
      Object.assign(input.actor, { currentCell: n, oldCell: n === 0 ? 0xffffffff : 0, temporary: n, weight: n,
        previousPosition: 0, noRoomCount: 150, usingGrenade: n & 65535, heavyCount: n & 65535 });
      input.actor.equipment = 0x03000000 + (n & 0xffffff);
      input.actor.carried = input.actor.carried.map((entry, i) => ((entry >>> 24) * 0x1000000) + ((n + i) & 0xffffff));
      input.actor.padding = [n, n, n]; input.redrawFlag = n & 255;
      const output = transition(input);
      expect(output.candidate.actor.temporary).toBe(n); expect(output.candidate.actor.padding).toEqual([n, n, n]);
      expect(output.candidate.actor.carried).toEqual(input.actor.carried);
      expect(output.candidate.actor.equipment).toBe(input.actor.equipment);
      expect(output.candidate.actor.weight).toBe(n); expect(output.candidate.redrawFlag).toBe(n & 255);
      expect(output.records.slice(2, 4)).toEqual([
        { kind: 'write', target: 'actor.previousPosition', width: 2, before: 0, after: 0 },
        { kind: 'write', target: 'actor.noRoomCount', width: 2, before: 150, after: 150 },
      ]);
    }
  });

  it('retains every unused table weight and row without computing weight or authenticating a hash witness', () => {
    const input = fixture();
    input.items.records.forEach((row, i) => { row.weight = i % 2 ? 0 : 65535; if (i >= 3) row.category = 255; });
    const result = transition(input);
    expect(result.candidate.items).toEqual(input.items);
    expect(result.candidate.actor.weight).toBe(input.actor.weight);
    expect(result.records).toHaveLength(6);
  });

  it('rejects unsupported callers, IDs, retained physique and table witnesses atomically', () => {
    const mutations: ((x: Input) => void)[] = [
      ...(['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction', 'selection', 'itemCount', 'spellWings', 'tooHeavy'] as const)
        .map(key => (x: Input) => { x.actor[key] = 9; }),
      x => { x.actor.oldCell = x.actor.currentCell; }, x => { x.actor.equipment = 0x04000000; },
      ...[0, 1, 2, 29].map(i => (x: Input) => { (x.actor.carried as number[])[i] = 0x03000000; }),
      x => { x.physique = 106; }, x => { x.physique = 104; },
      x => { x.items.tableSha256 = '0'.repeat(64); }, x => { Object.assign(x.items, { revision: 'cd32' }); },
      ...[0, 1, 2].flatMap(i => [
        (x: Input) => { x.items.records[i]!.category = 23; },
      ]), x => { x.items.records[113]!.itemId = 1; },
      x => { x.actor.carried = Array(30).fill(0x01000000); },
      ...[0, 7, 29].map(i => (x: Input) => { (x.actor.carried as number[])[i] = 0; }),
      x => { x.actor.itemCount = 31; }, x => { x.actor.itemCount = 0; },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const before = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(before);
    }
    for (const value of [null, undefined, [], {}, 1, '2']) expect(() => transition(value as Input)).toThrow();
  });

  it('requires every field and exact descriptor/array shape without invoking accessors or coercion', () => {
    let calls = 0;
    const locations = (x: Input): object[] => [x, x.actor, x.items, x.items.records, x.items.records[0]!, x.items.records[113]!, x.actor.carried, x.actor.padding];
    for (let i = 0; i < locations(fixture()).length; i++) {
      const keys = Object.keys(locations(fixture())[i]!);
      for (const key of keys) {
        const x = fixture(); Reflect.deleteProperty(locations(x)[i]!, key);
        expect(() => transition(x)).toThrow();
      }
      for (const defect of ['getter', 'hidden', 'symbol', 'extra', 'prototype']) {
        const x = fixture(), target = locations(x)[i]!, key = keys[0]!;
        if (defect === 'getter') Object.defineProperty(target, key, { get: () => { calls++; return 0; } });
        if (defect === 'hidden') Object.defineProperty(target, key, { enumerable: false });
        if (defect === 'symbol') Object.defineProperty(target, Symbol('extra'), { value: 0 });
        if (defect === 'extra') Object.defineProperty(target, 'extra', { value: 0 });
        if (defect === 'prototype') Object.setPrototypeOf(target, { inherited: 0 });
        expect(() => transition(x)).toThrow();
      }
    }
    const x = fixture(); Object.assign(x.actor, { weight: { valueOf: () => { calls++; return 0; } } });
    expect(() => transition(x)).toThrow(); expect(calls).toBe(0);
  });

  it('checks all numeric widths, array slots and item projection fields without coercion', () => {
    const widths = { playerIndex: 65535, secondaryDeadWord: 65535, windowType: 65535, controlMethod: 255,
      pendingAction: 255, currentCell: 0xffffffff, oldCell: 0xffffffff, selection: 65535, itemCount: 65535,
      previousPosition: 65535, noRoomCount: 65535, equipment: 0xffffffff, temporary: 0xffffffff,
      spellWings: 65535, usingGrenade: 65535, weight: 0xffffffff, tooHeavy: 255, heavyCount: 65535 };
    const invalid = (max: number) => [-1, max + 1, NaN, Infinity, 0.5, '0', null, undefined, false, 0n];
    for (const [key, max] of Object.entries(widths)) for (const value of invalid(max)) {
      const x = fixture(); Object.assign(x.actor, { [key]: value }); const before = structuredClone(x);
      expect(() => transition(x)).toThrow(); expect(x).toEqual(before);
    }
    for (const [key, max] of [['physique', 65535], ['redrawFlag', 255]] as const) for (const value of invalid(max)) {
      const x = fixture(); Object.assign(x, { [key]: value }); expect(() => transition(x)).toThrow();
    }
    for (const key of ['carried', 'padding'] as const) for (let i = 0; i < fixture().actor[key].length; i++) {
      for (const value of invalid(0xffffffff)) {
        const x = fixture(); Object.assign(x.actor[key], { [i]: value }); expect(() => transition(x)).toThrow();
      }
      const x = fixture(); (x.actor[key] as number[]).push(0); expect(() => transition(x)).toThrow();
    }
    for (const [key, max] of [['itemId', 255], ['category', 255], ['weight', 65535]] as const) for (const value of invalid(max)) {
      const x = fixture(); Object.assign(x.items.records[113]!, { [key]: value }); expect(() => transition(x)).toThrow();
    }
    const x = fixture(); (x.items.records as unknown[]).push({}); expect(() => transition(x)).toThrow();
  });

  it('accepts exact frozen own data with null object prototypes', () => {
    const x = fixture(), expected = transition(x);
    for (const value of objects(x)) if (!Array.isArray(value)) Object.setPrototypeOf(value, null);
    freeze(x); expect(transition(x)).toEqual(expected);
  });
});
