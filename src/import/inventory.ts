import { importCharacters, type CharacterCatalog, type CharacterRecord, type InventorySlot } from './characters';
import { importItems, OCS_ITEMS_SHA256, type ItemCatalog } from './items';

const OCS_CHARACTERS_SHA256 = '79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439';
export interface SelectionInventory { equipped: InventorySlot; carried: InventorySlot[]; actions: InventorySlot[] }
export interface WeightValues { totalWeight: number; quotient: number; tooHeavy: boolean; usingGrenade: 0 | 2 }
export type SourceWeightResult = ({ status: 'computed' } & WeightValues) | { status: 'unavailable'; reason: string; totalWeight?: number };
export type SelectionWeightResult = ({ status: 'verified' } & WeightValues) | { status: 'unavailable'; reason: string; totalWeight?: number };
const empty = (): InventorySlot => ({ itemId: 0, damage: 0, ammo: 0, fourthByte: 0, rawHex: '00000000' });
function copySlot(slot: InventorySlot): InventorySlot {
  const values = [slot.itemId, slot.damage, slot.ammo, slot.fourthByte];
  if (!values.every(n => Number.isInteger(n) && n >= 0 && n <= 255) || slot.rawHex !== values.map(n => n.toString(16).padStart(2, '0')).join('')) throw new Error('Malformed four-byte inventory entry.');
  return { ...slot };
}
/** ChSelect copy_stats: actions stay separate, equipment clears, ten copied plus twenty empty. */
export function initializeInventory(character: Pick<CharacterRecord, 'inventory' | 'actions'>): SelectionInventory {
  if (character.inventory.length !== 10 || character.actions.length !== 10) throw new Error('Expected ten inventory and ten action entries.');
  return { equipped: empty(), carried: [...Array.from(character.inventory, copySlot), ...Array.from({ length: 20 }, empty)], actions: Array.from(character.actions, copySlot) };
}
const word = (n: number) => Number.isInteger(n) && n >= 0 && n <= 65535;
const signedWord = (n: number) => n >= 32768 ? n - 65536 : n;
/** Arithmetic transcription for inspection/testing only; this does not verify a data pairing. */
export function computeSourceWeight(items: ItemCatalog, inventory: SelectionInventory, physique: number, spellWings = 0): SourceWeightResult {
  if (!word(physique) || !word(spellWings) || inventory.carried.length !== 30) return { status: 'unavailable', reason: 'Malformed source word or carried-inventory width.' };
  let totalWeight = 0;
  let usingGrenade: 0 | 2 = 0;
  for (const [index, slot] of [inventory.equipped, ...inventory.carried].entries()) {
    try { copySlot(slot); } catch { return { status: 'unavailable', reason: 'Malformed four-byte inventory entry.' }; }
    if (slot.itemId === 0) continue;
    const item = items.records[slot.itemId - 1];
    if (!item || item.itemId !== slot.itemId || !word(item.weight) || !Number.isInteger(item.category) || item.category < 0 || item.category > 255) return { status: 'unavailable', reason: `Item ID ${slot.itemId} has no valid table entry.` };
    if (index === 0 && item.category === 21) usingGrenade = 2;
    // MULU uses unsigned low words; D3 is zeroed once and receives only count bytes.
    const multiplier = [4, 21, 23].includes(item.category) ? slot.ammo : 1;
    totalWeight = (totalWeight + item.weight * multiplier) >>> 0;
  }
  if (spellWings === 24) totalWeight = 0;
  const quotient = Math.floor(totalWeight / 140);
  // DIVU overflow retains the dividend. This bounded preview does not model that
  // subsequent low-word comparison; it must not invent a representable quotient.
  if (quotient > 65535) return { status: 'unavailable', reason: '68000 DIVU quotient overflow is outside this inspection profile.', totalWeight };
  return { status: 'computed', totalWeight, quotient, tooHeavy: signedWord(quotient) > signedWord(physique), usingGrenade };
}
function rawBytes(records: readonly { rawHex: string }[], count: number, width: number): Uint8Array {
  if (records.length !== count) throw new Error('Malformed catalog record count.');
  const bytes = new Uint8Array(count * width);
  Array.from(records).forEach((record, i) => {
    if (!record || typeof record.rawHex !== 'string' || !new RegExp(`^[0-9a-f]{${width * 2}}$`).test(record.rawHex)) throw new Error('Malformed catalog raw bytes.');
    for (let j = 0; j < width; j++) bytes[i * width + j] = parseInt(record.rawHex.slice(j * 2, j * 2 + 2), 16);
  });
  return bytes;
}
/** Rehash raw evidence and derive fields anew, so editable report metadata cannot grant authority. */
export async function inspectSelectionInventory(characters: CharacterCatalog, items: ItemCatalog, canonicalIndex: number): Promise<{ inventory: SelectionInventory; weight: SelectionWeightResult }> {
  if (!Number.isInteger(canonicalIndex) || canonicalIndex < 0 || canonicalIndex >= 12) throw new Error('Expected a canonical character index from 0 through 11.');
  const characterBytes = rawBytes(characters.records, 60, 272);
  const itemBytes = rawBytes(items.records, 114, 286);
  const [roster, table] = await Promise.all([importCharacters(characterBytes), importItems(itemBytes)]);
  const character = roster.records[canonicalIndex]!;
  const inventory = initializeInventory(character);
  if (roster.source.sha256 !== OCS_CHARACTERS_SHA256 || table.source.sha256 !== OCS_ITEMS_SHA256) return { inventory, weight: { status: 'unavailable', reason: 'Weight requires the exact verified OCS roster and OCS runtime item-table pairing.' } };
  const computed = computeSourceWeight(table, inventory, character.stats.physique);
  return { inventory, weight: computed.status === 'computed' ? { ...computed, status: 'verified' } : computed };
}
