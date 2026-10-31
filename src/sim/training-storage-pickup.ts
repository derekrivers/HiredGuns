import type {Action,LevelData,MissionRules,PlayerCommand,WorldState} from '../contracts';
import {importEditorMap} from '../import/editor-map';
import {importCharacters} from '../import/characters';
import {createTrainingSession,type TrainingSession,type TrainingSources,type TrainingCandidate} from './training-session';
import {initialTimeout,type TimeoutRecoveryControl} from './training-timeout';
import {stepStoragePickupLifecycle} from './training-wet-lifecycle';
import {TRAINING_43_SHA256} from './mission-profile';
import {wetSnapshot,rawSnapshot} from './training-wet';
import {equalConsumableState as equal} from './training-consumables';
import {createWorld} from './world';

export const STORAGE_PROFILE='one-native-storage-pickup-v1';
export const STORAGE_SCENARIO='training43-storage-pickup-v1';
export const STORAGE_LIMITS=Object.freeze({ticks:59499,packed:256,expanded:513,bytes:24576});
export interface StorageEvent {count:number;codes:number[]}
export interface TrainingStoragePickup {profile:typeof STORAGE_PROFILE;history:StorageEvent[];outcome:string|null;lastPositions:number[]}
const actions:Action[]=['forward','backward','strafe-left','strafe-right','turn-left','turn-right'];
const fail=(why:string):never=>{throw Error(`Storage pickup refused atomically: ${why}`);};
/** Absent is the only fallback. Any present malformed marker refuses before v19. */
export function hasStoragePickup(session:TrainingSession|null):boolean{
 if(!session)return false;
 if(Object.getPrototypeOf(session)!==Object.prototype)fail('session prototype');
 if(!('storagePickup'in session))return false;
 const d=Object.getOwnPropertyDescriptor(session,'storagePickup');
 if(!d?.enumerable||!Object.hasOwn(d,'value')||!d.value||Object.getPrototypeOf(d.value)!==Object.prototype)fail('profile data owner');
 const p=Object.getOwnPropertyDescriptor(d!.value,'profile');
 if(!p?.enumerable||!Object.hasOwn(p,'value')||p.value!==STORAGE_PROFILE)fail('profile discriminator');
 return true;
}
function owner(s:TrainingSession){
 if(Object.keys(s).sort().join(',')!=='encounter,encounterGun,gate,ground,indices,inventory,items,names,patrol,storagePickup,team,wet,wetLifecycle,wetParty')fail('session fields');
 if(!hasStoragePickup(s)||Object.keys(s.storagePickup!).sort().join(',')!=='history,lastPositions,outcome,profile'||s.wetParty?.profile!=='four-controlled-timeout-v1'||Object.getOwnPropertyDescriptor(s,'wetRegion')||!s.wet||!s.wetLifecycle||s.wet.history.length)fail('profile fields/owner');
 if(s.storagePickup!.lastPositions.length!==4||!s.storagePickup!.lastPositions.every(n=>Number.isInteger(n)&&n>=0&&n<=29))fail('last positions');
 if(s.storagePickup!.lastPositions.some(n=>n!==0))fail('fixed-selection last positions');
 policy(s.wet!.rules);encodeStorageHistory(s.storagePickup!.history);
 if(s.storagePickup!.history.some((e,i,h)=>i>0&&equal(e.codes,h[i-1]!.codes)))fail('noncanonical expanded history');
 const attempted=s.storagePickup!.history.some(e=>e.codes.some(n=>n>=24)),outcome=s.storagePickup!.outcome;
 if(attempted?!['caller-guard','already-too-heavy','profile-refusal','empty-corpse','transferred'].includes(outcome!):outcome!==null)fail('derived outcome domain');
 if(s.wet!.actors.length!==4||s.inventory.actors.length!==4||s.items.records.length!==114)fail('complete party/catalog');
 for(const [i,a]of s.wet!.actors.entries()){
  if(Object.keys(a.body).sort().join(',')!=='controlMethod,drowningIndicator,fitness,inventory,physique,race,spellWater,spellWings,statsDeadWord,underwaterCount,weight,windowType'||Object.keys(a.body.inventory).sort().join(',')!=='actions,carried,equipped'||a.body.inventory.carried.length!==30||a.body.inventory.actions.length!==10||s.inventory.actors[i]!.selection!==0)fail('body/inventory owner');
  for(const slot of [a.body.inventory.equipped,...a.body.inventory.carried,...a.body.inventory.actions]){
   const bytes=[slot.itemId,slot.damage,slot.ammo,slot.fourthByte];
   if(Object.keys(slot).sort().join(',')!=='ammo,damage,fourthByte,itemId,rawHex'||!bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||slot.itemId>114||slot.rawHex!==bytes.map(n=>n.toString(16).padStart(2,'0')).join(''))fail('complete raw inventory entry');
  }
 }
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
function events(input:unknown):StorageEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>STORAGE_LIMITS.expanded)return fail('expanded budget');let total=0,pickups=0;
 for(const e of data){
  if(!e||Object.keys(e).sort().join(',')!=='codes,count'||!Number.isSafeInteger(e.count)||e.count<1||!Array.isArray(e.codes)||e.codes.length>4)fail('event fields');
  total+=e.count;if(total>STORAGE_LIMITS.ticks)fail('tick budget');
  for(const [j,n]of e.codes.entries())if(!Number.isInteger(n)||n<0||n>27||(j>0&&n<=e.codes[j-1])||n<24&&e.codes.some((m:number,k:number)=>k!==j&&m<24&&Math.floor(m/6)===Math.floor(n/6)))fail('command codes/order');
  if(e.codes.some((n:number)=>n>=24)){if(e.count!==1||e.codes.length!==1||++pickups>1)fail('one pickup-only attempt');}
 }
 return data as StorageEvent[];
}
export function encodeStorageHistory(input:readonly StorageEvent[]):number[][]{
 const result:number[][]=[];let idle=0;
 for(const e of events(input)){
  if(!e.codes.length){idle+=e.count;continue;}
  const last=result.at(-1);
  if(!idle&&e.codes[0]!<24&&last&&equal(last.slice(2),e.codes))last[1]!+=e.count;
  else result.push([idle,e.count,...e.codes]);idle=0;
 }
 if(idle)result.push([idle,0]);if(result.length>STORAGE_LIMITS.packed)fail('packed budget');return result;
}
export function decodeStorageHistory(input:unknown):StorageEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>STORAGE_LIMITS.packed)return fail('packed budget');
 const result:StorageEvent[]=[];let total=0;
 for(const [i,t]of data.entries()){
  if(!Array.isArray(t)||t.length<2||t.length>6||!t.every(n=>Number.isSafeInteger(n)&&n>=0))fail('tuple fields');
  const [idle,count]=t as number[];total+=idle!+count!;if(total>STORAGE_LIMITS.ticks)fail('tick budget');
  if(!count){if(i!==data.length-1||!idle||t.length!==2)fail('trailing idle');}else if(t.length===2)fail('missing command');
  if(idle)result.push({count:idle!,codes:[]});if(count)result.push({count:count!,codes:t.slice(2)});
 }
 const h=events(result);if(!equal(encodeStorageHistory(h),data))fail('noncanonical history');return h;
}
function initial(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate{
 const {storagePickup:_pickup,...clean}=baseline;void _pickup;
 const c=initialTimeout(level,clean,races,rules);
 c.session={...c.session,storagePickup:{profile:STORAGE_PROFILE,history:[],outcome:null,lastPositions:[0,0,0,0]}};serializeOwned(c);return c;
}
export function resetStoragePickup(level:LevelData,session:TrainingSession,rules?:MissionRules):TrainingSession{
 const saved=wetSnapshot({level,session,...(rules?{rules}:{})});owner(saved.session);
 return initial(saved.level,saved.session,saved.session.wet!.actors.map(a=>a.body.race),saved.rules??saved.session.wet!.rules).session;
}
function serializeOwned(c:TrainingCandidate):string{
 owner(c.session);const {history:_history,...state}=c.session.wet!;void _history;
 const p=c.session.storagePickup!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:21,scenario:STORAGE_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodeStorageHistory(p.history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle,party:c.session.wetParty,storagePickup:{profile:p.profile,outcome:p.outcome,lastPositions:p.lastPositions}}});
 if(new TextEncoder().encode(json).length>=STORAGE_LIMITS.bytes)fail('future save byte budget');return json;
}
export function serializeStoragePickup(c:TrainingCandidate){const captured=wetSnapshot(c);mirrors(captured.session);return serializeOwned(captured);}
function codes(commands:readonly PlayerCommand[],actor:number|null){
 if(actor!==null){if(!Number.isInteger(actor)||actor<0||actor>3||commands.length)fail('pickup-only command');return [24+actor];}
 const result=commands.map(c=>{if(!c||Object.keys(c).sort().join(',')!=='action,mercenaryId'||!Number.isInteger(c.mercenaryId)||c.mercenaryId<0||c.mercenaryId>3||!actions.includes(c.action))fail('navigation command');return c.mercenaryId*6+actions.indexOf(c.action);}).sort((a,b)=>a-b);
 events([{count:1,codes:result}]);return result;
}
/** Prospective full tick; only the returned pair may be installed by Main. */
export function stepStoragePickup(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],actor:number|null=null){
 const s=wetSnapshot({level,session,world,commands,actor});mirrors(s.session);return stepOwned(s.level,s.session,s.world,s.commands,s.actor);
}
/** Internal Main entry: sole-owned committed pair, immutable imported geometry,
 * and router-created commands. No await/runtime callback occurs here. The core
 * still clones mutable candidates and performs every prospective save check. */
