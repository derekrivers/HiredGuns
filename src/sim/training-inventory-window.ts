import {emptyInventoryTemp,inventoryEntry,type InventoryWindowAction} from '../items/inventory-window';
import type {InventorySlot} from '../import/characters';
import type {Action,LevelData,MissionRules,PlayerCommand,WorldState} from '../contracts';
import {importEditorMap} from '../import/editor-map';
import {importCharacters} from '../import/characters';
import {createTrainingSession,type TrainingSession,type TrainingSources,type TrainingCandidate} from './training-session';
import {initialTimeout,type TimeoutRecoveryControl} from './training-timeout';
import {stepInventoryWindowLifecycle} from './training-wet-lifecycle';
import {TRAINING_43_SHA256} from './mission-profile';
import {wetSnapshot,rawSnapshot} from './training-wet';
import {equalConsumableState as equal} from './training-consumables';
import {createWorld} from './world';

export const INVENTORY_WINDOW_PROFILE='one-native-inventory-window-cycle-v1';
export const INVENTORY_WINDOW_SCENARIO='training43-inventory-window-cycle-v1';
export const INVENTORY_WINDOW_LIMITS=Object.freeze({ticks:59499,packed:256,expanded:513,bytes:24576});
export interface InventoryWindowEvent {count:number;codes:number[]}
export interface TrainingInventoryWindow {profile:typeof INVENTORY_WINDOW_PROFILE;history:InventoryWindowEvent[];outcome:string|null;lastPositions:number[];tempEntries:InventorySlot[];phase:InventoryWindowPhase;recipient:number|null;windowOutcomes:('applied'|'caller-guard')[]}
export type InventoryWindowPhase='waiting'|'ready'|'opened'|'closed';
export interface InventoryWindowOperation {kind:'storage'|InventoryWindowAction;actor:number}
const actions:Action[]=['forward','backward','strafe-left','strafe-right','turn-left','turn-right'];
const fail=(why:string):never=>{throw Error(`Inventory window refused atomically: ${why}`);};
/** Absent is the only fallback. Any present malformed marker refuses before v19. */
export function hasInventoryWindow(session:TrainingSession|null):boolean{
 if(!session)return false;
 if(Object.getPrototypeOf(session)!==Object.prototype)fail('session prototype');
 if(!('inventoryWindow'in session))return false;
 const d=Object.getOwnPropertyDescriptor(session,'inventoryWindow');
 if(!d?.enumerable||!Object.hasOwn(d,'value')||!d.value||Object.getPrototypeOf(d.value)!==Object.prototype)fail('profile data owner');
 const p=Object.getOwnPropertyDescriptor(d!.value,'profile');
 if(!p?.enumerable||!Object.hasOwn(p,'value')||p.value!==INVENTORY_WINDOW_PROFILE)fail('profile discriminator');
 return true;
}
function owner(s:TrainingSession){
 if(Object.keys(s).sort().join(',')!=='encounter,encounterGun,gate,ground,indices,inventory,inventoryWindow,items,names,patrol,team,wet,wetLifecycle,wetParty')fail('session fields');
 if(!hasInventoryWindow(s)||Object.keys(s.inventoryWindow!).sort().join(',')!=='history,lastPositions,outcome,phase,profile,recipient,tempEntries,windowOutcomes'||s.wetParty?.profile!=='four-controlled-timeout-v1'||Object.getOwnPropertyDescriptor(s,'wetRegion')||!s.wet||!s.wetLifecycle||s.wet.history.length)fail('profile fields/owner');
 policy(s.wet!.rules);windowMetadata(s.inventoryWindow!,s.wet!.actors);
 if(s.wet!.actors.length!==4||s.inventory.actors.length!==4||s.items.records.length!==114||s.items.records.some((r,i)=>r.itemId!==i+1||!Number.isInteger(r.category)||r.category<0||r.category>255||!Number.isInteger(r.weight)||r.weight<0||r.weight>65535))fail('complete party/catalog');
 for(const [i,a]of s.wet!.actors.entries()){
  if(Object.keys(a.body).sort().join(',')!=='controlMethod,drowningIndicator,fitness,inventory,physique,race,spellWater,spellWings,statsDeadWord,underwaterCount,weight,windowType'||Object.keys(a.body.inventory).sort().join(',')!=='actions,carried,equipped'||a.body.inventory.carried.length!==30||a.body.inventory.actions.length!==10||s.inventory.actors[i]!.selection!==0)fail('body/inventory owner');
  for(const slot of [a.body.inventory.equipped,...a.body.inventory.carried,...a.body.inventory.actions]){
   const bytes=[slot.itemId,slot.damage,slot.ammo,slot.fourthByte];
   if(Object.keys(slot).sort().join(',')!=='ammo,damage,fourthByte,itemId,rawHex'||!bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||slot.itemId>114||slot.rawHex!==bytes.map(n=>n.toString(16).padStart(2,'0')).join(''))fail('complete raw inventory entry');
  }
 }
}
function windowMetadata(p:TrainingInventoryWindow,actors:NonNullable<TrainingSession['wet']>['actors']){
 if(p.lastPositions.length!==4||!p.lastPositions.every(n=>Number.isInteger(n)&&n>=0&&n<=29))fail('last positions');
 if(p.lastPositions.some(n=>n!==0))fail('fixed-selection last positions');
 encodeInventoryWindowHistory(p.history);
 if(p.history.some((e,i,h)=>i>0&&equal(e.codes,h[i-1]!.codes)))fail('noncanonical expanded history');
 const special=p.history.flatMap(e=>e.codes.filter(n=>n>=24)),attempted=special.length>0,outcome=p.outcome;
 const phase:InventoryWindowPhase=special.length===3?'closed':special.length===2?'opened':outcome==='transferred'?'ready':'waiting';
 if(p.phase!==phase||p.recipient!==(outcome==='transferred'?special[0]!-24:null)||p.tempEntries.length!==4||p.windowOutcomes.length!==Math.max(0,special.length-1)||!p.windowOutcomes.every(n=>['applied','caller-guard'].includes(n)))fail('derived phase/recipient/outcomes');
 for(const t of p.tempEntries){inventoryEntry(t);if(t.rawHex!=='00000000')fail('source variable-clear temp history');}
 if(special.length>1&&outcome!=='transferred')fail('cycle requires successful transfer');
 const windowOpen=p.windowOutcomes[0]==='applied'&&p.windowOutcomes[1]!=='applied';
 if(actors.some((a,i)=>a.body.windowType!==(windowOpen&&i===p.recipient?1:0)))fail('derived window');
 if(attempted?!['caller-guard','already-too-heavy','profile-refusal','empty-corpse','transferred'].includes(outcome!):outcome!==null)fail('derived outcome domain');
}
/** A public caller cannot use stepping to repair a forged derived mirror. */
function mirrors(s:TrainingSession){
 owner(s);
 if(Object.keys(s.inventory).sort().join(',')!=='actors,commands'||s.inventory.commands.length)fail('derived inventory fields');
 for(const [i,a]of s.wet!.actors.entries())if(!equal(s.inventory.actors[i],{inventory:a.body.inventory,weight:{...a.body.weight,status:'verified'},selection:0}))fail('derived inventory mirror');
}
function policy(r:MissionRules){if(!r||Object.keys(r).sort().join(',')!=='mode,timeLimit'||r.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(r.mode))fail('original99 rules');}
/** Structural authority checks precede runtime callback-reference reads. Raw
 * equality and complete derived-state comparisons follow source reconstruction. */
