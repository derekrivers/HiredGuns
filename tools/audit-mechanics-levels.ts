import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importEditorMap } from '../src/import/editor-map';
import type { Interaction, LevelCase } from './mechanics-types';

/** Static editor inventory only. A flag/sentinel is never a reachability proof. */
export async function inventoryMechanics(bytes: Uint8Array): Promise<Interaction[]> {
  const { level, report } = await importEditorMap(bytes);
  const words = level.layers[0];
  const observations: Interaction[] = [];
  const add = (mechanic: string, present: boolean, basis: string) => observations.push({
    mechanic, classification: present ? 'present-unverified' : 'inactive', basis,
  });
  const block = (w: number) => (w >>> 11) & 63;
  const hasBlock = (lo: number, hi = lo) => words.some(w => (w & 2) !== 0 && block(w) >= lo && block(w) <= hi);
  add('MOV-01', true, 'Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.');
  add('MOV-03', hasBlock(16, 19) || words.some(w => !!(w & 32) && (w >>> 28) >= 8 && (w >>> 28) <= 11), 'Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.');
  add('ENV-01', words.some(w => !!(w & 8) && [1, 2].includes((w >>> 19) & 3)), 'Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.');
  add('ENV-02', words.some(w => (w & 1) !== 0 && ((w >>> 9) & 3) === 1), 'Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.');
  add('ENV-05', report.records.doors!.some(r => r.fields.position !== 0), 'Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.');
  add('ENV-07', report.records.lifts!.some(r => r.fields.position !== 0), 'Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.');
  add('MOV-05', words.some(w => !!(w & 256)) || hasBlock(1), 'Pushable flag or push-block type observed; ability to push and required puzzle role unverified.');
  add('ENV-08', words.some(w => !!(w & 4)), 'Water presence flag observed; depth, drowning eligibility and navigable routes unverified.');
  add('ENV-09', words.some(w => !!(w & 4)) && report.metadata.waterSpeed !== 0, 'Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.');
  add('LIFE-03', words.some(w => !!(w & 4)), 'Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.');
  add('INV-04', report.counts.items! > 0, 'Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.');
  add('AI-01', hasBlock(8, 15) || report.records.monsters!.some(r => r.fields.type !== 0), 'Enemy block types or nonzero editor monster type observed. Editor/runtime monster layouts differ; graphics selectors do not count.');
  add('AI-03', report.counts.eggs! > 0, 'Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.');
  add('WORLD-02', hasBlock(3), 'Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.');
  add('ENV-10', hasBlock(6), 'Teleport block type 6 observed; destination storage and traversal unverified.');
  add('LIFE-06', hasBlock(2), 'Fitness-boost field block type 2 observed; amount and activation unverified.');
  add('WORLD-03', report.records.textTriggers!.some(r => r.fields.position !== 0), 'Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.');
  for (const mechanic of ['ENV-03', 'ENV-04', 'ENV-06', 'AI-02', 'PSI-01']) observations.push({ mechanic, classification: 'unknown', basis: 'Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.' });
  return observations;
}

export async function auditMechanicsLevels(archiveRoot: string, cataloguePath: string): Promise<LevelCase[]> {
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8')) as { location_records: { file_map_id: number; label: string; path: string; sha256: string; type_flag: number }[] };
  const root = await realpath(archiveRoot);
  const levels: LevelCase[] = [];
  for (const row of catalogue.location_records) {
    const candidate = await realpath(join(root, ...row.path.split(/[\\/]/)));
    const delta = relative(root, candidate);
    if (delta.startsWith('..') || isAbsolute(delta) || resolve(root, delta) !== candidate) throw new Error('Source path escapes archive root');
    const bytes = await readFile(candidate);
    const { report } = await importEditorMap(bytes);
    if (report.sha256 !== row.sha256) throw new Error(`Catalogue digest differs for map ${row.file_map_id}`);
    const training = row.file_map_id >= 43 && row.file_map_id <= 47;
    levels.push({ id: `map-${row.file_map_id}`, title: training ? `Training${row.file_map_id}` : `${row.file_map_id.toString().padStart(2, '0')} · ${row.label}`,
      group: training ? 'training' : [0, 2, 3].includes(row.type_flag) ? 'campaign' : 'action',
      archivePath: row.path.replaceAll('\\', '/'), sha256: report.sha256,
      revision: 'Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body',
      firstAcceptance: row.file_map_id === 43, audit: 'Static editor inventory; source sentinels/flags only; no runtime execution or required-route proof',
      acceptance: 'open', interactions: await inventoryMechanics(bytes),
      blockers: ['Reachability, targets and required/optional classification need a level-specific audit.', 'Original-level start-to-exit, environmental outcomes and recovery not accepted.'] });
  }
  return levels;
}

async function main() {
  if (process.argv.length !== 5) throw new Error('Usage: npx tsx tools/audit-mechanics-levels.ts <private archive root> <private catalogue.json> <new .local output.json>');
  const output = resolve(process.argv[4]!);
  const local = resolve('.local');
  if (!relative(local, output) || relative(local, output).startsWith('..') || isAbsolute(relative(local, output))) throw new Error('Output must be a new file under .local');
  await mkdir(resolve(output, '..'), { recursive: true });
  const parentDelta = relative(await realpath(local), await realpath(resolve(output, '..')));
  if (parentDelta.startsWith('..') || isAbsolute(parentDelta)) throw new Error('Output parent redirects outside .local');
  const levels = await auditMechanicsLevels(process.argv[2]!, process.argv[3]!);
  await writeFile(output, `${JSON.stringify({ schemaVersion: 1, scope: 'static-editor-inventory', levels }, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Inventoried ${levels.length} editor maps. No reachability, required-mechanic or gameplay acceptance inferred.\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
