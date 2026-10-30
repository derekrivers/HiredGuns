import { PRESSURE_PAD_FIXTURE, PAD_INDEX, pressurePadLevel, transitionPressurePad, type TrainingPressurePad } from './training-pressure-pad';
import { advanceMovingDoor, initialMovingDoor, MOVING_DOOR_FIXTURE, type DoorAction, type TrainingMovingDoor } from './training-moving-door';
import { cellIndex, inBounds, type LevelData, type PlayerCommand, type WorldState } from '../contracts';
import { groundHistory, MAX_GROUND_TICKS } from '../items/training-ground';
import type { ItemCatalog } from '../import/items';
import type { OriginalTeam } from '../import/original-team';
import { replayTrainingInventory, type InventoryCommand } from '../sim/training-inventory';
import { createWorld, DIRECTIONS, stepWorld } from '../sim/world';
import { transitionButtonBlock, type StaticBlockingOverlay } from './button-door-transition';

export const PATROL_MISSION_FIXTURE = 'authored-patrol-extraction-v1';
export const PATROL_EXIT = Object.freeze({x:8,y:5,z:1});
export const movingDoorLevel = (level: LevelData) => level.id === MOVING_DOOR_FIXTURE || pressurePadLevel(level);
export const patrolMissionLevel = (level: LevelData) => level.id === PATROL_MISSION_FIXTURE || movingDoorLevel(level);
export const GATE_FIXTURE = 'authored-static-gate-v1';
export const MAX_GATE_HISTORY = 128;
export const GATE_PANEL = { x: 5, y: 4, z: 1 };
export const GATE_TARGET = { x: 5, y: 5, z: 1 };
const index = (p: typeof GATE_PANEL) => (p.z * 23 + p.y) * 23 + p.x;
const button = { index: 0, fields: { used: 0, actionIn: 4, actionOut: 5, dataIn: 27936 + 4 * index(GATE_TARGET), dataOut: 27936 + 4 * index(GATE_TARGET) } };
export type GateEvent = { kind: 'step'; commands: PlayerCommand[] } | { kind: 'wait'; ticks: number } |
  InventoryCommand | { kind: 'activate'; actor: number; commands: PlayerCommand[] } | {kind:'door'; actor:number; action:DoorAction; commands:PlayerCommand[]};
export interface TrainingGate {
  version: 1; fixture: typeof GATE_FIXTURE; history: GateEvent[]; moving?: TrainingMovingDoor; pad?: TrainingPressurePad;
  panelWord: number; overlay: StaticBlockingOverlay;
}
const initialWords = () => ({ panelWord: 0x8008004b, overlay: { targetIndex: index(GATE_TARGET), word: 0x80000043, discoveryWord: 0x80000000, nextPlaneDiscoveryWord: 1 } });

