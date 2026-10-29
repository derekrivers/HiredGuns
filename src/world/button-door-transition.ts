import type { EditorRecord } from '../import/editor-map';
import { CELL_COUNT, LAYER_OFFSETS } from '../import/editor-map';

/** Parsed parameters only: neither editor used nor caller labels authenticate source. */
export type ButtonParameters = Readonly<Pick<EditorRecord, 'index'>> & {
  readonly fields: Readonly<EditorRecord['fields']>;
};
export interface StaticBlockingOverlay {
  readonly targetIndex: number;
  readonly word: number;
  readonly discoveryWord: number;
  /** Source block_off examines the next plane of discovery data, not item data. */
  readonly nextPlaneDiscoveryWord: number;
}
export interface ButtonBlockInput {
  readonly panelIndex: number;
  readonly panelWord: number;
  readonly button: ButtonParameters;
  readonly overlay: StaticBlockingOverlay;
  /** Authored interlock: consumer must include every actor footprint/reservation. */
  readonly targetOccupied: boolean;
}
export type ButtonBlockResult = Readonly<{
  status: 'applied' | 'panel-noop';
  action: number | null;
  targetChanged: boolean;
  candidate: Readonly<{ panelWord: number; overlay: Readonly<StaticBlockingOverlay> }>;
}> | Readonly<{ status: 'refused'; reason: string; candidate: null }>;

const BLOCK = 0x1f802, PANEL = 0x180008, OPAQUE = 0x40;
const PLANE = 23 * 23;
const MAP_DATA = LAYER_OFFSETS[0] - 542;
const uint = (n: unknown, max = 0xffffffff): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function fields(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== keys.length) return null;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d) || !d.enumerable) return null;
    result[key] = d.value;
  }
  return result;
}
const refuse = (reason: string): ButtonBlockResult => Object.freeze({ status: 'refused', reason, candidate: null });

/**
 * One activation, no world writes. Only actions 0/4/5/6 and plain static walls.
 * A candidate must be committed with panel, collision and discovery atomically.
 * No pads, moving doors, timers, inventory/item usage, sound or RNG.
 */
export function transitionButtonBlock(input: ButtonBlockInput): ButtonBlockResult {
  const i = fields(input, ['panelIndex', 'panelWord', 'button', 'overlay', 'targetOccupied']);
  const b = fields(i?.button, ['index', 'fields']);
  const f = fields(b?.fields, ['used', 'actionIn', 'actionOut', 'dataIn', 'dataOut']);
  const o = fields(i?.overlay, ['targetIndex', 'word', 'discoveryWord', 'nextPlaneDiscoveryWord']);
  if (!i || !b || !f || !o || !uint(i.panelIndex, CELL_COUNT - 1) || !uint(i.panelWord) ||
      !uint(b.index, 31) || !uint(f.used, 255) || !uint(f.actionIn, 255) || !uint(f.actionOut, 255) ||
      !uint(f.dataIn) || !uint(f.dataOut) || !uint(o.targetIndex, CELL_COUNT - 1) ||
      !uint(o.word) || !uint(o.discoveryWord) || !uint(o.nextPlaneDiscoveryWord) || typeof i.targetOccupied !== 'boolean') return refuse('invalid-input');
  let panelWord = i.panelWord;
  const overlay: StaticBlockingOverlay = { targetIndex: o.targetIndex, word: o.word, discoveryWord: o.discoveryWord, nextPlaneDiscoveryWord: o.nextPlaneDiscoveryWord };
  const done = (status: 'applied' | 'panel-noop', action: number | null, word = overlay.word, discoveryWord = overlay.discoveryWord): ButtonBlockResult => Object.freeze({
    status, action, targetChanged: word !== overlay.word || discoveryWord !== overlay.discoveryWord,
    candidate: Object.freeze({ panelWord, overlay: Object.freeze({ ...overlay, word, discoveryWord }) }),
  });
  // activate_it handles pushables before panels; that composition is outside scope.
  if ((panelWord & 0x100) !== 0) return refuse('pushable-panel-unsupported');
  const panelType = (panelWord & PANEL) >>> 19;
  if ((panelWord & 8) === 0 || (panelType !== 1 && panelType !== 2)) return done('panel-noop', null);
  if (((panelWord >>> 23) & 31) !== b.index) return refuse('button-variant-mismatch');
  // The source names are reversed for wall-panel activation (not for pads).
  const action = panelType === 1 ? f.actionOut : f.actionIn;
  const data = panelType === 1 ? f.dataOut : f.dataIn;
  if (![0, 4, 5, 6].includes(action)) return refuse('unsupported-action');
  if (action === 0) {
    panelWord = ((panelWord & ~PANEL) | ((panelType === 1 ? 2 : 1) << 19) | 8) >>> 0;
    return done('applied', action);
  }
  if (data !== MAP_DATA + overlay.targetIndex * 4) return refuse('target-offset-mismatch');
  if (overlay.targetIndex === i.panelIndex) return refuse('aliased-panel-target-unsupported');
  // Narrow authored fixture domain: no special blocks or live hazards/pushables.
  if ((overlay.word & BLOCK) !== 0 && (overlay.word & BLOCK) !== 2 || (overlay.word & 0x13c) !== 0) return refuse('nonstatic-target-unsupported');
  const off = action === 5 || (action === 6 && (overlay.word & 2) !== 0);
  let word = overlay.word, discoveryWord = overlay.discoveryWord;
  if (off && (word & BLOCK) !== 0) {
    if (overlay.targetIndex >= CELL_COUNT - PLANE) return refuse('next-plane-out-of-bounds');
    // Source clears auxiliary metadata here. Refuse rather than omit this effect.
    if ((overlay.nextPlaneDiscoveryWord & 32) !== 0 && (overlay.nextPlaneDiscoveryWord & 1) === 0) return refuse('auxiliary-cleanup-required');
    word = (word & ~(BLOCK | OPAQUE | PANEL)) >>> 0;
    discoveryWord = (discoveryWord | 1024) >>> 0;
  } else if (!off) {
    if (i.targetOccupied) return refuse('occupied-target');
    word = ((word & ~BLOCK) | OPAQUE | 2) >>> 0;
    discoveryWord = (discoveryWord | 1024) >>> 0;
  }
  panelWord = ((panelWord & ~PANEL) | ((panelType === 1 ? 2 : 1) << 19) | 8) >>> 0;
  return done('applied', action, word, discoveryWord);
}
