import { describe, expect, it } from 'vitest';
import { decideDrowning, type DrowningDecisionInput } from '../src/character/drowning-decision';

// Authored arithmetic profiles only. No roster, map, source bytes or CPU traces.
const base: DrowningDecisionInput = { underwaterCount: 0, physique: 400, fitness: 24890, drowningIndicator: 54321 };
const signed = (word: number) => word < 32768 ? word : word - 65536;

describe('disconnected drowning decision', () => {
  it.each([
    [655, 32767, 81, false, false],
    [655, 32768, 32768, false, true],
    [655, 65535, 65535, false, true],
    [1024, 41919, 65534, false, true],
    [1024, 41920, 0, true, false],
    [65535, 32768, 32768, true, true],
    [65535, 65535, 0, true, false],
  ] as const)('preserves both DIVU paths for physique %i fitness %i', (physique, fitness, thresholdWord, firstDivisionOverflow, secondDivisionOverflow) => {
    for (const offset of [-1, 0, 1]) {
      const nextCounter = (thresholdWord + offset + 65536) % 65536;
      const callsDamage = signed(nextCounter) > signed(thresholdWord);
      const input = Object.freeze({ ...base, physique, fitness, underwaterCount: (nextCounter + 65535) % 65536 });
      expect(decideDrowning(input)).toEqual({
        nextCounter, thresholdWord, firstDivisionOverflow, secondDivisionOverflow,
        drowningIndicator: callsDamage ? 150 : base.drowningIndicator,
        requestedHit: callsDamage ? nextCounter * 200 : null,
      });
    }
  });

  it.each([
    [36, 37, null], [37, 38, null], [38, 39, 7800],
    [32766, 32767, 6553400], [32767, 32768, null],
    [65534, 65535, null], [65535, 0, null],
  ] as const)('compares signed words and increments %i to %i', (underwaterCount, nextCounter, requestedHit) => {
    expect(decideDrowning({ ...base, underwaterCount })).toEqual({
      nextCounter, thresholdWord: 38, firstDivisionOverflow: false, secondDivisionOverflow: false,
      drowningIndicator: requestedHit === null ? 54321 : 150, requestedHit,
    });
  });

  it('distinguishes a zero hit request from skipping and preserves arbitrary indicators on skip', () => {
    expect(decideDrowning({ ...base, physique: 655, fitness: 65535, underwaterCount: 65535 })).toEqual({
      nextCounter: 0, thresholdWord: 65535, firstDivisionOverflow: false, secondDivisionOverflow: true,
      drowningIndicator: 150, requestedHit: 0,
    });
    for (const drowningIndicator of [0, 150, 65535]) {
      expect(decideDrowning({ ...base, drowningIndicator }).drowningIndicator).toBe(drowningIndicator);
    }
  });

  it('accepts zero stat words and returns independent pure output', () => {
    for (const stats of [{ physique: 0 }, { fitness: 0 }, { physique: 0, fitness: 0 }]) {
      const input = Object.freeze({ ...base, ...stats });
      const result = decideDrowning(input);
      expect(result).toEqual({ nextCounter: 1, thresholdWord: 0, firstDivisionOverflow: false, secondDivisionOverflow: false, drowningIndicator: 150, requestedHit: 200 });
      result.nextCounter = 42;
      expect(decideDrowning(input).nextCounter).toBe(1);
      expect(input).toEqual({ ...base, ...stats });
    }
  });

  it('rejects malformed shapes and every invalid word without mutation', () => {
    const inherited = Object.assign(Object.create({ underwaterCount: 0 }), { physique: 400, fitness: 24890, drowningIndicator: 0 });
    const malformed: unknown[] = [null, undefined, [], 0, 'words', {}, inherited,
      { ...base, extra: 0 }, { ...base, [Symbol('extra')]: 0 },
      Object.defineProperty({ ...base }, 'extra', { value: 0 }),
    ];
    for (const field of Object.keys(base)) {
      const missing = { ...base } as Partial<DrowningDecisionInput>;
      delete missing[field as keyof DrowningDecisionInput];
      malformed.push(missing);
      for (const value of [-1, 65536, 0.5, NaN, Infinity, -Infinity, '0', null, undefined, true, 0n]) {
        malformed.push(Object.freeze({ ...base, [field]: value }));
      }
    }
    for (const input of malformed) expect(() => decideDrowning(input as DrowningDecisionInput)).toThrow();
  });
});
