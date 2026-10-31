import type {InventoryWindowInput} from './inventory-window';
import {inventoryEntry} from './inventory-window';
import {wetSnapshot} from '../sim/training-wet';

export type InventorySelectionAction='forward'|'backward';
export interface InventorySelectionInput extends InventoryWindowInput {selection:number}
/** Controls4948/5021, after the native caller's dead/window7/method0 guards.
 * No count/weight, entry, TEMP, action-slot, last-position or scroll writes.
 * Lifecycle separately owns old=current and ordinary hazards before this call. */
export function transitionInventorySelection(input:InventorySelectionInput,operation:InventorySelectionAction){
 const s=wetSnapshot({input,operation}),v=s.input,a=v.actor;
 const fail=():never=>{throw Error('Inventory selection refused: caller/action/entry');};
 if(Object.keys(v).sort().join(',')!=='actor,redraw,runtimeDeadWord,selection,temp'||!['forward','backward'].includes(s.operation)||![v.runtimeDeadWord,a.windowType].every(n=>Number.isInteger(n)&&n>=0&&n<=65535)||!Number.isInteger(a.controlMethod)||a.controlMethod<0||a.controlMethod>255||!Number.isInteger(v.redraw)||v.redraw<0||v.redraw>255||!Number.isInteger(v.selection)||v.selection<0||v.selection>29||a.inventory.carried.length!==30||a.inventory.actions.length!==10)fail();
 for(const e of [a.inventory.equipped,v.temp,...a.inventory.carried,...a.inventory.actions])inventoryEntry(e);
 if(v.runtimeDeadWord||a.windowType===7||!a.controlMethod)return {state:v,outcome:'caller-guard' as const};
 if(a.windowType!==1)fail();
 // The29 boundary precedes the next-slot read; only its ID byte is tested.
 if(s.operation==='forward'?v.selection===0:v.selection===29||a.inventory.carried[v.selection+1]!.itemId===0)return {state:v,outcome:'boundary' as const};
 v.selection+=s.operation==='forward'?-1:1;v.redraw=255;
 return {state:v,outcome:'selected' as const};
}
