import { activateWetParty, stepWetParty } from './sim/training-wet-party';
import { hasOwnWetParty, installTrainingWetPartyPanel } from './training-wet-party-panel';
import { activateWetLifecycle, stepWetLifecycle } from './sim/training-wet-lifecycle';
import { activateWetRegion, stepWetRegion } from './sim/training-wet-region';
import { installTrainingWetRegionPanel } from './training-wet-region-panel';
import { installTrainingWetLifecyclePanel } from './training-wet-lifecycle-panel';
import { activateWet, stepWet } from './sim/training-wet';
import { installTrainingWetPanel } from './training-wet-panel';
import { installTrainingConsumablePanel, type ConsumableOperationResult } from './training-consumable-panel';
import { createConsumableSession, changeConsumableSession } from './sim/training-session';
import { stepConsumables } from './sim/training-consumables';
import { installTrainingDoorPanel, type DoorSetupResult } from './training-door-panel';
import { createMovingDoorSession, createPressurePadSession } from './sim/training-session';
import { createMovingDoorLevel, createPressurePadLevel } from './world/training-gate';
import type { DoorAction } from './world/training-moving-door';
import { effectivePatrolLevel } from './world/training-patrol';
import { createPatrolMissionLevel, patrolMissionLevel } from './world/training-gate';
import { createPatrolMissionSession } from './sim/training-session';
import { installTrainingPatrolPanel } from './training-patrol-panel';
import { createPatrolTrainingSession, commandPatrolEncounter } from './sim/training-session';
import { installTrainingGatePanel } from './training-gate-panel';
import { createTrainingGateLevel, gateLevel } from './world/training-gate';
import { advanceGateTrainingSession, createGateTrainingSession } from './sim/training-session';
import { installTrainingGroundPanel } from './training-ground-panel';
import { activateTrainingGround, transferTrainingGround, recordTrainingGroundStep } from './sim/training-session';
import './styles.css';
import './style.css';
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
// Presentation hierarchy only: existing controls retain their handlers and identities.
const headerActions = app.querySelector<HTMLElement>('header .actions')!;
const setup = document.createElement('section'); setup.className = 'test-card'; setup.id = 'test-setup';
setup.innerHTML = '<h2>1. Setup</h2><p>Load the verified local test to try firing with a ready team. It opens paused.</p>';
app.querySelector('header')!.after(setup);
setup.append(get('local-test-preset'), get('local-test-status'));
const testControls = document.createElement('section'); testControls.className = 'test-card'; testControls.id = 'test-controls';
testControls.innerHTML = '<h2>2. Choose and start a test</h2><p>Training43 includes an isolated authored gun encounter. Other scenarios test navigation, extraction, stairs or falling.</p><div id="scenario-actions" class="actions"></div><div class="actions" id="run-actions"><span id="run-state" role="status"></span></div>';
setup.after(testControls);
get('scenario-actions').append(get('demo'), get('drill'), get('stairs'), get('fall'));
get('run-actions').append(get('play'), get('reset'));
const manual = document.createElement('details'); manual.id = 'manual-setup';
manual.innerHTML = '<summary>Advanced test tools: manual map setup</summary>';
manual.append(get('map-file').closest('label')!); setup.append(manual); headerActions.remove();
const live = document.createElement('section'); live.className = 'test-card'; live.id = 'live-test';
live.innerHTML = '<h2>3. Live test display</h2><p>Movement: W/S forward/back, A/D sidestep, Q/E turn. 1–4 selects the mercenary for WASD. Esc pauses.</p>';
testControls.after(live);
live.append(app.querySelector('.brief')!, app.querySelector('.mission-bar')!, get('error'), app.querySelector('.stage')!);
get('level-name').before(document.createTextNode('Active scenario: '));
const tools = document.createElement('details'); tools.id = 'inventory-tools';
tools.innerHTML = '<summary>Inventory &amp; equipment</summary><h2>Current team inventory</h2><p>Pause to equip, exchange or return equipment. These actions affect current team weight.</p>';
app.querySelector('footer')!.prepend(tools);
const sourceDetails = document.createElement('details'); sourceDetails.id = 'session-diagnostics';
sourceDetails.innerHTML = '<summary>Advanced diagnostics: team source state</summary>';
tools.after(sourceDetails);
app.querySelector('footer > details:last-child > summary')!.firstChild!.textContent = 'Advanced diagnostics: controls, source and limitations ';
let level = createDemoLevel(), world = createWorld(level);
let renderer: FourViews | null = null;
let graphicsLost = false;
let paused = true, loading = false, loadGeneration = 0;
let latestPresetGeneration = 0;
let session: TrainingSession | null = null;
let importedMapBytes: Uint8Array | undefined;
const sessionSources = () => { const raw=rosterPanel.sources();return raw ? {...raw,map:importedMapBytes} : null; };
let pendingGateActor: number | null = null;
let pendingDoorAction: DoorAction = 16;
const activationKeys = new Set<string>();
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
sourceDetails.append(sessionInfo);
const selectedFallButton = document.createElement('button'); selectedFallButton.id = 'selected-fall';
selectedFallButton.textContent = 'Selected-team dry-fall practice (authored)';
get('fall').after(selectedFallButton);
const inventoryHost = document.createElement('section'); inventoryHost.id = 'training-inventory';
tools.append(inventoryHost);
const inventoryPanel = installTrainingInventoryPanel(inventoryHost, () => paused && !loading && session !== null && !session.wet, async (actor, slot, kind) => {
  if (!paused || loading || !session) throw new Error('Pause an available selected-team session before changing inventory.');
  if (session.inventory.commands.length >= MAX_INVENTORY_COMMANDS) throw new Error('Inventory operation budget exhausted. Retry or Apply a new team to reset.');
  const sources = sessionSources();
  if (!sources) throw new Error('Open the matching roster and items first.');
  const generation = ++loadGeneration; loading = true; inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh();
  try {
    const transfer = kind === 'equip' ? equipTrainingSession : kind === 'exchange' ? exchangeTrainingSession : returnTrainingSession;
    const candidate = await transfer(level, sources, session, actor, slot, paused, world);
    if (generation !== loadGeneration) return;
    // Install the verified inventory and world together (v14 also binds live health/weight).
    session = candidate.session; world = candidate.world; showSession();
    get('recovery-status').textContent = kind === 'exchange' ? `Exchanged equipment with carried slot ${slot + 1} for team slot ${actor + 1}. Session remains paused.` : kind === 'equip' ? `Equipped carried slot ${slot + 1} for team slot ${actor + 1}. Session remains paused.` : `Returned equipment to backpack position ${slot + 1} for team slot ${actor + 1}. Session remains paused.`;
  } finally {
    if (generation === loadGeneration) { loading = false; inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); rosterPanel.refresh(); }
  }
});
const consumableHost=document.createElement('section');consumableHost.id='training-consumables';consumableHost.style.gridColumn='1 / -1';
live.querySelector('h2')!.after(consumableHost);
const consumablePanel=installTrainingConsumablePanel(consumableHost,()=>({session,world,paused,loading,canSetup:!!session&&selectedFallLevel(level)&&!session.consumables&&!session.inventory.commands.length&&!session.gate&&!session.ground}),() => runConsumableOperation(), actor => runConsumableOperation(actor));
async function runConsumableOperation(actor?: number): Promise<ConsumableOperationResult> {
 let generation=loadGeneration;
 let started=false;
 const isCurrent=()=>generation===loadGeneration;
 try {
  if(loading||!session)throw Error('Selected-team practice is not ready.');
  if(actor!==undefined&&!session.consumables)throw Error('Start the consumable extension first.');
  const sources=sessionSources();if(!sources)throw Error('Open matching roster and items first.');
  if(actor!==undefined&&!paused)throw Error('PAUSED required: Esc before using an equipped item.');
  generation=++loadGeneration;started=true;loading=true;setPaused(true);
  const candidate=actor===undefined?await createConsumableSession(level,sources,session):await changeConsumableSession(level,sources,session,world,{kind:'use',actor},paused);
  if(!isCurrent())return {status:'cancelled',isCurrent};
  session=candidate.session;world=candidate.world;showSession();setPaused(true);
  if(actor===undefined)get('recovery-status').textContent='Consumable extension installed, PAUSED.';
  return {status:'installed',isCurrent};
 }catch(error){
  return isCurrent()?{status:'failed',error,isCurrent}:{status:'cancelled',isCurrent};
 }finally{if(started&&isCurrent()){loading=false;setPaused(true);rosterPanel.refresh();}}
}

