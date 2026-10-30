import type { LevelData, PlayerCommand, WorldState } from '../contracts';
import type { TrainingSession, TrainingCandidate } from './training-session';
import { createWorld, stepWorld, obstruction } from './world';
import { selectedFallLevel } from './fall';
import { exchangeOccupiedEquipment, returnEquipmentToBackpack, transferIntoEmptyEquipment } from './training-inventory';
import { useConsumable } from '../items/consumable-use';

export const CONSUMABLE_FIXTURE='selected-dry-fall-consumables-v1';
export const MAX_CONSUMABLE_EVENTS=128, MAX_CONSUMABLE_TICKS=45000;
export type ConsumableEvent = {kind:'ticks';count:number;commands:PlayerCommand[]} | {kind:'equip'|'exchange'|'return';actor:number;slot:number} | {kind:'use';actor:number};
export interface TrainingConsumables { history:ConsumableEvent[]; races:number[]; lastUse:(ReturnType<typeof useConsumable>['receipt'] & {actor:number;tick:number}) | null }
export const equalConsumableState=(a:unknown,b:unknown):boolean=>{
 const canon=(v:unknown):string=>Array.isArray(v)?`[${v.map(canon).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon((v as Record<string,unknown>)[k])).join(',')}}`:JSON.stringify(v);
 return canon(a)===canon(b);
};
function exact(v:unknown,keys:string[]):asserts v is Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Reflect.ownKeys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))throw Error('Malformed consumable event.');}
const integer=(v:unknown,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max;
export function consumableHistory(value:unknown):ConsumableEvent[]{
 if(!Array.isArray(value)||value.length>MAX_CONSUMABLE_EVENTS||Reflect.ownKeys(value).length!==value.length+1)throw Error('Consumable history budget or density.');
 let ticks=0;return Array.from(value,e=>{
  if(e?.kind==='ticks'){
   exact(e,['kind','count','commands']);if(!integer(e.count,MAX_CONSUMABLE_TICKS)||!e.count||!Array.isArray(e.commands)||e.commands.length>4||Reflect.ownKeys(e.commands).length!==e.commands.length+1)throw Error('Consumable tick budget/commands.');
   ticks+=e.count;if(ticks>MAX_CONSUMABLE_TICKS)throw Error('Consumable tick budget.');
   const ids=new Set<number>();const commands=e.commands.map(c=>{exact(c,['mercenaryId','action']);if(!integer(c.mercenaryId,3)||ids.has(c.mercenaryId)||!['forward','backward','strafe-left','strafe-right','turn-left','turn-right'].includes(c.action as string))throw Error('Consumable movement command.');ids.add(c.mercenaryId);return {mercenaryId:c.mercenaryId,action:c.action} as PlayerCommand;});
   return {kind:'ticks',count:e.count,commands};
  }
  const use=e?.kind==='use';exact(e,use?['kind','actor']:['kind','actor','slot']);
  if(!integer(e.actor,3)||(!use&&(!['equip','exchange','return'].includes(e.kind as string)||!integer(e.slot,e.kind==='return'?28:29))))throw Error('Consumable item command.');
  return use?{kind:'use',actor:e.actor}:{kind:e.kind,actor:e.actor,slot:e.slot} as ConsumableEvent;
 });
}
export function appendConsumableEvent(state:TrainingConsumables,event:ConsumableEvent):ConsumableEvent[]{
 const history=structuredClone(state.history),last=history.at(-1);
 if(event.kind==='ticks'&&last?.kind==='ticks'&&equalConsumableState(last.commands,event.commands))last.count+=event.count;
 else history.push(structuredClone(event));
 return consumableHistory(history);
}
function eligible(level:LevelData,world:WorldState,actor:number):void {
 if(world.physics.mode!=='dry-fall'||world.mission.rules.mode!=='navigation')throw Error('Consumables require authored dry-fall navigation.');
 const health=world.physics.actors[actor]!;
 if(health.dead||health.fitness===0)throw Error('Incapacitated actor cannot use or change items.');
 if(world.mission.exited[actor])throw Error('Extracted actor is retired.');
 if(health.fallDamage!==0||obstruction(level,world.mercenaries[actor]!)!==null)throw Error('Pending fall: wait for a settled landing before changing or using items.');
}
/** Chronological replay; prior gravity always sees the inventory weight at that time. */
export function replayConsumables(level:LevelData,baseline:TrainingSession,races:number[],input:unknown):TrainingCandidate{
 if(!selectedFallLevel(level)||races.length!==4||!races.every(n=>integer(n,255)))throw Error('Consumable fixture/races mismatch.');
 const history=consumableHistory(input),inventory=structuredClone(baseline.inventory);
 inventory.commands=[];
 const profile=baseline.team.actors.map((a,i)=>({physique:a.stats.physique,agility:a.stats.agility,weight:inventory.actors[i]!.weight.totalWeight,fitness:65535,dead:false,fallDamage:0}));
 let world=createWorld(level,undefined,undefined,profile as Parameters<typeof createWorld>[3]);
 let lastUse:TrainingConsumables['lastUse']=null;
 for(const event of history){
  if(event.kind==='ticks'){
   for(let n=0;n<event.count;n++){const next=stepWorld(level,world,event.commands).world;if(next.tick!==world.tick+1)throw Error('Ticks after terminal state.');world=next;}continue;
  }
  eligible(level,world,event.actor);
  if(world.physics.mode!=='dry-fall')throw Error('Dry fall required.');
  const a=inventory.actors[event.actor]!,health=world.physics.actors[event.actor]!;
  if(event.kind==='use'){
   const result=useConsumable(baseline.items,a.inventory,races[event.actor]!,health.physique,health.fitness);
   a.inventory=result.inventory;a.weight=result.weight;health.fitness=result.fitness;health.weight=result.weight.totalWeight;
   lastUse={...result.receipt,actor:event.actor,tick:world.tick};
  }else{
   const transfer=event.kind==='equip'?transferIntoEmptyEquipment:event.kind==='exchange'?exchangeOccupiedEquipment:returnEquipmentToBackpack;
   const result=transfer(a.inventory,baseline.items,health.physique,event.slot);
   inventory.actors[event.actor]={...result,weight:{...result.weight,status:'verified'}};
  }
 }
 return {world,session:{...baseline,encounter:null,inventory,consumables:{history,races:[...races],lastUse}}};
}
/** The same exact byte limits apply before live ticks and async installation. */
export function serializeConsumables(candidate:TrainingCandidate):string {
 const checkpoint=JSON.stringify({world:candidate.world});
 if(new TextEncoder().encode(checkpoint).length>=16*1024)throw Error('Consumable nested checkpoint exceeds 16 KiB.');
 const json=JSON.stringify({format:'hired-guns-training-session',version:14,scenario:CONSUMABLE_FIXTURE,sources:{map:`authored:${CONSUMABLE_FIXTURE}`,...candidate.session.team.sources},indices:candidate.session.indices,history:candidate.session.consumables!.history,checkpoint});
 if(new TextEncoder().encode(json).length>=24*1024)throw Error('Training43 session is too large.');
 return json;
}
/** Live tick uses the same immutable world step and bounded chronological event writer. */
export function stepConsumables(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[]){
 if(!session.consumables)throw Error('Consumable practice not active.');
 const result=stepWorld(level,world,commands);
 if(result.world.tick===world.tick)return {...result,session};
 const history=appendConsumableEvent(session.consumables,{kind:'ticks',count:1,commands:[...commands]});
 const candidate={...result,session:{...session,consumables:{...session.consumables,history}}};
 serializeConsumables(candidate);return candidate;
}
