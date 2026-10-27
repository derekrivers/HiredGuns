import type { SelectionInventory, WeightValues } from '../import/inventory';
import { computeSourceWeight } from '../import/inventory';
import type { ItemCatalog } from '../import/items';
import type { OriginalTeam } from '../import/original-team';

export interface EquipCommand { actor: number; slot: number }
export type InventoryCommand = EquipCommand & { kind: 'equip' | 'return' };
export interface TrainingInventoryActor {
  inventory: SelectionInventory;
  weight: WeightValues & { status: 'verified' };
  selection: number;
}
export interface TrainingInventory { commands: InventoryCommand[]; actors: TrainingInventoryActor[] }

export const MAX_INVENTORY_COMMANDS = 128;

/** v4 alternates independently for each actor within the shared session budget. */
export function inventoryCommands(value: unknown, legacyOneCycle = false): InventoryCommand[] {
  if (!Array.isArray(value) || value.length > (legacyOneCycle ? 8 : MAX_INVENTORY_COMMANDS) || Reflect.ownKeys(value).length !== value.length + 1) throw new Error('Inventory operation budget exceeded or command storage is not dense.');
  const phases = [0, 0, 0, 0];
  return Array.from(value, entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Reflect.ownKeys(entry).length !== 3 ||
        !['kind', 'actor', 'slot'].every(key => Object.hasOwn(entry, key))) throw new Error('Malformed inventory command fields.');
    const { kind, actor, slot } = entry as InventoryCommand;
    if ((kind !== 'equip' && kind !== 'return') || !Number.isInteger(actor) || actor < 0 || actor > 3 ||
        !Number.isInteger(slot) || slot < 0 || slot > (kind === 'return' ? 28 : 29) ||
        phases[actor] !== (kind === 'equip' ? 0 : 1)) throw new Error('Invalid inventory command or equip/return order.');
    phases[actor] = kind === 'equip' ? 1 : legacyOneCycle ? 2 : 0;
    return { kind, actor, slot };
  });
}

export function equipCommands(value: unknown): EquipCommand[] {
  if (!Array.isArray(value) || value.length > 4 || Reflect.ownKeys(value).length !== value.length + 1) throw new Error('Expected at most four dense equip commands.');
  const seen = new Set<number>();
  return Array.from(value, entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Reflect.ownKeys(entry).length !== 2 ||
        !Object.hasOwn(entry, 'actor') || !Object.hasOwn(entry, 'slot')) throw new Error('Malformed equip command fields.');
    const { actor, slot } = entry as EquipCommand;
    if (!Number.isInteger(actor) || actor < 0 || actor > 3 || !Number.isInteger(slot) || slot < 0 || slot > 29 || seen.has(actor)) throw new Error('Invalid or duplicate equip command.');
    seen.add(actor); return { actor, slot };
  });
}

/** Logical source transcription; synthetic callers gain no verified-source authority here. */
export function transferIntoEmptyEquipment(inventory: SelectionInventory, items: ItemCatalog, physique: number, slot: number): { inventory: SelectionInventory; selection: number; weight: WeightValues } {
  const next = structuredClone(inventory);
  if (next.carried.length !== 30 || next.actions.length !== 10 || next.equipped.itemId !== 0) throw new Error('Equip requires empty equipment and complete carried/action storage.');
  const before = computeSourceWeight(items, next, physique);
  if (before.status !== 'computed') throw new Error(`Unsupported inventory weight: ${before.reason}`);
  const end = next.carried.findIndex(entry => entry.itemId === 0);
  if (end <= 0 || next.carried.slice(end).some(entry => entry.itemId !== 0) ||
      !Number.isInteger(slot) || slot < 0 || slot >= end) throw new Error('Equip requires an occupied selection in a non-full contiguous carried prefix.');
  next.equipped = { ...next.carried[slot]! };
  for (let i = slot; i < end - 1; i++) next.carried[i] = { ...next.carried[i + 1]! };
  const last = next.carried[end - 1]!;
  next.carried[end - 1] = { ...last, itemId: 0, rawHex: `00${last.rawHex.slice(2)}` };
  const selection = slot === end - 1 && slot > 0 ? slot - 1 : slot;
  const weight = computeSourceWeight(items, next, physique);
  if (weight.status !== 'computed' || weight.totalWeight !== before.totalWeight) throw new Error('Unsupported equip weight profile.');
  return { inventory: next, selection, weight: { totalWeight: weight.totalWeight, quotient: weight.quotient, tooHeavy: weight.tooHeavy, usingGrenade: weight.usingGrenade } };
}

/** ACTION3/insert_item source deduction, not a general original actor/control adapter. */
export function returnEquipmentToBackpack(inventory: SelectionInventory, items: ItemCatalog, physique: number, slot: number): { inventory: SelectionInventory; selection: number; weight: WeightValues } {
  const next = structuredClone(inventory);
  if (next.carried.length !== 30 || next.actions.length !== 10 || next.equipped.itemId === 0) throw new Error('Return requires occupied equipment and complete carried/action storage.');
  const before = computeSourceWeight(items, next, physique);
  if (before.status !== 'computed') throw new Error(`Unsupported inventory weight: ${before.reason}`);
  const end = next.carried.findIndex(entry => entry.itemId === 0);
  // Select occupied positions, or zero in an empty backpack. Slot 29 is never a
  // target: the original reverse loop always copies slot 28 before its comparison.
  if (end < 0 || next.carried.slice(end).some(entry => entry.itemId !== 0) ||
      !Number.isInteger(slot) || slot < 0 || slot > Math.max(0, end - 1)) throw new Error('Return requires a non-full contiguous carried prefix and a valid insertion position.');
  for (let i = 28; i >= slot; i--) next.carried[i + 1] = { ...next.carried[i]! };
  next.carried[slot] = { ...next.equipped };
  next.equipped = { ...next.equipped, itemId: 0, rawHex: `00${next.equipped.rawHex.slice(2)}` };
  const weight = computeSourceWeight(items, next, physique);
  if (weight.status !== 'computed' || weight.totalWeight !== before.totalWeight) throw new Error('Unsupported return weight profile.');
  return { inventory: next, selection: slot, weight: { totalWeight: weight.totalWeight, quotient: weight.quotient, tooHeavy: weight.tooHeavy, usingGrenade: weight.usingGrenade } };
}

/** Only session construction supplies the freshly reverified immutable team and item table. */
export function replayTrainingInventory(team: OriginalTeam, items: ItemCatalog, input: unknown): TrainingInventory {
  const commands = inventoryCommands(input);
  const actors: TrainingInventoryActor[] = team.actors.map(actor => ({ inventory: structuredClone(actor.inventory), weight: { ...actor.weight }, selection: 0 }));
  for (const command of commands) {
    const transfer = command.kind === 'equip' ? transferIntoEmptyEquipment : returnEquipmentToBackpack;
    const result = transfer(actors[command.actor]!.inventory, items, team.actors[command.actor]!.stats.physique, command.slot);
    actors[command.actor] = { ...result, weight: { ...result.weight, status: 'verified' } };
  }
  return { commands, actors };
}
