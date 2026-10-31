import type {TrainingSession} from './sim/training-session';
import type {WorldState} from './contracts';
import type {ConsumableOperationResult} from './training-consumable-panel';
import {hasInventoryWindow} from './sim/training-inventory-window';
export function installTrainingInventoryWindowPanel(host:HTMLElement,state:()=>{session:TrainingSession|null;world:WorldState;paused:boolean;loading:boolean;canSetup:boolean;actor:number},start:()=>Promise<ConsumableOperationResult>,storage:()=>void,toggle:()=>void){
 host.innerHTML='<h3>Training43 · inventory window cycle</h3><p>Apply four choices at fresh PAUSED zero. Enable, Start mission, walk a living teammate onto a teammate skeleton, then B transfers its first stored item once. N opens direct native10 store, N closes direct9 views once. B and N are browser keyboard adaptations; N is not native directional cycling. While open, hazards and the original99 clock continue. Only idle or sole N close is supported: movement/equip/drop/use/pickup/info and other actor commands refuse the entire candidate. Selection is fixed zero. Save/Load reconstructs all history PAUSED; pause retains window and outlines. Retry resets both rules. General inventory and native CPU parity remain incomplete.</p><button id="inventory-window-enable">Enable inventory window cycle (original99)</button><button id="inventory-window-storage">Transfer to storage · B</button><button id="inventory-window-toggle">Open / close once · N</button><p id="inventory-window-feedback" role="status"></p><p id="inventory-window-state" role="status"></p>';
 const get=<T extends HTMLElement>(id:string)=>host.querySelector<T>('#inventory-window-'+id)!,enable=get<HTMLButtonElement>('enable'),pickup=get<HTMLButtonElement>('storage'),windowButton=get<HTMLButtonElement>('toggle'),feedback=get('feedback'),display=get('state');
 enable.addEventListener('click',async()=>{const r=await start();if(r.isCurrent()){if(r.status==='installed')feedback.textContent='Inventory window cycle enabled, PAUSED. Start mission.';if(r.status==='failed')feedback.textContent=r.error instanceof Error?r.error.message:String(r.error);}refresh();});
 pickup.addEventListener('click',storage);windowButton.addEventListener('click',toggle);
 let previous:TrainingSession|null=null;
 function refresh(){const s=state(),active=hasInventoryWindow(s.session),p=active?s.session!.inventoryWindow!:null;
 if(s.session!==previous){if(!active)feedback.textContent='';previous=s.session;}
 enable.disabled=s.loading||!s.canSetup;const unavailable=!active||s.loading||s.paused||s.world.mission.outcome!=='active';pickup.disabled=unavailable||p!.outcome!==null;windowButton.disabled=unavailable||!['ready','opened'].includes(p!.phase)||p!.recipient!==s.actor;
 if(!active){display.textContent='Inactive; Apply four choices at PAUSED zero.';return;}
 const a=s.session!.wet!.actors[s.actor]!,inv=a.body.inventory;
 display.textContent=`${s.loading?'LOADING':s.paused?'PAUSED':'RUNNING'} · phase ${p!.phase} · actor ${s.actor+1} · recipient ${p!.recipient===null?'none':p!.recipient+1} · window ${a.body.windowType} · selection 0 · lastPosition ${p!.lastPositions[s.actor]} (adapter zero) · equipment ${inv.equipped.rawHex} · store0 ${inv.carried[0]!.rawHex} · outline ${inv.carried[0]!.fourthByte.toString(16).padStart(2,'0').toUpperCase()} · stored ${inv.carried.filter(e=>e.itemId).length} · weight ${a.body.weight.totalWeight} · temp ${p!.tempEntries[s.actor]!.rawHex} (source variable-clear inference, no swap; not observed RAM) · ${p!.outcome??'not transferred'} · drown ${s.session!.wet!.drownCounter} · item passes ${a.itemPasses} · one cycle; open controls unsupported`;
 }
 return {refresh,feedback(text:string){feedback.textContent=text;}};
}
