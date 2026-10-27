import { describe, expect, it } from 'vitest';
import { transitionBackpackAction4, type BackpackAction4Input } from '../src/character/backpack-action4';
import { OCS_ITEMS_SHA256 } from '../src/import/items';

function fixture(): BackpackAction4Input {
  // Entirely authored data, including arithmetic records; the witness is a synthetic claim.
  return {
    actor: { playerIndex: 0, secondaryDeadWord: 0, windowType: 1, controlMethod: 1, pendingAction: 4,
      currentCell: 73, oldCell: 19, selection: 1, itemCount: 4,
      equipment: 0x041526f7, temporary: 0x87654321,
      carried: [0x01aabbcc, 0x02def198, 0x03765432, ...Array.from({ length: 27 }, (_, i) => 0x12ab00 + i)],
      padding: [0xaabbccdd, 0x12345678, 0xfedcba98], spellWings: 0, usingGrenade: 0x4321,
      weight: 0x98765432, tooHeavy: 0, heavyCount: 23 },
    physique: 9, redrawFlag: 7,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256,
      records: Array.from({ length: 114 }, (_, i) => ({ itemId: i + 1, category: 0, weight: i < 4 ? 140 * (i + 1) : 0 })) },
  };
}
function freeze(value: object): void {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  Object.freeze(value);
}