const wetHost=document.createElement('section');wetHost.id='training-wet';get('scenario-actions').before(wetHost);
const wetPanel=installTrainingWetPanel(wetHost,()=>({session,world,paused,loading,canSetup:!!session&&level.source.kind==='editor-map'&&!session.wet&&!session.ground&&!session.gate&&!session.consumables&&!session.inventory.commands.length&&world.tick===0}),async()=>{
 let generation=loadGeneration;let started=false;const isCurrent=()=>generation===loadGeneration;
 try{if(loading||!session)throw Error('Load the ready-to-play Training43 team first.');const raw=sessionSources();if(!raw)throw Error('Raw sources required.');generation=++loadGeneration;started=true;loading=true;setPaused(true);
 const candidate=await activateWet(level,raw,session,world,paused);if(!isCurrent())return {status:'cancelled',isCurrent};session=candidate.session;world=candidate.world;showSession();setPaused(true);return {status:'installed',isCurrent};
 }catch(error){return isCurrent()?{status:'failed',error,isCurrent}:{status:'cancelled',isCurrent};}finally{if(started&&isCurrent()){loading=false;setPaused(true);rosterPanel.refresh();}}
});
const lifecycleHost=document.createElement('section');lifecycleHost.id='training-wet-lifecycle';wetHost.after(lifecycleHost);
const regionHost=document.createElement('section');regionHost.id='training-wet-region';wetHost.before(regionHost);
const regionPanel=installTrainingWetRegionPanel(regionHost,()=>({session,world,paused,loading,canSetup:!!session&&level.source.kind==='editor-map'&&!session.wet&&!session.ground&&!session.gate&&!session.consumables&&!session.inventory.commands.length&&world.tick===0}),async()=>{
 let generation=loadGeneration;let started=false;const isCurrent=()=>generation===loadGeneration;
 try{if(loading||!session)throw Error('Load the fresh ready-to-play Training43 team first.');const raw=sessionSources();if(!raw)throw Error('Raw sources required.');generation=++loadGeneration;started=true;loading=true;setPaused(true);
 const candidate=await activateWetRegion(level,raw,session,world,paused);if(!isCurrent())return {status:'cancelled',isCurrent};session=candidate.session;world=candidate.world;showSession();setPaused(true);return {status:'installed',isCurrent};
 }catch(error){return isCurrent()?{status:'failed',error,isCurrent}:{status:'cancelled',isCurrent};}finally{if(started&&isCurrent()){loading=false;setPaused(true);rosterPanel.refresh();}}
});
const partyHost=document.createElement('section');partyHost.id='training-wet-party';wetHost.before(partyHost);
const partyPanel=installTrainingWetPartyPanel(partyHost,()=>({session,world,paused,loading,canSetup:!!session&&level.source.kind==='editor-map'&&!session.wet&&!session.ground&&!session.gate&&!session.consumables&&!session.inventory.commands.length&&world.tick===0}),async()=>{
 let generation=loadGeneration;let started=false;const isCurrent=()=>generation===loadGeneration;
 try{if(loading||!session)throw Error('Load the fresh selected Training43 team first.');const raw=sessionSources();if(!raw)throw Error('Raw sources required.');generation=++loadGeneration;started=true;loading=true;setPaused(true);
 const candidate=await activateWetParty(level,raw,session,world,paused);if(!isCurrent())return {status:'cancelled',isCurrent};session=candidate.session;world=candidate.world;showSession();setPaused(true);return {status:'installed',isCurrent};
 }catch(error){return isCurrent()?{status:'failed',error,isCurrent}:{status:'cancelled',isCurrent};}finally{if(started&&isCurrent()){loading=false;setPaused(true);rosterPanel.refresh();}}
});
const lifecyclePanel=installTrainingWetLifecyclePanel(lifecycleHost,()=>({session,world,paused,loading,canSetup:!!session&&level.source.kind==='editor-map'&&!session.wet&&!session.ground&&!session.gate&&!session.consumables&&!session.inventory.commands.length&&world.tick===0}),async()=>{
 let generation=loadGeneration;let started=false;const isCurrent=()=>generation===loadGeneration;
 try{if(loading||!session)throw Error('Load the fresh ready-to-play Training43 team first.');const raw=sessionSources();if(!raw)throw Error('Raw sources required.');generation=++loadGeneration;started=true;loading=true;setPaused(true);
 const candidate=await activateWetLifecycle(level,raw,session,world,paused);if(!isCurrent())return {status:'cancelled',isCurrent};session=candidate.session;world=candidate.world;showSession();setPaused(true);return {status:'installed',isCurrent};
 }catch(error){return isCurrent()?{status:'failed',error,isCurrent}:{status:'cancelled',isCurrent};}finally{if(started&&isCurrent()){loading=false;setPaused(true);rosterPanel.refresh();}}
});
const encounterHost = document.createElement('section'); encounterHost.id = 'training-encounter';
live.querySelector('h2')!.after(encounterHost);
const display = document.createElement('div'); display.className = 'test-display';
for (const child of [...live.children]) if (child !== encounterHost && child !== consumableHost && child.tagName !== 'H2') display.append(child);
live.append(display);
const encounterPanel = installTrainingEncounterPanel(encounterHost, () => session, () => paused,
  () => !loading && !!session && world.mission.outcome === 'active' && !!renderer && !graphicsLost,
  index => isDead(world, index), encounterCommand);
