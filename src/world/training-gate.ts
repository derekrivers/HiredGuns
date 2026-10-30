import { cellIndex, inBounds, type LevelData, type PlayerCommand, type WorldState } from '../contracts';
import { groundHistory, MAX_GROUND_TICKS } from '../items/training-ground';
import type { ItemCatalog } from '../import/items';
import type { OriginalTeam } from '../import/original-team';
import { replayTrainingInventory, type InventoryCommand } from '../sim/training-inventory';
import { createWorld, DIRECTIONS, stepWorld } from '../sim/world';
import { transitionButtonBlock, type StaticBlockingOverlay } from './button-door-transition';

export const GATE_FIXTURE = 'authored-static-gate-v1';
export const MAX_GATE_HISTORY = 128;
export const GATE_PANEL = { x: 5, y: 4, z: 1 };
export const GATE_TARGET = { x: 5, y: 5, z: 1 };
const index = (p: typeof GATE_PANEL) => (p.z * 23 + p.y) * 23 + p.x;
const button = { index: 0, fields: { used: 0, actionIn: 4, actionOut: 5, dataIn: 27936 + 4 * index(GATE_TARGET), dataOut: 27936 + 4 * index(GATE_TARGET) } };
export type GateEvent = { kind: 'step'; commands: PlayerCommand[] } | { kind: 'wait'; ticks: number } |
  InventoryCommand | { kind: 'activate'; actor: number; commands: PlayerCommand[] };
export interface TrainingGate {
  version: 1; fixture: typeof GATE_FIXTURE; history: GateEvent[];
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
export const gateLevel = (level: LevelData) => level.id === GATE_FIXTURE;
export function initialTrainingGate(): TrainingGate { return { version: 1, fixture: GATE_FIXTURE, history: [], ...initialWords() }; }
export function effectiveGateLevel(base: LevelData, gate: TrainingGate | null): LevelData {
  if (!gate) return base;
  const level = structuredClone(base);
  level.layers[0][index(GATE_PANEL)] = gate.panelWord;
  level.layers[0][gate.overlay.targetIndex] = gate.overlay.word;
  level.layers[1][gate.overlay.targetIndex] = gate.overlay.discoveryWord;
  level.layers[1][gate.overlay.targetIndex + 529] = gate.overlay.nextPlaneDiscoveryWord;
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
    if (kind.value !== 'activate') {
      const event = groundHistory([e])[0]!;
      if (event.kind === 'ground') throw new Error('Ground and gate practice require separate fresh Apply.');
      return event;
    }
    fields(e, ['kind', 'actor', 'commands']);
    if (!Number.isInteger(e.actor) || (e.actor as number) < 0 || (e.actor as number) > 3) throw new Error('Invalid gate actor.');
    const commands = Array.isArray(e.commands) && Object.getPrototypeOf(e.commands) === Array.prototype && e.commands.length === 0 ? [] : (groundHistory([{ kind: 'step', commands: e.commands }])[0] as { commands: PlayerCommand[] }).commands;
    // Also reject empty arrays with extra properties or sparse storage.
    if (!commands.length && Reflect.ownKeys(e.commands as object).length !== 1) throw new Error('Invalid gate commands.');
    return { kind: 'activate', actor: e.actor as number, commands };
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
function stepGateSnapshot(base: LevelData, world: WorldState, gate: TrainingGate, commands: PlayerCommand[], actor: number | null, snapshot: LevelData, reservations: readonly typeof GATE_TARGET[] = []) {
  let nextGate = gate, feedback = '';
  if (actor !== null) {
    if (!Number.isInteger(actor) || actor < 0 || actor > 3 || world.physics.mode !== 'static' || world.mission.outcome !== 'active') throw new Error('Gate activation unavailable.');
    const pose = world.mercenaries[actor]!, direction = DIRECTIONS[pose.facing], front = { x: pose.x + direction.x, y: pose.y + direction.y, z: pose.z };
    if (!inBounds(snapshot, front) || cellIndex(snapshot, front) !== index(GATE_PANEL)) feedback = 'Refused: face the panel at 5,4,1 from 4,4 (east) or 6,4 (west).';
    else {
      const reserved = stepWorld(snapshot, world, commands).world;
      const targetOccupied = [...world.mercenaries, ...reserved.mercenaries, ...reservations].some(p => cellIndex(snapshot, p) === index(GATE_TARGET));
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
export function stepTrainingGate(base: LevelData, world: WorldState, gate: TrainingGate, commands: PlayerCommand[], actor: number | null, reservations: readonly typeof GATE_TARGET[] = [], snapshot = effectiveGateLevel(base,gate)) {
  return stepGateSnapshot(base,world,gate,commands,actor,snapshot,reservations);
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
