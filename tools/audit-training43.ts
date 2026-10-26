import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { type Facing, type LevelData, type Position } from '../src/contracts';
import { importEditorMap, type EditorRecord } from '../src/import/editor-map';
import { resolveTraversal } from '../src/sim/traversal';
import { createWorld, stepWorld } from '../src/sim/world';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';
import { exitRoute } from '../tests/helpers/extraction-route';

export const TRAINING43_SHA256 = '646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c';
type Classification = 'required' | 'reachable-optional' | 'inactive' | 'unknown';
export interface CoverageRecord {
  kind: string; reference: string; target: unknown; classification: Classification;
  basis: string; blocker: string | null;
}
const DATA1_RELATIVE = 27936;
const key = (p: Position) => `${p.x},${p.y},${p.z}`;
const block = (w: number) => (w >>> 11) & 63;
export const itemPresent = (word: number) => (word & 255) !== 0;
export function positionAt(level: LevelData, index: number): Position {
  const { width, depth, height } = level.size;
  if (!Number.isSafeInteger(index) || index < 0 || index >= width * depth * height) throw new Error('Cell index outside grid');
  return { x: index % width, y: Math.floor(index / width) % depth, z: Math.floor(index / (width * depth)) };
}
/** Button action data is relative to map, whereas lift/door positions are relative to data1. */
export function cellReference(level: LevelData, offset: number, origin: 'map' | 'data1'): Position | null {
  const delta = offset - (origin === 'map' ? DATA1_RELATIVE : 0);
  const count = level.size.width * level.size.depth * level.size.height;
  if (!Number.isSafeInteger(delta) || delta < 0 || delta % 4 || delta / 4 >= count) return null;
  return positionAt(level, delta / 4);
}
/** Editor used flags are evidence only: executable panel dispatch does not test them. */
export function panelReference(word: number, records: readonly EditorRecord[]): CoverageRecord {
  const type = (word >>> 19) & 3, index = (word >>> 23) & 31;
  const row = records.find(r => r.index === index);
  const active = (word & 8) !== 0 && (type === 1 || type === 2);
  return { kind: 'panel-reference', reference: `buttons[${index}]`, target: { type, editorUsed: row?.fields.used ?? null },
    classification: !active ? 'inactive' : 'unknown',
    basis: 'Controls&Movement.s activate_panel table: 0/3 no-op; 1 button_in reads actionOut; 2 button_out reads actionIn. used is not checked.',
    blocker: active ? row ? 'Functional reference; reachability and action consequences need separate evidence.' : 'Missing referenced button record.' : null };
}
export function slotClassification(kind: 'lifts' | 'doors' | 'monsters', row: EditorRecord): Classification {
  // Main.s move_lifts/move_doors and MonsterMovement.s next_monster use these sentinels.
  return (kind === 'monsters' ? row.fields.type : row.fields.position) === 0 ? 'inactive' : 'unknown';
}
export function actionTarget(level: LevelData, action: number, data: number): { target: unknown; blocker: string | null } {
  if (action === 0) return { target: null, blocker: null }; // zero data is not a cell pointer
  if ([1,2,3,4,5,6,7].includes(action)) {
    const target = cellReference(level,data,'map');
    return { target, blocker: target ? null : 'Malformed map-relative cell reference.' };
  }
  if ([9,10,11,12].includes(action)) {
    const index = (data - 9294) / 10;
    return { target: Number.isInteger(index) && index >= 0 && index < 32 ? { table:'lifts', index } : null,
      blocker: Number.isInteger(index) && index >= 0 && index < 32 ? null : 'Malformed lift-record reference.' };
  }
  return { target: { action, data }, blocker: 'Action interpretation outside this bounded audit.' };
}

