import { type Facing, type LevelData, type MissionRules, type PlayerCommand, type Position, type SimulationEvent, type WorldState } from '../contracts';
import { initialMission, isExitBlock, resolveMission } from './mission';
import { missionRulesForLevel } from './mission-profile';
import { obstruction, resolveTraversal } from './traversal';
import { advanceGravity, dryFallEnabled, fallObstruction, initialPhysics, isDead, teamDead, type FallProfile } from './fall';
export { obstruction } from './traversal';

export const TICK_MS = 20;
/** About 2.7 years at 50 Hz. Exhaustion pauses; reset or restore an earlier checkpoint. */
export const MAX_WORLD_TICK = 0xffffffff;
export const DIRECTIONS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }] as const;
const ACTIONS = new Set(['forward', 'backward', 'strafe-left', 'strafe-right', 'turn-left', 'turn-right']);
const sameCell = (a: Position, b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;

export function createWorld(level: LevelData, seed = 0x48475231, rules: MissionRules = missionRulesForLevel(level), profile?: FallProfile): WorldState {
  for (const start of level.starts) {
    const reason = obstruction(level, start);
    if (reason) throw new Error(`Start cannot navigate: ${reason} at ${start.x},${start.y},${start.z}`);
  }
  if (level.starts.some((s, i) => level.starts.some((other, j) => i !== j && sameCell(s, other)))) {
    throw new Error('Overlapping starts require an explicit reference rule');
  }
  return {
    schemaVersion: 3, levelId: level.id, tick: 0, rng: seed >>> 0,
    mercenaries: level.starts.map((start, id) => ({ ...start, id })) as WorldState['mercenaries'],
    mission: initialMission(level,rules),
    physics: initialPhysics(level, profile),
  };
}

/** Reserved seeded generator; presentation must never consume world RNG. */
export function nextRandom(seed: number): number {
  let x = seed >>> 0 || 0x6d2b79f5;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}

export function stepWorld(level: LevelData, previous: WorldState, commands: readonly PlayerCommand[], wetAdmission?: (p: Position) => void): { world: WorldState; events: SimulationEvent[] } {
  if (previous.levelId !== level.id) throw new Error('World/level mismatch');
  if (previous.mission.outcome !== 'active' || teamDead(previous)) return {world:structuredClone(previous),events:[]};
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
  advanceGravity(level,world,events);
  // Stable ID order is intentional. Occupied-at-start cells cannot be entered, so swaps fail.
  for (const command of [...commands].sort((a, b) => a.mercenaryId - b.mercenaryId)) {
    if (world.mission.exited[command.mercenaryId] || isDead(world,command.mercenaryId)) continue;
    const actor = world.mercenaries[command.mercenaryId]!;
    const event = { tick: world.tick, mercenaryId: actor.id };
    if (command.action === 'turn-left' || command.action === 'turn-right') {
      actor.facing = (actor.facing + (command.action === 'turn-left' ? 3 : 1)) % 4 as Facing;
      events.push({ ...event, kind: 'turned' }); continue;
    }
    const offset = command.action === 'backward' ? 2 : command.action === 'strafe-left' ? 3 : command.action === 'strafe-right' ? 1 : 0;
    const travelDirection = (actor.facing + offset) % 4 as Facing;
    const occupied = (p: Position) => previous.mercenaries.some(other => !previous.mission.exited[other.id] && !isDead(world,other.id) && other.id !== actor.id && sameCell(other,p)) || world.mercenaries.some(other => !world.mission.exited[other.id] && !isDead(world,other.id) && other.id !== actor.id && sameCell(other,p));
    const falling = dryFallEnabled(level) && world.physics.mode === 'dry-fall';
    const traversal = resolveTraversal(level,actor,travelDirection,occupied,falling,!!wetAdmission);
    if (wetAdmission) { wetAdmission(actor); wetAdmission(traversal.target); }
    const target = traversal.target;
    const reason = traversal.reason ?? (falling ? fallObstruction(level,actor) ?? fallObstruction(level,target) : null);
    if ((reason === null || reason === 'block') && world.mission.rules.mode !== 'navigation' && isExitBlock(level,target)) {
      world.mission.exited[actor.id] = true;
      events.push({...event,kind:'exited'});
      continue;
    }
    if (reason) events.push({ ...event, kind: 'blocked', reason });
    else { Object.assign(actor, target); events.push({ ...event, kind: 'moved' }); }
  }
  resolveMission(world,events);
  return { world, events };
}
