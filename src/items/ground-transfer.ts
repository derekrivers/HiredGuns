import type { InventorySlot } from '../import/characters';
import { importCharacters } from '../import/characters';
import type { SelectionInventory, WeightValues } from '../import/inventory';
import { computeSourceWeight, inspectSelectionInventory } from '../import/inventory';
import { importItems, type ItemCatalog } from '../import/items';
import { returnEquipmentToBackpack } from '../sim/training-inventory';

export interface GroundTransferState {
  inventory: SelectionInventory;
  /** Explicit logical slot, not an original packed map cell. ID zero is empty. */
  ground: InventorySlot;
  selection: number;
}
export interface GroundTransferCommand {
  version: 1;
  kind: 'pickup-equipment' | 'pickup-carried' | 'drop-equipment';
}
export type GroundTransferOutcome = 'transferred' | 'empty-ground' | 'empty-equipment' | 'ground-occupied' | 'no-room' | 'already-too-heavy';
export interface GroundTransferResult {
  state: GroundTransferState;
  outcome: GroundTransferOutcome;
  weight: WeightValues & { status: 'computed' };
}

function fields(value: unknown, names: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== names.length ||
      !names.every(name => Object.hasOwn(value, name) && Object.getOwnPropertyDescriptor(value, name)?.enumerable &&
        Object.hasOwn(Object.getOwnPropertyDescriptor(value, name)!, 'value'))) throw new Error('Malformed ground transfer fields.');
}
function dense(value: unknown, length: number): asserts value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== length || Reflect.ownKeys(value).length !== length + 1 ||
      !Array.from({ length }, (_, i) => Object.getOwnPropertyDescriptor(value, String(i)))
        .every(d => d?.enumerable && Object.hasOwn(d, 'value'))) throw new Error('Expected complete dense slot storage.');
}
function copySlot(value: unknown): InventorySlot {
  fields(value, ['itemId', 'damage', 'ammo', 'fourthByte', 'rawHex']);
  const bytes = [value.itemId, value.damage, value.ammo, value.fourthByte];
  if (!bytes.every(n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 255) ||
      (value.itemId as number) > 114 || value.rawHex !== bytes.map(n => (n as number).toString(16).padStart(2, '0')).join('')) throw new Error('Malformed four-byte slot or item domain.');
  return { itemId: value.itemId as number, damage: value.damage as number, ammo: value.ammo as number,
    fourthByte: value.fourthByte as number, rawHex: value.rawHex as string };
}
function snapshot(value: GroundTransferState): GroundTransferState {
  fields(value, ['inventory', 'ground', 'selection']);
  fields(value.inventory, ['equipped', 'carried', 'actions']);
  dense(value.inventory.carried, 30); dense(value.inventory.actions, 10);
  const inventory = { equipped: copySlot(value.inventory.equipped),
    carried: Array.from({ length: 30 }, (_, i) => copySlot(value.inventory.carried[i])),
    actions: Array.from({ length: 10 }, (_, i) => copySlot(value.inventory.actions[i])) };
  const end = inventory.carried.findIndex(slot => slot.itemId === 0);
  const count = end < 0 ? 30 : end;
  if (inventory.carried.slice(count).some(slot => slot.itemId !== 0) ||
      !Number.isInteger(value.selection) || value.selection < 0 || value.selection > Math.max(0, count - 1)) throw new Error('Expected contiguous carried prefix and valid selection.');
  return { inventory, ground: copySlot(value.ground), selection: value.selection };
}
export function groundTransferCommand(value: unknown): GroundTransferCommand {
  fields(value, ['version', 'kind']);
  if (value.version !== 1 || !['pickup-equipment', 'pickup-carried', 'drop-equipment'].includes(value.kind as string)) throw new Error('Unsupported ground transfer command.');
  return { version: 1, kind: value.kind as GroundTransferCommand['kind'] };
}
const clearId = (slot: InventorySlot): InventorySlot => ({ ...slot, itemId: 0, rawHex: `00${slot.rawHex.slice(2)}` });

/** Logical source deduction plus full-entry ground-overlay policy; no map/control authority. */
export function transferGroundItem(input: GroundTransferState, items: ItemCatalog, physique: number, command: GroundTransferCommand): GroundTransferResult {
  const state = snapshot(input), operation = groundTransferCommand(command);
  const before = computeSourceWeight(items, state.inventory, physique);
  if (before.status !== 'computed') throw new Error(`Unsupported source weight: ${before.reason}`);
  // Validate the ground reference even for refused operations; actions remain separate from weight.
  const probe = computeSourceWeight(items, { ...state.inventory, equipped: state.ground }, physique);
  if (probe.status !== 'computed') throw new Error(`Unsupported ground item weight: ${probe.reason}`);
  const finish = (outcome: GroundTransferOutcome): GroundTransferResult => {
    const weight = computeSourceWeight(items, state.inventory, physique);
    if (weight.status !== 'computed') throw new Error(`Unsupported resulting source weight: ${weight.reason}`);
    return { state, outcome, weight };
  };
  if (operation.kind === 'drop-equipment') {
    if (!state.inventory.equipped.itemId) return finish('empty-equipment');
    if (state.ground.itemId) return finish('ground-occupied');
    state.ground = { ...state.inventory.equipped };
    state.inventory.equipped = clearId(state.inventory.equipped);
    return finish('transferred');
  }
  if (before.tooHeavy) return finish('already-too-heavy');
  if (!state.ground.itemId) return finish('empty-ground');
  const needsInsertion = operation.kind === 'pickup-carried' || state.inventory.equipped.itemId !== 0;
  if (needsInsertion && state.inventory.carried[29]!.itemId !== 0) return finish('no-room');
  if (operation.kind === 'pickup-carried') {
    // insert_item shifts the entire tail, including unknown bytes of empty entries.
    for (let i = 28; i >= state.selection; i--) state.inventory.carried[i + 1] = { ...state.inventory.carried[i]! };
    state.inventory.carried[state.selection] = { ...state.ground };
  } else {
    if (state.inventory.equipped.itemId) state.inventory = returnEquipmentToBackpack(state.inventory, items, physique, state.selection).inventory;
    state.inventory.equipped = { ...state.ground };
  }
  state.ground = clearId(state.ground);
  return finish('transferred');
}

/** Reimport raw evidence, verify the exact OCS pair, and derive canonical physique.
 * Verification covers table/physique arithmetic, not caller ground placement or inventory history.
 */
export async function transferOriginalGroundItem(input: GroundTransferState, command: GroundTransferCommand,
  sources: { roster: Uint8Array; items: Uint8Array }, canonicalIndex: number): Promise<Omit<GroundTransferResult, 'weight'> & { weight: WeightValues & { status: 'verified' } }> {
  const state = snapshot(input), operation = groundTransferCommand(command);
  if (!(sources.roster instanceof Uint8Array) || !(sources.items instanceof Uint8Array)) throw new Error('Expected raw source bytes.');
  const rosterBytes = new Uint8Array(sources.roster), itemBytes = new Uint8Array(sources.items);
  const [roster, items] = await Promise.all([importCharacters(rosterBytes), importItems(itemBytes)]);
  const inspected = await inspectSelectionInventory(roster, items, canonicalIndex);
  if (inspected.weight.status !== 'verified') throw new Error(inspected.weight.reason);
  const result = transferGroundItem(state, items, roster.records[canonicalIndex]!.stats.physique, operation);
  return { ...result, weight: { ...result.weight, status: 'verified' } };
}
