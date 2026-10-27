import { expect, test } from 'vitest';
import { createTimingReport, runScenario } from '../tools/timing-probe';

test('equal elapsed cadences produce identical synthetic callback state and repeat exactly', () => {
  const report = createTimingReport();
  expect(createTimingReport()).toEqual(report);
  const equalTime = report.scenarios.filter(scenario => scenario.name.startsWith('equal-time-'));
  expect(equalTime).toHaveLength(5);
  for (const scenario of equalTime) {
    expect(scenario.wallMs).toBe(2000);
    expect(scenario.ticks).toBe(100);
    expect(scenario.remainderMs).toBe(0);
    expect(scenario.clampedMs).toBe(0);
    expect(scenario.state).toEqual(equalTime[0]!.state);
  }
});

test('observed clamp bounds admitted time per call, so slow frames lose time', () => {
  const scenarios = createTimingReport().scenarios;
  const boundary = scenarios.find(s => s.name === '100ms-boundary')!;
  const above = scenarios.find(s => s.name === '101ms-boundary')!;
  const slow = scenarios.find(s => s.name === 'slow-250ms-frames')!;
  expect([boundary.admittedMs, boundary.clampedMs, boundary.ticks]).toEqual([100, 0, 5]);
  expect([above.admittedMs, above.clampedMs, above.ticks]).toEqual([100, 1, 5]);
  expect([slow.wallMs, slow.admittedMs, slow.clampedMs, slow.ticks]).toEqual([2000, 800, 1200, 40]);
});

test('suspension retains remainder; reset alone still admits five ticks from the gap', () => {
  const scenarios = createTimingReport().scenarios;
  const retained = scenarios.find(s => s.name === 'suspension-retains-remainder')!;
  expect(retained.samples.map(s => [s.ticksAdded, s.remainderMs])).toEqual([[0, 13], [5, 13], [1, 0]]);
  expect(retained.clampedMs).toBe(9900);
  const reset = scenarios.find(s => s.name === 'reset-before-suspension')!;
  expect([reset.ticks, reset.remainderMs, reset.resetDiscardedMs]).toEqual([5, 7, 13]);
});

test('pause is a harness policy; only reset discards pre-pause remainder', () => {
  const scenarios = createTimingReport().scenarios;
  const retained = scenarios.find(s => s.name === 'pause-without-reset')!;
  const reset = scenarios.find(s => s.name === 'pause-with-reset')!;
  expect([retained.ticks, retained.remainderMs, retained.pausedMs]).toEqual([1, 0, 10000]);
  expect([reset.ticks, reset.remainderMs, reset.pausedMs, reset.resetDiscardedMs]).toEqual([0, 7, 10000, 13]);
  for (const scenario of scenarios) {
    expect(scenario.wallMs).toBeCloseTo(scenario.ticks * 20 + scenario.remainderMs + scenario.clampedMs + scenario.pausedMs + scenario.resetDiscardedMs);
  }
});

test('zero and fractional durations retain the observable remainder; invalid inputs reject', () => {
  const result = runScenario('fraction', 'Synthetic fractions.', [
    { kind: 'advance', elapsedMs: 0.5 }, { kind: 'advance', elapsedMs: 0 }, { kind: 'advance', elapsedMs: 19.5 },
  ]);
  expect(result.samples.map(s => s.remainderMs)).toEqual([0.5, 0.5, 0]);
  expect(result.ticks).toBe(1);
  for (const elapsedMs of [-1, NaN, Infinity]) {
    expect(() => runScenario('invalid', '', [{ kind: 'advance', elapsedMs }])).toThrow('Invalid probe elapsed time');
  }
});