function authority(level:LevelData,indices:readonly number[],rules:MissionRules){
 policy(rules);
 if(!Array.isArray(indices)||indices.length!==4||new Set(indices).size!==4||!indices.every(i=>Number.isInteger(i)&&i>=0&&i<12))fail('selected indices');
 if(!level||level.source?.kind!=='editor-map'||level.source.sha256!==TRAINING_43_SHA256||!Array.isArray(level.layers)||level.layers.length!==3)fail('source map');
}
function events(input:unknown):InventoryWindowEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>INVENTORY_WINDOW_LIMITS.expanded)return fail('expanded budget');let total=0;const specials:number[]=[];
 for(const e of data){
  if(!e||Object.keys(e).sort().join(',')!=='codes,count'||!Number.isSafeInteger(e.count)||e.count<1||!Array.isArray(e.codes)||e.codes.length>4)fail('event fields');
  total+=e.count;if(total>INVENTORY_WINDOW_LIMITS.ticks)fail('tick budget');
  for(const [j,n]of e.codes.entries())if(!Number.isInteger(n)||n<0||n>35||(j>0&&n<=e.codes[j-1])||n<24&&e.codes.some((m:number,k:number)=>k!==j&&m<24&&Math.floor(m/6)===Math.floor(n/6)))fail('command codes/order');
  if(e.codes.some((n:number)=>n>=24)){if(e.count!==1||e.codes.length!==1)fail('sole special count1');specials.push(e.codes[0]!);const j=specials.length-1;if(j>2||Math.floor(e.codes[0]!/4)!==6+j||(j>0&&e.codes[0]!%4!==specials[0]!%4))fail('storage/open/close order and recipient');}
 }
 return data as InventoryWindowEvent[];
}
export function encodeInventoryWindowHistory(input:readonly InventoryWindowEvent[]):number[][]{
 const result:number[][]=[];let idle=0;
 for(const e of events(input)){
  if(!e.codes.length){idle+=e.count;continue;}
  const last=result.at(-1);
  if(!idle&&e.codes[0]!<24&&last&&equal(last.slice(2),e.codes))last[1]!+=e.count;
  else result.push([idle,e.count,...e.codes]);idle=0;
 }
 if(idle)result.push([idle,0]);if(result.length>INVENTORY_WINDOW_LIMITS.packed)fail('packed budget');return result;
}
export function decodeInventoryWindowHistory(input:unknown):InventoryWindowEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>INVENTORY_WINDOW_LIMITS.packed)return fail('packed budget');
 const result:InventoryWindowEvent[]=[];let total=0;
 for(const [i,t]of data.entries()){
  if(!Array.isArray(t)||t.length<2||t.length>6||!t.every(n=>Number.isSafeInteger(n)&&n>=0))fail('tuple fields');
  const [idle,count]=t as number[];total+=idle!+count!;if(total>INVENTORY_WINDOW_LIMITS.ticks)fail('tick budget');
  if(!count){if(i!==data.length-1||!idle||t.length!==2)fail('trailing idle');}else if(t.length===2)fail('missing command');
  if(idle)result.push({count:idle!,codes:[]});if(count)result.push({count:count!,codes:t.slice(2)});
 }
 const h=events(result);if(!equal(encodeInventoryWindowHistory(h),data))fail('noncanonical history');return h;
}
function initial(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate{
 const {inventoryWindow:_pickup,...clean}=baseline;void _pickup;
 const c=initialTimeout(level,clean,races,rules);
 c.session={...c.session,inventoryWindow:{profile:INVENTORY_WINDOW_PROFILE,history:[],outcome:null,lastPositions:[0,0,0,0],tempEntries:Array.from({length:4},emptyInventoryTemp),phase:'waiting',recipient:null,windowOutcomes:[]}};serializeOwned(c);return c;
}
export function resetInventoryWindow(level:LevelData,session:TrainingSession,rules?:MissionRules):TrainingSession{
 const saved=wetSnapshot({level,session,...(rules?{rules}:{})});owner(saved.session);
 return initial(saved.level,saved.session,saved.session.wet!.actors.map(a=>a.body.race),saved.rules??saved.session.wet!.rules).session;
}
function serializeOwned(c:TrainingCandidate):string{
 owner(c.session);if(c.session.inventoryWindow!.history.reduce((n,e)=>n+e.count,0)!==c.world.tick||!equal(c.session.wet!.rules,c.world.mission.rules))fail('world/history/rules');const {history:_history,...state}=c.session.wet!;void _history;
 const p=c.session.inventoryWindow!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:22,scenario:INVENTORY_WINDOW_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodeInventoryWindowHistory(p.history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle,party:c.session.wetParty,inventoryWindow:{profile:p.profile,outcome:p.outcome,lastPositions:p.lastPositions,tempEntries:p.tempEntries,phase:p.phase,recipient:p.recipient,windowOutcomes:p.windowOutcomes}}});
 if(new TextEncoder().encode(json).length>=INVENTORY_WINDOW_LIMITS.bytes)fail('future save byte budget');return json;
}
export function serializeInventoryWindow(c:TrainingCandidate){const captured=wetSnapshot(c);mirrors(captured.session);return serializeOwned(captured);}
function codes(commands:readonly PlayerCommand[],operation:InventoryWindowOperation|null){
 if(operation!==null&&(!operation||Object.keys(operation).sort().join(',')!=='actor,kind'||!Number.isInteger(operation.actor)))fail('operation data');
 const actor=operation?.actor??null;
 if(actor!==null){if(!operation||Object.keys(operation).sort().join(',')!=='actor,kind'||!['storage','open','close'].includes(operation.kind)||!Number.isInteger(actor)||actor<0||actor>3||commands.length)fail('sole operation command');return [(operation!.kind==='storage'?24:operation!.kind==='open'?28:32)+actor];}
 const result=commands.map(c=>{if(!c||Object.keys(c).sort().join(',')!=='action,mercenaryId'||!Number.isInteger(c.mercenaryId)||c.mercenaryId<0||c.mercenaryId>3||!actions.includes(c.action))fail('navigation command');return c.mercenaryId*6+actions.indexOf(c.action);}).sort((a,b)=>a-b);
 events([{count:1,codes:result}]);return result;
}
/** Prospective full tick; only the returned pair may be installed by Main. */
export function stepInventoryWindow(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],operation:InventoryWindowOperation|null=null){
 const s=wetSnapshot({level,session,world,commands,operation});mirrors(s.session);return stepOwned(s.level,s.session,s.world,s.commands,s.operation);
}
/** Internal Main entry: sole-owned committed pair, immutable imported geometry,
 * and router-created commands. No await/runtime callback occurs here. The core
 * still clones mutable candidates and performs every prospective save check. */
