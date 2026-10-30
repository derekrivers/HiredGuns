import { PRESSURE_PAD_FIXTURE, pressurePadLevel } from './training-pressure-pad';
import { MOVING_DOOR_FIXTURE, type DoorAction } from './training-moving-door';
import { movingDoorLevel } from './training-gate';
import type { LevelData, PlayerCommand, Position, WorldState } from '../contracts';
import { createTrainingEncounter, fireTrainingEncounter, targetTrainingEncounter, tickTrainingEncounter, type TrainingEncounter } from '../combat/training-encounter';
import type { GunWeapon } from '../combat/weapon-transition';
import type { ItemCatalog } from '../import/items';
import type { OriginalTeam } from '../import/original-team';
import { replayTrainingInventory, type InventoryCommand } from '../sim/training-inventory';
import { createWorld, obstruction } from '../sim/world';
import { MAX_GROUND_TICKS } from '../items/training-ground';
import { cellIndex } from '../contracts';
import { PATROL_EXIT, PATROL_MISSION_FIXTURE, patrolMissionLevel } from './training-gate';
import { appendGateEvent, effectiveGateLevel, gateHistory, initialTrainingGate, MAX_GATE_HISTORY, stepTrainingGate, type GateEvent, type TrainingGate } from './training-gate';

export const PATROL_FIXTURE = 'authored-gate-patrol-v1';
export const PATROL_CADENCE = 16;
// Canonical adjacent cells across the actual gate; no serialized coordinate authority.
export const PATROL_ROUTE: readonly Readonly<Position>[] = Object.freeze([3,4,5,6,7].map(x => Object.freeze({x,y:5,z:1})));
export type PatrolEvent = GateEvent | {kind:'fire'} | {kind:'target'};
export interface TrainingPatrol {
  version: 1; fixture: typeof PATROL_FIXTURE | typeof PATROL_MISSION_FIXTURE | typeof MOVING_DOOR_FIXTURE | typeof PRESSURE_PAD_FIXTURE; history: PatrolEvent[];
  routeIndex: number; direction: 1 | -1; counter: number;
  blocked: 'clear' | 'gate-or-wall' | 'player';
}
export const initialTrainingPatrol = (mission = false, moving = false, pad = false): TrainingPatrol => ({version:1,fixture:pad ? PRESSURE_PAD_FIXTURE : moving ? MOVING_DOOR_FIXTURE : mission ? PATROL_MISSION_FIXTURE : PATROL_FIXTURE,history:[],routeIndex:0,direction:1,counter:0,blocked:'clear'});
export const patrolPosition = (patrol: TrainingPatrol) => PATROL_ROUTE[patrol.routeIndex]!;
export function patrolHistory(value: unknown): PatrolEvent[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > MAX_GATE_HISTORY || Reflect.ownKeys(value).length !== value.length+1) throw new Error('Patrol history budget or storage invalid.');
  return Array.from({length:value.length},(_,i) => {
    const descriptor = Object.getOwnPropertyDescriptor(value,String(i));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor,'value')) throw new Error('Malformed patrol event.');
    const event = descriptor.value;
    const kind = Object.getOwnPropertyDescriptor(event ?? {},'kind');
    if (!kind?.enumerable || !Object.hasOwn(kind,'value')) throw new Error('Malformed patrol event.');
    if (kind.value === 'fire' || kind.value === 'target') {
      if (Reflect.ownKeys(event).length !== 1 || ![Object.prototype,null].includes(Object.getPrototypeOf(event))) throw new Error('Malformed firing event.');
      return {kind:kind.value};
    }
    return gateHistory([event])[0]!;
  });
}
export function appendPatrolEvent(patrol: TrainingPatrol, event: PatrolEvent): TrainingPatrol {
  const history = structuredClone(patrol.history), last = history.at(-1);
  if (last?.kind === 'wait' && event.kind === 'wait') last.ticks += event.ticks;
  else history.push(event);
  return {...patrol,history:patrolHistory(history)};
}
const same = (a: Position,b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;
/** AUTHORED priority: reserve NPC current/destination first, then stable-ID players.
 * Blocked route attempts reverse and wait a full cadence. No swaps or following
 * into cells occupied at tick start. Closed gate and players use the same policy. */
export function stepTrainingPatrol(level: LevelData, world: WorldState, gate: TrainingGate, patrol: TrainingPatrol, encounter: TrainingEncounter, commands: PlayerCommand[], actor: number | null, snapshot = effectivePatrolLevel(level,gate,encounter), action: DoorAction = 16) {
  if (world.mission.outcome !== 'active') return {world,gate,patrol,encounter,events:[],feedback:'',effective:snapshot};
  let next = {...patrol}, destination: Position | null = null;
  const active = encounter.fitness > 0;
  if (active && ++next.counter === PATROL_CADENCE) {
    next.counter = 0;
    const routeIndex = next.routeIndex + next.direction;
    if (routeIndex < 0 || routeIndex >= PATROL_ROUTE.length) { next.direction = next.direction === 1 ? -1 : 1; next.blocked = 'clear'; }
    else {
      const p = PATROL_ROUTE[routeIndex]!;
      const blocked = obstruction(snapshot,p) ? 'gate-or-wall' : world.mercenaries.some(m => !world.mission.exited[m.id] && same(m,p)) ? 'player' : 'clear';
      next.blocked = blocked;
      if (blocked !== 'clear') next.direction = next.direction === 1 ? -1 : 1;
      else destination = p;
    }
  }
  const reservations = active ? [patrolPosition(patrol),...(destination ? [destination] : [])] : [];
  const result = stepTrainingGate(pressurePadLevel(level) ? level : snapshot,world,gate,commands,actor,reservations,snapshot,action);
  if (result.world.tick === world.tick) return {...result,patrol,encounter};
  // Closure interlock reserved this destination; opening takes effect next cadence.
  if (destination) next = {...next,routeIndex:PATROL_ROUTE.indexOf(destination)};
  return {...result,patrol:next,encounter:tickTrainingEncounter(encounter)};
}
export function replayTrainingPatrol(level: LevelData, team: OriginalTeam, items: ItemCatalog, gun: GunWeapon, history: unknown) {
  let world = createWorld(level), gate = initialTrainingGate(movingDoorLevel(level),pressurePadLevel(level)), patrol = initialTrainingPatrol(patrolMissionLevel(level),movingDoorLevel(level),pressurePadLevel(level));
  let encounter = createTrainingEncounter(gun,team.actors.map(a => a.canonicalIndex),0,'full');
  let inventory = replayTrainingInventory(team,items,[]);
  const inventoryCommands: InventoryCommand[] = [];
  let effective = effectiveGateLevel(level,gate);
  const events = patrolHistory(history);
  const ticks = events.reduce((sum,event) => sum + (event.kind === 'wait' ? event.ticks : event.kind === 'step' || event.kind === 'activate' || event.kind === 'door' ? 1 : 0),0);
  if (ticks > MAX_GROUND_TICKS) throw new Error('Patrol tick budget exceeded.');
  for (const event of events) {
    if (event.kind === 'door' && !movingDoorLevel(level)) throw new Error('Door actions require v12 fixture.');
    if (patrolMissionLevel(level) && world.mission.outcome !== 'active') throw new Error('Patrol history continues after outcome.');
    if (patrolMissionLevel(level) && (event.kind === 'fire' || event.kind === 'target') && world.mission.exited[encounter.actor]) throw new Error('Extracted gun actor is retired.');
    if (event.kind === 'fire') {encounter = fireTrainingEncounter(encounter,gun); effective = effectivePatrolLevel(level,gate,encounter);}
    else if (event.kind === 'target') encounter = targetTrainingEncounter(encounter);
    else if (event.kind === 'equip' || event.kind === 'exchange' || event.kind === 'return') {
      if (patrolMissionLevel(level) && world.mission.exited[event.actor]) throw new Error('Extracted inventory actor is retired.');
      inventoryCommands.push(event); inventory = replayTrainingInventory(team,items,inventoryCommands);
      gate = appendGateEvent(gate,event);
    } else if (event.kind === 'step' || event.kind === 'wait' || event.kind === 'activate' || event.kind === 'door') {
      const ticks = event.kind === 'wait' ? event.ticks : 1;
      for (let t=0;t<ticks;t++) {
        if (patrolMissionLevel(level) && world.mission.outcome !== 'active') throw new Error('Patrol history continues after outcome.');
        const result = stepTrainingPatrol(level,world,gate,patrol,encounter,event.kind === 'wait' ? [] : event.commands,event.kind === 'activate' || event.kind === 'door' ? event.actor : null,effective,event.kind === 'door' ? event.action : 16);
        world = result.world; effective = result.effective; gate = result.gate; patrol = result.patrol; encounter = result.encounter;
      }
      gate = appendGateEvent(gate,event);
    }
    patrol = appendPatrolEvent(patrol,event);
  }
  return {world,gate,patrol,encounter,inventory};
}

/** Exit state is derived solely from canonical fixture and replayed target health. */
export function effectivePatrolLevel(level: LevelData, gate: TrainingGate | null, encounter: TrainingEncounter | null): LevelData {
  const map = effectiveGateLevel(level,gate);
  if (patrolMissionLevel(level) && encounter?.fitness === 0) map.layers[0][cellIndex(map,PATROL_EXIT)] = 2 | (3 << 11);
  return map;
}
