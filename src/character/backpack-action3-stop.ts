/** Logical storage only; packed entries are unsigned big-endian four-byte longs. */
export interface BackpackAction3StopActor {
  playerIndex: number;
  secondaryDeadWord: number;
  windowType: number;
  controlMethod: number;
  pendingAction: number;
  currentCell: number;
  oldCell: number;
  selection: number;
  itemCount: number;
  equipment: number;
  temporary: number;
  carried: readonly number[];
  /** Three separate padding entries, never inventory capacity. */
  padding: readonly number[];
  spellWings: number;
  usingGrenade: number;
  weight: number;
  tooHeavy: number;
  heavyCount: number;
}
export interface BackpackAction3StopInput {
  actor: BackpackAction3StopActor;
  redrawFlag: number;
}
export type BackpackAction3StopRecord =
  | { readonly kind: 'write'; readonly target: 'actor.oldCell' | 'actor.pendingAction';
      readonly width: 1 | 4; readonly before: number; readonly after: number }
  | { readonly kind: 'action-return'; readonly actor: 'actor' };
export interface BackpackAction3StopResult {
  readonly candidate: Readonly<{ actor: Readonly<BackpackAction3StopActor>; redrawFlag: number }>;
  readonly records: readonly BackpackAction3StopRecord[];
}

const uint = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function fail(): never { throw new Error('Unsupported or malformed bounded backpack action-three stop projection.'); }

// Descriptor reads reject accessors without invoking them. Proxies are not a trust boundary.
function data(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== fields.length) fail();
  const copy: Record<string, unknown> = {};
  for (const field of fields) {
    const d = Object.getOwnPropertyDescriptor(value, field);
    if (!d || !('value' in d) || !d.enumerable) fail();
    copy[field] = d.value;
  }
  return copy;
}
function longs(value: unknown, count: number): number[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertyDescriptor(value, 'length')?.value !== count || Reflect.ownKeys(value).length !== count + 1) fail();
  return Array.from({ length: count }, (_, i) => {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d) || !d.enumerable || !uint(d.value, 0xffffffff)) fail();
    return d.value as number;
  });
}
function snapshot(input: BackpackAction3StopInput): BackpackAction3StopInput {
  const s = data(input, ['actor', 'redrawFlag']);
  const actor = data(s.actor, ['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction',
    'currentCell', 'oldCell', 'selection', 'itemCount', 'equipment', 'temporary', 'carried', 'padding',
    'spellWings', 'usingGrenade', 'weight', 'tooHeavy', 'heavyCount']);
  const carried = longs(actor.carried, 30), padding = longs(actor.padding, 3);
  for (const field of ['playerIndex', 'secondaryDeadWord', 'windowType', 'selection', 'itemCount', 'spellWings', 'usingGrenade', 'heavyCount']) {
    if (!uint(actor[field], 65535)) fail();
  }
  for (const field of ['controlMethod', 'pendingAction', 'tooHeavy']) if (!uint(actor[field], 255)) fail();
  for (const field of ['currentCell', 'oldCell', 'equipment', 'temporary', 'weight']) if (!uint(actor[field], 0xffffffff)) fail();
  if (!uint(s.redrawFlag, 255)) fail();
  const a = { ...actor, carried, padding } as unknown as BackpackAction3StopActor;
  if (a.playerIndex !== 0 || a.secondaryDeadWord !== 0 || a.windowType !== 1 || a.controlMethod !== 1 || a.pendingAction !== 3 ||
      a.currentCell === a.oldCell || a.itemCount !== 2 || (a.selection !== 0 && a.selection !== 1) || a.spellWings !== 0 ||
      (a.equipment >>> 24) !== 0 || carried.some((entry, i) => (entry >>> 24) !== (i < 2 ? i + 1 : 0))) fail();
  return { actor: a, redrawFlag: s.redrawFlag };
}

/** Exactly the observed empty-equipment stop for stored action three. No live caller or continuation. */
export function transitionBackpackAction3Stop(input: BackpackAction3StopInput): BackpackAction3StopResult {
  const candidate = snapshot(input), a = candidate.actor;
  const records: BackpackAction3StopRecord[] = [
    { kind: 'write', target: 'actor.oldCell', width: 4, before: a.oldCell, after: a.currentCell },
    { kind: 'write', target: 'actor.pendingAction', width: 1, before: a.pendingAction, after: 0 },
  ];
  a.oldCell = a.currentCell;
  a.pendingAction = 0;
  records.push({ kind: 'action-return', actor: 'actor' });
  Object.freeze(a.carried);
  Object.freeze(a.padding);
  Object.freeze(a);
  Object.freeze(candidate);
  records.forEach(Object.freeze);
  return Object.freeze({ candidate, records: Object.freeze(records) });
}
