import type { InventorySlot } from './import/characters';
import type { TrainingSession } from './sim/training-session';

export function installTrainingInventoryPanel(host: HTMLElement, available: () => boolean, equip: (actor: number, slot: number) => Promise<void>) {
  let current: TrainingSession | null = null;
  const controls: { actor: number; select: HTMLSelectElement; button: HTMLButtonElement }[] = [];
  const text = (session: TrainingSession, slot: InventorySlot) => slot.itemId === 0 ? `Empty / ${slot.rawHex}` :
    `${slot.itemId}: ${session.items.records[slot.itemId - 1]!.text.header1.trim()} ${session.items.records[slot.itemId - 1]!.text.header2.trim()} / ${slot.rawHex}`;
  function refresh() {
    for (const { actor, select, button } of controls) {
      const state = current?.inventory.actors[actor];
      select.disabled = !available();
      button.disabled = !available() || !state || state.inventory.equipped.itemId !== 0 || select.value === '';
    }
  }
  function render(session: TrainingSession | null) {
    current = session; controls.length = 0; host.replaceChildren();
    if (!session) return;
    const title = document.createElement('p');
    title.textContent = 'Carried inventory — pause, choose a slot, then Equip. One equip per mercenary; Retry and rule changes reset equipment.';
    host.append(title);
    session.inventory.actors.forEach((actor, i) => {
      const section = document.createElement('section'); section.id = `training-inventory-${i}`;
      const heading = document.createElement('h3'); heading.textContent = `Team slot ${i + 1}: ${session.names[i]}`;
      const status = document.createElement('p'); status.id = `inventory-status-${i}`;
      status.textContent = `Equipped: ${text(session, actor.inventory.equipped)} | Verified weight ${actor.weight.totalWeight} | Quotient ${actor.weight.quotient} | Too heavy ${actor.weight.tooHeavy}`;
      const select = document.createElement('select'); select.setAttribute('aria-label', `Carried slot for team slot ${i + 1}`);
      select.add(new Option('Choose carried item', ''));
      actor.inventory.carried.forEach((slot, j) => {
        const option = new Option(`${j + 1}: ${text(session, slot)}`, String(j)); option.disabled = slot.itemId === 0; select.add(option);
      });
      const selected = document.createElement('p'); selected.id = `inventory-selection-${i}`;
      const button = document.createElement('button'); button.textContent = `Equip for team slot ${i + 1}`;
      const message = document.createElement('p'); message.setAttribute('role', 'status');
      select.addEventListener('change', () => {
        selected.textContent = select.value === '' ? '' : `Selected: ${text(session, actor.inventory.carried[Number(select.value)]!)}`; refresh();
      });
      button.addEventListener('click', async () => {
        try { await equip(i, Number(select.value)); }
        catch (error) { message.textContent = `Item not equipped: ${error instanceof Error ? error.message : String(error)}`; }
        finally { refresh(); }
      });
      controls.push({ actor: i, select, button });
      const detail = document.createElement('details'), summary = document.createElement('summary'), data = document.createElement('pre');
      summary.textContent = 'Current inventory bytes and weight';
      data.textContent = JSON.stringify(actor);
      Object.assign(data.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '260px', overflow: 'auto' });
      detail.append(summary, data);
      section.append(heading, status, select, selected, button, message, detail); host.append(section);
    });
    refresh();
  }
  return { render, refresh };
}
