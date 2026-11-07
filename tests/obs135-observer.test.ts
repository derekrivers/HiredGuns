import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { createWorld } from '../src/sim/world';
import { createObserver, detached, type InstalledState } from '../tools/obs135/runtime';
import { insertionInputs, transformInput, type InputPath } from '../tools/obs135/plugin';
import { assertPreWriteFailure, assertRetrySupersession } from '../tools/obs135/assertions';
import testConfig from '../vite.obs135.config';

// Synthetic data only: no browser, importer, replay, file input, private harness or source.
function fixture(capacity?: number) {
  let generation = 0, time = 0;
  const level = createDemoLevel();
  const state: InstalledState = { level, pair: { session: null, world: createWorld(level), threePlayer: null }, presentation: { paused: true, loading: false } };
  const runtime = createObserver({ generation: () => generation, state: () => state, now: () => ++time, documentId: 'synthetic-only', capacity });
  runtime.ready();
  return { runtime, state, advance: () => ++generation,
    journal: () => runtime.port.observer.readJournal(0).records };
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function preWriteFailureEvidence(priorWrite = false) {
  const { runtime, advance, state } = fixture();
  if (priorWrite) runtime.retry(advance(), op => runtime.pair(op, () => runtime.write(1, () => { state.pair.world = createWorld(state.level); })));
  const before = runtime.port.observer.readInstalled();
  const staleBeforeStart = runtime.port.observer.readInstalled();
  const caught = deferred<void>(), cleanup = deferred<void>();
  const pending = runtime.restoreHandler(async (_, context) => {
    const op = context.op = runtime.start('restore', advance());
    try { await runtime.delivery(op, Promise.reject(Error('synthetic native refusal'))); }
    catch (error) { runtime.failure(op, error, 'caught'); }
    caught.resolve(); await cleanup.promise;
  })(null);
  await caught.promise;
  const beforeSettlement = runtime.port.observer.readInstalled();
  cleanup.resolve(); await pending;
  return { restoreId: priorWrite ? 2 : 1, before, after: runtime.port.observer.readInstalled(),
    journal: runtime.port.observer.readJournal(0), staleBeforeStart, beforeSettlement };
}

describe('OBS135 detached state and lifecycle mechanics (synthetic)', () => {
  it('copies complete own graphs, holes, aliases, cycles, optional absence and undefined without retaining references', () => {
    const inventory = [1, 2, undefined, 4]; delete inventory[1];
    const actor = { inventory, extra: { rawHex: 'synthetic' } };
    const state = { actor, alias: actor, self: null as unknown };
    state.self = state;
    const copy = detached(state);
    actor.extra.rawHex = 'changed';
    expect(copy.actor.extra.rawHex).toBe('synthetic');
    expect(copy.actor).toBe(copy.alias);
    expect(copy.self).toBe(copy);
    expect(1 in copy.actor.inventory).toBe(false);
    expect(2 in copy.actor.inventory).toBe(true);
    expect(Object.isFrozen(copy.actor.extra)).toBe(true);
    expect(Reflect.set(copy.actor.extra, 'rawHex', 'write')).toBe(false);
  });
  it('rejects accessors without invoking them and rejects unsupported hidden/symbol/prototype data', () => {
    let invoked = false;
    expect(() => detached({ get field() { invoked = true; return 1; } })).toThrow();
    expect(invoked).toBe(false);
    for (const value of [new Map(), { [Symbol('x')]: 1 }, Object.defineProperty({}, 'hidden', { value: 1 })]) expect(() => detached(value)).toThrow();
  });
  it('reads the actual pair with an independent revision and a non-consuming journal frontier', () => {
    const { runtime, state } = fixture();
    const before = runtime.port.observer.readInstalled();
    runtime.retry(0, op => runtime.pair(op, () => runtime.write(1, () => { state.pair.world = createWorld(state.level); })));
    const after = runtime.port.observer.readInstalled();
    expect(after.revision).toBe(before.revision + 1);
    expect(after.pair.world.tick).toBe(before.pair.world.tick);
    expect(after.generation).toBe(before.generation);
    expect(runtime.port.observer.readJournal(after.throughSequence).records).toEqual([]);
    expect(runtime.port.observer.readInstalled().throughSequence).toBe(after.throughSequence);
  });
  it('waits for the real outer promise, retaining caught pre-write error and prior pair/revision', async () => {
    const { runtime, advance, journal } = fixture();
    const outer = deferred<void>(), native = Error('synthetic native refusal');
    const before = runtime.port.observer.readInstalled();
    const handler = runtime.restoreHandler(async (_event, context) => {
      const op = context.op = runtime.start('restore', advance());
      try { await runtime.delivery(op, Promise.reject(native)); }
      catch (error) { expect(error).toBe(native); runtime.failure(op, error, 'caught'); }
      await outer.promise; // Models real outer cleanup rather than idle UI.
    });
    const pending = handler(null);
    await Promise.resolve(); await Promise.resolve();
    expect(journal().some(row => row.kind === 'settled')).toBe(false);
    outer.resolve(); await pending;
    expect(journal().filter(row => row.kind === 'settled')).toMatchObject([{ outcome: 'error', handlerPromise: 'fulfilled', installedRevision: null }]);
    const after = runtime.port.observer.readInstalled();
    expect(after.revision).toBe(before.revision);
    expect(after.pair).toEqual(before.pair);
    assertPreWriteFailure({restoreId:1,journal:runtime.port.observer.readJournal(0),before,after});
  });
  it('rejects pre-write snapshots that do not bracket the exact Restore lifecycle', async () => {
    const evidence = await preWriteFailureEvidence();
    assertPreWriteFailure(evidence);
    expect(() => assertPreWriteFailure({...evidence,after:evidence.staleBeforeStart})).toThrow();
    expect(() => assertPreWriteFailure({...evidence,after:evidence.beforeSettlement})).toThrow();
    expect(() => assertPreWriteFailure({...evidence,before:evidence.beforeSettlement})).toThrow();
  });
  it('rejects pre-write snapshots and terminal records belonging to another generation', async () => {
    const evidence = await preWriteFailureEvidence();
    expect(() => assertPreWriteFailure({...evidence,before:{...evidence.before,generation:evidence.before.generation+1}})).toThrow();
    expect(() => assertPreWriteFailure({...evidence,after:{...evidence.after,generation:evidence.after.generation+1}})).toThrow();
    const records = evidence.journal.records.map(row => row.kind === 'settled' ? {...row,currentGeneration:row.currentGeneration+1} : row);
    expect(() => assertPreWriteFailure({...evidence,journal:{...evidence.journal,records}})).toThrow();
  });
  it('rejects an additional terminal record instead of selecting only an error terminal', async () => {
    const evidence = await preWriteFailureEvidence();
    const records = evidence.journal.records.map(row => row.kind === 'engine-settled' ? {...row,kind:'settled',outcome:'success',installedRevision:null} : row);
    expect(() => assertPreWriteFailure({...evidence,journal:{...evidence.journal,records}})).toThrow();
  });
  it('preserves the full pair at a nonzero revision and generation', async () => {
    const evidence = await preWriteFailureEvidence(true);
    assertPreWriteFailure(evidence);
    const after = {...evidence.after,pair:{...evidence.after.pair,world:{...evidence.after.pair.world,rng:evidence.after.pair.world.rng+1}}};
    expect(() => assertPreWriteFailure({...evidence,after})).toThrow();
  });
  it('accepts a pre-import failure whose actual outer handler rejects', async () => {
    const { runtime, advance } = fixture();
    const before = runtime.port.observer.readInstalled(), reason = Error('synthetic pre-import refusal');
    const pending = runtime.restoreHandler(async (_, context) => {
      context.op = runtime.start('restore', advance()); throw reason;
    })(null);
    await expect(pending).rejects.toBe(reason);
    assertPreWriteFailure({restoreId:1,journal:runtime.port.observer.readJournal(0),before,after:runtime.port.observer.readInstalled()});
  });
  it('rejects mismatched documents, forged revisions and invalid snapshot frontiers', async () => {
    const evidence = await preWriteFailureEvidence();
    expect(() => assertPreWriteFailure({...evidence,after:{...evidence.after,documentId:'another-document'}})).toThrow();
    expect(() => assertPreWriteFailure({...evidence,before:{...evidence.before,revision:1},after:{...evidence.after,revision:1}})).toThrow();
    for (const throughSequence of [-1, 0.5, NaN, evidence.journal.throughSequence + 1]) {
      expect(() => assertPreWriteFailure({...evidence,before:{...evidence.before,throughSequence}})).toThrow();
      expect(() => assertPreWriteFailure({...evidence,after:{...evidence.after,throughSequence}})).toThrow();
    }
  });
  it('rejects duplicate starts, unordered lifecycle records and stale failure ownership', async () => {
    const evidence = await preWriteFailureEvidence();
    for (const replacement of [
      {kind:'start',action:'retry'},
      {kind:'failure',stage:'importer',generation:evidence.after.generation+1},
    ]) {
      const records = evidence.journal.records.map(row => row.kind === 'engine-settled' ? {...row,...replacement} : row);
      expect(() => assertPreWriteFailure({...evidence,journal:{...evidence.journal,records}})).toThrow();
    }
    const records = [...evidence.journal.records].reverse().map((row, index) => ({...row,sequence:index+1,at:index+1}));
    expect(() => assertPreWriteFailure({...evidence,journal:{...evidence.journal,records}})).toThrow();
  });
  it.each(['fulfilled', 'rejected'] as const)('holds identical genuine %s delivery through synchronous Retry supersession', async kind => {
    const { runtime, advance, journal, state } = fixture();
    const ticket = runtime.port.scheduler.armNextRestore('delivery');
    const value = { world: createWorld(state.level) }, reason = Error('native synthetic rejection');
    const gate = deferred<typeof value>();
    let received: unknown;
    const handler = runtime.restoreHandler(async (_event, context) => {
      const op = context.op = runtime.start('restore', advance());
      try {
        received = await runtime.delivery(op, gate.promise);
        if (op.generation === runtime.port.observer.readInstalled().generation) throw Error('unexpected test schedule');
        runtime.recognized(op, 'install-guard');
      } catch (error) { received = error; runtime.failure(op, error, 'caught'); runtime.recognized(op, 'error-guard'); }
    });
    const pending = handler(null);
    if (kind === 'fulfilled') gate.resolve(value); else gate.reject(reason);
    await Promise.resolve(); await Promise.resolve();
    expect(journal().filter(row => row.kind === 'held')).toMatchObject([{ operation: 1, ticket }]);
    expect(() => runtime.port.scheduler.release(ticket + 1)).toThrow();
    runtime.retry(advance(), op => runtime.pair(op, () => runtime.write(1, () => { state.pair.world = createWorld(state.level); })));
    const beforeRelease = runtime.port.observer.readInstalled();
    expect(journal().filter(row => row.kind === 'settled')).toMatchObject([{ operation: 2, outcome: 'success', handlerPromise: 'synchronous', installedRevision: null }]);
    runtime.port.scheduler.release(ticket);
    expect(() => runtime.port.scheduler.release(ticket)).toThrow();
    await pending;
    expect(received).toBe(kind === 'fulfilled' ? value : reason);
    expect(journal().filter(row => row.kind === 'settled')).toMatchObject([
      { operation: 2 }, { operation: 1, outcome: 'superseded', handlerPromise: 'fulfilled', installedRevision: null },
    ]);
    expect(journal().find(row => row.kind === 'discard')).toMatchObject({ candidateProduced: kind === 'fulfilled' });
    expect(journal().some(row => row.kind === 'install')).toBe(false);
    const after = runtime.port.observer.readInstalled();
    expect(after.pair).toEqual(beforeRelease.pair); expect(after.revision).toBe(beforeRelease.revision);
    const settled = journal().filter(row => row.kind === 'settled');
    expect(settled[0]!.sequence).toBeLessThan(settled[1]!.sequence);
    const definition = {restoreId:1,retryId:2,journal:runtime.port.observer.readJournal(0),beforeRelease,afterSettlement:after,expectedTickZeroPair:beforeRelease.pair,engineOutcome:kind};
    assertRetrySupersession(definition);
    const differentFullPair = {...beforeRelease.pair,world:{...beforeRelease.pair.world,rng:beforeRelease.pair.world.rng+1}};
    expect(() => assertRetrySupersession({...definition,expectedTickZeroPair:differentFullPair})).toThrow();
  });
  it('preserves completed install on a later caught failure; no rollback or clean discard', async () => {
    const { runtime, state, advance, journal } = fixture();
    await runtime.restoreHandler(async (_, context) => {
      const op = context.op = runtime.start('restore', advance());
      await runtime.delivery(op, Promise.resolve({}));
      runtime.pair(op, () => runtime.write(1, () => { state.pair.world = { ...state.pair.world, tick: 12 }; }), true);
      runtime.failure(op, Error('post-commit synthetic presentation failure'), 'caught');
    })(null);
    expect(runtime.port.observer.readInstalled().pair.world.tick).toBe(12);
    expect(journal().filter(row => row.kind === 'settled')).toMatchObject([{ outcome: 'error', installedRevision: 1 }]);
    expect(journal().filter(row => row.kind === 'discard')).toEqual([]);
  });
  it('increments revision once for partial writes and preserves the same synchronous Retry throw', () => {
    const { runtime, state, advance, journal } = fixture();
    const reason = Error('after first write');
    try {
      runtime.retry(advance(), op => runtime.pair(op, () => {
        runtime.write(1, () => { state.pair.world = { ...state.pair.world, tick: 7 }; });
        throw reason;
      }));
    } catch (error) { expect(error).toBe(reason); }
    expect(runtime.port.observer.readInstalled()).toMatchObject({ revision: 1, pair: { world: { tick: 7 } } });
    expect(journal().find(row => row.kind === 'pair-write')).toMatchObject({ revision: 1, result: 'partial-failure' });
    expect(journal().find(row => row.kind === 'handler-return')).toMatchObject({ result: 'threw' });
    expect(journal().find(row => row.kind === 'settled')).toMatchObject({ outcome: 'error', handlerPromise: 'synchronous', installedRevision: null });
  });
  it('does not count a failed RHS as a write', () => {
    const { runtime, advance } = fixture();
    expect(() => runtime.retry(advance(), op => runtime.pair(op, () => runtime.write(1, () => { throw Error('before assignment'); })))).toThrow();
    expect(runtime.port.observer.readInstalled().revision).toBe(0);
  });
  it('retains installation and the identical rejection after a real outer cleanup throw', async () => {
    const { runtime, state, advance, journal } = fixture();
    const reason = Error('synthetic cleanup failure');
    const pending = runtime.restoreHandler(async (_, context) => {
      const op = context.op = runtime.start('restore', advance());
      await runtime.delivery(op, Promise.resolve({}));
      runtime.pair(op, () => runtime.write(1, () => { state.pair.world = {...state.pair.world,tick:9}; }), true);
      op.stage = 'cleanup'; throw reason;
    })(null);
    await expect(pending).rejects.toBe(reason);
    expect(journal().find(row => row.kind === 'settled')).toMatchObject({outcome:'error',handlerPromise:'rejected',installedRevision:1});
    expect(journal().find(row => row.kind === 'failure')).toMatchObject({stage:'cleanup',disposition:'propagating'});
    expect(runtime.port.observer.readInstalled()).toMatchObject({revision:1,pair:{world:{tick:9}}});
  });
  it('consumes a bound ticket when the admitted handler ends before delivery', async () => {
    const { runtime, advance } = fixture();
    const ticket = runtime.port.scheduler.armNextRestore('delivery');
    await runtime.restoreHandler(async (_, context) => { context.op = runtime.start('restore', advance()); runtime.failure(context.op, Error('early'), 'caught'); })(null);
    expect(() => runtime.port.scheduler.release(ticket)).toThrow();
    expect(runtime.port.scheduler.armNextRestore('delivery')).toBe(ticket + 1);
  });
  it('invalidates uncovered writers, capacity exhaustion, and unsupported snapshot data', () => {
    const { runtime, advance } = fixture();
    runtime.retry(advance(), () => {});
    runtime.write(99, () => 1);
    expect(runtime.port.observer.readJournal(0).complete).toBe(false);
    expect(() => runtime.port.observer.readInstalled()).toThrow();
    const small = fixture(1);
    small.runtime.retry(0, () => {});
    expect(small.runtime.port.observer.readJournal(0).complete).toBe(false);
    const unsupported = fixture();
    unsupported.state.presentation.bad = new Map();
    expect(() => unsupported.runtime.port.observer.readInstalled()).toThrow();
    expect(unsupported.runtime.port.observer.readJournal(0).complete).toBe(false);
  });
  it('fault cleanup forwards held genuine data once without synthesizing settlement', async () => {
    const { runtime, advance, journal } = fixture();
    runtime.port.scheduler.armNextRestore('delivery');
    const value = { actual: 'synthetic' };
    let received: unknown;
    const pending = runtime.restoreHandler(async (_, context) => {
      const op = context.op = runtime.start('restore', advance());
      received = await runtime.delivery(op, Promise.resolve(value));
    })(null);
    await Promise.resolve(); await Promise.resolve();
    expect(journal().some(row => row.kind === 'held')).toBe(true);
    runtime.invalidate(); await pending;
    expect(received).toBe(value);
    expect(runtime.port.observer.readJournal(0).complete).toBe(false);
    expect(journal().some(row => row.kind === 'settled')).toBe(false);
  });
  it('has no fabricated settlement on teardown and rejects invalid cursors', () => {
    const { runtime, advance } = fixture();
    runtime.start('restore', advance()); runtime.dispose();
    expect(runtime.port.observer.readJournal(0)).toMatchObject({ complete: false, records: [] });
    for (const cursor of [-1, NaN, 0.5, 100]) expect(() => runtime.port.observer.readJournal(cursor)).toThrow();
  });
});

describe('OBS135 isolated insertion graph (static, no application execution)', () => {
  const sources = () => (Object.keys(insertionInputs) as InputPath[]).map(path => ({path, ...transformInput(readFileSync(path, 'utf8'), path)}));
  it('refuses unpinned source instead of guessing insertion points', () => {
    expect(() => transformInput(readFileSync('src/main.ts','utf8') + '\n', 'src/main.ts')).toThrow(/seal mismatch/);
  });
  it('refuses production build and preview selection without starting a server', () => {
    if (typeof testConfig !== 'function') throw Error('Expected explicit config function');
    expect(() => testConfig({command:'build',mode:'production',isPreview:false})).toThrow();
    expect(() => testConfig({command:'serve',mode:'production',isPreview:true})).toThrow();
  });
  it('instruments actual handler/importer/write sites and includes complete private-class copies', () => {
    const transformed = sources();
    const main = transformed[0]!;
    expect(main.code).toContain('__obs.restoreHandler');
    expect(main.code).toContain('__obs.delivery(__obsOp, importTrainingSession(');
    expect(main.code).toContain('__obs.delivery(__obsOp, importCheckpoint(');
    expect(main.code).toContain('__obs.retry(++loadGeneration');
    expect(main.sites.filter(site => site.kind === 'pair-assignment').length).toBeGreaterThan(50);
    expect(transformed[1]!.code).toContain('[...this.last.entries()]');
    expect(transformed[2]!.code).toContain('return this.accumulator');
    expect(readFileSync('vite.config.ts','utf8')).not.toContain('obs135');
    expect(readFileSync('src/main.ts','utf8')).not.toContain('__OBS135_TEST__');
  });
});
