import type { LevelData, Position, Spawn } from '../contracts';

export const EDITOR_MAP_BYTES = 157738;
export const CELL_COUNT = 10580;
export const LAYER_OFFSETS = [28478, 71718, 114958] as const;
const MAP = 542;

export interface PreservedRange { name: string; offset: number; length: number; hex: string }
export interface EditorRecord {
  index: number; offset: number; rawHex: string; nonzero: boolean;
  fields: Record<string, number>;
}
export interface ImportReport {
  format: 'hired-guns-editor-map'; version: 1; sourceBytes: number; sha256: string;
  coordinateConvention: 'x-fastest-y-south-z-up'; campaignTravelEnabled: false;
  metadata: Record<string, number | string | number[]>;
  records: Record<string, EditorRecord[]>;
  preservedRanges: PreservedRange[];
  counts: Record<string, number>;
  starts: { position: Position; word: number; belowWord: number | null; explicitFloor: boolean; obstructed: boolean }[];
  warnings: string[];
}

/** Bounded parser of the development editor format, not the packed runtime map. */
export async function importEditorMap(input: Uint8Array): Promise<{ level: LevelData; report: ImportReport }> {
  if (input.byteLength !== EDITOR_MAP_BYTES) throw new Error(`Editor map must be exactly ${EDITOR_MAP_BYTES} bytes; got ${input.byteLength}`);
  // Snapshot before asynchronous hashing; caller mutations cannot change the parsed revision.
  const bytes = new Uint8Array(input);
  const view = new DataView(bytes.buffer);
  const bounds = (offset: number, length: number) => {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > bytes.length) throw new Error(`Read outside editor map: ${offset}+${length}`);
  };
  const u8 = (o: number) => { bounds(o, 1); return view.getUint8(o); };
  const u16 = (o: number) => { bounds(o, 2); return view.getUint16(o, false); };
  const u32 = (o: number) => { bounds(o, 4); return view.getUint32(o, false); };
  const hex = (o: number, n: number) => { bounds(o, n); return Array.from(bytes.subarray(o, o + n), b => b.toString(16).padStart(2, '0')).join(''); };
  const text = (o: number, n: number) => { bounds(o, n); let result = ''; for (const b of bytes.subarray(o, o + n)) { if (!b) break; result += String.fromCharCode(b); } return result; };
  const position = (o: number, label: string): Position => {
    const p = { x: u8(o), y: u8(o + 1), z: u8(o + 2) };
    if (p.x >= 23 || p.y >= 23 || p.z >= 20) throw new Error(`${label} outside 23x23x20 source grid: ${JSON.stringify(p)}`);
    return p;
  };
  const starts = [0, 1, 2, 3].map(i => ({ ...position(MAP + 128 + i * 3, `start ${i + 1}`), facing: 0 })) as [Spawn, Spawn, Spawn, Spawn];
  const exit = position(MAP + 140, 'exit');
  const layers = LAYER_OFFSETS.map(o => Array.from({ length: CELL_COUNT }, (_, i) => u32(o + i * 4))) as LevelData['layers'];
  const records: ImportReport['records'] = {};
  type Field = readonly [string, number, 1 | 2 | 4];
  const table = (name: string, relative: number, size: number, count: number, fields: readonly Field[]) => {
    records[name] = Array.from({ length: count }, (_, index) => {
      const offset = MAP + relative + index * size;
      bounds(offset, size);
      return { index, offset, rawHex: hex(offset, size), nonzero: bytes.subarray(offset, offset + size).some(Boolean), fields: Object.fromEntries(fields.map(([key, delta, width]) => [key, width === 1 ? u8(offset + delta) : width === 2 ? u16(offset + delta) : u32(offset + delta)])) };
    });
  };
  table('explosions', 154, 16, 32, [['position',0,2],['direction',2,1],['speed',3,1],['count',4,1],['and',6,4],['or',10,4],['damage',14,2]]);
  table('textTriggers', 2970, 6, 50, [['position',0,4],['messageOffset',4,2]]);
  table('monsters', 6346, 16, 128, [['type',0,4],['memory',4,4],['health',8,2],['direction',10,1],['x',11,1],['y',12,1],['z',13,1],['count',14,1]]);
  table('buttons', 8398, 28, 32, [['used',0,1],['actionIn',1,1],['actionOut',2,1],['dataIn',4,4],['dataOut',8,4]]);
  table('lifts', 9294, 10, 32, [['position',0,2],['height',2,1],['minHeight',3,1],['maxHeight',4,1],['direction',5,1],['weight',6,1],['up',7,1],['down',8,1],['automove',9,1]]);
  table('doors', 9616, 12, 32, [['position',0,2],['trigger',2,1],['direction',3,1],['type',4,4],['delay',8,1],['count',9,1],['key',10,1],['buttonOnly',11,1]]);
  table('pushables', 10002, 6, 32, [['position',0,2],['cell',2,4]]);
  const preservedRanges: PreservedRange[] = [];
  const preserve = (name: string, offset: number, length: number) => preservedRanges.push({ name, offset, length, hex: hex(offset, length) });
  // These ranges plus the three unsigned word arrays preserve every source byte.
  preserve('location-and-map-metadata-objects-artwork-reserved', 0, LAYER_OFFSETS[0]);
  preserve('layer1-tail-and-layer2-head-safety-nets', 70798, 920);
  preserve('layer2-tail-and-layer3-head-safety-nets', 114038, 920);
  preserve('layer3-tail-safety-net', 157278, 460);
  const counts: Record<string, number> = {};
  for (const [label, mask] of [['floor',1],['block',2],['water',4],['panel',8],['explosion',16],['auxiliary',32],['opaque',64],['invisible',128],['pushable',256]] as const) counts[label] = layers[0].filter(v => (v & mask) !== 0).length;
  counts.items = layers[2].filter(v => (v & 255) !== 0).length;
  counts.eggs = layers[1].filter(v => (v >>> 20) !== 0).length;
  for (const [label, rows] of Object.entries(records)) counts[`${label}NonzeroRecords`] = rows.filter(r => r.nonzero).length;
  const unsupportedMechanics = ['campaign-travel-unverified-revision', 'source-start-facing-unspecified', 'source-exit-semantics-unverified', 'source-cell-behavior-unverified'];
  for (const [label, count] of Object.entries(counts)) if (count && !['floor','block','opaque'].includes(label)) unsupportedMechanics.push(`${label}:${count}`);
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const title = text(MAP + 8, 120);
  const level: LevelData = { schemaVersion: 1, id: `editor-${sha256}`, name: title || `Editor map ${u8(526)}`, source: { kind: 'editor-map', sha256, revision: 'unverified-editor' }, size: { width: 23, depth: 23, height: 20 }, layers, starts, exit, unsupportedMechanics };
  return { level, report: {
    format: 'hired-guns-editor-map', version: 1, sourceBytes: bytes.length, sha256,
    coordinateConvention: 'x-fastest-y-south-z-up', campaignTravelEnabled: false,
    metadata: { title, mapId: u8(526), players: u8(8), typeFlag: u8(9), disk: u8(525), picture: u8(527), music: u8(528), atmosphere: u8(529), monsterGraphics: [u8(530),u8(531)], sky: u8(532), style: u8(533), destinations: [u16(534),u16(536),u16(538),u16(540)], timeLimit: u8(MAP + 143), waterLevel: u16(MAP + 144), lowWaterLevel: u16(MAP + 146), highWaterLevel: u16(MAP + 148), waterSpeed: u16(MAP + 152) },
    records, preservedRanges, counts,
    starts: starts.map(p => { const index = (p.z * 23 + p.y) * 23 + p.x; const word = layers[0][index]!; return { position: { x:p.x,y:p.y,z:p.z }, word, belowWord: p.z ? layers[0][index - 529]! : null, explicitFloor: (word & 1) !== 0, obstructed: (word & 66) !== 0 }; }),
    warnings: ['No original gameplay parity or start walkability is asserted. Facing defaults to north; editor starts contain no facing.', 'All object slots are retained, including inactive/stale slots. Nonzero is not an active-object predicate.', 'Editor monsters are 128 x 16 bytes; OCS runtime monster records are 22 bytes and cannot be parsed as this table.', 'Preserved opaque bytes include location strings/control codes, artwork, messages, sentinels, padding and safety nets. They are not executed.', 'Campaign travel disabled: reconstructed Locations CRC df31 differs from archived 5c21.', 'All cell words retained; floor/block bits alone do not implement stairs, support from below, falling, water, doors or other original behavior.'],
  } };
}
