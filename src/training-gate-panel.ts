import type { WorldState } from './contracts';
import { selectedFallLevel } from './sim/fall';
import type { LevelData } from './contracts';
import type { TrainingSession } from './sim/training-session';
import { GATE_PANEL, GATE_TARGET, MAX_GATE_HISTORY } from './world/training-gate';
import { DIRECTIONS } from './sim/world';
import { patrolPosition } from './world/training-patrol';

export function installTrainingGatePanel(host: HTMLElement, current: () => TrainingSession | null, world: () => WorldState, level: () => LevelData,
  available: () => boolean, paused: () => boolean, setup: () => Promise<void>) {
  host.className = 'test-card';
  host.innerHTML = '<h3>Authored button / static gate practice</h3><button id="author-gate">Set up button / gate practice with current team</button><p>This authored arena uses the verified team and current inventory. Original Training43 signs and inactive doors stay inactive. Ground cache and dry-fall need a fresh Apply on Training43. Start navigation; 1–4 select WASD actor; C activates the front-cell panel once per press. Esc pauses. Panel: 5,4,1; gate: 5,5,1.</p><p>Slot 1 starts facing the panel. D sidesteps south to the gate lane; W walks east through the open gate. Slot 2 starts on the other side facing the panel: press 2 then C to try closing while slot 1 occupies the gate. Move slot 1 east again to vacate, then close with slot 2. Closure occupancy protection is an authored interlock.</p><p id="gate-status" role="status"></p><p id="gate-feedback" role="status"></p><details><summary>Gate replay diagnostics</summary><pre id="gate-snapshot"></pre></details>';
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  let actor = 0, last = '';
  function near(i: number) {
    const p = world().mercenaries[i]!, d = DIRECTIONS[p.facing];
    return p.x + d.x === GATE_PANEL.x && p.y + d.y === GATE_PANEL.y && p.z === GATE_PANEL.z;
  }
  function refresh() {
    const session = current(), gate = session?.gate;
    host.hidden = !session;
    get<HTMLButtonElement>('author-gate').disabled = !available() || !paused() || !!gate || !!session?.ground || selectedFallLevel(level());
    const p = world().mercenaries[actor]!;
    const occupants = world().mercenaries.filter(p => p.x === GATE_TARGET.x && p.y === GATE_TARGET.y && p.z === GATE_TARGET.z).map(p => String(p.id + 1));
    const npc = session?.patrol && session.encounter && session.encounter.fitness > 0 ? patrolPosition(session.patrol) : null;
    if (npc && npc.x === GATE_TARGET.x && npc.y === GATE_TARGET.y && npc.z === GATE_TARGET.z) occupants.push('active NPC');
    const text = gate ? `${paused() ? 'PAUSED — start navigation for C' : 'RUNNING'} | ${gate.overlay.word & 2 ? 'CLOSED — blocks movement' : 'OPEN — walk through'} | WASD slot ${actor + 1}: ${session!.names[actor]} at ${p.x},${p.y},${p.z} | ${near(actor) ? 'Panel in front — C activates' : 'Face panel from 4,4 east or 6,4 west'} | Gate occupancy: ${occupants.join(', ') || 'clear'} | Replay ${gate.history.length}/${MAX_GATE_HISTORY}` : 'No gate practice. Pause a fresh selected-team Training43 session, then set up the authored arena.';
    if (text !== last) {
      last = text; const status = get('gate-status'); status.replaceChildren();
      Object.assign(status.style,{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'6px 16px'});
      for (const text of last.split(' | ')) {const row=document.createElement('span');row.textContent=text;status.append(row);}
    }
    const snapshot = JSON.stringify({ gate: gate ?? null, world: world(), inventory: session?.inventory });
    if (get('gate-snapshot').textContent !== snapshot) get('gate-snapshot').textContent = snapshot;
    Object.assign(get('gate-snapshot').style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '200px', overflow: 'auto' });
  }
  get('author-gate').addEventListener('click', async () => {
    try { await setup(); get('gate-feedback').textContent = 'Authored gate practice ready, PAUSED. Start navigation, then C.'; }
    catch (error) { get('gate-feedback').textContent = `Setup refused: ${error instanceof Error ? error.message : String(error)}`; }
    refresh();
  });
  return { refresh, near, select(i: number) { actor = i; refresh(); }, selected: () => actor,
    feedback(text: string) { get('gate-feedback').textContent = text; }, clear() { get('gate-feedback').textContent = ''; refresh(); } };
}
