import { CONSUMABLE_FIXTURE, serializeConsumables as consumableJSON, replayConsumables, consumableHistory, appendConsumableEvent, equalConsumableState, type TrainingConsumables, type ConsumableEvent } from './training-consumables';
import { PRESSURE_PAD_FIXTURE, pressurePadLevel } from '../world/training-pressure-pad';
import { MOVING_DOOR_FIXTURE, type DoorAction } from '../world/training-moving-door';
import { movingDoorLevel, createMovingDoorLevel, createPressurePadLevel } from '../world/training-gate';
import { effectivePatrolLevel, PATROL_FIXTURE, initialTrainingPatrol, appendPatrolEvent, replayTrainingPatrol, stepTrainingPatrol, type TrainingPatrol, type PatrolEvent } from '../world/training-patrol';
import { PATROL_MISSION_FIXTURE, patrolMissionLevel, createPatrolMissionLevel, appendGateEvent, createTrainingGateLevel, effectiveGateLevel, gateEnvelope, gateLevel, initialTrainingGate, replayTrainingGate, stepTrainingGate, type GateEvent, type TrainingGate } from '../world/training-gate';
import { GROUND_FIXTURE, groundEnvelope, groundHistory, replayTrainingGround, type GroundEvent, type TrainingGround } from '../items/training-ground';
import type { GroundTransferCommand } from '../items/ground-transfer';
import type { MissionRules, PlayerCommand } from '../contracts';
import { bindVerifiedEncounterGun, type GunWeapon } from '../combat/weapon-transition';
import { createTrainingEncounter, fireTrainingEncounter, targetTrainingEncounter, resetTrainingEncounter, validateTrainingEncounter, type TrainingEncounter } from '../combat/training-encounter';
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
  readonly consumables?: TrainingConsumables;
  readonly indices: readonly number[];
  readonly names: readonly string[];
  readonly team: OriginalTeam;
  readonly items: ItemCatalog;
  readonly inventory: TrainingInventory;
  readonly ground: TrainingGround | null;
  readonly gate: TrainingGate | null;
  readonly patrol?: TrainingPatrol | null;
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
  if (gateLevel(snapshot)) {
    if (canonical(snapshot) !== canonical(pressurePadLevel(snapshot) ? createPressurePadLevel() : movingDoorLevel(snapshot) ? createMovingDoorLevel() : patrolMissionLevel(snapshot) ? createPatrolMissionLevel() : createTrainingGateLevel())) throw new Error('Gate fixture geometry mismatch.');
    return snapshot;
  }
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
  const session = freeze({ patrol: null, gate: gateLevel(map) ? {...initialTrainingGate(movingDoorLevel(map),pressurePadLevel(map)),history:replay} : null, ground: null, encounterGun, encounter: null, indices: team.actors.map(a => a.canonicalIndex),
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
  if (session.consumables) {
    if (!currentWorld) throw new Error('Consumable inventory requires current world.');
    return changeConsumableSession(level,sources,session,currentWorld,{kind,actor,slot},paused);
  }
  if (session.patrol) {
    if (patrolMissionLevel(level) && currentWorld?.mission.exited[actor]) throw new Error('Extracted inventory actor is retired.');
    if (!currentWorld) throw new Error('Patrol inventory requires current world.');
    const {candidate:prior,map,raw} = await verifyPatrolSession(level,sources,session,currentWorld);
    return rebuildPatrolSession(map,raw,prior.session.indices,appendPatrolEvent(prior.session.patrol!,{kind,actor,slot}));
  }
  if (session.gate) {
    if (!currentWorld) throw new Error('Gate inventory requires its current world.');
    const saved = structuredClone(currentWorld), gate = structuredClone(session.gate), inventory = structuredClone(session.inventory), encounter = structuredClone(session.encounter);
    const raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, map = trainingLevel(level), indices = [...session.indices];
    const prior = await rebuildGateSession(map, raw, indices, gate);
    if (canonical(prior.world) !== canonical(saved) || canonical(prior.session.inventory) !== canonical(inventory)) throw new Error('Gate history/world mismatch.');
    const candidate = await rebuildGateSession(map, raw, indices, appendGateEvent(gate, {kind, actor, slot}));
    const next = freeze({...candidate.session, encounter: encounter === null ? null : validateTrainingEncounter(encounter, candidate.session.encounterGun, candidate.session.indices)});
    sessionJSON(next, await exportCheckpoint(effectiveGateLevel(map,next.gate),candidate.world));
    return {...candidate, session:next};
  }
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
  const json = JSON.stringify({ format: 'hired-guns-training-session', version: session.patrol?.fixture === PRESSURE_PAD_FIXTURE ? 13 : session.patrol?.fixture === MOVING_DOOR_FIXTURE ? 12 : session.patrol?.fixture === PATROL_MISSION_FIXTURE ? 11 : session.patrol ? 10 : session.gate ? 9 : session.ground ? 8 : selectedFall ? 7 : session.encounter === null ? 5 : 6,
    ...(session.patrol ? {scenario:session.patrol.fixture,gate:session.gate,patrol:session.patrol} : session.gate ? {scenario:'authored-static-gate-v1', gate:session.gate} : selectedFall ? { scenario: 'selected-dry-fall-v1' } : {}),
    ...(session.encounter === null ? {} : { encounter: validateTrainingEncounter(session.encounter, session.encounterGun, session.indices) }),
    sources: { map: session.patrol?.fixture === PRESSURE_PAD_FIXTURE ? `authored:${PRESSURE_PAD_FIXTURE}` : session.patrol?.fixture === MOVING_DOOR_FIXTURE ? `authored:${MOVING_DOOR_FIXTURE}` : session.patrol?.fixture === PATROL_MISSION_FIXTURE ? `authored:${PATROL_MISSION_FIXTURE}` : session.gate ? 'authored:authored-static-gate-v1' : selectedFall ? 'authored:selected-dry-fall-v1' : TRAINING_43_SHA256, ...session.team.sources },
    indices: session.indices, ...(session.ground ? { ground: { version: 1, fixture: session.ground.fixture, rules: session.ground.rules, history: session.ground.history } } : { commands: session.inventory.commands }), checkpoint });
  if (new TextEncoder().encode(json).length >= MAX_SESSION_BYTES) throw new Error('Training43 session is too large.');
  return json;
}

/** Retry and rule restart reset the overlay to the same immutable initialization. */
export function resetTrainingInventory(session: TrainingSession, level?: LevelData, rules?: MissionRules): TrainingSession {
  if (session.consumables) return freeze(replayConsumables(level!,{...session,inventory:replayTrainingInventory(session.team,session.items,[])},session.consumables.races,[]).session);
  const baseline = session.ground ? replayTrainingGround(level ?? (() => { throw new Error('Ground retry requires its level.'); })(), session.team, session.items, { version: 1, fixture: GROUND_FIXTURE, rules: rules ?? session.ground.rules, history: [] }) : null;
  return freeze({ ...session, patrol: session.patrol ? initialTrainingPatrol(session.patrol.fixture === PATROL_MISSION_FIXTURE,session.patrol.fixture === MOVING_DOOR_FIXTURE || session.patrol.fixture === PRESSURE_PAD_FIXTURE,session.patrol.fixture === PRESSURE_PAD_FIXTURE) : null, gate: session.gate ? initialTrainingGate(!!session.gate.moving,!!session.gate.pad) : null, ground: baseline?.ground ?? null, inventory: baseline?.inventory ?? replayTrainingInventory(session.team, session.items, []),
    encounter: session.patrol ? createTrainingEncounter(session.encounterGun,session.indices,0,'full') : session.encounter === null ? null : resetTrainingEncounter(session.encounter, session.encounterGun, session.indices) });
}

/** Save bounded replay commands, never unchecked arbitrary inventory storage. */
export async function exportTrainingSession(level: LevelData, world: WorldState, session: TrainingSession, sources: TrainingSources): Promise<string> {
  if (session.consumables) {
    const {candidate} = await verifyConsumableSession(level,sources,session,world);
    return consumableJSON(candidate);
  }
  if (session.patrol) {
    const {candidate,map} = await verifyPatrolSession(level,sources,session,world);
    return sessionJSON(candidate.session,await exportCheckpoint(effectivePatrolLevel(map,candidate.session.gate,candidate.session.encounter),candidate.world));
  }
  const map = trainingLevel(level);
  const savedWorld = structuredClone(world), encounterState = structuredClone(session.encounter), gateState = structuredClone(session.gate);
  const candidate = gateState ? await rebuildGateSession(map, sources, session.indices, gateState) : session.ground ? await rebuildGroundSession(map, sources, session.indices, { version: 1, fixture: session.ground.fixture, rules: session.ground.rules, history: session.ground.history }) : await createTrainingSession(map, sources, session.indices, session.inventory.commands);
  if ((candidate.session.ground || candidate.session.gate) && canonical(candidate.world) !== canonical(savedWorld)) throw new Error('Ground history/world mismatch.');
  const checkpoint = await exportCheckpoint(effectivePatrolLevel(map,candidate.session.gate,candidate.session.encounter), savedWorld, selectedFallLevel(map) ? selectedFallProfile(candidate.session) : undefined);
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
  if (version === 14) return importConsumableSession(level,sources,parsed);
  const selected = version === 7, grounded = version === 8, patrolling = version === 10 || version === 11 || version === 12 || version === 13, gated = version === 9 || patrolling;
  const hasEncounter = (selected || grounded || gated) && Object.hasOwn(parsed, 'encounter');
  exact(parsed, gated ? ['format','version','sources','indices','commands','checkpoint','scenario','gate', ...(patrolling ? ['patrol'] : []), ...(hasEncounter ? ['encounter'] : [])] : grounded ? ['format','version','sources','indices','ground','checkpoint', ...(hasEncounter ? ['encounter'] : [])] : selected ? ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint', 'scenario', ...(hasEncounter ? ['encounter'] : [])] : version === 6 ? ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint', 'encounter'] : version === 1 ? ['format', 'version', 'sources', 'indices', 'checkpoint'] : ['format', 'version', 'sources', 'indices', 'commands', 'checkpoint']);
  if (parsed.format !== 'hired-guns-training-session' || ![1,2,3,4,5,6,7,8,9,10,11,12,13].includes(version as number) || typeof parsed.checkpoint !== 'string') throw new Error('Unsupported Training43 session format/version.');
  exact(parsed.sources, ['map', 'roster', 'items']);
  const expected = structuredClone(parsed.sources);
  const supplied = trainingLevel(level);
  const map = patrolMissionLevel(supplied) && (version === 9 || version === 10) ? createTrainingGateLevel() : supplied;
  if ((version === 13) !== pressurePadLevel(map) || ((version === 12 || version === 13) !== movingDoorLevel(map)) || ((version === 11 || version === 12 || version === 13) !== patrolMissionLevel(map))) throw new Error('Session scenario mismatch. Open matching challenge first.');
  if (gated !== gateLevel(map) || (gated && parsed.scenario !== (version === 13 ? PRESSURE_PAD_FIXTURE : version === 12 ? MOVING_DOOR_FIXTURE : version === 11 ? PATROL_MISSION_FIXTURE : patrolling ? PATROL_FIXTURE : 'authored-static-gate-v1'))) throw new Error('Session scenario mismatch. Open matching practice first.');
  if (selected !== selectedFallLevel(map) || (selected && parsed.scenario !== 'selected-dry-fall-v1')) throw new Error('Session scenario mismatch. Open the matching practice mode first.');
  const commands = grounded || version === 1 ? [] : version === 2 ? equipCommands(parsed.commands).map(command => ({ kind: 'equip' as const, ...command })) : inventoryCommands(parsed.commands, version === 3, version === 5 || version === 6 || selected || gated);
  const candidate = patrolling ? await rebuildPatrolSession(map,sources,parsed.indices as number[],parsed.patrol) : gated ? await rebuildGateSession(map,sources,parsed.indices as number[],parsed.gate) : grounded ? await rebuildGroundSession(map, sources, parsed.indices as number[], parsed.ground) : await createTrainingSession(map, sources, parsed.indices as number[], commands);
  if (patrolling && (canonical(parsed.gate) !== canonical(candidate.session.gate) || canonical(parsed.encounter) !== canonical(candidate.session.encounter))) throw new Error('Patrol gate/encounter history mismatch.');
  if (gated && canonical(commands) !== canonical(candidate.session.inventory.commands)) throw new Error('Gate inventory history mismatch.');
  const world = await importCheckpoint(effectivePatrolLevel(map,candidate.session.gate,candidate.session.encounter), parsed.checkpoint, selected ? selectedFallProfile(candidate.session) : undefined);
  if ((grounded || gated) && canonical(candidate.world) !== canonical(world)) throw new Error('Ground history/world mismatch.');
  const actual = { map: version === 13 ? `authored:${PRESSURE_PAD_FIXTURE}` : version === 12 ? `authored:${MOVING_DOOR_FIXTURE}` : version === 11 ? `authored:${PATROL_MISSION_FIXTURE}` : gated ? 'authored:authored-static-gate-v1' : selected ? 'authored:selected-dry-fall-v1' : TRAINING_43_SHA256, ...candidate.session.team.sources };
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
  if (gateLevel(map)) throw new Error('Ground and gate require fresh Apply to Training43.');
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

/** Rebuild from canonical authored geometry, exact raw sources and chronological events. */
async function rebuildGateSession(level: LevelData, sources: TrainingSources, indices: readonly number[], input: unknown): Promise<TrainingCandidate> {
  const envelope = gateEnvelope(input), map = trainingLevel(level);
  if (!gateLevel(map)) throw new Error('Open authored gate practice first.');
  const baseline = await createTrainingSession(map,sources,indices);
  const result = replayTrainingGate(map,baseline.session.team,baseline.session.items,envelope.history);
  if (canonical(envelope) !== canonical(result.gate)) throw new Error('Gate words/history mismatch.');
  const session = freeze({...baseline.session, gate:result.gate, inventory:result.inventory});
  sessionJSON(session, await exportCheckpoint(effectivePatrolLevel(map,session.gate,session.encounter),result.world));
  return {session,world:result.world};
}
export async function createGateTrainingSession(sources: TrainingSources, session: TrainingSession, level: LevelData): Promise<TrainingCandidate> {
  if (session.ground || session.gate || selectedFallLevel(level)) throw new Error('Gate practice requires a fresh Apply on Training43; ground and dry-fall stay separate.');
  trainingLevel(level);
  // Item commands before setup become the opening chronology. Never reuse past falls.
  const map = createTrainingGateLevel(), raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, current = structuredClone(session);
  const baseline = await createTrainingSession(map,raw,current.indices);
  const replay = replayTrainingGate(map,baseline.session.team,baseline.session.items,current.inventory.commands);
  const candidate = await rebuildGateSession(map,raw,current.indices,replay.gate);
  return {...candidate,session:freeze({...candidate.session,encounter:current.encounter === null ? null : validateTrainingEncounter(current.encounter,candidate.session.encounterGun,candidate.session.indices)})};
}
/** Tick, activation, collision and replay budget are prepared before one synchronous install. */
export function advanceGateTrainingSession(level: LevelData, session: TrainingSession, world: WorldState, commands: PlayerCommand[], actor: number | null, action: DoorAction = 16) {
  if (!session.gate) throw new Error('Author gate practice first.');
  if (session.patrol) return advancePatrolSession(level,session,world,commands,actor,action);
  const result = stepTrainingGate(level,world,session.gate,commands,actor);
  const event: GateEvent = actor !== null ? session.gate?.moving ? {kind:'door',actor,action,commands:structuredClone(commands)} : {kind:'activate',actor,commands:structuredClone(commands)} : commands.length ? {kind:'step',commands:structuredClone(commands)} : {kind:'wait',ticks:1};
  const next = freeze({...session,gate:appendGateEvent(result.gate,event)});
  sessionJSON(next,JSON.stringify({format:'hired-guns-save',version:3,levelHash:'0'.repeat(64),world:result.world}));
  return {...result,session:next};
}

/** V10 rebuilds every mutable receipt from canonical starts and chronological events. */
async function rebuildPatrolSession(level: LevelData, sources: TrainingSources, indices: readonly number[], input: unknown): Promise<TrainingCandidate> {
  const map = trainingLevel(level), raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, selected = [...indices], envelope = structuredClone(input);
  if (!gateLevel(map)) throw new Error('Patrol requires gate practice.');
  exact(input,['version','fixture','history','routeIndex','direction','counter','blocked']);
  if (input.version !== 1 || input.fixture !== (pressurePadLevel(map) ? PRESSURE_PAD_FIXTURE : movingDoorLevel(map) ? MOVING_DOOR_FIXTURE : patrolMissionLevel(map) ? PATROL_MISSION_FIXTURE : PATROL_FIXTURE)) throw new Error('Unknown patrol fixture.');
  const baseline = await createTrainingSession(map,raw,selected);
  const result = replayTrainingPatrol(map,baseline.session.team,baseline.session.items,baseline.session.encounterGun,(envelope as TrainingPatrol).history);
  if (canonical(envelope) !== canonical(result.patrol)) throw new Error('Patrol position/counter/history mismatch.');
  const session = freeze({...baseline.session,gate:result.gate,patrol:result.patrol,encounter:result.encounter,inventory:result.inventory});
  sessionJSON(session,await exportCheckpoint(effectivePatrolLevel(map,session.gate,session.encounter),result.world));
  return {session,world:result.world};
}
async function verifyPatrolSession(level: LevelData, sources: TrainingSources, session: TrainingSession, world: WorldState) {
  // Own all inputs before hashing; callers reuse these snapshots through the final save/replay.
  const saved = structuredClone({session,world}), raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, map = trainingLevel(level);
  const candidate = await rebuildPatrolSession(map,raw,saved.session.indices,saved.session.patrol);
  if (canonical(candidate) !== canonical(saved)) throw new Error('Patrol world/session history mismatch.');
  return {candidate,map,raw};
}
/** Explicit setup resets gate/world/inventory/gun to one canonical authored baseline. */
export async function createPatrolTrainingSession(level: LevelData, sources: TrainingSources, session: TrainingSession, world: WorldState, paused: boolean): Promise<TrainingCandidate> {
  if (!paused || !session.gate || session.patrol || world.tick !== 0 || session.gate.history.length) throw new Error('Retry gate practice, pause at tick zero, then add patrol.');
  return rebuildPatrolSession(level,sources,session.indices,initialTrainingPatrol());
}
function patrolBudget(level: LevelData, session: TrainingSession, world: WorldState) {
  const checkpoint = JSON.stringify({format:'hired-guns-save',version:3,levelHash:'0'.repeat(64),world});
  if (new TextEncoder().encode(checkpoint).length >= 16*1024) throw new Error('Patrol checkpoint budget exhausted.');
  sessionJSON(session,checkpoint);
  // Geometry is checked during setup/recovery; synchronous ticks never rehash private inputs.
  if (!gateLevel(level)) throw new Error('Patrol scenario mismatch.');
}
function advancePatrolSession(level: LevelData, session: TrainingSession, world: WorldState, commands: PlayerCommand[], actor: number | null, action: DoorAction = 16) {
  const result = stepTrainingPatrol(level,world,session.gate!,session.patrol!,session.encounter!,commands,actor,undefined,action);
  if (result.world.tick === world.tick) return {...result,session};
  const event: GateEvent = actor !== null ? session.gate?.moving ? {kind:'door',actor,action,commands:structuredClone(commands)} : {kind:'activate',actor,commands:structuredClone(commands)} : commands.length ? {kind:'step',commands:structuredClone(commands)} : {kind:'wait',ticks:1};
  const next = freeze({...session,gate:appendGateEvent(result.gate,event),patrol:appendPatrolEvent(result.patrol,event),encounter:result.encounter});
  patrolBudget(level,next,result.world);
  return {...result,session:next};
}
export function commandPatrolEncounter(level: LevelData, session: TrainingSession, world: WorldState, kind: 'fire' | 'target', paused: boolean): TrainingSession {
  if (!session.patrol || !session.encounter || world.mission.outcome !== 'active' || (kind === 'fire' && paused)) throw new Error('Patrol firing unavailable.');
  if (patrolMissionLevel(level) && world.mission.exited[session.encounter.actor]) throw new Error('Extracted gun actor is retired.');
  const event: PatrolEvent = {kind};
  const encounter = kind === 'fire' ? fireTrainingEncounter(session.encounter,session.encounterGun) : targetTrainingEncounter(session.encounter);
  const next = freeze({...session,encounter,patrol:appendPatrolEvent(session.patrol,event)});
  patrolBudget(level,next,world);
  return next;
}

/** Opt-in challenge resets the same authored arena and verified team atomically. */
export async function createPatrolMissionSession(sources: TrainingSources, session: TrainingSession): Promise<TrainingCandidate> {
  const raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, indices = [...session.indices];
  return rebuildPatrolSession(createPatrolMissionLevel(),raw,indices,initialTrainingPatrol(true));
}

/** One-click canonical v12 arena; raw sources and indices owned before hashing. */
export async function createMovingDoorSession(sources: TrainingSources, session: TrainingSession): Promise<TrainingCandidate> {
  const raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, indices = [...session.indices];
  return rebuildPatrolSession(createMovingDoorLevel(),raw,indices,initialTrainingPatrol(true,true));
}

/** Canonical opt-in v13; caller inputs detached before hashing. */
export async function createPressurePadSession(sources: TrainingSources, session: TrainingSession): Promise<TrainingCandidate> {
  const raw = {roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, indices = [...session.indices];
  return rebuildPatrolSession(createPressurePadLevel(),raw,indices,initialTrainingPatrol(true,true,true));
}

/** New wrapper; legacy v1-v13 command validators and checkpoint semantics stay intact. */
async function rebuildConsumableSession(level:LevelData,sources:TrainingSources,indices:readonly number[],input:unknown):Promise<TrainingCandidate> {
 const map=trainingLevel(level),raw={roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)},chosen=[...indices],history=consumableHistory(input);
 if(!selectedFallLevel(map))throw Error('Consumable scenario mismatch. Open selected-team dry-fall practice.');
 const [baseline,catalog]=await Promise.all([createTrainingSession(map,raw,chosen),importCharacters(raw.roster)]);
 const candidate=replayConsumables(map,baseline.session,chosen.map(i=>catalog.records[i]!.race),history);
 consumableJSON(candidate);return {world:candidate.world,session:freeze(candidate.session)};
}
async function verifyConsumableSession(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState){
 const map=trainingLevel(level),raw={roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)},saved=structuredClone({session,world});
 const candidate=await rebuildConsumableSession(map,raw,saved.session.indices,saved.session.consumables!.history);
 if(!equalConsumableState(candidate,saved))throw Error('Consumable history/world/session mismatch.');
 return {candidate,map,raw};
}
export async function createConsumableSession(level:LevelData,sources:TrainingSources,session:TrainingSession):Promise<TrainingCandidate>{
 const map=trainingLevel(level),raw={roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)},saved=structuredClone(session);
 if(!selectedFallLevel(map)||saved.ground||saved.gate||saved.consumables||saved.inventory.commands.length)throw Error('Apply a fresh team and open selected dry-fall practice before the consumable extension.');
 return rebuildConsumableSession(map,raw,saved.indices,[]);
}
export async function changeConsumableSession(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,event:ConsumableEvent,paused:boolean):Promise<TrainingCandidate>{
 if(!paused)throw Error('Pause before using or changing consumables.');
 const next=structuredClone(event);
 const {candidate,map,raw}=await verifyConsumableSession(level,sources,session,world);
 return rebuildConsumableSession(map,raw,candidate.session.indices,appendConsumableEvent(candidate.session.consumables!,next));
}
async function importConsumableSession(level:LevelData,sources:TrainingSources,input:unknown):Promise<TrainingCandidate>{
 exact(input,['format','version','scenario','sources','indices','history','checkpoint']);
 const parsed=structuredClone(input),map=trainingLevel(level),raw={roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)};
 if(parsed.format!=='hired-guns-training-session'||parsed.scenario!==CONSUMABLE_FIXTURE||!selectedFallLevel(map)||typeof parsed.checkpoint!=='string'||new TextEncoder().encode(parsed.checkpoint).length>=16*1024)throw Error('Consumable scenario/checkpoint mismatch.');
 const stored:unknown=JSON.parse(parsed.checkpoint);exact(stored,['world']);
 const candidate=await rebuildConsumableSession(map,raw,parsed.indices as number[],parsed.history);
 if(!equalConsumableState(parsed.sources,{map:`authored:${CONSUMABLE_FIXTURE}`,...candidate.session.team.sources})||!equalConsumableState(stored.world,candidate.world))throw Error('Consumable source/history/world mismatch.');
 return candidate;
}
