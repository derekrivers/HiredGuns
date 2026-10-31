import {transitionInventorySelection} from '../items/inventory-selection';
import type {InventorySelectionOperation} from './training-inventory-selection';
import {transitionInventoryWindow} from '../items/inventory-window';
import type {InventoryWindowOperation} from './training-inventory-window';
import {pickupCorpseStorage} from '../items/corpse-storage-pickup';
import { cellIndex, inBounds, type Position, type LevelData, type MissionRules, type PlayerCommand, type WorldState, type SimulationEvent } from '../contracts';
import { computeNormalDamage } from '../character/damage-arithmetic';
import { sourceDeathSearch, type DeathSearch } from '../character/source-death-search';
import { transitionImmersion } from '../character/immersion-caller';
import { importEditorMap } from '../import/editor-map';
import { importCharacters } from '../import/characters';
import { createTrainingSession, type TrainingSession, type TrainingSources, type TrainingCandidate } from './training-session';
import { initialWet, initialSelectedWet, admitWet, wetSnapshot, rawSnapshot, wetHistory, WET_LIMITS, type WetEvent } from './training-wet';
import { equalConsumableState as equal } from './training-consumables';
import { TRAINING_43_SHA256 } from './mission-profile';
import { stepWorld } from './world';
import { SOURCE_CLOCK_PERIOD, resolveSelectedPartyMission } from './mission';
import { pickupCorpseEquipment } from '../items/corpse-pickup';

export const WET_LIFECYCLE_SCENARIO='training43-wet-lifecycle-v1';
export interface WetHealth {
 spellShield:number; cheatMode2:number; cheatMode3:number; fireWhite:number; fitnessFlashDuration:number; gruntCount:number;
 requests:number; lastHit:number|null; lastDamage:number|null; death:DeathSearch|null;
}
export interface TrainingWetLifecycle { actors:WetHealth[]; second:[number,number][]; leader2:number; redraw:number; expandedAudioMemory:0 }
const MASK=0xf07e07fd;
const fail=(why:string):never=>{throw Error(`Wet lifecycle refused atomically: ${why}`);};
const uint=(n:number,max:number)=>Number.isInteger(n)&&n>=0&&n<=max;
export interface LifecycleEvent { idle:number; count:number; commands:PlayerCommand[] }
/** V16 packs each preceding idle run with its command run. One trailing idle
 * record is permitted. V15's RLE format and exact 128-segment gate are untouched.
 */
export function lifecycleHistory(input:unknown):WetEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>WET_LIMITS.events*2+1)return fail('internal event budget');let ticks=0;
 const events=data.map(e=>{const event=wetHistory([e])[0]!;ticks+=event.count;if(ticks>WET_LIMITS.ticks)fail('tick budget');return event;});
 encodeLifecycleHistory(events);return events;
}
export function encodeLifecycleHistory(events:readonly WetEvent[]):LifecycleEvent[]{
 const packed:LifecycleEvent[]=[];let idle=0;
 for(const e of events){if(!e.commands.length){idle+=e.count;continue;}packed.push({idle,count:e.count,commands:structuredClone(e.commands)});idle=0;}
 if(idle)packed.push({idle,count:0,commands:[]});
 if(packed.length>WET_LIMITS.events)fail('event budget');return packed;
}
export function decodeLifecycleHistory(input:unknown):WetEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>WET_LIMITS.events)return fail('event budget');const events:WetEvent[]=[];let ticks=0;
 for(const [i,e] of data.entries()){
  if(!e||Object.keys(e).sort().join(',')!=='commands,count,idle'||!uint(e.idle,WET_LIMITS.ticks)||!uint(e.count,WET_LIMITS.ticks)||!Array.isArray(e.commands))fail('packed history fields');
  ticks+=e.idle+e.count;if(ticks>WET_LIMITS.ticks)fail('tick budget');
  if(e.count===0){if(i!==data.length-1||e.idle===0||e.commands.length)fail('trailing idle history');}
  else if(!e.commands.length)fail('command history');
  if(e.idle)events.push({count:e.idle,commands:[]});if(e.count)events.push(wetHistory([{count:e.count,commands:e.commands}])[0]!);
 }
 lifecycleHistory(events);return events;
}
/** Explicit importer/display adapter: interrupts/audio/draw calls are not scheduled.
 * Feedback bytes are retained, grunt_count stays zero, cheats/shield clear initially.
 * No claim about original sound/display/interrupt cadence follows from these fields.
 */