// The reusable encounter panel refreshes after its own button handlers. Apply
// patrol readiness again on bubbling clicks before the next animation frame.
encounterHost.addEventListener('click', refreshEncounterPanel);
function refreshEncounterPanel(): void {
  encounterPanel.refresh();
  encounterHost.hidden=!session || !!session.consumables || !!session.wet;
  const patrolActive = !!session?.patrol;
  if(session?.consumables || session?.wet) for(const control of encounterHost.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select'))control.disabled=true;
  for (const kind of ['arm','reset']) if (patrolActive) encounterHost.querySelector<HTMLButtonElement>(`[data-command="${kind}"]`)!.disabled = true;
  encounterHost.querySelector('h3')!.textContent = patrolActive ? 'Combat test · designated patrol target' : 'Combat test · isolated authored gun encounter';
  encounterHost.querySelector<HTMLElement>('#encounter-help')!.textContent = patrolActive ? 'F: designate the patrol target once per press while running. T: deliberate miss toggle. Esc: pause. Retry resets the entire scenario.' : 'F: fire once per press while running. T: change target while running or paused. R: reset this authored loadout while paused. Esc: pause.';
  if (patrolActive) for (const select of encounterHost.querySelectorAll<HTMLSelectElement>('select')) select.disabled = true;
  encounterHost.querySelector('p')!.textContent = patrolActive ? 'F designates the patrol target regardless of route position; T chooses a deliberate miss. This uses the existing separate ammo loadout from team inventory.' : 'Fire at the authored dummy or choose a deliberate miss. This test uses a separate ammo loadout from team inventory.';
  if (patrolActive) {
    encounterHost.querySelector<HTMLElement>('#encounter-arm-readiness')!.textContent = 'Patrol actor and loadout are fixed. Retry resets the whole scenario.';
    const readiness = encounterHost.querySelector<HTMLElement>('#encounter-readiness')!;
    readiness.textContent = readiness.textContent!.replace('reset is available.','Retry resets the scenario.').replace('Pause, then reset or arm a full magazine.','Retry resets the scenario.');
  }
  const scope = encounterHost.querySelector<HTMLElement>('details p')!;
  scope.textContent = patrolActive ? 'Source-derived gun/ammo/damage arithmetic. F designates the patrol target regardless of position; T chooses miss. Authored saturating health zero defeats this target and releases its occupancy. Accuracy is retained source state, not a hit probability. Cooldown uses accepted world ticks. Retry resets the whole scenario.' : 'Source-derived gun/ammo/damage arithmetic; dummy/miss selection and saturating dummy health are authored policy. Zero dummy health has no actor death or occupancy effect. Accuracy is retained source state, not a hit probability. Cooldown decreases one unit per accepted 50 Hz tick; pause freezes it. Retry resets the authored baseline and team inventory replay.';
}
function encounterCommand(action: EncounterCommand): void {
  if (session?.wet || session?.consumables || loading || !session || world.mission.outcome !== 'active' || !renderer || graphicsLost) return;
  const state = session.encounter;
  if (action.kind === 'arm' ? !paused : !state || (action.kind === 'reset' ? !paused : action.kind === 'fire' && paused)) return;
  try {
    if ((action.kind === 'fire' && state && isDead(world, state.actor)) || (action.kind === 'arm' && isDead(world, action.actor))) throw new Error('Incapacitated actors cannot fire. Retry or restore an earlier checkpoint.');
    if (session.patrol) {
      if (action.kind === 'arm' || action.kind === 'reset') throw new Error('Use Retry to reset the entire patrol scenario.');
      const next = commandPatrolEncounter(level,session,world,action.kind,paused);
      replaceGateRenderer(next); session = next;
      encounterPanel.feedback(action.kind,state,session.encounter!); refreshEncounterPanel(); patrolPanel.refresh(); doorPanel.refresh(); return;
    }
    const encounter = action.kind === 'arm' ? createTrainingEncounter(session.encounterGun, session.indices, action.actor, action.fixture) :
      action.kind === 'fire' ? fireTrainingEncounter(state!, session.encounterGun) :
      action.kind === 'reset' ? resetTrainingEncounter(state!, session.encounterGun, session.indices) : targetTrainingEncounter(state!);
    // One immutable commit includes ammo, counter, damage and target; source inventory is untouched.
    session = Object.freeze({ ...session, encounter }); encounterPanel.feedback(action.kind, state, encounter); refreshEncounterPanel();
  } catch (error) { get('error').textContent = errorText(error); }
}
const groundHost = document.createElement('section'); groundHost.id = 'training-ground';
groundHost.style.gridColumn = '1 / -1';
live.append(groundHost);
const groundPanel = installTrainingGroundPanel(groundHost, () => session, () => world,
  () => !session?.gate && !loading && !!session && !!renderer && !graphicsLost && world.mission.outcome === 'active', () => paused,
  async (actor, groundId, slot, transfer) => {
    if (!session || loading) return;
    const sources = sessionSources();
    if (!sources) throw new Error('Open matching raw roster and items first.');
    const generation = ++loadGeneration; loading = true; inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh();
    try {
      const candidate = transfer ? await transferTrainingGround(level, sources, session, world, actor, groundId, slot, transfer, paused) : await activateTrainingGround(level, sources, session, world, paused);
      if (generation !== loadGeneration) throw new Error('Cancelled by a newer operation; working state retained.');
      session = candidate.session; world = candidate.world; showSession();
    } finally {
      if (generation === loadGeneration) { loading = false; inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); rosterPanel.refresh(); }
    }
  });
