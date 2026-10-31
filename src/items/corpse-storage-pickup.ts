import type { ImmersionActor } from '../character/immersion-caller';
import type { InventorySlot } from '../import/characters';
import { computeSourceWeight } from '../import/inventory';
import type { ItemCatalog } from '../import/items';
import { wetSnapshot } from '../sim/training-wet';

/** Native bookkeeping model for isolated branch tests. These fields are not
 * observed RAM or new live interrupt timers. Live admission avoids their writes. */
export interface StoragePickupMetadata { selection:number; lastPosition:number; noRoom:number; heavyCount:number }
export interface CorpseStoragePickupInput {
 actors:ImmersionActor[]; deadWords:number[]; players:StoragePickupMetadata[];
 recipient:number; cell:{first:number;second:number;third:number}; redraw:number;
}
export type StoragePickupOutcome='caller-guard'|'already-too-heavy'|'outside-corpse'|'window-refusal'|'empty-corpse'|'no-room'|'transferred';
const fail=(why:string):never=>{throw Error(`Corpse storage pickup refused: ${why}`);};
const uint=(n:number,max:number)=>Number.isInteger(n)&&n>=0&&n<=max;
function fields(v:object,names:string[]){if(Object.keys(v).sort().join(',')!==names.sort().join(','))fail('fields');}
const hex=(s:InventorySlot)=>[s.itemId,s.damage,s.ammo,s.fourthByte].map(n=>n.toString(16).padStart(2,'0')).join('');
const clear=(s:InventorySlot):InventorySlot=>({...s,itemId:0,rawHex:`00${s.rawHex.slice(2)}`});
function slot(s:InventorySlot,items:ItemCatalog){
 fields(s,['itemId','damage','ammo','fourthByte','rawHex']);
 if(![s.itemId,s.damage,s.ammo,s.fourthByte].every(n=>uint(n,255))||s.rawHex!==hex(s)||s.itemId>114||s.itemId&&!items.records[s.itemId-1])fail('entry/catalog');
}
function validate(s:CorpseStoragePickupInput,items:ItemCatalog){
 if(items.records.length!==114||items.records.some((r,i)=>r.itemId!==i+1||!uint(r.category,255)||!uint(r.weight,65535)))fail('parsed item table domain');
 fields(s,['actors','deadWords','players','recipient','cell','redraw']);fields(s.cell,['first','second','third']);
 if(s.actors.length!==4||s.deadWords.length!==4||s.players.length!==4||!uint(s.recipient,3)||!uint(s.redraw,255)||!Object.values(s.cell).every(n=>uint(n,0xffffffff)))fail('storage');
 for(const p of s.players){fields(p,['selection','lastPosition','noRoom','heavyCount']);if(!uint(p.selection,29)||!uint(p.lastPosition,29)||!uint(p.noRoom,65535)||!uint(p.heavyCount,65535))fail('metadata');}
 for(const [i,a] of s.actors.entries()){
  fields(a,['statsDeadWord','windowType','controlMethod','race','physique','fitness','spellWater','spellWings','underwaterCount','drowningIndicator','inventory','weight']);
  if(![a.statsDeadWord,a.windowType,a.physique,a.fitness,a.spellWater,a.spellWings,a.underwaterCount,a.drowningIndicator,s.deadWords[i]!].every(n=>uint(n,65535))||!uint(a.race,255)||!uint(a.controlMethod,255))fail('body');
  fields(a.inventory,['equipped','carried','actions']);if(a.inventory.carried.length!==30||a.inventory.actions.length!==10)fail('inventory width');
  for(const x of [a.inventory.equipped,...a.inventory.carried,...a.inventory.actions])slot(x,items);
  fields(a.weight,['totalWeight','quotient','tooHeavy','usingGrenade']);if(!uint(a.weight.totalWeight,0xffffffff)||!uint(a.weight.quotient,65535)||typeof a.weight.tooHeavy!=='boolean'||![0,2].includes(a.weight.usingGrenade))fail('weight storage');
 }
}
/** Pure action22 skeleton branch over authored parsed arithmetic inputs; raw
 * source authority belongs to the profile reconstruction. Owner range is a conservative pointer bound;
 * living/self owners are excluded by the live profile, not by native pick_up. */
export function pickupCorpseStorage(input:CorpseStoragePickupInput,catalog:ItemCatalog){
 const s=wetSnapshot(input),items=wetSnapshot(catalog);validate(s,items);
 const r=s.actors[s.recipient]!,rp=s.players[s.recipient]!;
 const finish=(outcome:StoragePickupOutcome,owner:number|null=null,item:number|null=null)=>({state:s,outcome,owner,item});
 if(s.deadWords[s.recipient]||r.windowType===7||!r.controlMethod)return finish('caller-guard');
 if((r.windowType<<16>>16)>1)return finish('window-refusal');
 if(r.weight.tooHeavy)return finish('already-too-heavy');
 if(((s.cell.first&0xf0000020)>>>0)!==0x70000020)return finish('outside-corpse');
 const owner=(s.cell.second>>>12)&255;if(owner>3)fail('unsafe native owner pointer');
 if(owner===s.recipient)fail('aliased owner outside primitive profile');
 const source=s.actors[owner]!,sp=s.players[owner]!,inv=source.inventory,dst=r.inventory;
 const using=!!inv.equipped.itemId,picked={...(using?inv.equipped:inv.carried[0]!)};
 if(!picked.itemId)return finish('empty-corpse',owner);
 // insert_item always records selection, even when the full store refuses.
 rp.lastPosition=rp.selection;
 if(dst.carried[29]!.itemId){rp.noRoom=150;return finish('no-room',owner,picked.itemId);}
 // Literal unconditional native loop: selection29 returns slot28.
 let at=29;do{dst.carried[at]={...dst.carried[at-1]!};at--;}while(at>rp.selection);
 dst.carried[at]={...picked,fourthByte:255};dst.carried[at]!.rawHex=hex(dst.carried[at]!);
 if(using)inv.equipped=clear(inv.equipped);
 else if(!inv.carried[1]!.itemId){inv.carried[0]=clear(inv.carried[0]!);if(sp.selection)sp.selection--;}
 else {let j=0;while(j<29&&inv.carried[j+1]!.itemId){inv.carried[j]={...inv.carried[j+1]!};j++;}inv.carried[j]=clear(inv.carried[j]!);}
 const weigh=(a:ImmersionActor,p:StoragePickupMetadata)=>{
  const result=computeSourceWeight(items,a.inventory,a.physique,a.spellWings);if(result.status!=='computed')return fail(result.reason);
  const {status:_status,...weight}=result;void _status;a.weight=weight;if(weight.tooHeavy)p.heavyCount=50;
 };
 // remove_item recalculates the source even when that body is dead.
 weigh(source,sp);if(!inv.carried[sp.selection]!.itemId&&sp.selection)sp.selection--;
 weigh(r,rp);s.redraw=255;return finish('transferred',owner,picked.itemId);
}
