import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FixedClock } from '../src/sim/clock';
import { TICK_MS } from '../src/sim/world';

export type ProbeOperation =
  | { kind: 'advance'; elapsedMs: number }
  | { kind: 'pause'; elapsedMs: number }
  | { kind: 'reset' };

/** Synthetic callback state, deliberately unrelated to original gameplay. */
export function runScenario(name: string, description: string, operations: ProbeOperation[]) {
  const clock = new FixedClock();
  let ticks = 0, checksum = 0, alpha = 0, wallMs = 0;
  let admittedMs = 0, clampedMs = 0, pausedMs = 0, resetDiscardedMs = 0;
  const samples = operations.map(operation => {
    const beforeTicks = ticks, beforeRemainderMs = alpha * TICK_MS;
    let acceptedMs = 0;
    if (operation.kind === 'reset') {
      resetDiscardedMs += beforeRemainderMs;
      clock.reset();
      alpha = 0;
    } else {
      if (!Number.isFinite(operation.elapsedMs) || operation.elapsedMs < 0) throw new Error('Invalid probe elapsed time');
      wallMs += operation.elapsedMs;
      if (operation.kind === 'pause') pausedMs += operation.elapsedMs;
      else {
        alpha = clock.advance(operation.elapsedMs, () => {
          ticks++;
          checksum = (Math.imul(checksum, 31) + ticks) >>> 0;
        });
        // Infer admitted time from observable callbacks and interpolation; no clock internals.
        acceptedMs = (ticks - beforeTicks) * TICK_MS + alpha * TICK_MS - beforeRemainderMs;
        admittedMs += acceptedMs;
        clampedMs += operation.elapsedMs - acceptedMs;
      }
    }
    return { operation, wallMs, ticksAdded: ticks - beforeTicks, acceptedMs,
      ticks, remainderMs: alpha * TICK_MS, alpha, state: { checksum, phase: ticks % 7 } };
  });
  return { name, description, wallMs, admittedMs, clampedMs, pausedMs, resetDiscardedMs,
    ticks, remainderMs: alpha * TICK_MS, state: { checksum, phase: ticks % 7 }, samples };
}

function cadence(totalMs: number, pattern: number[]): ProbeOperation[] {
  const operations: ProbeOperation[] = [];
  for (let elapsed = 0, i = 0; elapsed < totalMs; i++) {
    const elapsedMs = Math.min(pattern[i % pattern.length]!, totalMs - elapsed);
    operations.push({ kind: 'advance', elapsedMs });
    elapsed += elapsedMs;
  }
  return operations;
}

export function createTimingReport() {
  const advance = (elapsedMs: number): ProbeOperation => ({ kind: 'advance', elapsedMs });
  const reset: ProbeOperation = { kind: 'reset' };
  return {
    schemaVersion: 1,
    kind: 'synthetic-fixed-clock-observations',
    tickMs: TICK_MS,
    descriptions: {
      state: 'A checksum and modulo-seven phase of callback ordinals; no game rules or original data.',
      pause: 'The harness skips advance during pause. Reset is a separate explicit operation.',
      acceptedMs: 'Measured as callback time plus change in observable remainder.',
      scope: 'Clock behavior only. No browser scheduling, original cadence or gameplay parity is established.',
    },
    scenarios: [
      ...[
        ['125hz', [8]], ['approx-60hz', [17, 16, 17]], ['50hz', [20]],
        ['approx-30hz', [33, 33, 34]], ['jitter', [1, 39, 7, 83, 10]],
      ].map(([name, pattern]) => runScenario(`equal-time-${name}`, 'Exactly 2000 ms supplied, each frame below the clamp.', cadence(2000, pattern as number[]))),
      runScenario('100ms-boundary', '100 ms is fully admitted.', [advance(100)]),
      runScenario('101ms-boundary', 'Observe the first millisecond above 100 ms.', [advance(101)]),
      runScenario('slow-250ms-frames', 'Same 2000 ms wall time, supplied in frames above the clamp.', cadence(2000, [250])),
      runScenario('suspension-retains-remainder', 'A 13 ms remainder precedes a 10 second gap and survives it.', [advance(13), advance(10000), advance(7)]),
      runScenario('reset-before-suspension', 'Reset discards remainder but does not suppress a subsequently supplied gap.', [advance(13), reset, advance(10000), advance(7)]),
      runScenario('pause-without-reset', 'Skipping clock calls pauses callbacks but retains the earlier remainder.', [advance(13), { kind: 'pause', elapsedMs: 10000 }, advance(7)]),
      runScenario('pause-with-reset', 'Explicit reset plus skipped clock calls discards fractional time and the paused gap.', [advance(13), reset, { kind: 'pause', elapsedMs: 10000 }, advance(7)]),
      runScenario('zero-elapsed', 'Zero elapsed leaves a partial tick untouched.', [advance(13), advance(0), advance(7)]),
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(createTimingReport(), null, 2)}\n`);
}
