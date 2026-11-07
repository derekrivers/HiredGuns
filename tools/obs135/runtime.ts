// Imported exclusively by the explicitly selected OBS135 test-server graph.
import type { LevelData, WorldState } from '../../src/contracts';
import type { TrainingSession } from '../../src/sim/training-session';
import type { ThreePlayerSession } from '../../src/sim/three-player-mission';

export type DeepRead<T> = T extends object ? { readonly [K in keyof T]: DeepRead<T[K]> } : T;
export type Outcome = 'success' | 'error' | 'cancelled' | 'superseded';
export type Body = { kind: string; [key: string]: unknown };
export type Observation = Body & {
  sequence: number; at: number; documentId: string;
  operation: number; generation: number; currentGeneration: number;
};
export interface InstalledState {
  pair: { session: TrainingSession | null; world: WorldState; threePlayer: ThreePlayerSession | null };
  level: LevelData;
  presentation: Record<string, unknown>;
}
export interface Operation {
  id: number; generation: number; action: string; candidateProduced: boolean;
  installedRevision: number | null; failed: boolean; stage: string; settled: boolean;
  partialWrite: boolean; cancellationRecognized: boolean;
}
interface Ticket {
  id: number; operation: Operation | null; release: (() => void) | null;
  held: boolean;
}

/** Validate without invoking getters, then clone the whole supported data graph. */
export function detached<T>(value: T): DeepRead<T> {
  const seen = new Set<object>();
  function validate(node: unknown): void {
    if (typeof node === 'function' || typeof node === 'symbol') throw Error('Unsupported observation value');
    if (node === null || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    const proto = Object.getPrototypeOf(node);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) throw Error('Unsupported observation prototype');
    for (const key of Reflect.ownKeys(node)) {
      if (typeof key === 'symbol') throw Error('Unsupported symbol field');
      const descriptor = Object.getOwnPropertyDescriptor(node, key)!;
      if (!('value' in descriptor) || (!descriptor.enumerable && !(Array.isArray(node) && key === 'length'))) throw Error('Unsupported observation descriptor');
      validate(descriptor.value);
    }
  }
  validate(value);
  const copy = structuredClone(value);
  seen.clear();
  function freeze(node: unknown): void {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(node))) freeze(descriptor.value);
    Object.freeze(node);
  }
  freeze(copy);
  return copy as DeepRead<T>;
}