/** Entirely authored arena. No imported Training43 cells or machinery are rewritten. */
export function createTrainingGateLevel(): LevelData {
  const layers: LevelData['layers'] = [Array<number>(23 * 23 * 20).fill(66), Array<number>(23 * 23 * 20).fill(0), Array<number>(23 * 23 * 20).fill(0)];
  for (let y = 2; y <= 8; y++) for (let x = 2; x <= 8; x++) layers[0][index({ x, y, z: 1 })] = x === 5 ? 67 : 1;
  const words = initialWords();
  layers[0][index(GATE_PANEL)] = words.panelWord; layers[0][index(GATE_TARGET)] = words.overlay.word;
  layers[1][index(GATE_TARGET)] = words.overlay.discoveryWord; layers[1][index(GATE_TARGET) + 529] = words.overlay.nextPlaneDiscoveryWord;
  return { schemaVersion: 1, id: GATE_FIXTURE, name: 'Authored button / static gate practice', source: { kind: 'synthetic', sha256: null, revision: 'synthetic' },
    size: { width: 23, depth: 23, height: 20 }, layers,
    starts: [{ x: 4, y: 4, z: 1, facing: 1 }, { x: 6, y: 4, z: 1, facing: 3 }, { x: 3, y: 7, z: 1, facing: 0 }, { x: 7, y: 7, z: 1, facing: 0 }],
    exit: { x: 1, y: 1, z: 1 }, unsupportedMechanics: ['Authored static gate only; no original-map runtime parity, moving doors, pads, lifts, wet outcomes or item use.'] };
}
export function createPatrolMissionLevel(): LevelData {
  const level = createTrainingGateLevel();
  level.id = PATROL_MISSION_FIXTURE; level.name = 'Authored cooperative patrol extraction';
  level.exit = {...PATROL_EXIT}; level.layers[0][index(PATROL_EXIT)] = 67;
  return level;
}
export function createMovingDoorLevel(): LevelData {
  const level = createPatrolMissionLevel(); level.id = MOVING_DOOR_FIXTURE; level.name = 'Authored timed door / patrol extraction';
  level.layers[0][index(GATE_TARGET)] = initialMovingDoor().word;
  level.unsupportedMechanics = ['Authored tick timing and conservative occupancy interlock; no original runtime door selection, key eligibility, crush, audio or CPU timing parity.'];
  return level;
}
export function createPressurePadLevel(): LevelData {
  const level = createMovingDoorLevel(); level.id = PRESSURE_PAD_FIXTURE; level.name = 'Authored pressure pad / timed door extraction';
  level.layers[0][PAD_INDEX] = 0x80000201;
  level.layers[0][PAD_INDEX-529] = 0x81800042;
  return level;
}
export const gateLevel = (level: LevelData) => level.id === GATE_FIXTURE || patrolMissionLevel(level);
export function initialTrainingGate(moving = false, pad = false): TrainingGate { const gate: TrainingGate = { version: 1, fixture: GATE_FIXTURE, history: [], ...initialWords() }; if (moving) {gate.moving = initialMovingDoor(); gate.overlay = {...gate.overlay,word:gate.moving.word};} if (pad) gate.pad = {occupants:[],lastActions:[]}; return gate; }
export function effectiveGateLevel(base: LevelData, gate: TrainingGate | null): LevelData {
  if (!gate) return base;
  const level = structuredClone(base);
  level.layers[0][index(GATE_PANEL)] = gate.panelWord;
  level.layers[0][gate.overlay.targetIndex] = gate.overlay.word;
  level.layers[1][gate.overlay.targetIndex] = gate.overlay.discoveryWord;
  level.layers[1][gate.overlay.targetIndex + 529] = gate.overlay.nextPlaneDiscoveryWord;
  // Narrow authored standing projection: generic traversal keeps rejecting pads.
  // Raw floor/descriptor remain in canonical base and drive pad action selection.
  if (gate.pad) level.layers[0][PAD_INDEX] = (base.layers[0][PAD_INDEX]! & ~0x600) >>> 0;
  return level;
}
function fields(v: unknown, keys: string[]): asserts v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(v)) || Reflect.ownKeys(v).length !== keys.length || keys.some(k => {
    const d = Object.getOwnPropertyDescriptor(v, k); return !d?.enumerable || !Object.hasOwn(d, 'value');
  })) throw new Error('Malformed gate replay fields.');
}
export function gateHistory(value: unknown): GateEvent[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > MAX_GATE_HISTORY || Reflect.ownKeys(value).length !== value.length + 1 ||
      Array.from({ length: value.length }, (_, i) => Object.getOwnPropertyDescriptor(value, String(i))).some(d => !d?.enumerable || !Object.hasOwn(d, 'value'))) throw new Error('Gate history budget exceeded or malformed storage.');
  return Array.from(value, e => {
    const kind = Object.getOwnPropertyDescriptor(e ?? {}, 'kind');
    if (!kind || !Object.hasOwn(kind, 'value')) throw new Error('Malformed gate event.');
    if (kind.value !== 'activate' && kind.value !== 'door') {
      const event = groundHistory([e])[0]!;
      if (event.kind === 'ground') throw new Error('Ground and gate practice require separate fresh Apply.');
      return event;
    }
    fields(e, kind.value === 'door' ? ['kind','actor','action','commands'] : ['kind', 'actor', 'commands']);
    if (kind.value === 'door' && ![14,15,16,17,18].includes(e.action as number)) throw new Error('Invalid door action.');
    if (!Number.isInteger(e.actor) || (e.actor as number) < 0 || (e.actor as number) > 3) throw new Error('Invalid gate actor.');
    const commands = Array.isArray(e.commands) && Object.getPrototypeOf(e.commands) === Array.prototype && e.commands.length === 0 ? [] : (groundHistory([{ kind: 'step', commands: e.commands }])[0] as { commands: PlayerCommand[] }).commands;
    // Also reject empty arrays with extra properties or sparse storage.
    if (!commands.length && Reflect.ownKeys(e.commands as object).length !== 1) throw new Error('Invalid gate commands.');
    return kind.value === 'door' ? {kind:'door',actor:e.actor as number,action:e.action as DoorAction,commands} : { kind: 'activate', actor: e.actor as number, commands };
  });
}
export function gateEnvelope(value: unknown): TrainingGate {
  fields(value, ['version', 'fixture', 'history', 'panelWord', 'overlay']);
  if (value.version !== 1 || value.fixture !== GATE_FIXTURE) throw new Error('Unknown authored gate fixture.');
  fields(value.overlay, ['targetIndex', 'word', 'discoveryWord', 'nextPlaneDiscoveryWord']);
  if (![value.panelWord, ...Object.values(value.overlay)].every(n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 0xffffffff)) throw new Error('Invalid gate words.');
  return { version: 1, fixture: GATE_FIXTURE, history: gateHistory(value.history), panelWord: value.panelWord as number, overlay: { ...value.overlay } as unknown as StaticBlockingOverlay };
}

