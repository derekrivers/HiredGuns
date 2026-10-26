import { describe, expect, it } from 'vitest';
import { transitionDrowningWaterInventory, type WaterInventoryInput } from '../src/character/water-inventory';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import type { InventorySlot } from '../src/import/characters';

const slot = (itemId = 1, damage = 1, ammo = 7, fourthByte = 199): InventorySlot => ({
  itemId, damage, ammo, fourthByte,
  rawHex: [itemId, damage, ammo, fourthByte].map(value => value.toString(16).padStart(2, '0')).join(''),
});
async function fixture(): Promise<WaterInventoryInput> {
  // Authored zero table with explicit synthetic arithmetic fields; no original data.
  const items = await importItems(new Uint8Array(ITEM_FILE_BYTES));
  Object.assign(items.records[0]!, { waterDamage: 1, maxDamage: 65535, weight: 140 });
  return { items, inventory: { equipped: slot(), carried: Array.from({ length: 30 }, () => slot()), actions: Array.from({ length: 10 }, () => slot()) }, physique: 100, spellWater: 0, spellWings: 0 };
}
function freezeDeep(value: object): void {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
  Object.freeze(value);
}

describe('disconnected drowning-caller water inventory', () => {
  it('scans equipment and exactly sixteen carried entries, preserves all other bytes, and weighs all thirty', async () => {
    const input = await fixture();
    freezeDeep(input);
    const result = transitionDrowningWaterInventory(input);
    expect(result.status).toBe('processed');
    expect(result.candidate.equipped).toEqual(slot(1, 2));
    expect(result.candidate.carried.slice(0, 16)).toEqual(Array.from({ length: 16 }, () => slot(1, 2)));
    expect(result.candidate.carried.slice(16)).toEqual(input.inventory.carried.slice(16));
    expect(result.candidate.actions).toEqual(input.inventory.actions);
    expect(result.weight).toEqual({ totalWeight: 4340, quotient: 31, tooHeavy: false, usingGrenade: 0 });
    result.candidate.carried[29]!.damage = 99;
    result.candidate.actions[0]!.ammo = 0;
    expect(input.inventory.carried[29]!.damage).toBe(1);
    expect(input.inventory.actions[0]!.ammo).toBe(7);
    expect(transitionDrowningWaterInventory(input).candidate.carried[29]!.damage).toBe(1);
  });

  it('spell100 skips scan and weight with an independent candidate, while spell97 still scans', async () => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { category: 4, weight: 65535 });
    input.inventory.equipped = slot(1, 255, 255);
    input.inventory.carried = Array.from({ length: 30 }, () => slot(1, 255, 255));
    input.spellWater = 100;
    const result = transitionDrowningWaterInventory(input);
    expect(result).toEqual({ status: 'skipped', candidate: input.inventory, weight: null });
    result.candidate.equipped.damage = 0;
    expect(input.inventory.equipped.damage).toBe(255);
    input.spellWater = 97;
    expect(() => transitionDrowningWaterInventory(input)).toThrow('weight');
    input.spellWings = 24;
    expect(transitionDrowningWaterInventory(input).candidate.equipped.damage).toBe(0);
    expect(transitionDrowningWaterInventory(input).weight?.totalWeight).toBe(0);
  });

  it.each([
    [0, 65535, 200, 200], [1, 0, 200, 200],
    [1, 65535, 254, 255], [1, 1, 255, 0], [255, 257, 2, 1],
  ])('handles water %i max %i damage %i with word wrapping', async (waterDamage, maxDamage, damage, expected) => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { waterDamage, maxDamage });
    input.inventory.equipped = slot(1, damage);
    expect(transitionDrowningWaterInventory(input).candidate.equipped).toEqual(slot(1, expected));
  });

  it.each([[6, 52], [5, 111], [0, 22], [255, 22]])('replaces container %i with ID %i only on equality or greater', async (containerType, replacementId) => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { containerType, maxDamage: 512 });
    input.items.records[replacementId - 1]!.weight = 280;
    input.inventory.equipped = slot(1, 1);
    input.inventory.carried[0] = slot(1, 2);
    const result = transitionDrowningWaterInventory(input);
    expect(result.candidate.equipped).toEqual(slot(replacementId, 1));
    expect(result.candidate.carried[0]).toEqual(slot(replacementId, 2));
    expect(result.candidate.carried[16]).toEqual(slot());
    // Seventeen replacement entries, plus fourteen untouched tail entries.
    expect(result.weight?.totalWeight).toBe(17 * 280 + 14 * 140);
  });

  it('compares the wrapped word to max damage and treats catalog metadata as inert', async () => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { waterDamage: 255, maxDamage: 65024, containerType: 6 });
    input.inventory.equipped = slot(1, 255);
    const result = transitionDrowningWaterInventory(input);
    expect(result.candidate.equipped).toEqual(slot(52, 255));
    Object.assign(input.items.source, { revision: 'ocs-runtime', sha256: 'authored claim' });
    expect(transitionDrowningWaterInventory(input)).toEqual(result);
    // Exact own storage fields need not be enumerable; candidate copies all of them.
    Object.defineProperty(input.inventory.equipped, 'ammo', { enumerable: false });
    expect(transitionDrowningWaterInventory(input)).toEqual(result);
  });

  it('retains empty-slot bytes and weighs replacement category/count, tail and wings using the existing supported arithmetic', async () => {
    const input = await fixture();
    input.inventory.equipped = slot(0, 255, 255, 255);
    expect(transitionDrowningWaterInventory(input).candidate.equipped).toEqual(slot(0, 255, 255, 255));
    input.inventory.equipped = slot();
    Object.assign(input.items.records[0]!, { maxDamage: 512, containerType: 6 });
    Object.assign(input.items.records[51]!, { category: 21, weight: 140 });
    input.physique = 133;
    expect(transitionDrowningWaterInventory(input).weight).toEqual({ totalWeight: 18620, quotient: 133, tooHeavy: false, usingGrenade: 2 });
    input.physique = 132;
    expect(transitionDrowningWaterInventory(input).weight?.tooHeavy).toBe(true);
    input.spellWings = 24;
    expect(transitionDrowningWaterInventory(input).weight).toEqual({ totalWeight: 0, quotient: 0, tooHeavy: false, usingGrenade: 2 });
  });

  it('rejects overflow after private candidate mutation without changing the inputs', async () => {
    const input = await fixture();
    Object.assign(input.items.records[0]!, { category: 4, weight: 65535 });
    input.inventory.carried = Array.from({ length: 30 }, () => slot(1, 1, 255));
    const before = structuredClone(input);
    expect(() => transitionDrowningWaterInventory(input)).toThrow('weight');
    expect(input).toEqual(before);
  });

  it('rejects malformed shapes, words, slots, tail/actions and item definitions atomically, including when skipped', async () => {
    const base = await fixture();
    const mutations: ((input: WaterInventoryInput) => void)[] = [
      input => { input.spellWater = -1; }, input => { input.physique = NaN; }, input => { input.spellWings = 65536; },
      input => { input.inventory.carried.pop(); }, input => { delete input.inventory.carried[0]; },
      input => { input.inventory.actions.push(slot()); },
      input => { input.inventory.carried[29] = slot(115); }, input => { input.inventory.actions[9] = slot(255); },
      input => { input.inventory.equipped.rawHex = '00000000'; }, input => { input.inventory.equipped.damage = 0.5; },
      input => { input.items.records[51]!.weight = -1; }, input => { input.items.records[110]!.maxDamage = 65536; },
      input => { input.items.records[0]!.waterDamage = 256; }, input => { input.items.records[0]!.containerType = -1; },
      input => { input.items.records[0]!.category = Infinity; }, input => { input.items.records[0]!.itemId = 2; },
      input => { delete input.items.records[21]; }, input => { input.items.records.pop(); },
      input => { Object.assign(input, { extra: 0 }); }, input => { Object.assign(input.inventory, { extra: 0 }); },
      input => { Object.assign(input.inventory.equipped, { extra: 0 }); },
    ];
    for (const spellWater of [0, 100]) for (const mutate of mutations) {
      const input = structuredClone(base);
      input.spellWater = spellWater;
      mutate(input);
      const before = structuredClone(input);
      expect(() => transitionDrowningWaterInventory(input)).toThrow();
      expect(input).toEqual(before);
    }
    for (const value of [null, undefined, [], {}]) {
      expect(() => transitionDrowningWaterInventory(value as WaterInventoryInput)).toThrow();
    }
  });
});
