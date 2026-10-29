import { CHARACTER_FILE_BYTES, importCharacters, type CharacterCatalog } from './import/characters';
import { exportRosterSelection, importRosterSelection, MAX_SELECTION_BYTES } from './import/roster-selection';
import { importItems, ITEM_FILE_BYTES, type ItemCatalog } from './import/items';
import type { TrainingSources } from './sim/training-session';
import { OCS_ITEMS_SHA256 } from './import/items';
import { inspectSelectionInventory } from './import/inventory';

/** Bounded same-origin bytes; identity still comes solely from the raw importers. */
export async function fetchLocalTestResource(resource: 'map' | 'roster' | 'items' | 'catalog', size: number, exact = true): Promise<Uint8Array> {
  const response = await fetch(`/__local-training43/${resource}`, { cache: 'no-store', mode: 'same-origin', credentials: 'omit' });
  if (!response.ok || !response.body || response.headers.get('content-type') !== (resource === 'catalog' ? 'application/json' : 'application/octet-stream')) throw new Error('Local Training43 preset unavailable. Configure the local test provider or use the manual imports.');
  const reader = response.body.getReader(), bytes = new Uint8Array(size);
  let offset = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.length > size) throw new Error('Local preset resource has an unexpected size.');
      bytes.set(value, offset); offset += value.length;
    }
    if (exact && offset !== size) throw new Error('Local preset resource has an unexpected size.');
    return bytes.slice(0, offset);
  } finally { await reader.cancel(); }
}

