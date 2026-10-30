import type { FallActor, LevelData, PhysicsState, Position, SimulationEvent, WorldState } from '../contracts';
import { createFallDemo } from '../demo';
import { obstruction } from './traversal';
import { damageFitness, nextFallDamage } from './health';

/** Exact authored map, never an editor-map digest alias. */
export function createSelectedFallLevel(): LevelData {
  const level = createFallDemo();
  level.id = 'selected-dry-fall-v1'; level.name = 'Selected-team dry-fall practice (authored)';
  level.unsupportedMechanics = ['Authored geometry with source-bound selected team. Adapted dry incapacitation/occupancy; no original lifecycle, wet hazards, pads or corpses.'];
  return level;
}
export function selectedFallLevel(level: LevelData): boolean {
  if (level.id !== 'selected-dry-fall-v1' || level.source.kind !== 'synthetic') return false;
  const expected = createSelectedFallLevel();
  return Object.keys(level).length === Object.keys(expected).length && Object.entries(expected).every(([key,value]) => JSON.stringify(level[key as keyof LevelData]) === JSON.stringify(value));
}
export function dryFallEnabled(level: LevelData): boolean {
  return (level.source.kind === 'synthetic' && level.id === 'synthetic-fall-v1') || selectedFallLevel(level);
}
export type FallProfile = [FallActor, FallActor, FallActor, FallActor];
export function initialPhysics(level: LevelData, profile?: FallProfile): Exclude<PhysicsState,{mode:'source-wet'}> {
  if (!dryFallEnabled(level)) return {mode:'static'};
  if (selectedFallLevel(level)) {
    if (!profile || profile.length !== 4) throw new Error('Selected dry fall requires a rebound team profile.');
    for (const actor of profile) {
      if (actor.fitness !== 65535 || actor.dead !== false || actor.fallDamage !== 0) throw new Error('Expected initial selected-team health.');
      nextFallDamage(0, actor); // Reject unsupported divisors/overflow before installation.
    }
    return {mode:'dry-fall',profileId:'selected-team-v1',fallCounter:0,actors:structuredClone(profile)};
  }
  return {mode:'dry-fall',profileId:'synthetic-empty-v1',fallCounter:0,actors:Array.from({length:4},()=>({physique:100,agility:100,weight:0,fitness:65535,dead:false,fallDamage:0})) as Extract<PhysicsState,{mode:'dry-fall'}>['actors']};
}
export function fallCounterAtTick(tick: number): number {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid fall tick');
  return tick === 0 ? 0 : 1 + (tick - 1) % 6;
}

/** Accept standing or a bounded, entirely dry vertical path to known static support. */
export function fallObstruction(level: LevelData, p: Position): string | null {
  let candidate = {...p};
  for (;;) {
    const reason = obstruction(level,candidate);
    if (reason !== 'unsupported drop') return reason;
    candidate = {...candidate,z:candidate.z-1};
  }
}
export function isDead(world: WorldState, id: number): boolean {
  if(world.physics.mode==='source-wet')return world.physics.deadWords[id]!==0;
  return world.physics.mode === 'dry-fall' && world.physics.actors[id]?.dead === true;
}
export function teamDead(world: WorldState): boolean {
  if(world.physics.mode==='source-wet')return world.physics.deadWords.every(word=>word!==0);
  return world.physics.mode === 'dry-fall' && world.physics.actors.every(actor=>actor.dead);
}
const sameCell = (a: Position,b: Position) => a.x===b.x&&a.y===b.y&&a.z===b.z;

/** Cadence and gravity precede commands. Called only on the new, cloned world. */
export function advanceGravity(level: LevelData, world: WorldState, events: SimulationEvent[]): void {
  if (world.physics.mode !== 'dry-fall') return;
  if (!dryFallEnabled(level)) throw new Error('Dry fall is not enabled for this level');
  world.physics.fallCounter++;
  if (world.physics.fallCounter <= 6) return;
  world.physics.fallCounter -= 6; // Once, matching source stuff_falls; no catch-up loop.
  const startingPositions = world.mercenaries.map(p=>({...p}));
  for (const mercenary of world.mercenaries) {
    const id = mercenary.id;
    const health = world.physics.actors[id]!;
    if (health.dead || world.mission.exited[id]) continue;
    const event = {tick:world.tick,mercenaryId:id};
    const reason = obstruction(level,mercenary);
    if (reason === null) {
      if (health.fallDamage !== 0) {
        const before = health.fitness;
        const injury = damageFitness(health.fitness,health.physique,health.fallDamage);
        health.fitness = injury.fitness; health.dead = injury.dead; health.fallDamage = 0;
        if (health.fitness < before) events.push({...event,kind:'damaged'});
        if (health.dead) events.push({...event,kind:'died'});
      }
      continue;
    }
    const pathReason = fallObstruction(level,mercenary);
    if (pathReason) { events.push({...event,kind:'blocked',reason:`unsafe fall: ${pathReason}`}); continue; }
    const target = {...mercenary,z:mercenary.z-1};
    const occupied = world.mercenaries.some(other=>other.id!==id&&!isDead(world,other.id)&&!world.mission.exited[other.id]
      && (sameCell(other,target)||sameCell(startingPositions[other.id]!,target)));
    if (occupied) { events.push({...event,kind:'blocked',reason:'occupied below'}); continue; }
    const targetReason = fallObstruction(level,target);
    if (targetReason) { events.push({...event,kind:'blocked',reason:`unsafe fall: ${targetReason}`}); continue; }
    health.fallDamage = nextFallDamage(health.fallDamage,health);
    mercenary.z = target.z;
    events.push({...event,kind:'fell'});
  }
}