const gateHost = document.createElement('section'); gateHost.id = 'training-gate'; gateHost.style.gridColumn = '1 / -1'; live.insertBefore(gateHost,groundHost);
const gatePanel = installTrainingGatePanel(gateHost, () => session, () => world, () => level,
  () => !loading && !!session && !!renderer && !graphicsLost && world.mission.outcome === 'active', () => paused,
  async () => {
    if (loading || !paused || !session) throw new Error('Pause an available selected team first.');
    const sources = sessionSources(); if (!sources) throw new Error('Open matching raw roster and items.');
    const current = session, generation = ++loadGeneration; loading = true; setPaused(true);
    try {
      const candidate = await createGateTrainingSession(sources,current,level);
      if (generation !== loadGeneration) throw new Error('Cancelled by a newer operation; working state retained.');
      const nextLevel = createTrainingGateLevel();
      replaceGateRenderer(candidate.session,nextLevel);
      level = nextLevel; world = candidate.world; session = candidate.session;
      events.fill('READY'); showSession(); updateLevelInfo(); updateHud(readPads()); get('play').focus();
    } finally { if (generation === loadGeneration) {loading = false; setPaused(true); rosterPanel.refresh();} }
  });
const challengeButton = document.createElement('button'); challengeButton.id = 'author-patrol-mission'; challengeButton.textContent = 'Start authored patrol extraction challenge';
get('scenario-actions').append(challengeButton);
challengeButton.addEventListener('click', async () => {
  if (loading || !session || !renderer || graphicsLost) return;
  const sources = sessionSources(); if (!sources) return;
  const current = session, generation = ++loadGeneration; loading = true; setPaused(true);
  try {
    const candidate = await createPatrolMissionSession(sources,current);
    if (generation !== loadGeneration) return;
    const nextLevel = createPatrolMissionLevel(); replaceGateRenderer(candidate.session,nextLevel);
    level = nextLevel; session = candidate.session; world = candidate.world; events.fill('READY');
    showSession(); updateLevelInfo(); updateHud(readPads()); get('play').focus();
  } catch(error) { if (generation === loadGeneration) get('error').textContent = errorText(error); }
  finally { if (generation === loadGeneration) { loading = false; setPaused(true); rosterPanel.refresh(); } }
});
const patrolHost = document.createElement('section'); patrolHost.id = 'training-patrol'; patrolHost.style.gridColumn = '1 / -1'; gateHost.after(patrolHost);
const patrolPanel = installTrainingPatrolPanel(patrolHost,() => session,() => world,() => level,
  () => !loading && !!renderer && !graphicsLost && world.mission.outcome === 'active',() => paused,async () => {
    if (loading || !session) throw new Error('Selected team unavailable.');
    const sources = sessionSources(); if (!sources) throw new Error('Open matching raw sources.');
    const current = session, saved = world, generation = ++loadGeneration; loading = true; setPaused(true);
    try {
      const candidate = await createPatrolTrainingSession(level,sources,current,saved,paused);
      if (generation !== loadGeneration) throw new Error('Cancelled by a newer operation; working state retained.');
      replaceGateRenderer(candidate.session); session = candidate.session; world = candidate.world;
      showSession(); updateHud(readPads()); get('play').focus();
    } finally { if (generation === loadGeneration) { loading = false; setPaused(true); } }
  });
const doorHost = document.createElement('section'); doorHost.id = 'training-moving-door'; doorHost.style.gridColumn = '1 / -1'; gateHost.after(doorHost);
const doorPanel = installTrainingDoorPanel(doorHost,() => session,() => world,
  () => !loading && !!session && !!renderer && !graphicsLost,() => paused,() => setupDoorScenario(false), action => {
    if (paused || loading || !session?.gate?.moving || world.mission.outcome !== 'active') return;
    const actor = router.assignments.findIndex(source => source?.kind === 'keyboard' && source.index === 0);
    if (actor < 0) {doorPanel.feedback('Assign WASD to a mercenary first.'); return;}
    if (pendingGateActor !== null) {doorPanel.feedback('An action is already queued for the next tick.'); return;}
    pendingGateActor = actor; pendingDoorAction = action;
  },() => setupDoorScenario(true));
