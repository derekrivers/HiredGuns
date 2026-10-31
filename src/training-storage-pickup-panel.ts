import type {TrainingSession} from './sim/training-session';

import type {WorldState} from './contracts';

import type {ConsumableOperationResult} from './training-consumable-panel';

import {hasStoragePickup} from './sim/training-storage-pickup';

export function installTrainingStoragePickupPanel(host:HTMLElement,state:()=>{session:TrainingSession|null;world:WorldState;paused:boolean;loading:boolean;canSetup:boolean;actor:number},start:()=>Promise<ConsumableOperationResult>,queue:()=>void){

 host.innerHTML='<h3>Training43 · native storage pickup</h3><p>Apply four character choices at fresh PAUSED tick zero, enable this mode, then Start mission. Walk a living teammate onto another teammate’s skeleton. Pick up its first stored item into storage, once per run. Native keyboard pickup is action22; B is a browser binding adaptation. Equipment stays unchanged. Fixed Position1, window0, canonical storage with room, source equipment empty and both bodies nonheavy only. Other native branches remain unsupported here. W/S, A/D, Q/E; 1–4 selects; Esc pauses. Original99 fixed-step clock; CPU timing parity unproven. Save / Load reconstructs the complete chronology, PAUSED; Retry resets it.</p><button id="storage-pickup-enable">Enable storage pickup (original99)</button><button id="storage-pickup-queue">Pick up into storage · B</button><p id="storage-pickup-feedback" role="status"></p><p id="storage-pickup-state" role="status"></p>';

 const enable=host.querySelector<HTMLButtonElement>('#storage-pickup-enable')!,pickup=host.querySelector<HTMLButtonElement>('#storage-pickup-queue')!,feedback=host.querySelector<HTMLElement>('#storage-pickup-feedback')!,display=host.querySelector<HTMLElement>('#storage-pickup-state')!;

 let displayedSession:TrainingSession|null=null;

 enable.addEventListener('click',async()=>{const r=await start();if(r.isCurrent()){if(r.status==='installed')feedback.textContent='Storage-item pickup enabled, PAUSED. Start mission.';if(r.status==='failed')feedback.textContent=r.error instanceof Error?r.error.message:String(r.error);}refresh();});

 pickup.addEventListener('click',queue);

 function refresh(){

  const s=state(),active=hasStoragePickup(s.session),profile=active?s.session!.storagePickup!:null;

  if(s.session!==displayedSession){if(!active)feedback.textContent='';displayedSession=s.session;}

  enable.disabled=s.loading||!s.canSetup;pickup.disabled=!active||s.loading||s.paused||s.world.mission.outcome!=='active'||!!profile!.history.some(e=>e.codes.some(n=>n>=24));

  if(!active){display.textContent='Inactive; Apply your four choices at tick zero.';return;}

  const a=s.session!.wet!.actors[s.actor],cell=a?.current,owner=s.session!.wetLifecycle!.second.find(x=>x[0]===cell),source=owner?s.session!.wet!.actors[(owner[1]>>>12)&255]:null;

  const inv=a!.body.inventory,slot=inv.carried[0]!;

  display.textContent=`${s.loading?'LOADING':s.paused?'PAUSED':'RUNNING'} · actor ${s.actor+1} · window ${a!.body.windowType} · fixed Position1 · lastPosition ${profile!.lastPositions[s.actor]} · space ${30-inv.carried.filter(x=>x.itemId).length} · EQUIPMENT unchanged ${inv.equipped.rawHex} · slot0 ${slot.rawHex} · new outline ${slot.fourthByte===255?'FF':'none'} · recipient stored ${inv.carried.filter(x=>x.itemId).length} · weight ${a!.body.weight.totalWeight} · corpse stored items ${source?.body.inventory.carried.filter(x=>x.itemId).length??0} · corpse weight ${source?.body.weight.totalWeight??0} · ${profile!.outcome??'pickup not attempted'} · one storage-only attempt`;

 }

 return {refresh,feedback(text:string){feedback.textContent=text;}};

}
