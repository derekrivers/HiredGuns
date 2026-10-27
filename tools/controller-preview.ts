import { InputRouter, type PadSnapshot } from '../src/input/router';
import type { PlayerCommand } from '../src/contracts';

type DiagnosticPad = Omit<PadSnapshot, 'buttons'> & { buttons: { pressed: boolean; value: number }[] };
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const router = new InputRouter();
for (let slot = 0; slot < 4; slot++) router.assign(slot, null);
const positions = ['TOP LEFT', 'TOP RIGHT', 'BOTTOM LEFT', 'BOTTOM RIGHT'];
const checkLabels = [
  ['four-pads', 'Four real controllers command their own four views simultaneously'],
  ['disconnect', 'Disconnect / reconnect and release controls: no stuck movement; explicit resume works'],
  ['focus', 'Switch away and return: paused until explicit resume'],
  ['identity', 'Each person identifies the correct viewport and assignment'],
  ['legibility', 'TV text, edges, grey steps and colours readable at the actual seating distance'],
  ['audio', 'Approved audio heard clearly on the event PC / TV at the seating positions'],
] as const;
const counts = [0, 0, 0, 0];
const lastActions = ['none', 'none', 'none', 'none'];
const events: { at: string; event: string }[] = [];
let pads: DiagnosticPad[] = [];
let running = false, reason = 'not started', tick = 0, deviceSignature = '';
let previousPresence = [false, false, false, false];
let lastCommands: PlayerCommand[] = [];
let pollError = '';
const startedAt = new Date().toISOString();
const log = (event: string) => {
  events.push({ at: new Date().toISOString(), event });
  if (events.length > 100) events.shift();
  element('events').textContent = events.map(item => `${item.at} ${item.event}`).join('\n');
};
const pause = (message: string) => {
  running = false; reason = message; lastCommands = []; router.reset();
  lastActions.fill('none');
  log(`Paused: ${message}`);
};
const sourceKey = (pad: Pick<PadSnapshot, 'index' | 'id'>) => `pad:${pad.index}:${pad.id}`;

for (let slot = 0; slot < 4; slot++) {
  const view = document.createElement('article'); view.className = 'view'; view.id = `view-${slot}`;
  view.innerHTML = `<div class="identity"><span class="number">P${slot + 1}</span><span class="position">${positions[slot]}</span></div>
    <div class="shade" aria-label="Five grey steps"></div><div class="colors" aria-label="Red green blue strips"></div>
    <label class="assignment-label">Assign player ${slot + 1}<select id="assignment-${slot}" aria-label="Assign player ${slot + 1}"><option value="none">Unassigned</option></select></label>
    <p id="connection-${slot}"></p><p class="command" id="command-${slot}">Last routed: none · count 0</p><pre class="raw" id="raw-${slot}"></pre>`;
  element('views').append(view);
  element<HTMLSelectElement>(`assignment-${slot}`).onchange = event => {
    const value = (event.target as HTMLSelectElement).value;
    const pad = pads.find(pad => sourceKey(pad) === value);
    router.assign(slot, pad ? { kind: 'gamepad', index: pad.index, id: pad.id } : null);
    previousPresence = router.assignments.map(source => source?.kind === 'gamepad' && pads.some(p => p.connected && p.index === source.index && p.id === source.id));
    pause(`assignment changed for P${slot + 1}`);
    refreshChoices();
  };
}
for (const [id, label] of checkLabels) {
  const wrapper = document.createElement('label'); wrapper.textContent = `${label} `;
  const select = document.createElement('select'); select.id = `check-${id}`;
  for (const value of ['pending', 'pass', 'fail', 'not-run']) select.add(new Option(value, value));
  wrapper.append(select); element('checks').append(wrapper);
}

function refreshChoices(): void {
  for (let slot = 0; slot < 4; slot++) {
    const select = element<HTMLSelectElement>(`assignment-${slot}`);
    const source = router.assignments[slot];
    select.replaceChildren(new Option('Unassigned', 'none'));
    for (const pad of pads.filter(p => p.connected)) select.add(new Option(`Pad ${pad.index + 1}: ${pad.id} [${pad.mapping || 'nonstandard'}]`, sourceKey(pad)));
    if (source?.kind === 'gamepad') {
      const key = sourceKey(source);
      if (!Array.from(select.options).some(option => option.value === key)) select.add(new Option(`Missing pad ${source.index + 1}: ${source.id}`, key));
      select.value = key;
    }
  }
}

function readPads(): DiagnosticPad[] {
  if (!navigator.getGamepads) throw new Error('Gamepad API unavailable in this browser.');
  return Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => pad !== null).map(pad => ({
    index: pad.index, id: pad.id, connected: pad.connected, mapping: pad.mapping,
    axes: Array.from(pad.axes), buttons: Array.from(pad.buttons, button => ({ pressed: button.pressed, value: button.value })),
  }));
}

