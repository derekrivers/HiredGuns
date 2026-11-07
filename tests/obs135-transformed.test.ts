import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { createThreePlayerLevel, createThreePlayerSession, stepThreePlayerSession, THREE_PLAYER_PROFILE } from '../src/sim/three-player-mission';
import { createObserver } from '../tools/obs135/runtime';
import { transformInput } from '../tools/obs135/plugin';
import { assertPreWriteFailure, assertRetrySupersession } from '../tools/obs135/assertions';

// Execute only extracted, transformed handlers/functions with synthetic state and
// substituted DOM/render/import boundaries. No main module, browser or game load.
const source = readFileSync('src/main.ts', 'utf8');
const transformed = transformInput(source, 'src/main.ts');
const file = ts.createSourceFile('main.ts', transformed.code, ts.ScriptTarget.Latest, true);
function statement(predicate: (node: ts.Statement) => boolean) {
  const matches = file.statements.filter(predicate);
  expect(matches).toHaveLength(1);
  return matches[0]!.getText(file);
}
const registration = statement(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(file) === '__obs'));
const functions = ['installLevel', 'installThreePlayer', 'corpseRecoveryControl', 'timeoutRecoveryControl'].map(name => statement(node => ts.isFunctionDeclaration(node) && node.name?.text === name));
const handlers = ['checkpoint-file', 'reset'].map(id => statement(node => ts.isExpressionStatement(node) && node.getText(file).startsWith(`get<`) && node.getText(file).includes(`('${id}').addEventListener(`)));
const ticks: string[] = [];
function findTick(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(file) === 'clock.advance') ticks.push(node.arguments[1]!.getText(file));
  ts.forEachChild(node, findTick);
}
findTick(file); expect(ticks).toHaveLength(1);
const executable = ts.transpileModule([registration, ...functions, ...handlers, `__obs.ready(); return {runtime:__obs,tick:${ticks[0]}};`].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

function harness(mode: 'three-player' | 'checkpoint' | 'selected-party' = 'three-player') {
  const callbacks = new Map<string, (event: unknown) => Promise<void> | void>();
  const controls = new Map<string, { value: string; textContent: string; disabled: boolean; addEventListener: (type: string, callback: (event: unknown) => Promise<void> | void) => void }>();
  const get = (id: string) => {
    if (!controls.has(id)) controls.set(id, { value: '', textContent: '', disabled: false, addEventListener: (_, callback) => { callbacks.set(id, callback); } });
    return controls.get(id)!;
  };
  const noop = () => {};
  const initial = createThreePlayerSession();
  if (mode !== 'three-player') initial.world.tick = 9;
  const assignments: unknown[] = [];
  const env: Record<string, unknown> = {
    loadGeneration: 0, loading: false, paused: true, graphicsLost: false, renderer: null,
    threePlayer: mode === 'three-player' ? initial : null,
    session: mode === 'selected-party' ? { syntheticSelectedParty: true, history: ['before Retry'] } : null,
    world: initial.world, level: createThreePlayerLevel(),
    timeoutRecoveryGeneration: null, corpseRecoveryGeneration: null,
    pendingGateActor: null, pendingDoorAction: 16, pendingStorageActor: null, pendingCorpseActor: null,
    pendingSelectionOperation: null, pendingInventoryOperation: null,
    keys: new Set(), activationKeys: new Set(), events: ['', '', '', ''], app: {},
    router: { assignments, assign: (id: number, value: unknown) => { assignments[id] = value; }, commands: () => [], __obs135CopyRepeat: () => [[0, 12]] },
    clock: { __obs135CopyAccumulator: () => 7 }, presentationDOM: () => ({ syntheticDOM: true }),
    createObserver, get, MAX_SESSION_BYTES: 24576, MAX_CHECKPOINT_BYTES: 16384, THREE_PLAYER_PROFILE,
    TREE_SUPPORT_ID: 'unused-tree', createThreePlayerLevel, createThreePlayerSession, createWorld, stepThreePlayerSession,
    importThreePlayerSession: () => createThreePlayerSession(),
    importCheckpoint: async () => createWorld(createThreePlayerLevel()),
    importTrainingSession: async () => ({ session: { syntheticSelectedParty: true }, world: createWorld(createThreePlayerLevel()) }),
    isTrainingSessionSave: (json: string) => JSON.parse(json).training === true,
    sessionSources: () => ({ syntheticSources: true }),
    resetTrainingInventory: () => ({ syntheticSelectedParty: true, history: [] }), selectedFallLevel: () => false,
    patrolMissionLevel: () => false,
    replaceGateRenderer: noop, showSession: noop, updateLevelInfo: noop, updateHud: noop,
    readPads: () => [], teamDead: () => false, updateMissionHud: noop, refreshEncounterPanel: noop,
    refreshAssignments: noop, setPaused: (value: boolean) => { env.paused = value; },
    errorText: (error: unknown) => error instanceof Error ? error.message : String(error),
    canvas: {}, panes: [], FourViews: class { dispose() {} }, signSource: null, extraDiagnostics: '',
  };
  for (const name of ['rosterPanel', 'inventoryPanel', 'groundPanel', 'gatePanel', 'patrolPanel', 'doorPanel']) env[name] = { refresh: noop };
  for (const name of ['hasInventorySelection', 'hasInventoryWindow', 'hasStoragePickup', 'hasCorpsePickup', 'hasTimeoutProfile', 'hasOwnWetParty']) env[name] = () => false;
  env.pads = [];
  // The with scope supplies only the explicit synthetic boundary above. Lexical
  // locals and the actual transformed assignments retain their native semantics.
  const { runtime, tick } = new Function('env', `with (env) { ${executable} }`)(env) as { runtime: ReturnType<typeof createObserver>; tick: () => void };
  const restore = (json = JSON.stringify({ format: THREE_PLAYER_PROFILE }), text?: () => Promise<string>) => callbacks.get('checkpoint-file')!({ currentTarget: { files: [{ size: json.length, text: text ?? (() => Promise.resolve(json)) }], value: 'selected' } }) as Promise<void>;
  return { env, runtime, initial, get, restore, tick, retry: () => callbacks.get('reset')!(null),
    snapshot: () => runtime.port.observer.readInstalled(), journal: () => runtime.port.observer.readJournal(0) };
}

describe('OBS135 actual transformed data flow with synthetic boundaries', () => {
  it('inventories every installed assignment, including conditional three-player/frame writes', () => {
    const original = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
    const expected: string[] = [], writes: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && ['session', 'world', 'level', 'threePlayer'].includes(node.left.text)) expected.push(node.getText(original));
      ts.forEachChild(node, visit);
    }
    function visitTransformed(node: ts.Node) {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && ['session', 'world', 'level', 'threePlayer'].includes(node.left.text)) {
        expect(ts.isCallExpression(node.parent) && node.parent.expression.getText(file) === '__obs.written').toBe(true);
        writes.push(node.left.text);
      }
      ts.forEachChild(node, visitTransformed);
    }
    visit(original); visitTransformed(file);
    expect(transformed.sites.map(site => site.text)).toEqual(expected);
    expect(writes).toHaveLength(expected.length);
    expect(writes.filter(name => name === 'threePlayer')).toHaveLength(6);
  });

  it('delivers and installs the identical sync return before queued microtasks, then settles the outer promise', async () => {
    const h = harness(), candidate = createThreePlayerSession();
    const order: string[] = [];
    h.env.importThreePlayerSession = () => { order.push('import'); queueMicrotask(() => order.push('microtask')); return candidate; };
    h.env.showSession = () => {
      order.push('installed');
      expect(h.env.threePlayer).toBe(candidate); expect(h.env.world).toBe(candidate.world);
      expect(h.journal().records.some(row => row.kind === 'settled')).toBe(false);
    };
    await h.restore();
    expect(order).toEqual(['import', 'installed', 'microtask']);
    const after = h.snapshot();
    expect(after).toMatchObject({ revision: 1, pair: { threePlayer: candidate, world: candidate.world, session: null }, presentation: { routerRepeat: [[0, 12]], clockAccumulator: 7, loading: false } });
    candidate.history.push({ count: 1, commands: [], deaths: [] }); candidate.world.tick = 99;
    expect(after.pair.world.tick).toBe(0); expect(Object.isFrozen(after.pair.threePlayer!.history)).toBe(true);
    expect(after.pair.threePlayer!.history).toEqual([]);
    const rows = h.journal().records;
    expect(rows.filter(row => row.kind === 'engine-settled')).toMatchObject([{ mode: 'synchronous', outcome: 'fulfilled' }]);
    const delivery = rows.find(row => row.phase === 'handler-delivery')!;
    const write = rows.find(row => row.kind === 'pair-write')!, install = rows.find(row => row.kind === 'install')!;
    expect(delivery.sequence).toBeLessThan(write.sequence); expect(write.sequence).toBeLessThan(install.sequence);
    expect(rows.filter(row => row.kind === 'settled')).toMatchObject([{ outcome: 'success', installedRevision: 1, handlerPromise: 'fulfilled' }]);
    expect(rows.filter(row => ['held', 'released', 'discard'].includes(row.kind))).toEqual([]);
  });

  it('preserves the identical synchronous throw and full pre-write state without a microtask gap', async () => {
    const h = harness(), before = h.snapshot(), reason = Error('synthetic sync refusal'), order: string[] = [];
    h.env.importThreePlayerSession = () => { queueMicrotask(() => order.push('microtask')); throw reason; };
    h.env.errorText = (error: unknown) => { expect(error).toBe(reason); order.push('caught'); return 'synthetic refusal'; };
    await h.restore();
    expect(order).toEqual(['caught', 'microtask']);
    assertPreWriteFailure({ restoreId: 1, before, after: h.snapshot(), journal: h.journal() });
    expect(h.journal().records.find(row => row.kind === 'discard')).toMatchObject({ candidateProduced: false });
    expect(h.journal().records.find(row => row.kind === 'engine-settled')).toMatchObject({ outcome: 'rejected', mode: 'synchronous' });
  });

  it.each(['return', 'throw'] as const)('retains the generation guard after synchronous importer %s', async outcome => {
    const h = harness(), before = h.snapshot();
    h.env.importThreePlayerSession = () => { h.env.loadGeneration = 2; if (outcome === 'throw') throw Error('synthetic stale refusal'); return createThreePlayerSession(); };
    await h.restore();
    expect(h.snapshot().pair).toEqual(before.pair); expect(h.snapshot().revision).toBe(0);
    expect(h.journal().records.filter(row => row.kind === 'cancel-recognized')).toMatchObject([{ site: outcome === 'return' ? 'install-guard' : 'error-guard' }]);
    expect(h.journal().records.filter(row => row.kind === 'settled')).toMatchObject([{ outcome: 'superseded', installedRevision: null }]);
    expect(h.journal().records.filter(row => ['pair-write', 'install'].includes(row.kind))).toEqual([]);
    expect(h.journal().records.filter(row => row.kind === 'discard')).toMatchObject([{ candidateProduced: outcome === 'return' }]);
  });

  it('does not enter the synchronous importer after pre-import generation supersession', async () => {
    const h = harness(); let calls = 0;
    h.env.importThreePlayerSession = () => { calls++; return createThreePlayerSession(); };
    await h.restore(undefined, async () => { h.env.loadGeneration = 2; return JSON.stringify({ format: THREE_PLAYER_PROFILE }); });
    expect(calls).toBe(0);
    expect(h.journal().records.filter(row => row.kind === 'cancel-recognized')).toMatchObject([{ site: 'pre-import' }]);
  });

  it.each(['return', 'throw'] as const)('fails evidence closed for an async-only ticket on synchronous %s, preserving product delivery', async outcome => {
    const h = harness(), candidate = createThreePlayerSession(), reason = Error('sync ticket refusal');
    const ticket = h.runtime.port.scheduler.armNextRestore('delivery');
    h.env.importThreePlayerSession = () => { if (outcome === 'throw') throw reason; return candidate; };
    h.env.errorText = (error: unknown) => { expect(error).toBe(reason); return 'refusal'; };
    await h.restore();
    expect(h.env.threePlayer).toBe(outcome === 'return' ? candidate : h.initial);
    expect(h.journal().complete).toBe(false);
    expect(h.journal().records.filter(row => ['held', 'released'].includes(row.kind))).toEqual([]);
    expect(() => h.snapshot()).toThrow(); expect(() => h.runtime.port.scheduler.release(ticket)).toThrow();
  });

  it('tracks the full three-player Retry installation as one transaction including nested installLevel', () => {
    const h = harness(); const before = h.snapshot();
    expect(h.retry()).toBeUndefined();
    const after = h.snapshot();
    expect(after.revision).toBe(before.revision + 1);
    expect(after.pair.threePlayer).toEqual(createThreePlayerSession());
    expect(after.pair.threePlayer!.world).toBe(after.pair.world);
    expect(h.env.threePlayer).not.toBe(h.initial);
    expect(h.journal().records.filter(row => row.kind === 'pair-write')).toMatchObject([{ operation: 1, revision: 1, result: 'committed' }]);
    expect(h.journal().records.filter(row => row.kind === 'settled')).toMatchObject([{ outcome: 'success', handlerPromise: 'synchronous' }]);
    expect(after.presentation.assignments).toEqual([{ kind: 'keyboard', index: 0 }, { kind: 'keyboard', index: 1 }, { kind: 'keyboard', index: 2 }, null]);
  });

  it('tracks conditional three-player and world writes together in the actual frame callback', () => {
    const h = harness(), expected = stepThreePlayerSession(h.initial, []);
    h.tick();
    const after = h.snapshot();
    expect(after.pair.threePlayer).toEqual(expected.session);
    expect(after.pair.world).toEqual(expected.world);
    expect(after.pair.threePlayer!.world).toBe(after.pair.world);
    expect(after.revision).toBe(1);
    expect(h.journal().records.filter(row => row.kind === 'pair-write')).toMatchObject([{ revision: 1, result: 'committed' }]);
    // Once a bounded restore/retry starts, the same unowned frame fails closed.
    h.retry(); h.tick(); expect(h.journal().complete).toBe(false);
  });

  it.each(['checkpoint', 'selected-party'] as const)('preserves the legacy async %s delivery and full candidate installation', async kind => {
    const h = harness('checkpoint');
    const candidateWorld = createWorld(createThreePlayerLevel()), candidateSession = { syntheticSelectedParty: true };
    let resolve!: (value: unknown) => void;
    const promise = new Promise(yes => { resolve = yes; });
    h.env[kind === 'checkpoint' ? 'importCheckpoint' : 'importTrainingSession'] = () => promise;
    const pending = h.restore(JSON.stringify({ training: kind === 'selected-party', version: 23 }));
    await Promise.resolve(); expect(h.snapshot().revision).toBe(0);
    resolve(kind === 'checkpoint' ? candidateWorld : { session: candidateSession, world: candidateWorld });
    await pending;
    expect(h.env.world).toBe(candidateWorld); expect(h.env.session).toBe(kind === 'checkpoint' ? null : candidateSession);
    expect(h.snapshot().pair.threePlayer).toBeNull(); expect(h.snapshot().revision).toBe(1);
    expect(h.journal().records.filter(row => row.kind === 'install')).toHaveLength(1);
  });

  it.each([
    ['checkpoint', 'fulfilled'], ['checkpoint', 'rejected'],
    ['selected-party', 'fulfilled'], ['selected-party', 'rejected'],
  ] as const)('retains actual async %s %s held delivery through its reachable Retry branch', async (kind, outcome) => {
    const h = harness(kind);
    // Establish the full expected reset pair before invoking either operation.
    const expectedTickZeroPair = {
      session: kind === 'selected-party' ? { syntheticSelectedParty: true, history: [] } : null,
      world: createWorld(createThreePlayerLevel(), undefined, h.initial.world.mission.rules), threePlayer: null,
    };
    let resets = 0;
    h.env.resetTrainingInventory = (session: unknown, level: unknown, rules: unknown) => {
      expect(session).toBe(h.env.session); expect(level).toBe(h.env.level); expect(rules).toBe(h.initial.world.mission.rules);
      resets++; return structuredClone(expectedTickZeroPair.session);
    };
    const ticket = h.runtime.port.scheduler.armNextRestore('delivery');
    h.env[kind === 'checkpoint' ? 'importCheckpoint' : 'importTrainingSession'] = () => outcome === 'fulfilled'
      ? Promise.resolve(kind === 'checkpoint' ? createWorld(createThreePlayerLevel()) : { session: { restored: true }, world: createWorld(createThreePlayerLevel()) })
      : Promise.reject(Error('synthetic legacy refusal'));
    const pending = h.restore(JSON.stringify({ training: kind === 'selected-party', version: 23 }));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(h.journal().records.filter(row => row.kind === 'held')).toHaveLength(1);
    h.retry(); const beforeRelease = h.snapshot();
    expect(resets).toBe(kind === 'selected-party' ? 1 : 0);
    h.runtime.port.scheduler.release(ticket); await pending;
    // The extracted handlers deliberately use a synthetic session at the import
    // boundary; this assertion compares it structurally without simulating it.
    assertRetrySupersession({ restoreId: 1, retryId: 2, journal: h.journal(), beforeRelease, afterSettlement: h.snapshot(), expectedTickZeroPair: expectedTickZeroPair as unknown as Parameters<typeof assertRetrySupersession>[0]['expectedTickZeroPair'], engineOutcome: outcome });
  });

  it.each([19, 23])('keeps version %s recovery callbacks owned by the restore across selected-party Retry', async version => {
    const h = harness('selected-party');
    const expectedTickZeroPair = {
      session: { syntheticSelectedParty: true, history: [] },
      world: createWorld(createThreePlayerLevel(), undefined, h.initial.world.mission.rules), threePlayer: null,
    };
    let control!: { isCurrent: () => boolean; onProgress: (progress: { phase: string; processed: number; total: number }) => void };
    let resolve!: (value: unknown) => void;
    h.env.importTrainingSession = (_level: unknown, _sources: unknown, _json: string, recovery: typeof control) => {
      control = recovery; return new Promise(yes => { resolve = yes; });
    };
    let hudUpdates = 0;
    h.env.updateMissionHud = () => { hudUpdates++; };
    const pending = h.restore(JSON.stringify({ training: true, version }));
    await Promise.resolve();
    expect(control.isCurrent()).toBe(true);
    expect(h.env.corpseRecoveryGeneration).toBe(version === 23 ? 1 : null);
    control.onProgress({ phase: 'verifying', processed: 0, total: 12 });
    expect(h.get('recovery-status').textContent).toContain('Verifying all recovery sources');
    expect(h.env.timeoutRecoveryGeneration).toBe(1); expect(hudUpdates).toBe(1);
    expect(h.journal().records.filter(row => row.kind === 'progress')).toMatchObject([{ operation: 1, generation: 1, currentGeneration: 1, phase: 'verifying' }]);
    h.retry();
    const afterRetry = h.snapshot(), frontier = h.journal().throughSequence;
    expect(afterRetry.pair).toEqual(expectedTickZeroPair);
    expect(control.isCurrent()).toBe(false);
    const progressFrontier = h.journal().throughSequence;
    control.onProgress({ phase: 'replaying', processed: 6, total: 12 });
    expect(h.snapshot().presentation).toEqual(afterRetry.presentation); expect(hudUpdates).toBe(1);
    const stale = h.journal().records.filter(row => row.sequence > frontier);
    expect(stale.filter(row => row.kind === 'cancel-recognized')).toMatchObject([{ operation: 1, generation: 1, currentGeneration: 2, site: 'engine-check' }]);
    expect(stale.filter(row => row.kind === 'progress')).toMatchObject([{ operation: 1, generation: 1, currentGeneration: 2, phase: 'replaying', processed: 6 }]);
    // engineCurrent separately records the suppressed effect classes. Require
    // the progress callback itself to emit its two guarded effects as well.
    expect(stale.filter(row => row.sequence > progressFrontier && row.kind === 'effect')).toMatchObject([
      { operation: 1, generation: 1, currentGeneration: 2, target: 'status', applied: false },
      { operation: 1, generation: 1, currentGeneration: 2, target: 'controls', applied: false },
    ]);
    expect(stale.filter(row => row.kind === 'effect' && row.applied === true)).toEqual([]);
    resolve({ session: { restored: true }, world: createWorld(createThreePlayerLevel()) }); await pending;
    const after = h.snapshot();
    expect(after.pair).toEqual(expectedTickZeroPair); expect(after.revision).toBe(afterRetry.revision);
    expect(after.presentation).toEqual(afterRetry.presentation);
    expect(h.journal().complete).toBe(true);
    expect(h.journal().records.filter(row => row.operation === 1 && ['pair-write', 'install'].includes(row.kind))).toEqual([]);
    expect(h.journal().records.filter(row => row.kind === 'settled')).toMatchObject([
      { operation: 2, outcome: 'success' }, { operation: 1, outcome: 'superseded' },
    ]);
  });
});
