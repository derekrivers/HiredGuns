import { FourViews } from '../src/render/four-views';
import { createDemoLevel } from '../src/demo';
import { createWorld } from '../src/sim/world';

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('scene');
const panes = [...document.querySelectorAll<HTMLElement>('.pane')];
const overlays = [...document.querySelectorAll<HTMLCanvasElement>('.sprite')];
const examples = ['dark', 'light', 'checker'].map(id => element<HTMLCanvasElement>(id));
const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
const level = createDemoLevel(), world = createWorld(level), worldSnapshot = JSON.stringify(world);
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
if (!gl) throw new Error('WebGL2 unavailable.');
const context = gl;
const totals = { drawCalls: 0, submittedTriangles: 0 };
const resources: Record<string, Set<unknown>> = {};
const deletes: Record<string, number> = {};
const api = context as unknown as Record<string, (...args: unknown[]) => unknown>;
for (const type of ['Buffer', 'Texture', 'Program', 'Shader', 'Framebuffer', 'Renderbuffer', 'VertexArray']) {
  const objects = new Set<unknown>(); resources[type] = objects; deletes[type] = 0;
  for (const action of ['create', 'delete']) {
    const name = `${action}${type}`, original = api[name]!.bind(context);
    api[name] = (...args: unknown[]) => {
      const result = original(...args);
      if (action === 'create' && result) objects.add(result);
      if (action === 'delete' && objects.delete(args[0])) deletes[type] = deletes[type]! + 1;
      return result;
    };
  }
}
for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
  const original = api[name]!.bind(context);
  api[name] = (...args: unknown[]) => {
    totals.drawCalls++;
    const count = Number(args[name.startsWith('drawArrays') ? 2 : 1]);
    const instances = name.endsWith('Instanced') ? Number(args[name.startsWith('drawArrays') ? 3 : 4]) : 1;
    if (args[0] === context.TRIANGLES) totals.submittedTriangles += Math.floor(count / 3) * instances;
    return original(...args);
  };
}
const resourceSnapshot = () => Object.fromEntries(Object.entries(resources).map(([name, objects]) => [name, objects.size]));
const environment = () => ({
  viewport: { width: innerWidth, height: innerHeight }, devicePixelRatio,
  rendererDprCap: 1.5, stage: { width: canvas.clientWidth, height: canvas.clientHeight },
  overlayPixelRatio: 1, spriteScale: 2, authoredAnimationIntervalMs: 250,
  drawingBuffer: { width: context.drawingBufferWidth, height: context.drawingBufferHeight },
  paneSizes: panes.map(pane => ({ width: pane.clientWidth, height: pane.clientHeight })),
  userAgent: navigator.userAgent, visibility: document.visibilityState,
  webglVersion: context.getParameter(context.VERSION) as string | null,
  webglRenderer: context.getParameter(context.RENDERER) as string | null,
  contextAttributes: context.getContextAttributes(),
  hardwareIdentity: 'Not verified; WebGL renderer strings may describe a software or privacy-masked implementation.',
});
let renderer = new FourViews(canvas, panes, level);
const regions = [{ x: 2, y: 2, width: 32, height: 40, pivotX: 16, pivotY: 36 },
  { x: 38, y: 2, width: 32, height: 40, pivotX: 16, pivotY: 36 }];
let bitmap: ImageBitmap | null = null;
let createdBitmaps = 0, closedBitmaps = 0, frameChanges = 0, previousFrame = -1;
let assetChecks: ReturnType<typeof inspectAtlas> | null = null;
let busy = false, contextLost = false, showOverlay = true, lastTime = 0, activeRun: Run | null = null;
let comparison: { baseline: Measurement; overlay: Measurement } | null = null;
const lifecycle: { cycle: number; afterDispose: Record<string, number>; afterReload: Record<string, number>; liveBitmapsAfterDispose: number }[] = [];

