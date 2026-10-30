import type { TrainingSession } from './sim/training-session';
import type { WorldState } from './contracts';
import type { ConsumableOperationResult } from './training-consumable-panel';
export function installTrainingWetPanel(host:HTMLElement,state:()=>{session:TrainingSession|null;world:WorldState;paused:boolean;loading:boolean;canSetup:boolean},start:()=>Promise<ConsumableOperationResult>){
 host.innerHTML='<h3>Training43 · keyboard wet traversal</h3><p>Explicit editor import / 50 Hz fixed-step adaptation. Enable with a fresh paused ready team, then Start mission. Use 1–4 and W/S/A/D, Q/E, Esc. Navigate the dry approach, step onto water and reverse immediately. Breath and inventory run before falling and controls. Unsupported damage or wet support pauses before the whole candidate tick is installed. Original level remains incomplete.</p><button id="wet-enable">Enable Training43 wet traversal (resets ready team)</button><p id="wet-feedback" role="status"></p><div id="wet-state" role="status"></div>';
 const button=host.querySelector<HTMLButtonElement>('button')!,feedback=host.querySelector<HTMLElement>('#wet-feedback')!,display=host.querySelector<HTMLElement>('#wet-state')!;
 button.addEventListener('click',async()=>{const result=await start();if(result.isCurrent()){if(result.status==='installed')feedback.textContent='Wet traversal enabled, PAUSED. Start mission, navigate with the keyboard, reverse immediately after entry.';if(result.status==='failed')feedback.textContent=result.error instanceof Error?result.error.message:String(result.error);}refresh();});
 function refresh(){const s=state(),wet=s.session?.wet;button.disabled=s.loading||!s.canSetup;
  display.replaceChildren();if(!wet){display.textContent='Inactive. Requires the exact ready-to-play Training43 team.';return;}
  const p=document.createElement('p');p.textContent=`${s.paused?'PAUSED':'RUNNING'} · tick ${s.world.tick} · drowning scheduler ${wet.drownCounter}/50 · fall scheduler ${wet.fallCounter} · No damage dispatched. Inventory changes require a fresh Apply.`;display.append(p);
  wet.actors.forEach((a,i)=>{
   const p=document.createElement('p');p.id=`wet-actor-${i}`;p.textContent=`Slot ${i+1} · ${s.session!.names[i]} · Race ${a.body.race}${a.body.race===1?' (breath immune; inventory still processes)':' (nonimmune)'} · Breath ${a.body.underwaterCount} · Item passes ${a.itemPasses} · Entries ${a.entries} · Weight ${a.body.weight.totalWeight} · Fitness ${a.body.fitness} · Delay ${a.delay} · ${a.lastInventoryStatus}`;display.append(p);
   const items=document.createElement('p');items.textContent=`Inventory slot ${i+1} · source weight ${s.session!.team.actors[i]!.weight.totalWeight} -> ${a.body.weight.totalWeight} · equipped ${a.body.inventory.equipped.rawHex} · carried first 16 ${a.body.inventory.carried.slice(0,16).map(x=>x.rawHex).join(' ')} · preserved actions ${a.body.inventory.actions.map(x=>x.rawHex).join(' ')}`;items.style.overflowWrap='anywhere';display.append(items);
  });
 }
 return {refresh};
}
