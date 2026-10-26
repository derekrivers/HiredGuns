/** Raw item evidence; imports never install gameplay rules or assets. */
export const ITEM_RECORD_BYTES = 286;
export const ITEM_COUNT = 114;
export const ITEM_FILE_BYTES = ITEM_RECORD_BYTES * ITEM_COUNT;
export const OCS_ITEMS_SHA256 = '633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc';
const CD32_ITEMS_SHA256 = '4a21aabbb1644287c0a2119fd9643f4d6c359d016ff2412da139613d609bdbe8';
export interface ItemRecord {
  index: number; itemId: number; offset: number; rawHex: string;
  text: { header1: string; header2: string; footer1: string; footer2: string; info: string[] };
  category: number; image: number; containerType: number; waterDamage: number;
  maxDamage: number; weight: number; animColour: number; anim: number; animDuration: number;
  flashColour: number; sample: number; samplePeriod: number; exSample: number; exSamplePeriod: number;
  /** Twelve category-dependent bytes, preserved without guessing a union interpretation. */
  extensionHex: string;
}
export interface ItemCatalog {
  source: { sha256: string; byteLength: number; layout: 'items286-114'; revision: 'ocs-runtime' | 'cd32-archive' | 'unverified' };
  records: ItemRecord[];
}
export async function importItems(input: Uint8Array): Promise<ItemCatalog> {
  if (input[0] === 82 && input[1] === 78 && input[2] === 67) throw new Error('Packed RNC data requires verified local recovery and item-table extraction.');
  if (input.byteLength !== ITEM_FILE_BYTES) throw new Error(`Expected ${ITEM_FILE_BYTES}-byte raw item table (114 records of 286 bytes).`);
  const bytes = new Uint8Array(input);
  const hex = (data: Uint8Array) => Array.from(data, b => b.toString(16).padStart(2, '0')).join('');
  const sha256 = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  const view = new DataView(bytes.buffer);
  const text = (offset: number, length: number) => {
    let result = '';
    for (const b of bytes.subarray(offset, offset + length)) {
      if (!b) break;
      // Original text includes formatting opcodes, coordinates, and DEL spaces.
      // Display an inert byte transcription; rawHex retains every original byte.
      result += b >= 32 && b !== 127 ? String.fromCharCode(b) : '\uFFFD';
    }
    return result;
  };
  const records = Array.from({ length: ITEM_COUNT }, (_, index): ItemRecord => {
    const o = index * ITEM_RECORD_BYTES;
    return {
      index, itemId: index + 1, offset: o, rawHex: hex(bytes.subarray(o, o + ITEM_RECORD_BYTES)),
      text: { header1: text(o, 16), header2: text(o + 16, 16), footer1: text(o + 32, 16), footer2: text(o + 48, 16), info: Array.from({ length: 10 }, (_, i) => text(o + 64 + i * 19, 19)) },
      category: bytes[o + 254]!, image: bytes[o + 255]!, containerType: bytes[o + 256]!, waterDamage: bytes[o + 257]!,
      maxDamage: view.getUint16(o + 258), weight: view.getUint16(o + 260), animColour: view.getUint16(o + 262),
      anim: bytes[o + 264]!, animDuration: bytes[o + 265]!, flashColour: bytes[o + 266]!, sample: bytes[o + 267]!,
      samplePeriod: view.getUint16(o + 268), exSample: view.getUint16(o + 270), exSamplePeriod: view.getUint16(o + 272), extensionHex: hex(bytes.subarray(o + 274, o + 286)),
    };
  });
  const revision = sha256 === OCS_ITEMS_SHA256 ? 'ocs-runtime' : sha256 === CD32_ITEMS_SHA256 ? 'cd32-archive' : 'unverified';
  return { source: { sha256, byteLength: bytes.length, layout: 'items286-114', revision }, records };
}
