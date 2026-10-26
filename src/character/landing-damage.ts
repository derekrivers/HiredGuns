import { damageOrdinaryFloorFitness, type DamageArithmetic, type DamageFitnessEffect, type DamageFitnessSlice } from './damage-fitness';
import { transitionOrdinaryFloorDeath } from './death-transition';
import { prepareSupportedLanding, type LandingPendingWrite, type SupportedLandingRequest } from './supported-landing';

/** One logical actor/stats/current-cell slice, never original memory pointers. */
export interface LandingDamageSlice {
  damage: DamageFitnessSlice;
  gender: number;
  redrawFlag: number;
}
export type LandingDamageEffect = DamageFitnessEffect
  | { kind: 'redraw-written'; before: number; after: 255 }
  | { kind: 'pending-cleared'; write: LandingPendingWrite }
  | { kind: 'cell-reread'; first: number; mask: number };
export interface LandingDamageResult {
  status: 'damage-skipped' | 'survived' | 'died';
  candidate: LandingDamageSlice;
  prepared: SupportedLandingRequest;
  arithmetic: DamageArithmetic | null;
  effects: LandingDamageEffect[];
  pendingWrites: LandingPendingWrite[];
}

// Read descriptors before values. Delegated APIs have weaker shape checks; no
// accessor or hidden/symbol field may cross this composition boundary.
function data(value: unknown, expected: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== expected.length) throw new Error('Malformed landing composition fields.');
  const copy: Record<string, unknown> = {};
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) throw new Error('Expected own landing data fields.');
    copy[key] = descriptor.value;
  }
  return copy;
}
const unsigned = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function snapshot(input: LandingDamageSlice): LandingDamageSlice {
  const outer = data(input, ['damage', 'gender', 'redrawFlag']);
  const damage = data(outer.damage, ['death', 'physique', 'spellShield', 'cheatMode2', 'cheatMode3', 'fireWhite', 'fitnessFlashDuration', 'gruntCount']);
  const death = data(damage.death, ['actor', 'leaders', 'cell']);
  const actor = data(death.actor, ['partyIndex', 'direction', 'x', 'y', 'floor', 'mapPosition', 'oldMapPosition', 'statsDeadWord', 'runtimeDeadWord', 'controlMethod', 'windowType', 'fitness', 'fallDamage', 'underwaterCount', 'drowningCount', 'waterFallDelay']);
  const cell = data(death.cell, ['mapPosition', 'first', 'second', 'belowFirst']);
  const leaders = death.leaders;
  if (!Array.isArray(leaders) || Reflect.ownKeys(leaders).length !== 3 || leaders.length !== 2) throw new Error('Malformed landing leaders.');
  const copiedLeaders = [0, 1].map(index => {
    const descriptor = Object.getOwnPropertyDescriptor(leaders, String(index));
    if (!descriptor || !('value' in descriptor)) throw new Error('Expected own leader data.');
    return descriptor.value as number;
  });
  const result = { ...outer, damage: { ...damage, death: { actor, cell, leaders: copiedLeaders } } } as unknown as LandingDamageSlice;
  if (outer.gender !== 0 || !unsigned(outer.redrawFlag, 255) ||
      actor.statsDeadWord !== 0 || actor.runtimeDeadWord !== 0 || actor.windowType !== 0 || actor.controlMethod !== 1 ||
      damage.gruntCount !== 99 || damage.cheatMode2 !== 0 || damage.cheatMode3 !== 0 ||
      !unsigned(damage.physique, 65535) || damage.physique === 0 || !unsigned(damage.spellShield, 65535) ||
      !unsigned(damage.fireWhite, 255) || !unsigned(damage.fitnessFlashDuration, 255)) {
    throw new Error('Unsupported landing lifecycle/audio slice or malformed damage storage.');
  }
  // Validate even when landing skips damage; the private death candidate is not
  // applied. This checks geometry, logical cell identity, head and owner.
  transitionOrdinaryFloorDeath(result.damage.death);
  return result;
}

/** Pure observed non-audio ordinary-floor continuation; no live installation. */
export function composeOrdinaryFloorLanding(input: LandingDamageSlice): LandingDamageResult {
  const candidate = snapshot(input);
  const original = candidate.damage.death.actor;
  const prepared = prepareSupportedLanding({ fallDamage: original.fallDamage, cellLong: candidate.damage.death.cell.first });
  const effects: LandingDamageEffect[] = [];
  let status: LandingDamageResult['status'] = 'damage-skipped';
  let arithmetic: DamageArithmetic | null = null;
  if (prepared.damageRequest !== null) {
    const result = damageOrdinaryFloorFitness(candidate.damage, prepared.damageRequest.requestedHit);
    if (result.status === 'already-dead') throw new Error('Unexpected dead landing input.');
    candidate.damage = result.candidate;
    status = result.status;
    arithmetic = result.arithmetic;
    effects.push(...result.effects);
    if (status === 'died' || Math.floor(original.fitness / 655) !== Math.floor(candidate.damage.death.actor.fitness / 655)) {
      effects.push({ kind: 'redraw-written', before: candidate.redrawFlag, after: 255 });
      candidate.redrawFlag = 255;
    }
  }
  const pendingWrites: LandingPendingWrite[] = [];
  const clear = (phase: LandingPendingWrite['phase']): void => {
    const write: LandingPendingWrite = { phase, before: candidate.damage.death.actor.fallDamage, after: 0 };
    candidate.damage.death.actor.fallDamage = 0;
    pendingWrites.push(write);
    effects.push({ kind: 'pending-cleared', write: { ...write } });
  };
  if (candidate.damage.death.actor.fallDamage !== 0) clear(prepared.damageRequest === null ? 'damage-skipped' : 'after-helper-return');
  const first = candidate.damage.death.cell.first;
  const mask = first & 0x60004;
  effects.push({ kind: 'cell-reread', first, mask });
  if (mask >= 0x40004) clear('final-cell-reread');
  return { status, candidate, prepared, arithmetic, effects, pendingWrites };
}
