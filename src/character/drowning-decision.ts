/** Already-qualified nonimmune immersion only; no live actor or caller guards. */
export interface DrowningDecisionInput {
  underwaterCount: number;
  physique: number;
  fitness: number;
  drowningIndicator: number;
}

export interface DrowningDecision {
  nextCounter: number;
  drowningIndicator: number;
  thresholdWord: number;
  firstDivisionOverflow: boolean;
  secondDivisionOverflow: boolean;
  requestedHit: number | null;
}

const signedWord = (word: number): number => word >= 32768 ? word - 65536 : word;

/** DIVU packs remainder:quotient on success and retains the dividend on overflow. */
function divideUnsignedWord(dividend: number, divisor: number): { register: number; overflow: boolean } {
  const quotient = Math.floor(dividend / divisor);
  if (quotient > 65535) return { register: dividend, overflow: true };
  return { register: ((dividend % divisor) * 65536 + quotient) >>> 0, overflow: false };
}

/**
 * Literal bounded two-DIVU / EXT / signed-CMP decision. The hit is an inert
 * unsigned request, not a fitness decrement; qualification/composition is external.
 */
export function decideDrowning(input: DrowningDecisionInput): DrowningDecision {
  const fields = ['underwaterCount', 'physique', 'fitness', 'drowningIndicator'];
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Reflect.ownKeys(input).length !== fields.length || fields.some(key => !Object.hasOwn(input, key))) {
    throw new Error('Expected exactly four drowning word fields.');
  }
  const { underwaterCount, physique, fitness, drowningIndicator } = input;
  if (![underwaterCount, physique, fitness, drowningIndicator].every(value =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 65535)) {
    throw new Error('Drowning fields must be unsigned 16-bit integers.');
  }

  const nextCounter = (underwaterCount + 1) & 65535;
  const first = divideUnsignedWord(physique * fitness, 655);
  const extended = signedWord(first.register & 65535) >>> 0;
  const second = divideUnsignedWord(extended, 400);
  const thresholdWord = second.register & 65535;
  const callsDamage = signedWord(nextCounter) > signedWord(thresholdWord);
  return {
    nextCounter,
    drowningIndicator: callsDamage ? 150 : drowningIndicator,
    thresholdWord,
    firstDivisionOverflow: first.overflow,
    secondDivisionOverflow: second.overflow,
    requestedHit: callsDamage ? nextCounter * 200 : null,
  };
}