/** Static actors have one cell footprint and no persistent interpolation reservation.
 * Prospective successful destinations in this same tick are reservations too. */
function stepGateSnapshot(base: LevelData, world: WorldState, gate: TrainingGate, commands: PlayerCommand[], actor: number | null, snapshot: LevelData, reservations: readonly typeof GATE_TARGET[] = [], action: DoorAction = 16) {
  if (gate.moving) return stepMovingGate(base,world,gate,commands,actor,snapshot,reservations,action);
  let nextGate = gate, feedback = '';
  if (actor !== null && world.mission.exited[actor]) {actor = null; feedback = 'Refused: extracted actor is retired.';}
  if (actor !== null) {
    if (!Number.isInteger(actor) || actor < 0 || actor > 3 || world.physics.mode !== 'static' || world.mission.outcome !== 'active') throw new Error('Gate activation unavailable.');
    const pose = world.mercenaries[actor]!, direction = DIRECTIONS[pose.facing], front = { x: pose.x + direction.x, y: pose.y + direction.y, z: pose.z };
    if (!inBounds(snapshot, front) || cellIndex(snapshot, front) !== index(GATE_PANEL)) feedback = 'Refused: face the panel at 5,4,1 from 4,4 (east) or 6,4 (west).';
    else {
      const reserved = stepWorld(snapshot, world, commands).world;
      const targetOccupied = [...world.mercenaries.filter(m=>!world.mission.exited[m.id]), ...reserved.mercenaries.filter(m=>!reserved.mission.exited[m.id]), ...reservations].some(p => cellIndex(snapshot, p) === index(GATE_TARGET));
      const result = transitionButtonBlock({ panelIndex: index(GATE_PANEL), panelWord: snapshot.layers[0][index(GATE_PANEL)]!, button,
        overlay: { targetIndex: index(GATE_TARGET), word: snapshot.layers[0][index(GATE_TARGET)]!, discoveryWord: snapshot.layers[1][index(GATE_TARGET)]!, nextPlaneDiscoveryWord: snapshot.layers[1][index(GATE_TARGET) + 529]! }, targetOccupied });
      if (result.status === 'refused') feedback = `Refused: ${result.reason}. Panel and gate unchanged.`;
      else { nextGate = { ...gate, ...result.candidate }; feedback = `${gate.overlay.word & 2 ? 'CLOSED' : 'OPEN'} → ${nextGate.overlay.word & 2 ? 'CLOSED' : 'OPEN'}. Panel ${gate.panelWord} → ${nextGate.panelWord}.`; }
    }
  }
  const effective = nextGate === gate ? snapshot : effectiveGateLevel(base,nextGate);
  const collision: LevelData = reservations.length ? {...effective,layers:[effective.layers[0].slice(),effective.layers[1],effective.layers[2]]} : effective;
  for (const p of reservations) collision.layers[0][cellIndex(collision,p)] = 66;
  const result = stepWorld(collision, world, commands);
  if (result.world.tick > MAX_GROUND_TICKS) throw new Error('Gate replay tick budget exhausted. Retry or restore.');
  return { ...result, gate: nextGate, feedback, effective };
}
export function stepTrainingGate(base: LevelData, world: WorldState, gate: TrainingGate, commands: PlayerCommand[], actor: number | null, reservations: readonly typeof GATE_TARGET[] = [], snapshot = effectiveGateLevel(base,gate), action: DoorAction = 16) {
  return stepGateSnapshot(base,world,gate,commands,actor,snapshot,reservations,action);
}
export function appendGateEvent(gate: TrainingGate, event: GateEvent): TrainingGate {
  const history = structuredClone(gate.history), last = history.at(-1);
  if (event.kind === 'wait' && last?.kind === 'wait') last.ticks += event.ticks;
  else history.push(event);
  return { ...gate, history: gateHistory(history) };
}
export function replayTrainingGate(base: LevelData, team: OriginalTeam, items: ItemCatalog, history: GateEvent[]) {
  let gate = initialTrainingGate(), world = createWorld(base), inventory = replayTrainingInventory(team, items, []);
  const commands: InventoryCommand[] = [];
  let effective = effectiveGateLevel(base,gate);
  for (const event of gateHistory(history)) {
    if (event.kind === 'door') throw new Error('Timed door requires v12 patrol fixture.');
    if (event.kind === 'equip' || event.kind === 'return' || event.kind === 'exchange') {
      commands.push(event); inventory = replayTrainingInventory(team, items, commands);
    } else if (event.kind === 'step' || event.kind === 'wait' || event.kind === 'activate') {
      const ticks = event.kind === 'wait' ? event.ticks : 1;
      if (world.tick + ticks > MAX_GROUND_TICKS) throw new Error('Gate replay tick budget exceeded.');
      for (let t = 0; t < ticks; t++) {
        const result = stepGateSnapshot(base, world, gate, event.kind === 'wait' ? [] : event.commands, event.kind === 'activate' ? event.actor : null,effective);
        gate = result.gate; world = result.world; effective = result.effective;
      }
    }
    gate = appendGateEvent(gate, event);
  }
  return { gate, world, inventory };
}

