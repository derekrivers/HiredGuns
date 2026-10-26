import type { FallActor, LevelData, Mercenary, MissionMode, MissionState, PhysicsState, SaveEnvelope, Spawn, WorldState } from '../contracts';
import { MAX_WORLD_TICK, obstruction } from './world';
import { besideExitBlock, initialMission, sourceClockAtTick, validatedMissionRules } from './mission';
import { dryFallEnabled, fallCounterAtTick, fallObstruction, initialPhysics } from './fall';

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

function missionSnapshot(level: LevelData, value: unknown, tick: number): MissionState {
  const mission = object(value,['rules','outcome','exited','clock','winner'],'mission');
  const rawRules = object(mission.rules,['mode','timeLimit'],'mission.rules');
  if (!['navigation','cooperative-extraction','first-exit'].includes(String(rawRules.mode))) throw new Error('Unsupported mission mode');
  const rules = validatedMissionRules(level,{mode:rawRules.mode as MissionMode,timeLimit:rawRules.timeLimit === null ? null : integer(rawRules.timeLimit,1,99,'mission.timeLimit')});
  if (mission.outcome !== 'active' && mission.outcome !== 'complete' && mission.outcome !== 'failed') throw new Error('Invalid mission outcome');
  const exited = array(mission.exited,4,'mission.exited').map(v => { if (typeof v !== 'boolean') throw new Error('Mission exited flags must be boolean'); return v; }) as MissionState['exited'];
  let clock: MissionState['clock'] = null;
  if (rules.mode === 'navigation') {
    if (mission.clock !== null || mission.outcome !== 'active' || mission.winner !== null || exited.some(Boolean)) throw new Error('Navigation mission must have zeroed exit state');
  } else {
    const expectedClock = sourceClockAtTick(rules.timeLimit!,tick);
    const savedClock = object(mission.clock,['tens','units','subticks'],'mission.clock');
    if (savedClock.tens !== expectedClock.tens || savedClock.units !== expectedClock.units || savedClock.subticks !== expectedClock.subticks) throw new Error('Mission clock does not match tick');
    clock = expectedClock;
    if (tick === 0 && exited.some(Boolean)) throw new Error('Mission cannot exit before its first tick');
    const expired = clock.tens === 0 && clock.units === 0;
    const completed = rules.mode === 'first-exit' ? exited.some(Boolean) : exited.every(Boolean);
    if (expired ? mission.outcome !== 'failed' : mission.outcome !== (completed ? 'complete' : 'active')) throw new Error('Mission outcome inconsistent with clock/exits');
    const winner = !expired && completed && rules.mode === 'first-exit' ? exited.findIndex(Boolean) : null;
    if (mission.winner !== winner) throw new Error('Mission winner inconsistent with outcome/exits');
  }
  return {rules,outcome:mission.outcome,exited,clock,winner:mission.winner as number | null};
}

function physicsSnapshot(level: LevelData, value: unknown, tick: number): PhysicsState {
  const expected = initialPhysics(level);
  if (expected.mode === 'static') {
    if (object(value,['mode'],'physics').mode !== 'static') throw new Error('Physics profile does not match this level');
    return {mode:'static'};
  }
  const physics = object(value,['mode','profileId','fallCounter','actors'],'physics');
  if (physics.mode !== 'dry-fall' || physics.profileId !== expected.profileId) throw new Error('Physics profile does not match this level');
  if (physics.fallCounter !== fallCounterAtTick(tick)) throw new Error('Fall counter does not match tick');
  const actors = array(physics.actors,4,'physics.actors').map((value,id) => {
    const actor = object(value,['physique','agility','weight','fitness','dead','fallDamage'],`physics.actor${id}`);
    const profile = expected.actors[id]!;
    for (const field of ['physique','agility','weight'] as const) if (actor[field] !== profile[field]) throw new Error('Character stats do not match the synthetic profile');
    const fitness = integer(actor.fitness,0,65535,'fitness');
    if (typeof actor.dead !== 'boolean' || (actor.dead ? fitness !== 0 : fitness < 655)) throw new Error('Fitness and death state disagree');
    const fallDamage = integer(actor.fallDamage,0,0x1000000,'fallDamage');
    const validDamage = fallDamage === 0 || fallDamage === 0x1000000 || Array.from({length:12},(_,i) => 6400 * 2 ** i).includes(fallDamage);
    if (!validDamage || (actor.dead && fallDamage !== 0) || (tick < 7 && (fallDamage !== 0 || actor.dead))) throw new Error('Invalid accumulated fall damage');
    return {...profile,fitness,dead:actor.dead,fallDamage} as FallActor;
  }) as Extract<PhysicsState,{mode:'dry-fall'}>['actors'];
  return {mode:'dry-fall',profileId:expected.profileId,fallCounter:fallCounterAtTick(tick),actors};
}

