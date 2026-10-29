import './styles.css';
import { createTrainingEncounter, fireTrainingEncounter, resetTrainingEncounter, targetTrainingEncounter, tickTrainingEncounter } from './combat/training-encounter';
import { installTrainingEncounterPanel, type EncounterCommand } from './training-encounter-panel';
import type { LevelData, MissionMode, SimulationEvent } from './contracts';
import { createDemoLevel, createExtractionDemo, createStairsDemo, createFallDemo } from './demo';
import { extractionProfile, missionRulesForLevel } from './sim/mission-profile';
import { InputRouter, KEY_GROUPS, type InputSource, type PadSnapshot } from './input/router';
import { FixedClock } from './sim/clock';
import { createWorld, stepWorld } from './sim/world';
import { teamDead, isDead, createSelectedFallLevel, selectedFallLevel } from './sim/fall';
import { FourViews } from './render/four-views';
// Both manual imports and the opt-in local test provider use the raw importer.
import { importEditorMap } from './import/editor-map';
import { exportCheckpoint, importCheckpoint, MAX_CHECKPOINT_BYTES } from './sim/checkpoint';
import { installRosterPanel, fetchLocalTestResource } from './roster-panel';
import { MAX_INVENTORY_COMMANDS } from './sim/training-inventory';
import { installTrainingInventoryPanel } from './training-inventory-panel';
import { equipTrainingSession, returnTrainingSession, exchangeTrainingSession, resetTrainingInventory, createTrainingSession, exportTrainingSession, importTrainingSession, isTrainingSessionSave, MAX_SESSION_BYTES, selectedFallProfile, type TrainingSession } from './sim/training-session';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header><div class="brand"><div class="logo" aria-hidden="true">HG</div><div><div class="eyebrow">Operation revival / 001</div><h1>HIRED GUNS</h1></div></div>
    <div class="actions"><button id="local-test-preset">Load ready-to-play Training43 test</button><label class="file-button">Open local .map<input id="map-file" aria-label="Open local editor map" type="file" accept=".map"></label><button id="demo">Synthetic map</button><button id="drill">Extraction drill</button><button id="stairs">Dry stair drill</button><button id="fall">Dry fall drill</button><button id="reset">Reset positions</button><button class="primary" id="play">Start navigation</button></div></header>
  <p id="local-test-status" role="status">Local test preset: original Training43 map and source-bound team; isolated authored full-ammo encounter. Loads paused. Requires the opt-in loopback provider.</p>
  <div class="brief"><div><strong id="level-name"></strong> <span id="source-label"></span></div><div class="badge" id="prototype-label">STATIC NAVIGATION PROTOTYPE</div></div>
  <div class="mission-bar"><span id="mission-objective"></span><span id="mission-progress" role="status"></span><label id="mission-mode-label">Rules <select id="mission-mode" aria-label="Mission rules"><option value="cooperative-extraction">Cooperative extraction</option><option value="first-exit">Original first-exit race</option><option value="navigation">Navigation only</option></select></label><span id="mission-time"></span></div>
  <div id="error" role="alert"></div>
  <div class="stage"><canvas aria-label="Four synchronized game views"></canvas><div class="view-grid">
    ${[0, 1, 2, 3].map(i => `<section class="view" aria-label="Mercenary ${i + 1} viewport"><div class="view-head"><div><span class="player-name" style="color:${['#70ded1', '#f1bf70', '#8eaef5', '#e995b8'][i]}">0${i + 1} / MERCENARY</span><span class="player-sub" id="device-${i}"></span></div><select aria-label="Control mercenary ${i + 1}" id="assign-${i}"></select></div><div class="reticle"></div><div class="extracted" id="extracted-${i}" hidden>EXTRACTED<span>Waiting for the team</span></div><div class="extracted incapacitated" id="dead-${i}" hidden>INCAPACITATED<span>Retry the drill or restore a checkpoint</span></div><div class="view-foot"><span id="position-${i}"></span><span id="fitness-${i}" hidden></span><span id="event-${i}">READY</span></div></section>`).join('')}
  </div><div class="paused" id="pause-overlay"><b>TEAM STANDING BY</b><small>Assign controls, then start navigation</small></div></div>
  <footer><div class="controls"><span><kbd>WASD + Q/E</kbd> · <kbd>IJKL + U/O</kbd> · <kbd>Arrows + ,/.</kbd> · <kbd>Numpad 8456 + 7/9</kbd></span><span><kbd>1–4</kbd> assign WASD to a mercenary · <kbd>Esc</kbd> pause</span></div><div class="recovery"><span id="recovery-status" role="status">Checkpoints restore team state. Reopen the same map or drill first.</span><div class="actions"><button id="save-checkpoint">Save checkpoint</button><label class="file-button">Load checkpoint<input id="checkpoint-file" aria-label="Load navigation checkpoint" type="file" accept=".json"></label></div></div><details><summary>Controls, source and prototype limitations <span id="tick"></span></summary><div id="diagnostics"></div></details></footer>`;

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let level = createDemoLevel(), world = createWorld(level);
let renderer: FourViews | null = null;
let graphicsLost = false;
let paused = true, loading = false, loadGeneration = 0;
let latestPresetGeneration = 0;
let session: TrainingSession | null = null;
let extraDiagnostics = '';
let padInventory = '';
let lastTime = performance.now(), frameMs = 0;
const router = new InputRouter(), clock = new FixedClock(), keys = new Set<string>();
const events: string[] = ['READY', 'READY', 'READY', 'READY'];
const canvas = app.querySelector<HTMLCanvasElement>('canvas')!;
const panes = [...app.querySelectorAll<HTMLElement>('.view')];
const selects = [0, 1, 2, 3].map(i => get<HTMLSelectElement>(`assign-${i}`));
const rosterHost = document.createElement('div');
app.querySelector('footer')!.append(rosterHost);
const sessionInfo = document.createElement('section'); sessionInfo.id = 'training-session';
rosterHost.before(sessionInfo);
const selectedFallButton = document.createElement('button'); selectedFallButton.id = 'selected-fall';
selectedFallButton.textContent = 'Selected-team dry-fall practice (authored)';
get('fall').after(selectedFallButton);
const inventoryHost = document.createElement('section'); inventoryHost.id = 'training-inventory';
sessionInfo.after(inventoryHost);
const inventoryPanel = installTrainingInventoryPanel(inventoryHost, () => paused && !loading && session !== null, async (actor, slot, kind) => {
  if (!paused || loading || !session) throw new Error('Pause an available selected-team session before changing inventory.');
  if (session.inventory.commands.length >= MAX_INVENTORY_COMMANDS) throw new Error('Inventory operation budget exhausted. Retry or Apply a new team to reset.');
  const sources = rosterPanel.sources();
  if (!sources) throw new Error('Open the matching roster and items first.');
  const generation = ++loadGeneration; loading = true; inventoryPanel.refresh(); encounterPanel.refresh();
  try {
    const transfer = kind === 'equip' ? equipTrainingSession : kind === 'exchange' ? exchangeTrainingSession : returnTrainingSession;
    const candidate = await transfer(level, sources, session, actor, slot, paused, world);
    if (generation !== loadGeneration) return;
    // Inventory commands reconstruct only the overlay; retain the current navigation world.
    session = candidate.session; showSession();
    get('recovery-status').textContent = kind === 'exchange' ? `Exchanged equipment with carried slot ${slot + 1} for team slot ${actor + 1}. Session remains paused.` : kind === 'equip' ? `Equipped carried slot ${slot + 1} for team slot ${actor + 1}. Session remains paused.` : `Returned equipment to backpack position ${slot + 1} for team slot ${actor + 1}. Session remains paused.`;
  } finally {
    if (generation === loadGeneration) { loading = false; inventoryPanel.refresh(); encounterPanel.refresh(); rosterPanel.refresh(); }
  }
});
const encounterHost = document.createElement('section'); encounterHost.id = 'training-encounter';
inventoryHost.before(encounterHost);
const encounterPanel = installTrainingEncounterPanel(encounterHost, () => session, () => paused,
  () => !loading && !!session && world.mission.outcome === 'active' && !!renderer && !graphicsLost, encounterCommand);
function encounterCommand(action: EncounterCommand): void {
  if (loading || !session || world.mission.outcome !== 'active' || !renderer || graphicsLost) return;
  const state = session.encounter;
  if (action.kind === 'arm' ? !paused : !state || (action.kind === 'reset' ? !paused : action.kind === 'fire' && paused)) return;
  try {
    if ((action.kind === 'fire' && state && isDead(world, state.actor)) || (action.kind === 'arm' && isDead(world, action.actor))) throw new Error('Incapacitated actors cannot fire. Retry or restore an earlier checkpoint.');
    const encounter = action.kind === 'arm' ? createTrainingEncounter(session.encounterGun, session.indices, action.actor, action.fixture) :
      action.kind === 'fire' ? fireTrainingEncounter(state!, session.encounterGun) :
      action.kind === 'reset' ? resetTrainingEncounter(state!, session.encounterGun, session.indices) : targetTrainingEncounter(state!);
    // One immutable commit includes ammo, counter, damage and target; source inventory is untouched.
    session = Object.freeze({ ...session, encounter }); encounterPanel.refresh();
  } catch (error) { get('error').textContent = errorText(error); }
}
function cancelSessionOperation(): void { ++loadGeneration; loading = false; setPaused(true); }
function showSession(): void {
  sessionInfo.replaceChildren();
  const label = document.createElement('p'); label.id = 'session-status';
  label.textContent = session ? `Standalone imported Training43 session | PAUSED on apply, retry and restore. ${selectedFallLevel(level) ? 'Authored dry-fall geometry; verified selected stats/current inventory weight; adapted incapacitation and occupancy. ' : ''}Paused equip, occupied exchange and return are standalone source-deduced adapters below; authored isolated combat is available below; original world combat and hazards remain unavailable.` : 'No active selected-team session.';
  sessionInfo.append(label);
  inventoryPanel.render(session);
  encounterPanel.refresh();
  for (let i = 0; i < 4; i++) {
    const name = panes[i]!.querySelector<HTMLElement>('.player-name')!;
    name.textContent = `${String(i + 1).padStart(2, '0')} / ${session?.names[i] ?? 'MERCENARY'}`;
    if (!session) continue;
    const actor = session.team.actors[i]!;
    const detail = document.createElement('details'), summary = document.createElement('summary'), data = document.createElement('pre');
    detail.id = `session-actor-${i}`;
    summary.textContent = `Team slot ${i + 1}: ${session.names[i]} | Character ${actor.canonicalIndex + 1} | Fitness ${actor.stats.fitness} | Physique ${actor.stats.physique} | Agility ${actor.stats.agility} | Weight ${actor.weight.totalWeight}`;
    Object.assign(data.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '260px', overflow: 'auto' });
    data.textContent = `Initial source stats: ${JSON.stringify(actor.stats)}\nWeight: ${JSON.stringify(actor.weight)}\nInitial equipment: ${JSON.stringify(actor.inventory.equipped)}\nCarried slots (10 copied, 20 cleared):\n${actor.inventory.carried.map((slot, j) => `${j + 1}: ${slot.itemId} / ${slot.damage} / ${slot.ammo} / ${slot.fourthByte}`).join('\n')}\nSeparate actions: ${JSON.stringify(actor.inventory.actions)}`;
    detail.append(summary, data); sessionInfo.append(detail);
  }
}
function clearSession(): void {
  cancelSessionOperation(); session = null;
  if (selectedFallLevel(level)) installLevel(createDemoLevel());
  else showSession();
}
const rosterPanel = installRosterPanel(rosterHost, () => setPaused(true), {
  available: () => !loading && level.source.kind === 'editor-map' && extractionProfile(level) !== null,
  invalidate: clearSession,
  cancel: cancelSessionOperation,
  apply: async (sources, indices) => {
    cancelSessionOperation(); const generation = loadGeneration; loading = true;
    try {
      const candidate = await createTrainingSession(level, sources, indices);
      if (generation !== loadGeneration) return;
      session = candidate.session; world = candidate.world; events.fill('READY');
      setPaused(true); showSession(); updateHud(readPads());
      get('recovery-status').textContent = 'Selected team applied. Review controls, then Start mission. Session saves require these same local sources.';
    } catch (error) { if (generation === loadGeneration) throw error; }
    finally { if (generation === loadGeneration) { loading = false; rosterPanel.refresh(); inventoryPanel.refresh(); encounterPanel.refresh(); } }
  },
});

get('local-test-preset').addEventListener('click', async () => {
  const generation = ++loadGeneration; latestPresetGeneration = generation; loading = true; setPaused(true); rosterPanel.refresh();
  get('local-test-status').textContent = 'Loading and verifying the local Training43 test…';
  get('error').textContent = '';
  try {
    const [map, roster, items] = await Promise.all([
      fetchLocalTestResource('map', 157738), fetchLocalTestResource('roster', 16320), fetchLocalTestResource('items', 32604),
    ]);
    if (generation !== loadGeneration) return;
    const { level: nextLevel, report } = await importEditorMap(map);
    if (generation !== loadGeneration) return;
    const sources = { roster, items }, indices = [11, 3, 0, 5];
    const [candidate, commitRoster] = await Promise.all([
      createTrainingSession(nextLevel, sources, indices), rosterPanel.prepare(sources, indices),
    ]);
    const encounter = createTrainingEncounter(candidate.session.encounterGun, candidate.session.indices, 0, 'full');
    if (generation !== loadGeneration) return;
    // All asynchronous verification finishes before this synchronous installation.
    const nextRenderer = new FourViews(canvas, panes, nextLevel);
    try { commitRoster(); } catch (error) { nextRenderer.dispose(); throw error; }
    renderer?.dispose(); renderer = nextRenderer; graphicsLost = false;
    level = nextLevel; world = candidate.world;
    session = Object.freeze({ ...candidate.session, encounter });
    extraDiagnostics = `Import report: ${JSON.stringify(report, null, 2)}`;
    events.fill('READY'); loading = false; showSession(); setPaused(true); updateLevelInfo(); updateHud(readPads());
    get('local-test-status').textContent = 'Ready: verified local Training43 map and OCS team (canonical indices 11, 3, 0, 5). Authored full-ammo encounter armed for team slot 1. PAUSED — Start mission, then F to fire; T target, Esc pause, R reset while paused.';
    get('recovery-status').textContent = 'Local test ready. Session saves use this same verified map, roster and items.';
    encounterPanel.select(0, 'full'); get('play').focus();
  } catch (error) {
    if (generation === loadGeneration) get('local-test-status').textContent = `Test not loaded: ${errorText(error)}`;
  } finally {
    if (generation === loadGeneration) { loading = false; rosterPanel.refresh(); inventoryPanel.refresh(); encounterPanel.refresh(); }
    else if (generation === latestPresetGeneration) get('local-test-status').textContent = 'Local test load cancelled by a newer operation. Current map and team retained.';
  }
});

function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function setPaused(value: boolean): void {
  paused = value; keys.clear(); router.reset(); clock.reset();
  updateMissionHud();
  inventoryPanel.refresh(); encounterPanel.refresh();
}
function updateMissionHud(): void {
  selectedFallButton.disabled = loading || !session || selectedFallLevel(level);
  const mission = world.mission, active = mission.rules.mode !== 'navigation', fallDrill = world.physics.mode === 'dry-fall', allDead = teamDead(world), terminal = mission.outcome !== 'active' || allDead;
  const escaped = mission.exited.filter(Boolean).length;
  const play = get<HTMLButtonElement>('play');
  play.disabled = !renderer || graphicsLost || terminal;
  play.textContent = terminal ? allDead ? 'Drill finished' : 'Mission finished' : paused ? active ? 'Start mission' : fallDrill ? 'Start drill' : 'Start navigation' : 'Pause';
  get<HTMLButtonElement>('reset').textContent = active ? 'Retry mission' : fallDrill ? 'Retry drill' : 'Reset positions';
  get('mission-mode-label').hidden = extractionProfile(level) === null;
  get<HTMLSelectElement>('mission-mode').value = mission.rules.mode;
  get('mission-objective').textContent = !active ? fallDrill ? selectedFallLevel(level) ? 'Authored practice: step forward off the ledge. Real selected stats and inventory weight affect landing injury. Lane 4 is a long fall. Retry resets team and inventory.' : 'Step forward off the ledge. Longer falls hurt more; lane 4 is lethal. Synthetic characters / empty inventories.' : level.id === 'synthetic-stairs-v1' ? 'Amber lanes: move forward to climb, backward to descend. Watch Z change from 01 to 02.' : 'Explore the grid. Try the extraction drill for a timed team objective.' : mission.rules.mode === 'cooperative-extraction' ? 'Get all four mercenaries to the glowing exit.' : 'Original training race: the first mercenary to escape wins.';
  get('mission-progress').textContent = active ? `${escaped} / 4 extracted${terminal ? mission.outcome === 'complete' ? ' · COMPLETE' : ' · FAILED' : ''}` : fallDrill ? allDead ? 'PRACTICE EXHAUSTED · Retry or restore' : `${world.physics.mode === 'dry-fall' ? world.physics.actors.filter(a=>a.dead).length : 0} / 4 incapacitated` : '';
  get('prototype-label').textContent = selectedFallLevel(level) ? 'AUTHORED PRACTICE / VERIFIED TEAM' : session ? 'STANDALONE IMPORTED SESSION' : active ? 'EXTRACTION PROTOTYPE' : fallDrill ? 'DRY FALL PROTOTYPE' : 'STATIC NAVIGATION PROTOTYPE';
  let time = '';
  if (mission.clock) {
    const units = mission.clock.tens * 10 + mission.clock.units;
    const seconds = Math.ceil((units ? (units - 1) * 601 + mission.clock.subticks + 1 : 0) / 50);
    time = `TIME ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  get('mission-time').textContent = time;
  const overlay = get('pause-overlay'); overlay.hidden = !paused && !terminal;
  overlay.querySelector('b')!.textContent = allDead ? 'TEAM INCAPACITATED' : mission.outcome === 'failed' ? 'TIME EXPIRED' : mission.outcome === 'complete' ? mission.winner === null ? 'TEAM EXTRACTED' : `MERCENARY ${mission.winner + 1} WINS` : 'TEAM STANDING BY';
  overlay.querySelector('small')!.textContent = terminal ? 'Retry or load an earlier checkpoint' : 'Assign controls, then start';
  for (let i = 0; i < 4; i++) {
    get(`dead-${i}`).hidden = world.physics.mode !== 'dry-fall' || !world.physics.actors[i]!.dead;
    get(`extracted-${i}`).hidden = !mission.exited[i];
    get(`extracted-${i}`).querySelector('span')!.textContent = terminal ? mission.outcome === 'complete' ? 'Extraction complete' : 'Mission timed out' : 'Waiting for the team';
  }
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
    const fitness = get(`fitness-${i}`); fitness.hidden = world.physics.mode !== 'dry-fall';
    fitness.textContent = world.physics.mode === 'dry-fall' ? `FIT ${Math.floor(world.physics.actors[i]!.fitness / 655)}%${selectedFallLevel(level) ? ` · ${world.physics.actors[i]!.fitness} · FALL ${world.physics.actors[i]!.fallDamage} · WT ${world.physics.actors[i]!.weight}` : ''}` : '';
    const pad = source?.kind === 'gamepad' ? pads.find(pad => pad.index === source.index && pad.id === source.id && pad.connected) : null;
    get(`device-${i}`).textContent = !source ? 'UNASSIGNED' : source.kind === 'keyboard' ? `KEYBOARD ${String.fromCharCode(65 + source.index)}` : pad?.mapping === 'standard' ? `PAD ${source.index + 1} CONNECTED` : 'PAD DISCONNECTED / CHECK ASSIGNMENT';
  }
  get('tick').textContent = `· tick ${world.tick} · ${frameMs.toFixed(1)} ms/frame`;
  updateMissionHud();
}
function updateLevelInfo(): void {
  get('level-name').textContent = extractionProfile(level)?.title ?? (level.name || 'Untitled editor map');
  get('source-label').textContent = level.source.kind === 'synthetic' ? '/ newly authored test geometry' : '/ local editor revision · not a validated mission';
  get('diagnostics').textContent = [
    'Keyboard: forward/back, strafe left/right; Q/E, U/O, comma/period or numpad 7/9 turn. Numbers 1–4 move keyboard A assignment. Keyboard rollover depends on hardware.',
    'Standard gamepads: left stick or D-pad moves/turns; shoulder buttons strafe. Assign each pad above. Press a pad button if the browser has not exposed it yet. Non-standard mappings require future remapping support.',
    'Disconnect stops that controller. Matching index and device ID can reconnect; otherwise reassign. Four physical controllers on the event PC/TV have NOT been tested.',
    '50 Hz prototype clock; movement repeats at 160 ms while held. Dry directional stairs and bounded static support (stone/stairs below or tree two levels below). Amber blocks mark stairs; shapes remain placeholders. Dry gravity and fitness damage are restricted to the synthetic fall drill. Other maps block drops. Selected-team sessions additionally expose paused source inventory and an isolated authored gun encounter below. No dynamic world objects, enemy combat, sound or campaign travel. Water, pressure pads and lifts remain blocked. Unsafe drops and hazard cells are blocked. This is not original timing/behaviour parity. Checkpoints preserve positions, mission state, tick and RNG; they require the exact same map and do not save device assignments.',
    'Mission support is restricted to the exact verified Training43 editor revision and the newly authored extraction drill. Moving into a type-3 exit block retires that mercenary. Cooperative extraction requires all four; Original first-exit race preserves the alive-player source success rule. Source countdown counters borrow after 601 logical ticks. The UI converts this prototype 50 Hz clock to time; original wall-clock parity has not been verified. Unsupported original areas remain blocked, so this proves an extraction route rather than the complete original level.',
    'Dry fall drill: authored empty-inventory profiles, physique/agility 100 and fitness 65535. Source-derived integer damage, first gravity pulse at tick 7 then every 6 ticks, landing damage on the next pulse. No water, actor squash, inventory damage or corpse mutation. This is not an original roster or runtime-parity claim.',
    `Source: ${level.source.revision}; SHA-256: ${level.source.sha256 ?? 'synthetic'}`,
    `Unsupported source mechanics: ${level.unsupportedMechanics.join('; ') || 'none detected, mission behaviour not validated'}`,
    extraDiagnostics,
  ].filter(Boolean).join('\n\n');
}
function installLevel(nextLevel: LevelData, diagnostics = ''): void {
  const nextWorld = createWorld(nextLevel); // Validate before replacing the current working level.
  setPaused(true); session = null; showSession();
  renderer?.dispose(); renderer = null;
  try { renderer = new FourViews(canvas, panes, nextLevel); graphicsLost = false; }
  catch (error) { get<HTMLButtonElement>('play').disabled = true; throw new Error(`WebGL2 unavailable: ${errorText(error)}`); }
  level = nextLevel; world = nextWorld; extraDiagnostics = diagnostics;
  events.fill('READY'); setPaused(true); updateLevelInfo(); updateHud(readPads());
  get<HTMLButtonElement>('play').disabled = false;
  get('recovery-status').textContent = 'Checkpoints restore team state. Reopen the same map or drill first.';
  rosterPanel.refresh();
}
get<HTMLButtonElement>('play').addEventListener('click', () => { if (!loading && renderer) setPaused(!paused); });
get<HTMLButtonElement>('reset').addEventListener('click', () => {
  loadGeneration++; loading = false;
  if (session) session = resetTrainingInventory(session);
  world = createWorld(level, undefined, world.mission.rules, session && selectedFallLevel(level) ? selectedFallProfile(session) : undefined);
  if (session) showSession();
  events.fill('READY'); get('error').textContent = ''; setPaused(true);
  rosterPanel.refresh();
  get('recovery-status').textContent = 'Positions reset. Saved checkpoints remain available.';
});
get<HTMLButtonElement>('demo').addEventListener('click', () => {
  loadGeneration++; loading = false; get('error').textContent = '';
  try { installLevel(createDemoLevel()); } catch (error) { get('error').textContent = errorText(error); }
});
get<HTMLButtonElement>('drill').addEventListener('click', () => {
  loadGeneration++; loading = false; get('error').textContent = '';
  try { installLevel(createExtractionDemo()); } catch (error) { get('error').textContent = errorText(error); }
});
get<HTMLButtonElement>('stairs').addEventListener('click', () => {
  loadGeneration++; loading = false; get('error').textContent = '';
  try { installLevel(createStairsDemo()); } catch (error) { get('error').textContent = errorText(error); }
});
get<HTMLButtonElement>('fall').addEventListener('click', () => {
  loadGeneration++; loading = false; get('error').textContent = '';
  try { installLevel(createFallDemo()); } catch (error) { get('error').textContent = errorText(error); }
});
selectedFallButton.addEventListener('click', async () => {
  if (loading || !session) return;
  const sources = rosterPanel.sources(); if (!sources) return;
  const current = session, nextLevel = createSelectedFallLevel();
  const generation = ++loadGeneration; loading = true; setPaused(true); get('error').textContent = '';
  try {
    const candidate = await createTrainingSession(nextLevel, sources, current.indices, current.inventory.commands);
    if (generation !== loadGeneration) return;
    const nextRenderer = new FourViews(canvas, panes, nextLevel);
    renderer?.dispose(); renderer = nextRenderer; graphicsLost = false;
    level = nextLevel; world = candidate.world; session = Object.freeze({...candidate.session, encounter:current.encounter});
    extraDiagnostics = 'Authored selected-dry-fall-v1 geometry; not the original Training43 map or original actor lifecycle. Sources rehashed before installation.';
    events.fill('READY'); showSession(); updateLevelInfo(); updateHud(readPads());
    get('recovery-status').textContent = 'Selected-team authored practice ready, PAUSED. Start drill, step forward; Esc pause. Retry drill resets positions, health, inventory and encounter.';
    get('play').focus();
  } catch (error) { if (generation === loadGeneration) get('error').textContent = errorText(error); }
  finally { if (generation === loadGeneration) { loading = false; setPaused(true); rosterPanel.refresh(); } }
});
get<HTMLSelectElement>('mission-mode').addEventListener('change', event => {
  const mode = (event.currentTarget as HTMLSelectElement).value as MissionMode;
  try {
    const next = createWorld(level, undefined, missionRulesForLevel(level, mode));
    loadGeneration++; loading = false; world = next;
    if (session) { session = resetTrainingInventory(session); showSession(); }
    events.fill('READY'); get('error').textContent = ''; setPaused(true);
    rosterPanel.refresh();
    get('recovery-status').textContent = 'Rules changed. Mission restarted; saved checkpoints retain their own rules.';
  } catch (error) { get('error').textContent = errorText(error); }
  (event.currentTarget as HTMLSelectElement).blur();
});
get<HTMLInputElement>('map-file').addEventListener('change', async event => {
  const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
  if (!file) return;
  clearSession();
  const generation = ++loadGeneration; loading = true; setPaused(true); rosterPanel.refresh(); get('error').textContent = '';
  try {
    if (file.size !== 157738) throw new Error('Expected a 157,738-byte raw editor .map file. Packed/runtime maps are not supported.');
    const { level: imported, report } = await importEditorMap(new Uint8Array(await file.arrayBuffer()));
    if (generation !== loadGeneration) return;
    installLevel(imported, `Import report: ${JSON.stringify(report, null, 2)}`);
    loading = false; rosterPanel.refresh(); inventoryPanel.refresh(); encounterPanel.refresh();
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Map not loaded: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) { loading = false; rosterPanel.refresh(); inventoryPanel.refresh(); encounterPanel.refresh(); } }
});

