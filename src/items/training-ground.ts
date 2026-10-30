import type { LevelData, MissionRules, PlayerCommand, Position, WorldState } from '../contracts';
import type { InventorySlot } from '../import/characters';
import { computeSourceWeight } from '../import/inventory';
import type { ItemCatalog } from '../import/items';
import type { OriginalTeam } from '../import/original-team';
import { exchangeOccupiedEquipment, returnEquipmentToBackpack, transferIntoEmptyEquipment, type InventoryCommand, type TrainingInventory } from '../sim/training-inventory';
import { createWorld, obstruction, stepWorld } from '../sim/world';
import { groundTransferCommand, transferGroundItem, type GroundTransferCommand } from './ground-transfer';

export const GROUND_FIXTURE = 'relocated-team-cache-v1';
export const MAX_GROUND_HISTORY = 128;
export const MAX_GROUND_TICKS = 45000;
export type GroundEvent = { kind: 'step'; commands: PlayerCommand[] } | { kind: 'wait'; ticks: number } |
  InventoryCommand | { kind: 'ground'; actor: number; slot: number; groundId: string; transfer: GroundTransferCommand };
export interface GroundSlot extends Position { id: string; entry: InventorySlot }
export interface TrainingGround { version: 1; fixture: typeof GROUND_FIXTURE; rules: MissionRules; history: GroundEvent[]; slots: GroundSlot[] }

function fields(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.getOwnPropertyDescriptor(value, key)?.enumerable || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value'))) throw new Error('Malformed ground replay fields.');
}
function dense(value: unknown, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max || Reflect.ownKeys(value).length !== value.length + 1 ||
      Array.from({ length: value.length }, (_, i) => Object.getOwnPropertyDescriptor(value, String(i))).some(d => !d?.enumerable || !Object.hasOwn(d, 'value'))) throw new Error('Ground history budget exceeded or storage is not dense.');
}
function integer(n: unknown, max: number): asserts n is number { if (!Number.isInteger(n) || (n as number) < 0 || (n as number) > max) throw new Error('Invalid ground replay index.'); }
export function groundHistory(value: unknown): GroundEvent[] {
  dense(value, MAX_GROUND_HISTORY);
  return Array.from(value, event => {
    if (!event || typeof event !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(event)) ||
        !Object.getOwnPropertyDescriptor(event, 'kind')?.enumerable || !Object.hasOwn(Object.getOwnPropertyDescriptor(event, 'kind')!, 'value')) throw new Error('Invalid ground replay event.');
    const kind = (event as { kind: unknown }).kind;
    if (kind === 'wait') { fields(event, ['kind', 'ticks']); integer(event.ticks, MAX_GROUND_TICKS); if (!event.ticks) throw new Error('Empty ground wait.'); return { kind, ticks: event.ticks }; }
    if (kind === 'step') {
      fields(event, ['kind', 'commands']); dense(event.commands, 4);
      const commands = Array.from(event.commands, c => { fields(c, ['mercenaryId', 'action']); integer(c.mercenaryId, 3);
        if (!['forward','backward','strafe-left','strafe-right','turn-left','turn-right'].includes(c.action as string)) throw new Error('Invalid movement.');
        return { mercenaryId: c.mercenaryId, action: c.action as PlayerCommand['action'] }; });
      if (!commands.length || new Set(commands.map(c => c.mercenaryId)).size !== commands.length) throw new Error('Invalid movement batch.');
      return { kind, commands };
    }
    if (kind === 'ground') {
      fields(event, ['kind','actor','slot','groundId','transfer']); integer(event.actor, 3); integer(event.slot, 29);
      if (typeof event.groundId !== 'string' || !/^cache-\d+-\d+$/.test(event.groundId)) throw new Error('Unknown ground slot.');
      return { kind, actor: event.actor, slot: event.slot, groundId: event.groundId, transfer: groundTransferCommand(event.transfer) };
    }
    fields(event, ['kind','actor','slot']); integer(event.actor, 3); integer(event.slot, 29);
    if (kind !== 'equip' && kind !== 'return' && kind !== 'exchange') throw new Error('Unknown ground history event.');
    return { kind, actor: event.actor, slot: event.slot };
  });
}
export function groundEnvelope(value: unknown): Pick<TrainingGround, 'version' | 'fixture' | 'rules' | 'history'> {
  fields(value, ['version','fixture','rules','history']);
  if (value.version !== 1 || value.fixture !== GROUND_FIXTURE) throw new Error('Unknown authored ground fixture.');
  fields(value.rules, ['mode','timeLimit']);
  if (!['navigation','cooperative-extraction','first-exit'].includes(value.rules.mode as string) ||
      (value.rules.timeLimit !== null && (!Number.isInteger(value.rules.timeLimit) || (value.rules.timeLimit as number) < 1 || (value.rules.timeLimit as number) > 99))) throw new Error('Invalid ground rules.');
  return { version: 1, fixture: GROUND_FIXTURE, rules: { mode: value.rules.mode as MissionRules['mode'], timeLimit: value.rules.timeLimit as number | null }, history: groundHistory(value.history) };
}
export const atGround = (position: Position, slot: Position) => position.x === slot.x && position.y === slot.y && position.z === slot.z;

