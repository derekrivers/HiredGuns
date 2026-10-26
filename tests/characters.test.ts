import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { importCharacters } from '../src/import/characters';
import { exportRosterSelection, importRosterSelection, selectRoster } from '../src/import/roster-selection';
import { characterFixture } from './helpers/character-fixture';

describe('raw front272 character evidence', () => {
  it('reads big-endian fields across every bank, preserves complete bytes and separates action data', async () => {
    const bytes = characterFixture(), catalog = await importCharacters(bytes);
    expect(catalog.source).toEqual({ sha256: createHash('sha256').update(bytes).digest('hex'), byteLength: 16320, layout: 'front272-five-banks', revision: 'unverified' });
    expect(catalog.records).toHaveLength(60);
    const first = catalog.records[0]!, last = catalog.records[59]!;
    expect(first.text.selectionName).toBe('Authored 0'); expect(last.text.selectionName).toBe('Authored 59');
    expect(first.stats).toEqual({ fitness: 65535, physique: 300, agility: 500, experience: 0x1234, footstep: 0x2345, grunt: 0x3456 });
    expect(last).toMatchObject({ index: 11, bank: 4, offset: 16048, gender: 2, race: 59, class: 196, stats: { physique: 359 } });
    expect(first.inventory[0]).toEqual({ itemId: 1, damage: 2, ammo: 3, fourthByte: 4, rawHex: '01020304' });
    expect(first.actions[0]!.rawHex).toBe('292a2b2c'); expect(last.actions[9]!.fourthByte).toBe(255);
    expect(Buffer.from(catalog.records.map(record => record.rawHex).join(''), 'hex')).toEqual(Buffer.from(bytes));
  });
  it('snapshots input before hashing, respects subarray bounds and sanitizes display without changing raw bytes', async () => {
    const fixture = characterFixture(), outer = new Uint8Array(fixture.length + 6); outer.set(fixture, 3);
    const bytes = outer.subarray(3, -3); bytes[33] = 1;
    const expected = Buffer.from(bytes), promise = importCharacters(bytes); bytes.fill(0);
    const catalog = await promise;
    expect(catalog.records[0]!.text.selectionName).toBe('\uFFFDuthored 0');
    expect(catalog.source.sha256).toBe(createHash('sha256').update(expected).digest('hex'));
    expect(catalog.records[0]!.rawHex.slice(66, 68)).toBe('01');
  });
  it('rejects packed, legacy, truncated and trailing-byte inputs instead of guessing layouts', async () => {
    for (const size of [0, 272, 3072, 3264, 16319, 16321]) await expect(importCharacters(new Uint8Array(size))).rejects.toThrow('raw five-bank');
    await expect(importCharacters(new Uint8Array([82, 78, 67, 1]))).rejects.toThrow('Packed RNC');
  });
});

describe('source-bound preparation plans', () => {
  it('requires four explicit distinct canonical characters and preserves slot order without stats or inventory', async () => {
    const catalog = await importCharacters(characterFixture());
    const json = exportRosterSelection(catalog, [11, 3, 0, 5]);
    expect(importRosterSelection(catalog, json).characters).toEqual([11, 3, 0, 5]);
    expect(Object.keys(JSON.parse(json))).toEqual(['format', 'version', 'source', 'characters']);
    expect(json).not.toContain('inventory'); expect(json).not.toContain('fitness');
    for (const invalid of [[0, 0, 1, 2], [0, 1, 2], [0, 1, 2, 12], [0, 1, 2, -1], [0, 1, 2, 1.5], [0, 1, 2, NaN], [0, 1, 2, 3, 4], new Array<number>(4)]) expect(() => selectRoster(catalog, invalid)).toThrow();
  });
  it('rejects wrong source, mixed versions, extra fields, invalid types and oversized plans', async () => {
    const catalog = await importCharacters(characterFixture()), base = JSON.parse(exportRosterSelection(catalog, [0, 1, 2, 3]));
    const variants = [null, {}, { ...base, version: 2 }, { ...base, extra: 1 }, { ...base, characters: ['0', 1, 2, 3] }, { ...base, characters: [0, 1, 2, 2] }, { ...base, source: { ...base.source, extra: 1 } }, ...['sha256', 'revision', 'layout', 'byteLength'].map(key => ({ ...base, source: { ...base.source, [key]: 'wrong' } }))];
    for (const variant of variants) expect(() => importRosterSelection(catalog, JSON.stringify(variant))).toThrow();
    expect(() => importRosterSelection(catalog, ' '.repeat(2048))).toThrow('2 KiB');
    expect(() => importRosterSelection(catalog, 'é'.repeat(1024))).toThrow('2 KiB');
    const altered = characterFixture(); altered[16319] = 4;
    expect(() => importRosterSelection({ ...catalog, source: { ...catalog.source, sha256: createHash('sha256').update(altered).digest('hex') } }, JSON.stringify(base))).toThrow('identity mismatch');
  });
});