describe('bounded occupied manual action-4 exchange', () => {
  it('copies complete entries, leaves the selected entry in temp, and preserves every other supplied field', () => {
    const input = fixture(), before = structuredClone(input);
    freeze(input);
    const result = transitionBackpackAction4(input), expected = structuredClone(before);
    Object.assign(expected.actor, { oldCell: 73, pendingAction: 0, temporary: 0x02def198, equipment: 0x02def198,
      usingGrenade: 0, weight: 1400, tooHeavy: 255, heavyCount: 50 });
    expected.actor.carried[1] = 0x041526f7;
    expected.redrawFlag = 255;
    expect(result.candidate).toEqual(expected);
    expect(input).toEqual(before);
    expect(result.arithmetic).toEqual({ totalWeight: 1400, quotient: 10, remainder: 0, signedQuotient: 10, signedPhysique: 9, tooHeavy: true });
    result.candidate.actor.carried[29] = 0;
    result.candidate.actor.padding[0] = 0;
    result.candidate.items.records[0]!.weight = 0;
    expect(transitionBackpackAction4(input).candidate).toEqual(expected);
  });

  it('retains exact write widths, previous values, three copy returns, weight return and redundant redraw', () => {
    const result = transitionBackpackAction4(fixture());
    const w = (target: string, width: number, before: number, after: number) => ({ kind: 'write', target, width, before, after });
    expect(result.records).toEqual([
      w('actor.oldCell', 4, 19, 73), w('actor.pendingAction', 1, 4, 0),
      w('actor.temporary', 4, 0x87654321, 0x02def198), { kind: 'copy-return', copy: 'selected-to-temporary' },
      w('actor.carried.1', 4, 0x02def198, 0x041526f7), { kind: 'copy-return', copy: 'equipment-to-selected' },
      w('actor.equipment', 4, 0x041526f7, 0x02def198), { kind: 'copy-return', copy: 'temporary-to-equipment' },
      w('actor.usingGrenade', 2, 0x4321, 0), w('actor.weight', 4, 0x98765432, 1400),
      w('actor.heavyCount', 2, 23, 50), w('redrawFlag', 1, 7, 255), w('actor.tooHeavy', 1, 0, 255),
      { kind: 'weight-return', actor: 'actor', currentCell: 73 }, w('redrawFlag', 1, 255, 255),
      { kind: 'action-return', actor: 'actor', currentCell: 73 },
    ]);
  });

  it.each(['already-heavy', 'clears-heavy'] as const)('preserves the observed %s feedback path', branch => {
    const input = fixture();
    input.actor.tooHeavy = 255;
    if (branch === 'clears-heavy') input.physique = 11;
    const result = transitionBackpackAction4(input), writes = result.records.filter(r => r.kind === 'write');
    expect(writes.slice(7).map(r => [r.target, r.before, r.after])).toEqual(branch === 'already-heavy'
      ? [['actor.heavyCount', 23, 50], ['redrawFlag', 7, 255]]
      : [['redrawFlag', 7, 255], ['actor.tooHeavy', 255, 0], ['redrawFlag', 255, 255]]);
    expect(result.candidate.actor.heavyCount).toBe(branch === 'already-heavy' ? 50 : 23);
  });

  it('recalculates unchanged weight, ignores entry counts/tails, and uses unsigned division then signed word comparison', () => {
    const input = fixture();
    input.actor.weight = 1400;
    input.items.records[0]!.weight++;
    input.physique = 65535; // Signed -1, so the positive quotient is heavy.
    const result = transitionBackpackAction4(input);
    expect(result.arithmetic).toEqual({ totalWeight: 1401, quotient: 10, remainder: 1, signedQuotient: 10, signedPhysique: -1, tooHeavy: true });
    input.items.records[0]!.weight--;
    expect(transitionBackpackAction4(input).records).toContainEqual({ kind: 'write', target: 'actor.weight', width: 4, before: 1400, after: 1400 });
  });

  it('treats quotient equality as the observed clear-heavy branch and retains unsigned item words', () => {
    const input = fixture();
    input.actor.tooHeavy = 255;
    input.physique = 10;
    expect(transitionBackpackAction4(input).candidate.actor.tooHeavy).toBe(0);
    input.items.records.slice(0, 4).forEach(item => { item.weight = 65535; });
    input.physique = 1873;
    const result = transitionBackpackAction4(input);
    expect(result.arithmetic).toMatchObject({ totalWeight: 262140, quotient: 1872, remainder: 60, tooHeavy: false });
  });

  it('copies exact nonenumerable own data and rejects accessor fields without executing them', () => {
    const input = fixture(), expected = transitionBackpackAction4(input);
    Object.defineProperty(input.actor, 'equipment', { enumerable: false });
    Object.defineProperty(input.actor.carried, '1', { enumerable: false });
    Object.defineProperty(input.items.records[0], 'weight', { enumerable: false });
    expect(transitionBackpackAction4(input)).toEqual(expected);
    let calls = 0;
    for (const [target, key] of [[input, 'actor'], [fixture().actor, 'equipment'], [fixture().actor.carried, '1'], [fixture().items.records[0]!, 'weight']] as const) {
      const broken = fixture();
      if (key === 'actor') Object.defineProperty(broken, key, { get: () => { calls++; return target; } });
      else if (key === 'equipment') Object.defineProperty(broken.actor, key, { get: () => { calls++; return 0; } });
      else if (key === '1') Object.defineProperty(broken.actor.carried, key, { get: () => { calls++; return 0; } });
      else Object.defineProperty(broken.items.records[0], key, { get: () => { calls++; return 0; } });
      expect(() => transitionBackpackAction4(broken)).toThrow();
    }
    expect(calls).toBe(0);
  });

  it('rejects malformed widths/shapes and unsupported prerequisites atomically', () => {
    const mutations: ((input: BackpackAction4Input) => void)[] = [
      x => { x.actor.playerIndex = 1; }, x => { x.actor.secondaryDeadWord = 1; }, x => { x.actor.windowType = 7; },
      x => { x.actor.controlMethod = 2; }, x => { x.actor.pendingAction = 0; }, x => { x.actor.oldCell = x.actor.currentCell; },
      x => { x.actor.selection = 0; }, x => { x.actor.itemCount = 3; }, x => { x.actor.spellWings = 24; },
      x => { x.actor.equipment = 0; }, x => { x.actor.carried[1] = 0; }, x => { x.actor.carried[29] = 0x01000000; },
      x => { x.actor.carried[0] = 0x02000000; }, x => { x.actor.carried[2] = 0; },
      x => { x.actor.tooHeavy = 1; }, x => { x.actor.tooHeavy = 0; x.physique = 10; },
      x => { x.actor.weight = -1; }, x => { x.actor.equipment = 2 ** 32; }, x => { x.actor.padding[2] = NaN; },
      x => { x.actor.heavyCount = 65536; }, x => { x.actor.usingGrenade = -1; }, x => { x.physique = 1.5; }, x => { x.redrawFlag = 256; },
      x => { x.actor.carried.pop(); }, x => { delete x.actor.carried[29]; }, x => { x.actor.padding.push(0); },
      x => { x.items.records.pop(); }, x => { delete x.items.records[90]; }, x => { x.items.records[90]!.weight = 65536; },
      x => { x.items.records[0]!.category = 4; }, x => { x.items.records[1]!.category = 21; }, x => { x.items.records[2]!.category = 23; },
      x => { x.items.records[113]!.category = 256; }, x => { x.items.records[0]!.itemId = 2; },
      x => { x.items.records.forEach(item => { item.weight = 0; }); },
      x => { x.items.tableSha256 = 'authored mismatch'; },
      x => { Object.assign(x.items, { revision: 'cd32-archive' }); },
      x => { Object.assign(x.actor, { extra: 0 }); }, x => { Object.assign(x, { extra: 0 }); },
      x => { Object.assign(x.items.records[113]!, { extra: 0 }); },
      x => { Object.defineProperty(x.actor, Symbol('hidden'), { value: 0 }); },
      x => { Object.defineProperty(x.actor.padding, 'extra', { value: 0 }); },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input);
      const before = structuredClone(input);
      expect(() => transitionBackpackAction4(input)).toThrow();
      expect(input).toEqual(before);
    }
    for (const value of [null, undefined, [], {}]) expect(() => transitionBackpackAction4(value as BackpackAction4Input)).toThrow();
  });
});
