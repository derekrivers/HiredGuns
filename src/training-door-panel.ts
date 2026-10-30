import type { TrainingSession } from './sim/training-session';
import type { WorldState } from './contracts';
import { doorStatus, type DoorAction } from './world/training-moving-door';

export function installTrainingDoorPanel(host: HTMLElement, session: () => TrainingSession | null, world: () => WorldState,
  available: () => boolean, paused: () => boolean, setup: () => Promise<void>, command: (action: DoorAction) => void) {
  host.className = 'test-card';
  host.innerHTML = '<h3>Timed door · patrol extraction</h3><button id="author-moving-door">Start timed door / patrol extraction challenge</button><p>Same arena and team. 1–4 select WASD; C opens/closes at the front panel (5,4). Wait for opening to finish, then D and W through (5,5). F defeats the designated patrol target; extract all four at E (8,5). Esc pauses; Y retries after outcome.</p><p>Door controls act at the same front panel. Tab to a button and Enter to open, close, reverse, lock or unlock. Pending lock waits for motion to stop. Auto-close starts after 100 scheduled open steps. Occupied or reserved cells defer the whole closing transition. Tick timing and occupancy protection are authored adaptations. Sound remains inactive.</p><div id="door-controls"></div><p id="door-status" role="status"></p><p id="door-feedback" role="status"></p><details><summary>Timed door replay diagnostics</summary><pre id="door-snapshot"></pre></details>';
  const get = (id:string) => host.querySelector<HTMLElement>(`#${id}`)!;
  for (const [label,action] of [['Open',14],['Close',15],['Toggle / reverse',16],['Lock',17],['Unlock',18]] as const) {
    const button = document.createElement('button'); button.textContent = label; button.dataset.doorAction = String(action);
    button.addEventListener('click',() => command(action)); get('door-controls').append(button);
  }
  get('author-moving-door').addEventListener('click',async () => {
    try {await setup(); get('door-feedback').textContent = 'Timed door ready, PAUSED. Start mission, C, then wait.';}
    catch (e) {get('door-feedback').textContent = e instanceof Error ? e.message : String(e);}
    refresh();
  });
  function refresh() {
    const current = session(), door = current?.gate?.moving;
    host.hidden = !current;
    (get('author-moving-door') as HTMLButtonElement).disabled = !available();
    get('door-controls').hidden = !door;
    for (const b of host.querySelectorAll<HTMLButtonElement>('[data-door-action]')) b.disabled = !available() || paused() || world().mission.outcome !== 'active';
    get('door-status').textContent = door ? `${paused() ? 'PAUSED' : 'RUNNING'} · ${doorStatus(door)}` : 'Optional timed door in the same patrol extraction arena.';
    const snapshot = get('door-snapshot');
    snapshot.textContent = JSON.stringify({door:door ?? null,gate:current?.gate,patrol:current?.patrol,encounter:current?.encounter,world:world()});
    Object.assign(snapshot.style,{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'200px',overflow:'auto'});
  }
  return {refresh,feedback(text:string) {get('door-feedback').textContent=text;}};
}
