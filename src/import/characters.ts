/** Source front-end records, never a live actor or a default map roster. */
export const CHARACTER_RECORD_BYTES = 272;
export const CHARACTER_FILE_BYTES = 16320;
export const CHARACTER_COUNT = 12;
const BANK_COUNT = 5;
export interface InventorySlot {
  itemId: number; damage: number; ammo: number;
  /** Equates calls this outlined; data comments also call it potency. Preserve it. */
  fourthByte: number; rawHex: string;
}
export interface CharacterRecord {
  index: number; bank: number; offset: number; rawHex: string;
  text: { origin: string; selectionName: string; gender: string; class: string; gameName: string; loadName: string };
  gender: number; race: number; class: number;
  stats: { fitness: number; physique: number; agility: number; experience: number; footstep: number; grunt: number };
  inventory: InventorySlot[]; actions: InventorySlot[];
}
export interface CharacterCatalog {
  source: { sha256: string; byteLength: number; layout: 'front272-five-banks'; revision: 'ocs-source-data' | 'cd32-archive' | 'unverified' };
  /** All five banks are retained. Selection/copy_stats uses only bank zero. */
  records: CharacterRecord[];
}
const CD32_HASH = 'f207ce723e555c89d350e3f95d88f6f576377188e11b56cefc4147a877031f47';
const OCS_HASH = '79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439';

/** Exact raw layout only. Packed RNC and the older editor layout are separate formats. */
export async function importCharacters(input: Uint8Array): Promise<CharacterCatalog> {
  if (input.length >= 3 && input[0] === 82 && input[1] === 78 && input[2] === 67) throw new Error('Packed RNC Characters.dat requires verified local recovery; it is not raw front272 data.');
  if (input.byteLength !== CHARACTER_FILE_BYTES) throw new Error(`Expected ${CHARACTER_FILE_BYTES}-byte raw five-bank Characters data. The 3,072-byte editor variant is unsupported.`);
  const bytes = new Uint8Array(input); // Snapshot before asynchronous hashing.
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = (data: Uint8Array) => Array.from(data, b => b.toString(16).padStart(2, '0')).join('');
  const sha256 = hex(new Uint8Array(digest));
  const view = new DataView(bytes.buffer);
  const text = (offset: number, length: number) => {
    let result = '';
    for (const b of bytes.subarray(offset, offset + length)) {
      if (!b) break;
      // Source strings contain display control bytes. Do not execute or inject them.
      result += b >= 32 && b !== 127 ? String.fromCharCode(b) : '\uFFFD';
    }
    return result.trimEnd();
  };
  const slots = (offset: number): InventorySlot[] => Array.from({ length: 10 }, (_, i) => {
    const o = offset + i * 4;
    return { itemId: bytes[o]!, damage: bytes[o + 1]!, ammo: bytes[o + 2]!, fourthByte: bytes[o + 3]!, rawHex: hex(bytes.subarray(o, o + 4)) };
  });
  const records = Array.from({ length: CHARACTER_COUNT * BANK_COUNT }, (_, i): CharacterRecord => {
    const o = i * CHARACTER_RECORD_BYTES;
    return {
      index: i % CHARACTER_COUNT, bank: Math.floor(i / CHARACTER_COUNT), offset: o,
      rawHex: hex(bytes.subarray(o, o + CHARACTER_RECORD_BYTES)),
      text: { origin: text(o, 33), selectionName: text(o + 33, 33), gender: text(o + 66, 33), class: text(o + 99, 33), gameName: text(o + 132, 17), loadName: text(o + 149, 28) },
      gender: bytes[o + 177]!, race: bytes[o + 178]!, class: bytes[o + 179]!,
      stats: { fitness: view.getUint16(o + 180), physique: view.getUint16(o + 182), agility: view.getUint16(o + 184), experience: view.getUint16(o + 186), footstep: view.getUint16(o + 188), grunt: view.getUint16(o + 190) },
      inventory: slots(o + 192), actions: slots(o + 232),
    };
  });
  return { source: { sha256, byteLength: bytes.length, layout: 'front272-five-banks', revision: sha256 === CD32_HASH ? 'cd32-archive' : sha256 === OCS_HASH ? 'ocs-source-data' : 'unverified' }, records };
}