get<HTMLButtonElement>('save-checkpoint').addEventListener('click', async () => {
  if (loading) return;
  const generation = ++loadGeneration; setPaused(true); loading = true; get('error').textContent = '';
  try {
    const sources = rosterPanel.sources();
    if (session && !sources) throw new Error('Reopen the matching roster and items before saving this session.');
    const json = session ? await exportTrainingSession(level, world, session, sources!) : await exportCheckpoint(level, world);
    if (generation !== loadGeneration) return;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `hired-guns-checkpoint-${world.tick}.json`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    get('recovery-status').textContent = `Checkpoint exported at tick ${world.tick}. ${session ? 'Keep the same local map, roster and items for session recovery.' : 'Keep the same source map for recovery.'}`;
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Checkpoint not saved: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) { loading = false; rosterPanel.refresh(); inventoryPanel.refresh(); encounterPanel.refresh(); } }
});
get<HTMLInputElement>('checkpoint-file').addEventListener('change', async event => {
  const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; input.value = '';
  if (!file) return;
  const generation = ++loadGeneration; loading = true; setPaused(true); get('error').textContent = '';
  try {
    if (file.size >= MAX_SESSION_BYTES) throw new Error('Session save must be smaller than 24 KiB.');
    const json = await file.text();
    if (generation !== loadGeneration) return;
    let restoredSession: TrainingSession | null = null;
    let restored;
    if (isTrainingSessionSave(json)) {
      const sources = rosterPanel.sources();
      if (!sources) throw new Error('Open the matching verified OCS roster and item table before restoring a session.');
      const candidate = await importTrainingSession(level, sources, json);
      restoredSession = candidate.session; restored = candidate.world;
    } else {
      if (session) throw new Error('An active selected team requires a Training43 session save. Clear the session by opening a map before loading a legacy checkpoint.');
      if (file.size >= MAX_CHECKPOINT_BYTES) throw new Error('Checkpoint must be smaller than 16 KiB.');
      restored = await importCheckpoint(level, json);
    }
    if (generation !== loadGeneration) return;
    session = restoredSession; world = restored; showSession(); events.fill('RESTORED'); updateHud(readPads());
    get('recovery-status').textContent = `Checkpoint restored at tick ${world.tick}. ${teamDead(world) ? 'Retry the drill to start again.' : world.physics.mode === 'dry-fall' ? 'Review controls, then start drill.' : world.mission.outcome !== 'active' ? 'Use Retry mission to start again.' : world.mission.rules.mode === 'navigation' ? 'Review controls, then start navigation.' : 'Review controls, then start mission.'}`;
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Checkpoint not loaded: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) { loading = false; rosterPanel.refresh(); inventoryPanel.refresh(); encounterPanel.refresh(); } }
});