function inspectAtlas(source: HTMLCanvasElement) {
  const pixels = source.getContext('2d')!.getImageData(0, 0, source.width, source.height);
  const frames = regions.map(region => {
    let transparent = 0, translucent = 0, opaque = 0, bottom = -1, left = 32, right = -1;
    for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
      const alpha = pixels.data[((region.y + y) * source.width + region.x + x) * 4 + 3]!;
      if (alpha === 0) transparent++; else if (alpha === 255) opaque++; else translucent++;
      if (alpha) {
        if (y > bottom) { bottom = y; left = x; right = x; }
        else if (y === bottom) { left = Math.min(left, x); right = Math.max(right, x); }
      }
    }
    return { region, transparent, translucent, opaque, bottomEdgeRelativeToPivot: bottom + 1 - region.pivotY,
      bottomCentreRelativeToPivot: (left + right + 1) / 2 - region.pivotX };
  });
  const boundsValid = regions.every(r => r.x >= 0 && r.y >= 0 && r.x + r.width <= source.width && r.y + r.height <= source.height);
  const nonOverlapping = regions[0]!.x + regions[0]!.width < regions[1]!.x;
  let gutterAlphaValid = true;
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    if (!regions.some(r => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) && pixels.data[(y * source.width + x) * 4 + 3] !== 0) gutterAlphaValid = false;
  }
  return { kind: 'authored-synthetic-two-frame-atlas', dimensions: { width: source.width, height: source.height },
    alphaConvention: 'Canvas straight RGBA source; browser compositing, no original pack binding',
    boundsValid, nonOverlapping, gutterAlphaValid, interiorAlpha: pixels.data[(22 * source.width + 18) * 4 + 3],
    registrationValid: frames.every(f => f.bottomEdgeRelativeToPivot === 0 && f.bottomCentreRelativeToPivot === 0), frames };
}

function disposeAtlas(): void {
  if (bitmap) { bitmap.close(); closedBitmaps++; bitmap = null; }
  for (const target of [...overlays, ...examples]) target.getContext('2d')!.clearRect(0, 0, target.width, target.height);
  refreshAssetReport();
}
async function loadAtlas(): Promise<void> {
  disposeAtlas();
  const atlas = document.createElement('canvas'); atlas.width = 72; atlas.height = 44;
  const paint = atlas.getContext('2d')!;
  regions.forEach((r, index) => {
    paint.fillStyle = index ? '#f1bf70' : '#70ded1';
    paint.fillRect(r.x + (index ? 8 : 11), r.y + (index ? 8 : 14), index ? 16 : 10, index ? 26 : 20);
    paint.fillRect(r.x + 8, r.y + 32, 16, 4);
    paint.clearRect(r.x + 12, r.y + 16, 8, 8);
    paint.fillStyle = 'rgba(250, 80, 140, 0.5)'; paint.fillRect(r.x + 12, r.y + 16, 8, 8);
  });
  const blob = await new Promise<Blob>((resolve, reject) => atlas.toBlob(value => value ? resolve(value) : reject(new Error('Synthetic atlas PNG encoding failed.')), 'image/png'));
  bitmap = await createImageBitmap(blob); createdBitmaps++; previousFrame = -1;
  const decoded = document.createElement('canvas'); decoded.width = bitmap.width; decoded.height = bitmap.height;
  decoded.getContext('2d')!.drawImage(bitmap, 0, 0); assetChecks = inspectAtlas(decoded);
  refreshAssetReport();
}
function refreshAssetReport(): void {
  element('asset-report').textContent = JSON.stringify({ checks: assetChecks, createdBitmaps, closedBitmaps,
    liveBitmaps: createdBitmaps - closedBitmaps, loaded: bitmap !== null, frameChanges }, null, 2);
}
function drawSprite(target: HTMLCanvasElement, index: number, background?: string): void {
  const w = background ? 192 : Math.max(1, Math.round(target.clientWidth));
  const h = background ? 128 : Math.max(1, Math.round(target.clientHeight));
  if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
  const ctx = target.getContext('2d')!; ctx.clearRect(0, 0, w, h);
  if (!bitmap) return;
  if (background === 'checker') {
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = ((x + y) / 16) % 2 ? '#d8e0e4' : '#40515e'; ctx.fillRect(x, y, 16, 16);
    }
  } else if (background) { ctx.fillStyle = background === 'dark' ? '#101b24' : '#f3f5f7'; ctx.fillRect(0, 0, w, h); }
  const r = regions[index]!, scale = 2, anchorX = Math.round(w / 2), anchorY = background ? 110 : Math.round(h * 0.8);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, r.x, r.y, r.width, r.height, anchorX - r.pivotX * scale, anchorY - r.pivotY * scale, r.width * scale, r.height * scale);
  ctx.strokeStyle = '#ff5f8d'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(anchorX - 8, anchorY + 0.5); ctx.lineTo(anchorX + 8, anchorY + 0.5);
  ctx.moveTo(anchorX + 0.5, anchorY - 8); ctx.lineTo(anchorX + 0.5, anchorY + 8); ctx.stroke();
}

