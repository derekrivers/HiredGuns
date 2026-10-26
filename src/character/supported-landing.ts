/** Local supported-floor continuation slice; no actor/map authority is implied. */
export interface SupportedLandingSlice {
  fallDamage: number;
  cellLong: number;
}
export interface SupportedLandingRequest {
  preDispatch: SupportedLandingSlice;
  /** Inert helper argument. A zero hit is still a request. */
  damageRequest: { requestedHit: number } | null;
}
export interface SupportedLandingContinuation {
  preDispatch: SupportedLandingSlice;
  continuation: {
    kind: 'modeled-helper-return' | 'no-helper-call';
    slice: SupportedLandingSlice;
  };
}
export interface LandingPendingWrite {
  phase: 'after-helper-return' | 'damage-skipped' | 'final-cell-reread';
  before: number;
  after: 0;
}
export interface SupportedLandingCompletion {
  candidate: SupportedLandingSlice;
  /** Ordered audit records, including redundant zero writes; never dispatch these. */
  pendingWrites: LandingPendingWrite[];
}

function fields(value: unknown, expected: string[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== expected.length || expected.some(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return !descriptor || !('value' in descriptor);
      })) throw new Error('Malformed supported landing fields.');
}
function copySlice(slice: SupportedLandingSlice): SupportedLandingSlice {
  fields(slice, ['fallDamage', 'cellLong']);
  if (![slice.fallDamage, slice.cellLong].every(value => typeof value === 'number' &&
      Number.isInteger(value) && value >= 0 && value <= 0xffffffff)) {
    throw new Error('Malformed supported landing unsigned storage.');
  }
  return { fallDamage: slice.fallDamage, cellLong: slice.cellLong };
}

/** Prepare only: pending is retained until a separate continuation call. */
export function prepareSupportedLanding(input: SupportedLandingSlice): SupportedLandingRequest {
  const preDispatch = copySlice(input);
  const mask = preDispatch.cellLong & 0x60004;
  const requestedHit = preDispatch.fallDamage === 0 || mask >= 0x20004 ? null :
    mask === 0 ? preDispatch.fallDamage : preDispatch.fallDamage >>> 2;
  return { preDispatch, damageRequest: requestedHit === null ? null : { requestedHit } };
}

/** Complete only under the explicit, storage-preserving modeled return convention.
 * This does not invoke a helper or attest that a real helper returned safely.
 */
export function completeSupportedLanding(input: SupportedLandingContinuation): SupportedLandingCompletion {
  fields(input, ['preDispatch', 'continuation']);
  fields(input.continuation, ['kind', 'slice']);
  const prepared = prepareSupportedLanding(input.preDispatch);
  const returned = copySlice(input.continuation.slice);
  const expectedKind = prepared.damageRequest === null ? 'no-helper-call' : 'modeled-helper-return';
  if (input.continuation.kind !== expectedKind ||
      returned.fallDamage !== prepared.preDispatch.fallDamage ||
      returned.cellLong !== prepared.preDispatch.cellLong) {
    throw new Error('Unsupported supported landing return convention or changed storage.');
  }
  const candidate = returned;
  const pendingWrites: LandingPendingWrite[] = [];
  const clear = (phase: LandingPendingWrite['phase']): void => {
    pendingWrites.push({ phase, before: candidate.fallDamage, after: 0 });
    candidate.fallDamage = 0;
  };
  if (candidate.fallDamage !== 0) {
    clear(prepared.damageRequest === null ? 'damage-skipped' : 'after-helper-return');
  }
  // Reread after the first clear; this write exists even if pending is already zero.
  if ((candidate.cellLong & 0x60004) >= 0x40004) clear('final-cell-reread');
  return { candidate, pendingWrites };
}