const allKeys = new Set(KEY_GROUPS.flatMap(group => group.map(([key]) => key)));
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (target.matches('input,select,textarea') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'Escape') { setPaused(true); event.preventDefault(); return; }
  if (['KeyF', 'KeyT', 'KeyR'].includes(event.code)) {
    event.preventDefault();
    if (!event.repeat) encounterCommand({ kind: event.code === 'KeyF' ? 'fire' : event.code === 'KeyT' ? 'target' : 'reset' });
    return;
  }
  if (/^Digit[1-4]$/.test(event.code)) {
    router.assign(Number(event.code.slice(-1)) - 1, { kind: 'keyboard', index: 0 }); keys.clear(); refreshAssignments(readPads(), true); event.preventDefault(); return;
  }
  if (allKeys.has(event.code)) { event.preventDefault(); if (!paused) keys.add(event.code); }
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); graphicsLost = true; setPaused(true); get('error').textContent = 'Graphics context lost. Reload the page to recover.'; });

function frame(now: number): void {
  const elapsed = Math.max(0, now - lastTime); lastTime = now; frameMs += (elapsed - frameMs) * 0.05;
  const pads = readPads(); refreshAssignments(pads);
  if (!paused && !loading) {
    try { clock.advance(elapsed, () => {
      const previousTick = world.tick;
      const result = stepWorld(level, world, router.commands(world.tick, keys, pads)); world = result.world;
      if (world.tick !== previousTick && session?.encounter) session = Object.freeze({ ...session, encounter: tickTrainingEncounter(session.encounter) });
      result.events.forEach((event: SimulationEvent) => { events[event.mercenaryId] = event.kind === 'blocked' ? `BLOCKED: ${event.reason}`.toUpperCase() : event.kind.toUpperCase(); });
    }); } catch (error) { setPaused(true); get('error').textContent = errorText(error); }
    if (world.mission.outcome !== 'active' || teamDead(world)) setPaused(true);
  }
  inventoryPanel.refresh(); encounterPanel.refresh();
  renderer?.render(world, elapsed); updateHud(pads); requestAnimationFrame(frame);
}
try { installLevel(level); } catch (error) { get('error').textContent = errorText(error); }
refreshAssignments(readPads(), true); requestAnimationFrame(frame);
