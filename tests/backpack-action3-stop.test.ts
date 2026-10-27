import { describe, expect, it } from 'vitest';
import { transitionBackpackAction3Stop as transition, type BackpackAction3StopInput as Input } from '../src/character/backpack-action3-stop';

function fixture(selection = 0): Input {
  return {
    actor: { playerIndex: 0, secondaryDeadWord: 0, windowType: 1, controlMethod: 1, pendingAction: 3,
      currentCell: 73, oldCell: 19, selection, itemCount: 2, equipment: 0x00abcdef, temporary: 0xfedcba98,
      carried: Array.from({ length: 30 }, (_, i) => (i < 2 ? (i + 1) * 0x1000000 : 0) + 0x20a040 + i),
      padding: [0xaabbccdd, 0x12345678, 0xfedcba98], spellWings: 0, usingGrenade: 0x4321,
      weight: 0x98765432, tooHeavy: 137, heavyCount: 23 },
    redrawFlag: 7,
  };
}
function freeze(input: Input): void {
  Object.freeze(input.actor.carried); Object.freeze(input.actor.padding);
  Object.freeze(input.actor); Object.freeze(input);
}

describe('bounded backpack action-three stop', () => {
  it.each([0, 1])('preserves the complete storage and ordered prior/new writes for selection %i', selection => {
    const input = fixture(selection), original = structuredClone(input), expected = structuredClone(input);
    expected.actor.oldCell = 73; expected.actor.pendingAction = 0;
    freeze(input);
    const result = transition(input);
    expect(result.candidate).toEqual(expected);
    expect(input).toEqual(original);
    expect(result.records).toEqual([
      { kind: 'write', target: 'actor.oldCell', width: 4, before: 19, after: 73 },
      { kind: 'write', target: 'actor.pendingAction', width: 1, before: 3, after: 0 },
      { kind: 'action-return', actor: 'actor' },
    ]);
    // Return metadata conveys logical completion, with no register restoration claim.
    expect(Object.keys(result)).toEqual(['candidate', 'records']);
  });

  it.each([0, 1])('returns detached, deeply frozen data for selection %i', selection => {
    const input = fixture(selection), result = transition(input), expected = structuredClone(result);
    expect(result.candidate).not.toBe(input); expect(result.candidate.actor).not.toBe(input.actor);
    expect(result.candidate.actor.carried).not.toBe(input.actor.carried);
    expect(result.candidate.actor.padding).not.toBe(input.actor.padding);
    for (const object of [result, result.candidate, result.candidate.actor, result.candidate.actor.carried,
      result.candidate.actor.padding, result.records, ...result.records]) expect(Object.isFrozen(object)).toBe(true);
    expect(() => { (result.candidate.actor.carried as number[])[29] = 0; }).toThrow();
    expect(() => { Object.assign(result.candidate.actor, { weight: 0 }); }).toThrow();
    expect(() => { Object.assign(result.records[0]!, { after: 0 }); }).toThrow();
    (input.actor.carried as number[])[29] = 0; (input.actor.padding as number[])[0] = 0;
    input.actor.weight = 0; input.redrawFlag = 0;
    expect(result).toEqual(expected);
  });

  it('retains opaque unsigned storage at both width endpoints without weight or feedback arithmetic', () => {
    for (const value of [0, 0xffffffff]) {
      const input = fixture(1);
      Object.assign(input.actor, { oldCell: value, currentCell: value === 0 ? 0xffffffff : 0,
        temporary: value, weight: value, tooHeavy: value & 255, usingGrenade: value & 65535, heavyCount: value & 65535 });
      (input.actor.padding as number[]).fill(value);
      const result = transition(input);
      expect(result.candidate).toEqual({ ...input, actor: { ...input.actor, oldCell: input.actor.currentCell, pendingAction: 0 } });
    }
    const input = fixture(); input.redrawFlag = 255;
    expect(transition(input).candidate.redrawFlag).toBe(255);
    expect(transition(input).records).toHaveLength(3);
  });

  it('rejects unsupported callers and malformed complete storage atomically', () => {
    const mutations: ((x: Input) => void)[] = [
      ...(['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction', 'itemCount', 'selection', 'spellWings'] as const)
        .map(key => (x: Input) => { x.actor[key] = key === 'selection' ? 29 : 9; }),
      x => { x.actor.oldCell = x.actor.currentCell; }, x => { x.actor.equipment = 0x01000000; },
      ...[0, 1, 2, 29].map(i => (x: Input) => { (x.actor.carried as number[])[i] = 0x03000000; }),
      x => { (x.actor.carried as number[]).pop(); }, x => { delete (x.actor.carried as number[])[29]; },
      x => { (x.actor.padding as number[]).push(0); }, x => { delete (x.actor.padding as number[])[1]; },
      ...(['currentCell', 'oldCell', 'equipment', 'temporary', 'weight'] as const).flatMap(key =>
        [-1, 2 ** 32, NaN, Infinity, 1.5].map(value => (x: Input) => { x.actor[key] = value; })),
      ...(['usingGrenade', 'heavyCount'] as const).map(key => (x: Input) => { x.actor[key] = 65536; }),
      x => { x.actor.tooHeavy = 256; }, x => { x.redrawFlag = 256; },
      x => { (x.actor.carried as number[])[29] = -1; }, x => { (x.actor.padding as number[])[2] = NaN; },
      x => { Object.assign(x, { items: {} }); }, x => { Object.assign(x.actor, { extra: 0 }); },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const before = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(before);
    }
    for (const value of [null, undefined, [], {}, 1, '2']) expect(() => transition(value as Input)).toThrow();
  });

  it('rejects accessors, coercion, inherited/hidden/symbol/extra data without invoking user code', () => {
    let calls = 0;
    for (const location of ['root', 'actor', 'carried', 'padding']) {
      for (const defect of ['getter', 'hidden', 'symbol', 'extra', 'prototype', 'missing']) {
        const input = fixture();
        const target = location === 'root' ? input : location === 'actor' ? input.actor : input.actor[location as 'carried' | 'padding'];
        const key = location === 'root' ? 'redrawFlag' : location === 'actor' ? 'weight' : '0';
        if (defect === 'getter') Object.defineProperty(target, key, { get: () => { calls++; return 0; } });
        if (defect === 'hidden') Object.defineProperty(target, key, { enumerable: false });
        if (defect === 'symbol') Object.defineProperty(target, Symbol('extra'), { value: 0 });
        if (defect === 'extra') Object.defineProperty(target, 'extra', { value: 0 });
        if (defect === 'prototype') Object.setPrototypeOf(target, { inherited: 0 });
        if (defect === 'missing') Reflect.deleteProperty(target, key);
        expect(() => transition(input)).toThrow();
      }
    }
    const input = fixture();
    Object.assign(input.actor, { weight: { valueOf: () => { calls++; return 0; } } });
    expect(() => transition(input)).toThrow();
    expect(calls).toBe(0);
  });

  it('accepts exact own data with null object prototypes and frozen descriptors', () => {
    const input = fixture(), expected = transition(input);
    Object.setPrototypeOf(input, null); Object.setPrototypeOf(input.actor, null); freeze(input);
    expect(transition(input)).toEqual(expected);
  });
});

