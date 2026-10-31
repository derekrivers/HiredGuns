import type {TrainingSession} from './sim/training-session';
import type {WorldState} from './contracts';
import type {ConsumableOperationResult} from './training-consumable-panel';
import {hasCorpsePickup} from './sim/training-corpse-pickup';
export function installTrainingCorpsePickupPanel(host:HTMLElement,state:()=>{session:TrainingSession|null;world:WorldState;paused:boolean;loading:boolean;canSetup:boolean;actor:number},start:()=>Promise<ConsumableOperationResult>,queue:()=>void){
 host.innerHTML='<h3>Training43 · corpse equipment pickup</h3><p>Apply four character choices at fresh PAUSED tick zero, enable this mode, then Start mission. Walk a living teammate onto another teammate’s skeleton. G equips its first stored item into empty hands, once per run. G is a browser binding adaptation of the original inventory mouse gadget; original keyboard pickup used a different action. Occupied hands, source equipment, noncanonical storage and new overweight results are excluded. W/S, A/D, Q/E; 1–4 selects; Esc pauses. Original99 fixed-step clock; CPU timing parity unproven. Save / Load reconstructs the complete chronology, PAUSED; Retry resets it.</p><button id="corpse-pickup-enable">Enable corpse-item pickup (original99)</button><button id="corpse-pickup-queue">Equip from current-cell corpse · G</button><p id="corpse-pickup-feedback" role="status"></p><p id="corpse-pickup-state" role="status"></p>';
 const enable=host.querySelector<HTMLButtonElement>('#corpse-pickup-enable')!,pickup=host.querySelector<HTMLButtonElement>('#corpse-pickup-queue')!,feedback=host.querySelector<HTMLElement>('#corpse-pickup-feedback')!,display=host.querySelector<HTMLElement>('#corpse-pickup-state')!;
 let displayedSession:TrainingSession|null=null;
 enable.addEventListener('click',async()=>{const r=await start();if(r.isCurrent()){if(r.status==='installed')feedback.textContent='Corpse-item pickup enabled, PAUSED. Start mission.';if(r.status==='failed')feedback.textContent=r.error instanceof Error?r.error.message:String(r.error);}refresh();});
 pickup.addEventListener('click',queue);
 function refresh(){
  const s=state(),active=hasCorpsePickup(s.session),profile=active?s.session!.corpsePickup!:null;
  if(s.session!==displayedSession){if(!active)feedback.textContent='';displayedSession=s.session;}
  enable.disabled=s.loading||!s.canSetup;pickup.disabled=!active||s.loading||s.paused||s.world.mission.outcome!=='active'||!!profile!.history.some(e=>e.codes.some(n=>n>=24));
  if(!active){display.textContent='Inactive; Apply your four choices at tick zero.';return;}
  const a=s.session!.wet!.actors[s.actor],cell=a?.current,owner=s.session!.wetLifecycle!.second.find(x=>x[0]===cell),source=owner?s.session!.wet!.actors[(owner[1]>>>12)&255]:null;
  display.textContent=`${s.loading?'LOADING':s.paused?'PAUSED':'RUNNING'} · actor ${s.actor+1} · equipped ${a?.body.inventory.equipped.itemId??0} · weight ${a?.body.weight.totalWeight??0} · corpse stored items ${source?.body.inventory.carried.filter(x=>x.itemId).length??0} · corpse weight ${source?.body.weight.totalWeight??0} · ${profile!.outcome??'pickup not attempted'}`;
 }
 return {refresh,feedback(text:string){feedback.textContent=text;}};
}