export function advanceOwnedInventoryWindow(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],operation:InventoryWindowOperation|null){
 return stepOwned(level,session,world,commands,operation);
}
/** Only call-time-owned or reconstructed inputs reach this internal entry. It
 * still performs every ordinary tick, admission and full prospective budget. */
function stepOwned(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],operation:InventoryWindowOperation|null){
 const s={level,session,world,commands,operation};owner(s.session);
 if(!equal(s.session.wet!.rules,s.world.mission.rules))fail('world/body rules');
 if(s.session.inventoryWindow!.history.reduce((n,e)=>n+e.count,0)!==s.world.tick)fail('world/history tick');
 const encoded=codes(s.commands,s.operation);
 if(s.world.mission.outcome!=='active')return {session:s.session,world:s.world,events:[]};
 const p=s.session.inventoryWindow!;
 if(p.phase==='opened'&&(commands.length||operation&&operation.kind!=='close'))fail('unsupported open-window controls; idle or sole close only');
 if(operation){if(operation.kind==='storage'&&p.history.some(e=>e.codes.some(n=>n>=24)))fail('single storage attempt consumed');if(operation.kind==='open'&&(p.phase!=='ready'||p.recipient!==operation.actor))fail('one cycle requires transferred recipient');if(operation.kind==='close'&&(p.phase!=='opened'||p.recipient!==operation.actor))fail('close requires open recipient');}
 const r=stepInventoryWindowLifecycle(s.level,s.session,s.world,s.commands,s.operation);
 const history=wetSnapshot(s.session.inventoryWindow!.history),last=history.at(-1);
 if(encoded.every(n=>n<24)&&last&&equal(last.codes,encoded))last.count++;else history.push({count:1,codes:encoded});
 const outcome='pickup'in r?r.pickup as string:p.outcome;
 const next:TrainingCandidate={world:r.world,session:{...r.session,inventoryWindow:{...r.session.inventoryWindow!,history,outcome,recipient:outcome==='transferred'?(p.recipient??operation!.actor):null,phase:operation?.kind==='close'?'closed':operation?.kind==='open'?'opened':outcome==='transferred'?(p.phase==='waiting'?'ready':p.phase):'waiting'}}};
 serializeOwned(next);return {...next,events:r.events};
}
function runtime(control?:TimeoutRecoveryControl){
 const current=control?.isCurrent,progress=control?.onProgress;
 const check=()=>{if(current&&!current())fail('reconstruction cancelled');};
 return {check,report(phase:'verifying'|'replaying',processed:number,total:number){check();progress?.(Object.freeze({phase,processed,total}));check();}};
}
async function rebuild(map:LevelData,raw:Required<TrainingSources>,indices:readonly number[],rules:MissionRules,history:InventoryWindowEvent[],run:ReturnType<typeof runtime>,expectedSources?:unknown){
 policy(rules);run.report('verifying',0,history.reduce((n,e)=>n+e.count,0));
 const imported=await importEditorMap(raw.map);run.check();if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,indices);run.check();
 if(expectedSources!==undefined&&!equal(expectedSources,{map:TRAINING_43_SHA256,...baseline.session.team.sources}))fail('declared source identities');
 const roster=await importCharacters(raw.roster);run.check();
 let c=initial(imported.level,baseline.session,indices.map(i=>roster.records[i]!.race),rules),processed=0,chunk=0,start=performance.now();
 const total=history.reduce((n,e)=>n+e.count,0);run.report('replaying',0,total);
 for(const e of history)for(let n=0;n<e.count;n++){
  run.check();if(c.world.mission.outcome!=='active')fail('history after terminal');
  const code=e.codes[0]!,operation:InventoryWindowOperation|null=code>=24?{kind:code<28?'storage':code<32?'open':'close',actor:code%4}:null;
  const commands=operation===null?e.codes.map(code=>({mercenaryId:Math.floor(code/6),action:actions[code%6]!})):[];
  const r=stepOwned(imported.level,c.session,c.world,commands,operation);
  c={session:r.session,world:r.world};processed++;chunk++;
  if(chunk>=16||performance.now()-start>=8){run.report('replaying',processed,total);await new Promise<void>(resolve=>setTimeout(resolve,0));run.check();chunk=0;start=performance.now();}
 }
 run.check();if(!equal(encodeInventoryWindowHistory(c.session.inventoryWindow!.history),encodeInventoryWindowHistory(history)))fail('derived history');serializeOwned(c);run.report('replaying',processed,total);run.check();return c;
}
/** Source-only reconstruction: no saved inventory/body/result is an input. This
 * is also the bounded chronology authority used by import/export below. */