export function advanceOwnedStoragePickup(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],actor:number|null){
 return stepOwned(level,session,world,commands,actor);
}
/** Only call-time-owned or reconstructed inputs reach this internal entry. It
 * still performs every ordinary tick, admission and full prospective budget. */
function stepOwned(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],actor:number|null){
 const s={level,session,world,commands,actor};owner(s.session);
 if(!equal(s.session.wet!.rules,s.world.mission.rules))fail('world/body rules');
 if(s.session.storagePickup!.history.reduce((n,e)=>n+e.count,0)!==s.world.tick)fail('world/history tick');
 const operation=codes(s.commands,s.actor);
 if(s.world.mission.outcome!=='active')return {session:s.session,world:s.world,events:[]};
 if(actor!==null&&s.session.storagePickup!.history.some(e=>e.codes.some(n=>n>=24)))fail('single attempt already consumed');
 const r=stepStoragePickupLifecycle(s.level,s.session,s.world,s.commands,s.actor);
 const history=wetSnapshot(s.session.storagePickup!.history),last=history.at(-1);
 if(operation.every(n=>n<24)&&last&&equal(last.codes,operation))last.count++;else history.push({count:1,codes:operation});
 const next:TrainingCandidate={world:r.world,session:{...r.session,storagePickup:{profile:STORAGE_PROFILE,history,lastPositions:r.session.storagePickup!.lastPositions,outcome:'pickup'in r?r.pickup as string:s.session.storagePickup!.outcome}}};
 serializeOwned(next);return {...next,events:r.events};
}
function runtime(control?:TimeoutRecoveryControl){
 const current=control?.isCurrent,progress=control?.onProgress;
 const check=()=>{if(current&&!current())fail('reconstruction cancelled');};
 return {check,report(phase:'verifying'|'replaying',processed:number,total:number){check();progress?.(Object.freeze({phase,processed,total}));check();}};
}
async function rebuild(map:LevelData,raw:Required<TrainingSources>,indices:readonly number[],rules:MissionRules,history:StorageEvent[],run:ReturnType<typeof runtime>,expectedSources?:unknown){
 policy(rules);run.report('verifying',0,history.reduce((n,e)=>n+e.count,0));
 const imported=await importEditorMap(raw.map);run.check();if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,indices);run.check();
 if(expectedSources!==undefined&&!equal(expectedSources,{map:TRAINING_43_SHA256,...baseline.session.team.sources}))fail('declared source identities');
 const roster=await importCharacters(raw.roster);run.check();
 let c=initial(imported.level,baseline.session,indices.map(i=>roster.records[i]!.race),rules),processed=0,chunk=0,start=performance.now();
 const total=history.reduce((n,e)=>n+e.count,0);run.report('replaying',0,total);
 for(const e of history)for(let n=0;n<e.count;n++){
  run.check();if(c.world.mission.outcome!=='active')fail('history after terminal');
  const pickup=e.codes[0]!>=24?e.codes[0]!-24:null;
  const commands=pickup===null?e.codes.map(code=>({mercenaryId:Math.floor(code/6),action:actions[code%6]!})):[];
  const r=stepOwned(imported.level,c.session,c.world,commands,pickup);
  c={session:r.session,world:r.world};processed++;chunk++;
  if(chunk>=16||performance.now()-start>=8){run.report('replaying',processed,total);await new Promise<void>(resolve=>setTimeout(resolve,0));run.check();chunk=0;start=performance.now();}
 }
 run.check();if(!equal(encodeStorageHistory(c.session.storagePickup!.history),encodeStorageHistory(history)))fail('derived history');serializeOwned(c);run.report('replaying',processed,total);run.check();return c;
}
/** Source-only reconstruction: no saved inventory/body/result is an input. This
 * is also the bounded chronology authority used by import/export below. */
