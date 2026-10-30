import type {Action,LevelData,MissionRules,PlayerCommand,WorldState} from '../contracts';
import {importEditorMap} from '../import/editor-map';
import {importCharacters} from '../import/characters';
import {createTrainingSession,type TrainingSession,type TrainingSources,type TrainingCandidate} from './training-session';
import {initialWetParty} from './training-wet-party';
import {stepTimeoutLifecycle} from './training-wet-lifecycle';
import {TRAINING_43_SHA256} from './mission-profile';
import {wetSnapshot,rawSnapshot,type WetEvent} from './training-wet';
import {equalConsumableState as equal} from './training-consumables';

export const TIMEOUT_SCENARIO='training43-source-timeout-v1';
export const TIMEOUT_PROFILE='four-controlled-timeout-v1';
// Do not read legacy-module values during this module's initialization: session
// and wet factories form a cycle with several valid import entry orders.
// These v19-only constants are independently pinned to original99 x 601 and
// the existing strict24KiB format contract; tests compare both authorities.
export const TIMEOUT_LIMITS=Object.freeze({ticks:99*601,packed:256,expanded:513,bytes:24*1024});
/** Runtime UI ownership only; never participates in saved state or legacy dispatch. */
export interface TimeoutRecoveryControl {
 isCurrent:()=>boolean;
 onProgress?:(progress:Readonly<{phase:'verifying'|'replaying';processed:number;total:number}>)=>void;
}
function runtime(control?:TimeoutRecoveryControl){
 // Capture callback references once, after all authoritative input snapshots.
 const current=control?.isCurrent,progress=control?.onProgress;
 const check=()=>{if(current&&!current())throw Error('Source timeout reconstruction cancelled.');};
 return {check,report(phase:'verifying'|'replaying',processed:number,total:number){check();progress?.(Object.freeze({phase,processed,total}));check();}};
}
const actions:Action[]=['forward','backward','strafe-left','strafe-right','turn-left','turn-right'];
const fail=(why:string):never=>{throw Error(`Source timeout refused atomically: ${why}`);};
/** UI/dispatch discriminator. Absent, hidden, accessor and inherited values are never read. */
export function hasTimeoutProfile(session:TrainingSession|null):boolean{
 if(!session||Object.getPrototypeOf(session)!==Object.prototype)return false;
 const d=Object.getOwnPropertyDescriptor(session,'wetParty');if(!d?.enumerable||!Object.hasOwn(d,'value'))return false;
 const p=d.value;if(!p||Object.getPrototypeOf(p)!==Object.prototype)return false;
 const v=Object.getOwnPropertyDescriptor(p,'profile');return !!(v?.enumerable&&Object.hasOwn(v,'value')&&v.value===TIMEOUT_PROFILE);
}
function owner(session:TrainingSession):void{
 if(!hasTimeoutProfile(session)||Object.getOwnPropertyDescriptor(session,'wetRegion'))fail('party/region owner');
 const p=wetSnapshot(Object.getOwnPropertyDescriptor(session,'wetParty')!.value);
 if(Object.keys(p).join(',')!=='profile')fail('profile fields');
 for(const key of ['wet','wetLifecycle']){const d=Object.getOwnPropertyDescriptor(session,key);if(!d?.enumerable||!Object.hasOwn(d,'value')||!d.value||Object.getPrototypeOf(d.value)!==Object.prototype)fail('required lifecycle data owner');}
 const rules=Object.getOwnPropertyDescriptor(session.wet!,'rules');if(!rules?.enumerable||!Object.hasOwn(rules,'value'))fail('rules data owner');
}
function policy(input:MissionRules):void{
 const rules=wetSnapshot(input);
 if(Object.keys(rules).sort().join(',')!=='mode,timeLimit'||rules.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(rules.mode))fail('original99 action rules required');
}
function events(input:unknown):WetEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>TIMEOUT_LIMITS.expanded)return fail('expanded event budget');let total=0;
 return data.map(e=>{
  if(!e||Object.keys(e).sort().join(',')!=='commands,count'||!Number.isSafeInteger(e.count)||e.count<1||!Array.isArray(e.commands)||e.commands.length>4)fail('event fields');
  total+=e.count;if(total>TIMEOUT_LIMITS.ticks)fail('tick budget');const ids=new Set<number>();
  for(const c of e.commands){if(!c||Object.keys(c).sort().join(',')!=='action,mercenaryId'||!Number.isInteger(c.mercenaryId)||c.mercenaryId<0||c.mercenaryId>3||ids.has(c.mercenaryId)||!actions.includes(c.action))fail('command fields');ids.add(c.mercenaryId);}
  return e as WetEvent;
 });
}
/** V19 canonical tuples preserve every command/idle tick; no lifecycle fast-forward. */
export function encodeTimeoutHistory(input:readonly WetEvent[]):number[][]{
 const result:number[][]=[];let idle=0;
 for(const e of events(input)){if(!e.commands.length){idle+=e.count;continue;}
  const codes=e.commands.map(c=>c.mercenaryId*6+actions.indexOf(c.action)).sort((a,b)=>a-b),last=result.at(-1);
  if(!idle&&last&&equal(last.slice(2),codes))last[1]!+=e.count;else result.push([idle,e.count,...codes]);idle=0;
 }
 if(idle)result.push([idle,0]);if(result.length>TIMEOUT_LIMITS.packed)fail('packed event budget');return result;
}
export function decodeTimeoutHistory(input:unknown):WetEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>TIMEOUT_LIMITS.packed)return fail('packed event budget');
 const result:WetEvent[]=[];let total=0;
 for(const [i,t] of data.entries()){
  if(!Array.isArray(t)||t.length<2||t.length>6||!t.every(n=>Number.isSafeInteger(n)&&n>=0))fail('tuple fields');
  const [idle,count]=t as number[];total+=idle!+count!;if(total>TIMEOUT_LIMITS.ticks)fail('tick budget');
  if(count===0){if(i!==data.length-1||!idle||t.length!==2)fail('trailing idle');}else if(t.length===2)fail('missing command');
  const codes=t.slice(2) as number[];
  if(codes.some((n,j)=>n>23||(j>0&&n<=codes[j-1]!)||codes.some((m,k)=>j!==k&&Math.floor(m/6)===Math.floor(n/6))))fail('command codes');
  if(idle)result.push({count:idle!,commands:[]});if(count)result.push({count:count!,commands:codes.map(n=>({mercenaryId:Math.floor(n/6),action:actions[n%6]!}))});
 }
 const history=events(result);if(!equal(encodeTimeoutHistory(history),data))fail('noncanonical history');return history;
}
export function initialTimeout(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate{
 const saved=wetSnapshot({baseline,races,rules});policy(saved.rules);
 const c=initialWetParty(level,saved.baseline,saved.races,saved.rules);
 c.session={...c.session,wetParty:{profile:TIMEOUT_PROFILE}};serializeOwnedTimeout(c);return c;
}
export function resetTimeout(level:LevelData,session:TrainingSession,rules?:MissionRules):TrainingSession{
 const saved=wetSnapshot(session);owner(saved);
 return initialTimeout(level,saved,saved.wet!.actors.map(a=>a.body.race),rules?wetSnapshot(rules):saved.wet!.rules).session;
}
export function serializeTimeout(c:TrainingCandidate):string{
 return serializeOwnedTimeout(wetSnapshot(c));
}
/** Internal factory/step-owned candidate; public callers capture above. */
function serializeOwnedTimeout(c:TrainingCandidate):string{
 owner(c.session);policy(c.session.wet!.rules);
 const {history,...state}=c.session.wet!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:19,scenario:TIMEOUT_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodeTimeoutHistory(history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle,party:c.session.wetParty}});
 if(new TextEncoder().encode(json).length>=TIMEOUT_LIMITS.bytes)fail('future save byte budget');return json;
}
export function stepTimeout(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],record=true){
 owner(session);policy(session.wet!.rules);
 if(previous.mission.outcome!=='active')return {session,world:previous,events:[]};
 const c=stepTimeoutLifecycle(level,session,previous,commands);
 if(record){const ordered=wetSnapshot([...commands]).sort((a,b)=>a.mercenaryId-b.mercenaryId),h=c.session.wet!.history,last=h.at(-1);if(last&&equal(last.commands,ordered))last.count++;else h.push({count:1,commands:ordered});serializeOwnedTimeout(c);}return c;
}
export function replayTimeout(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,input:unknown):TrainingCandidate{
 const history=decodeTimeoutHistory(input);let c=initialTimeout(level,baseline,races,rules);
 for(const e of history)for(let n=0;n<e.count;n++){if(c.world.mission.outcome!=='active')fail('history after terminal');const r=stepTimeout(level,c.session,c.world,e.commands,false);c={session:r.session,world:r.world};}
 c.session.wet!.history=history;serializeOwnedTimeout(c);return c;
}
/** Same full transition as the synchronous reference, with real event-task yields.
 * A single tick is indivisible; each chunk stops after 16 ticks or 8ms, whichever
 * comes first. No saved/raw authority is exposed to runtime callbacks. */
