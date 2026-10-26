import type { LevelData, Mercenary, SaveEnvelope, Spawn, WorldState } from '../contracts';
import { MAX_WORLD_TICK, obstruction } from './world';

/** A checkpoint must be smaller than 16 KiB, including UTF-8 encoding. */
export const MAX_CHECKPOINT_BYTES = 16 * 1024;

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new Error(`${label} has missing or extra fields`);
  return value as Record<string, unknown>;
}
function array(value: unknown, length: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length !== length || Reflect.ownKeys(value).length !== length + 1 || Array.from({ length }, (_, i) => i).some(i => !Object.hasOwn(value, i))) throw new Error(`${label} must be a dense array of length ${length}`);
  return value;
}
function integer(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer in ${min}..${max}`);
  return value;
}
function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  return value;
}
function position(value: unknown, level: Pick<LevelData, 'size'>, facing: boolean, label: string): Spawn {
  const p = object(value, facing ? ['x','y','z','facing'] : ['x','y','z'], label);
  return {
    x: integer(p.x, 0, level.size.width - 1, `${label}.x`),
    y: integer(p.y, 0, level.size.depth - 1, `${label}.y`),
    z: integer(p.z, 0, level.size.height - 1, `${label}.z`),
    facing: facing ? integer(p.facing, 0, 3, `${label}.facing`) as Spawn['facing'] : 0,
  };
}

/** Snapshot all current contract fields so later caller mutations cannot race hashing. */
function levelSnapshot(value: LevelData): LevelData {
  const level = object(value, ['schemaVersion','id','name','source','size','layers','starts','exit','unsupportedMechanics'], 'level');
  if (level.schemaVersion !== 1) throw new Error('Unsupported level schemaVersion');
  const size = object(level.size, ['width','depth','height'], 'level.size');
  const dimensions = {
    width: integer(size.width, 1, Number.MAX_SAFE_INTEGER, 'level.width'),
    depth: integer(size.depth, 1, Number.MAX_SAFE_INTEGER, 'level.depth'),
    height: integer(size.height, 1, Number.MAX_SAFE_INTEGER, 'level.height'),
  };
  const cellCount = dimensions.width * dimensions.depth * dimensions.height;
  if (!Number.isSafeInteger(cellCount)) throw new Error('Invalid level cell count');
  const source = object(level.source, ['kind','sha256','revision'], 'level.source');
  if (source.kind !== 'synthetic' && source.kind !== 'editor-map') throw new Error('Unsupported level source kind');
  if (source.revision !== 'synthetic' && source.revision !== 'unverified-editor') throw new Error('Unsupported level source revision');
  if (source.sha256 !== null && (typeof source.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(source.sha256))) throw new Error('Invalid level source digest');
  const layers = array(level.layers, 3, 'level.layers').map((layer, i) => array(layer, cellCount, `level.layer${i}`).map(word => integer(word, 0, 0xffffffff, 'level word'))) as LevelData['layers'];
  const starts = array(level.starts, 4, 'level.starts').map((p, i) => position(p, { size: dimensions }, true, `level.start${i}`)) as LevelData['starts'];
  const { x, y, z } = position(level.exit, { size: dimensions }, false, 'level.exit');
  if (!Array.isArray(level.unsupportedMechanics)) throw new Error('Invalid level.unsupportedMechanics');
  const unsupportedMechanics = array(level.unsupportedMechanics, level.unsupportedMechanics.length, 'level.unsupportedMechanics').map(v => string(v, 'level mechanic'));
  return {
    schemaVersion: 1, id: string(level.id, 'level.id'), name: string(level.name, 'level.name'),
    source: { kind: source.kind, sha256: source.sha256, revision: source.revision },
    size: dimensions, layers, starts, exit: { x, y, z }, unsupportedMechanics,
  };
}

function worldSnapshot(level: LevelData, value: unknown): WorldState {
  const world = object(value, ['schemaVersion','levelId','tick','rng','mercenaries'], 'world');
  if (world.schemaVersion !== 1) throw new Error('Unsupported world schemaVersion');
  if (world.levelId !== level.id) throw new Error('Checkpoint world/level mismatch');
  const occupied = new Set<string>();
  const mercenaries = array(world.mercenaries, 4, 'world.mercenaries').map((value, id) => {
    const mercenary = object(value, ['id','x','y','z','facing'], `mercenary${id}`);
    if (mercenary.id !== id) throw new Error('Mercenary IDs must be ordered 0,1,2,3');
    const p = position({ x: mercenary.x, y: mercenary.y, z: mercenary.z, facing: mercenary.facing }, level, true, `mercenary${id}`);
    const reason = obstruction(level, p);
    if (reason) throw new Error(`Mercenary ${id} obstructed: ${reason}`);
    const cell = `${p.x},${p.y},${p.z}`;
    if (occupied.has(cell)) throw new Error('Checkpoint mercenaries overlap');
    occupied.add(cell);
    return { id, ...p } as Mercenary;
  }) as WorldState['mercenaries'];
  return { schemaVersion: 1, levelId: level.id, tick: integer(world.tick, 0, MAX_WORLD_TICK - 1, 'world.tick'), rng: integer(world.rng, 0, 0xffffffff, 'world.rng'), mercenaries };
}

// Sort object keys recursively; array/source-word and start order remain meaningful.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
async function fingerprint(level: LevelData): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(level)));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
function checkTextSize(json: string): void {
  if (typeof json !== 'string' || json.length >= MAX_CHECKPOINT_BYTES || new TextEncoder().encode(json).byteLength >= MAX_CHECKPOINT_BYTES) throw new Error('Checkpoint must be a string smaller than 16 KiB');
}

/** Navigation-only v1 save. No original map words or artwork enter the envelope. */
export async function exportCheckpoint(level: LevelData, world: WorldState): Promise<string> {
  const snapshot = levelSnapshot(level);
  const state = worldSnapshot(snapshot, world);
  const envelope: SaveEnvelope = { format: 'hired-guns-save', version: 1, levelHash: await fingerprint(snapshot), world: state };
  const json = JSON.stringify(envelope);
  checkTextSize(json);
  return json;
}

/** Fully validate unknown JSON before exposing a fresh navigation state. */
export async function importCheckpoint(level: LevelData, json: string): Promise<WorldState> {
  checkTextSize(json);
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error('Invalid checkpoint JSON'); }
  const envelope = object(parsed, ['format','version','levelHash','world'], 'checkpoint');
  if (envelope.format !== 'hired-guns-save' || envelope.version !== 1) throw new Error('Unsupported checkpoint format/version');
  if (typeof envelope.levelHash !== 'string' || !/^[0-9a-f]{64}$/.test(envelope.levelHash)) throw new Error('Invalid checkpoint levelHash');
  const snapshot = levelSnapshot(level);
  const world = worldSnapshot(snapshot, envelope.world);
  if (envelope.levelHash !== await fingerprint(snapshot)) throw new Error('Checkpoint level content mismatch');
  return world;
}
