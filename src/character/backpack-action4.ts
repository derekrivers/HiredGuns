import { OCS_ITEMS_SHA256 } from '../import/items';

/** Logical storage only: item entries are unsigned packed four-byte big-endian longs. */
export interface BackpackAction4Actor {
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
  carried: number[];
  /** Three separate four-byte padding entries, never inventory capacity. */
  padding: number[];
  spellWings: number;
  usingGrenade: number;
  weight: number;
  tooHeavy: number;
  heavyCount: number;
}
/** Arithmetic projection only; source identity is an external prerequisite. */
export interface BackpackAction4Item { itemId: number; category: number; weight: number }
export interface BackpackAction4Input {
  actor: BackpackAction4Actor;
  physique: number;
  redrawFlag: number;
  items: { revision: 'ocs-runtime'; tableSha256: string; records: BackpackAction4Item[] };
}
type Target = 'actor.oldCell' | 'actor.pendingAction' | 'actor.temporary' | 'actor.carried.1' |
  'actor.equipment' | 'actor.usingGrenade' | 'actor.weight' | 'actor.heavyCount' | 'actor.tooHeavy' | 'redrawFlag';
export type BackpackAction4Record =
  | { kind: 'write'; target: Target; width: 1 | 2 | 4; before: number; after: number }
  | { kind: 'copy-return'; copy: 'selected-to-temporary' | 'equipment-to-selected' | 'temporary-to-equipment' }
  | { kind: 'weight-return' | 'action-return'; actor: 'actor'; currentCell: number };
export interface BackpackAction4Result {
  candidate: BackpackAction4Input;
  records: BackpackAction4Record[];
  arithmetic: { totalWeight: number; quotient: number; remainder: number; signedQuotient: number; signedPhysique: number; tooHeavy: boolean };
}
const uint = (n: unknown, max = 0xffffffff): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
const signed = (n: number): number => n < 32768 ? n : n - 65536;
function data(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Reflect.ownKeys(value).length !== fields.length) throw new Error('Malformed action-4 fields.');
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) throw new Error('Expected own action-4 data.');
    result[key] = descriptor.value;
  }
  return result;
}
function array(value: unknown, count: number): unknown[] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).length !== count + 1 || value.length !== count) throw new Error('Malformed action-4 array.');
  return Array.from({ length: count }, (_, i) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !('value' in descriptor)) throw new Error('Expected own action-4 array data.');
    return descriptor.value as unknown;
  });
}
function snapshot(input: BackpackAction4Input): BackpackAction4Input {
  const s = data(input, ['actor', 'physique', 'redrawFlag', 'items']);
  const actor = data(s.actor, ['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction', 'currentCell', 'oldCell', 'selection', 'itemCount', 'equipment', 'temporary', 'carried', 'padding', 'spellWings', 'usingGrenade', 'weight', 'tooHeavy', 'heavyCount']);
  const carried = array(actor.carried, 30), padding = array(actor.padding, 3);
  const table = data(s.items, ['revision', 'tableSha256', 'records']);
  if (table.revision !== 'ocs-runtime' || table.tableSha256 !== OCS_ITEMS_SHA256) throw new Error('Unsupported action-4 item revision witness.');
  const items = array(table.records, 114).map((value, index) => {
    const item = data(value, ['itemId', 'category', 'weight']);
    if (item.itemId !== index + 1 || !uint(item.category, 255) || !uint(item.weight, 65535)) throw new Error('Malformed action-4 item.');
    return item as unknown as BackpackAction4Item;
  });
  for (const [key, value] of Object.entries(actor)) {
    if (key !== 'carried' && key !== 'padding' && !uint(value)) throw new Error('Malformed action-4 long.');
  }
  if (![...carried, ...padding].every(n => uint(n)) || !uint(s.physique, 65535) || !uint(s.redrawFlag, 255)) throw new Error('Malformed action-4 storage.');
  const a = { ...actor, carried, padding } as unknown as BackpackAction4Actor;
  if (![a.playerIndex, a.secondaryDeadWord, a.windowType, a.selection, a.itemCount, a.spellWings, a.usingGrenade, a.heavyCount].every(n => uint(n, 65535)) ||
      ![a.controlMethod, a.pendingAction, a.tooHeavy].every(n => uint(n, 255))) throw new Error('Malformed action-4 width.');
  if (a.playerIndex !== 0 || a.secondaryDeadWord !== 0 || a.windowType !== 1 || a.controlMethod !== 1 || a.pendingAction !== 4 ||
      a.currentCell === a.oldCell || a.selection !== 1 || a.itemCount !== 4 || a.spellWings !== 0) throw new Error('Unsupported action-4 caller.');
  const ids = [a.equipment, ...a.carried].map(n => n >>> 24);
  if (ids[0] !== 4 || ids[1] !== 1 || ids[2] !== 2 || ids[3] !== 3 || ids.slice(4).some(id => id !== 0)) throw new Error('Unsupported action-4 occupied prefix.');
  if (items.slice(0, 4).some(item => [4, 21, 23].includes(item.category))) throw new Error('Unsupported action-4 category.');
  return { actor: a, physique: s.physique, redrawFlag: s.redrawFlag, items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256, records: items } } as BackpackAction4Input;
}

