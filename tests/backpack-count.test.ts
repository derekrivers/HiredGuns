import { describe, expect, it } from 'vitest';
import { OCS_ITEMS_SHA256 } from '../src/import/items';
import { transitionBackpackCount as transition, type BackpackCountInput as Input,
  type BackpackCountRecord as Record } from '../src/character/backpack-count';
import { transitionBackpackAction3Insertion } from '../src/character/backpack-action3-insertion';

// Synthetic complete storage and table projection, never an original actor/table fixture.
function fixture(): Input {
  return {
    profile: 'ocs-count-items-selection-one-middle-caller',
    actor: { playerIndex: 0, secondaryDeadWord: 0, windowType: 1, controlMethod: 1, pendingAction: 3,
      currentCell: 73, oldCell: 19, selection: 1, itemCount: 2, previousPosition: 812, noRoomCount: 423,
      equipment: 0x03a1b2c3, temporary: 0xfedcba98,
      carried: Array.from({ length: 30 }, (_, i) => (i < 2 ? (i + 1) * 0x1000000 : 0) + 0x20a040 + i),
      padding: [0xaabbccdd, 0x12345678, 0xfedcba98], spellWings: 0, usingGrenade: 0x4321,
      weight: 0x98765432, tooHeavy: 0, heavyCount: 23 },
    physique: 105, redrawFlag: 7,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256,
      records: Array.from({ length: 114 }, (_, i) => ({ itemId: i + 1,
        category: i < 3 ? [16, 16, 0][i]! : (i * 7) & 255,
        weight: i < 3 ? [7500, 4200, 3200][i]! : i * 13 })) },
  };
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
}
function objects(value: unknown): object[] {
  return value && typeof value === 'object' ? [value, ...Object.values(value).flatMap(objects)] : [];
}