export async function replayTimeoutAsync(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const map=wetSnapshot(level),saved=wetSnapshot({baseline,races,rules}),history=decodeTimeoutHistory(input);
 return replayOwnedTimeoutAsync(map,saved.baseline,saved.races,saved.rules,history,runtime(control));
}
async function replayOwnedTimeoutAsync(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,history:WetEvent[],run:ReturnType<typeof runtime>):Promise<TrainingCandidate>{
 run.check();let c=initialTimeout(level,baseline,races,rules),processed=0,chunk=0,start=performance.now();
 const total=history.reduce((n,e)=>n+e.count,0);run.report('replaying',0,total);
 for(const e of history)for(let n=0;n<e.count;n++){
  run.check();if(c.world.mission.outcome!=='active')fail('history after terminal');
  const r=stepTimeout(level,c.session,c.world,e.commands,false);c={session:r.session,world:r.world};processed++;chunk++;
  if(chunk>=16||performance.now()-start>=8){
   run.report('replaying',processed,total);
   await new Promise<void>(resolve=>setTimeout(resolve,0));run.check();chunk=0;start=performance.now();
  }
 }
 run.check();c.session.wet!.history=history;serializeOwnedTimeout(c);run.report('replaying',processed,total);return c;
}
async function rebuild(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown,control?:TimeoutRecoveryControl):Promise<{candidate:TrainingCandidate;check:()=>void}>{
 const map=wetSnapshot(level),chosen=wetSnapshot(indices),r=wetSnapshot(rules),history=encodeTimeoutHistory(decodeTimeoutHistory(input)),raw=rawSnapshot(sources);policy(r);
 const run=runtime(control),decoded=decodeTimeoutHistory(history);run.report('verifying',0,decoded.reduce((n,e)=>n+e.count,0));
 const imported=await importEditorMap(raw.map);run.check();if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,chosen);run.check();
 const roster=await importCharacters(raw.roster);run.check();
 const candidate=await replayOwnedTimeoutAsync(imported.level,baseline.session,chosen.map(i=>roster.records[i]!.race),r,decoded,run);run.check();
 return {candidate,check:run.check};
}
export async function activateTimeout(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const saved=wetSnapshot({session,world});
 if(!paused||saved.world.tick!==0||saved.session.wet||Object.getOwnPropertyDescriptor(saved.session,'wetParty')||Object.getOwnPropertyDescriptor(saved.session,'wetRegion')||saved.session.gate||saved.session.ground||saved.session.consumables||saved.session.inventory.commands.length)fail('fresh paused selected team required');
 const {candidate,check}=await rebuild(level,sources,saved.session.indices,saved.world.mission.rules,[],control);check();return candidate;
}
export async function exportTimeout(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,control?:TimeoutRecoveryControl):Promise<string>{
 const saved=wetSnapshot({session,world});owner(saved.session);
 const {candidate:c,check}=await rebuild(level,sources,saved.session.indices,saved.session.wet!.rules,encodeTimeoutHistory(saved.session.wet!.history),control);
 check();if(!equal(c,saved))fail('complete source/history/outcome mismatch');check();return serializeOwnedTimeout(c);
}
export async function importTimeout(level:LevelData,sources:TrainingSources,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot(input) as ReturnType<typeof JSON.parse>;
 if(!s||Object.keys(s).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||s.format!=='hired-guns-training-session'||s.version!==19||s.scenario!==TIMEOUT_SCENARIO)fail('wrapper fields');
 const {candidate:c,check}=await rebuild(level,sources,s.indices,s.rules,s.history,control);check();if(!equal(JSON.parse(serializeOwnedTimeout(c)),s))fail('source/history/full checkpoint comparison');check();return c;
}