export function initialWetLifecycle(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate {
 return initialLifecycle(level,baseline,races,rules,false);
}
/** New selected-team admission reuses every existing lifecycle initializer field. */
export function initialSelectedLifecycle(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate {
 return initialLifecycle(level,baseline,races,rules,true);
}
function initialLifecycle(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,selected:boolean):TrainingCandidate {
 if(level.layers[0].some(w=>((w&32)!==0&&(w>>>28)===7)||((w&2)!==0&&((w>>>11)&63)>=32&&((w>>>11)&63)<=47)))fail('preexisting source corpse/person outside initialized party');
 const {wet:_wet,wetLifecycle:_life,...fresh}=baseline;void _wet;void _life;
 const c=(selected?initialSelectedWet:initialWet)(level,fresh,races,rules);
 c.session={...c.session,wetLifecycle:{actors:races.map(()=>({spellShield:0,cheatMode2:0,cheatMode3:0,fireWhite:0,fitnessFlashDuration:0,gruntCount:0,requests:0,lastHit:null,lastDamage:null,death:null})),second:[],leader2:0,redraw:0,expandedAudioMemory:0}};
 c.world.physics={mode:'source-wet',deadWords:[0,0,0,0]};
 return c;
}
/** Reconstruct all three planes without changing imported geometry or its identity. */
export function wetLifecycleMap(level:LevelData,session:TrainingSession):LevelData {
 const layers=level.layers.map(x=>x.slice()) as LevelData['layers'];
 for(const [i,a,c] of session.wet!.overlays){layers[0][i]=a;layers[2][i]=c;}
 for(const [i,b] of session.wetLifecycle!.second)layers[1][i]=b;
 return {...level,layers};
}
function active(session:TrainingSession,world:WorldState,id:number){return !world.mission.exited[id]&&!session.wet!.actors[id]!.runtimeDeadWord;}
function admitLifecycle(level:LevelData,session:TrainingSession,p:Position):void{
 const i=cellIndex(level,p),w=level.layers[0][i]!;
 if(!inBounds(level,p)||!(w&4)||!(w&32)||(w>>>28)!==7)return admitWet(level,p);
 if(!session.wet!.corpses.includes(i))fail('unowned corpse');
 const below=inBounds(level,{...p,z:p.z-1})?level.layers[0][i-level.size.width*level.size.depth]!:0;
 // Same inert support as v15, with an actually derived source skeleton (aux7).
 // Neither inventory transfer nor corpse replacement is composed here.
 if(((w>>>17)&3)!==2||(w&(2|64|16|256))||((w&1)&&((w>>>9)&3)!==0)||(!(w&1)&&(below&0x1f802)!==2))fail('unsupported corpse support/descent');
}
function validate(level:LevelData,session:TrainingSession,world:WorldState,windowDomain=false):void {
 const wet=session.wet!,life=session.wetLifecycle!;
 if(!wet||!life||wet.actors.length!==4||life.actors.length!==4||world.physics.mode!=='source-wet'||wet.pads.length||life.expandedAudioMemory!==0)return fail('owner/physics/pads/audio');
 if(![wet.leader,life.leader2].every(n=>uint(n,4)))fail('leader');
 const cells=new Set<number>();
 for(let id=0;id<4;id++){
  const a=wet.actors[id]!,h=life.actors[id]!,p=world.mercenaries[id]!,i=cellIndex(level,p);
  if(a.current!==i||![0,0xff00].includes(a.runtimeDeadWord)||a.runtimeDeadWord!==a.body.statsDeadWord||world.physics.deadWords[id]!==a.runtimeDeadWord)fail('body/dead correspondence');
  if((a.body.windowType!==0&&!(windowDomain&&a.body.windowType===1))||a.body.controlMethod!==1||a.body.spellWater||a.body.spellWings||a.pending)fail('uncomposed control/spell/pending');
  if(h.cheatMode2||h.cheatMode3||h.gruntCount!==0||!uint(h.spellShield,65535)||!uint(h.fireWhite,255)||!uint(h.fitnessFlashDuration,255))fail('damage storage/cheat/audio');
  if(active(session,world,id)){
   if(cells.has(i))fail('living body alias');cells.add(i);
   const w=wet.overlays.find(x=>x[0]===i)?.[1],v=w===undefined?-1:(w>>>23)&31;
   if(w===undefined||(w&0x1f802)!==(((32+id*4+p.facing)<<11)|2)||v%4!==id||v>11)fail('owned head');
   admitWet(level,p);
  }else if(a.runtimeDeadWord){
   if(!h.death||a.old!==a.current||wet.leader===id+1||life.leader2===id+1)fail('completed death');
  }
 }
 for(const [i,w] of wet.overlays){
  if((w&0x1f802)&&((w>>>11)&63)>=32&&((w>>>11)&63)<=47){const owner=world.mercenaries.findIndex((p,id)=>active(session,world,id)&&cellIndex(level,p)===i);if(owner<0)fail('orphan head');}
 }
 const targets:number[]=[];
 for(let id=0;id<4;id++){const d=life.actors[id]!.death;if(!d||d.target===null)continue;const i=d.target;
  if(targets.includes(i))fail('corpse alias');targets.push(i);const w=wet.overlays.find(x=>x[0]===i)?.[1]??level.layers[0][i]!,b=life.second.find(x=>x[0]===i)?.[1];
  if((w&0xf0000020)!==0x70000020||b===undefined||((b>>>12)&255)!==id)fail('corpse ownership');
 }
 if(!equal(targets.slice().sort((a,b)=>a-b),wet.corpses.slice().sort((a,b)=>a-b)))fail('corpse list');
}
/** Same numerical core as damageOrdinaryFloorFitness, with separate full-map authority.
 * Never passes a fabricated ordinary floor to that conservative validator.
 */
function applyWetDamage(level:LevelData,session:TrainingSession,world:WorldState,id:number,hit:number,windowDomain=false):void {
 validate(level,session,world,windowDomain);const wet=session.wet!,life=session.wetLifecycle!,a=wet.actors[id]!,h=life.actors[id]!;
 if(!active(session,world,id))fail('damage caller must be live');
 const {damage}=computeNormalDamage(hit,a.body.physique,h.spellShield),before=a.body.fitness;
 // Determine every fatal map effect before any local health writes.
 const after=damage<=before?before-damage:before,fatal=damage>before||after<655;
 let death:DeathSearch|null=null;
 if(fatal){
  const map=wetLifecycleMap(level,session),i=a.current,w=map.layers[0][i]!;
  if((w&1)&&((w>>>9)&3)!==0)fail('pad release uncomposed');
  map.layers[0][i]=(w&MASK)>>>0;death=sourceDeathSearch(map,world.mercenaries[id]!);
  if(death.target!==null&&wet.corpses.includes(death.target))fail('corpse replacement uncomposed');
 }
 h.fireWhite=255;h.fitnessFlashDuration=(h.fitnessFlashDuration+((damage>>>9)+1))&255;
 h.requests++;h.lastHit=hit;h.lastDamage=damage;a.body.fitness=after;
 if(Math.floor(before/655)!==Math.floor(after/655))life.redraw=255;
 if(!fatal)return;
 a.body.statsDeadWord=0xff00;a.runtimeDeadWord=0xff00;a.old=a.current;
 if(wet.leader===id+1)wet.leader=0;if(life.leader2===id+1)life.leader2=0;
 if(world.physics.mode!=='source-wet')return fail('physics');world.physics.deadWords[id]=0xff00;
 const overlays=new Map(wet.overlays.map(([i,w,c])=>[i,[w,c] as [number,number]])),current=overlays.get(a.current)!;
 overlays.set(a.current,[(current[0]&MASK)>>>0,current[1]]);
 if(death!.target!==null){const i=death!.target,[w,c]=overlays.get(i)??[level.layers[0][i]!,level.layers[2][i]!];
  overlays.set(i,[((w&0x0fffffdf)|0x70000020)>>>0,c]);
  life.second.push([i,((level.layers[1][i]!&0xfff00fff)|(id<<12))>>>0]);life.second.sort((a,b)=>a[0]-b[0]);wet.corpses.push(i);
 }
 wet.overlays=[...overlays].sort((a,b)=>a[0]-b[0]).map(([i,[w,c]])=>[i,w,c]);h.death=death;life.redraw=255;
}
/** Pure testable full-candidate companion; live calls only originate from immersion. */
export function damageWetCandidate(level:LevelData,candidate:TrainingCandidate,id:number,hit:number):TrainingCandidate{
 const c=wetSnapshot(candidate);if(!uint(id,3))fail('party index');applyWetDamage(level,c.session,c.world,id,hit);validate(level,c.session,c.world);return c;
}
function heads(level:LevelData,session:TrainingSession,world:WorldState,previous:WorldState,oldSession:TrainingSession){
 const wet=session.wet!,overlay=new Map(wet.overlays.map(([i,w,c])=>[i,[w,c] as [number,number]]));
 const at=(i:number)=>overlay.get(i)??[level.layers[0][i]!,level.layers[2][i]!] as [number,number];
 // Departures/new retirement first. Death already removed its owned head once.
 for(let id=0;id<4;id++)if(active(oldSession,previous,id)&&!wet.actors[id]!.runtimeDeadWord){
  const a=wet.actors[id]!;if(a.current!==cellIndex(level,world.mercenaries[id]!)||world.mission.exited[id]){const [w,c]=at(a.current);overlay.set(a.current,[(w&MASK)>>>0,c]);}
 }
 for(let id=0;id<4;id++){
  const a=wet.actors[id]!,p=world.mercenaries[id]!,i=cellIndex(level,p),old=a.current;
  a.current=i;if(!active(session,world,id))continue;
  const [w,c]=at(i),h=session.wetLifecycle!.actors[id]!,variant=id+(h.fireWhite?8:h.spellShield?4:0);
  overlay.set(i,[((w&MASK)|((32+id*4+p.facing)<<11)|(variant<<23)|2)>>>0,old!==i?(c&0xdfffffff)>>>0:c]);
 }
 wet.overlays=[...overlay].sort((a,b)=>a[0]-b[0]).map(([i,[w,c]])=>[i,w,c]);
}
/** One indivisible full-party candidate. Drown -> falling (dead guard) -> controls. */
export function stepWetLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],record=true,missionResolver?: (world:WorldState,events:SimulationEvent[])=>void){
 return stepLifecycle(level,session,previous,commands,record,missionResolver,WET_LIMITS.ticks);
}
/** Distinct v19 caller; legacy public stepping retains its exact 45000 gate. */
export function stepTimeoutLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[]){
 if(!session||Object.getPrototypeOf(session)!==Object.prototype)fail('timeout owner');
 const d=Object.getOwnPropertyDescriptor(session,'wetParty');if(!d?.enumerable||!Object.hasOwn(d,'value')||Object.getOwnPropertyDescriptor(session,'wetRegion'))fail('timeout data owner');
 for(const key of ['wet','wetLifecycle']){const field=Object.getOwnPropertyDescriptor(session,key);if(!field?.enumerable||!Object.hasOwn(field,'value')||!field.value||Object.getPrototypeOf(field.value)!==Object.prototype)fail('timeout lifecycle data owner');}
 const s=wetSnapshot({party:d!.value,rules:previous.mission.rules});
 if(!s.party||Object.keys(s.party).join(',')!=='profile'||s.party.profile!=='four-controlled-timeout-v1'||Object.keys(s.rules).sort().join(',')!=='mode,timeLimit'||s.rules.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(s.rules.mode))fail('timeout profile/rules');
 return stepLifecycle(level,session,previous,commands,false,resolveSelectedPartyMission,99*SOURCE_CLOCK_PERIOD);
}
/** Dedicated typed control phase, after hazards and before world/mission once. */
export function stepInventoryWindowLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],operation:InventoryWindowOperation|null){
 if(session.inventoryWindow?.profile!=='one-native-inventory-window-cycle-v1'||session.wetParty?.profile!=='four-controlled-timeout-v1'||previous.mission.rules.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(previous.mission.rules.mode))fail('inventory window owner/rules');
 if(operation&&(!uint(operation.actor,3)||commands.length))fail('sole inventory operation');
 if(session.wet!.actors.some(a=>a.body.windowType===1)&&(commands.length||operation&&operation.kind!=='close'))fail('unsupported open-window controls');
 return stepLifecycle(level,session,previous,commands,false,resolveSelectedPartyMission,99*SOURCE_CLOCK_PERIOD,null,'equipment',{operation});
}
/** Distinct selection owner: hazards first, native caller second, world once. */
export function stepInventorySelectionLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],operation:InventorySelectionOperation|null){
 if(session.inventorySelection?.profile!=='one-native-inventory-selection-cycle-v1'||session.wetParty?.profile!=='four-controlled-timeout-v1'||previous.mission.rules.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(previous.mission.rules.mode))fail('inventory selection owner/rules');
 if(operation&&(!uint(operation.actor,3)||commands.length))fail('sole selection operation');
 if(session.wet!.actors.some(a=>a.body.windowType===1)&&commands.length)fail('unsupported open-window controls');
 return stepLifecycle(level,session,previous,commands,false,resolveSelectedPartyMission,99*SOURCE_CLOCK_PERIOD,null,'equipment',{operation,selection:true});
}
/** New-profile domain command only. No arbitrary mutable control callback. */
export function stepStoragePickupLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],actor:number|null){
 // Internal entry: the profile owner has captured all external authority before
 // arriving here. No runtime callback receives this candidate or its geometry.
 if(session.storagePickup?.profile!=='one-native-storage-pickup-v1'||session.wetParty?.profile!=='four-controlled-timeout-v1'||previous.mission.rules.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(previous.mission.rules.mode))fail('corpse pickup owner/rules');
 if(actor!==null&&(!uint(actor,3)||commands.length))fail('pickup-only domain command');
 return stepLifecycle(level,session,previous,commands,false,resolveSelectedPartyMission,99*SOURCE_CLOCK_PERIOD,actor,'storage');
}
/** New-profile domain command only. No arbitrary mutable control callback. */
export function stepCorpsePickupLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],actor:number|null){
 // Internal entry: the profile owner has captured all external authority before
 // arriving here. No runtime callback receives this candidate or its geometry.
 if(session.corpsePickup?.profile!=='one-native-equipment-pickup-v1'||session.wetParty?.profile!=='four-controlled-timeout-v1'||previous.mission.rules.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(previous.mission.rules.mode))fail('corpse pickup owner/rules');
 if(actor!==null&&(!uint(actor,3)||commands.length))fail('pickup-only domain command');
 return stepLifecycle(level,session,previous,commands,false,resolveSelectedPartyMission,99*SOURCE_CLOCK_PERIOD,actor);
}
function corpseControl(level:LevelData,session:TrainingSession,world:WorldState,id:number):string{
 const wet=session.wet!,a=wet.actors[id]!;
 // Native dead guard runs after hazards. A fatal queued tick must still commit.
 if(!active(session,world,id)||a.body.windowType===7||!a.body.controlMethod)return 'caller-guard';
 const map=wetLifecycleMap(level,session),i=a.current,first=map.layers[0][i]!,second=map.layers[1][i]!,owner=(second>>>12)&255;
 if(((first&0xf0000020)>>>0)!==0x70000020||!wet.corpses.includes(i)||owner>3||owner===id)return 'profile-refusal';
 const source=wet.actors[owner]!;
 if(source.runtimeDeadWord!==0xff00||source.body.statsDeadWord!==0xff00||session.wetLifecycle!.actors[owner]!.death?.target!==i||a.body.windowType!==0||a.body.controlMethod!==1||a.body.inventory.equipped.itemId||source.body.inventory.equipped.itemId)return 'profile-refusal';
 for(const body of [a.body,source.body]){
  if(body.spellWater||body.spellWings)return 'profile-refusal';
  let ended=false;for(const slot of body.inventory.carried){if(!slot.itemId)ended=true;else if(ended)return 'profile-refusal';}
 }
 const result=pickupCorpseEquipment({actors:wet.actors.map(a=>a.body),deadWords:wet.actors.map(a=>a.runtimeDeadWord),players:wet.actors.map(()=>({selection:0,lastPosition:0,noRoom:0,heavyCount:0})),recipient:id,cell:{first,second,third:map.layers[2][i]!},redraw:session.wetLifecycle!.redraw},session.items);
 if(result.outcome==='transferred'){
  if(result.state.actors[id]!.weight.tooHeavy||result.state.actors[owner]!.weight.tooHeavy)return 'profile-refusal';
  for(const j of [id,owner])wet.actors[j]!.body=result.state.actors[j]!;
  session.wetLifecycle!.redraw=result.state.redraw;
 }
 return result.outcome;
}
function storageControl(level:LevelData,session:TrainingSession,world:WorldState,id:number,windowDomain=false):string{
 const metadata=windowDomain?(session.inventorySelection??session.inventoryWindow!):session.storagePickup!;
 const wet=session.wet!,a=wet.actors[id]!;
 // Native dead guard runs after hazards. A fatal queued tick must still commit.
 if(!active(session,world,id)||a.body.windowType===7||!a.body.controlMethod)return 'caller-guard';
 const map=wetLifecycleMap(level,session),i=a.current,first=map.layers[0][i]!,second=map.layers[1][i]!,owner=(second>>>12)&255;
 if(((first&0xf0000020)>>>0)!==0x70000020||!wet.corpses.includes(i)||owner>3||owner===id)return 'profile-refusal';
 const source=wet.actors[owner]!;
 if(source.runtimeDeadWord!==0xff00||source.body.statsDeadWord!==0xff00||session.wetLifecycle!.actors[owner]!.death?.target!==i||a.body.windowType!==0||a.body.controlMethod!==1||a.body.inventory.equipped.itemId||source.body.inventory.equipped.itemId)return 'profile-refusal';
 for(const body of [a.body,source.body]){
  if(body.spellWater||body.spellWings)return 'profile-refusal';
  let ended=false;for(const slot of body.inventory.carried){if(!slot.itemId)ended=true;else if(ended)return 'profile-refusal';}
 }
 if(a.body.weight.tooHeavy||source.body.weight.tooHeavy||a.body.inventory.carried[29]!.itemId)return 'profile-refusal';
 const result=pickupCorpseStorage({actors:wet.actors.map(a=>a.body),deadWords:wet.actors.map(a=>a.runtimeDeadWord),players:wet.actors.map((_,j)=>({selection:0,lastPosition:metadata.lastPositions[j]!,noRoom:0,heavyCount:0})),recipient:id,cell:{first,second,third:map.layers[2][i]!},redraw:session.wetLifecycle!.redraw},session.items);
 if(result.outcome==='transferred'){
  if(result.state.actors[id]!.weight.tooHeavy||result.state.actors[owner]!.weight.tooHeavy)return 'profile-refusal';
  for(const j of [id,owner])wet.actors[j]!.body=result.state.actors[j]!;
  session.wetLifecycle!.redraw=result.state.redraw;
  metadata.lastPositions=result.state.players.map(p=>p.lastPosition);
 }
 return result.outcome;
}
function stepLifecycle(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],record:boolean,missionResolver:((world:WorldState,events:SimulationEvent[])=>void)|undefined,tickLimit:number,pickupActor:number|null=null,pickupKind:'equipment'|'storage'='equipment',windowDomain?:{operation:InventoryWindowOperation|InventorySelectionOperation|null;selection?:boolean}){
 validate(level,session,previous,!!windowDomain);if(previous.mission.outcome!=='active')return {world:previous,session,events:[]};
 if(previous.tick>=tickLimit)fail('future tick budget');
 const next={...session,...(windowDomain?.selection?{inventorySelection:structuredClone(session.inventorySelection!)}:windowDomain?{inventoryWindow:structuredClone(session.inventoryWindow!)}:{}),...(pickupKind==='storage'?{storagePickup:structuredClone(session.storagePickup!)}:{}),wet:structuredClone(session.wet!),wetLifecycle:structuredClone(session.wetLifecycle!)};
 const wet=next.wet,prospective=structuredClone(previous);
 wet.drownCounter=(wet.drownCounter+1)&65535;wet.fallCounter=(wet.fallCounter+1)&65535;
 const effects:{tick:number;mercenaryId:number;kind:'damaged'|'died'}[]=[];
 if((wet.drownCounter<<16>>16)>=50){wet.drownCounter=0;
  for(let id=0;id<4;id++){
   if(!active(next,prospective,id))continue;const a=wet.actors[id]!,result=transitionImmersion({actor:a.body,cellLong:level.layers[0][a.current]!,items:session.items});
   a.body=result.candidate;a.lastInventoryStatus=result.inventoryStatus;if(result.inventoryStatus==='processed')a.itemPasses++;
   if(result.damageRequest!==null){applyWetDamage(level,next,prospective,id,result.damageRequest.requestedHit,!!windowDomain);effects.push({tick:previous.tick+1,mercenaryId:id,kind:a.runtimeDeadWord?'died':'damaged'});}
  }
 }
 if(wet.fallCounter>6){wet.fallCounter-=6;for(let id=0;id<4;id++){
  if(!active(next,prospective,id))continue;const a=wet.actors[id]!;a.delay=level.layers[0][a.current]!&4?(a.delay?a.delay-1:2):0;a.pending=0;
 }}
 for(const a of wet.actors)if(!a.runtimeDeadWord)a.old=a.current;
 const op=windowDomain?.operation;
 let windowResult:string|null=null;
 const metadata=windowDomain?.selection?next.inventorySelection!:next.inventoryWindow!;
 if(op&&(op.kind==='forward'||op.kind==='backward')){
  const a=wet.actors[op.actor]!,m=next.inventorySelection!;
  const r=transitionInventorySelection({actor:a.body,runtimeDeadWord:!active(next,prospective,op.actor)?0xff00:a.runtimeDeadWord,temp:m.tempEntries[op.actor]!,redraw:next.wetLifecycle!.redraw,selection:m.selections[op.actor]!},op.kind);
  m.selections[op.actor]=r.state.selection;m.selectionOutcomes.push(r.outcome);next.wetLifecycle!.redraw=r.state.redraw;
 }else if(op&&(op.kind==='open'||op.kind==='close')){
  const a=wet.actors[op.actor]!;const r=transitionInventoryWindow({actor:a.body,runtimeDeadWord:!active(next,prospective,op.actor)?0xff00:a.runtimeDeadWord,temp:metadata.tempEntries[op.actor]!,redraw:next.wetLifecycle!.redraw},op.kind);
  a.body=r.state.actor;metadata.tempEntries[op.actor]=r.state.temp;next.wetLifecycle!.redraw=r.state.redraw;metadata.windowOutcomes.push(r.outcome);windowResult=r.outcome;
 }
 const pickup=op?.kind==='storage'?storageControl(level,next,prospective,op.actor,true):pickupActor===null?null:pickupKind==='storage'?storageControl(level,next,prospective,pickupActor):corpseControl(level,next,prospective,pickupActor);
 // Immutable source geometry drives movement. Dynamic living occupancy is the source-wet dead-word guard.
 // Corpse aux7 is non-solid in source move; its inert presence does not replace stair geometry.
 const geometry=wet.corpses.length?wetLifecycleMap(level,next):level;
 if(geometry!==level)for(let id=0;id<4;id++)if(active(next,prospective,id)){const i=wet.actors[id]!.current;geometry.layers[0][i]=(geometry.layers[0][i]!&MASK)>>>0;}
 const result=stepWorld(geometry,prospective,commands,p=>admitLifecycle(geometry,next,p),true,missionResolver);
 for(let id=0;id<4;id++){const a=wet.actors[id]!,i=cellIndex(level,result.world.mercenaries[id]!);if(!(level.layers[0][a.current]!&4)&&(level.layers[0][i]!&4)&&result.events.some(e=>e.mercenaryId===id&&e.kind==='moved'))a.entries++;}
 heads(level,next,result.world,previous,session);
 const inventory:TrainingSession['inventory']={commands:[],actors:wet.actors.map((a,i)=>({inventory:structuredClone(a.body.inventory),weight:{...a.body.weight,status:'verified'},selection:windowDomain?.selection?next.inventorySelection!.selections[i]!:0}))};
 const candidate={world:result.world,session:{...next,inventory}};
 if(record){const history=wet.history,last=history.at(-1);if(last&&equal(last.commands,commands))last.count++;else history.push({count:1,commands:structuredClone([...commands])});wet.history=lifecycleHistory(history);serializeWetLifecycle(candidate);}
 validate(level,candidate.session,candidate.world,!!windowDomain);return {...candidate,events:[...effects,...result.events],...(pickup===null?{}:{pickup}),...(windowResult===null?{}:{windowResult})};
}
export function serializeWetLifecycle(c:TrainingCandidate):string {
 const {history,...state}=c.session.wet!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:16,scenario:WET_LIFECYCLE_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodeLifecycleHistory(history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle}});
 if(new TextEncoder().encode(json).length>=WET_LIMITS.bytes)fail('future save byte budget');return json;
}
export function replayWetLifecycle(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,input:unknown):TrainingCandidate {
 const history=lifecycleHistory(input);let c=initialWetLifecycle(level,baseline,races,rules);
 for(const e of history)for(let i=0;i<e.count;i++){if(c.world.mission.outcome!=='active')fail('history after terminal');const next=stepWetLifecycle(level,c.session,c.world,e.commands,false);c={session:next.session,world:next.world};}
 c.session.wet!.history=history;serializeWetLifecycle(c);return c;
}
async function rebuild(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown):Promise<TrainingCandidate>{
 const map=wetSnapshot(level),chosen=wetSnapshot(indices),policy=wetSnapshot(rules),history=lifecycleHistory(input),raw=rawSnapshot(sources);
 const imported=await importEditorMap(raw.map);if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,chosen),roster=await importCharacters(raw.roster);
 return replayWetLifecycle(imported.level,baseline.session,chosen.map(i=>roster.records[i]!.race),policy,history);
}
export async function activateWetLifecycle(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean):Promise<TrainingCandidate>{
 const saved=wetSnapshot({session,world});if(!paused||world.tick!==0||saved.session.wet||saved.session.gate||saved.session.ground||saved.session.consumables||saved.session.inventory.commands.length)fail('fresh paused ready state required');
 return rebuild(level,sources,saved.session.indices,saved.world.mission.rules,[]);
}
export async function exportWetLifecycle(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState):Promise<string>{
 const saved=wetSnapshot({session,world}),c=await rebuild(level,sources,saved.session.indices,saved.session.wet!.rules,saved.session.wet!.history);
 if(!equal(c,saved))fail('complete source/history/lifecycle mismatch');return serializeWetLifecycle(c);
}
export async function importWetLifecycle(level:LevelData,sources:TrainingSources,input:unknown):Promise<TrainingCandidate>{
 const saved=wetSnapshot(input) as ReturnType<typeof JSON.parse>;
 if(!saved||Object.keys(saved).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||saved.format!=='hired-guns-training-session'||saved.version!==16||saved.scenario!==WET_LIFECYCLE_SCENARIO)fail('wrapper fields');
 const history=decodeLifecycleHistory(saved.history),c=await rebuild(level,sources,saved.indices,saved.rules,history);if(!equal(JSON.parse(serializeWetLifecycle(c)),saved))fail('source/history/health/dead/head/corpse/search/counter/mission comparison');return c;
}
