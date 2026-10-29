/** Serializable contracts. Coordinates: x east, y south, z elevation (up). */
export interface Position { x: number; y: number; z: number }
/** 0 north, 1 east, 2 south, 3 west. */
export type Facing = 0 | 1 | 2 | 3;
export interface Spawn extends Position { facing: Facing }
export interface LevelData {
  schemaVersion: 1;
  id: string;
  name: string;
  source: { kind: 'synthetic' | 'editor-map'; sha256: string | null; revision: 'synthetic' | 'unverified-editor' };
  size: { width: number; depth: number; height: number };
  /** Unsigned source words. x varies fastest, then y, then z. */
  layers: [number[], number[], number[]];
  starts: [Spawn, Spawn, Spawn, Spawn];
  exit: Position;
  unsupportedMechanics: string[];
}
export interface Mercenary extends Spawn { id: number }
export type MissionMode = 'navigation' | 'cooperative-extraction' | 'first-exit';
export interface MissionRules { mode: MissionMode; timeLimit: number | null }
/** Original countdown: decrement subticks through zero, reset to 600, borrow decimal units/tens. */
export interface MissionClock { tens: number; units: number; subticks: number }
export interface MissionState {
  rules: MissionRules;
  outcome: 'active' | 'complete' | 'failed';
  exited: [boolean, boolean, boolean, boolean];
  clock: MissionClock | null;
  winner: number | null;
}
/** Dry practice runtime; normalized incapacitation, not original lifecycle storage. */
export interface FallActor {
  physique: number;
  agility: number;
  weight: number;
  fitness: number;
  dead: boolean;
  fallDamage: number;
}
export type PhysicsState = { mode: 'static' } | {
  mode: 'dry-fall';
  profileId: 'synthetic-empty-v1' | 'selected-team-v1';
  fallCounter: number;
  actors: [FallActor, FallActor, FallActor, FallActor];
};
export interface WorldState {
  schemaVersion: 3;
  levelId: string;
  tick: number;
  rng: number;
  mercenaries: [Mercenary, Mercenary, Mercenary, Mercenary];
  mission: MissionState;
  physics: PhysicsState;
}
export type Action = 'forward' | 'backward' | 'strafe-left' | 'strafe-right' | 'turn-left' | 'turn-right';
/** At most one command per mercenary per tick; reject duplicates. */
export interface PlayerCommand { mercenaryId: number; action: Action }
export interface SimulationEvent { tick: number; mercenaryId: number; kind: 'moved' | 'turned' | 'blocked' | 'exited' | 'complete' | 'failed' | 'fell' | 'damaged' | 'died'; reason?: string }
/** Reserved envelope: loading must validate every field before use. */
export interface SaveEnvelope { format: 'hired-guns-save'; version: 3; levelHash: string; world: WorldState }
export function cellIndex(level: LevelData, p: Position): number {
  return (p.z * level.size.depth + p.y) * level.size.width + p.x;
}
export function inBounds(level: LevelData, p: Position): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.z)
    && p.x >= 0 && p.x < level.size.width && p.y >= 0 && p.y < level.size.depth && p.z >= 0 && p.z < level.size.height;
}
