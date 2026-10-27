import { OCS_ITEMS_SHA256 } from '../import/items';

/** Logical storage; complete entries are unsigned big-endian four-byte longs. */
export interface BackpackAction3NoRoomActor {
  playerIndex: number; secondaryDeadWord: number; windowType: number; controlMethod: number;
  pendingAction: number; currentCell: number; oldCell: number; selection: number; itemCount: number;
  previousPosition: number; noRoomCount: number; equipment: number; temporary: number;
  carried: readonly number[];
  /** Three separate retained entries, never inventory capacity. */
  padding: readonly number[];
  spellWings: number; usingGrenade: number; weight: number; tooHeavy: number; heavyCount: number;
}
/** Retained external projection; no table row is read by the transition. A hash is not authentication. */
export interface BackpackAction3NoRoomItem { itemId: number; category: number; weight: number }
export interface BackpackAction3NoRoomInput {
  actor: BackpackAction3NoRoomActor; physique: number; redrawFlag: number;
  items: { revision: 'ocs-runtime'; tableSha256: string; records: readonly BackpackAction3NoRoomItem[] };
}
type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
type Target = 'actor.oldCell' | 'actor.pendingAction' | 'actor.previousPosition' | 'actor.noRoomCount';
export type BackpackAction3NoRoomRecord =
  | { readonly kind: 'write'; readonly target: Target; readonly width: 1 | 2 | 4; readonly before: number; readonly after: number }
  | { readonly kind: 'insert-return'; readonly resultWord: 65535 }
  | { readonly kind: 'action-return'; readonly actor: 'actor'; readonly currentCell: number };
export interface BackpackAction3NoRoomResult {
  readonly candidate: Immutable<BackpackAction3NoRoomInput>;
  readonly records: readonly BackpackAction3NoRoomRecord[];
}
const uint = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function fail(): never { throw new Error('Unsupported or malformed bounded backpack action-three no-room projection.'); }
// Exact own enumerable data only. Descriptor checks never invoke accessors.
// Proxies are outside the validation trust boundary.
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
function snapshot(input: BackpackAction3NoRoomInput): BackpackAction3NoRoomInput {
  const s = data(input, ['actor', 'physique', 'redrawFlag', 'items']);
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
    return row as unknown as BackpackAction3NoRoomItem;
  });
  const actor = { ...a, carried, padding } as unknown as BackpackAction3NoRoomActor;
  // Admission binds the one authored profile; this is not the original capacity test or a population validator.
  if (actor.playerIndex !== 0 || actor.secondaryDeadWord !== 0 || actor.windowType !== 1 || actor.controlMethod !== 1 ||
      actor.pendingAction !== 3 || actor.currentCell === actor.oldCell || actor.selection !== 0 || actor.itemCount !== 30 ||
      actor.spellWings !== 0 || actor.tooHeavy !== 0 || (actor.equipment >>> 24) !== 3 || s.physique !== 105 ||
      actor.carried.some((entry, i) => (entry >>> 24) !== 1 + i % 2) ||
      records.slice(0, 3).some((row, i) => row.category !== [16, 16, 0][i])) fail();
  return { actor, physique: s.physique, redrawFlag: s.redrawFlag,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256, records } };
}

/** One disconnected observed refusal. Return records are inert; the outer routine remains a prefix. */
export function transitionBackpackAction3NoRoom(input: BackpackAction3NoRoomInput): BackpackAction3NoRoomResult {
  // All admission and storage validation completes before any transition record exists.
  const candidate = snapshot(input), a = candidate.actor;
  const records: BackpackAction3NoRoomRecord[] = [];
  const write = (target: Target, width: 1 | 2 | 4, before: number, after: number): number => {
    records.push({ kind: 'write', target, width, before, after }); return after;
  };
  a.oldCell = write('actor.oldCell', 4, a.oldCell, a.currentCell);
  a.pendingAction = write('actor.pendingAction', 1, a.pendingAction, 0);
  a.previousPosition = write('actor.previousPosition', 2, a.previousPosition, a.selection);
  // Original capacity predicate reads only the final carried ID, never itemCount.
  if ((a.carried[29]! >>> 24) === 0) fail();
  a.noRoomCount = write('actor.noRoomCount', 2, a.noRoomCount, 150);
  records.push({ kind: 'insert-return', resultWord: 65535 });
  records.push({ kind: 'action-return', actor: 'actor', currentCell: a.currentCell });
  candidate.items.records.forEach(Object.freeze); Object.freeze(candidate.items.records); Object.freeze(candidate.items);
  Object.freeze(a.carried); Object.freeze(a.padding); Object.freeze(a); Object.freeze(candidate);
  records.forEach(Object.freeze);
  return Object.freeze({ candidate, records: Object.freeze(records) });
}
