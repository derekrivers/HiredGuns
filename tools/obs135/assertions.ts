// Node-side definitions for a future separately admitted QA harness. No file reads,
// UI actions, retries, timers, browser launch, source values, or timeout changes.
import assert from 'node:assert/strict';
import type { createObserver, DeepRead, InstalledState, Observation } from './runtime';

type Installed = ReturnType<ReturnType<typeof createObserver>['port']['observer']['readInstalled']>;
type Journal = DeepRead<{ complete: boolean; throughSequence: number; records: Observation[] }>;

function validateJournal(journal: Journal, snapshots: Installed[]) {
  assert.equal(journal.complete, true, 'Incomplete observer evidence cannot pass');
  let sequence = 0, at = -Infinity;
  const documentId = snapshots[0]!.documentId;
  for (const record of journal.records) {
    assert.equal(record.documentId, documentId);
    assert.equal(record.sequence, ++sequence, 'A complete journal must start at sequence one without gaps');
    assert.ok(record.at >= at); at = record.at;
  }
  assert.equal(sequence, journal.throughSequence);
  for (const snapshot of snapshots) {
    assert.equal(snapshot.documentId, documentId);
    assert.ok(snapshot.throughSequence <= sequence);
  }
}

/** Definition only. QA supplies the entire independently sealed tick-zero pair. */
export function assertRetrySupersession(input: {
  restoreId: number; retryId: number; journal: Journal;
  beforeRelease: Installed; afterSettlement: Installed;
  expectedTickZeroPair: DeepRead<InstalledState['pair']>;
  engineOutcome: 'fulfilled' | 'rejected';
}): void {
  const { restoreId, retryId, journal, beforeRelease, afterSettlement, expectedTickZeroPair, engineOutcome } = input;
  validateJournal(journal, [beforeRelease, afterSettlement]);
  assert.notEqual(restoreId, retryId);
  const rows = (op: number, kind: string) => journal.records.filter(record => record.operation === op && record.kind === kind);
  const one = (op: number, kind: string) => { const found = rows(op, kind); assert.equal(found.length, 1, `Expected one ${kind} for operation ${op}`); return found[0]!; };
  const startA = one(restoreId, 'start'), startB = one(retryId, 'start');
  assert.equal(startA.action, 'restore'); assert.equal(startB.action, 'retry');
  assert.ok(startB.generation > startA.generation);
  const engine = one(restoreId, 'engine-settled'), held = one(restoreId, 'held'), released = one(restoreId, 'released');
  assert.equal(engine.outcome, engineOutcome);
  assert.equal(held.point, 'delivery'); assert.equal(released.point, 'delivery'); assert.equal(held.ticket, released.ticket);
  assert.ok(startA.sequence < engine.sequence && engine.sequence < held.sequence && held.sequence < startB.sequence);
  const cancel = one(restoreId, 'cancel-request'); assert.equal(cancel.successor, retryId);
  const writeB = one(retryId, 'pair-write'), settledB = one(retryId, 'settled'), returnedB = one(retryId, 'handler-return');
  assert.equal(writeB.result, 'committed'); assert.equal(writeB.revision, beforeRelease.revision);
  assert.equal(returnedB.result, 'returned');
  assert.equal(settledB.outcome, 'success'); assert.equal(settledB.handlerPromise, 'synchronous'); assert.equal(settledB.installedRevision, null);
  assert.ok(startB.sequence < writeB.sequence && writeB.sequence < returnedB.sequence && returnedB.sequence < settledB.sequence);
  assert.ok(settledB.sequence <= beforeRelease.throughSequence && beforeRelease.throughSequence < released.sequence);
  const recognized = one(restoreId, 'cancel-recognized'), discard = one(restoreId, 'discard'), settledA = one(restoreId, 'settled');
  assert.equal(recognized.site, engineOutcome === 'fulfilled' ? 'install-guard' : 'error-guard');
  assert.equal(discard.reason, 'superseded'); assert.equal(discard.candidateProduced, engineOutcome === 'fulfilled');
  assert.equal(settledA.outcome, 'superseded'); assert.equal(settledA.handlerPromise, 'fulfilled'); assert.equal(settledA.installedRevision, null);
  assert.ok(released.sequence < recognized.sequence && recognized.sequence < discard.sequence && discard.sequence < settledA.sequence);
  assert.ok(settledA.sequence <= afterSettlement.throughSequence);
  assert.deepEqual(rows(restoreId, 'install'), []); assert.deepEqual(rows(restoreId, 'pair-write'), []);
  assert.deepEqual(rows(retryId, 'install'), []);
  assert.deepEqual(journal.records.filter(record => record.operation === restoreId && record.sequence >= startB.sequence && record.kind === 'effect' && record.applied === true), []);
  assert.deepEqual(journal.records.filter(record => record.kind === 'effect' && record.target === 'download' && record.applied === true), []);
  assert.equal(expectedTickZeroPair.world.tick, 0);
  assert.deepEqual(beforeRelease.pair, expectedTickZeroPair, 'Compare the entire independent session/world pair');
  assert.deepEqual(afterSettlement.pair, expectedTickZeroPair);
  assert.equal(beforeRelease.presentation.paused, true); assert.equal(afterSettlement.presentation.paused, true);
  assert.equal(beforeRelease.presentation.loading, false); assert.equal(afterSettlement.presentation.loading, false);
  assert.equal(afterSettlement.revision, beforeRelease.revision);
  assert.equal(afterSettlement.generation, beforeRelease.generation);
  assert.deepEqual(afterSettlement.level, beforeRelease.level);
  assert.deepEqual(afterSettlement.presentation, beforeRelease.presentation);
}

/** Errors after the first installed write are expressly excluded from this predicate. */
export function assertPreWriteFailure(input: { restoreId: number; journal: Journal; before: Installed; after: Installed }): void {
  const { restoreId, journal, before, after } = input;
  validateJournal(journal, [before, after]);
  const owned = journal.records.filter(row => row.operation === restoreId);
  assert.equal(owned.filter(row => row.kind === 'start' && row.action === 'restore').length, 1);
  assert.equal(owned.filter(row => row.kind === 'settled' && row.outcome === 'error' && row.installedRevision === null).length, 1);
  assert.ok(owned.some(row => row.kind === 'failure' && ['pre-import','importer','pre-write'].includes(String(row.stage))));
  assert.deepEqual(owned.filter(row => ['pair-write','install'].includes(row.kind)), []);
  assert.deepEqual(after.pair, before.pair); assert.deepEqual(after.level, before.level);
  assert.equal(after.revision, before.revision);
  assert.equal(after.presentation.loading, false);
  // Exact native error/control expectations and independent zero-download monitoring
  // remain QA harness requirements; this predicate never substitutes a HUD-only check.
}
