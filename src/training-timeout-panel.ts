import type {TrainingSession} from './sim/training-session';
import type {WorldState} from './contracts';
import type {ConsumableOperationResult} from './training-consumable-panel';
import {hasTimeoutProfile} from './sim/training-timeout';
export function installTrainingTimeoutPanel(host:HTMLElement,state:()=>{session:TrainingSession|null;world:WorldState;paused:boolean;loading:boolean;canSetup:boolean},start:()=>Promise<ConsumableOperationResult>){
 host.innerHTML='<h3>Training43 · original 99-unit timeout</h3><p>Choose four different characters in Local character roster / team preparation and Apply team. At fresh PAUSED tick zero, enable this mode, then Start mission. Keep the team on supported dry ground to wait. W/S moves, A/D strafes, Q/E turns; 1–4 selects; Esc pauses. The original 99-unit clock expires after 59,499 full fixed steps (about 19 minutes 50 seconds at 50 Hz). All dead takes priority, then timeout, then exit. Save while PAUSED; Load restores the complete source-bound chronology, PAUSED. Retry resets your selected team. First-exit and cooperative extraction retain their existing rules. Fixed-step adaptation; original CPU timing is unproven.</p><button id="timeout-enable">Enable original 99-unit timeout</button><p id="timeout-feedback" role="status"></p><p id="timeout-state" role="status"></p>';
 const button=host.querySelector<HTMLButtonElement>('button')!,feedback=host.querySelector<HTMLElement>('#timeout-feedback')!,display=host.querySelector<HTMLElement>('#timeout-state')!;
 button.addEventListener('click',async()=>{const r=await start();if(r.isCurrent()){if(r.status==='installed')feedback.textContent='Original 99-unit timeout enabled, PAUSED. Start mission.';if(r.status==='failed')feedback.textContent=r.error instanceof Error?r.error.message:String(r.error);}refresh();});
 function refresh(){const s=state();button.disabled=s.loading||!s.canSetup;display.textContent=hasTimeoutProfile(s.session)?`${s.paused?'PAUSED':'RUNNING'} · tick ${s.world.tick} / 59499 · v19 complete recovery · <24 KiB`:'Inactive; Apply your four choices at tick zero.';}
 return {refresh};
}
