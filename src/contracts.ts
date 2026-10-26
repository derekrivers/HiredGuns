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
export interface WorldState {
  schemaVersion: 1;
  levelId: string;
  tick: number;
  rng: number;
  mercenaries: [Mercenary, Mercenary, Mercenary, Mercenary];
}
export type Action = 'forward' | 'backward' | 'strafe-left' | 'strafe-right' | 'turn-left' | 'turn-right';
/** At most one command per mercenary per tick; reject duplicates. */
export interface PlayerCommand { mercenaryId: number; action: Action }
export interface SimulationEvent { tick: number; mercenaryId: number; kind: 'moved' | 'turned' | 'blocked'; reason?: string }
/** Reserved envelope: loading must validate every field before use. */
export interface SaveEnvelope { format: 'hired-guns-save'; version: 1; levelHash: string; world: WorldState }
export function cellIndex(level: LevelData, p: Position): number {
  return (p.z * level.size.depth + p.y) * level.size.width + p.x;
}
export function inBounds(level: LevelData, p: Position): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.z)
    && p.x >= 0 && p.x < level.size.width && p.y >= 0 && p.y < level.size.depth && p.z >= 0 && p.z < level.size.height;
}
