import type { LevelData, WorldState } from './contracts';
import type { TrainingSession } from './sim/training-session';
import { obstruction } from './sim/world';
import { effectiveGateLevel } from './world/training-gate';
import { PATROL_CADENCE, patrolPosition } from './world/training-patrol';

export function installTrainingPatrolPanel(host: HTMLElement, current: () => TrainingSession | null, world: () => WorldState, level: () => LevelData, available: () => boolean, paused: () => boolean, setup: () => Promise<void>) {
  host.className = 'test-card';
  host.innerHTML = `<h3>Authored gate patrol</h3><button id="author-patrol">Add patrolling target to fresh gate practice</button>
    <p>Retry gate practice first, then add the target while paused at tick zero. This starts the canonical gate/team/inventory and full gun loadout for slot 1. Start navigation; C opens the gate, 1–4 selects WASD, Esc pauses.</p>
    <p id="patrol-scope">F designates this same target wherever it is on the route; T toggles a deliberate miss. No spatial aim, range, line of sight or enemy attacks. Health zero stops the patrol and releases occupancy. Use Retry to reset the whole scenario; arm/R is unavailable during patrol.</p>
    <p id="patrol-status" role="status"></p><p id="patrol-feedback" role="status"></p>
    <pre id="patrol-map" aria-label="Gate patrol overhead placeholder"></pre>
    <details><summary>Patrol policy and replay diagnostics</summary><p>AUTHORED route (3–7,5,1), one adjacent attempt every ${PATROL_CADENCE} accepted world ticks. Endpoint, closed gate or occupied player cell reverses direction and waits another cadence. Current NPC and next destination reserve before players; no swaps, overlap or closure into either cell. Opening permits the next attempt. Defeated targets stop immediately and reserve nothing.</p><pre id="patrol-snapshot"></pre></details>`;
  const get = (id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
  Object.assign(get('patrol-snapshot').style,{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'180px',overflow:'auto'});
  Object.assign(get('patrol-map').style,{fontFamily:'monospace',whiteSpace:'pre',maxWidth:'100%',overflow:'auto'});
  function refresh() {
    const session = current(), patrol = session?.patrol, encounter = session?.encounter, state = world();
    host.hidden = !session?.gate;
    (get('author-patrol') as HTMLButtonElement).disabled = !available() || !paused() || !session?.gate || !!patrol || state.tick !== 0 || !!session.gate.history.length;
    get('patrol-scope').hidden = !patrol;
    if (!patrol || !encounter) { get('patrol-status').textContent = 'Optional target: add after fresh gate setup or gate Retry.'; get('patrol-map').textContent=''; get('patrol-snapshot').textContent='null'; return; }
    const p = patrolPosition(patrol), active = encounter.fitness > 0;
    get('patrol-status').textContent = `${paused() ? 'PAUSED' : 'RUNNING'} · ${active ? 'ACTIVE' : 'DEFEATED — occupancy released'} · Target ${p.x},${p.y},${p.z} · ${patrol.direction === 1 ? 'EAST →' : '← WEST'} · Health ${encounter.fitness} · Cadence ${patrol.counter}/${PATROL_CADENCE} · Last route refusal: ${patrol.blocked} · F scope: ${encounter.target === 'miss' ? 'deliberate MISS' : 'designated patrol target'}`;
    const effective = effectiveGateLevel(level(),session.gate);
    const rows = ['    X 2 3 4 5 6 7 8'];
    for (let y=2;y<=8;y++) {
      const cells: string[] = [];
      for (let x=2;x<=8;x++) {
        const actor = state.mercenaries.find(m => m.x===x && m.y===y && m.z===1);
        cells.push(active && p.x===x && p.y===y ? 'N' : actor ? String(actor.id+1) : x===5 && y===4 ? 'C' : obstruction(effective,{x,y,z:1}) ? '#' : x===5 && y===5 ? '/' : '·');
      }
      rows.push(`Y ${y}   ${cells.join(' ')}`);
    }
    rows.push('N target · 1–4 team','# blocked · / open gate · C panel');
    get('patrol-map').textContent = rows.join('\n');
    get('patrol-snapshot').textContent = JSON.stringify({patrol,position:p,encounter,gate:session.gate,world:state,inventory:session.inventory});
  }
  get('author-patrol').addEventListener('click', async () => {
    try { await setup(); get('patrol-feedback').textContent='Patrol ready, PAUSED. Start navigation; C opens gate; F designates patrol target.'; }
    catch (error) { get('patrol-feedback').textContent=`Setup refused: ${error instanceof Error ? error.message : String(error)}`; }
    refresh();
  });
  return {refresh};
}
