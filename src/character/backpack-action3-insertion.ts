import { OCS_ITEMS_SHA256 } from '../import/items';

/** Logical storage; complete entries are unsigned big-endian four-byte longs. */
export interface BackpackAction3InsertionActor {
  playerIndex: number; secondaryDeadWord: number; windowType: number; controlMethod: number;
  pendingAction: number; currentCell: number; oldCell: number; selection: number; itemCount: number;
  previousPosition: number; noRoomCount: number; equipment: number; temporary: number;
  carried: readonly number[];
  /** Separate storage, never inventory capacity. */
  padding: readonly number[];
  spellWings: number; usingGrenade: number; weight: number; tooHeavy: number; heavyCount: number;
}
/** Externally verified arithmetic projection; a hash witness does not authenticate these values. */
export interface BackpackAction3InsertionItem { itemId: number; category: number; weight: number }
export interface BackpackAction3InsertionInput {
  actor: BackpackAction3InsertionActor; physique: number; redrawFlag: number;
  items: { revision: 'ocs-runtime'; tableSha256: string; records: readonly BackpackAction3InsertionItem[] };
}
type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
type Target = 'actor.oldCell' | 'actor.pendingAction' | 'actor.previousPosition' | `actor.carried.${number}` |
  'actor.equipment' | 'actor.usingGrenade' | 'actor.weight' | 'actor.heavyCount' | 'actor.tooHeavy' | 'redrawFlag';
export type BackpackAction3InsertionRecord =
  | { readonly kind: 'write'; readonly target: Target; readonly width: 1 | 2 | 4; readonly before: number; readonly after: number }
  | { readonly kind: 'insert-return'; readonly slot: 0 }
  | { readonly kind: 'add-weight-return'; readonly pass: 1; readonly slot: 'equipment' | number;
      readonly itemId: number; readonly count: number; readonly before: number; readonly after: number }
  | { readonly kind: 'weight-return' | 'action-return'; readonly actor: 'actor'; readonly currentCell: number };
export interface BackpackAction3InsertionResult {
  readonly candidate: Immutable<BackpackAction3InsertionInput>;
  readonly records: readonly BackpackAction3InsertionRecord[];
  readonly arithmetic: Readonly<{ totalWeight: number; quotient: number; remainder: number;
    signedQuotient: number; signedPhysique: number; tooHeavy: true }>;
}
const uint = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function fail(): never { throw new Error('Unsupported or malformed bounded backpack action-three insertion projection.'); }
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
type Snapshot = BackpackAction3InsertionInput & { actor: { carried: number[]; padding: number[] } };
function snapshot(input: BackpackAction3InsertionInput): Snapshot {
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
    return row as unknown as BackpackAction3InsertionItem;
  });
  const actor = { ...a, carried, padding } as unknown as Snapshot['actor'];
  if (actor.playerIndex !== 0 || actor.secondaryDeadWord !== 0 || actor.windowType !== 1 || actor.controlMethod !== 1 ||
      actor.pendingAction !== 3 || actor.currentCell === actor.oldCell || actor.selection !== 0 || actor.itemCount !== 2 ||
      actor.spellWings !== 0 || actor.tooHeavy !== 0 || (actor.equipment >>> 24) !== 3 ||
      actor.carried.some((entry, i) => (entry >>> 24) !== (i < 2 ? i + 1 : 0)) || s.physique !== 105) fail();
  if (records.slice(0, 3).some((row, i) => row.category !== [16, 16, 0][i] || row.weight !== [7500, 4200, 3200][i])) fail();
  return { actor, physique: s.physique, redrawFlag: s.redrawFlag,
    items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256, records } };
}

/** One disconnected observed insertion. Returns inert logical completion, never a live continuation. */
export function transitionBackpackAction3Insertion(input: BackpackAction3InsertionInput): BackpackAction3InsertionResult {
  // All shape, width, identity and bounded-branch validation finishes before transition records exist.
  const candidate = snapshot(input), a = candidate.actor;
  const records: BackpackAction3InsertionRecord[] = [];
  const write = (target: Target, width: 1 | 2 | 4, before: number, after: number): number => {
    records.push({ kind: 'write', target, width, before, after }); return after;
  };
  a.oldCell = write('actor.oldCell', 4, a.oldCell, a.currentCell);
  a.pendingAction = write('actor.pendingAction', 1, a.pendingAction, 0);
  a.previousPosition = write('actor.previousPosition', 2, a.previousPosition, a.selection);
  for (let source = 28; source >= 0; source--) {
    a.carried[source + 1] = write(`actor.carried.${source + 1}`, 4, a.carried[source + 1]!, a.carried[source]!);
  }
  records.push({ kind: 'insert-return', slot: 0 });
  a.carried[0] = write('actor.carried.0', 4, a.carried[0]!, a.equipment);
  write('actor.equipment', 1, a.equipment >>> 24, 0);
  a.equipment &= 0xffffff;
  a.usingGrenade = write('actor.usingGrenade', 2, a.usingGrenade, 0);
  let totalWeight = 0;
  for (let slot = -1; slot < 30; slot++) {
    const entry = slot === -1 ? a.equipment : a.carried[slot]!;
    const itemId = entry >>> 24, before = totalWeight;
    if (itemId) totalWeight = (totalWeight + candidate.items.records[itemId - 1]!.weight) >>> 0;
    records.push({ kind: 'add-weight-return', pass: 1, slot: slot === -1 ? 'equipment' : slot,
      itemId, count: (entry >>> 8) & 255, before, after: totalWeight });
  }
  const quotient = Math.floor(totalWeight / 140), remainder = totalWeight % 140;
  a.weight = write('actor.weight', 4, a.weight, totalWeight);
  a.heavyCount = write('actor.heavyCount', 2, a.heavyCount, 50);
  candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
  a.tooHeavy = write('actor.tooHeavy', 1, a.tooHeavy, 255);
  records.push({ kind: 'weight-return', actor: 'actor', currentCell: a.currentCell });
  candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
  records.push({ kind: 'action-return', actor: 'actor', currentCell: a.currentCell });
  const arithmetic = Object.freeze({ totalWeight, quotient, remainder, signedQuotient: quotient,
    signedPhysique: candidate.physique, tooHeavy: true as const });
  candidate.items.records.forEach(Object.freeze); Object.freeze(candidate.items.records); Object.freeze(candidate.items);
  Object.freeze(a.carried); Object.freeze(a.padding); Object.freeze(a); Object.freeze(candidate);
  records.forEach(Object.freeze);
  return Object.freeze({ candidate, records: Object.freeze(records), arithmetic });
}
