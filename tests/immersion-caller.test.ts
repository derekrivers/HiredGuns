import { describe, expect, it } from 'vitest';
import { transitionImmersion, type ImmersionInput } from '../src/character/immersion-caller';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import { decideDrowning } from '../src/character/drowning-decision';
import type { InventorySlot } from '../src/import/characters';

const slot = (itemId = 1, damage = 1, ammo = 7, fourthByte = 199): InventorySlot => ({
  itemId, damage, ammo, fourthByte,
  rawHex: [itemId, damage, ammo, fourthByte].map(value => value.toString(16).padStart(2, '0')).join(''),
});
async function fixture(): Promise<ImmersionInput> {
  const items = await importItems(new Uint8Array(ITEM_FILE_BYTES));
  Object.assign(items.records[0]!, { waterDamage: 1, maxDamage: 65535, weight: 140 });
  return { items, cellLong: 4 | (2 << 17), actor: {
    statsDeadWord: 0, windowType: 0, controlMethod: 1, race: 0, physique: 100, fitness: 65535,
    spellWater: 0, spellWings: 0, underwaterCount: 7, drowningIndicator: 81,
    inventory: { equipped: slot(), carried: Array.from({ length: 30 }, () => slot()), actions: Array.from({ length: 10 }, () => slot()) },
    weight: { totalWeight: 123, quotient: 456, tooHeavy: true, usingGrenade: 2 },
  } };
}
function freezeDeep(value: object): void {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
  Object.freeze(value);
}

