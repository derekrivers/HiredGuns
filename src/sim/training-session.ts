import { GROUND_FIXTURE, groundEnvelope, groundHistory, replayTrainingGround, type GroundEvent, type TrainingGround } from '../items/training-ground';
import type { GroundTransferCommand } from '../items/ground-transfer';
import type { MissionRules, PlayerCommand } from '../contracts';
import { bindVerifiedEncounterGun, type GunWeapon } from '../combat/weapon-transition';
import { resetTrainingEncounter, validateTrainingEncounter, type TrainingEncounter } from '../combat/training-encounter';
import type { LevelData, WorldState } from '../contracts';
import { importItems, type ItemCatalog } from '../import/items';
import { equipCommands, inventoryCommands, replayTrainingInventory, type TrainingInventory } from './training-inventory';
import { importCharacters } from '../import/characters';
import { initializeOriginalTeam, type OriginalTeam } from '../import/original-team';
import { exportCheckpoint, importCheckpoint } from './checkpoint';
import { TRAINING_43_SHA256 } from './mission-profile';
import { createWorld } from './world';
import { selectedFallLevel, type FallProfile } from './fall';

export const MAX_SESSION_BYTES = 24 * 1024;
export interface TrainingSources { roster: Uint8Array; items: Uint8Array }
export interface TrainingSession {
  readonly indices: readonly number[];
  readonly names: readonly string[];
  readonly team: OriginalTeam;
  readonly items: ItemCatalog;
  readonly inventory: TrainingInventory;
  readonly ground: TrainingGround | null;
  readonly encounterGun: GunWeapon;
  readonly encounter: TrainingEncounter | null;
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
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function trainingLevel(level: LevelData): LevelData {
  const snapshot = structuredClone(level);
  if (!selectedFallLevel(snapshot) && (snapshot.source.kind !== 'editor-map' || snapshot.source.sha256 !== TRAINING_43_SHA256)) throw new Error('Open the verified local Training43 map first.');
  return snapshot;
}
/** This is a profile adapter; authority comes from the session's rehashed sources. */
export function selectedFallProfile(session: Pick<TrainingSession, 'team' | 'inventory'>): FallProfile {
  return session.team.actors.map((actor, i) => ({physique:actor.stats.physique, agility:actor.stats.agility,
    weight:session.inventory.actors[i]!.weight.totalWeight, fitness:65535, dead:false, fallDamage:0})) as FallProfile;
}
/** Snapshot sources before any hashing. OriginalTeam rehashes/reparses both exact OCS inputs. */
export async function createTrainingSession(level: LevelData, sources: TrainingSources, indices: readonly number[], commands: unknown = []): Promise<TrainingCandidate> {
  const replay = inventoryCommands(commands);
  const map = trainingLevel(level);
  const roster = new Uint8Array(sources.roster), items = new Uint8Array(sources.items);
  const teamPromise = initializeOriginalTeam(roster, items, indices);
  const [team, catalog, table, encounterGun] = await Promise.all([teamPromise, importCharacters(roster), importItems(items), bindVerifiedEncounterGun(items)]);
  const session = freeze({ ground: null, encounterGun, encounter: null, indices: team.actors.map(a => a.canonicalIndex),
    names: team.actors.map(a => catalog.records[a.canonicalIndex]!.text.gameName || catalog.records[a.canonicalIndex]!.text.selectionName || `Character ${a.canonicalIndex + 1}`), team, items: table, inventory: replayTrainingInventory(team, table, replay) });
  const profile = selectedFallLevel(map) ? selectedFallProfile(session) : undefined;
  const world = createWorld(map, undefined, undefined, profile);
  // Existing checkpoint validation also validates the complete map and starting world.
  const checkpoint = await exportCheckpoint(map, world, profile);
  sessionJSON(session, checkpoint, selectedFallLevel(map));
  return { session, world };
}

/** Reverify and validate a complete prospective save before exposing a command candidate. */
async function changeInventory(level: LevelData, sources: TrainingSources, session: TrainingSession, actor: number, slot: number, paused: boolean, kind: 'equip' | 'return' | 'exchange', currentWorld?: WorldState): Promise<TrainingCandidate> {
  if (!paused) throw new Error('Pause before changing equipment.');
  if (session.ground) {
    if (!currentWorld) throw new Error('Ground inventory requires the current world.');
    return changeGroundHistory(level, sources, session, currentWorld, { kind, actor, slot });
  }
  const map = trainingLevel(level), world = currentWorld ? structuredClone(currentWorld) : undefined;
  const candidate = await createTrainingSession(map, sources, session.indices, [...session.inventory.commands, { kind, actor, slot }]);
  const nextSession = freeze({ ...candidate.session, encounter: session.encounter === null ? null : validateTrainingEncounter(session.encounter, candidate.session.encounterGun, candidate.session.indices) });
  if (world) {
    sessionJSON(nextSession, await exportCheckpoint(map, world, selectedFallLevel(map) ? selectedFallProfile(nextSession) : undefined), selectedFallLevel(map));
    return { session: nextSession, world };
  }
  return { ...candidate, session: nextSession };
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

function sessionJSON(session: TrainingSession, checkpoint: string, selectedFall = false): string {
  const json = JSON.stringify({ format: 'hired-guns-training-session', version: session.ground ? 8 : selectedFall ? 7 : session.encounter === null ? 5 : 6,
    ...(selectedFall ? { scenario: 'selected-dry-fall-v1' } : {}),
    ...(session.encounter === null ? {} : { encounter: validateTrainingEncounter(session.encounter, session.encounterGun, session.indices) }),
    sources: { map: selectedFall ? 'authored:selected-dry-fall-v1' : TRAINING_43_SHA256, ...session.team.sources },
    indices: session.indices, ...(session.ground ? { ground: { version: 1, fixture: session.ground.fixture, rules: session.ground.rules, history: session.ground.history } } : { commands: session.inventory.commands }), checkpoint });
  if (new TextEncoder().encode(json).length >= MAX_SESSION_BYTES) throw new Error('Training43 session is too large.');
  return json;
}

/** Retry and rule restart reset the overlay to the same immutable initialization. */
export function resetTrainingInventory(session: TrainingSession, level?: LevelData, rules?: MissionRules): TrainingSession {
  const baseline = session.ground ? replayTrainingGround(level ?? (() => { throw new Error('Ground retry requires its level.'); })(), session.team, session.items, { version: 1, fixture: GROUND_FIXTURE, rules: rules ?? session.ground.rules, history: [] }) : null;
  return freeze({ ...session, ground: baseline?.ground ?? null, inventory: baseline?.inventory ?? replayTrainingInventory(session.team, session.items, []),
    encounter: session.encounter === null ? null : resetTrainingEncounter(session.encounter, session.encounterGun, session.indices) });
}

/** Save bounded replay commands, never unchecked arbitrary inventory storage. */
export async function exportTrainingSession(level: LevelData, world: WorldState, session: TrainingSession, sources: TrainingSources): Promise<string> {
  const map = trainingLevel(level);
  const savedWorld = structuredClone(world), encounterState = structuredClone(session.encounter);
  const candidate = session.ground ? await rebuildGroundSession(map, sources, session.indices, { version: 1, fixture: session.ground.fixture, rules: session.ground.rules, history: session.ground.history }) : await createTrainingSession(map, sources, session.indices, session.inventory.commands);
  if (candidate.session.ground && canonical(candidate.world) !== canonical(savedWorld)) throw new Error('Ground history/world mismatch.');
  const checkpoint = await exportCheckpoint(map, savedWorld, selectedFallLevel(map) ? selectedFallProfile(candidate.session) : undefined);
  return sessionJSON(freeze({ ...candidate.session, encounter: encounterState === null ? null : validateTrainingEncounter(encounterState, candidate.session.encounterGun, candidate.session.indices) }), checkpoint, selectedFallLevel(map));
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
  const selected = version === 7, grounded = version === 8;
  const hasEncounter = (selected || grounded) && Object.hasOwn(parsed, 'encounter');
  exact(parsed, grounded ? ['format','version','sources','indices','ground','checkpoint', ...(hasEncounter ? ['encounter'] : [])] : selected ? ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint', 'scenario', ...(hasEncounter ? ['encounter'] : [])] : version === 6 ? ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint', 'encounter'] : version === 1 ? ['format', 'version', 'sources', 'indices', 'checkpoint'] : ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint']);
  if (parsed.format !== 'hired-guns-training-session' || ![1,2,3,4,5,6,7,8].includes(version as number) || typeof parsed.checkpoint !== 'string') throw new Error('Unsupported Training43 session format/version.');
  exact(parsed.sources, ['map', 'roster', 'items']);
  const expected = structuredClone(parsed.sources);
  const map = trainingLevel(level);
  if (selected !== selectedFallLevel(map) || (selected && parsed.scenario !== 'selected-dry-fall-v1')) throw new Error('Session scenario mismatch. Open the matching practice mode first.');
  const commands = grounded || version === 1 ? [] : version === 2 ? equipCommands(parsed.commands).map(command => ({ kind: 'equip' as const, ...command })) : inventoryCommands(parsed.commands, version === 3, version === 5 || version === 6 || selected);
  const candidate = grounded ? await rebuildGroundSession(map, sources, parsed.indices as number[], parsed.ground) : await createTrainingSession(map, sources, parsed.indices as number[], commands);
  const world = await importCheckpoint(map, parsed.checkpoint, selected ? selectedFallProfile(candidate.session) : undefined);
  if (grounded && canonical(candidate.world) !== canonical(world)) throw new Error('Ground history/world mismatch.');
  const actual = { map: selected ? 'authored:selected-dry-fall-v1' : TRAINING_43_SHA256, ...candidate.session.team.sources };
  for (const key of ['roster', 'items'] as const) {
    exact(expected[key], ['sha256', 'byteLength', 'layout', 'revision']);
    for (const field of ['sha256', 'byteLength', 'layout', 'revision'] as const) {
      if (expected[key][field] !== actual[key][field]) throw new Error('Training43 session source identity mismatch.');
    }
  }
  if (expected.map !== actual.map) throw new Error('Training43 session map mismatch.');
  const encounter = version === 6 || hasEncounter ? validateTrainingEncounter(parsed.encounter, candidate.session.encounterGun, candidate.session.indices) : null;
  return { session: freeze({ ...candidate.session, encounter }), world };
}

/** Fresh raw verification precedes every authored replay. Nothing serialized owns items. */
async function rebuildGroundSession(level: LevelData, sources: TrainingSources, indices: readonly number[], input: unknown): Promise<TrainingCandidate> {
  const envelope = groundEnvelope(input), map = trainingLevel(level);
  if (selectedFallLevel(map)) throw new Error('Ground actions require static Training43; selected dry-fall is unavailable.');
  const baseline = await createTrainingSession(map, sources, indices);
  const result = replayTrainingGround(map, baseline.session.team, baseline.session.items, envelope);
  const session = freeze({ ...baseline.session, inventory: result.inventory, ground: result.ground });
  sessionJSON(session, await exportCheckpoint(map, result.world));
  return { session, world: result.world };
}
export async function activateTrainingGround(level: LevelData, sources: TrainingSources, session: TrainingSession, world: WorldState, paused: boolean): Promise<TrainingCandidate> {
  if (!paused || world.tick !== 0 || session.inventory.commands.length || session.ground) throw new Error('Retry or Apply a new team, then pause at tick zero to author the cache.');
  const rules: MissionRules = structuredClone(world.mission.rules), encounter = structuredClone(session.encounter);
  const candidate = await rebuildGroundSession(level, sources, session.indices, { version: 1, fixture: GROUND_FIXTURE, rules, history: [] });
  return { ...candidate, session: freeze({ ...candidate.session, encounter: encounter === null ? null : validateTrainingEncounter(encounter, candidate.session.encounterGun, candidate.session.indices) }) };
}
async function changeGroundHistory(level: LevelData, sources: TrainingSources, session: TrainingSession, world: WorldState, event: GroundEvent): Promise<TrainingCandidate> {
  if (!session.ground) throw new Error('Author the nearby ground cache first.');
  const map = trainingLevel(level), operation = groundHistory([event])[0]!;
  const saved = structuredClone(world), encounter = structuredClone(session.encounter);
  const envelope = { version: 1, fixture: session.ground.fixture, rules: session.ground.rules, history: groundHistory(session.ground.history) };
  const prior = await rebuildGroundSession(map, sources, session.indices, envelope);
  if (canonical(prior.world) !== canonical(saved)) throw new Error('Ground history/world mismatch.');
  const result = replayTrainingGround(map, prior.session.team, prior.session.items, { ...envelope, history: [...envelope.history, operation] });
  const next = freeze({ ...prior.session, ground: result.ground, inventory: result.inventory, encounter: encounter === null ? null : validateTrainingEncounter(encounter, prior.session.encounterGun, prior.session.indices) });
  sessionJSON(next, await exportCheckpoint(map, saved));
  return { session: next, world: saved };
}
export async function transferTrainingGround(level: LevelData, sources: TrainingSources, session: TrainingSession, world: WorldState, actor: number, groundId: string, slot: number, transfer: GroundTransferCommand, paused: boolean): Promise<TrainingCandidate> {
  if (!paused) throw new Error('Pause before picking up or dropping items.');
  return changeGroundHistory(level, sources, session, world, { kind: 'ground', actor, groundId, slot, transfer });
}
/** Called in the same synchronous commit as the corresponding successful world tick. */
export function recordTrainingGroundStep(session: TrainingSession, previous: WorldState, next: WorldState, commands: PlayerCommand[]): TrainingSession {
  if (!session.ground || next.tick === previous.tick) return session;
  const history = structuredClone(session.ground.history), last = history.at(-1);
  if (!commands.length && last?.kind === 'wait') last.ticks++;
  else history.push(commands.length ? { kind: 'step', commands: structuredClone(commands) } : { kind: 'wait', ticks: 1 });
  groundHistory(history);
  if (next.tick > 45000) throw new Error('Ground replay tick budget exhausted. Retry or restore.');
  const candidate = freeze({ ...session, ground: { ...session.ground, history } });
  // Hash content is fixed-width; reserve the exact checkpoint envelope size before committing.
  sessionJSON(candidate, JSON.stringify({ format: 'hired-guns-save', version: 3, levelHash: '0'.repeat(64), world: next }));
  return candidate;
}
