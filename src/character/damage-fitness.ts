import { transitionOrdinaryFloorDeath, type DeathEffect, type OrdinaryFloorDeathSlice } from './death-transition';

/** Authored normal-mode input only; not an adapter for live actors or saves. */
export interface DamageFitnessSlice {
  death: OrdinaryFloorDeathSlice;
  physique: number;
  spellShield: number;
  cheatMode2: number;
  cheatMode3: number;
  fireWhite: number;
  fitnessFlashDuration: number;
  gruntCount: number;
}
export interface DamageArithmetic {
  requestedHit: number;
  shieldedHit: number;
  quotient: number;
  quotientOverflow: boolean;
  damage: number;
}
export type DamageFitnessEffect = DeathEffect | { kind: 'fitness-written'; before: number; after: number };
export interface DamageFitnessResult {
  status: 'survived' | 'died' | 'already-dead';
  candidate: DamageFitnessSlice;
  arithmetic: DamageArithmetic | null;
  effects: DamageFitnessEffect[];
}

const unsigned = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;

/**
 * Main.s:1356-1371 and normal decr_fitness path, ordinary-floor slice only.
 * Nonzero cheats, resting, eligible grunt/audio and DIVU-by-zero reject.
 * Validation and candidate creation finish before exposing any writes/effects.
 */
export function damageOrdinaryFloorFitness(input: DamageFitnessSlice, requestedHit: number): DamageFitnessResult {
  const fields = ['death', 'physique', 'spellShield', 'cheatMode2', 'cheatMode3', 'fireWhite', 'fitnessFlashDuration', 'gruntCount'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== fields.length ||
      fields.some(k => !Object.hasOwn(input, k)) || !unsigned(requestedHit, 0xffffffff) ||
      !unsigned(input.physique, 65535) || input.physique === 0 || !unsigned(input.spellShield, 65535) ||
      ![input.cheatMode2, input.cheatMode3, input.fireWhite, input.fitnessFlashDuration].every(n => unsigned(n, 255)) ||
      !unsigned(input.gruntCount, 65535)) {
    throw new Error('Malformed damage input or unsupported zero physique.');
  }
  // Signed BLT #100 is taken for 0..99 and 0x8000..0xffff. Restrict the
  // accepted normal counter range rather than interpreting wrapped counters.
  if (input.cheatMode2 !== 0 || input.cheatMode3 !== 0 || input.gruntCount >= 100) {
    throw new Error('Cheat modifiers and grunt/audio branches are unsupported.');
  }
  // Reuse the accepted death contract as the complete local occupancy/lifecycle
  // validator even when this hit survives. Its speculative result stays private.
  const validatedDeath = transitionOrdinaryFloorDeath(input.death);
  if (input.death.actor.windowType === 4) throw new Error('Resting damage and window changes are unsupported.');
  const candidate = structuredClone(input);
  if (validatedDeath.status === 'already-dead') {
    return { status: 'already-dead', candidate, arithmetic: null, effects: [] };
  }

  const shieldedHit = input.spellShield === 87 ? requestedHit >>> 3 : requestedHit;
  const quotient = Math.floor(shieldedHit / input.physique);
  const quotientOverflow = quotient > 65535;
  // DIVU's packed remainder is irrelevant to MULU, which reads the low word.
  // The overflow fallback also passes through that low-word truncation.
  const multiplierWord = quotientOverflow ? Math.floor(0x0fffffff / 100) & 65535 : quotient;
  const damage = multiplierWord * 100;
  const arithmetic = { requestedHit, shieldedHit, quotient, quotientOverflow, damage };
  candidate.fireWhite = 255;
  candidate.fitnessFlashDuration = (candidate.fitnessFlashDuration + ((damage >>> 9) + 1 & 255)) & 255;
  const before = candidate.death.actor.fitness;
  const effects: DamageFitnessEffect[] = [];
  if (damage <= before) {
    candidate.death.actor.fitness = before - damage;
    effects.push({ kind: 'fitness-written', before, after: candidate.death.actor.fitness });
    if (candidate.death.actor.fitness >= 655) return { status: 'survived', candidate, arithmetic, effects };
  }
  // Overdamage calls death before subtraction. The low-band branch has already
  // stored its (possibly nonzero) result. Death itself preserves that fitness.
  const death = transitionOrdinaryFloorDeath(candidate.death);
  candidate.death = death.candidate;
  effects.push(...death.effects);
  return { status: 'died', candidate, arithmetic, effects };
}
