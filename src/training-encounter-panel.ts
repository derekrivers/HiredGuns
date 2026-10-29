import { encounterParameters, type AmmoFixture } from './combat/training-encounter';
import type { TrainingSession } from './sim/training-session';

export type EncounterCommand = { kind: 'arm'; actor: number; fixture: AmmoFixture } | { kind: 'fire' | 'target' | 'reset' };
export function installTrainingEncounterPanel(host: HTMLElement, current: () => TrainingSession | null, paused: () => boolean, available: () => boolean, command: (action: EncounterCommand) => void) {
  host.innerHTML = `<h3>Authored gun encounter — source-derived gun/ammo/damage arithmetic</h3>
    <p>Isolated authored loadout associated with a selected actor. Source team equipment, ammo, carried entries and actions remain separate. Dummy/miss selection and saturating dummy health are authored policy; zero health has no actor death or occupancy effect. Accuracy is retained source state, not a hit probability.</p>
    <label>Encounter actor <select aria-label="Encounter actor"></select></label>
    <label>Authored ammo fixture <select aria-label="Authored ammo fixture"><option value="full">Full magazine</option><option value="partial">Partial burst</option><option value="empty">Empty magazine</option></select></label>
    <button data-command="arm">Arm authored encounter</button><button data-command="fire">Fire authored gun (F)</button>
    <button data-command="target">Toggle dummy / miss (T)</button><button data-command="reset">Reset authored encounter (R)</button>
    <p>Pause to arm/reset. Start mission to fire. F fires once per press; T toggles target; R refills ONLY the authored baseline while paused. Cooldown decreases one unit per accepted 50 Hz simulation tick; pause freezes it. Retry resets this authored baseline and the existing team inventory replay.</p>
    <p id="encounter-status" role="status"></p><details><summary>Authored encounter saved state</summary><pre id="encounter-snapshot"></pre></details>`;
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
    status.textContent = state ? `Team slot ${state.actor + 1}: ${session.names[state.actor]} (Character ${state.canonicalIndex + 1}) | VERIFIED local ${weapon.text.header1.trim()} ${weapon.text.header2.trim()} | Authored ${state.fixture} loadout | Target ${state.target} | Ammo ${state.equipped.ammo} / ${gun.capacity} | Cooldown ${state.fireDuration} (source firing guard > 3) | Accuracy ${state.fireAccuracy} | Last damage ${state.lastDamage} | Dummy health ${state.fitness} | Shots ${state.shots} | ${state.status} | ${paused() ? 'PAUSED' : 'RUNNING'} | Source parameters: duration ${gun.duration}, accuracy ${gun.accuracy}, damage byte ${gun.damagePerHit}` : 'INACTIVE. Pause, choose an actor and ammo fixture, then Arm authored encounter.';
  }
  for (const button of buttons) button.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  for (const button of buttons) button.addEventListener('click', () => {
    const kind = button.dataset.command as 'arm' | 'fire' | 'target' | 'reset';
    command(kind === 'arm' ? { kind, actor: Number(actor.value), fixture: fixture.value as AmmoFixture } : { kind }); refresh();
  });
  return { refresh, select: (index: number, ammo: AmmoFixture) => { actor.value = String(index); fixture.value = ammo; } };
}
