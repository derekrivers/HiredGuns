import { describe, expect, it } from 'vitest';
import { completeSupportedLanding, prepareSupportedLanding,
  type SupportedLandingContinuation, type SupportedLandingSlice } from '../src/character/supported-landing';

function continuation(slice: SupportedLandingSlice): SupportedLandingContinuation {
  const prepared = prepareSupportedLanding(slice);
  return { preDispatch: prepared.preDispatch, continuation: {
    kind: prepared.damageRequest === null ? 'no-helper-call' : 'modeled-helper-return',
    slice: { ...prepared.preDispatch },
  } };
}

describe('pure supported-floor landing continuation', () => {
  it.each([
    [0, 0xffffffff], [4, 0x3fffffff], [0x20000, 0x3fffffff],
    [0x20004, null], [0x40000, null], [0x40004, null], [0x60000, null], [0x60004, null],
  ])('computes the literal unsigned request for mask %i', (mask, hit) => {
    // All opaque bits set, including bit31; synthetic values only.
    const cellLong = (0xfff9fffb | mask!) >>> 0;
    const input = Object.freeze({ fallDamage: 0xffffffff, cellLong });
    const prepared = prepareSupportedLanding(input);
    expect(prepared.preDispatch).toEqual(input);
    expect(prepared.preDispatch).not.toBe(input);
    expect(prepared.damageRequest).toEqual(hit === null ? null : { requestedHit: hit });
    const result = completeSupportedLanding(continuation(input));
    expect(result.candidate).toEqual({ fallDamage: 0, cellLong });
    expect(result.pendingWrites).toEqual([
      { phase: hit === null ? 'damage-skipped' : 'after-helper-return', before: 0xffffffff, after: 0 },
      ...(mask! >= 0x40004 ? [{ phase: 'final-cell-reread', before: 0, after: 0 }] : []),
    ]);
  });

  it.each([0, 4, 0x20000, 0x20004, 0x40000, 0x40004, 0x60000, 0x60004])(
    'initial zero skips damage but retains the final write at mask %i', cellLong => {
      const input = { fallDamage: 0, cellLong };
      expect(prepareSupportedLanding(input).damageRequest).toBeNull();
      expect(completeSupportedLanding(continuation(input)).pendingWrites).toEqual(
        cellLong >= 0x40004 ? [{ phase: 'final-cell-reread', before: 0, after: 0 }] : []);
    });

  it.each([1, 3, 4, 65535, 0x80000000])('keeps zero versus no call and uses two logical shifts for pending %i', fallDamage => {
    for (const cellLong of [4, 0x20000]) {
      const prepared = prepareSupportedLanding({ fallDamage, cellLong });
      expect(prepared.damageRequest).toEqual({ requestedHit: Math.floor(fallDamage / 4) });
      expect(prepared.preDispatch.fallDamage).toBe(fallDamage);
      const result = completeSupportedLanding(continuation(prepared.preDispatch));
      expect(result.pendingWrites).toEqual([{ phase: 'after-helper-return', before: fallDamage, after: 0 }]);
    }
    expect(prepareSupportedLanding({ fallDamage, cellLong: 0 }).damageRequest).toEqual({ requestedHit: fallDamage });
    expect(prepareSupportedLanding({ fallDamage, cellLong: 0x20004 }).damageRequest).toBeNull();
  });

  it('copies outputs and leaves frozen pre-dispatch and post-return inputs intact', () => {
    const input = continuation({ fallDamage: 19, cellLong: 4 });
    Object.freeze(input.preDispatch);
    Object.freeze(input.continuation.slice);
    Object.freeze(input.continuation);
    Object.freeze(input);
    const before = structuredClone(input);
    const result = completeSupportedLanding(input);
    result.candidate.cellLong = 0;
    result.pendingWrites[0]!.before = 0;
    expect(input).toEqual(before);
    expect(completeSupportedLanding(input).candidate.cellLong).toBe(4);
  });

  it('rejects changed return storage, missing return or wrong branch without mutation', () => {
    for (const field of ['fallDamage', 'cellLong'] as const) {
      const input = continuation({ fallDamage: 5, cellLong: 4 });
      input.continuation.slice[field]++;
      const before = structuredClone(input);
      expect(() => completeSupportedLanding(input)).toThrow(/changed storage/);
      expect(input).toEqual(before);
    }
    for (const fallDamage of [0, 1]) {
      const input = continuation({ fallDamage, cellLong: 4 });
      input.continuation.kind = fallDamage === 0 ? 'modeled-helper-return' : 'no-helper-call';
      const before = structuredClone(input);
      expect(() => completeSupportedLanding(input)).toThrow(/return convention/);
      expect(input).toEqual(before);
    }
    expect(() => completeSupportedLanding({ preDispatch: { fallDamage: 1, cellLong: 0 } } as SupportedLandingContinuation)).toThrow();
  });

  it.each([-1, 0x100000000, 0.5, NaN, Infinity, '4', null, undefined, 4n])(
    'rejects malformed storage %s even when no damage would be requested', value => {
      for (const key of ['fallDamage', 'cellLong'] as const) {
        const input = { fallDamage: 0, cellLong: 0x60004, [key]: value } as SupportedLandingSlice;
        const before = { ...input };
        expect(() => prepareSupportedLanding(input)).toThrow();
        expect(input).toEqual(before);
        const completion = continuation({ fallDamage: 0, cellLong: 0x60004 });
        completion.continuation.slice = input;
        expect(() => completeSupportedLanding(completion)).toThrow();
        expect(input).toEqual(before);
      }
    });

  it('requires exact own data fields at every boundary, including symbols and hidden extras', () => {
    const extras = [
      { fallDamage: 0, cellLong: 0, extra: 1 },
      { fallDamage: 0, cellLong: 0, [Symbol('extra')]: 1 },
      Object.defineProperty({ fallDamage: 0, cellLong: 0 }, 'hidden', { value: 1 }),
      Object.create({ fallDamage: 0, cellLong: 0 }), null, [],
      { fallDamage: 0 },
      Object.defineProperty({ cellLong: 0 }, 'fallDamage', { get() { throw new Error('must not execute'); } }),
    ];
    for (const input of extras) {
      expect(() => prepareSupportedLanding(input as SupportedLandingSlice)).toThrow(/Malformed/);
    }
    const valid = continuation({ fallDamage: 1, cellLong: 0 });
    expect(() => completeSupportedLanding({ ...valid, damageRequest: null } as SupportedLandingContinuation)).toThrow();
    expect(() => completeSupportedLanding({ ...valid, continuation: { ...valid.continuation, extra: 1 } } as SupportedLandingContinuation)).toThrow();
    const hidden = Object.defineProperties({}, {
      fallDamage: { value: 4 }, cellLong: { value: 4 },
    }) as SupportedLandingSlice;
    expect(prepareSupportedLanding(hidden).damageRequest).toEqual({ requestedHit: 1 });
  });
});