export function createObserver(options: {
  generation: () => number; state: () => InstalledState;
  now?: () => number; documentId?: string; capacity?: number;
}) {
  const documentId = options.documentId ?? crypto.randomUUID();
  const now = options.now ?? (() => performance.now());
  const capacity = options.capacity ?? 100000;
  const records: Observation[] = [], operations = new Map<number, Operation>();
  let sequence = 0, revision = 0, nextOperation = 0, nextTicket = 0;
  let invalid = false, dead = false, time = -Infinity, ready = false;
  let current: Operation | null = null, ticket: Ticket | null = null;
  let transaction: { owner: Operation | null; writes: number } | null = null;
  // Once the bounded race begins, a writer outside the admitted owners invalidates it.
  let bounded = false;
  const timestamp = () => {
    const value = now();
    if (!Number.isFinite(value) || value < time) throw Error('Non-monotonic observation clock');
    time = value; return value;
  };
  function invalidate(): void {
    invalid = true;
    const release = ticket?.release;
    ticket = null;
    release?.(); // Forward the same privately retained result; never manufacture rejection.
  }
  function emit(op: Operation | null, body: Body): void {
    if (!ready || invalid || dead) return;
    try {
      if (records.length >= capacity || !Number.isSafeInteger(sequence + 1)) throw Error('Observation capacity exhausted');
      records.push({ ...body, sequence: ++sequence, at: timestamp(), documentId,
        operation: op?.id ?? 0, generation: op?.generation ?? options.generation(), currentGeneration: options.generation() });
    } catch { invalidate(); }
  }
  function start(action: string, generation: number): Operation {
    const op: Operation = { id: ++nextOperation, generation, action, candidateProduced: false,
      installedRevision: null, failed: false, stage: 'pre-import', settled: false,
      partialWrite: false, cancellationRecognized: false };
    if (!Number.isSafeInteger(nextOperation)) invalidate();
    operations.set(op.id, op);
    bounded = true;
    emit(op, { kind: 'start', action });
    for (const older of operations.values()) if (older !== op && !older.settled && older.generation !== generation) emit(older, { kind: 'cancel-request', successor: op.id });
    if (action === 'restore' && ticket && !ticket.operation) ticket.operation = op;
    return op;
  }
  function scope<T>(op: Operation | null, work: () => T): T {
    const prior = current; current = op;
    try { return work(); } finally { current = prior; }
  }
  function failure(op: Operation | null, error: unknown, disposition: 'caught' | 'propagating'): void {
    if (op) op.failed = true;
    emit(op, { kind: 'failure', stage: op?.stage ?? 'action', error: describe(error), disposition });
  }
  function finish(op: Operation, handlerPromise: 'fulfilled' | 'rejected' | 'synchronous'): void {
    if (op.settled) { invalidate(); return; }
    const stale = op.generation !== options.generation();
    const outcome: Outcome = stale ? 'superseded' : op.cancellationRecognized ? 'cancelled' : op.failed ? 'error' : 'success';
    if (op.action === 'restore' && op.installedRevision === null && !op.partialWrite) emit(op, {
      kind: 'discard', reason: outcome === 'success' ? 'error' : outcome, candidateProduced: op.candidateProduced,
    });
    op.settled = true;
    emit(op, { kind: 'settled', outcome, handlerPromise, installedRevision: op.installedRevision });
    if (ticket?.operation === op) ticket = null;
    operations.delete(op.id);
  }
  function write<T>(site: number, work: () => T): T {
    return written(site, work());
  }
  function written<T>(site: number, result: T): T {
    if (!ready) return result;
    if (bounded && !current && !transaction?.owner) invalidate();
    if (transaction) transaction.writes++;
    else {
      if (!Number.isSafeInteger(++revision)) invalidate();
      emit(current, { kind: 'pair-write', revision, result: 'committed', site });
    }
    return result;
  }
  function pair<T>(op: Operation | null, work: () => T, install = false): T {
    if (transaction) return scope(op, work);
    const tx = { owner: op, writes: 0 }; transaction = tx;
    let returned = false;
    try {
      const result = scope(op, work); returned = true; return result;
    } finally {
      transaction = null;
      if (ready && tx.writes) {
        if (!Number.isSafeInteger(++revision)) invalidate();
        emit(op, { kind: 'pair-write', revision, result: returned ? 'committed' : 'partial-failure' });
        if (!returned && op) { op.stage = 'partial-write'; op.partialWrite = true; }
        if (returned && install && op) {
          op.installedRevision = revision; op.stage = 'post-commit';
          emit(op, { kind: 'install', revision });
        }
      }
    }
  }
  function effect<T>(op: Operation | null, target: string, work: () => T): T {
    try {
      const result = scope(op, work);
      emit(op, { kind: 'effect', target, applied: true });
      return result;
    } catch (error) {
      // An opaque presentation helper may have written before throwing. Do not certify
      // effect coverage or suppress the original exception on that path.
      invalidate(); throw error;
    }
  }
  function effectValue<T>(op: Operation | null, target: string, value: T): T {
    emit(op, { kind: 'effect', target, applied: true }); return value;
  }
  function recognized(op: Operation, site: string): void {
    emit(op, { kind: 'cancel-recognized', site });
    for (const target of ['status', 'error', 'loading', 'controls']) emit(op, { kind: 'effect', target, applied: false });
  }
  function deliverySync<T>(op: Operation, work: () => T): T {
    // Async delivery tickets cannot hold a synchronous importer. Fail closed for
    // evidence while preserving the native return/throw and scheduling exactly.
    if (ticket?.operation === op) invalidate();
    let value: T;
    try { value = work(); op.candidateProduced = true; }
    catch (error) {
      emit(op, { kind: 'engine-settled', mode: 'synchronous', outcome: 'rejected', error: describe(error) });
      emit(op, { kind: 'phase', phase: 'handler-delivery' });
      throw error;
    }
    emit(op, { kind: 'engine-settled', mode: 'synchronous', outcome: 'fulfilled', error: null });
    emit(op, { kind: 'phase', phase: 'handler-delivery' });
    return value;
  }
  async function delivery<T>(op: Operation, promise: Promise<T>): Promise<T> {
    let value!: T, reason: unknown, fulfilled = false;
    try { value = await promise; fulfilled = true; op.candidateProduced = true; }
    catch (error) { reason = error; }
    emit(op, { kind: 'engine-settled', outcome: fulfilled ? 'fulfilled' : op.cancellationRecognized ? 'cancelled' : 'rejected', error: fulfilled ? null : describe(reason) });
    const bound = ticket;
    if (!invalid && !dead && bound?.operation === op) {
      await new Promise<void>(resolve => {
        bound.release = resolve; bound.held = true;
        emit(op, { kind: 'held', ticket: bound.id, point: 'delivery' });
      });
    }
    emit(op, { kind: 'phase', phase: 'handler-delivery' });
    if (!fulfilled) throw reason;
    return value;
  }
  function restoreHandler<E>(handler: (event: E, context: { op: Operation | null }) => Promise<unknown>) {
    return (event: E) => {
      const context = { op: null as Operation | null };
      const promise = handler(event, context);
      return promise.then(value => {
        if (context.op) finish(context.op, 'fulfilled'); return value;
      }, error => {
        if (context.op) { failure(context.op, error, 'propagating'); finish(context.op, 'rejected'); }
        throw error;
      });
    };
  }
  function retry<T>(generation: number, handler: (op: Operation) => T): T {
    const op = start('retry', generation); op.stage = 'action';
    let returned = false;
    try { const value = scope(op, () => handler(op)); returned = true; return value; }
    catch (error) { failure(op, error, 'propagating'); throw error; }
    finally {
      emit(op, { kind: 'handler-return', mode: 'synchronous', result: returned ? 'returned' : 'threw' });
      finish(op, 'synchronous');
    }
  }
  function owner(generation: number): Operation | null {
    return [...operations.values()].find(op => op.generation === generation && op.action === 'restore') ?? null;
  }
  function engineCurrent(generation: number): boolean {
    const result = generation === options.generation();
    const op = owner(generation);
    if (!result && op) { op.cancellationRecognized = true; recognized(op, 'engine-check'); }
    return result;
  }
  function uncoveredGeneration<T>(value: T): T {
    if (bounded) invalidate(); return value;
  }
  const port = Object.freeze({
    observer: Object.freeze({
      readInstalled() {
        if (!ready || invalid || dead || transaction) throw Error('OBS135 evidence invalid or unavailable');
        try {
          return detached({ schema: 'obs135-installed-v1' as const, documentId, revision,
            generation: options.generation(), throughSequence: sequence, capturedAt: timestamp(), ...options.state() });
        } catch (error) { invalidate(); throw error; }
      },
      readJournal(afterSequence: number) {
        if (!Number.isSafeInteger(afterSequence) || afterSequence < 0 || afterSequence > sequence) throw Error('Invalid observation cursor');
        return detached({ throughSequence: sequence, complete: ready && !invalid && !dead, records: records.filter(record => record.sequence > afterSequence) });
      },
    }),
    scheduler: Object.freeze({
      armNextRestore(point: 'delivery'): number {
        if (point !== 'delivery' || !ready || invalid || dead || ticket) throw Error('Invalid or unavailable delivery ticket');
        if (!Number.isSafeInteger(++nextTicket)) { invalidate(); throw Error('Ticket space exhausted'); }
        ticket = { id: nextTicket, operation: null, release: null, held: false }; return nextTicket;
      },
      release(id: number): void {
        const bound = ticket;
        if (!bound || bound.id !== id || !bound.held || !bound.release || invalid || dead) throw Error('Ticket is not held');
        const resume = bound.release; ticket = null;
        emit(bound.operation, { kind: 'released', ticket: id, point: 'delivery' }); resume();
      },
    }),
  });
  return {
    port, start, scope, write, written, pair, effect, effectValue, recognized, delivery, deliverySync, restoreHandler, retry, owner, engineCurrent, uncoveredGeneration,
    failure, emit, invalidate,
    get current() { return current; },
    ready() { if (ready) invalidate(); else ready = true; },
    dispose() { dead = true; invalidate(); operations.clear(); records.length = 0; },
  };
}