async function setupDoorScenario(pad: boolean): Promise<DoorSetupResult> {
  let generation = loadGeneration;
  let started = false;
  const isCurrent = () => generation === loadGeneration;
  try {
    if (loading || !session) throw new Error('Apply a verified team first.');
    const sources = sessionSources(); if (!sources) throw new Error('Open matching raw sources.');
    const current = session;
    generation = ++loadGeneration; started = true; loading = true; setPaused(true);
    const candidate = await (pad ? createPressurePadSession(sources,current) : createMovingDoorSession(sources,current));
    if (!isCurrent()) return {status:'cancelled',isCurrent};
    const nextLevel = pad ? createPressurePadLevel() : createMovingDoorLevel(); replaceGateRenderer(candidate.session,nextLevel);
    level = nextLevel; session = candidate.session; world = candidate.world; events.fill('READY');
    showSession(); updateLevelInfo(); updateHud(readPads()); get('play').focus();
    return {status:'installed',isCurrent};
  } catch (error) {
    return isCurrent() ? {status:'failed',error,isCurrent} : {status:'cancelled',isCurrent};
  } finally {if (started && isCurrent()) {loading = false; setPaused(true); rosterPanel.refresh();}}
}
/** Prepare rendering before installing collision/session; renderer and collision use the same candidate. */
function replaceGateRenderer(next: TrainingSession | null, base = level): void {
  if (base === level && session?.gate?.panelWord === next?.gate?.panelWord && session?.gate?.overlay.word === next?.gate?.overlay.word && (!patrolMissionLevel(base) || (session?.encounter?.fitness === 0) === (next?.encounter?.fitness === 0))) return;
  const nextRenderer = new FourViews(canvas,panes,effectivePatrolLevel(base,next?.gate ?? null,next?.encounter ?? null));
  renderer?.dispose(); renderer = nextRenderer; graphicsLost = false;
}
function cancelSessionOperation(): void { ++loadGeneration; loading = false; setPaused(true); }
function showSession(): void {
  encounterPanel.clearFeedback();
  groundPanel.clear();
  gatePanel.clear();
  groundHost.style.display = session?.gate ? 'none' : '';
  sessionInfo.replaceChildren();
  const label = document.createElement('p'); label.id = 'session-status';
  label.textContent = hasOwnWetParty(session) ? 'Training43 selected-team wet lifecycle: source-bound v18 recovery and all-dead failure. Explicit survivor selection; selected-team adaptation, original level incomplete.' : session?.wetRegion ? 'Training43 wet-region exploration: actual visited cells, full lifecycle and source-bound v17 recovery; explicit survivor selection, original level incomplete.' : session?.wetLifecycle ? 'Training43 wet damage/lifecycle: source-derived injury, death and bounded corpse search; v16 chronological recovery. Explicit survivor selection; retained display feedback adapter, original level incomplete.' : session?.wet ? 'Training43 supported keyboard wet traversal: exact editor geometry; source-bound v15 chronology. No wet damage/death composition. Fixed-step adaptation; original level incomplete.' : session?.consumables ? 'Authored consumable dry-fall extension | H uses equipped food/repair while PAUSED and settled. Full chronological v14 recovery; Retry resets team, health and inventory.' : session ? `Standalone imported Training43 session | PAUSED on apply, retry and restore. ${selectedFallLevel(level) ? 'Authored dry-fall geometry; verified selected stats/current inventory weight; adapted incapacitation and occupancy. ' : ''}Paused equip, occupied exchange and return are standalone source-deduced adapters in Inventory & equipment; authored isolated combat is beside the live display; original world combat and hazards remain unavailable.` : 'No active selected-team session.';
  sessionInfo.append(label);
  inventoryPanel.render(session);
  refreshEncounterPanel(); patrolPanel.refresh(); doorPanel.refresh();
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
  const wasWet=!!session?.wet;
  cancelSessionOperation(); session = null;
  if (wasWet || selectedFallLevel(level) || gateLevel(level)) installLevel(createDemoLevel());
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
      get('play').focus();
    } catch (error) { if (generation === loadGeneration) throw error; }
    finally { if (generation === loadGeneration) { loading = false; updateMissionHud(); rosterPanel.refresh(); inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); } }
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
    level = nextLevel; importedMapBytes = new Uint8Array(map); world = candidate.world;
    session = Object.freeze({ ...candidate.session, encounter });
    extraDiagnostics = `Import report: ${JSON.stringify(report, null, 2)}`;
    events.fill('READY'); loading = false; showSession(); setPaused(true); updateLevelInfo(); updateHud(readPads());
    get('local-test-status').textContent = 'Ready: verified local Training43 map and OCS team loaded. Use the test controls to start or pause. Combat controls and current results are beside the live display.';
    get('recovery-status').textContent = 'Local test ready. Session saves use this same verified map, roster and items.';
    encounterPanel.select(0, 'full'); get('play').focus();
  } catch (error) {
    if (generation === loadGeneration) get('local-test-status').textContent = `Test not loaded: ${errorText(error)}`;
  } finally {
    if (generation === loadGeneration) { loading = false; updateMissionHud(); rosterPanel.refresh(); inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); }
    else if (generation === latestPresetGeneration) get('local-test-status').textContent = 'Local test load cancelled by a newer operation. Current map and team retained.';
  }
});

