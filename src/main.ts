import './styles.css';
import type { LevelData, SimulationEvent } from './contracts';
import { createDemoLevel } from './demo';
import { InputRouter, KEY_GROUPS, type InputSource, type PadSnapshot } from './input/router';
import { FixedClock } from './sim/clock';
import { createWorld, stepWorld } from './sim/world';
import { FourViews } from './render/four-views';
// Importer stays browser-only here: original data enters explicitly through a local file.
import { importEditorMap } from './import/editor-map';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header><div class="brand"><div class="logo" aria-hidden="true">HG</div><div><div class="eyebrow">Operation revival / 001</div><h1>HIRED GUNS</h1></div></div>
    <div class="actions"><label class="file-button">Open local .map<input id="map-file" aria-label="Open local editor map" type="file" accept=".map"></label><button id="demo">Synthetic map</button><button id="reset">Reset positions</button><button class="primary" id="play">Start navigation</button></div></header>
  <div class="brief"><div><strong id="level-name"></strong> <span id="source-label"></span></div><div class="badge">STATIC NAVIGATION PROTOTYPE</div></div>
  <div id="error" role="alert"></div>
  <div class="stage"><canvas aria-label="Four synchronized game views"></canvas><div class="view-grid">
    ${[0, 1, 2, 3].map(i => `<section class="view" aria-label="Mercenary ${i + 1} viewport"><div class="view-head"><div><span class="player-name" style="color:${['#70ded1', '#f1bf70', '#8eaef5', '#e995b8'][i]}">0${i + 1} / MERCENARY</span><span class="player-sub" id="device-${i}"></span></div><select aria-label="Control mercenary ${i + 1}" id="assign-${i}"></select></div><div class="reticle"></div><div class="view-foot"><span id="position-${i}"></span><span id="event-${i}">READY</span></div></section>`).join('')}
  </div><div class="paused" id="pause-overlay"><b>TEAM STANDING BY</b><small>Assign controls, then start navigation</small></div></div>
  <footer><div class="controls"><span><kbd>WASD + Q/E</kbd> · <kbd>IJKL + U/O</kbd> · <kbd>Arrows + ,/.</kbd> · <kbd>Numpad 8456 + 7/9</kbd></span><span><kbd>1–4</kbd> assign WASD to a mercenary · <kbd>Esc</kbd> pause</span></div><details><summary>Controls, source and prototype limitations <span id="tick"></span></summary><div id="diagnostics"></div></details></footer>`;

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let level = createDemoLevel(), world = createWorld(level);
let renderer: FourViews | null = null;
let paused = true, loading = false, loadGeneration = 0;
let extraDiagnostics = '';
let padInventory = '';
let lastTime = performance.now(), frameMs = 0;
const router = new InputRouter(), clock = new FixedClock(), keys = new Set<string>();
const events: string[] = ['READY', 'READY', 'READY', 'READY'];
const canvas = app.querySelector<HTMLCanvasElement>('canvas')!;
const panes = [...app.querySelectorAll<HTMLElement>('.view')];
const selects = [0, 1, 2, 3].map(i => get<HTMLSelectElement>(`assign-${i}`));

function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function setPaused(value: boolean): void {
  paused = value; keys.clear(); router.reset(); clock.reset();
  get<HTMLButtonElement>('play').textContent = paused ? 'Start navigation' : 'Pause';
  get('pause-overlay').hidden = !paused;
}
function deviceKey(source: InputSource): string {
  return !source ? 'none' : source.kind === 'keyboard' ? `key:${source.index}` : `pad:${source.index}:${source.id}`;
}
function readPads(): PadSnapshot[] {
  return [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => p !== null).map(p => ({ index: p.index, id: p.id, connected: p.connected, mapping: p.mapping, axes: [...p.axes], buttons: p.buttons.map(b => ({ pressed: b.pressed })) }));
}
function refreshAssignments(pads: PadSnapshot[], force = false): void {
  const inventory = JSON.stringify(pads.map(p => [p.index, p.id, p.connected, p.mapping]));
  if (!force && inventory === padInventory) return;
  padInventory = inventory;
  selects.forEach((select, i) => {
    select.replaceChildren(new Option('Unassigned', 'none'));
    ['WASD / Q E', 'IJKL / U O', 'Arrows / , .', 'Numpad'].forEach((label, j) => select.add(new Option(label, `key:${j}`)));
    pads.filter(p => p.connected && p.mapping === 'standard').forEach(p => select.add(new Option(`Pad ${p.index + 1}: ${p.id.slice(0, 24)}`, `pad:${p.index}:${p.id}`)));
    const source = router.assignments[i] ?? null, key = deviceKey(source);
    if (source?.kind === 'gamepad' && ![...select.options].some(option => option.value === key)) select.add(new Option(`Pad ${source.index + 1}: disconnected / reassignment needed`, key));
    select.value = key;
  });
}
selects.forEach((select, i) => select.addEventListener('change', () => {
  const value = select.value;
  let source: InputSource = null;
  if (value.startsWith('key:')) source = { kind: 'keyboard', index: Number(value.slice(4)) };
  else if (value.startsWith('pad:')) {
    const pad = readPads().find(p => `pad:${p.index}:${p.id}` === value);
    if (pad) source = { kind: 'gamepad', index: pad.index, id: pad.id };
  }
  router.assign(i, source); keys.clear(); refreshAssignments(readPads(), true); select.blur();
}));

function updateHud(pads: PadSnapshot[]): void {
  for (let i = 0; i < 4; i++) {
    const p = world.mercenaries[i]!, source = router.assignments[i];
    get(`position-${i}`).textContent = `X ${String(p.x).padStart(2, '0')}  Y ${String(p.y).padStart(2, '0')}  Z ${String(p.z).padStart(2, '0')} / ${['N', 'E', 'S', 'W'][p.facing]}`;
    get(`event-${i}`).textContent = events[i]!;
    const pad = source?.kind === 'gamepad' ? pads.find(pad => pad.index === source.index && pad.id === source.id && pad.connected) : null;
    get(`device-${i}`).textContent = !source ? 'UNASSIGNED' : source.kind === 'keyboard' ? `KEYBOARD ${String.fromCharCode(65 + source.index)}` : pad?.mapping === 'standard' ? `PAD ${source.index + 1} CONNECTED` : 'PAD DISCONNECTED / CHECK ASSIGNMENT';
  }
  get('tick').textContent = `· tick ${world.tick} · ${frameMs.toFixed(1)} ms/frame`;
}
function updateLevelInfo(): void {
  get('level-name').textContent = level.name || 'Untitled editor map';
  get('source-label').textContent = level.source.kind === 'synthetic' ? '/ newly authored test geometry' : '/ local editor revision · not a validated mission';
  get('diagnostics').textContent = [
    'Keyboard: forward/back, strafe left/right; Q/E, U/O, comma/period or numpad 7/9 turn. Numbers 1–4 move keyboard A assignment. Keyboard rollover depends on hardware.',
    'Standard gamepads: left stick or D-pad moves/turns; shoulder buttons strafe. Assign each pad above. Press a pad button if the browser has not exposed it yet. Non-standard mappings require future remapping support.',
    'Disconnect stops that controller. Matching index and device ID can reconnect; otherwise reassign. Four physical controllers on the event PC/TV have NOT been tested.',
    '50 Hz prototype clock; movement repeats at 160 ms while held. Static block collision, explicit floors or solid type-0 block support below. No gravity, special block shapes, dynamic objects, combat, inventory, completion, checkpoints, sound or campaign travel. Unsafe drops and hazard cells are blocked. This is not original timing/behaviour parity.',
    `Source: ${level.source.revision}; SHA-256: ${level.source.sha256 ?? 'synthetic'}`,
    `Unsupported source mechanics: ${level.unsupportedMechanics.join('; ') || 'none detected, mission behaviour not validated'}`,
    extraDiagnostics,
  ].filter(Boolean).join('\n\n');
}
function installLevel(nextLevel: LevelData, diagnostics = ''): void {
  const nextWorld = createWorld(nextLevel); // Validate before replacing the current working level.
  renderer?.dispose(); renderer = null;
  try { renderer = new FourViews(canvas, panes, nextLevel); }
  catch (error) { get<HTMLButtonElement>('play').disabled = true; throw new Error(`WebGL2 unavailable: ${errorText(error)}`); }
  level = nextLevel; world = nextWorld; extraDiagnostics = diagnostics;
  events.fill('READY'); setPaused(true); updateLevelInfo(); updateHud(readPads());
  get<HTMLButtonElement>('play').disabled = false;
}
get<HTMLButtonElement>('play').addEventListener('click', () => { if (!loading && renderer) setPaused(!paused); });
get<HTMLButtonElement>('reset').addEventListener('click', () => {
  loadGeneration++; loading = false; world = createWorld(level); events.fill('READY'); get('error').textContent = ''; setPaused(true);
});
get<HTMLButtonElement>('demo').addEventListener('click', () => {
  loadGeneration++; loading = false; get('error').textContent = '';
  try { installLevel(createDemoLevel()); } catch (error) { get('error').textContent = errorText(error); }
});
get<HTMLInputElement>('map-file').addEventListener('change', async event => {
  const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
  if (!file) return;
  const generation = ++loadGeneration; loading = true; setPaused(true); get('error').textContent = '';
  try {
    if (file.size !== 157738) throw new Error('Expected a 157,738-byte raw editor .map file. Packed/runtime maps are not supported.');
    const { level: imported, report } = await importEditorMap(new Uint8Array(await file.arrayBuffer()));
    if (generation !== loadGeneration) return;
    installLevel(imported, `Import report: ${JSON.stringify(report, null, 2)}`);
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Map not loaded: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) loading = false; }
});

const allKeys = new Set(KEY_GROUPS.flatMap(group => group.map(([key]) => key)));
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (target.matches('input,select,textarea') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'Escape') { setPaused(true); event.preventDefault(); return; }
  if (/^Digit[1-4]$/.test(event.code)) {
    router.assign(Number(event.code.slice(-1)) - 1, { kind: 'keyboard', index: 0 }); keys.clear(); refreshAssignments(readPads(), true); event.preventDefault(); return;
  }
  if (allKeys.has(event.code)) { event.preventDefault(); if (!paused) keys.add(event.code); }
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); setPaused(true); get('error').textContent = 'Graphics context lost. Reload the page to recover.'; get<HTMLButtonElement>('play').disabled = true; });

function frame(now: number): void {
  const elapsed = Math.max(0, now - lastTime); lastTime = now; frameMs += (elapsed - frameMs) * 0.05;
  const pads = readPads(); refreshAssignments(pads);
  if (!paused && !loading) clock.advance(elapsed, () => {
    const result = stepWorld(level, world, router.commands(world.tick, keys, pads)); world = result.world;
    result.events.forEach((event: SimulationEvent) => { events[event.mercenaryId] = event.kind === 'blocked' ? `BLOCKED: ${event.reason}`.toUpperCase() : event.kind.toUpperCase(); });
  });
  renderer?.render(world, elapsed); updateHud(pads); requestAnimationFrame(frame);
}
try { installLevel(level); } catch (error) { get('error').textContent = errorText(error); }
refreshAssignments(readPads(), true); requestAnimationFrame(frame);
