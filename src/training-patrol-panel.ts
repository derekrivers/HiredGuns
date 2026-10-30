import type { LevelData, WorldState } from './contracts';
import type { TrainingSession } from './sim/training-session';
import { obstruction } from './sim/world';
import { patrolMissionLevel, PATROL_EXIT } from './world/training-gate';
import { effectivePatrolLevel } from './world/training-patrol';
import { PATROL_CADENCE, patrolPosition } from './world/training-patrol';

export function installTrainingPatrolPanel(host: HTMLElement, current: () => TrainingSession | null, world: () => WorldState, level: () => LevelData, available: () => boolean, paused: () => boolean, setup: () => Promise<void>) {
  host.className = 'test-card';
  host.innerHTML = `<h3>Authored gate patrol</h3><button id="author-patrol">Add patrolling target to fresh gate practice</button>
    <p id="patrol-intro">Retry gate practice first, then add the target while paused at tick zero. This starts the canonical gate/team/inventory and full gun loadout for slot 1. Start navigation; C opens the gate, 1–4 selects WASD, Esc pauses.</p>
    <p id="patrol-scope">F designates this same target wherever it is on the route; T toggles a deliberate miss. No spatial aim, range, line of sight or enemy attacks. Health zero stops the patrol and releases occupancy. Use Retry to reset the whole scenario; arm/R is unavailable during patrol.</p>
    <p id="patrol-status" role="status"></p><p id="patrol-feedback" role="status"></p>
    <details id="patrol-mission-route"><summary>Keyboard route from a fresh challenge</summary><p>Start mission. Press 1 then C to open the gate. Use F to defeat the target, allowing cooldown between shots; T toggles deliberate miss. Keep the gate open. Without turning: slot 1: D, W four times; slot 2: A, S twice; slot 3: W, D, W, D four times; slot 4: W twice, D. Each ends by bumping the exit from 7,5. Extracted actors retire; Y retries after win or timeout. Esc pauses; Start mission resumes.</p></details>
    <pre id="patrol-map" aria-label="Gate patrol overhead placeholder"></pre>
    <details><summary>Patrol policy and replay diagnostics</summary><p>AUTHORED route (3–7,5,1), one adjacent attempt every ${PATROL_CADENCE} accepted world ticks. Endpoint, closed gate or occupied player cell reverses direction and waits another cadence. Current NPC and next destination reserve before players; no swaps, overlap or closure into either cell. Opening permits the next attempt. Defeated targets stop immediately and reserve nothing.</p><pre id="patrol-snapshot"></pre></details>`;
  const get = (id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
  Object.assign(get('patrol-snapshot').style,{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'180px',overflow:'auto'});
  Object.assign(get('patrol-map').style,{fontFamily:'monospace',whiteSpace:'pre',maxWidth:'100%',overflow:'auto'});
  function refresh() {
    const session = current(), patrol = session?.patrol, encounter = session?.encounter, state = world();
    host.hidden = !session?.gate;
    const challenge = patrolMissionLevel(level());
    host.querySelector('h3')!.textContent = challenge ? 'Authored cooperative patrol extraction' : 'Authored gate patrol';
    get('author-patrol').hidden = challenge;
    get('patrol-intro').hidden = challenge;
    get('patrol-mission-route').hidden = !challenge;
    (get('author-patrol') as HTMLButtonElement).disabled = !available() || !paused() || !session?.gate || !!patrol || state.tick !== 0 || !!session.gate.history.length;
    get('patrol-scope').hidden = !patrol;
    if (!patrol || !encounter) { get('patrol-status').textContent = 'Optional target: add after fresh gate setup or gate Retry.'; get('patrol-map').textContent=''; get('patrol-snapshot').textContent='null'; return; }
    const p = patrolPosition(patrol), active = encounter.fitness > 0;
    get('patrol-status').textContent = `${paused() ? 'PAUSED' : 'RUNNING'} · ${active ? 'ACTIVE' : 'DEFEATED — occupancy released'} · Target ${p.x},${p.y},${p.z} · ${patrol.direction === 1 ? 'EAST →' : '← WEST'} · Health ${encounter.fitness} · Cadence ${patrol.counter}/${PATROL_CADENCE} · Last route refusal: ${patrol.blocked} · F scope: ${encounter.target === 'miss' ? 'deliberate MISS' : 'designated patrol target'}`;
    const effective = effectivePatrolLevel(level(),session.gate,encounter);
    const mission = patrolMissionLevel(level());
    if (mission) get('patrol-status').textContent = `${state.mission.outcome === 'active' ? paused() ? 'PAUSED' : 'RUNNING' : state.mission.outcome === 'complete' ? 'WIN' : 'FAILED'} · Gate ${session.gate!.overlay.word & 2 ? 'CLOSED' : 'OPEN'} · Target ${active ? 'ACTIVE' : 'DEFEATED'} / Health ${encounter.fitness} · Exit ${active ? 'LOCKED (authored objective lock)' : 'UNLOCKED'} at 8,5 · ${state.mission.exited.filter(Boolean).length}/4 extracted · 10 source counts (601 ticks each) · Y: Retry after outcome`;
    const rows = ['    X 2 3 4 5 6 7 8'];
    for (let y=2;y<=8;y++) {
      const cells: string[] = [];
      for (let x=2;x<=8;x++) {
        const actor = state.mercenaries.find(m => !state.mission.exited[m.id] && m.x===x && m.y===y && m.z===1);
        cells.push(mission && x===PATROL_EXIT.x && y===PATROL_EXIT.y ? active ? 'L' : 'E' : active && p.x===x && p.y===y ? 'N' : actor ? String(actor.id+1) : x===5 && y===4 ? 'C' : obstruction(effective,{x,y,z:1}) ? '#' : x===5 && y===5 ? '/' : '·');
      }
      rows.push(`Y ${y}   ${cells.join(' ')}`);
    }
    if (mission) rows.push('L locked exit · E extraction: bump from 7,5', '1–4 select WASD · Q/E turn · C gate · F fire', 'T miss · Esc pause · Y Retry after outcome');
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
