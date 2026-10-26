import { CHARACTER_FILE_BYTES, importCharacters, type CharacterCatalog } from './import/characters';
import { exportRosterSelection, importRosterSelection, MAX_SELECTION_BYTES } from './import/roster-selection';

/** Preparation only: this panel never receives or modifies a world. */
export function installRosterPanel(host: HTMLElement, pause: () => void): void {
  host.innerHTML = `<details id="roster-panel"><summary>Local character roster / team preparation</summary>
    <p>Inspect a raw five-bank Characters file and choose four characters. This preparation does not apply stats or inventory to navigation or drills. Game checkpoints do not contain this plan.</p>
    <div class="actions"><label class="file-button">Open local Characters data<input type="file" id="roster-file" aria-label="Open local Characters data"></label><button id="roster-save" disabled>Save team plan</button><label class="file-button">Load team plan<input type="file" id="roster-plan" aria-label="Load team plan" accept=".json"></label></div>
    <p id="roster-source">No roster loaded. No default original team is assigned.</p><div id="roster-choices"></div><p id="roster-status" role="status"></p></details>`;
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  let catalog: CharacterCatalog | null = null;
  let generation = 0;
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  const selected = () => [...host.querySelectorAll<HTMLSelectElement>('.roster-select')].map(select => select.value === '' ? -1 : Number(select.value));
  const update = () => {
    const indices = selected();
    const valid = indices.length === 4 && indices.every(i => i >= 0) && new Set(indices).size === 4;
    get<HTMLButtonElement>('roster-save').disabled = !valid;
    get('roster-status').textContent = valid ? 'Four characters selected for preparation only. Save the plan to restore it with this exact source file.' : 'Choose four different characters. No team is chosen automatically.';
    for (let i = 0; i < 4; i++) {
      const record = catalog?.records[indices[i]!];
      const output = get(`roster-info-${i}`);
      output.textContent = record ? `Race ${record.race} · Class ${record.class} · Source fitness ${record.stats.fitness} · Physique ${record.stats.physique} · Agility ${record.stats.agility}\nInitial carried slots (item / damage / ammo / raw fourth byte):\n${record.inventory.map((slot, j) => `${j + 1}: ${slot.itemId} / ${slot.damage} / ${slot.ammo} / ${slot.fourthByte}`).join('\n')}\nAction bytes are preserved separately; they are not equipped inventory. Weight and item behavior are not resolved.` : '';
    }
  };
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
      select.addEventListener('change', () => { pause(); update(); select.blur(); });
      label.append(select); choices.append(label, info);
    }
    update();
  };
  get<HTMLInputElement>('roster-file').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    const current = ++generation; pause();
    try {
      if (file.size !== CHARACTER_FILE_BYTES) throw new Error('Use the 16,320-byte raw source/CD32 file. Packed 2,267-byte OCS and legacy 3,072-byte editor files need separate recovery.');
      const next = await importCharacters(new Uint8Array(await file.arrayBuffer()));
      if (current === generation) showCatalog(next);
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
  get<HTMLInputElement>('roster-plan').addEventListener('change', async event => {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
    if (!file) return;
    const current = ++generation; pause();
    try {
      if (!catalog) throw new Error('Open Characters data first.');
      if (file.size >= MAX_SELECTION_BYTES) throw new Error('Roster selection must be smaller than 2 KiB.');
      const next = importRosterSelection(catalog, await file.text());
      if (current !== generation) return;
      [...host.querySelectorAll<HTMLSelectElement>('.roster-select')].forEach((select, i) => { select.value = String(next.characters[i]); });
      update(); get('roster-status').textContent = 'Team plan restored for this exact source. Preparation only; gameplay is unchanged.';
    } catch (error) { if (current === generation) get('roster-status').textContent = `Plan not loaded: ${errorText(error)}`; }
  });
}