/** One disconnected observed occupied manual action-4 exchange, never a live installation. */
export function transitionBackpackAction4(input: BackpackAction4Input): BackpackAction4Result {
  const candidate = snapshot(input), a = candidate.actor;
  // Equipment plus all thirty carried entries are visited even though this exchange preserves the sum.
  let totalWeight = 0;
  for (const entry of [a.equipment, ...a.carried]) {
    const id = entry >>> 24;
    if (id !== 0) totalWeight = (totalWeight + candidate.items.records[id - 1]!.weight) >>> 0;
  }
  const quotient = Math.floor(totalWeight / 140), remainder = totalWeight % 140;
  if (quotient === 0 || quotient > 65535) throw new Error('Unsupported action-4 division.');
  const tooHeavy = signed(quotient) > signed(candidate.physique);
  if (![0, 255].includes(a.tooHeavy) || (!tooHeavy && a.tooHeavy !== 255)) throw new Error('Unsupported action-4 feedback branch.');
  const records: BackpackAction4Record[] = [];
  const write = (target: Target, width: 1 | 2 | 4, before: number, after: number): number => {
    records.push({ kind: 'write', target, width, before, after }); return after;
  };
  a.oldCell = write('actor.oldCell', 4, a.oldCell, a.currentCell);
  a.pendingAction = write('actor.pendingAction', 1, a.pendingAction, 0);
  a.temporary = write('actor.temporary', 4, a.temporary, a.carried[1]!);
  records.push({ kind: 'copy-return', copy: 'selected-to-temporary' });
  a.carried[1] = write('actor.carried.1', 4, a.carried[1]!, a.equipment);
  records.push({ kind: 'copy-return', copy: 'equipment-to-selected' });
  a.equipment = write('actor.equipment', 4, a.equipment, a.temporary);
  records.push({ kind: 'copy-return', copy: 'temporary-to-equipment' });
  a.usingGrenade = write('actor.usingGrenade', 2, a.usingGrenade, 0);
  a.weight = write('actor.weight', 4, a.weight, totalWeight);
  if (tooHeavy) {
    a.heavyCount = write('actor.heavyCount', 2, a.heavyCount, 50);
    if (a.tooHeavy === 0) {
      candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
      a.tooHeavy = write('actor.tooHeavy', 1, a.tooHeavy, 255);
    }
  } else {
    candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
    a.tooHeavy = write('actor.tooHeavy', 1, a.tooHeavy, 0);
  }
  records.push({ kind: 'weight-return', actor: 'actor', currentCell: a.currentCell });
  candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
  records.push({ kind: 'action-return', actor: 'actor', currentCell: a.currentCell });
  return { candidate, records, arithmetic: { totalWeight, quotient, remainder, signedQuotient: signed(quotient), signedPhysique: signed(candidate.physique), tooHeavy } };
}