/** Authored relocation, not original map placement. Every owned entry moves exactly once. */
export function replayTrainingGround(level: LevelData, team: OriginalTeam, items: ItemCatalog, input: unknown): { ground: TrainingGround; inventory: TrainingInventory; world: WorldState } {
  const envelope = groundEnvelope(input), worldInitial = createWorld(level, undefined, envelope.rules);
  if (worldInitial.physics.mode !== 'static') throw new Error('Ground actions require static Training43; selected dry-fall is unavailable.');
  const position = level.starts[0];
  if (obstruction(level, position)) throw new Error('Authored cache requires a supported dry standing cell.');
  const slots: GroundSlot[] = [];
  const inventory: TrainingInventory = { commands: [], actors: team.actors.map((actor, i) => {
    const owned = structuredClone(actor.inventory);
    owned.carried.forEach((entry, j) => { if (entry.itemId) { slots.push({ id: `cache-${i}-${j}`, x: position.x, y: position.y, z: position.z, entry: { ...entry } }); owned.carried[j] = { ...entry, itemId: 0, rawHex: `00${entry.rawHex.slice(2)}` }; } });
    const weight = computeSourceWeight(items, owned, actor.stats.physique);
    if (weight.status !== 'computed') throw new Error('Unsupported authored baseline weight.');
    return { inventory: owned, selection: 0, weight: { ...weight, status: 'verified' } };
  }) };
  if (!slots.length) throw new Error('Selected team has no cache items.');
  let world = worldInitial, ticks = 0;
  for (const event of envelope.history) {
    if (event.kind === 'step' || event.kind === 'wait') {
      const count = event.kind === 'wait' ? event.ticks : 1; ticks += count;
      if (ticks > MAX_GROUND_TICKS) throw new Error('Ground replay tick budget exceeded.');
      for (let i = 0; i < count; i++) {
        const next = stepWorld(level, world, event.kind === 'step' ? event.commands : []).world;
        if (next.tick !== world.tick + 1) throw new Error('Ground history continues after mission end.'); world = next;
      }
      continue;
    }
    const actor = inventory.actors[event.actor]!, physique = team.actors[event.actor]!.stats.physique;
    if (event.kind === 'ground') {
      const slot = slots.find(s => s.id === event.groundId);
      if (!slot || !atGround(world.mercenaries[event.actor]!, slot) || world.mission.exited[event.actor] || world.mission.outcome !== 'active') throw new Error('Move the active actor onto the authored cache cell.');
      const result = transferGroundItem({ inventory: actor.inventory, ground: slot.entry, selection: event.slot }, items, physique, event.transfer);
      if (result.outcome !== 'transferred') throw new Error(result.outcome === 'no-room' ? 'Backpack full (30 carried slots).' : result.outcome === 'already-too-heavy' ? 'Already too heavy.' : result.outcome === 'ground-occupied' ? 'Ground occupied.' : result.outcome === 'empty-ground' ? 'Nothing to pick up.' : 'Nothing equipped.');
      inventory.actors[event.actor] = { inventory: result.state.inventory, selection: result.state.selection, weight: { ...result.weight, status: 'verified' } };
      slot.entry = result.state.ground;
    } else {
      const transfer = event.kind === 'equip' ? transferIntoEmptyEquipment : event.kind === 'return' ? returnEquipmentToBackpack : exchangeOccupiedEquipment;
      const result = transfer(actor.inventory, items, physique, event.slot);
      inventory.actors[event.actor] = { ...result, weight: { ...result.weight, status: 'verified' } }; inventory.commands.push({ ...event });
    }
  }
  return { ground: { ...envelope, slots }, inventory, world };
}
