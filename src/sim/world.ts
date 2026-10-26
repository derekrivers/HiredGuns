import { cellIndex, inBounds, type Facing, type LevelData, type MissionRules, type PlayerCommand, type Position, type SimulationEvent, type WorldState } from '../contracts';
import { initialMission, isExitBlock, resolveMission } from './mission';
import { missionRulesForLevel } from './mission-profile';

export const TICK_MS = 20;
/** About 2.7 years at 50 Hz. Exhaustion pauses; reset or restore an earlier checkpoint. */
export const MAX_WORLD_TICK = 0xffffffff;
export const DIRECTIONS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }] as const;
const ACTIONS = new Set(['forward', 'backward', 'strafe-left', 'strafe-right', 'turn-left', 'turn-right']);
const sameCell = (a: Position, b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;

/** Conservative static navigation rules, not original movement compatibility. */
export function obstruction(level: LevelData, p: Position): string | null {
  if (!inBounds(level, p)) return 'boundary';
  const flags = level.layers[0][cellIndex(level, p)]!;
  if (flags & (2 | 64)) return 'block';
  if (flags & (4 | 16 | 32 | 256)) return 'unsupported environment';
  // Floor in current cell, or a solid cuboid directly below. Special block shapes are deferred.
  const below = p.z > 0 ? level.layers[0][cellIndex(level, { ...p, z: p.z - 1 })]! : 0;
  const solidBelow = (below & 2) !== 0 && ((below >>> 11) & 63) === 0;
  if (!(flags & 1) && !solidBelow) return 'unsupported drop';
  return null;
}

export function createWorld(level: LevelData, seed = 0x48475231, rules: MissionRules = missionRulesForLevel(level)): WorldState {
  for (const start of level.starts) {
    const reason = obstruction(level, start);
    if (reason) throw new Error(`Start cannot navigate: ${reason} at ${start.x},${start.y},${start.z}`);
  }
  if (level.starts.some((s, i) => level.starts.some((other, j) => i !== j && sameCell(s, other)))) {
    throw new Error('Overlapping starts require an explicit reference rule');
  }
  return {
    schemaVersion: 2, levelId: level.id, tick: 0, rng: seed >>> 0,
    mercenaries: level.starts.map((start, id) => ({ ...start, id })) as WorldState['mercenaries'],
    mission: initialMission(level,rules),
  };
}

/** Reserved seeded generator; presentation must never consume world RNG. */
export function nextRandom(seed: number): number {
  let x = seed >>> 0 || 0x6d2b79f5;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}

export function stepWorld(level: LevelData, previous: WorldState, commands: readonly PlayerCommand[]): { world: WorldState; events: SimulationEvent[] } {
  if (previous.levelId !== level.id) throw new Error('World/level mismatch');
  if (previous.mission.outcome !== 'active') return {world:structuredClone(previous),events:[]};
  if (!Number.isSafeInteger(previous.tick) || previous.tick < 0 || previous.tick >= MAX_WORLD_TICK) {
    throw new Error('Simulation time limit reached. Reset positions or load an earlier checkpoint.');
  }
  const ids = new Set<number>();
  for (const command of commands) {
    if (!Number.isInteger(command.mercenaryId) || command.mercenaryId < 0 || command.mercenaryId > 3 || !ACTIONS.has(command.action)) throw new Error('Invalid command');
    if (ids.has(command.mercenaryId)) throw new Error('Duplicate mercenary command');
    ids.add(command.mercenaryId);
  }
  const world = structuredClone(previous);
  world.tick++;
  const events: SimulationEvent[] = [];
  // Stable ID order is intentional. Occupied-at-start cells cannot be entered, so swaps fail.
  for (const command of [...commands].sort((a, b) => a.mercenaryId - b.mercenaryId)) {
    if (world.mission.exited[command.mercenaryId]) continue;
    const actor = world.mercenaries[command.mercenaryId]!;
    const event = { tick: world.tick, mercenaryId: actor.id };
    if (command.action === 'turn-left' || command.action === 'turn-right') {
      actor.facing = (actor.facing + (command.action === 'turn-left' ? 3 : 1)) % 4 as Facing;
      events.push({ ...event, kind: 'turned' }); continue;
    }
    const offset = command.action === 'backward' ? 2 : command.action === 'strafe-left' ? 3 : command.action === 'strafe-right' ? 1 : 0;
    const delta = DIRECTIONS[(actor.facing + offset) % 4]!;
    const target = { x: actor.x + delta.x, y: actor.y + delta.y, z: actor.z };
    if (world.mission.rules.mode !== 'navigation' && isExitBlock(level,target)) {
      world.mission.exited[actor.id] = true;
      events.push({...event,kind:'exited'});
      continue;
    }
    const reason = obstruction(level, target)
      ?? (previous.mercenaries.some(other => !previous.mission.exited[other.id] && other.id !== actor.id && sameCell(other, target)) || world.mercenaries.some(other => !world.mission.exited[other.id] && other.id !== actor.id && sameCell(other, target)) ? 'occupied' : null);
    if (reason) events.push({ ...event, kind: 'blocked', reason });
    else { Object.assign(actor, target); events.push({ ...event, kind: 'moved' }); }
  }
  resolveMission(world,events);
  return { world, events };
}
