import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { importItems, ITEM_FILE_BYTES, ITEM_RECORD_BYTES, OCS_ITEMS_SHA256 } from '../src/import/items';
import { computeSourceWeight, initializeInventory, inspectSelectionInventory } from '../src/import/inventory';
import { importCharacters, type InventorySlot } from '../src/import/characters';
import { characterFixture } from './helpers/character-fixture';

function fixture() {
  const bytes = new Uint8Array(ITEM_FILE_BYTES), view = new DataView(bytes.buffer);
  for (let i = 0; i < 114; i++) {
    const o = i * ITEM_RECORD_BYTES;
    bytes.set(new TextEncoder().encode(`Authored ${i}`), o);
    for (let n = 0; n < 10; n++) bytes.set(new TextEncoder().encode(`Info ${i}/${n}`), o + 64 + n * 19);
    bytes.set([i, 255 - i, 240, 239], o + 254);
    [65535 - i, 0x1234 + i, 0x2345 + i].forEach((v, n) => view.setUint16(o + 258 + n * 2, v));
    bytes.set([234, 233, 232, 231], o + 264);
    [0xabcd + i, 0xbcde + i, 0xcdef + i].forEach((v, n) => view.setUint16(o + 268 + n * 2, v));
    bytes.fill(128 + i, o + 274, o + 286);
  }
  return bytes;
}
const slot = (itemId = 0, ammo = 0): InventorySlot => ({ itemId, damage: 0, ammo, fourthByte: 0, rawHex: [itemId, 0, ammo, 0].map(n => n.toString(16).padStart(2, '0')).join('') });
const inventory = () => initializeInventory({ inventory: Array.from({ length: 10 }, () => slot()), actions: Array.from({ length: 10 }, () => slot(114, 255)) });