describe('bounded diagnostic backpack count', () => {
  it('reads equipment then every carried ID, writes count once and records the bounded helper return', () => {
    const input = fixture(), before = structuredClone(input), expected = structuredClone(input);
    expected.actor.itemCount = 3; freeze(input);
    const result = transition(input);
    expect(result.candidate).toEqual(expected); expect(input).toEqual(before);
    const reads: Record[] = [
      { kind: 'read-id', target: 'actor.equipment', width: 1, value: 3 },
      ...Array.from({ length: 30 }, (_, i): Record => ({ kind: 'read-id', target: `actor.carried.${i}`,
        width: 1, value: i < 2 ? i + 1 : 0 })),
    ];
    expect(result.records).toEqual([...reads,
      { kind: 'write', target: 'actor.itemCount', width: 2, before: 2, after: 3 },
      { kind: 'count-return', continuation: 'damage-inventory-after-count', scope: 'middle-caller' }]);
    expect(result.records).toHaveLength(33);
    // Chronological logical replay verifies each read and the write's prior against current storage.
    const replay = structuredClone(input);
    for (const record of result.records) {
      if (record.kind === 'read-id') {
        const entry = record.target === 'actor.equipment' ? replay.actor.equipment :
          replay.actor.carried[Number(record.target.split('.')[2])]!;
        expect(entry >>> 24).toBe(record.value);
      } else if (record.kind === 'write') {
        expect(replay.actor.itemCount).toBe(record.before); replay.actor.itemCount = record.after;
      }
    }
    expect(replay).toEqual(result.candidate);
    // Reapplication is outside the accepted incoming diagnostic profile.
    expect(() => transition(result.candidate)).toThrow();
  });

  it('retains every opaque entry tail, padding, temporary, feedback, reference and table value at width endpoints', () => {
    for (const n of [0, 0xffffffff]) {
      const input = fixture();
      Object.assign(input.actor, { currentCell: n, oldCell: n === 0 ? 0xffffffff : 0, temporary: n, weight: n,
        previousPosition: n & 65535, noRoomCount: n & 65535, usingGrenade: n & 65535, heavyCount: n & 65535 });
      input.actor.equipment = 0x03000000 + (n & 0xffffff);
      input.actor.carried = input.actor.carried.map((v, i) => (v >>> 24) * 0x1000000 + ((n + i) & 0xffffff));
      input.actor.padding = [n, n, n]; input.redrawFlag = n & 255;
      const expected = structuredClone(input); expected.actor.itemCount = 3;
      expect(transition(input).candidate).toEqual(expected);
    }
  });

  it('detaches and deeply freezes every candidate, array, table row and record', () => {
    const input = fixture(), result = transition(input), expected = structuredClone(result), originals = new Set(objects(input));
    for (const object of objects(result)) {
      expect(Object.isFrozen(object)).toBe(true); expect(originals.has(object)).toBe(false);
    }
    expect(() => Object.assign(result.candidate.actor, { itemCount: 9 })).toThrow();
    expect(() => Object.assign(result.records[0]!, { value: 0 })).toThrow();
    input.items.records[0]!.weight = 0; input.actor.weight = 0;
    (input.actor.carried as number[]).fill(0); (input.actor.padding as number[]).fill(0);
    expect(result).toEqual(expected);
    const alias = fixture(); alias.actor.padding = alias.actor.carried;
    expect(() => transition(alias)).toThrow();
    const nullPrototype = fixture(); Object.setPrototypeOf(nullPrototype, null); Object.setPrototypeOf(nullPrototype.actor, null);
    expect(transition(nullPrototype).candidate).toEqual(transition(fixture()).candidate);
  });

  it('rejects unsupported diagnostic profiles, selectors, callers, populations and table projections atomically', () => {
    const mutations: ((x: Input) => void)[] = [
      x => { Object.assign(x, { profile: 'general-counter' }); },
      ...(['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction', 'selection', 'itemCount', 'spellWings', 'tooHeavy'] as const)
        .map(key => (x: Input) => { x.actor[key] = 9; }),
      ...[0, 2, 29, 30, 65535].map(n => (x: Input) => { x.actor.selection = n; }),
      x => { x.actor.oldCell = x.actor.currentCell; }, x => { x.actor.equipment = 0x04000000; },
      ...Array.from({ length: 30 }, (_, i) => (x: Input) => { (x.actor.carried as number[])[i] = 0x03000000; }),
      x => { x.physique = 106; }, x => { x.items.tableSha256 = '0'.repeat(64); },
      x => { Object.assign(x.items, { revision: 'cd32' }); }, x => { x.items.records[113]!.itemId = 1; },
      ...[0, 1, 2].flatMap(i => [(x: Input) => { x.items.records[i]!.weight++; },
        (x: Input) => { x.items.records[i]!.category = 23; }]),
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const prior = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(prior);
    }
    for (const value of [null, undefined, [], {}, 1, '2']) expect(() => transition(value as Input)).toThrow();
  });

  it('requires exact own data descriptors and array shapes without running getters or coercions', () => {
    let calls = 0;
    const locations = (x: Input): object[] => [x, x.actor, x.items, x.items.records,
      x.items.records[0]!, x.items.records[113]!, x.actor.carried, x.actor.padding];
    for (let i = 0; i < locations(fixture()).length; i++) {
      const keys = Object.keys(locations(fixture())[i]!);
      for (const key of keys) {
        const x = fixture(); Reflect.deleteProperty(locations(x)[i]!, key); expect(() => transition(x)).toThrow();
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

  it('rejects malformed numeric widths throughout retained storage without normalization', () => {
    const x = fixture();
    const fields = [
      ...Object.keys(x.actor).filter(k => !['carried', 'padding'].includes(k)).map(key => ['actor', key]),
      ['physique'], ['redrawFlag'], ['actor', 'carried', '0'], ['actor', 'carried', '29'],
      ['actor', 'padding', '2'], ['items', 'records', '113', 'category'], ['items', 'records', '113', 'weight'],
    ];
    for (const path of fields) for (const value of [-1, 0x100000000, NaN, Infinity, 0.5, '0', null, true, 1n]) {
      const input = fixture(); let target = input as unknown as { [key: string]: unknown };
      for (const key of path.slice(0, -1)) target = target[key!] as typeof target;
      target[path.at(-1)!] = value; expect(() => transition(input)).toThrow();
    }
    for (const [key, value] of [['pendingAction', 256], ['itemCount', 65536], ['usingGrenade', 65536],
      ['tooHeavy', 256], ['heavyCount', 65536]] as const) {
      const input = fixture(); input.actor[key] = value; expect(() => transition(input)).toThrow();
    }
  });

  it('does not repair insertion count or accept insertion output as a count profile', () => {
    const input = fixture(); const { profile, ...insertionInput } = input;
    expect(profile).toBe('ocs-count-items-selection-one-middle-caller');
    const inserted = transitionBackpackAction3Insertion(insertionInput);
    expect(inserted.candidate.actor.itemCount).toBe(2);
    expect(transition(input).candidate.actor.itemCount).toBe(3);
    expect(() => transition({ ...inserted.candidate, profile })).toThrow();
    expect(transitionBackpackAction3Insertion(insertionInput)).toEqual(inserted);
  });
});
