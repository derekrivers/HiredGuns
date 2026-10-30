import type { TrainingSession } from './sim/training-session';
import type { WorldState } from './contracts';
import { MAX_CONSUMABLE_EVENTS } from './sim/training-consumables';
export function installTrainingConsumablePanel(host:HTMLElement,state:()=>{session:TrainingSession|null;world:WorldState;paused:boolean;loading:boolean;canSetup:boolean},setup:()=>Promise<void>,use:(actor:number)=>Promise<void>){
 const title=document.createElement('h3');title.textContent='Consumables · authored dry-fall extension';
 const start=document.createElement('button');start.id='consumable-setup';start.textContent='Start consumable extension';
 const select=document.createElement('select');select.setAttribute('aria-label','Consumable actor');for(let i=0;i<4;i++)select.add(new Option(`Team slot ${i+1}`,String(i)));
 const button=document.createElement('button');button.id='consumable-use';button.textContent='Use equipped item (H)';
 const status=document.createElement('p');status.id='consumable-status';
 const receipt=document.createElement('p');receipt.id='consumable-receipt';
 const feedback=document.createElement('p');feedback.id='consumable-feedback';feedback.setAttribute('role','status');
 const help=document.createElement('p');help.textContent='Open selected-team dry-fall practice with a fresh team, then start this extension (resets positions, health and inventory to the source baseline). Start drill, step off the ledge, wait for landing and Esc pause. Equip source-owned food (races other than 1/4) or repair (races 1/4) in Inventory & equipment, then H. 1–4 selects the actor. Medical pack 64 requires unsupported poison status. Retry resets everything.';
 host.append(title,help,start,select,button,status,receipt,feedback);
 let feedbackGeneration=0;
 const report=(error:unknown)=>{feedback.textContent=error instanceof Error?error.message:String(error);};
 async function invoke(){const serial=++feedbackGeneration;try{await use(Number(select.value));if(serial===feedbackGeneration)feedback.textContent='Item used. Fitness, equipment and weight updated together.';}catch(e){if(serial===feedbackGeneration)report(e);}refresh();}
 start.addEventListener('click',async()=>{const serial=++feedbackGeneration;try{await setup();if(serial===feedbackGeneration)feedback.textContent='Consumable extension installed, PAUSED. Start drill to injure an actor.';}catch(e){if(serial===feedbackGeneration)report(e);}refresh();});
 button.addEventListener('click',()=>void invoke());select.addEventListener('change',refresh);
 function refresh(){
  const {session,world,paused,loading,canSetup}=state(),active=!!session?.consumables,i=Number(select.value),a=session?.inventory.actors[i],health=world.physics.mode==='dry-fall'?world.physics.actors[i]:null;
  start.disabled=loading||!canSetup;select.disabled=loading||!active;
  button.disabled=loading||!active; // Keep actionable refusals available for keyboard/button parity.
  const race=session?.consumables?.races[i];
  status.textContent=active?`${paused?'PAUSED':'RUNNING'} · Team slot ${i+1}: ${session!.names[i]} · Race ${race} · Fitness ${health?.fitness} · Equipped ${a?.inventory.equipped.itemId || 'empty'} · Weight ${a?.weight.totalWeight} · ${health?.dead?'INCAPACITATED':health?.fallDamage?'Pending landing':'Alive'} · ${MAX_CONSUMABLE_EVENTS-session!.consumables!.history.length} replay events remaining. ${loading?'Working…':paused?'H uses the equipped item for this actor.':'Esc pause before equip/use.'}`:'Inactive: open selected-team authored dry-fall practice with a fresh team.';
  const last=session?.consumables?.lastUse;receipt.textContent=last?`Last use · slot ${last.actor+1} · tick ${last.tick} · item ${last.itemId} consumed · fitness ${last.fitnessBefore} → ${last.fitnessAfter} · weight ${last.weightBefore} → ${last.weightAfter} · equipment cleared.`:'';
 }
 return {refresh,keyboard:()=>void invoke(),select:(i:number)=>{select.value=String(i);refresh();}};
}