describe('bounded raw item import', () => {
  it('preserves all bytes, text widths, count, unknown extension and unsigned big-endian fields', async () => {
    const bytes = fixture(), catalog = await importItems(bytes);
    expect(catalog.source).toEqual({ sha256: createHash('sha256').update(bytes).digest('hex'), byteLength: 32604, layout: 'items286-114', revision: 'unverified' });
    expect(catalog.records).toHaveLength(114);
    expect(catalog.records[0]).toMatchObject({ itemId: 1, offset: 0, category: 0, image: 255, containerType: 240, waterDamage: 239, maxDamage: 65535, weight: 0x1234, animColour: 0x2345, anim: 234, animDuration: 233, flashColour: 232, sample: 231, samplePeriod: 0xabcd, exSample: 0xbcde, exSamplePeriod: 0xcdef, extensionHex: '80'.repeat(12) });
    expect(catalog.records[113]).toMatchObject({ index: 113, itemId: 114, offset: 32318, text: { header1: 'Authored 113' } });
    expect(catalog.records[113]!.text.info[9]).toBe('Info 113/9');
    expect(Buffer.from(catalog.records.map(r => r.rawHex).join(''), 'hex')).toEqual(Buffer.from(bytes));
  });
  it('snapshots subarrays before hashing and bounds strings without discarding padding', async () => {
    const outer = new Uint8Array(ITEM_FILE_BYTES + 8), bytes = outer.subarray(4, -4); bytes.set(fixture());
    bytes.fill(65, 0, 16); bytes[16] = 1; bytes[17] = 0; bytes[18] = 255;
    const expected = Buffer.from(bytes), pending = importItems(bytes); bytes.fill(0);
    const catalog = await pending;
    expect(catalog.source.sha256).toBe(createHash('sha256').update(expected).digest('hex'));
    expect(catalog.records[0]!.text.header1).toBe('A'.repeat(16));
    expect(catalog.records[0]!.text.header2).toBe('\uFFFD');
    expect(catalog.records[0]!.rawHex.slice(32, 38)).toBe('0100ff');
  });
  it('rejects containers, packed input, partial records and extra records', async () => {
    for (const length of [0, 286, 32603, 32605, 155412]) await expect(importItems(new Uint8Array(length))).rejects.toThrow('raw item table');
    await expect(importItems(new Uint8Array([82, 78, 67, 1]))).rejects.toThrow('Packed RNC');
  });
});
describe('selection inventory copy', () => {
  it('makes empty equipment, ten independent copies and twenty independent empty entries, with separate actions', async () => {
    const record = (await importCharacters(characterFixture())).records[0]!, state = initializeInventory(record);
    expect(state.equipped).toEqual(slot()); expect(state.carried).toHaveLength(30); expect(state.actions).toHaveLength(10);
    expect(state.carried.slice(0, 10)).toEqual(record.inventory); expect(state.actions).toEqual(record.actions);
    expect(state.carried.slice(10)).toEqual(Array.from({ length: 20 }, () => slot()));
    state.carried[0]!.ammo = 9; state.actions[0]!.ammo = 8; state.carried[10]!.ammo = 7;
    expect(record.inventory[0]!.ammo).toBe(3); expect(record.actions[0]!.ammo).toBe(43); expect(state.carried[11]!.ammo).toBe(0);
  });
  it('rejects malformed widths, sparse entries, byte ranges and inconsistent raw bytes', () => {
    expect(() => initializeInventory({ inventory: [], actions: [] })).toThrow();
    expect(() => initializeInventory({ inventory: new Array<InventorySlot>(10), actions: Array.from({ length: 10 }, () => slot()) })).toThrow();
    const state = inventory(); state.carried[0]!.ammo = 256;
    expect(() => initializeInventory({ inventory: state.carried.slice(0, 10), actions: state.actions })).toThrow();
  });
});
describe('source weight arithmetic, separate from verification', () => {
  it('counts equipped plus thirty carried, multiplies only categories4/21/23 and ignores action templates', async () => {
    const table = await importItems(fixture()), state = inventory();
    [0, 4, 21, 23, 24, 2, 13].forEach((category, i) => Object.assign(table.records[i]!, { category, weight: 100 }));
    state.equipped = slot(3, 2);
    state.carried[0] = slot(1, 255); state.carried[1] = slot(2, 3); state.carried[2] = slot(4, 0);
    state.carried[3] = slot(5, 255); state.carried[4] = slot(6, 255); state.carried[29] = slot(7, 255);
    expect(computeSourceWeight(table, state, 5)).toEqual({ status: 'computed', totalWeight: 900, quotient: 6, tooHeavy: true, usingGrenade: 2 });
    expect(computeSourceWeight(table, state, 6)).toMatchObject({ tooHeavy: false });
    expect(computeSourceWeight(table, state, 0, 24)).toMatchObject({ totalWeight: 0, quotient: 0, tooHeavy: false, usingGrenade: 2 });
    expect(computeSourceWeight(table, inventory(), 0)).toMatchObject({ totalWeight: 0, usingGrenade: 0 });
  });
  it('uses unsigned MULU operands and signed CMP.W/BLE, and reports DIVU overflow', async () => {
    const table = await importItems(fixture()), state = inventory();
    Object.assign(table.records[0]!, { category: 4, weight: 65535 }); state.equipped = slot(1, 70);
    expect(computeSourceWeight(table, state, 0)).toMatchObject({ totalWeight: 4587450, quotient: 32767, tooHeavy: true });
    state.equipped = slot(1, 71);
    expect(computeSourceWeight(table, state, 0)).toMatchObject({ quotient: 33235, tooHeavy: false });
    expect(computeSourceWeight(table, inventory(), 65535)).toMatchObject({ tooHeavy: true });
    state.equipped = slot(1, 140);
    expect(computeSourceWeight(table, state, 0)).toMatchObject({ status: 'computed', totalWeight: 9174900, quotient: 65535, tooHeavy: false });
    state.equipped = slot(1, 141);
    expect(computeSourceWeight(table, state, 0)).toMatchObject({ status: 'unavailable', totalWeight: 9240435, reason: expect.stringContaining('DIVU') });
    state.equipped = slot(1, 255);
    expect(computeSourceWeight(table, state, 0)).toMatchObject({ status: 'unavailable', totalWeight: 16711425, reason: expect.stringContaining('DIVU') });
    expect(computeSourceWeight(table, state, 0, 24)).toMatchObject({ status: 'computed', totalWeight: 0 });
  });
  it('does not access item0 and rejects out-of-table references even under feather override', async () => {
    const table = await importItems(fixture()), state = inventory();
    state.equipped = slot(0, 255); expect(computeSourceWeight(table, state, 0)).toMatchObject({ totalWeight: 0 });
    state.carried[29] = slot(255, 1); expect(computeSourceWeight(table, state, 0, 24)).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('255') });
    expect(computeSourceWeight(table, inventory(), -1)).toMatchObject({ status: 'unavailable' });
    state.equipped.ammo = 256; expect(computeSourceWeight(table, state, 0)).toMatchObject({ status: 'unavailable' });
  });
});
describe('exact OCS pairing authority', () => {
  it('keeps unknown or forged identities unavailable and derives copied entries from preserved bytes', async () => {
    const roster = await importCharacters(characterFixture()), table = await importItems(fixture());
    roster.source.sha256 = '79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439'; roster.source.revision = 'ocs-source-data';
    table.source.sha256 = OCS_ITEMS_SHA256; table.source.revision = 'ocs-runtime';
    roster.records[11]!.inventory[0]!.ammo = 0;
    const result = await inspectSelectionInventory(roster, table, 11);
    expect(result.weight.status).toBe('unavailable'); expect(result.inventory.carried[0]!.ammo).toBe(14);
    for (const index of [-1, 12, 1.1, NaN]) await expect(inspectSelectionInventory(roster, table, index)).rejects.toThrow('canonical');
    table.records[0]!.rawHex = '00'; await expect(inspectSelectionInventory(roster, table, 0)).rejects.toThrow('raw bytes');
  });
});
