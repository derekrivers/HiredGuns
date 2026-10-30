import type { WorldState } from './contracts';
import { atGround, MAX_GROUND_HISTORY } from './items/training-ground';
import type { GroundTransferCommand } from './items/ground-transfer';
import type { TrainingSession } from './sim/training-session';

export function installTrainingGroundPanel(host: HTMLElement, current: () => TrainingSession | null, world: () => WorldState,
  available: () => boolean, paused: () => boolean,
  action: (actor: number, groundId: string, slot: number, transfer: GroundTransferCommand | null) => Promise<void>) {
  host.className = 'test-card';
  host.innerHTML = '<h3>Authored nearby ground cache</h3><p>Training43 has no initial ground items. This test relocates the selected team’s carried entries to labelled slots at team slot 1’s starting cell. Original map bytes stay unchanged. Full four-byte entries, including the unknown byte, travel intact.</p><button id="author-ground">Author nearby ground cache</button><p>Pause, stand on the cache cell, choose an actor and ground slot. G: pick up into equipment (stows occupied equipment). B: pick up into carried storage. V: drop equipment into the selected empty ground slot. Equip, exchange and return remain in Inventory &amp; equipment.</p><div class="actions"><label>Ground actor <select id="ground-actor" aria-label="Ground actor"></select></label><label>Ground slot <select id="ground-slot" aria-label="Ground slot"></select></label><label>Carried insertion <select id="ground-selection" aria-label="Ground carried insertion"></select></label></div><div class="actions"><button id="ground-pickup-equipment">Pick up equipment (G)</button><button id="ground-pickup-carried">Pick up carried (B)</button><button id="ground-drop-equipment">Drop equipment (V)</button></div><div id="ground-status" role="status"></div><p id="ground-feedback" role="status"></p><details><summary>Ground ownership and packed entries</summary><pre id="ground-snapshot"></pre></details>';
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  const actor = get<HTMLSelectElement>('ground-actor'), slot = get<HTMLSelectElement>('ground-slot'), insertion = get<HTMLSelectElement>('ground-selection');
  for (let i = 0; i < 4; i++) actor.add(new Option(`Team slot ${i + 1}`, String(i)));
  let rendered: TrainingSession | null = null, lastStatus = '';
  for (const select of [actor, slot, insertion]) select.style.maxWidth = '100%';
  function refresh() {
    const session = current(), ground = session?.ground, i = Number(actor.value), state = session?.inventory.actors[i], pose = world().mercenaries[i]!;
    host.hidden = !session;
    if (session !== rendered) {
      rendered = session; const old = slot.value, selection = insertion.value;
      slot.replaceChildren(); insertion.replaceChildren();
      ground?.slots.forEach(s => slot.add(new Option(`${s.id}: ${s.entry.itemId ? `Item ${s.entry.itemId}` : 'Empty'} / ${s.entry.rawHex}`, s.id)));
      if ([...slot.options].some(o => o.value === old)) slot.value = old;
      const count = state?.inventory.carried.filter(s => s.itemId).length ?? 0;
      for (let j = 0; j < Math.max(1, count); j++) insertion.add(new Option(`Position ${j + 1}`, String(j)));
      if ([...insertion.options].some(o => o.value === selection)) insertion.value = selection;
      get('ground-snapshot').textContent = JSON.stringify({ ground, actors: session?.inventory.actors });
      Object.assign(get('ground-snapshot').style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '240px', overflow: 'auto' });
    }
    const selected = ground?.slots.find(s => s.id === slot.value), near = !!selected && atGround(pose, selected);
    get<HTMLButtonElement>('author-ground').disabled = !available() || !paused() || !!ground || world().tick !== 0 || !!session?.inventory.commands.length || world().physics.mode !== 'static';
    actor.disabled = slot.disabled = insertion.disabled = !available() || !ground;
    for (const kind of ['pickup-equipment','pickup-carried','drop-equipment']) get<HTMLButtonElement>(`ground-${kind}`).disabled = !available() || !paused() || !ground || ground.history.length >= MAX_GROUND_HISTORY;
    const statusText = !ground ? world().physics.mode !== 'static' ? 'Unavailable in selected dry-fall: weight-dependent injury replay requires a future interleaved physics contract.' : 'No ground overlay. Retry or Apply a team to author this test at tick zero.' :
      `${paused() ? 'PAUSED' : 'RUNNING — pause for item actions'} | Team slot ${i + 1}: ${session!.names[i]} | Actor cell ${pose.x},${pose.y},${pose.z} | Cache cell ${selected?.x},${selected?.y},${selected?.z} | ${near ? 'At cache' : 'Away: move onto cache cell'} | Selected ${selected?.id}: ${selected?.entry.rawHex} | Equipped ${state?.inventory.equipped.rawHex} | Carried ${state?.inventory.carried.filter(s => s.itemId).length}/30 | Verified weight ${state?.weight.totalWeight} | Too heavy ${state?.weight.tooHeavy} | Replay ${ground.history.length}/${MAX_GROUND_HISTORY}`;
    if (lastStatus !== statusText) {
      lastStatus = statusText; const status = get('ground-status'); status.replaceChildren();
      Object.assign(status.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px 16px' });
      for (const text of statusText.split(' | ')) { const row = document.createElement('p'); row.textContent = text; row.style.margin = '4px 0'; status.append(row); }
    }
  }
  async function execute(transfer: GroundTransferCommand | null) {
    if (!available()) return;
    const before = current()?.inventory.actors[Number(actor.value)], bytes = before?.inventory.equipped.rawHex, weight = before?.weight.totalWeight;
    try {
      await action(Number(actor.value), slot.value, Number(insertion.value || 0), transfer);
      const after = current()?.inventory.actors[Number(actor.value)];
      get('ground-feedback').textContent = `${transfer?.kind ?? 'Authored cache'} complete. Equipment ${bytes} → ${after?.inventory.equipped.rawHex}; weight ${weight} → ${after?.weight.totalWeight}.`;
    } catch (error) { get('ground-feedback').textContent = `Item action refused: ${error instanceof Error ? error.message : String(error)}`; }
    refresh();
  }
  get('author-ground').addEventListener('click', () => void execute(null));
  for (const kind of ['pickup-equipment','pickup-carried','drop-equipment'] as const) get(`ground-${kind}`).addEventListener('click', () => void execute({ version: 1, kind }));
  actor.addEventListener('change', () => { rendered = null; refresh(); }); slot.addEventListener('change', refresh);
  return { refresh, select(i: number) { actor.value = String(i); rendered = null; refresh(); },
    keyboard(code: string) { const kind = code === 'KeyG' ? 'pickup-equipment' : code === 'KeyB' ? 'pickup-carried' : 'drop-equipment'; void execute({ version: 1, kind }); },
    clear() { rendered = null; get('ground-feedback').textContent = ''; refresh(); } };
}