export async function auditTraining43(bytes: Uint8Array) {
  const { level, report } = await importEditorMap(bytes);
  if (report.sha256 !== TRAINING43_SHA256) throw new Error('Training43 source digest mismatch');
  const coverage: CoverageRecord[] = [];
  const words = level.layers[0];
  const add = (kind: string, reference: string, target: unknown, classification: Classification, basis: string, blocker: string | null = null) => coverage.push({kind,reference,target,classification,basis,blocker});
  // Reproduce the unchanged browser route procedure, then validate every command in the full world.
  let world = createWorld(level);
  const initial = structuredClone(world);
  const routes = [];
  const checkpoints = [];
  for (const id of [3,2,1,0]) {
    const route = exitRoute(level,world,id);
    for (const move of route) {
      const step = stepWorld(level,world,[{mercenaryId:id,action:move.action}]);
      if (!step.events.some(e => e.kind === (move.exits ? 'exited' : 'moved'))) throw new Error('Static route replay blocked');
      world = step.world;
    }
    const restored = await importCheckpoint(level,await exportCheckpoint(level,world));
    if (!isDeepStrictEqual(restored,world)) throw new Error('Checkpoint round-trip differs');
    checkpoints.push({ afterActor:id, exited:[...world.mission.exited], tick:world.tick });
    routes.push({ mercenaryId:id, start:initial.mercenaries[id], route });
  }
  if (world.mission.outcome !== 'complete' || !world.mission.exited.every(Boolean)) throw new Error('Full team did not complete');
  const fresh = createWorld(level);
  if (!isDeepStrictEqual(fresh,initial)) throw new Error('Retry differs from fresh start');
  let race = createWorld(level,undefined,{mode:'first-exit',timeLimit:99});
  for (const move of exitRoute(level,race,3)) race = stepWorld(level,race,[{mercenaryId:3,action:move.action}]).world;
  if (race.mission.winner !== 3 || race.mission.outcome !== 'complete') throw new Error('First-exit replay failed');
  let timeout = createWorld(level);
  timeout.tick = 59498; timeout.mission.clock = {tens:0,units:1,subticks:0};
  timeout = stepWorld(level,timeout,[]).world;
  if (timeout.mission.outcome !== 'failed') throw new Error('Timeout boundary failed');
  await importCheckpoint(level,await exportCheckpoint(level,timeout));
  for (const [id,start] of level.starts.entries()) add('start',`starts[${id}]`,start,'required','createWorld standing predicate; full-team command replay with current occupancy.');
  add('exit','type-3 block bump',level.exit,'required','Replayed all-four cooperative route and first-exit winner. Header alone is not activation.');

  // Union of dry standing cells from starts, with other actors assumed able to vacate.
  // This is an approach search, not a simultaneous team traversal proof.
  const queue: Position[] = [...level.starts], seen = new Set(queue.map(key));
  const wetFrontiers: {from:Position;direction:Facing;target:Position;reason:string}[] = [];
  for (let cursor=0; cursor<queue.length; cursor++) for (const direction of [0,1,2,3] as Facing[]) {
    const from = queue[cursor]!, step = resolveTraversal(level,{...from,facing:0},direction);
    const index = (step.target.z * level.size.depth + step.target.y) * level.size.width + step.target.x;
    if (step.reason && step.target.x>=0 && step.target.x<23 && step.target.y>=0 && step.target.y<23 && step.target.z>=0 && step.target.z<20 && (words[index]! & 4)) wetFrontiers.push({from,direction,target:step.target,reason:step.reason});
    if (step.reason || seen.has(key(step.target))) continue;
    seen.add(key(step.target)); queue.push(step.target);
  }
  const referenced = new Set<number>();
  words.forEach((word,index) => {
    const p=positionAt(level,index), reference=`cell[${index}]`;
    if (word & 8) {
      referenced.add((word>>>23)&31);
      const record=panelReference(word,report.records.buttons!);
      coverage.push({...record,reference,target:{position:p,word,reference:record.reference,...record.target as object}});
    }
    if (word & 4) add('water',reference,{position:p,words:level.layers.map(l=>l[index]),frontiers:wetFrontiers.filter(f=>key(f.target)===key(p))},'unknown','Presence/type decoded; dry-to-wet stair approach exists. Main.s player_fall and drowning effects are not a static route.','Whole-region traversal and environmental outcome require executable wet-entry observation.');
    if ((word&32) && (word>>>28)>=8 && (word>>>28)<=11 || (word&2) && block(word)>=16 && block(word)<=19) add('stairs',reference,{position:p,word},'reachable-optional','Controls&Movement.s move/callers: paired ascent/descent; wet destination from reachable dry approach. Static exit replay bypasses pair.','Reachable optional interaction blocks complete-level acceptance; wet execution unsupported.');
    if ((word&2) && block(word)===7) add('lift-hydraulic',reference,{position:p,word},'inactive','Block7 geometry does not enable lift; every lift record has zero position.');
    if ((word&2) && block(word)===4 && seen.has(key({...p,z:p.z+2}))) add('two-level-support',reference,{position:p,word},'reachable-optional','Reachable dry pose two cells above block4; shared obstruction predicate supplies support.');
    if (itemPresent(level.layers[2][index]!)) add('item',reference,{position:p,word:level.layers[2][index]},'unknown','Item low byte is presence, unlike stale upper flags.','Live item behavior outside bounded navigation.');
  });
  for (const row of report.records.buttons!.filter(r=>r.nonzero || referenced.has(r.index))) {
    const functional = words.some(w => (w&8) && [1,2].includes((w>>>19)&3) && ((w>>>23)&31)===row.index);
    for (const direction of ['In','Out'] as const) {
      const action=row.fields[`action${direction}`]!,data=row.fields[`data${direction}`]!;
      const target=actionTarget(level,action,data);
      if (action===5 && target.target && !target.blocker) {
        const p=target.target as Position, w=words[(p.z*23+p.y)*23+p.x]!;
        target.target={position:p,word:w,eligibleBlockOff:!!(w&2) && block(w)!==1 && block(w)<=6};
      }
      add('button-action',`buttons[${row.index}].action${direction}`,{editorUsed:row.fields.used,action,data,...target},functional?'unknown':'inactive',`Both directions retained. Panel type0 dispatch cannot invoke record; used alone is not runtime authority. Source button_${direction==='In'?'out':'in'} reads this direction.`,target.blocker);
    }
  }
  for (const kind of ['lifts','doors','monsters'] as const) for (const row of report.records[kind]!) if (row.nonzero) add(kind,`${kind}[${row.index}]`,row.fields,slotClassification(kind,row),'Zero position skips lift/door; zero type skips monster. Editor monster stride is not runtime stride.',slotClassification(kind,row)==='unknown'?'Nonzero active sentinel requires separate cell/reference and runtime-layout validation.':null);
  add('enemy-inventory','all editor monster records',{nonzero:report.counts.monstersNonzeroRecords,graphics:report.metadata.monsterGraphics},report.counts.monstersNonzeroRecords?'unknown':'inactive','No nonzero editor records; graphics selector alone is not enemy presence. Runtime22-byte table not parsed as editor16.');
  add('item-inventory','all item cells',{count:report.counts.items},report.counts.items?'unknown':'inactive','Layer3 low byte only; upper nonzero question/texture flags are not items.');
  return {schemaVersion:1,sourceDigest:report.sha256,baseline:'68e689b525b4c949c8f1ac587f1d47d02064c262',scope:'editor Training43; source-only deductions; no original playthrough',coverage:coverage.map(record=>({sourceDigest:report.sha256,...record})),
    starts:report.starts,routes,checkpoints,mission:{cooperative:world.mission,firstExit:race.mission,timeout:timeout.mission,retryFresh:true},
    dryApproaches:queue,wetFrontiers,sourceCounts:report.counts,waterSettings:Object.fromEntries(Object.entries(report.metadata).filter(([k])=>/water/i.test(k))),
    nextObservation:{owner:'one serialized binary/simulation evidence worker',input:'Pinned OCS executable drown helper Main.s600-645/file0x1a676; eligible nonimmune actor on this wet-entry type2 cell; copied selected stats and inventory; underwater counts immediately below/at/above computed threshold, including DIVU overflow/sign boundaries',output:'Original instruction trace and threshold/counter values; damage_fitness call or no call and supplied damage. Intercepted death is explicitly outside this arithmetic observation; no full environmental outcome inferred',reference:wetFrontiers,blocker:'Existing isolated immunity/item cases do not resolve wet-entry threshold/death ordering. No live implementation nominated until this observation.'},
    limits:['No runtime map equality: compare only map43 with private recovery diagnostics.','Approach BFS ignores other actor occupancy; only exit replay proves full-team path.','Water region unknown; do not turn water off or call hypothetical paths a playthrough.','All-dead/control participant semantics remain source-only; current live world has no original death.','Current checkpoint covers static actors only; future wet/death/map/inventory/RNG must restore atomically and pause.']};
}

async function main() {
  if (process.argv.length !== 3) throw new Error('Usage: npx tsx tools/audit-training43.ts <private Training43 editor file>');
  const result=await auditTraining43(await readFile(process.argv[2]!));
  const root=await realpath(process.cwd()),local=resolve(root,'.local'),directory=resolve(local,'training43');
  await mkdir(directory,{recursive:true});
  if (relative(root,await realpath(local))!=='.local' || relative(local,await realpath(directory))!=='training43') throw new Error('Private output directory redirects outside workspace');
  const output=resolve(directory,'coverage.json');
  await writeFile(output,`${JSON.stringify(result,null,2)}\n`,{flag:'wx'});
  process.stderr.write('Wrote private .local/training43/coverage.json (exclusive create).\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error:unknown)=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
