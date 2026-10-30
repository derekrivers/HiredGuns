import { cellIndex, inBounds, type LevelData, type MissionRules, type PlayerCommand, type Position, type WorldState } from '../contracts';
import { transitionImmersion, type ImmersionActor } from '../character/immersion-caller';
import { createWorld, stepWorld } from './world';
import { importEditorMap } from '../import/editor-map';
import { importCharacters } from '../import/characters';
import { TRAINING_43_SHA256 } from './mission-profile';
import { createTrainingSession, type TrainingSession, type TrainingSources, type TrainingCandidate } from './training-session';
import { equalConsumableState as equal } from './training-consumables';

export const WET_SCENARIO='training43-keyboard-wet-v1';
export const WET_LIMITS=Object.freeze({events:128,ticks:45000,bytes:24576,depth:24,visits:50000,collection:32000,string:65536,units:1000000});
export interface WetActor { body:ImmersionActor; runtimeDeadWord:number; old:number; current:number; delay:number; pending:number; entries:number; itemPasses:number; lastInventoryStatus:string }
export interface WetEvent { count:number; commands:PlayerCommand[] }
/** Sparse, replay-derived mutable heads/arrival markers over immutable imported geometry. */
export interface TrainingWet { history:WetEvent[]; actors:WetActor[]; overlays:[number,number,number][]; drownCounter:number; fallCounter:number; leader:number; corpses:number[]; pads:number[]; rules:MissionRules }
const fail=(reason:string):never=>{throw Error(`Wet traversal refused atomically: ${reason}`);};
/** Descriptor-only call-time capture. No getters, unusual prototypes, sparse arrays or shared-DAG work bypass. */
export function wetSnapshot<T>(input:T):T {
 let visits=0,units=0;const active=new Set<object>();
 function copy(v:unknown,depth:number):unknown{
  if(++visits>WET_LIMITS.visits||depth>WET_LIMITS.depth)fail('snapshot work/depth budget');
  if(typeof v==='string'){units+=v.length;if(v.length>WET_LIMITS.string||units>WET_LIMITS.units)fail('snapshot string budget');return v;}
  if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isSafeInteger(v))return v;
  if(typeof v!=='object')return fail('ordinary JSON data required');
  const arr=Array.isArray(v);if(Object.getPrototypeOf(v)!==(arr?Array.prototype:Object.prototype)||active.has(v))fail('prototype/cycle');
  const keys=Reflect.ownKeys(v);if(keys.length>WET_LIMITS.collection+(arr?1:0))fail('collection budget');
  if(arr&&((v as unknown[]).length>WET_LIMITS.collection||keys.length!==(v as unknown[]).length+1))fail('dense array required');
  active.add(v);const out:Record<string,unknown>|unknown[]=arr?[]:{};
  for(const k of keys){if(arr&&k==='length')continue;if(typeof k!=='string')return fail('symbol');units+=k.length;if(units>WET_LIMITS.units||k.length>WET_LIMITS.string)fail('key budget');
   const d=Object.getOwnPropertyDescriptor(v,k)!;if(!d.enumerable||!('value'in d))fail('data descriptors required');
   if(arr&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=(v as unknown[]).length))fail('array key');
   Object.defineProperty(out,k,{value:copy(d.value,depth+1),enumerable:true,writable:true,configurable:true});
  }active.delete(v);return out;
 }return copy(input,0) as T;
}
export function wetHistory(input:unknown):WetEvent[]{
 const value=wetSnapshot(input);if(!Array.isArray(value)||value.length>WET_LIMITS.events)return fail('event budget');let ticks=0;
 return value.map(e=>{if(!e||Object.keys(e).sort().join(',')!=='commands,count'||!Number.isInteger(e.count)||e.count<1||!Array.isArray(e.commands)||e.commands.length>4)fail('history fields');
  ticks+=e.count;if(ticks>WET_LIMITS.ticks)fail('tick budget');const ids=new Set<number>();
  for(const c of e.commands){if(!c||Object.keys(c).sort().join(',')!=='action,mercenaryId'||!Number.isInteger(c.mercenaryId)||c.mercenaryId<0||c.mercenaryId>3||ids.has(c.mercenaryId)||!['forward','backward','strafe-left','strafe-right','turn-left','turn-right'].includes(c.action))fail('history commands');ids.add(c.mercenaryId);}return e as WetEvent;});
}
const word=(level:LevelData,p:Position)=>inBounds(level,p)?level.layers[0][cellIndex(level,p)]!:0;
/** Exact inert immediate support only; death/find_floor and vertical wet descent are unavailable. */
export function admitWet(level:LevelData,p:Position):void{
 if(!inBounds(level,p)||!(word(level,p)&4))return;
 const w=word(level,p),below=word(level,{...p,z:p.z-1});
 if(((w>>>17)&3)!==2||(w&(2|64|16|256))||((w&1)&&((w>>>9)&3)!==0)||((w&32)&&((w>>>28)<8||(w>>>28)>11))||(!(w&1)&&(below&0x1f802)!==2))fail('unsupported wet support/search/descent');
}
function heads(level:LevelData,state:TrainingWet,world:WorldState,previous?:WorldState){
 const overlays=new Map(state.overlays.map(([i,a,c])=>[i,[a,c] as [number,number]]));
 const at=(i:number)=>overlays.get(i)??[level.layers[0][i]!,level.layers[2][i]!] as [number,number];
 // Release only this tick's departures, before installing any current heads.
 // Retired actors retain their pose but no longer own that cell.
 if(previous)for(let id=0;id<4;id++){
  if(previous.mission.exited[id])continue;
  const a=state.actors[id]!,i=cellIndex(level,world.mercenaries[id]!);
  if(a.current!==i||world.mission.exited[id]){const [w,c]=at(a.current);overlays.set(a.current,[(w&0xf07e07fd)>>>0,c]);}
 }
 for(let id=0;id<4;id++){
  const a=state.actors[id]!,p=world.mercenaries[id]!,i=cellIndex(level,p);const old=a.current;
  a.current=i;
  if(world.mission.exited[id])continue;
  const [w,c]=at(i),person=(((32+id*4+p.facing)<<11)|(id<<23)|2)>>>0;
  overlays.set(i,[((w&0xf07e07fd)|person)>>>0,previous&&old!==i?(c&0xdfffffff)>>>0:c]);
 }
 state.overlays=[...overlays].sort((a,b)=>a[0]-b[0]).map(([i,[a,c]])=>[i,a,c]);
}
export function initialWet(level:LevelData,session:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate{
 if(races.length!==4||session.indices.join(',')!=='11,3,0,5')fail('ready team [11,3,0,5] required');
 const world=createWorld(level,undefined,rules);
 const actors=session.team.actors.map((a,i)=>{const {totalWeight,quotient,tooHeavy,usingGrenade}=a.weight;return {body:{statsDeadWord:0,windowType:0,controlMethod:1,race:races[i]!,physique:a.stats.physique,fitness:a.stats.fitness,spellWater:0,spellWings:0,underwaterCount:0,drowningIndicator:0,inventory:structuredClone(a.inventory),weight:{totalWeight,quotient,tooHeavy,usingGrenade}},runtimeDeadWord:0,old:cellIndex(level,world.mercenaries[i]!),current:cellIndex(level,world.mercenaries[i]!),delay:0,pending:0,entries:0,itemPasses:0,lastInventoryStatus:'not-visited'};});
 const wet:TrainingWet={history:[],actors,overlays:[],drownCounter:0,fallCounter:0,leader:0,corpses:[],pads:[],rules:structuredClone(rules)};heads(level,wet,world);
 return {world,session:{...session,encounter:null,wet,inventory:{commands:[],actors:actors.map(a=>({inventory:a.body.inventory,weight:{...a.body.weight,status:'verified'},selection:0}))}}};
}
/** Pure prospective tick: drowning, stuff_falls party order, controls; caller installs BOTH outputs. */
export function stepWet(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],record=true){
 if(!session.wet)fail('inactive');if(previous.mission.outcome!=='active')return {world:previous,session,events:[]};
 const next:TrainingSession={...session,wet:structuredClone(session.wet)},wet=next.wet!;
 if(previous.tick>=WET_LIMITS.ticks)fail('future tick budget');
 if(wet.corpses.length||wet.pads.length||previous.physics.mode!=='static')fail('unsupported lifecycle/physics');
 for(let i=0;i<4;i++){const a=wet.actors[i]!;if(a.runtimeDeadWord||a.body.statsDeadWord||a.body.windowType!==0||a.body.controlMethod!==1||a.body.spellWater||a.body.spellWings||a.pending)fail('unsupported control/dead/spell/pending state');admitWet(level,previous.mercenaries[i]!);}
 wet.drownCounter=(wet.drownCounter+1)&65535;wet.fallCounter=(wet.fallCounter+1)&65535;
 if((wet.drownCounter<<16>>16)>=50){wet.drownCounter=0;
  for(let i=0;i<4;i++){if(previous.mission.exited[i])continue;const a=wet.actors[i]!,result=transitionImmersion({actor:a.body,cellLong:word(level,previous.mercenaries[i]!),items:session.items});
   if(result.damageRequest!==null)fail('damage request (including zero) requires wet death/find_floor composition');
   a.body=result.candidate;a.lastInventoryStatus=result.inventoryStatus;if(result.inventoryStatus==='processed')a.itemPasses++;
  }
 }
 if(wet.fallCounter>6){wet.fallCounter-=6;for(let i=0;i<4;i++){if(previous.mission.exited[i])continue;const a=wet.actors[i]!;a.delay=word(level,previous.mercenaries[i]!)&4?(a.delay?a.delay-1:2):0;a.pending=0;}}
 for(const a of wet.actors)a.old=a.current;
 const result=stepWorld(level,previous,commands,p=>admitWet(level,p));
 for(let i=0;i<4;i++){const a=wet.actors[i]!,p=result.world.mercenaries[i]!;if(!(word(level,previous.mercenaries[i]!)&4)&&(word(level,p)&4)&&result.events.some(e=>e.mercenaryId===i&&e.kind==='moved'))a.entries++;
 }
 heads(level,wet,result.world,previous);
 const inventory:TrainingSession['inventory']={commands:[],actors:wet.actors.map(a=>({inventory:structuredClone(a.body.inventory),weight:{...a.body.weight,status:'verified'},selection:0}))};
 if(record){const history=wet.history,last=history.at(-1);if(last&&equal(last.commands,commands))last.count++;else history.push({count:1,commands:structuredClone([...commands])});wet.history=wetHistory(history);serializeWet({session:{...next,inventory},world:result.world});}
 return {...result,session:{...next,inventory}};
}
export function replayWet(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,input:unknown):TrainingCandidate{
 const history=wetHistory(input);let c=initialWet(level,baseline,races,rules);
 for(const event of history)for(let n=0;n<event.count;n++){if(c.world.mission.outcome!=='active')fail('history after terminal');c=stepWet(level,c.session,c.world,event.commands,false);}
 c.session.wet!.history=history;serializeWet(c);return {session:c.session,world:c.world};
}
function receipt(c:TrainingCandidate){const {history: _history,...state}=c.session.wet!;void _history;return {world:c.world,state};}
export function serializeWet(c:TrainingCandidate):string{
 const json=JSON.stringify({format:'hired-guns-training-session',version:15,scenario:WET_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:c.session.wet!.rules,history:c.session.wet!.history,checkpoint:receipt(c)});
 if(new TextEncoder().encode(json).length>=WET_LIMITS.bytes)fail('future save byte budget');return json;
}
/** Read buffer internals through intrinsic getters, never caller source/typed-array accessors. */
export function rawSnapshot(input:TrainingSources):Required<TrainingSources>{
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||Reflect.ownKeys(input).length!==3)fail('raw source fields');
 const proto=Object.getPrototypeOf(Uint8Array.prototype) as object;
 const intrinsic=(name:string,v:unknown)=>Object.getOwnPropertyDescriptor(proto,name)!.get!.call(v) as number;
 const result={} as Required<TrainingSources>;
 for(const [key,size] of [['map',157738],['roster',16320],['items',32604]] as const){
  const d=Object.getOwnPropertyDescriptor(input,key);
  if(!d||!d.enumerable||!('value'in d)||!(d.value instanceof Uint8Array)||Object.getPrototypeOf(d.value)!==Uint8Array.prototype)fail('raw source data descriptors');
  const length=intrinsic('byteLength',d!.value);if(length!==size)fail('raw source byte budget');
  const buffer=Object.getOwnPropertyDescriptor(proto,'buffer')!.get!.call(d!.value) as ArrayBuffer;
  if(Object.getPrototypeOf(buffer)!==ArrayBuffer.prototype)fail('ordinary raw buffer required');
  result[key]=new Uint8Array(buffer,intrinsic('byteOffset',d!.value),length).slice();
 }
 return result;
}
/** Map bytes, every caller object and replay history are owned BEFORE the first await. */
async function rebuild(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,history:unknown):Promise<TrainingCandidate>{
 const map=wetSnapshot(level),chosen=wetSnapshot(indices),policy=wetSnapshot(rules),events=wetHistory(history);
 const raw=rawSnapshot(sources);
 const imported=await importEditorMap(raw.map);if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,chosen),roster=await importCharacters(raw.roster);
 return replayWet(imported.level,baseline.session,chosen.map(i=>roster.records[i]!.race),policy,events);
}
export async function activateWet(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean):Promise<TrainingCandidate>{
 const saved=wetSnapshot({session,world});if(!paused||saved.world.tick!==0||saved.session.gate||saved.session.ground||saved.session.consumables||saved.session.wet||saved.session.inventory.commands.length)fail('fresh paused ready team required');
 return rebuild(level,sources,saved.session.indices,saved.world.mission.rules,[]);
}
export async function exportWet(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState):Promise<string>{
 const saved=wetSnapshot({session,world});const c=await rebuild(level,sources,saved.session.indices,saved.session.wet!.rules,saved.session.wet!.history);
 if(!equal(c,saved))fail('session/world/head/inventory history mismatch');return serializeWet(c);
}
export async function importWet(level:LevelData,sources:TrainingSources,input:unknown):Promise<TrainingCandidate>{
 const saved=wetSnapshot(input) as ReturnType<typeof JSON.parse>;
 if(!saved||Object.keys(saved).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||saved.format!=='hired-guns-training-session'||saved.version!==15||saved.scenario!==WET_SCENARIO)fail('wrapper fields');
 const c=await rebuild(level,sources,saved.indices,saved.rules,saved.history);
 if(!equal(JSON.parse(serializeWet(c)),saved))fail('source/history/head/counter/item/mission comparison');return c;
}