it('requires every explicit field and rejects invalid numeric widths without coercion', () => {
  const widths = {
    playerIndex: 65535, secondaryDeadWord: 65535, windowType: 65535, controlMethod: 255,
    pendingAction: 255, currentCell: 0xffffffff, oldCell: 0xffffffff, selection: 65535,
    itemCount: 65535, equipment: 0xffffffff, temporary: 0xffffffff, spellWings: 65535,
    usingGrenade: 65535, weight: 0xffffffff, tooHeavy: 255, heavyCount: 65535,
  } as const;
  for (const [key, max] of Object.entries(widths)) {
    for (const value of [-1, max + 1, NaN, Infinity, 0.5, '0', null, undefined, false, 0n]) {
      const input = fixture(); Object.assign(input.actor, { [key]: value });
      const before = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(before);
    }
  }
  for (const location of ['root', 'actor'] as const) {
    const keys = Object.keys(location === 'root' ? fixture() : fixture().actor);
    for (const key of keys) {
      const input = fixture(); Reflect.deleteProperty(location === 'root' ? input : input.actor, key);
      const before = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(before);
    }
  }
  for (const value of [-1, 256, NaN, Infinity, 0.5, '0', null, false, 0n]) {
    const input = fixture(); Object.assign(input, { redrawFlag: value });
    expect(() => transition(input)).toThrow();
  }
  for (const storage of ['carried', 'padding'] as const) {
    for (const value of [-1, 2 ** 32, NaN, Infinity, 0.5, '0', null, false, 0n]) {
      const input = fixture(); Object.assign(input.actor[storage], { 0: value });
      const before = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(before);
    }
  }
});