export async function reconstructStoragePickup(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot({level,indices,rules,input}),history=decodeStorageHistory(s.input),raw=rawSnapshot(sources);authority(s.level,s.indices,s.rules);const run=runtime(control);
 const c=await rebuild(s.level,raw,s.indices,s.rules,history,run);run.check();return c;
}
export async function activateStoragePickup(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot({level,session,world,paused}),raw=rawSnapshot(sources);
 if(!s.paused||s.world.tick!==0||s.session.wet||'storagePickup'in s.session||'wetParty'in s.session||'wetRegion'in s.session||s.session.gate||s.session.ground||s.session.consumables||s.session.inventory.commands.length)fail('fresh paused selected team required');
 authority(s.level,s.session.indices,s.world.mission.rules);
 const run=runtime(control);const c=await rebuild(s.level,raw,s.session.indices,s.world.mission.rules,[],run);run.check();
 // The initial source-derived pair must match all supplied immutable baseline fields.
 const baseline=await createTrainingSession(s.level,raw,s.session.indices);run.check();
 if(!equal(baseline.session,s.session)||!equal(createWorld(s.level,undefined,s.world.mission.rules),s.world))fail('unmodified source baseline required');run.check();return c;
}
export async function exportStoragePickup(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,control?:TimeoutRecoveryControl):Promise<string>{
 const s=wetSnapshot({level,session,world}),raw=rawSnapshot(sources);mirrors(s.session);const history=decodeStorageHistory(encodeStorageHistory(s.session.storagePickup!.history));
 authority(s.level,s.session.indices,s.session.wet!.rules);
 const run=runtime(control),c=await rebuild(s.level,raw,s.session.indices,s.session.wet!.rules,history,run);run.check();if(!equal(c,{session:s.session,world:s.world}))fail('complete source/history/pair mismatch');run.check();const json=serializeOwned(c);run.check();return json;
}
export async function importStoragePickup(level:LevelData,sources:TrainingSources,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const captured=wetSnapshot({input,level}),s=captured.input as ReturnType<typeof JSON.parse>,map=captured.level,raw=rawSnapshot(sources);
 if(!s||Object.keys(s).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||s.format!=='hired-guns-training-session'||s.version!==21||s.scenario!==STORAGE_SCENARIO)fail('wrapper fields');
 if(new TextEncoder().encode(JSON.stringify(s)).length>=STORAGE_LIMITS.bytes)fail('wrapper byte budget');
 const history=decodeStorageHistory(s.history);authority(map,s.indices,s.rules);const run=runtime(control),c=await rebuild(map,raw,s.indices,s.rules,history,run,s.sources);run.check();if(!equal(JSON.parse(serializeOwned(c)),s))fail('complete source/history/checkpoint mismatch');run.check();return c;
}