interface Sample { intervalMs: number; submissionMs: number; drawCalls: number; submittedTriangles: number }
interface Run { mode: string; warmupMs: number; durationMs: number; start: number; previous: number;
  environment: ReturnType<typeof environment>; samples: Sample[]; invalidReasons: Set<string>; complete: (measurement: Measurement) => void }
function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]! : null;
  return { count: values.length, min: sorted[0] ?? null, median: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
    max: sorted.at(-1) ?? null, mean: values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null };
}
function finish(run: Run, now: number) {
  const endEnvironment = environment();
  if (JSON.stringify(run.environment) !== JSON.stringify(endEnvironment)) run.invalidReasons.add('Environment changed during window.');
  if (!run.samples.length) run.invalidReasons.add('No complete frame intervals in the measurement window.');
  return { mode: run.mode, valid: run.invalidReasons.size === 0, invalidReasons: [...run.invalidReasons],
    warmupMs: run.warmupMs, requestedSampleMs: run.durationMs, sampleWindowObservedThroughMs: now - run.start - run.warmupMs,
    endOverrunMs: now - run.start - run.warmupMs - run.durationMs,
    environment: run.environment, endEnvironment, frames: run.samples.length,
    frameIntervalsMs: distribution(run.samples.map(s => s.intervalMs)),
    cpuSubmissionMs: distribution(run.samples.map(s => s.submissionMs)),
    drawCallsPerFrame: distribution(run.samples.map(s => s.drawCalls)),
    submittedTrianglesPerFrame: distribution(run.samples.map(s => s.submittedTriangles)),
    rawSamples: run.samples, liveWebglResources: resourceSnapshot() };
}
type Measurement = ReturnType<typeof finish>;
function measure(mode: string, warmupMs: number, durationMs: number): Promise<Measurement> {
  showOverlay = mode === 'current-renderer-plus-canvas-overlay';
  return new Promise(complete => { activeRun = { mode, warmupMs, durationMs, start: 0, previous: 0,
    environment: environment(), samples: [], invalidReasons: new Set(), complete }; });
}
function frame(now: number): void {
  const elapsed = lastTime ? now - lastTime : 0; lastTime = now;
  const before = { ...totals }, start = performance.now();
  if (!contextLost) renderer.render(world, elapsed);
  const index = Math.floor(now / 250) % 2;
  if (index !== previousFrame && bitmap) { previousFrame = index; frameChanges++; }
  for (const target of overlays) {
    target.hidden = !showOverlay;
    if (showOverlay) drawSprite(target, index);
  }
  const submissionMs = performance.now() - start;
  // Swatches and UI are outside submission timing, but share the browser/RAF workload in both modes.
  examples.forEach((target, i) => drawSprite(target, index, ['dark', 'light', 'checker'][i]));
  const run = activeRun;
  if (run) {
    if (!run.start) { run.start = now; run.previous = now; run.environment = environment(); }
    if (document.hidden) run.invalidReasons.add('Document hidden during measurement.');
    const boundary = run.start + run.warmupMs, end = boundary + run.durationMs;
    if (run.previous >= boundary && now <= end) run.samples.push({ intervalMs: now - run.previous, submissionMs,
      drawCalls: totals.drawCalls - before.drawCalls, submittedTriangles: totals.submittedTriangles - before.submittedTriangles });
    run.previous = now;
    if (now >= end) { activeRun = null; run.complete(finish(run, now)); }
  }
  requestAnimationFrame(frame);
}
function report() {
  const retainedHandleGrowth = lifecycle.slice(1).flatMap((cycle, index) => Object.entries(cycle.afterDispose)
    .filter(([name, count]) => count > lifecycle[index]!.afterDispose[name]!)
    .map(([name, count]) => ({ resource: name, fromCycle: lifecycle[index]!.cycle, toCycle: cycle.cycle,
      additionalObservedHandles: count - lifecycle[index]!.afterDispose[name]! })));
  return { schemaVersion: 1, scope: 'Synthetic isolated current FourViews versus Canvas2D overlay; no integrated pack or hardware acceptance',
    recordedAt: new Date().toISOString(), environment: environment(), contextLost, comparison, lifecycle,
    lifecycleAssessment: { bitmapClosurePassed: lifecycle.every(cycle => cycle.liveBitmapsAfterDispose === 0),
      resourceCheck: lifecycle.length < 2 ? 'insufficient-cycles' : retainedHandleGrowth.length ? 'retained-handle-growth-observed' : 'no-growth-observed',
      retainedHandleGrowth, explanation: 'Observed WebGL creates without matching tracked deletes after public dispose; driver allocation/reclamation is not measured.' },
    assets: { checks: assetChecks, createdBitmaps, closedBitmaps, liveBitmaps: createdBitmaps - closedBitmaps, frameChanges },
    webgl: { observedLiveResources: resourceSnapshot(), observedDeletes: { ...deletes }, totals: { ...totals },
      threeInfo: null, threeInfoReason: 'FourViews exposes no public stats API; WebGL wrappers count observed calls only.',
      driverMemoryBytes: null, gpuTimeMs: null },
    worldUnchanged: JSON.stringify(world) === worldSnapshot,
    limits: ['CPU submission duration excludes GPU completion.', 'RAF interval includes scheduling and both modes share swatch work.',
      'Resource counters observe create/delete calls, not driver memory reclamation.', 'Software/headless measurements are not event PC/TV acceptance.',
      'Baseline runs first; order, browser load, thermal state and display scheduling can bias comparisons.'] };
}
function updateReport(): void { refreshAssetReport(); element('report').textContent = JSON.stringify(report(), null, 2); }
async function guarded(action: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true; buttons.forEach(button => { button.disabled = true; });
  element('error').textContent = '';
  try {
    if (contextLost) throw new Error('WebGL context lost; reload preview before measuring.');
    await action(); updateReport();
  }
  catch (error) { element('error').textContent = error instanceof Error ? error.message : String(error); }
  finally { busy = false; buttons.forEach(button => { button.disabled = false; }); }
}
element('load').onclick = () => { void guarded(async () => { await loadAtlas(); element('status').textContent = 'Synthetic atlas loaded.'; }); };
element('dispose').onclick = () => { void guarded(async () => { disposeAtlas(); element('status').textContent = 'Atlas disposed; renderer remains active.'; }); };
element('cycle').onclick = () => { void guarded(async () => {
  for (let i = 0; i < 3; i++) {
    disposeAtlas(); renderer.dispose();
    const afterDispose = resourceSnapshot(), liveBitmapsAfterDispose = createdBitmaps - closedBitmaps;
    renderer = new FourViews(canvas, panes, level); await loadAtlas(); renderer.render(world, 0);
    lifecycle.push({ cycle: lifecycle.length + 1, afterDispose, afterReload: resourceSnapshot(), liveBitmapsAfterDispose });
  }
  const assessment = report().lifecycleAssessment;
  element('status').textContent = `Completed 3 renderer/atlas load-dispose cycles. Resource check: ${assessment.resourceCheck}.`;
}); };
element('benchmark').onclick = () => { void guarded(async () => {
  const warmupMs = Number(element<HTMLInputElement>('warmup').value), durationMs = Number(element<HTMLInputElement>('duration').value);
  if (!Number.isInteger(warmupMs) || warmupMs < 100 || warmupMs > 5000 || !Number.isInteger(durationMs) || durationMs < 500 || durationMs > 10000) throw new Error('Warm-up must be 100–5000 ms; sample must be 500–10000 ms, both integers.');
  if (!bitmap) throw new Error('Load the synthetic atlas before comparison.');
  element('status').textContent = 'Measuring current renderer baseline…';
  const baseline = await measure('current-renderer', warmupMs, durationMs);
  element('status').textContent = 'Measuring current renderer plus synthetic overlay…';
  const overlay = await measure('current-renderer-plus-canvas-overlay', warmupMs, durationMs);
  comparison = { baseline, overlay }; showOverlay = true;
  element('status').textContent = 'Comparison complete. Review validity and environment before interpreting timings.';
}); };
element('export').onclick = () => {
  updateReport(); const url = URL.createObjectURL(new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'synthetic-render-measurement.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.addEventListener('visibilitychange', () => { if (document.hidden) activeRun?.invalidReasons.add('Document hidden during measurement.'); });
window.addEventListener('resize', () => { activeRun?.invalidReasons.add('Viewport resized during measurement.'); });
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); contextLost = true; activeRun?.invalidReasons.add('WebGL context lost.'); element('error').textContent = 'WebGL context lost; reload preview before measuring.';
});
window.addEventListener('pagehide', () => { disposeAtlas(); renderer.dispose(); });
await guarded(async () => { await loadAtlas(); renderer.render(world, 0); element('status').textContent = 'Ready: synthetic atlas and four-view renderer loaded.'; });
requestAnimationFrame(frame);