describe('disconnected pure immersion caller', () => {
  it.each([
    ['statsDeadWord', 1], ['statsDeadWord', 0x100], ['statsDeadWord', 0xff00], ['statsDeadWord', 0xffff],
    ['windowType', 7], ['controlMethod', 0],
  ] as const)('preserves counter on the %s=%i eligibility guard before water/reset', async (key, value) => {
    for (const cellLong of [0, 4 | (2 << 17)]) {
      const input = await fixture();
      input.actor[key] = value;
      input.cellLong = cellLong;
      const before = structuredClone(input);
      const result = transitionImmersion(input);
      expect(result).toEqual({ status: 'ineligible', candidate: input.actor, cellLong,
        inventoryStatus: 'not-visited', decision: null, damageRequest: null });
      expect(input).toEqual(before);
    }
  });

  it.each([0, 1, 2, 3])('tests presence independently of depth %i and preserves other packed bits', async depth => {
    for (const present of [false, true]) {
      const input = await fixture();
      // Unknown high/low bits, including bit31, must not supply depth or change.
      input.cellLong = (0xfff9fffb | (depth << 17) | (present ? 4 : 0)) >>> 0;
      const result = transitionImmersion(input);
      expect(result.cellLong).toBe(input.cellLong);
      const submerged = present && depth >= 2;
      expect(result.status).toBe(submerged ? 'submerged' : 'breath');
      expect(result.candidate.underwaterCount).toBe(submerged ? 8 : 0);
      expect(result.candidate.drowningIndicator).toBe(81);
      expect(result.inventoryStatus).toBe(submerged ? 'processed' : 'not-visited');
      expect(result.candidate.inventory.equipped.damage).toBe(submerged ? 2 : 1);
      expect(result.candidate.weight).toEqual(submerged ?
        { totalWeight: 4340, quotient: 31, tooHeavy: false, usingGrenade: 0 } : input.actor.weight);
    }
  });

  it.each([4, 65535])('permits other window words %i, nonzero control bytes, and zero fitness', async windowType => {
    const input = await fixture();
    Object.assign(input.actor, { windowType, controlMethod: 255, fitness: 0 });
    expect(transitionImmersion(input).damageRequest).toEqual({ requestedHit: 1600 });
  });

  it.each([[1, 0], [0, 97], [1, 97], [1, 100]])('runs inventory before race %i / spell %i breath reset', async (race, spellWater) => {
    const input = await fixture();
    Object.assign(input.actor, { race, spellWater });
    const result = transitionImmersion(input);
    expect(result.status).toBe('breath');
    expect(result.candidate.underwaterCount).toBe(0);
    expect(result.candidate.drowningIndicator).toBe(81);
    expect(result.decision).toBeNull();
    expect(result.damageRequest).toBeNull();
    expect(result.inventoryStatus).toBe(spellWater === 100 ? 'skipped' : 'processed');
    expect(result.candidate.inventory.equipped.damage).toBe(spellWater === 100 ? 1 : 2);
    expect(result.candidate.weight).toEqual(spellWater === 100 ? input.actor.weight :
      { totalWeight: 4340, quotient: 31, tooHeavy: false, usingGrenade: 0 });
  });

  it('spell100 skips inventory and weight only, and other spell/race values do not grant immunity', async () => {
    for (const [race, spellWater] of [[0, 100], [255, 96], [2, 98], [0, 0x161], [0, 0x164], [0, 65535]]) {
      const input = await fixture();
      Object.assign(input.actor, { race, spellWater, physique: 0, fitness: 0 });
      const result = transitionImmersion(input);
      expect(result.status).toBe('submerged');
      expect(result.damageRequest).toEqual({ requestedHit: 1600 });
      expect(result.candidate.drowningIndicator).toBe(150);
      expect(result.inventoryStatus).toBe(spellWater === 100 ? 'skipped' : 'processed');
      expect(result.candidate.inventory.equipped.damage).toBe(spellWater === 100 ? 1 : 2);
    }
  });

  it('composes destruction, exact scan extent, weight and drowning into one independent candidate', async () => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { maxDamage: 512, containerType: 6 });
    Object.assign(input.items.records[51]!, { weight: 140, category: 21, waterDamage: 255, maxDamage: 1 });
    Object.assign(input.actor, { underwaterCount: 50, physique: 132 });
    freezeDeep(input);
    const result = transitionImmersion(input);
    expect(result.candidate.inventory.equipped).toEqual(slot(52));
    expect(result.candidate.inventory.carried.slice(0, 16)).toEqual(Array.from({ length: 16 }, () => slot(52)));
    expect(result.candidate.inventory.carried.slice(16)).toEqual(input.actor.inventory.carried.slice(16));
    expect(result.candidate.inventory.actions).toEqual(input.actor.inventory.actions);
    expect(result.candidate.weight).toEqual({ totalWeight: 18620, quotient: 133, tooHeavy: true, usingGrenade: 2 });
    expect(result.damageRequest).toEqual({ requestedHit: 10200 });
    expect(result.candidate.fitness).toBe(65535);
    expect(result.candidate.statsDeadWord).toBe(0);
    result.candidate.inventory.carried[29]!.ammo = 99;
    result.candidate.inventory.actions[0]!.damage = 99;
    result.candidate.weight.totalWeight = 0;
    expect(input.actor.inventory.carried[29]!.ammo).toBe(7);
    expect(input.actor.inventory.actions[0]!.damage).toBe(1);
    expect(transitionImmersion(input).candidate.weight.totalWeight).toBe(18620);
  });

  it.each([
    [100, 65535, 23], [100, 65535, 24], [100, 65535, 25],
    [1, 0, 32766], [1, 0, 32767], [1, 0, 65535],
    [655, 32768, 65535], [65535, 65535, 0], [1024, 41920, 0],
  ])('retains arithmetic boundaries through composition: physique %i fitness %i count %i', async (physique, fitness, underwaterCount) => {
    const input = await fixture();
    Object.assign(input.actor, { physique, fitness, underwaterCount });
    const expected = decideDrowning({ physique, fitness, underwaterCount, drowningIndicator: 81 });
    const result = transitionImmersion(input);
    expect(result.decision).toEqual(expected);
    expect(result.candidate.underwaterCount).toBe(expected.nextCounter);
    expect(result.candidate.drowningIndicator).toBe(expected.drowningIndicator);
    expect(result.damageRequest).toEqual(expected.requestedHit === null ? null : { requestedHit: expected.requestedHit });
  });

  it('distinguishes a zero-hit request on wrap from no request, and wraps item damage before threshold', async () => {
    const input = await fixture();
    Object.assign(input.actor, { physique: 655, fitness: 32768, underwaterCount: 65535 });
    input.actor.inventory.equipped = slot(1, 255);
    input.items.records[0]!.maxDamage = 1;
    const result = transitionImmersion(input);
    expect(result.damageRequest).toEqual({ requestedHit: 0 });
    expect(result.candidate.underwaterCount).toBe(0);
    expect(result.candidate.drowningIndicator).toBe(150);
    expect(result.candidate.inventory.equipped).toEqual(slot(1, 0));
  });

  it('rejects unsupported weight before immunity but preserves weight on unvisited/skipped branches', async () => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { weight: 65535, category: 4 });
    input.actor.inventory.carried = Array.from({ length: 30 }, () => slot(1, 1, 255));
    for (const [race, spellWater] of [[0, 0], [1, 0], [0, 97]]) {
      Object.assign(input.actor, { race, spellWater });
      const before = structuredClone(input);
      expect(() => transitionImmersion(input)).toThrow('weight');
      expect(input).toEqual(before);
    }
    for (const mutate of [
      () => { input.actor.spellWater = 100; },
      () => { input.actor.spellWater = 0; input.cellLong = 0; },
      () => { input.cellLong = 4 | (2 << 17); input.actor.controlMethod = 0; },
    ]) {
      mutate();
      expect(transitionImmersion(input).candidate.weight).toEqual(input.actor.weight);
    }
    input.actor.controlMethod = 1;
    input.actor.spellWings = 24;
    expect(transitionImmersion(input).candidate.weight.totalWeight).toBe(0);
  });

  it('accepts the supported maximum weight quotient with signed comparison, then rejects overflow', async () => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { waterDamage: 0, weight: 65535, category: 4 });
    input.actor.inventory.equipped = slot(1, 1, 140);
    input.actor.inventory.carried = Array.from({ length: 30 }, () => slot(0));
    expect(transitionImmersion(input).candidate.weight).toEqual({
      totalWeight: 9174900, quotient: 65535, tooHeavy: false, usingGrenade: 0,
    });
    input.actor.inventory.equipped = slot(1, 1, 141);
    const before = structuredClone(input);
    expect(() => transitionImmersion(input)).toThrow('weight');
    expect(input).toEqual(before);
  });

  it('copies exact known nonenumerable storage fields on inert branches', async () => {
    const input = await fixture();
    input.actor.statsDeadWord = 1;
    Object.defineProperty(input.actor, 'underwaterCount', { enumerable: false });
    Object.defineProperty(input.actor.weight, 'totalWeight', { enumerable: false });
    Object.defineProperty(input.actor.inventory.equipped, 'fourthByte', { enumerable: false });
    const result = transitionImmersion(input);
    expect(result.candidate.underwaterCount).toBe(7);
    expect(result.candidate.weight.totalWeight).toBe(123);
    expect(result.candidate.inventory.equipped.fourthByte).toBe(199);
  });

  it('rejects malformed storage and nested unsupported inputs atomically, including inactive branches', async () => {
    const base = await fixture();
    const mutations: ((input: ImmersionInput) => void)[] = [
      input => { input.cellLong = -1; }, input => { input.cellLong = 0x100000000; },
      input => { input.actor.statsDeadWord = 65536; }, input => { input.actor.windowType = 0.5; },
      input => { input.actor.controlMethod = 256; }, input => { input.actor.race = -1; },
      input => { input.actor.fitness = NaN; }, input => { input.actor.physique = Infinity; },
      input => { input.actor.spellWater = 65536; }, input => { input.actor.spellWings = -1; },
      input => { input.actor.underwaterCount = -1; }, input => { input.actor.drowningIndicator = 65536; },
      input => { input.actor.weight.quotient = 65536; }, input => { input.actor.weight.totalWeight = -1; },
      input => { Object.assign(input.actor.weight, { tooHeavy: 1 }); },
      input => { Object.assign(input.actor.weight, { usingGrenade: 1 }); },
      input => { input.actor.inventory.actions[9] = slot(115); },
      input => { input.actor.inventory.carried[29]!.rawHex = ''; },
      input => { delete input.actor.inventory.carried[0]; },
      input => { input.items.records[51]!.weight = -1; },
      input => { Object.assign(input, { extra: 0 }); },
      input => { Object.defineProperty(input.actor, Symbol('extra'), { value: 0 }); },
      input => { Object.defineProperty(input.actor.weight, 'extra', { value: 0 }); },
      input => { input.actor = Object.create(input.actor) as ImmersionInput['actor']; },
    ];
    for (const inactive of [false, true]) for (const mutate of mutations) {
      const input = structuredClone(base);
      if (inactive) input.actor.statsDeadWord = 1;
      mutate(input);
      const before = structuredClone(input);
      expect(() => transitionImmersion(input)).toThrow();
      expect(structuredClone(input)).toEqual(before);
    }
    for (const input of [null, undefined, [], {}]) {
      expect(() => transitionImmersion(input as ImmersionInput)).toThrow();
    }
  });
});
