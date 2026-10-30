import { MAX_GROUND_HISTORY } from './items/training-ground';
import { MAX_INVENTORY_COMMANDS } from './sim/training-inventory';
import type { InventorySlot } from './import/characters';
import type { TrainingSession } from './sim/training-session';

export function installTrainingInventoryPanel(host: HTMLElement, available: () => boolean, command: (actor: number, slot: number, kind: 'equip' | 'return' | 'exchange') => Promise<void>) {
  let current: TrainingSession | null = null;
  const controls: { actor: number; select: HTMLSelectElement; button: HTMLButtonElement; position: HTMLSelectElement; returnButton: HTMLButtonElement; exchangeButton: HTMLButtonElement }[] = [];
  const text = (session: TrainingSession, slot: InventorySlot) => slot.itemId === 0 ? `Empty / ${slot.rawHex}` :
    `${slot.itemId}: ${session.items.records[slot.itemId - 1]!.text.header1.trim()} ${session.items.records[slot.itemId - 1]!.text.header2.trim()} / ${slot.rawHex}`;
  function refresh() {
    for (const { actor, select, button, position, returnButton, exchangeButton } of controls) {
      const state = current?.inventory.actors[actor];
      const exhausted = !current || (current.consumables ? current.consumables.history.length >= MAX_INVENTORY_COMMANDS : current.ground ? current.ground.history.length >= MAX_GROUND_HISTORY : current.inventory.commands.length >= MAX_INVENTORY_COMMANDS);
      select.disabled = !available() || exhausted;
      button.disabled = !available() || exhausted || !state || state.inventory.equipped.itemId !== 0 || select.value === '';
      exchangeButton.disabled = !available() || exhausted || !state || state.inventory.equipped.itemId === 0 || select.value === '';
      position.disabled = !available() || exhausted || !state || state.inventory.equipped.itemId === 0;
      returnButton.disabled = position.disabled || position.value === '';
    }
  }
  function render(session: TrainingSession | null) {
    current = session; controls.length = 0; host.replaceChildren();
    if (!session) return;
    const title = document.createElement('p');
    title.textContent = 'Carried inventory — pause, choose a slot, then Equip. Choose an insertion position and Return to backpack. When equipped, select another occupied carried slot and Exchange equipment. These are standalone source-deduced adapters. Retry, rule changes or Apply a new team reset the operation budget.';
    const budget = document.createElement('p'); budget.id = 'inventory-budget';
    const remaining = session.consumables ? MAX_INVENTORY_COMMANDS-session.consumables.history.length : session.ground ? MAX_GROUND_HISTORY - session.ground.history.length : MAX_INVENTORY_COMMANDS - session.inventory.commands.length;
    budget.textContent = `${session.ground ? 'Shared movement/item replay events' : 'Inventory operations'} remaining: ${remaining} / ${MAX_INVENTORY_COMMANDS}.${remaining === 0 ? ' Budget exhausted. Retry or Apply a new team to reset.' : ''}`;
    host.append(title, budget);
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
      const exchangeButton = document.createElement('button'); exchangeButton.textContent = `Exchange equipment for team slot ${i + 1}`;
      const position = document.createElement('select'); position.setAttribute('aria-label', `Return position for team slot ${i + 1}`);
      const end = actor.inventory.carried.findIndex(slot => slot.itemId === 0);
      if (end >= 0 && actor.inventory.carried.slice(end).every(slot => slot.itemId === 0)) {
        for (let j = 0; j <= Math.max(0, end - 1); j++) position.add(new Option(j === 0 ? 'Front (position 1)' : `Before position ${j + 1}: ${text(session, actor.inventory.carried[j]!)}`, String(j)));
      }
      const returnButton = document.createElement('button'); returnButton.textContent = `Return to backpack for team slot ${i + 1}`;
      const message = document.createElement('p'); message.setAttribute('role', 'status');
      select.addEventListener('change', () => {
        selected.textContent = select.value === '' ? '' : `Selected: ${text(session, actor.inventory.carried[Number(select.value)]!)}`; refresh();
      });
      button.addEventListener('click', async () => {
        try { await command(i, Number(select.value), 'equip'); }
        catch (error) { message.textContent = `Item not equipped: ${error instanceof Error ? error.message : String(error)}`; }
        finally { refresh(); }
      });
      exchangeButton.addEventListener('click', async () => {
        try {
          if (select.value === '') throw new Error('Choose an occupied carried slot.');
          await command(i, Number(select.value), 'exchange');
        }
        catch (error) { message.textContent = `Equipment not exchanged: ${error instanceof Error ? error.message : String(error)}`; }
        finally { refresh(); }
      });
      returnButton.addEventListener('click', async () => {
        try { await command(i, Number(position.value), 'return'); }
        catch (error) { message.textContent = `Equipment not returned: ${error instanceof Error ? error.message : String(error)}`; }
        finally { refresh(); }
      });
      controls.push({ actor: i, select, button, position, returnButton, exchangeButton });
      const detail = document.createElement('details'), summary = document.createElement('summary'), data = document.createElement('pre');
      summary.textContent = 'Current inventory bytes and weight';
      data.textContent = JSON.stringify(actor);
      Object.assign(data.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '260px', overflow: 'auto' });
      detail.append(summary, data);
      section.append(heading, status, select, selected, button, exchangeButton, position, returnButton, message, detail); host.append(section);
    });
    refresh();
  }
  return { render, refresh };
}
