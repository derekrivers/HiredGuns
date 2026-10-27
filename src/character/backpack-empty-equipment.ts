import { OCS_ITEMS_SHA256 } from '../import/items';
import type { BackpackAction4Actor, BackpackAction4Input, BackpackAction4Item } from './backpack-action4';

export type BackpackEmptyEquipmentActor = BackpackAction4Actor;
export type BackpackEmptyEquipmentInput = BackpackAction4Input;
export type BackpackEmptyEquipmentItem = BackpackAction4Item;
type Target = 'actor.oldCell' | 'actor.pendingAction' | 'actor.equipment' | `actor.carried.${number}` |
  'actor.selection' | 'actor.usingGrenade' | 'actor.weight' | 'actor.heavyCount' | 'actor.tooHeavy' | 'redrawFlag';
export type BackpackEmptyEquipmentRecord =
  | { kind: 'write'; target: Target; width: 1 | 2 | 4; before: number; after: number }
  | { kind: 'copy-return'; source: `actor.carried.${number}`; destination: 'actor.equipment' | `actor.carried.${number}` }
  | { kind: 'add-weight-return'; pass: 1 | 2; slot: 'equipment' | number; itemId: number; count: number; before: number; after: number }
  | { kind: 'weight-return'; pass: 1 | 2; actor: 'actor'; currentCell: number }
  | { kind: 'remove-return' | 'action-return'; actor: 'actor'; currentCell: number };
export interface BackpackEmptyEquipmentResult {
  candidate: BackpackEmptyEquipmentInput;
  records: BackpackEmptyEquipmentRecord[];
  arithmetic: { totalWeight: number; quotient: number; remainder: number; signedQuotient: number; signedPhysique: number; tooHeavy: boolean };
}
const uint = (n: unknown, max = 0xffffffff): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
const signed = (n: number): number => n < 32768 ? n : n - 65536;
function data(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Reflect.ownKeys(value).length !== fields.length) throw new Error('Malformed empty-equipment fields.');
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) throw new Error('Expected own empty-equipment data.');
    result[key] = descriptor.value;
  }
  return result;
}
function array(value: unknown, count: number): unknown[] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).length !== count + 1 || value.length !== count) throw new Error('Malformed empty-equipment array.');
  return Array.from({ length: count }, (_, i) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !('value' in descriptor)) throw new Error('Expected own empty-equipment array data.');
    return descriptor.value as unknown;
  });
}
function snapshot(input: BackpackEmptyEquipmentInput): BackpackEmptyEquipmentInput {
  const s = data(input, ['actor', 'physique', 'redrawFlag', 'items']);
  const actor = data(s.actor, ['playerIndex', 'secondaryDeadWord', 'windowType', 'controlMethod', 'pendingAction', 'currentCell', 'oldCell', 'selection', 'itemCount', 'equipment', 'temporary', 'carried', 'padding', 'spellWings', 'usingGrenade', 'weight', 'tooHeavy', 'heavyCount']);
  const carried = array(actor.carried, 30), padding = array(actor.padding, 3);
  const table = data(s.items, ['revision', 'tableSha256', 'records']);
  if (table.revision !== 'ocs-runtime' || table.tableSha256 !== OCS_ITEMS_SHA256) throw new Error('Unsupported empty-equipment item revision witness.');
  const items = array(table.records, 114).map((value, index) => {
    const item = data(value, ['itemId', 'category', 'weight']);
    if (item.itemId !== index + 1 || !uint(item.category, 255) || !uint(item.weight, 65535)) throw new Error('Malformed empty-equipment item.');
    return item as unknown as BackpackEmptyEquipmentItem;
  });
  for (const [key, value] of Object.entries(actor)) {
    if (key !== 'carried' && key !== 'padding' && !uint(value)) throw new Error('Malformed empty-equipment long.');
  }
  if (![...carried, ...padding].every(n => uint(n)) || !uint(s.physique, 65535) || !uint(s.redrawFlag, 255)) throw new Error('Malformed empty-equipment storage.');
  const a = { ...actor, carried, padding } as unknown as BackpackEmptyEquipmentActor;
  if (![a.playerIndex, a.secondaryDeadWord, a.windowType, a.selection, a.itemCount, a.spellWings, a.usingGrenade, a.heavyCount].every(n => uint(n, 65535)) ||
      ![a.controlMethod, a.pendingAction, a.tooHeavy].every(n => uint(n, 255))) throw new Error('Malformed empty-equipment width.');
  if (a.playerIndex !== 0 || a.secondaryDeadWord !== 0 || a.windowType !== 1 || a.controlMethod !== 1 || a.pendingAction !== 4 ||
      a.currentCell === a.oldCell || a.spellWings !== 0) throw new Error('Unsupported empty-equipment caller.');
  const prefix = a.itemCount;
  if (!((prefix === 4 && a.selection === 1) || (prefix === 2 && a.selection === 1) || (prefix === 1 && a.selection === 0))) throw new Error('Unsupported empty-equipment arrangement.');
  if ((a.equipment >>> 24) !== 0 || a.carried.some((entry, i) => (entry >>> 24) !== (i < prefix ? i + 1 : 0))) throw new Error('Unsupported empty-equipment IDs.');
  if (items.slice(0, prefix).some(item => [4, 21, 23].includes(item.category))) throw new Error('Unsupported empty-equipment category.');
  return { actor: a, physique: s.physique, redrawFlag: s.redrawFlag, items: { revision: 'ocs-runtime', tableSha256: OCS_ITEMS_SHA256, records: items } } as BackpackEmptyEquipmentInput;
}

