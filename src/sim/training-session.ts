import type { LevelData, WorldState } from '../contracts';
import { importItems, type ItemCatalog } from '../import/items';
import { equipCommands, inventoryCommands, replayTrainingInventory, type TrainingInventory } from './training-inventory';
import { importCharacters } from '../import/characters';
import { initializeOriginalTeam, type OriginalTeam } from '../import/original-team';
import { exportCheckpoint, importCheckpoint } from './checkpoint';
import { TRAINING_43_SHA256 } from './mission-profile';
import { createWorld } from './world';

export const MAX_SESSION_BYTES = 24 * 1024;
export interface TrainingSources { roster: Uint8Array; items: Uint8Array }
export interface TrainingSession {
  readonly indices: readonly number[];
  readonly names: readonly string[];
  readonly team: OriginalTeam;
  readonly items: ItemCatalog;
  readonly inventory: TrainingInventory;
}
export interface TrainingCandidate { session: TrainingSession; world: WorldState }

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new Error('Malformed Training43 session fields.');
}
function trainingLevel(level: LevelData): LevelData {
  const snapshot = structuredClone(level);
  if (snapshot.source.kind !== 'editor-map' || snapshot.source.sha256 !== TRAINING_43_SHA256) throw new Error('Open the verified local Training43 map first.');
  return snapshot;
}
/** Snapshot sources before any hashing. OriginalTeam rehashes/reparses both exact OCS inputs. */
export async function createTrainingSession(level: LevelData, sources: TrainingSources, indices: readonly number[], commands: unknown = []): Promise<TrainingCandidate> {
  const replay = inventoryCommands(commands);
  const map = trainingLevel(level);
  const roster = new Uint8Array(sources.roster), items = new Uint8Array(sources.items);
  const world = createWorld(map);
  const teamPromise = initializeOriginalTeam(roster, items, indices);
  const [team, catalog, table] = await Promise.all([teamPromise, importCharacters(roster), importItems(items)]);
  if (world.physics.mode !== 'static') throw new Error('Training43 sessions require static navigation.');
  // Existing checkpoint validation also validates the complete map and starting world.
  const checkpoint = await exportCheckpoint(map, world);
  const session = freeze({ indices: team.actors.map(a => a.canonicalIndex),
    names: team.actors.map(a => catalog.records[a.canonicalIndex]!.text.gameName || catalog.records[a.canonicalIndex]!.text.selectionName || `Character ${a.canonicalIndex + 1}`), team, items: table, inventory: replayTrainingInventory(team, table, replay) });
  sessionJSON(session, checkpoint);
  return { session, world };
}

/** Reverify and validate a complete prospective save before exposing a command candidate. */
async function changeInventory(level: LevelData, sources: TrainingSources, session: TrainingSession, actor: number, slot: number, paused: boolean, kind: 'equip' | 'return' | 'exchange', currentWorld?: WorldState): Promise<TrainingCandidate> {
  if (!paused) throw new Error('Pause before changing equipment.');
  const map = trainingLevel(level), world = currentWorld ? structuredClone(currentWorld) : undefined;
  const candidate = await createTrainingSession(map, sources, session.indices, [...session.inventory.commands, { kind, actor, slot }]);
  if (world) {
    if (world.physics.mode !== 'static') throw new Error('Training43 sessions require static navigation.');
    sessionJSON(candidate.session, await exportCheckpoint(map, world));
    return { session: candidate.session, world };
  }
  return candidate;
}
export async function equipTrainingSession(level: LevelData, sources: TrainingSources, session: TrainingSession, actor: number, slot: number, paused: boolean, world?: WorldState): Promise<TrainingCandidate> {
  return changeInventory(level, sources, session, actor, slot, paused, 'equip', world);
}
export async function returnTrainingSession(level: LevelData, sources: TrainingSources, session: TrainingSession, actor: number, slot: number, paused: boolean, world?: WorldState): Promise<TrainingCandidate> {
  return changeInventory(level, sources, session, actor, slot, paused, 'return', world);
}

