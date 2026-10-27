import { describe, expect, it } from 'vitest';
import { transitionBackpackEmptyEquipment as transition, type BackpackEmptyEquipmentInput as Input } from '../src/character/backpack-empty-equipment';
import { OCS_ITEMS_SHA256 } from '../src/import/items';

function fixture(prefix = 4): Input {
  return {
    actor: { playerIndex: 0, secondaryDeadWord: 0, windowType: 1, controlMethod: 1, pendingAction: 4,
      currentCell: 73, oldCell: 19, selection: prefix === 1 ? 0 : 1, itemCount: prefix,
      equipment: 0x0065abfe, temporary: 0x87654321,
      carried: Array.from({ length: 30 }, (_, i) => ((i < prefix ? (i + 1) * 0x1000000 : 0) + 0x20a040 + i)),
      padding: [0xaabbccdd, 0x12345678, 0xfedcba98], spellWings: 0, usingGrenade: 0x4321,
      weight: 0x98765432, tooHeavy: prefix === 4 ? 0 : 255, heavyCount: 23 },
    physique: prefix === 1 ? 2 : 0, redrawFlag: 7,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256,
      records: Array.from({ length: 114 }, (_, i) => ({ itemId: i + 1, category: 0, weight: 141 })) },
  };
}
function freeze(value: object): void {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') freeze(child); });
  Object.freeze(value);
}

