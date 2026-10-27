import type { SelectionInventory, WeightValues } from '../import/inventory';
import { computeSourceWeight } from '../import/inventory';
import type { ItemCatalog } from '../import/items';
import type { OriginalTeam } from '../import/original-team';

export interface EquipCommand { actor: number; slot: number }
export interface TrainingInventoryActor {
  inventory: SelectionInventory;
  weight: WeightValues & { status: 'verified' };
  selection: number;
}
export interface TrainingInventory { commands: EquipCommand[]; actors: TrainingInventoryActor[] }

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

/** Only session construction supplies the freshly reverified immutable team and item table. */
export function replayTrainingInventory(team: OriginalTeam, items: ItemCatalog, input: unknown): TrainingInventory {
  const commands = equipCommands(input);
  const actors: TrainingInventoryActor[] = team.actors.map(actor => ({ inventory: structuredClone(actor.inventory), weight: { ...actor.weight }, selection: 0 }));
  for (const command of commands) {
    const result = transferIntoEmptyEquipment(actors[command.actor]!.inventory, items, team.actors[command.actor]!.stats.physique, command.slot);
    actors[command.actor] = { ...result, weight: { ...result.weight, status: 'verified' } };
  }
  return { commands, actors };
}