function describe(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); } catch { return '<unprintable native error>'; }
}

/** DOM reads only; never refresh product presentation or invoke a getter on state. */
export function presentationDOM(app: HTMLElement) {
  function path(element: Element): number[] {
    const result: number[] = [];
    while (element !== app) {
      const parent = element.parentElement;
      if (!parent) throw Error('Detached observation element');
      result.unshift([...parent.children].indexOf(element)); element = parent;
    }
    return result;
  }
  const controls = [...app.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('button,input,select,textarea')].map(element => {
    let hiddenByAncestor = false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (parent.hidden || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility)) hiddenByAncestor = true;
    }
    const style = getComputedStyle(element);
    return { path: path(element), tag: element.tagName, id: element.id,
      disabled: element.disabled, effectivelyDisabled: element.matches(':disabled'), hidden: element.hidden, hiddenByAncestor,
      display: style.display, visibility: style.visibility, ariaDisabled: element.getAttribute('aria-disabled'), value: element.value,
      checked: element instanceof HTMLInputElement ? element.checked : null,
      selectedIndex: element instanceof HTMLSelectElement ? element.selectedIndex : null };
  });
  const feedback = [...app.querySelectorAll('[role="status"],[role="alert"],[id$="-status"],[id$="-feedback"],#error,#recovery-status,#run-state,#pause-overlay')]
    .map(element => ({ path: path(element), id: element.id, text: element.textContent }));
  return { controls, feedback, focusedPath: document.activeElement && app.contains(document.activeElement) ? path(document.activeElement) : null };
}
