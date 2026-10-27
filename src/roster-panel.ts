import { CHARACTER_FILE_BYTES, importCharacters, type CharacterCatalog } from './import/characters';
import { exportRosterSelection, importRosterSelection, MAX_SELECTION_BYTES } from './import/roster-selection';
import { importItems, ITEM_FILE_BYTES, type ItemCatalog } from './import/items';
import type { TrainingSources } from './sim/training-session';
import { OCS_ITEMS_SHA256 } from './import/items';
import { inspectSelectionInventory } from './import/inventory';

export interface RosterPanel {
  sources(): TrainingSources | null;
  refresh(): void;
}
/** World installation remains atomic and owned by main. */
export function installRosterPanel(host: HTMLElement, pause: () => void, session: {
  available(): boolean;
  invalidate(): void;
  cancel(): void;
  apply(sources: TrainingSources, indices: number[]): Promise<void>;
}): RosterPanel {
  host.innerHTML = `<details id="roster-panel"><summary>Local character roster / team preparation</summary>
    <p>Inspect a raw five-bank Characters file and choose four characters. Apply your four choices to a standalone imported Training43 session after opening the matching map and verified OCS roster and items. Other maps support preparation only.</p>
    <div class="actions"><label class="file-button">Open local Characters data<input type="file" id="roster-file" aria-label="Open local Characters data"></label><button id="roster-save" disabled>Save team plan</button><label class="file-button">Load team plan<input type="file" id="roster-plan" aria-label="Load team plan" accept=".json"></label></div>
    <p id="roster-source">No roster loaded. No default original team is assigned.</p>
    <div class="actions"><label class="file-button">Open local Items data<input type="file" id="items-file" aria-label="Open local Items data"></label><button id="items-clear" disabled>Clear item inspection</button></div>
    <p id="items-source">No item table loaded. Weight is unavailable. Item inspection stays in this session and is not saved in team plans or checkpoints.</p>
    <p id="items-status" role="status"></p><button id="items-toggle" aria-expanded="false">Show item definitions / raw records</button><pre id="items-records" hidden></pre>
    <button id="roster-apply" disabled>Apply team to Training43</button><div id="roster-choices"></div><p id="roster-status" role="status"></p></details>`;
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  let catalog: CharacterCatalog | null = null;
  let items: ItemCatalog | null = null;
  let rosterBytes: Uint8Array | null = null, itemBytes: Uint8Array | null = null;
  let applying = false;
  const sources = () => rosterBytes && itemBytes ? { roster: rosterBytes.slice(), items: itemBytes.slice() } : null;
  let itemGeneration = 0;
  let generation = 0;
  let inspectionGeneration = 0;
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  get<HTMLButtonElement>('items-toggle').addEventListener('click', () => {
    const records = get('items-records'); records.hidden = !records.hidden;
    get('items-toggle').setAttribute('aria-expanded', String(!records.hidden));
    get('items-toggle').textContent = `${records.hidden ? 'Show' : 'Hide'} item definitions / raw records`;
  });
  const selected = () => [...host.querySelectorAll<HTMLSelectElement>('.roster-select')].map(select => select.value === '' ? -1 : Number(select.value));
  const update = () => {
    const currentInspection = ++inspectionGeneration;
    const indices = selected();
    const valid = indices.length === 4 && indices.every(i => i >= 0) && new Set(indices).size === 4;
    get<HTMLButtonElement>('roster-save').disabled = !valid;
    get<HTMLButtonElement>('roster-apply').disabled = applying || !valid || !session.available() ||
      catalog?.source.revision !== 'ocs-source-data' || items?.source.sha256 !== OCS_ITEMS_SHA256 || !sources();
    get('roster-status').textContent = valid ? 'Four characters selected for preparation only. Save the plan to restore it with this exact source file.' : 'Choose four different characters. No team is chosen automatically.';
    for (let i = 0; i < 4; i++) {
      const record = catalog?.records[indices[i]!];
      const output = get(`roster-info-${i}`);
      if (!output) continue;
      const base = record ? `Race ${record.race} · Class ${record.class} · Source fitness ${record.stats.fitness} · Physique ${record.stats.physique} · Agility ${record.stats.agility}\nInitial carried slots (item / damage / ammo / raw fourth byte):\n${record.inventory.map((slot, j) => `${j + 1}: ${slot.itemId} / ${slot.damage} / ${slot.ammo} / ${slot.fourthByte}`).join('\n')}\nAction bytes are preserved separately; they are not equipped inventory.\n` : '';
      const show = (inspection: string) => { output.textContent = `${base}${inspection}\nPreparation only; no inventory or weight is applied to gameplay.`; };
      if (!record) { output.textContent = ''; continue; }
      show('Weight unavailable: open a matching verified local item table.');
      if (catalog && items) {
        show('Checking roster/item source identities…');
        void inspectSelectionInventory(catalog, items, record.index).then(result => {
          if (currentInspection !== inspectionGeneration) return;
          const weight = result.weight;
          show(`Equipment cleared · ${result.inventory.carried.length} carried slots (10 copied, 20 cleared)\n${weight.status === 'verified' ? `Verified OCS weight: ${weight.totalWeight} source units · quotient / 140: ${weight.quotient} · too heavy: ${weight.tooHeavy ? 'yes' : 'no'}` : `Weight unavailable: ${weight.reason}`}`);
        }).catch(error => { if (currentInspection === inspectionGeneration) show(`Weight unavailable: ${errorText(error)}`); });
      }
    }
  };
  get<HTMLInputElement>('items-file').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    const current = ++itemGeneration; pause(); session.invalidate(); itemBytes = null; update();
    try {
      if (file.size !== ITEM_FILE_BYTES) throw new Error('Use a recovered raw 32,604-byte item table; packed GameFast data and item graphics are separate formats.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const next = await importItems(bytes);
      if (current !== itemGeneration) return;
      items = next; itemBytes = bytes;
      get('items-source').textContent = `Item source ${next.source.revision} · SHA-256 ${next.source.sha256}. Weight requires a verified roster/item pairing. This table is session-only.`;
      get('items-records').textContent = next.records.map(record => JSON.stringify(record)).join('\n');
      get<HTMLButtonElement>('items-clear').disabled = false;
      update(); get('items-status').textContent = 'Item definitions loaded locally. All record bytes are retained for inspection; unknown behavior remains unsupported.';
    } catch (error) { if (current === itemGeneration) get('items-status').textContent = `Items not loaded: ${errorText(error)}`; }
  });
  get<HTMLButtonElement>('items-clear').addEventListener('click', () => {
    ++itemGeneration; items = null; itemBytes = null; pause(); session.invalidate();
    get('items-source').textContent = 'No item table loaded. Weight is unavailable. Item inspection stays in this session and is not saved in team plans or checkpoints.';
    get('items-records').textContent = ''; get('items-status').textContent = 'Item inspection cleared.';
    get<HTMLButtonElement>('items-clear').disabled = true; update();
  });
  const showCatalog = (next: CharacterCatalog) => {
    catalog = next;
    get('roster-source').textContent = `Source ${next.source.revision} · ${next.source.layout} · SHA-256 ${next.source.sha256}. ${next.source.revision === 'unverified' ? 'Unrecognized revision: structural inspection only.' : 'Identified archive/source revision; original runtime parity remains unverified.'}`;
    const choices = get('roster-choices'); choices.replaceChildren();
    for (let i = 0; i < 4; i++) {
      const label = document.createElement('label'); label.textContent = `Team slot ${i + 1} `;
      const select = document.createElement('select'); select.className = 'roster-select'; select.setAttribute('aria-label', `Character for team slot ${i + 1}`);
      select.add(new Option('Choose a character', ''));
      next.records.slice(0, 12).forEach(record => select.add(new Option(`${record.index + 1}: ${record.text.selectionName || record.text.gameName || 'Unnamed'}`, String(record.index))));
      const info = document.createElement('pre'); info.id = `roster-info-${i}`;
      select.addEventListener('change', () => { ++generation; pause(); session.cancel(); update(); select.blur(); });
      label.append(select); choices.append(label, info);
    }
    update();
  };
  get<HTMLInputElement>('roster-file').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    const current = ++generation; pause(); session.invalidate(); rosterBytes = null; update();
    try {
      if (file.size !== CHARACTER_FILE_BYTES) throw new Error('Use the 16,320-byte raw source/CD32 file. Packed 2,267-byte OCS and legacy 3,072-byte editor files need separate recovery.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const next = await importCharacters(bytes);
      if (current === generation) { rosterBytes = bytes; showCatalog(next); }
    } catch (error) { if (current === generation) get('roster-status').textContent = `Roster not loaded: ${errorText(error)}`; }
  });
  get<HTMLButtonElement>('roster-save').addEventListener('click', () => {
    pause();
    try {
      if (!catalog) throw new Error('Open Characters data first.');
      const json = exportRosterSelection(catalog, selected());
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'hired-guns-team-plan.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      get('roster-status').textContent = 'Team plan exported. It contains source identity and four indices; gameplay checkpoints remain separate.';
    } catch (error) { get('roster-status').textContent = errorText(error); }
  });
  get<HTMLButtonElement>('roster-apply').addEventListener('click', async () => {
    const loaded = sources();
    if (!loaded || applying) return;
    applying = true; pause(); update();
    let failure = '';
    try { await session.apply(loaded, selected()); }
    catch (error) { failure = `Team not applied: ${errorText(error)}`; }
    finally { applying = false; update(); if (failure) get('roster-status').textContent = failure; }
  });
  get<HTMLInputElement>('roster-plan').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    const current = ++generation; pause(); session.cancel();
    try {
      if (!catalog) throw new Error('Open Characters data first.');
      if (file.size >= MAX_SELECTION_BYTES) throw new Error('Roster selection must be smaller than 2 KiB.');
      const next = importRosterSelection(catalog, await file.text());
      if (current !== generation) return;
      session.cancel();
      [...host.querySelectorAll<HTMLSelectElement>('.roster-select')].forEach((select, i) => { select.value = String(next.characters[i]); });
      update(); get('roster-status').textContent = 'Team plan restored for this exact source. Preparation only; gameplay is unchanged.';
    } catch (error) { if (current === generation) get('roster-status').textContent = `Plan not loaded: ${errorText(error)}`; }
  });
  return { sources, refresh: update };
}