function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function setPaused(value: boolean): void {
  paused = value; pendingGateActor = null; pendingDoorAction = 16; keys.clear(); router.reset(); clock.reset();
  updateMissionHud();
  inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh();
}
function updateMissionHud(): void {
  const challenge = patrolMissionLevel(level);
  gateHost.querySelector('h3')!.textContent = challenge ? 'Challenge gate · C at the front-cell panel' : 'Authored button / static gate practice';
  get('author-gate').hidden = challenge;
  for (const p of gateHost.querySelectorAll<HTMLElement>('p:not([id])')) p.hidden = challenge;
  const gateRun = get('gate-status').firstElementChild;
  if (challenge && gateRun) gateRun.textContent = world.mission.outcome !== 'active' ? 'FINISHED · Y Retry' : paused ? 'PAUSED · Start mission for C' : 'RUNNING';
  challengeButton.disabled = loading || !session || !renderer || graphicsLost;
  get<HTMLSelectElement>('mission-mode').disabled=!!session?.consumables;
  consumablePanel.refresh(); wetPanel.refresh(); lifecyclePanel.refresh(); regionPanel.refresh(); partyPanel.refresh();regionHost.hidden=!!hasOwnWetParty(session);wetHost.hidden=!!session?.wetLifecycle;
  selectedFallButton.disabled = !!session?.wet || loading || !session || !!session.ground || !!session.gate || selectedFallLevel(level);
  const mission = world.mission, active = mission.rules.mode !== 'navigation', fallDrill = world.physics.mode === 'dry-fall', allDead = teamDead(world), terminal = mission.outcome !== 'active' || allDead;
  const escaped = mission.exited.filter(Boolean).length;
  const play = get<HTMLButtonElement>('play');
  play.disabled = !renderer || graphicsLost || terminal;
  play.textContent = terminal ? allDead ? 'Drill finished' : 'Mission finished' : paused ? active ? 'Start mission' : fallDrill ? 'Start drill' : 'Start navigation' : 'Pause';
  const runState = terminal ? 'FINISHED' : paused ? 'PAUSED' : 'RUNNING';
  if (get('run-state').textContent !== runState) get('run-state').textContent = runState;
  get('run-state').dataset.state = terminal ? 'finished' : paused ? 'paused' : 'running';
  get<HTMLButtonElement>('reset').textContent = active ? 'Retry mission' : fallDrill ? 'Retry drill' : 'Reset positions';
  get('mission-mode-label').hidden = extractionProfile(level) === null || patrolMissionLevel(level);
  get<HTMLSelectElement>('mission-mode').value = mission.rules.mode;
  get('mission-objective').textContent = session?.consumables ? 'Authored consumable practice: land injured, Esc pause, equip source-owned food/repair in Inventory & equipment, then H. 1–4 selects actor; Retry resets the complete practice.' : session?.gate?.pad ? 'D steps onto P (4,5); wait for WALK THROUGH, W crosses door, W vacates. Release requests close. F defeats target; extract all four at E. C remains a manual alternative. 1–4 select WASD; Esc pauses.' : session?.gate?.moving ? 'C opens/closes timed door at the panel; WAIT for WALK THROUGH. F defeats target; extract all four at E (8,5). Lock/unlock: Tab to door buttons, Enter. 1–4 select WASD; Esc pauses.' : patrolMissionLevel(level) ? '1. C opens gate · 2. F defeats designated target (T: miss) · 3. Extract all four at E (8,5). 1–4 select WASD; Q/E turn; Esc pause; Y Retry after outcome. Limit: 10 source counts × 601 ticks.' : session?.patrol ? 'Authored patrol: C opens gate; F designates patrol target or T chooses miss. Health zero stops and releases it. Esc pauses; Retry resets the scenario.' : session?.gate ? 'Authored gate: C at the front-cell panel; D then W walks toward gate. Slot 2 can test occupied closure. Esc pauses.' : !active ? fallDrill ? selectedFallLevel(level) ? 'Authored practice: step forward off the ledge. Real selected stats and inventory weight affect landing injury. Lane 4 is a long fall. Retry resets team and inventory.' : 'Step forward off the ledge. Longer falls hurt more; lane 4 is lethal. Synthetic characters / empty inventories.' : level.id === 'synthetic-stairs-v1' ? 'Amber lanes: move forward to climb, backward to descend. Watch Z change from 01 to 02.' : 'Explore the grid. Try the extraction drill for a timed team objective.' : mission.rules.mode === 'cooperative-extraction' ? 'Get all four mercenaries to the glowing exit.' : 'Original training race: the first mercenary to escape wins.';
  get('mission-progress').textContent = hasOwnWetParty(session) && mission.reason==='all-dead' ? '4 / 4 DEAD · FAILED' : active ? `${escaped} / 4 extracted${terminal ? mission.outcome === 'complete' ? ' · COMPLETE' : ' · FAILED' : ''}` : fallDrill ? allDead ? 'PRACTICE EXHAUSTED · Retry or restore' : `${world.physics.mode === 'dry-fall' ? world.physics.actors.filter(a=>a.dead).length : 0} / 4 incapacitated` : '';
  get('prototype-label').textContent = hasOwnWetParty(session) ? 'TRAINING43 SELECTED-TEAM WET LIFECYCLE ADAPTATION' : session?.wetLifecycle ? 'TRAINING43 WET DAMAGE / LIFECYCLE ADAPTATION' : session?.wet ? 'TRAINING43 WET / FIXED-STEP ADAPTATION' : session?.consumables ? 'AUTHORED CONSUMABLE / DRY-FALL PRACTICE' : session?.gate?.moving ? 'AUTHORED TIMED DOOR / PATROL EXTRACTION' : patrolMissionLevel(level) ? 'AUTHORED COOPERATIVE PATROL EXTRACTION' : session?.patrol ? 'AUTHORED GATE PATROL / VERIFIED TEAM' : session?.gate ? 'AUTHORED STATIC GATE / VERIFIED TEAM' : selectedFallLevel(level) ? 'AUTHORED PRACTICE / VERIFIED TEAM' : session ? 'STANDALONE IMPORTED SESSION' : active ? 'EXTRACTION PROTOTYPE' : fallDrill ? 'DRY FALL PROTOTYPE' : 'STATIC NAVIGATION PROTOTYPE';
  let time = '';
  if (mission.clock) {
    const units = mission.clock.tens * 10 + mission.clock.units;
    const seconds = Math.ceil((units ? (units - 1) * 601 + mission.clock.subticks + 1 : 0) / 50);
    time = `TIME ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  get('mission-time').textContent = time;
  const overlay = get('pause-overlay'); overlay.hidden = !paused && !terminal;
  overlay.querySelector('b')!.textContent = hasOwnWetParty(session) && mission.reason==='all-dead' ? 'ALL MERCENARIES DEAD' : allDead ? 'TEAM INCAPACITATED' : mission.outcome === 'failed' ? 'TIME EXPIRED' : mission.outcome === 'complete' ? mission.winner === null ? 'TEAM EXTRACTED' : `MERCENARY ${mission.winner + 1} WINS` : 'TEAM STANDING BY';
  overlay.querySelector('small')!.textContent = terminal ? 'Retry or load an earlier checkpoint' : 'Assign controls, then start';
  for (let i = 0; i < 4; i++) {
    get(`dead-${i}`).hidden = !isDead(world,i);
    get(`dead-${i}`).firstChild!.textContent=session?.wetLifecycle?'DEAD':'INCAPACITATED';
    get(`dead-${i}`).querySelector('span')!.textContent=hasOwnWetParty(session) && allDead?'Retry resets this selected team':session?.wetLifecycle?'Select a living actor with 1–4; Retry resets the whole team':'Retry the drill or restore a checkpoint';
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
  router.assign(i, source); pendingGateActor = null;
  if (source?.kind === 'keyboard' && source.index === 0) gatePanel.select(i);
  keys.clear(); refreshAssignments(readPads(), true); select.blur();
}));

function updateHud(pads: PadSnapshot[]): void {
  for (let i = 0; i < 4; i++) {
    const p = world.mercenaries[i]!, source = router.assignments[i];
    get(`position-${i}`).textContent = `X ${String(p.x).padStart(2, '0')}  Y ${String(p.y).padStart(2, '0')}  Z ${String(p.z).padStart(2, '0')} / ${['N', 'E', 'S', 'W'][p.facing]}`;
    get(`event-${i}`).textContent = session?.gate && i === gatePanel.selected() ? `${events[i]} · ${gatePanel.near(i) ? 'PANEL AHEAD · C' : 'C: FACE PANEL'} · ${session.gate.overlay.word & 2 ? 'GATE CLOSED' : 'GATE OPEN'}` : events[i]!;
    const fitness = get(`fitness-${i}`); fitness.hidden = world.physics.mode !== 'dry-fall' && !session?.wetLifecycle;
    fitness.textContent = world.physics.mode === 'dry-fall' ? `FIT ${Math.floor(world.physics.actors[i]!.fitness / 655)}%${selectedFallLevel(level) ? ` · ${world.physics.actors[i]!.fitness} · FALL ${world.physics.actors[i]!.fallDamage} · WT ${world.physics.actors[i]!.weight}` : ''}` : '';
    if(session?.wetLifecycle)fitness.textContent=`FIT ${session.wet!.actors[i]!.body.fitness} · ${isDead(world,i)?'DEAD':'ALIVE'}`;
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
    '50 Hz prototype clock; movement repeats at 160 ms while held. Dry directional stairs and bounded static support (stone/stairs below or tree two levels below). Amber blocks mark stairs; shapes remain placeholders. Dry gravity and fitness damage are restricted to the synthetic fall drill. Other maps block drops. Selected-team sessions additionally expose paused source inventory and an isolated authored gun encounter beside the live display. The optional authored gate patrol uses a separate overhead placeholder; original enemy combat, sound and campaign travel remain unavailable. Water, pressure pads and lifts remain blocked. Unsafe drops and hazard cells are blocked. This is not original timing/behaviour parity. Checkpoints preserve positions, mission state, tick and RNG; they require the exact same map and do not save device assignments.',
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
  const nextSession = session ? resetTrainingInventory(session, level, world.mission.rules) : null;
  const nextWorld = createWorld(level, undefined, world.mission.rules, nextSession && selectedFallLevel(level) ? selectedFallProfile(nextSession) : undefined);
  if(nextSession?.wetLifecycle)nextWorld.physics={mode:'source-wet',deadWords:[0,0,0,0]};
  replaceGateRenderer(nextSession); session = nextSession; world = nextWorld;
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
for (const id of ['demo', 'drill', 'stairs', 'fall']) get(id).addEventListener('click', () => get('play').focus());
selectedFallButton.addEventListener('click', async () => {
  if (loading || !session || session.wet || session.ground || session.gate) return;
  const sources = sessionSources(); if (!sources) return;
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
  loadGeneration++; loading = false; setPaused(true);
  try {
    const next = createWorld(level, undefined, missionRulesForLevel(level, mode));
    const nextSession = session ? resetTrainingInventory(session, level, next.mission.rules) : null;
    if(nextSession?.wetLifecycle)next.physics={mode:'source-wet',deadWords:[0,0,0,0]};
    replaceGateRenderer(nextSession); session = nextSession; world = next;
    if (session) showSession();
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
    const mapBytes=new Uint8Array(await file.arrayBuffer());
    const { level: imported, report } = await importEditorMap(mapBytes);
    if (generation !== loadGeneration) return;
    importedMapBytes=mapBytes;
    installLevel(imported, `Import report: ${JSON.stringify(report, null, 2)}`);
    loading = false; rosterPanel.refresh(); inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh();
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Map not loaded: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) { loading = false; updateMissionHud(); rosterPanel.refresh(); inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); } }
});

get<HTMLButtonElement>('save-checkpoint').addEventListener('click', async () => {
  if (loading) return;
  const generation = ++loadGeneration; setPaused(true); loading = true; get('error').textContent = '';
  try {
    const sources = sessionSources();
    if (session && !sources) throw new Error('Reopen the matching roster and items before saving this session.');
    const json = session ? await exportTrainingSession(level, world, session, sources!) : await exportCheckpoint(level, world);
    if (generation !== loadGeneration) return;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `hired-guns-checkpoint-${world.tick}.json`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    get('recovery-status').textContent = `Checkpoint exported at tick ${world.tick}. ${session ? 'Keep the same local map, roster and items for session recovery.' : 'Keep the same source map for recovery.'}`;
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Checkpoint not saved: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) { loading = false; updateMissionHud(); rosterPanel.refresh(); inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); } }
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
      const sources = sessionSources();
      if (!sources) throw new Error('Open the matching verified OCS roster and item table before restoring a session.');
      const candidate = await importTrainingSession(level, sources, json);
      restoredSession = candidate.session; restored = candidate.world;
    } else {
      if (session) throw new Error('An active selected team requires a Training43 session save. Clear the session by opening a map before loading a legacy checkpoint.');
      if (file.size >= MAX_CHECKPOINT_BYTES) throw new Error('Checkpoint must be smaller than 16 KiB.');
      restored = await importCheckpoint(level, json);
    }
    if (generation !== loadGeneration) return;
    const restoredLevel = patrolMissionLevel(level) && restored.levelId === createTrainingGateLevel().id ? createTrainingGateLevel() : level;
    replaceGateRenderer(restoredSession,restoredLevel); level = restoredLevel; session = restoredSession; world = restored; showSession(); updateLevelInfo(); events.fill('RESTORED'); updateHud(readPads());
    get('recovery-status').textContent = `Checkpoint restored at tick ${world.tick}. ${teamDead(world) ? 'Retry the drill to start again.' : world.physics.mode === 'dry-fall' ? 'Review controls, then start drill.' : world.mission.outcome !== 'active' ? 'Use Retry mission to start again.' : world.mission.rules.mode === 'navigation' ? 'Review controls, then start navigation.' : 'Review controls, then start mission.'}`;
  } catch (error) { if (generation === loadGeneration) get('error').textContent = `Checkpoint not loaded: ${errorText(error)}`; }
  finally { if (generation === loadGeneration) { loading = false; updateMissionHud(); rosterPanel.refresh(); inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh(); } }
});

const allKeys = new Set(KEY_GROUPS.flatMap(group => group.map(([key]) => key)));
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (target.matches('input,select,textarea') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'Escape') { setPaused(true); event.preventDefault(); return; }
  if (event.code === 'KeyY') {
    event.preventDefault();
    if (!event.repeat && !activationKeys.has(event.code)) { activationKeys.add(event.code); if (!loading && patrolMissionLevel(level) && world.mission.outcome !== 'active') get<HTMLButtonElement>('reset').click(); }
    return;
  }
  if (event.code === 'KeyC') {
    event.preventDefault();
    if (!event.repeat && !activationKeys.has(event.code)) {
      activationKeys.add(event.code);
      if (!session?.gate || loading || !renderer || graphicsLost || world.mission.outcome !== 'active') gatePanel.feedback('Activation unavailable: set up gate practice first.');
      else if (paused) gatePanel.feedback('Refused: PAUSED. Start navigation before C.');
      else if (pendingGateActor === null) {
        const controlled = router.assignments.findIndex(source => source?.kind === 'keyboard' && source.index === 0);
        if (controlled < 0) gatePanel.feedback('Refused: assign WASD to a mercenary first.');
        else { gatePanel.select(controlled); pendingGateActor = controlled; const door = session.gate.moving; pendingDoorAction = door ? door.record.direction === 1 ? 15 : door.record.direction === 2 ? 14 : (door.word&2) ? 14 : 15 : 16; }
      }
    }
    return;
  }
  if(event.code==='KeyH'){event.preventDefault();if(!event.repeat)consumablePanel.keyboard();return;}
  if (['KeyG','KeyB','KeyV'].includes(event.code)) { event.preventDefault(); if (!event.repeat) groundPanel.keyboard(event.code); return; }
  if (['KeyF', 'KeyT', 'KeyR'].includes(event.code)) {
    if(session?.wet||session?.consumables){event.preventDefault();return;}
    event.preventDefault();
    if (!event.repeat) encounterCommand({ kind: event.code === 'KeyF' ? 'fire' : event.code === 'KeyT' ? 'target' : 'reset' });
    return;
  }
  if (/^Digit[1-4]$/.test(event.code)) {
    consumablePanel.select(Number(event.code.slice(-1)) - 1);
    groundPanel.select(Number(event.code.slice(-1)) - 1);
    gatePanel.select(Number(event.code.slice(-1)) - 1); pendingGateActor = null;
    router.assign(Number(event.code.slice(-1)) - 1, { kind: 'keyboard', index: 0 }); keys.clear(); refreshAssignments(readPads(), true); event.preventDefault(); return;
  }
  if (allKeys.has(event.code)) { event.preventDefault(); if (!paused) keys.add(event.code); }
});
window.addEventListener('keyup', event => { keys.delete(event.code); activationKeys.delete(event.code); });
window.addEventListener('blur', () => { activationKeys.clear(); setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); graphicsLost = true; setPaused(true); get('error').textContent = 'Graphics context lost. Reload the page to recover.'; });

function frame(now: number): void {
  const elapsed = Math.max(0, now - lastTime); lastTime = now; frameMs += (elapsed - frameMs) * 0.05;
  const pads = readPads(); refreshAssignments(pads);
  if (!paused && !loading) {
    try { clock.advance(elapsed, () => {
      const previousTick = world.tick;
      const commands = router.commands(world.tick, keys, pads);
      const activation = pendingGateActor, action = pendingDoorAction; pendingGateActor = null; pendingDoorAction = 16;
      const gateResult = session?.gate ? advanceGateTrainingSession(level,session,world,commands,activation,action) : null;
      const consumableResult=session?.consumables?stepConsumables(level,session,world,commands):null;
      const wetResult=hasOwnWetParty(session)?stepWetParty(level,session,world,commands):session?.wetRegion?stepWetRegion(level,session,world,commands):session?.wetLifecycle?stepWetLifecycle(level,session,world,commands):session?.wet?stepWet(level,session,world,commands):null;
      const result = wetResult ?? consumableResult ?? gateResult ?? stepWorld(level,world,commands);
      const nextSession = wetResult ? wetResult.session : consumableResult ? consumableResult.session : gateResult ? gateResult.session : session ? recordTrainingGroundStep(session,world,result.world,commands) : null;
      replaceGateRenderer(nextSession);
      world = result.world; session = nextSession;
      if(wetResult && world.tick%50===0)inventoryPanel.render(session);
      if (gateResult?.feedback) {gatePanel.feedback(gateResult.feedback); doorPanel.feedback(gateResult.feedback);}
      if (world.tick !== previousTick && session?.encounter && !session.patrol) session = Object.freeze({ ...session, encounter: tickTrainingEncounter(session.encounter) });
      result.events.forEach((event: SimulationEvent) => { events[event.mercenaryId] = event.kind === 'blocked' ? `BLOCKED: ${event.reason}`.toUpperCase() : event.kind.toUpperCase(); });
    }); } catch (error) { setPaused(true); get('error').textContent = errorText(error); }
    if (world.mission.outcome !== 'active' || teamDead(world)) setPaused(true);
  }
  inventoryPanel.refresh(session); refreshEncounterPanel(); groundPanel.refresh(); gatePanel.refresh(); patrolPanel.refresh(); doorPanel.refresh();
  wetPanel.refresh(); lifecyclePanel.refresh(); regionPanel.refresh(); partyPanel.refresh();
  renderer?.render(world, elapsed); updateHud(pads); requestAnimationFrame(frame);
}
try { installLevel(level); } catch (error) { get('error').textContent = errorText(error); }
refreshAssignments(readPads(), true); requestAnimationFrame(frame);