describe('bounded empty-equipment action-4', () => {
  it.each([4, 2, 1])('retains every candidate field and full-entry tails for prefix %i', prefix => {
    const input = fixture(prefix), expected = structuredClone(input), original = structuredClone(input);
    freeze(input);
    const a = expected.actor, selected = a.selection;
    a.equipment = a.carried[selected]!;
    for (let i = selected; i < prefix - 1; i++) a.carried[i] = a.carried[i + 1]!;
    a.carried[prefix - 1] = a.carried[prefix - 1]! & 0xffffff;
    Object.assign(a, { oldCell: 73, pendingAction: 0, selection: prefix === 4 ? 1 : 0,
      usingGrenade: 0, weight: prefix * 141, tooHeavy: prefix === 1 ? 0 : 255, heavyCount: prefix === 1 ? 23 : 50 });
    expected.redrawFlag = 255;
    const result = transition(input);
    expect(result.candidate).toEqual(expected);
    expect(input).toEqual(original);
    result.candidate.actor.carried[29] = 0;
    result.candidate.actor.padding[0] = 0;
    result.candidate.items.records[0]!.weight = 0;
    expect(transition(input).candidate).toEqual(expected);
  });

  it.each([4, 2, 1])('records two full scans and nested return boundaries for prefix %i', prefix => {
    const input = fixture(prefix), { records } = transition(input);
    const writes = records.filter(r => r.kind === 'write');
    expect(writes).toHaveLength(prefix === 4 ? 15 : prefix === 2 ? 12 : 11);
    expect(writes.slice(0, 3).map(r => [r.target, r.width, r.before, r.after])).toEqual([
      ['actor.oldCell', 4, 19, 73], ['actor.pendingAction', 1, 4, 0],
      ['actor.equipment', 4, input.actor.equipment, input.actor.carried[input.actor.selection]],
    ]);
    const clear = writes.find(r => r.target === `actor.carried.${prefix - 1}` && r.width === 1)!;
    expect(clear).toMatchObject({ before: prefix, after: 0 });
    const visits = records.filter(r => r.kind === 'add-weight-return');
    expect(visits).toHaveLength(62);
    for (const pass of [1, 2]) {
      const scan = visits.filter(r => r.pass === pass);
      expect(scan.map(r => r.slot)).toEqual(['equipment', ...Array.from({ length: 30 }, (_, i) => i)]);
      expect(scan.at(-1)!.after).toBe(prefix * 141);
      expect(scan[0]!.before).toBe(0);
      expect(scan.map(r => r.itemId)).toEqual(visits.slice(0, 31).map(r => r.itemId));
    }
    expect(records.filter(r => r.kind !== 'write' && r.kind !== 'add-weight-return').map(r => r.kind)).toEqual([
      ...Array.from({ length: prefix === 4 ? 3 : 1 }, () => 'copy-return'),
      'weight-return', 'remove-return', 'weight-return', 'action-return',
    ]);
    const selectionWrite = records.findIndex(r => r.kind === 'write' && r.target === 'actor.selection');
    const firstScan = records.findIndex(r => r.kind === 'add-weight-return');
    expect(prefix === 2 ? selectionWrite < firstScan && selectionWrite > 0 : selectionWrite === -1).toBe(true);
    expect(writes.slice(-1)[0]).toEqual({ kind: 'write', target: 'redrawFlag', width: 1, before: prefix === 2 ? 7 : 255, after: 255 });
    expect(writes.filter(r => r.target === 'actor.weight').map(r => [r.before, r.after])).toEqual([
      [input.actor.weight, prefix * 141], [prefix * 141, prefix * 141],
    ]);
  });

  it('preserves forward copy order and exact feedback including redundant heavy-count writes', () => {
    const { records } = transition(fixture());
    expect(records.filter(r => r.kind === 'copy-return')).toEqual([
      { kind: 'copy-return', source: 'actor.carried.1', destination: 'actor.equipment' },
      { kind: 'copy-return', source: 'actor.carried.2', destination: 'actor.carried.1' },
      { kind: 'copy-return', source: 'actor.carried.3', destination: 'actor.carried.2' },
    ]);
    expect(records.filter(r => r.kind === 'write').slice(6).map(r => [r.target, r.before, r.after])).toEqual([
      ['actor.usingGrenade', 0x4321, 0], ['actor.weight', 0x98765432, 564],
      ['actor.heavyCount', 23, 50], ['redrawFlag', 7, 255], ['actor.tooHeavy', 0, 255],
      ['actor.usingGrenade', 0, 0], ['actor.weight', 564, 564], ['actor.heavyCount', 50, 50], ['redrawFlag', 255, 255],
    ]);
  });

  it('uses unsigned item words and division, signed physique, and ignores ordinary entry counts', () => {
    const input = fixture();
    input.items.records.slice(0, 4).forEach(item => { item.weight = 65535; });
    input.physique = 65535;
    expect(transition(input).arithmetic).toEqual({ totalWeight: 262140, quotient: 1872, remainder: 60,
      signedQuotient: 1872, signedPhysique: -1, tooHeavy: true });
    const sole = fixture(1); sole.physique = 1;
    expect(transition(sole).candidate.actor.tooHeavy).toBe(0);
  });

  it('snapshots own nonenumerable data and rejects accessors without executing them', () => {
    const input = fixture(), expected = transition(input);
    Object.defineProperty(input.actor, 'equipment', { enumerable: false });
    Object.defineProperty(input.actor.carried, '1', { enumerable: false });
    expect(transition(input)).toEqual(expected);
    let calls = 0;
    for (const where of ['root', 'actor', 'array', 'item']) {
      const broken = fixture();
      const [target, key] = where === 'root' ? [broken, 'actor'] : where === 'actor' ? [broken.actor, 'equipment']
        : where === 'array' ? [broken.actor.carried, '1'] : [broken.items.records[0]!, 'weight'];
      Object.defineProperty(target, key as string, { get: () => { calls++; return 0; } });
      expect(() => transition(broken)).toThrow();
    }
    expect(calls).toBe(0);
  });

  it('rejects unsupported arrangements, case feedback, malformed storage and witnesses atomically', () => {
    const mutations: ((x: Input) => void)[] = [
      x => { x.actor.playerIndex = 1; }, x => { x.actor.secondaryDeadWord = 1; }, x => { x.actor.windowType = 7; },
      x => { x.actor.controlMethod = 2; }, x => { x.actor.pendingAction = 0; }, x => { x.actor.oldCell = 73; },
      x => { x.actor.itemCount = 3; }, x => { x.actor.selection = 0; }, x => { x.actor.spellWings = 24; },
      x => { x.actor.equipment = 0x01000000; }, x => { x.actor.carried[0] = 0x02000000; },
      x => { x.actor.carried[2] = 0; }, x => { x.actor.carried[29] = 0x01000000; },
      x => { x.actor.tooHeavy = 255; }, x => { x.physique = 10; }, x => { x.actor.tooHeavy = 1; },
      x => { x.actor.weight = -1; }, x => { x.actor.temporary = 2 ** 32; }, x => { x.actor.padding[2] = NaN; },
      x => { x.actor.heavyCount = 65536; }, x => { x.actor.usingGrenade = -1; }, x => { x.physique = 1.5; }, x => { x.redrawFlag = 256; },
      x => { x.actor.carried.pop(); }, x => { delete x.actor.carried[29]; }, x => { x.actor.padding.push(0); },
      x => { x.items.records.pop(); }, x => { delete x.items.records[90]; }, x => { x.items.records[90]!.weight = 65536; },
      ...[4, 21, 23].map(category => (x: Input) => { x.items.records[0]!.category = category; }),
      x => { x.items.records[113]!.category = 256; }, x => { x.items.records[0]!.itemId = 2; },
      x => { x.items.records.forEach(item => { item.weight = 0; }); }, x => { x.items.tableSha256 = 'mismatch'; },
      x => { Object.assign(x.items, { revision: 'cd32-archive' }); }, x => { Object.assign(x.actor, { extra: 0 }); },
      x => { Object.assign(x, { extra: 0 }); }, x => { Object.assign(x.items.records[113]!, { extra: 0 }); },
      x => { Object.defineProperty(x.actor, Symbol('hidden'), { value: 0 }); },
      x => { Object.defineProperty(x.actor.padding, 'extra', { value: 0 }); },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const before = structuredClone(input);
      expect(() => transition(input)).toThrow(); expect(input).toEqual(before);
    }
    for (const prefix of [2, 1]) {
      const input = fixture(prefix); input.actor.tooHeavy = 0;
      expect(() => transition(input)).toThrow();
      input.actor.tooHeavy = 255; input.physique = prefix === 2 ? 10 : 0;
      expect(() => transition(input)).toThrow();
    }
    for (const value of [null, undefined, [], {}]) expect(() => transition(value as Input)).toThrow();
  });
});