/** One disconnected observed empty-equipment action-4 transfer. No live installation. */
export function transitionBackpackEmptyEquipment(input: BackpackEmptyEquipmentInput): BackpackEmptyEquipmentResult {
  const candidate = snapshot(input), a = candidate.actor;
  // Private arithmetic validation precedes the observable transition.
  const totalWeight = a.carried.reduce((total, entry) => {
    const id = entry >>> 24;
    return total + (id ? candidate.items.records[id - 1]!.weight : 0);
  }, 0);
  const quotient = Math.floor(totalWeight / 140), remainder = totalWeight % 140;
  if (quotient === 0 || quotient >= 32768) throw new Error('Unsupported empty-equipment division.');
  const tooHeavy = signed(quotient) > signed(candidate.physique);
  if ((a.itemCount === 4 && (!tooHeavy || a.tooHeavy !== 0)) ||
      (a.itemCount === 2 && (!tooHeavy || a.tooHeavy !== 255)) ||
      (a.itemCount === 1 && (tooHeavy || a.tooHeavy !== 255))) throw new Error('Unsupported empty-equipment feedback.');
  const records: BackpackEmptyEquipmentRecord[] = [];
  const write = (target: Target, width: 1 | 2 | 4, before: number, after: number): number => {
    records.push({ kind: 'write', target, width, before, after }); return after;
  };
  a.oldCell = write('actor.oldCell', 4, a.oldCell, a.currentCell);
  a.pendingAction = write('actor.pendingAction', 1, a.pendingAction, 0);
  a.equipment = write('actor.equipment', 4, a.equipment, a.carried[a.selection]!);
  records.push({ kind: 'copy-return', source: `actor.carried.${a.selection}`, destination: 'actor.equipment' });
  let cursor = a.selection;
  if ((a.carried[cursor + 1]! >>> 24) === 0) {
    write(`actor.carried.${cursor}`, 1, a.carried[cursor]! >>> 24, 0);
    a.carried[cursor] = a.carried[cursor]! & 0xffffff;
    if (a.selection !== 0) a.selection = write('actor.selection', 2, a.selection, a.selection - 1);
  } else {
    while ((a.carried[cursor + 1]! >>> 24) !== 0) {
      a.carried[cursor] = write(`actor.carried.${cursor}`, 4, a.carried[cursor]!, a.carried[cursor + 1]!);
      records.push({ kind: 'copy-return', source: `actor.carried.${cursor + 1}`, destination: `actor.carried.${cursor}` });
      cursor++;
    }
    write(`actor.carried.${cursor}`, 1, a.carried[cursor]! >>> 24, 0);
    a.carried[cursor] = a.carried[cursor]! & 0xffffff;
  }
  const weightPass = (pass: 1 | 2): void => {
    a.usingGrenade = write('actor.usingGrenade', 2, a.usingGrenade, 0);
    let total = 0;
    // Each call performs its own fixed equipment + thirty-carried scan.
    for (let slot = -1; slot < 30; slot++) {
      const entry = slot === -1 ? a.equipment : a.carried[slot]!;
      const id = entry >>> 24, before = total;
      if (id) total = (total + candidate.items.records[id - 1]!.weight) >>> 0;
      records.push({ kind: 'add-weight-return', pass, slot: slot === -1 ? 'equipment' : slot,
        itemId: id, count: (entry >>> 8) & 255, before, after: total });
    }
    a.weight = write('actor.weight', 4, a.weight, total);
    if (signed(Math.floor(total / 140)) > signed(candidate.physique)) {
      a.heavyCount = write('actor.heavyCount', 2, a.heavyCount, 50);
      if (a.tooHeavy === 0) {
        candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
        a.tooHeavy = write('actor.tooHeavy', 1, a.tooHeavy, 255);
      }
    } else if (a.tooHeavy !== 0) {
      candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
      a.tooHeavy = write('actor.tooHeavy', 1, a.tooHeavy, 0);
    }
    records.push({ kind: 'weight-return', pass, actor: 'actor', currentCell: a.currentCell });
  };
  weightPass(1);
  // The observed arrangements cannot take remove_item's post-weight decrement.
  records.push({ kind: 'remove-return', actor: 'actor', currentCell: a.currentCell });
  weightPass(2);
  candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
  records.push({ kind: 'action-return', actor: 'actor', currentCell: a.currentCell });
  return { candidate, records, arithmetic: { totalWeight, quotient, remainder,
    signedQuotient: signed(quotient), signedPhysique: signed(candidate.physique), tooHeavy } };
}
