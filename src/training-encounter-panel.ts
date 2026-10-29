import { encounterParameters, type AmmoFixture, type TrainingEncounter } from './combat/training-encounter';
import type { TrainingSession } from './sim/training-session';

export type EncounterCommand = { kind: 'arm'; actor: number; fixture: AmmoFixture } | { kind: 'fire' | 'target' | 'reset' };
export function installTrainingEncounterPanel(host: HTMLElement, current: () => TrainingSession | null, paused: () => boolean, available: () => boolean, command: (action: EncounterCommand) => void) {
  host.innerHTML = `<h3>Combat test · isolated authored gun encounter</h3>
    <p>Fire at the authored dummy or choose a deliberate miss. This test uses a separate ammo loadout from team inventory.</p>
    <div class="encounter-setup">
    <label>Encounter actor <select aria-label="Encounter actor"></select></label>
    <label>Authored ammo fixture <select aria-label="Authored ammo fixture"><option value="full">Full magazine</option><option value="partial">Partial burst</option><option value="empty">Empty magazine</option></select></label>
    <button data-command="arm">Arm authored encounter</button></div><div class="actions"><button data-command="fire">Fire authored gun (F)</button>
    <button data-command="target">Toggle dummy / miss (T)</button><button data-command="reset">Reset authored encounter (R)</button>
    </div><p id="encounter-help">F: fire once per press while running. T: change target while running or paused. R: reset this authored loadout while paused. Esc: pause.</p>
    <h4>Combat results</h4><p id="encounter-readiness"></p><div id="encounter-status" class="result-grid"></div>
    <p id="encounter-feedback" role="status">No action observed in this view yet.</p>
    <details><summary>Advanced diagnostics: authored encounter state and source</summary>
    <p>Source-derived gun/ammo/damage arithmetic; dummy/miss selection and saturating dummy health are authored policy. Zero dummy health has no actor death or occupancy effect. Accuracy is retained source state, not a hit probability. Cooldown decreases one unit per accepted 50 Hz tick; pause freezes it. Retry resets the authored baseline and team inventory replay.</p>
    <p id="encounter-source"></p><pre id="encounter-snapshot"></pre></details>`;
  const actor = host.querySelector<HTMLSelectElement>('[aria-label="Encounter actor"]')!;
  const fixture = host.querySelector<HTMLSelectElement>('[aria-label="Authored ammo fixture"]')!;
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')];
  Object.assign(host.querySelector<HTMLElement>('#encounter-snapshot')!.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });
  let names = '';
  function refresh() {
    const session = current(), state = session?.encounter;
    host.hidden = !session;
    const nextNames = JSON.stringify(session?.names);
    if (names !== nextNames) {
      names = nextNames; actor.replaceChildren();
      session?.names.forEach((name, i) => actor.add(new Option(`Team slot ${i + 1}: ${name}`, String(i))));
    }
    actor.disabled = fixture.disabled = !available() || !paused();
    for (const button of buttons) {
      const kind = button.dataset.command;
      button.disabled = !available() || (kind === 'arm' ? !paused() : !state || (kind === 'reset' ? !paused() : kind === 'fire' ? paused() : false));
    }
    const status = host.querySelector<HTMLElement>('#encounter-status')!;
    host.querySelector<HTMLElement>('#encounter-snapshot')!.textContent = JSON.stringify(state ?? null);
    if (!session) { status.textContent = ''; return; }
    const gun = encounterParameters(session.encounterGun);
    const weapon = session.items.records[24]!;
    const values = state ? [`Team slot ${state.actor + 1}: ${session.names[state.actor]}`, `Authored ${state.fixture} loadout`, `Target ${state.target}`, `Ammo ${state.equipped.ammo} / ${gun.capacity}`, `Cooldown ${state.fireDuration}`, `Last damage ${state.lastDamage}`, `Dummy health ${state.fitness}`, `Shots ${state.shots}`, `Outcome ${{ ready: 'Ready', fired: 'Shot fired', 'already-firing': 'Cooling down', 'no-ammo': 'Empty magazine' }[state.status]}`, paused() ? 'PAUSED' : 'RUNNING'] : ['INACTIVE. Pause, choose an actor and ammo fixture, then Arm authored encounter.'];
    // Values include imported names; always render them as text.
    if (status.textContent !== values.join('')) status.replaceChildren(...values.map(value => { const card = document.createElement('span'); card.textContent = value; return card; }));
    host.querySelector<HTMLElement>('#encounter-readiness')!.textContent = !available() ? 'Controls unavailable: waiting for a ready, active session and display.' : !state ? 'Pause and arm a test loadout to begin.' : paused() ? 'PAUSED · Fire blocked. Start the test to fire; reset is available.' : !state.equipped.ammo ? 'RUNNING · Empty magazine. Pause, then reset or arm a full magazine.' : state.fireDuration > 3 ? 'RUNNING · Cooling down. Wait before firing again.' : 'RUNNING · Ready to fire. Watch ammo and dummy health below.';
    host.querySelector<HTMLElement>('#encounter-source')!.textContent = `VERIFIED local ${weapon.text.header1.trim()} ${weapon.text.header2.trim()}; Character ${state ? state.canonicalIndex + 1 : 'unselected'}; Accuracy ${state?.fireAccuracy ?? 0}; source duration ${gun.duration}, accuracy ${gun.accuracy}, damage byte ${gun.damagePerHit}.`;
  }
  for (const button of buttons) button.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  for (const button of buttons) button.addEventListener('click', () => {
    const kind = button.dataset.command as 'arm' | 'fire' | 'target' | 'reset';
    command(kind === 'arm' ? { kind, actor: Number(actor.value), fixture: fixture.value as AmmoFixture } : { kind }); refresh();
  });
  return { refresh,
    clearFeedback: () => { host.querySelector<HTMLElement>('#encounter-feedback')!.textContent = 'No action observed in this view yet. Current values may come from setup or restore.'; },
    feedback: (kind: EncounterCommand['kind'], before: TrainingEncounter | null, after: TrainingEncounter) => {
      host.querySelector<HTMLElement>('#encounter-feedback')!.textContent = kind === 'fire' && before ? `${after.status === 'fired' ? 'Shot fired' : after.status === 'no-ammo' ? 'Shot blocked: empty magazine' : 'Shot blocked: cooling down'}. Ammo ${before.equipped.ammo} → ${after.equipped.ammo}; dummy health ${before.fitness} → ${after.fitness}; damage ${after.lastDamage}.` : kind === 'target' ? `Target changed to ${after.target}. Ammo unchanged: ${after.equipped.ammo}.` : `${kind === 'reset' ? 'Authored loadout reset' : 'Authored loadout armed'}. Ammo ${after.equipped.ammo}; dummy health ${after.fitness}.`;
    },
    select: (index: number, ammo: AmmoFixture) => { actor.value = String(index); fixture.value = ammo; } };
}
