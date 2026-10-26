import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CELL_COUNT, EDITOR_MAP_BYTES, importEditorMap, LAYER_OFFSETS } from '../src/import/editor-map';

function fixture() { return new Uint8Array(EDITOR_MAP_BYTES); }
describe('bounded editor map import', () => {
  it('rejects truncated, extended and unrelated content lengths', async () => {
    for (const n of [0, 541, 28478, EDITOR_MAP_BYTES - 1, EDITOR_MAP_BYTES + 1]) await expect(importEditorMap(new Uint8Array(n))).rejects.toThrow('exactly 157738');
  });
  it('reads unsigned big-endian words, retaining x/y/z order and all boundary cells', async () => {
    const b = fixture(); const v = new DataView(b.buffer);
    for (const [layer, offset] of LAYER_OFFSETS.entries()) {
      for (const index of [0, 22, 23, 528, 529, CELL_COUNT - 1]) v.setUint32(offset + index * 4, 0x80000000 + layer * 100000 + index, false);
    }
    const { level, report } = await importEditorMap(b);
    for (const [layer, cells] of level.layers.entries()) for (const index of [0,22,23,528,529,CELL_COUNT - 1]) expect(cells[index]).toBe(0x80000000 + layer * 100000 + index);
    expect(level.layers.map(a => a.length)).toEqual([10580,10580,10580]);
    expect(report.sha256).toBe(createHash('sha256').update(b).digest('hex'));
    expect(level.id).toBe(`editor-${report.sha256}`);
  });
  it('respects input views and snapshots input before hashing', async () => {
    const outer = new Uint8Array(EDITOR_MAP_BYTES + 8).fill(255);
    const b = outer.subarray(4, -4); b.fill(0);
    const expected = createHash('sha256').update(b).digest('hex');
    const pending = importEditorMap(b); b.fill(255);
    const { level, report } = await pending;
    expect(report.sha256).toBe(expected); expect(level.layers[0][0]).toBe(0);
  });
  it('rejects coordinates at each upper bound and accepts last valid coordinates', async () => {
    for (const [delta, value] of [[0,23],[1,23],[2,20]] as const) {
      for (const base of [670,673,676,679,682]) { const b = fixture(); b[base + delta] = value; await expect(importEditorMap(b)).rejects.toThrow('outside 23x23x20'); }
    }
    const b = fixture(); b.set([22,22,19],670); b.set([22,22,19],682);
    const { level } = await importEditorMap(b); expect(level.starts[0]).toEqual({x:22,y:22,z:19,facing:0}); expect(level.exit).toEqual({x:22,y:22,z:19});
  });
  it('decodes editor records at independently specified offsets, not runtime monster stride', async () => {
    const b = fixture(); const v = new DataView(b.buffer);
    v.setUint32(6888 + 127 * 16, 0xfedcba98, false);
    b[6888 + 127 * 16 + 13] = 19;
    b[8940] = 255; b[8941] = 18; v.setUint32(8944,0x12345678,false);
    v.setUint16(10730,0x9876,false); v.setUint32(10732,0xfedcba98,false);
    const {report} = await importEditorMap(b);
    expect(report.records.monsters![127]!.fields).toMatchObject({type:0xfedcba98,z:19});
    expect(report.records.buttons![0]!.fields).toMatchObject({used:255,actionIn:18,dataIn:0x12345678});
    expect(report.records.pushables![31]!.fields).toEqual({position:0x9876,cell:0xfedcba98});
    expect(report.counts.monstersNonzeroRecords).toBe(1);
  });
  it('preserves all bytes including opaque metadata, safety nets and trailing byte', async () => {
    const b = fixture();
    for (const offset of [0,541,542,669,695,3270,6887,8939,10156,10542,10736,28017,70798,71717,114038,114957,157278,157737]) b[offset] = 0x9d;
    const {level,report} = await importEditorMap(b);
    const rebuilt = fixture();
    for (const range of report.preservedRanges) rebuilt.set(Buffer.from(range.hex,'hex'),range.offset);
    const v = new DataView(rebuilt.buffer);
    level.layers.forEach((cells, layer) => cells.forEach((word,i) => v.setUint32(LAYER_OFFSETS[layer]! + i*4,word,false)));
    expect(rebuilt).toEqual(b);
    expect(report.campaignTravelEnabled).toBe(false);
    expect(level.source.revision).toBe('unverified-editor');
  });
  it('reports unsupported mechanics and distinguishes missing floor from obstruction', async () => {
    const b = fixture(); const v = new DataView(b.buffer); v.setUint32(28478,4|8|16|32|256,false); v.setUint32(114958,7,false);
    const {level, report} = await importEditorMap(b);
    expect(level.unsupportedMechanics).toContain('water:1'); expect(level.unsupportedMechanics).toContain('items:1');
    expect(report.starts[0]).toMatchObject({explicitFloor:false,obstructed:false,belowWord:null});
  });
  it('inventories eggs by auxiliary presence/type even with a zero hatch timer', async () => {
    const b = fixture(); const v = new DataView(b.buffer);
    // Closed egg with timer zero; closed egg with timer seven; open egg;
    // unrelated auxiliary type; stale timer without auxiliary presence.
    v.setUint32(28478, 0x20, false);
    v.setUint32(28482, 0x20, false); v.setUint32(71722, 7 << 20, false);
    v.setUint32(28486, 0x10000020, false);
    v.setUint32(28490, 0xf0000020, false); v.setUint32(71730, 9 << 20, false);
    v.setUint32(71734, 11 << 20, false);
    const { level, report } = await importEditorMap(b);
    expect(report.counts.eggs).toBe(2);
    expect(report.counts.auxiliary).toBe(4);
    expect(level.unsupportedMechanics).toContain('eggs:2');
    expect(level.layers[1].slice(0, 5)).toEqual([0,7 << 20,0,9 << 20,11 << 20]);
  });
});