function worldSnapshot(level: LevelData, value: unknown): WorldState {
  const world = object(value, ['schemaVersion','levelId','tick','rng','mercenaries','mission','physics'], 'world');
  if (world.schemaVersion !== 3) throw new Error('Unsupported world schemaVersion');
  if (world.levelId !== level.id) throw new Error('Checkpoint world/level mismatch');
  const tick = integer(world.tick,0,MAX_WORLD_TICK-1,'world.tick');
  const mission = missionSnapshot(level,world.mission,tick);
  const physics = physicsSnapshot(level,world.physics,tick);
  const occupied = new Set<string>();
  const mercenaries = array(world.mercenaries, 4, 'world.mercenaries').map((value, id) => {
    const mercenary = object(value, ['id','x','y','z','facing'], `mercenary${id}`);
    if (mercenary.id !== id) throw new Error('Mercenary IDs must be ordered 0,1,2,3');
    const p = position({ x: mercenary.x, y: mercenary.y, z: mercenary.z, facing: mercenary.facing }, level, true, `mercenary${id}`);
    const dead = physics.mode === 'dry-fall' && physics.actors[id]!.dead;
    const reason = physics.mode === 'dry-fall' && !dead ? fallObstruction(level,p) : obstruction(level, p);
    if (reason) throw new Error(`Mercenary ${id} obstructed: ${reason}`);
    const cell = `${p.x},${p.y},${p.z}`;
    if (mission.exited[id]) {
      if (!besideExitBlock(level,p)) throw new Error(`Exited mercenary ${id} must remain beside an exit block`);
    } else if (!dead) {
      if (occupied.has(cell)) throw new Error('Checkpoint mercenaries overlap');
      occupied.add(cell);
    }
    return { id, ...p } as Mercenary;
  }) as WorldState['mercenaries'];
  return { schemaVersion: 3, levelId: level.id, tick, rng: integer(world.rng, 0, 0xffffffff, 'world.rng'), mercenaries, mission, physics };
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

/** Complete current mission/physics state in v3; map words and artwork stay outside saves. */
export async function exportCheckpoint(level: LevelData, world: WorldState): Promise<string> {
  const snapshot = levelSnapshot(level);
  const state = worldSnapshot(snapshot, world);
  const envelope: SaveEnvelope = { format: 'hired-guns-save', version: 3, levelHash: await fingerprint(snapshot), world: state };
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
  if (envelope.format !== 'hired-guns-save' || ![1,2,3].includes(envelope.version as number)) throw new Error('Unsupported checkpoint format/version');
  if (typeof envelope.levelHash !== 'string' || !/^[0-9a-f]{64}$/.test(envelope.levelHash)) throw new Error('Invalid checkpoint levelHash');
  const snapshot = levelSnapshot(level);
  let savedWorld = envelope.world;
  if (envelope.version === 1 || envelope.version === 2) {
    if (dryFallEnabled(snapshot)) throw new Error('Legacy checkpoints cannot supply dry-fall history');
    const legacy = object(savedWorld,envelope.version === 1 ? ['schemaVersion','levelId','tick','rng','mercenaries'] : ['schemaVersion','levelId','tick','rng','mercenaries','mission'],'legacy world');
    if (legacy.schemaVersion !== envelope.version) throw new Error('Unsupported legacy world schemaVersion');
    savedWorld = {...legacy,schemaVersion:3,physics:{mode:'static'},mission:envelope.version === 1 ? initialMission(snapshot,{mode:'navigation',timeLimit:null}) : legacy.mission};
  }
  const world = worldSnapshot(snapshot, savedWorld);
  if (envelope.levelHash !== await fingerprint(snapshot)) throw new Error('Checkpoint level content mismatch');
  return world;
}
