import { CHARACTER_FILE_BYTES, CHARACTER_RECORD_BYTES } from '../../src/import/characters';

/** Authored byte patterns; no recovered original roster, names or inventory. */
export function characterFixture(): Uint8Array {
  const bytes = new Uint8Array(CHARACTER_FILE_BYTES), view = new DataView(bytes.buffer);
  for (let i = 0; i < 60; i++) {
    const o = i * CHARACTER_RECORD_BYTES;
    bytes.set(new TextEncoder().encode(`Authored ${i}`), o + 33);
    bytes.set(new TextEncoder().encode(`Actor ${i}`), o + 132);
    bytes[o + 177] = 2; bytes[o + 178] = i; bytes[o + 179] = 255 - i;
    [65535 - i, 300 + i, 500 + i, 0x1234 + i, 0x2345 + i, 0x3456 + i].forEach((v, j) => view.setUint16(o + 180 + j * 2, v));
    for (let n = 0; n < 80; n++) bytes[o + 192 + n] = (n + i + 1) & 255;
    bytes[o + 271] = 255; // Unknown final byte must survive intact.
  }
  return bytes;
}