export async function exchangeTrainingSession(level: LevelData, sources: TrainingSources, session: TrainingSession, actor: number, slot: number, paused: boolean, world?: WorldState): Promise<TrainingCandidate> {
  return changeInventory(level, sources, session, actor, slot, paused, 'exchange', world);
}

function sessionJSON(session: TrainingSession, checkpoint: string): string {
  const json = JSON.stringify({ format: 'hired-guns-training-session', version: 5,
    sources: { map: TRAINING_43_SHA256, ...session.team.sources },
    indices: session.indices, commands: session.inventory.commands, checkpoint });
  if (new TextEncoder().encode(json).length >= MAX_SESSION_BYTES) throw new Error('Training43 session is too large.');
  return json;
}

/** Retry and rule restart reset the overlay to the same immutable initialization. */
export function resetTrainingInventory(session: TrainingSession): TrainingSession {
  return freeze({ ...session, inventory: replayTrainingInventory(session.team, session.items, []) });
}

/** Save bounded replay commands, never unchecked arbitrary inventory storage. */
export async function exportTrainingSession(level: LevelData, world: WorldState, session: TrainingSession, sources: TrainingSources): Promise<string> {
  const map = trainingLevel(level);
  if (world.physics.mode !== 'static') throw new Error('Training43 sessions require static navigation.');
  const [candidate, checkpoint] = await Promise.all([createTrainingSession(map, sources, session.indices, session.inventory.commands), exportCheckpoint(map, world)]);
  return sessionJSON(candidate.session, checkpoint);
}

export function isTrainingSessionSave(json: string): boolean {
  try {
    const parsed: unknown = JSON.parse(json);
    return !!parsed && typeof parsed === 'object' && 'format' in parsed && parsed.format === 'hired-guns-training-session';
  } catch { return false; } // Let the ordinary checkpoint path retain its size/JSON errors.
}
/** No mutation: callers install both results together only if their generation is still current. */
export async function importTrainingSession(level: LevelData, sources: TrainingSources, json: string): Promise<TrainingCandidate> {
  if (typeof json !== 'string' || new TextEncoder().encode(json).length >= MAX_SESSION_BYTES) throw new Error('Training43 session must be smaller than 24 KiB.');
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('Malformed Training43 session.');
  const version = (parsed as { version?: unknown }).version;
  exact(parsed, version === 1 ? ['format', 'version', 'sources', 'indices', 'checkpoint'] : ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint']);
  if (parsed.format !== 'hired-guns-training-session' || (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5) || typeof parsed.checkpoint !== 'string') throw new Error('Unsupported Training43 session format/version.');
  exact(parsed.sources, ['map', 'roster', 'items']);
  const expected = structuredClone(parsed.sources);
  const map = trainingLevel(level);
  const commands = version === 1 ? [] : version === 2 ? equipCommands(parsed.commands).map(command => ({ kind: 'equip' as const, ...command })) : inventoryCommands(parsed.commands, version === 3, version === 5);
  const candidatePromise = createTrainingSession(map, sources, parsed.indices as number[], commands);
  const checkpointPromise = importCheckpoint(map, parsed.checkpoint);
  const [candidate, world] = await Promise.all([candidatePromise, checkpointPromise]);
  const actual = { map: TRAINING_43_SHA256, ...candidate.session.team.sources };
  for (const key of ['roster', 'items'] as const) {
    exact(expected[key], ['sha256', 'byteLength', 'layout', 'revision']);
    for (const field of ['sha256', 'byteLength', 'layout', 'revision'] as const) {
      if (expected[key][field] !== actual[key][field]) throw new Error('Training43 session source identity mismatch.');
    }
  }
  if (expected.map !== actual.map || world.physics.mode !== 'static') throw new Error('Training43 session map mismatch.');
  return { session: candidate.session, world };
}
