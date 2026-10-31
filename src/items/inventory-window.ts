import type {ImmersionActor} from '../character/immersion-caller';
import type {InventorySlot} from '../import/characters';
import {wetSnapshot} from '../sim/training-wet';

export type InventoryWindowAction='open'|'close';
export interface InventoryWindowInput {actor:ImmersionActor;runtimeDeadWord:number;temp:InventorySlot;redraw:number}
const fail=(why:string):never=>{throw Error(`Inventory window refused: ${why}`);};
export function inventoryEntry(s:InventorySlot):void{
 if(!s||Object.keys(s).sort().join(',')!=='ammo,damage,fourthByte,itemId,rawHex'||![s.itemId,s.damage,s.ammo,s.fourthByte].every(n=>Number.isInteger(n)&&n>=0&&n<=255)||s.itemId>114||s.rawHex!==[s.itemId,s.damage,s.ammo,s.fourthByte].map(n=>n.toString(16).padStart(2,'0')).join(''))fail('complete raw entry');
}
/** Source variable-clear inference, not an observed native RAM temporary slot. */
export function emptyInventoryTemp():InventorySlot{return {itemId:0,damage:0,ammo:0,fourthByte:0,rawHex:'00000000'};}
/** Direct native10/9 only. DBF31 clears equipment + separate temp +30store.
 * No count/weight calculation, action-entry clear, scrolling, audio or FX. */
export function transitionInventoryWindow(input:InventoryWindowInput,operation:InventoryWindowAction){
 const s=wetSnapshot({input,operation});const v=s.input,a=v.actor;
 if(Object.keys(v).sort().join(',')!=='actor,redraw,runtimeDeadWord,temp'||!['open','close'].includes(s.operation)||![v.runtimeDeadWord,a.windowType].every(n=>Number.isInteger(n)&&n>=0&&n<=65535)||!Number.isInteger(a.controlMethod)||a.controlMethod<0||a.controlMethod>255||!Number.isInteger(v.redraw)||v.redraw<0||v.redraw>255)fail('caller/action');
 if(a.inventory.carried.length!==30||a.inventory.actions.length!==10)fail('inventory widths');
 for(const e of [a.inventory.equipped,v.temp,...a.inventory.carried,...a.inventory.actions])inventoryEntry(e);
 if(v.runtimeDeadWord||a.windowType===7||!a.controlMethod)return {state:v,outcome:'caller-guard' as const};
 if(s.operation==='close'&&a.windowType===1){
  for(const e of [a.inventory.equipped,v.temp,...a.inventory.carried]){e.fourthByte=0;e.rawHex=e.rawHex.slice(0,6)+'00';}
 }
 a.windowType=s.operation==='open'?1:0;v.redraw=255;
 return {state:v,outcome:'applied' as const};
}
