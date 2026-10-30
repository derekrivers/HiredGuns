import type { TrainingSession } from './sim/training-session';
import type { WorldState } from './contracts';
import { doorStatus, type DoorAction } from './world/training-moving-door';

export type DoorSetupResult = { isCurrent: () => boolean } & (
  { status: 'installed' | 'cancelled' } | { status: 'failed'; error: unknown }
);

export function installTrainingDoorPanel(host: HTMLElement, session: () => TrainingSession | null, world: () => WorldState,
  available: () => boolean, paused: () => boolean, setup: () => Promise<DoorSetupResult>, command: (action: DoorAction) => void, setupPad: () => Promise<DoorSetupResult>) {
  host.className = 'test-card';
  host.innerHTML = '<h3>Timed door · patrol extraction</h3><button id="author-moving-door">Start timed door / patrol extraction challenge</button><button id="author-pressure-pad">Start pressure pad / timed door challenge</button><p id="pad-guidance" hidden>Player-only P at (4,5). Start mission; slot 1: D onto P, wait for WALK THROUGH, W through door then W off door. Hold still: no repeated press. Leaving P requests close; reservations defer closure. C and labelled door buttons remain manual alternatives. Defeat target with F. For later actors reopen from P if needed; extract all four at E. No pad animation or original timing parity.</p><p id="pad-status" role="status"></p><p id="manual-door-guidance">Same arena and team. 1–4 select WASD; C opens/closes at the front panel (5,4). Wait for opening to finish, then D and W through (5,5). F defeats the designated patrol target; extract all four at E (8,5). Esc pauses; Y retries after outcome.</p><p>Door controls act at the same front panel. Tab to a button and Enter to open, close, reverse, lock or unlock. Pending lock waits for motion to stop. Auto-close starts after 100 scheduled open steps. Occupied or reserved cells defer the whole closing transition. Tick timing and occupancy protection are authored adaptations. Sound remains inactive.</p><div id="door-controls"></div><p id="door-status" role="status"></p><p id="door-feedback" role="status"></p><details><summary>Timed door replay diagnostics</summary><pre id="door-snapshot"></pre></details>';
  const get = (id:string) => host.querySelector<HTMLElement>(`#${id}`)!;
  for (const [label,action] of [['Open',14],['Close',15],['Toggle / reverse',16],['Lock',17],['Unlock',18]] as const) {
    const button = document.createElement('button'); button.textContent = label; button.dataset.doorAction = String(action);
    button.addEventListener('click',() => command(action)); get('door-controls').append(button);
  }
  async function start(prepare: () => Promise<DoorSetupResult>, ready: string) {
    const result = await prepare();
    // Recheck at presentation time: an older completion must never replace newer guidance.
    if (result.isCurrent()) {
      if (result.status === 'installed') get('door-feedback').textContent = ready;
      else if (result.status === 'failed') get('door-feedback').textContent = result.error instanceof Error ? result.error.message : String(result.error);
    }
    refresh();
  }
  get('author-moving-door').addEventListener('click',() => start(setup,'Timed door ready, PAUSED. Start mission, C, then wait.'));
  get('author-pressure-pad').addEventListener('click',() => start(setupPad,'Pressure pad ready, PAUSED. Start mission, D onto P, then wait.'));
  function refresh() {
    const current = session(), door = current?.gate?.moving;
    host.hidden = !current;
    (get('author-moving-door') as HTMLButtonElement).disabled = !available();
    (get('author-pressure-pad') as HTMLButtonElement).disabled = !available();
    get('manual-door-guidance').hidden = !!current?.gate?.pad;
    get('pad-guidance').hidden = !current?.gate?.pad;
    const pad = current?.gate?.pad;
    get('pad-status').textContent = pad ? `P (4,5) · occupants: ${pad.occupants.map(i=>i+1).join(', ') || 'clear'} · last: ${pad.lastActions.map(a=>`slot ${a.actor+1} ${a.edge} → ${a.action === 14 ? 'OPEN' : 'CLOSE'} (button ${a.index})`).join('; ') || 'none'}` : '';
    if (pad) {
      const overhead = document.getElementById('patrol-map');
      if (overhead) {const rows = overhead.textContent!.split('\n').filter(row=>!row.startsWith('P pressure pad')); const row = rows[4]?.split(' '); if (row && row.at(6) === '·') {row[6] = 'P'; rows[4] = row.join(' ');} overhead.textContent = rows.join('\n') + '\nP pressure pad (4,5) · player-only; occupant shown as 1–4';}
      const route = document.getElementById('patrol-mission-route'); if (route) route.hidden = true;
    }
    get('door-controls').hidden = !door;
    for (const b of host.querySelectorAll<HTMLButtonElement>('[data-door-action]')) b.disabled = !available() || paused() || world().mission.outcome !== 'active';
    get('door-status').textContent = door ? `${paused() ? 'PAUSED' : 'RUNNING'} · ${doorStatus(door)}` : 'Optional timed door in the same patrol extraction arena.';
    const snapshot = get('door-snapshot');
    snapshot.textContent = JSON.stringify({door:door ?? null,gate:current?.gate,patrol:current?.patrol,encounter:current?.encounter,world:world()});
    Object.assign(snapshot.style,{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'200px',overflow:'auto'});
  }
  return {refresh,feedback(text:string) {get('door-feedback').textContent=text;}};
}
