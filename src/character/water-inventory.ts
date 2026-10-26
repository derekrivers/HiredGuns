import type { InventorySlot } from '../import/characters';
import { computeSourceWeight, type SelectionInventory, type WeightValues } from '../import/inventory';
import type { ItemCatalog } from '../import/items';

/** Authored parsed item arithmetic inputs; catalog source metadata grants no authority. */
export interface WaterInventoryInput {
  inventory: SelectionInventory;
  items: ItemCatalog;
  physique: number;
  spellWater: number;
  spellWings: number;
}
export interface WaterInventoryResult {
  status: 'skipped' | 'processed';
  candidate: SelectionInventory;
  /** Null means no weight update: the caller retains its existing weight state. */
  weight: WeightValues | null;
}

const unsigned = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
function keys(value: unknown, fields: string[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) {
    throw new Error('Malformed water-inventory fields.');
  }
}
function dense(value: unknown, count: number): void {
  if (!Array.isArray(value) || value.length !== count || Reflect.ownKeys(value).length !== count + 1 ||
      Array.from({ length: count }, (_, i) => i).some(i => !Object.hasOwn(value, i))) {
    throw new Error('Malformed water-inventory array.');
  }
}
const slotHex = (slot: InventorySlot): string => [slot.itemId, slot.damage, slot.ammo, slot.fourthByte]
  .map(value => value.toString(16).padStart(2, '0')).join('');
const copySlot = (slot: InventorySlot): InventorySlot => ({
  itemId: slot.itemId, damage: slot.damage, ammo: slot.ammo, fourthByte: slot.fourthByte, rawHex: slot.rawHex,
});

/** Literal equipment + carried[0..15] scan for the observed OCS drowning caller. */
export function transitionDrowningWaterInventory(input: WaterInventoryInput): WaterInventoryResult {
  keys(input, ['inventory', 'items', 'physique', 'spellWater', 'spellWings']);
  if (![input.physique, input.spellWater, input.spellWings].every(value => unsigned(value, 65535))) {
    throw new Error('Malformed water-inventory word.');
  }
  keys(input.inventory, ['equipped', 'carried', 'actions']);
  dense(input.inventory.carried, 30);
  dense(input.inventory.actions, 10);
  if (!input.items || typeof input.items !== 'object') throw new Error('Missing water-inventory item table.');
  dense(input.items.records, 114);
  // Only the parsed fields used by this arithmetic contract are authoritative
  // within a call. This is not raw-byte validation or source verification.
  for (const [index, item] of input.items.records.entries()) {
    if (!item || typeof item !== 'object' || item.itemId !== index + 1 ||
        ![item.waterDamage, item.containerType, item.category].every(value => unsigned(value, 255)) ||
        ![item.maxDamage, item.weight].every(value => unsigned(value, 65535))) {
      throw new Error('Malformed water-inventory item definition.');
    }
  }
  for (const slot of [input.inventory.equipped, ...input.inventory.carried, ...input.inventory.actions]) {
    keys(slot, ['itemId', 'damage', 'ammo', 'fourthByte', 'rawHex']);
    if (![slot.itemId, slot.damage, slot.ammo, slot.fourthByte].every(value => unsigned(value, 255)) ||
        slot.rawHex !== slotHex(slot) || slot.itemId > input.items.records.length) {
      throw new Error('Malformed water-inventory entry or unsupported item ID.');
    }
  }

  const candidate: SelectionInventory = {
    equipped: copySlot(input.inventory.equipped),
    carried: input.inventory.carried.map(copySlot),
    actions: input.inventory.actions.map(copySlot),
  };
  if (input.spellWater === 100) return { status: 'skipped', candidate, weight: null };

  for (const slot of [candidate.equipped, ...candidate.carried.slice(0, 16)]) {
    if (slot.itemId === 0) continue;
    const item = input.items.records[slot.itemId - 1]!;
    if (item.waterDamage === 0 || item.maxDamage === 0) continue;
    // Both bytes are shifted to words before ADD.W; overflow wraps before CMP.L.
    const damageWord = ((slot.damage << 8) + (item.waterDamage << 8)) & 65535;
    if (damageWord >= item.maxDamage) {
      slot.itemId = item.containerType === 6 ? 52 : item.containerType === 5 ? 111 : 22;
    } else {
      slot.damage = damageWord >>> 8;
    }
    slot.rawHex = slotHex(slot);
  }
  const weight = computeSourceWeight(input.items, candidate, input.physique, input.spellWings);
  if (weight.status !== 'computed') throw new Error(`Unsupported water-inventory weight: ${weight.reason}`);
  return {
    status: 'processed', candidate,
    weight: { totalWeight: weight.totalWeight, quotient: weight.quotient, tooHeavy: weight.tooHeavy, usingGrenade: weight.usingGrenade },
  };
}
