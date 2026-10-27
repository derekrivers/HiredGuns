import { OCS_ITEMS_SHA256 } from '../import/items';

/** Logical storage; complete entries are unsigned big-endian four-byte longs. */
export interface BackpackCountActor {
  playerIndex: number; secondaryDeadWord: number; windowType: number; controlMethod: number;
  pendingAction: number; currentCell: number; oldCell: number; selection: number; itemCount: number;
  previousPosition: number; noRoomCount: number; equipment: number; temporary: number;
  carried: readonly number[];
  /** Separate storage, never inventory capacity. */
  padding: readonly number[];
  spellWings: number; usingGrenade: number; weight: number; tooHeavy: number; heavyCount: number;
}
/** Externally verified arithmetic projection; a hash witness does not authenticate these values. */
export interface BackpackCountItem { itemId: number; category: number; weight: number }
export interface BackpackCountInput {
  profile: 'ocs-count-items-selection-one-middle-caller';
  actor: BackpackCountActor; physique: number; redrawFlag: number;
  items: { revision: 'ocs-runtime'; tableSha256: string; records: readonly BackpackCountItem[] };
}
type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
export type BackpackCountRecord =
  | { readonly kind: 'read-id'; readonly target: 'actor.equipment' | `actor.carried.${number}`;
      readonly width: 1; readonly value: number }
  | { readonly kind: 'write'; readonly target: 'actor.itemCount'; readonly width: 2;
      readonly before: number; readonly after: number }
  | { readonly kind: 'count-return'; readonly continuation: 'damage-inventory-after-count';
      readonly scope: 'middle-caller' };
export interface BackpackCountResult {
  readonly candidate: Immutable<BackpackCountInput>;
  readonly records: readonly BackpackCountRecord[];
}
const uint = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function fail(): never { throw new Error('Unsupported or malformed bounded backpack count projection.'); }
// Only exact own enumerable data is accepted. Descriptor checks do not invoke accessors.
// Proxies are not a trust boundary.
function data(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== fields.length) fail();
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d) || !d.enumerable) fail();
    result[key] = d.value;
  }
  return result;
}
function array(value: unknown, length: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertyDescriptor(value, 'length')?.value !== length || Reflect.ownKeys(value).length !== length + 1) fail();
  return Array.from({ length }, (_, i) => {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d) || !d.enumerable) fail();
    return d.value as unknown;
  });
}
type Snapshot = BackpackCountInput & { actor: { carried: number[]; padding: number[] } };
function snapshot(input: BackpackCountInput): Snapshot {
  const s = data(input, ['profile', 'actor', 'physique', 'redrawFlag', 'items']);
  if (s.profile !== 'ocs-count-items-selection-one-middle-caller') fail();
  const a = data(s.actor, ['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction',
    'currentCell', 'oldCell', 'selection', 'itemCount', 'previousPosition', 'noRoomCount', 'equipment', 'temporary',
    'carried', 'padding', 'spellWings', 'usingGrenade', 'weight', 'tooHeavy', 'heavyCount']);
  const carried = array(a.carried, 30), padding = array(a.padding, 3);
  for (const key of ['playerIndex', 'secondaryDeadWord', 'windowType', 'selection', 'itemCount', 'previousPosition',
    'noRoomCount', 'spellWings', 'usingGrenade', 'heavyCount']) if (!uint(a[key], 65535)) fail();
  for (const key of ['controlMethod', 'pendingAction', 'tooHeavy']) if (!uint(a[key], 255)) fail();
  for (const key of ['currentCell', 'oldCell', 'equipment', 'temporary', 'weight']) if (!uint(a[key], 0xffffffff)) fail();
  if (![...carried, ...padding].every(n => uint(n, 0xffffffff)) || !uint(s.physique, 65535) || !uint(s.redrawFlag, 255)) fail();
  const table = data(s.items, ['revision', 'tableSha256', 'records']);
  if (table.revision !== 'ocs-runtime' || table.tableSha256 !== OCS_ITEMS_SHA256) fail();
  const records = array(table.records, 114).map((value, i) => {
    const row = data(value, ['itemId', 'category', 'weight']);
    if (row.itemId !== i + 1 || !uint(row.category, 255) || !uint(row.weight, 65535)) fail();
    return row as unknown as BackpackCountItem;
  });
  const actor = { ...a, carried, padding } as unknown as Snapshot['actor'];
  if (actor.playerIndex !== 0 || actor.secondaryDeadWord !== 0 || actor.windowType !== 1 || actor.controlMethod !== 1 ||
      actor.pendingAction !== 3 || actor.currentCell === actor.oldCell || actor.selection !== 1 || actor.itemCount !== 2 ||
      actor.spellWings !== 0 || actor.tooHeavy !== 0 || (actor.equipment >>> 24) !== 3 ||
      actor.carried.some((entry, i) => (entry >>> 24) !== (i < 2 ? i + 1 : 0)) || s.physique !== 105) fail();
  if (records.slice(0, 3).some((row, i) => row.category !== [16, 16, 0][i] || row.weight !== [7500, 4200, 3200][i])) fail();
  return { profile: 'ocs-count-items-selection-one-middle-caller', actor, physique: s.physique, redrawFlag: s.redrawFlag,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256, records } };
}

/** Disconnected logical count at the single accepted diagnostic middle-caller boundary. */
export function transitionBackpackCount(input: BackpackCountInput): BackpackCountResult {
  // Validate and detach the complete retained projection before producing any effects.
  const candidate = snapshot(input), a = candidate.actor;
  const records: BackpackCountRecord[] = [];
  let count = 0;
  for (let slot = -1; slot < 30; slot++) {
    const value = (slot === -1 ? a.equipment : a.carried[slot]!) >>> 24;
    records.push({ kind: 'read-id', target: slot === -1 ? 'actor.equipment' : `actor.carried.${slot}`, width: 1, value });
    if (value !== 0) count++;
  }
  // The prior value belongs to the write receipt; the original helper does not read it.
  records.push({ kind: 'write', target: 'actor.itemCount', width: 2, before: a.itemCount, after: count });
  a.itemCount = count;
  records.push({ kind: 'count-return', continuation: 'damage-inventory-after-count', scope: 'middle-caller' });
  candidate.items.records.forEach(Object.freeze); Object.freeze(candidate.items.records); Object.freeze(candidate.items);
  Object.freeze(a.carried); Object.freeze(a.padding); Object.freeze(a); Object.freeze(candidate);
  records.forEach(Object.freeze);
  return Object.freeze({ candidate, records: Object.freeze(records) });
}