/** Probe movement on the current snapshot before considering closure. Vacating
 * actors still reserve their start. NPC current/destination reserve both cells. */
function stepMovingGate(base: LevelData, world: WorldState, gate: TrainingGate, commands: PlayerCommand[], actor: number | null, snapshot: LevelData, reservations: readonly typeof GATE_TARGET[], action: DoorAction) {
  const collision = reservations.length ? {...snapshot,layers:[snapshot.layers[0].slice(),snapshot.layers[1],snapshot.layers[2]] as LevelData['layers']} : snapshot;
  for (const p of reservations) collision.layers[0][cellIndex(collision,p)] = 66;
  const probe = stepWorld(collision,world,commands);
  if (probe.world.tick === world.tick) return {...probe,gate,feedback:'',effective:snapshot};
  if (probe.world.tick > MAX_GROUND_TICKS) throw new Error('Door tick budget exhausted.');
  let requested: DoorAction = 0, feedback = '';
  if (actor !== null) {
    const pose = world.mercenaries[actor];
    if (!pose || world.mission.exited[actor]) feedback = 'Refused: unavailable actor.';
    else {const d = DIRECTIONS[pose.facing];
      if (pose.x+d.x === GATE_PANEL.x && pose.y+d.y === GATE_PANEL.y && pose.z === GATE_PANEL.z) requested = action;
      else feedback = 'Refused: face the panel at 5,4,1.';
    }
  }
  const pad = gate.pad ? transitionPressurePad(base,world,probe.world,gate.pad) : undefined;
  // Explicit manual input first; successful movement edges next; one scheduler step.
  const actions: DoorAction[] = [...(requested ? [requested] : []),...(pad && pad.lastActions !== gate.pad?.lastActions ? pad.lastActions.map(p=>p.action) : [])];
  const moving = advanceMovingDoor(gate.moving!,gate.pad ? actions : requested,[...world.mercenaries,...probe.world.mercenaries,...reservations]);
  const nextGate = {...gate,...(pad ? {pad} : {}),moving,overlay:{...gate.overlay,word:moving.word}};
  const effective = moving.word === gate.moving!.word ? snapshot : effectiveGateLevel(snapshot,nextGate);
  // Current-snapshot movement priority: opening becomes traversable next tick.
  // Closure cannot overlap any accepted destination, checked above.
  return {...probe,gate:nextGate,effective,feedback:feedback || (requested ? `Door action ${requested} accepted; wait for source scheduler.` : '')};
}