export interface RosterPanel {
  sources(): TrainingSources | null;
  refresh(): void;
  prepare(sources: TrainingSources, indices: readonly number[]): Promise<() => void>;
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
    <p id="local-source-status" role="status">Checking configured local sources…</p>
    <label>Known local Characters source <select id="local-roster-source" aria-label="Known local Characters source" disabled><option value="">Choose a configured Characters source</option></select></label>
    <div class="actions"><label class="file-button">Open local Characters data<input type="file" id="roster-file" aria-label="Open local Characters data"></label><button id="roster-save" disabled>Save team plan</button><label class="file-button">Load team plan<input type="file" id="roster-plan" aria-label="Load team plan" accept=".json"></label></div>
    <p id="roster-source">No roster loaded. No default original team is assigned.</p>
    <label>Known local Items source <select id="local-items-source" aria-label="Known local Items source" disabled><option value="">Choose a configured Items source</option></select></label>
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
  const loadItems = async (read: () => Promise<Uint8Array>) => {
    const current = ++itemGeneration; pause(); session.invalidate(); itemBytes = null; update();
    try {
      const bytes = await read();
      const next = await importItems(bytes);
      if (current !== itemGeneration) return;
      items = next; itemBytes = bytes;
      get('items-source').textContent = `Item source ${next.source.revision} · SHA-256 ${next.source.sha256}. Weight requires a verified roster/item pairing. This table is session-only.`;
      get('items-records').textContent = next.records.map(record => JSON.stringify(record)).join('\n');
      get<HTMLButtonElement>('items-clear').disabled = false;
      update(); get('items-status').textContent = 'Item definitions loaded locally. All record bytes are retained for inspection; unknown behavior remains unsupported.';
    } catch (error) { if (current === itemGeneration) get('items-status').textContent = `Items not loaded: ${errorText(error)}`; }
  };
  get<HTMLInputElement>('items-file').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    get<HTMLSelectElement>('local-items-source').value = '';
    await loadItems(async () => {
      if (file.size !== ITEM_FILE_BYTES) throw new Error('Use a recovered raw 32,604-byte item table; packed GameFast data and item graphics are separate formats.');
      return new Uint8Array(await file.arrayBuffer());
    });
  });
  get<HTMLButtonElement>('items-clear').addEventListener('click', () => {
    get<HTMLSelectElement>('local-items-source').value = '';
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
  const loadRoster = async (read: () => Promise<Uint8Array>) => {
    const current = ++generation; pause(); session.invalidate(); rosterBytes = null; update();
    try {
      const bytes = await read();
      const next = await importCharacters(bytes);
      if (current === generation) { rosterBytes = bytes; showCatalog(next); }
    } catch (error) { if (current === generation) get('roster-status').textContent = `Roster not loaded: ${errorText(error)}`; }
  };
  get<HTMLInputElement>('roster-file').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    get<HTMLSelectElement>('local-roster-source').value = '';
    await loadRoster(async () => {
      if (file.size !== CHARACTER_FILE_BYTES) throw new Error('Use the 16,320-byte raw source/CD32 file. Packed 2,267-byte OCS and legacy 3,072-byte editor files need separate recovery.');
      return new Uint8Array(await file.arrayBuffer());
    });
  });
  for (const kind of ['roster', 'items'] as const) {
    const select = get<HTMLSelectElement>(`local-${kind}-source`);
    select.addEventListener('change', async () => {
      if (select.value !== kind) return;
      select.value = ''; // The same known source can be chosen again to reload.
      const load = kind === 'roster' ? loadRoster : loadItems;
      await load(() => fetchLocalTestResource(kind, kind === 'roster' ? CHARACTER_FILE_BYTES : ITEM_FILE_BYTES));
      select.blur();
    });
  }
  void fetchLocalTestResource('catalog', 4096, false).then(bytes => {
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object') throw new Error('Invalid local source catalogue.');
    let count = 0;
    for (const kind of ['roster', 'items'] as const) {
      const entries: unknown = (data as Record<string, unknown>)[kind];
      if (!Array.isArray(entries) || entries.length !== 1) throw new Error('Invalid local source catalogue.');
      const entry = entries[0] as Record<string, unknown>;
      if (!entry || entry.id !== kind || typeof entry.label !== 'string' || entry.label.length > 100 || typeof entry.available !== 'boolean') throw new Error('Invalid local source catalogue.');
      const select = get<HTMLSelectElement>(`local-${kind}-source`);
      const option = new Option(`${entry.label} — ${entry.available ? 'available; verify on load' : 'unavailable'}`, kind);
      option.disabled = !entry.available; select.add(option); select.disabled = !entry.available;
      if (entry.available) count++;
    }
    get('local-source-status').textContent = `${count} configured local sources available. Select a source to load it without a file manager. File availability does not establish verified identity.`;
  }).catch(() => { get('local-source-status').textContent = 'Known local sources unavailable. Configure the local test provider and reload, or use the optional file pickers.'; });
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
    const current = ++generation; pause(); session.cancel(); update();
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
  return { sources, refresh: update, prepare: async (input, indices) => {
    const current = ++generation, currentItems = ++itemGeneration;
    const roster = input.roster.slice(), item = input.items.slice();
    const [next, table] = await Promise.all([importCharacters(roster), importItems(item)]);
    if (indices.length !== 4 || new Set(indices).size !== 4 || indices.some(i => !Number.isInteger(i) || i < 0 || i >= 12)) throw new Error('Choose four different characters.');
    return () => {
      if (current !== generation || currentItems !== itemGeneration) throw new Error('Team preparation superseded.');
      rosterBytes = roster; itemBytes = item; items = table;
      showCatalog(next);
      [...host.querySelectorAll<HTMLSelectElement>('.roster-select')].forEach((select, i) => { select.value = String(indices[i]); });
      get('items-source').textContent = `Item source ${table.source.revision} · SHA-256 ${table.source.sha256}. Weight requires a verified roster/item pairing. This table is session-only.`;
      get('items-records').textContent = table.records.map(record => JSON.stringify(record)).join('\n');
      get<HTMLButtonElement>('items-clear').disabled = false;
      get('items-status').textContent = 'Item definitions loaded locally for the Training43 test preset.';
      update();
    };
  } };
}
