import { TICK_MS } from './world';
/** Pause rather than catch up seconds of input after suspension. */
export class FixedClock {
  private accumulator = 0;
  advance(elapsed: number, step: () => void): number {
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid elapsed time');
    this.accumulator += Math.min(elapsed, 100);
    while (this.accumulator >= TICK_MS) { step(); this.accumulator -= TICK_MS; }
    return this.accumulator / TICK_MS;
  }
  reset(): void { this.accumulator = 0; }
}