function render(): void {
  element('tv-source').textContent = `Source: ${element<HTMLSelectElement>('source').value} · physical checks unverified`;
  element('session').textContent = `${running ? 'RUNNING' : 'PAUSED'} — ${reason} | focused: ${document.hasFocus()} | visibility: ${document.visibilityState}`;
  element('environment').textContent = `Viewport ${innerWidth} × ${innerHeight} CSS px · DPR ${devicePixelRatio} · fullscreen: ${!!document.fullscreenElement}`;
  element('devices').textContent = pads.length ? JSON.stringify(pads, null, 2) : 'No devices reported; press a controller button. Check browser/OS permissions if it stays absent.';
  for (let slot = 0; slot < 4; slot++) {
    const source = router.assignments[slot];
    const pad = source?.kind === 'gamepad' ? pads.find(p => p.index === source.index && p.id === source.id && p.connected) : undefined;
    element(`connection-${slot}`).textContent = !source ? 'Unassigned' : pad ? `Connected · pad ${pad.index + 1} · ${pad.mapping || 'nonstandard (no routed commands)'}` : 'DISCONNECTED / identity changed — reassign if required';
    element(`raw-${slot}`).textContent = pad ? `Axes: ${pad.axes.map(value => value.toFixed(3)).join(', ')}\nButtons: ${pad.buttons.map((b, i) => `${i}:${b.value.toFixed(2)}${b.pressed ? '*' : ''}`).join(' ')}` : 'No assigned connected pad';
    element(`command-${slot}`).textContent = `Last routed: ${lastActions[slot]} · count ${counts[slot]}`;
  }
}

function poll(): void {
  try {
    pads = readPads();
    if (pollError) { pollError = ''; element('error').textContent = ''; }
    const signature = JSON.stringify(pads.map(({ index, id, connected, mapping }) => ({ index, id, connected, mapping })));
    if (signature !== deviceSignature) { deviceSignature = signature; refreshChoices(); log('Device list changed (browser-reported, not physical acceptance)'); }
    const presence = router.assignments.map(source => source?.kind === 'gamepad' && pads.some(p => p.connected && p.index === source.index && p.id === source.id));
    if (presence.some((present, slot) => previousPresence[slot] && !present)) pause('assigned device disconnected or identity changed');
    previousPresence = presence;
    if (running && (!document.hasFocus() || document.visibilityState !== 'visible')) pause('focus / visibility lost');
    lastCommands = running ? router.commands(tick++, new Set(), pads) : [];
    for (const command of lastCommands) { counts[command.mercenaryId]!++; lastActions[command.mercenaryId] = command.action; }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message !== pollError) { pause(`device read failed: ${message}`); pollError = message; }
    element('error').textContent = message;
    pads = [];
  }
  render(); requestAnimationFrame(poll);
}
element('start').onclick = () => {
  if (!document.hasFocus() || document.visibilityState !== 'visible' || pollError) { pause('focus this page and resolve device errors before resuming'); return; }
  router.reset(); running = true; reason = 'explicitly resumed'; log('Observations resumed explicitly'); render();
};
element('pause').onclick = () => { pause('user'); render(); };
window.addEventListener('blur', () => { pause('focus lost'); render(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { pause('page hidden'); render(); } });
element('calibration').onclick = () => {
  const enabled = document.body.classList.toggle('tv');
  element('calibration').textContent = enabled ? 'Exit TV calibration' : 'Enter TV calibration';
  log(`TV calibration ${enabled ? 'entered' : 'exited'}; human legibility still pending`);
};
element('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
  } catch (cause) { element('error').textContent = `Fullscreen unavailable: ${String(cause)}`; }
};
element('export').onclick = () => {
  const source = element<HTMLSelectElement>('source').value;
  const observer = element<HTMLInputElement>('observer').value.trim();
  const receipt = {
    schemaVersion: 1, diagnostic: 'controller-tv-preview', startedAt, exportedAt: new Date().toISOString(),
    targetEvidenceDate: '2026-11-03', evidenceSource: source, physicalAcceptance: 'not-established-by-this-tool',
    environment: { userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight },
      screen: { width: screen.width, height: screen.height }, devicePixelRatio, fullscreen: !!document.fullscreenElement,
      focused: document.hasFocus(), visibility: document.visibilityState },
    browserTelemetry: { running, reason, diagnosticFrameTick: tick, assignments: router.assignments,
      devices: pads, commandCounts: counts, lastActions, lastFrameCommands: lastCommands, events },
    humanReported: { observer, setup: element<HTMLInputElement>('setup').value, notes: element<HTMLTextAreaElement>('notes').value,
      attributedPhysicalReport: source === 'human-physical' && observer.length > 0,
      checks: Object.fromEntries(checkLabels.map(([id, label]) => [id, { label, result: element<HTMLSelectElement>(`check-${id}`).value }])) },
    limitations: ['Browser device reports and synthetic injection cannot verify physical hardware.', 'Commands use diagnostic animation-frame ticks, not gameplay timing.', 'Audio and seating-distance observations are manual; this page has no audio or gameplay.'],
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `controller-tv-${source}-${Date.now()}.json`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  element('export-status').textContent = `Exported ${source} receipt locally; physical acceptance is not established by this tool.`;
};
log('Diagnostic loaded; all physical checks pending');
render(); requestAnimationFrame(poll);