export async function reconstructInventoryWindow(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot({level,indices,rules,input}),history=decodeInventoryWindowHistory(s.input),raw=rawSnapshot(sources);authority(s.level,s.indices,s.rules);const run=runtime(control);
 const c=await rebuild(s.level,raw,s.indices,s.rules,history,run);run.check();return c;
}
export async function activateInventoryWindow(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot({level,session,world,paused}),raw=rawSnapshot(sources);
 if(!s.paused||s.world.tick!==0||s.session.wet||'inventoryWindow'in s.session||'storagePickup'in s.session||'corpsePickup'in s.session||'wetParty'in s.session||'wetRegion'in s.session||s.session.gate||s.session.ground||s.session.consumables||s.session.inventory.commands.length)fail('fresh paused selected team required');
 authority(s.level,s.session.indices,s.world.mission.rules);
 const run=runtime(control);const c=await rebuild(s.level,raw,s.session.indices,s.world.mission.rules,[],run);run.check();
 // The initial source-derived pair must match all supplied immutable baseline fields.
 const baseline=await createTrainingSession(s.level,raw,s.session.indices);run.check();
 if(!equal(baseline.session,s.session)||!equal(createWorld(s.level,undefined,s.world.mission.rules),s.world))fail('unmodified source baseline required');run.check();return c;
}
export async function exportInventoryWindow(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,control?:TimeoutRecoveryControl):Promise<string>{
 const s=wetSnapshot({level,session,world}),raw=rawSnapshot(sources);mirrors(s.session);const history=decodeInventoryWindowHistory(encodeInventoryWindowHistory(s.session.inventoryWindow!.history));
 authority(s.level,s.session.indices,s.session.wet!.rules);
 const run=runtime(control),c=await rebuild(s.level,raw,s.session.indices,s.session.wet!.rules,history,run);run.check();if(!equal(c,{session:s.session,world:s.world}))fail('complete source/history/pair mismatch');run.check();const json=serializeOwned(c);run.check();return json;
}
export async function importInventoryWindow(level:LevelData,sources:TrainingSources,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const captured=wetSnapshot({input,level}),s=captured.input as ReturnType<typeof JSON.parse>,map=captured.level,raw=rawSnapshot(sources);
 if(!s||Object.keys(s).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||s.format!=='hired-guns-training-session'||s.version!==22||s.scenario!==INVENTORY_WINDOW_SCENARIO)fail('wrapper fields');
 if(new TextEncoder().encode(JSON.stringify(s)).length>=INVENTORY_WINDOW_LIMITS.bytes)fail('wrapper byte budget');
 const history=decodeInventoryWindowHistory(s.history);authority(map,s.indices,s.rules);
 const cp=s.checkpoint,p=cp?.inventoryWindow;
 if(!cp||Object.keys(cp).sort().join(',')!=='inventoryWindow,lifecycle,party,state,world'||!p||Object.keys(p).sort().join(',')!=='lastPositions,outcome,phase,profile,recipient,tempEntries,windowOutcomes'||p.profile!==INVENTORY_WINDOW_PROFILE||!cp.state||!Array.isArray(cp.state.actors)||cp.state.actors.length!==4||!cp.world||cp.world.tick!==history.reduce((n,e)=>n+e.count,0)||!equal(cp.state.rules,s.rules))fail('checkpoint metadata/history');
 windowMetadata({...p,history},cp.state.actors);
 if(!s.sources||Object.keys(s.sources).sort().join(',')!=='items,map,roster'||s.sources.map!==TRAINING_43_SHA256)fail('source identities');
 for(const [name,size,layout,revision]of [['roster',16320,'front272-five-banks','ocs-source-data'],['items',32604,'items286-114','ocs-runtime']]as const){const v=s.sources[name];if(!v||Object.keys(v).sort().join(',')!=='byteLength,layout,revision,sha256'||v.byteLength!==size||v.layout!==layout||v.revision!==revision||typeof v.sha256!=='string'||!/^[0-9a-f]{64}$/.test(v.sha256))fail('source identity fields');}const run=runtime(control),c=await rebuild(map,raw,s.indices,s.rules,history,run,s.sources);run.check();if(!equal(JSON.parse(serializeOwned(c)),s))fail('complete source/history/checkpoint mismatch');run.check();return c;
}
