import { describe, expect, it } from 'vitest';
import { damageOrdinaryFloorFitness, type DamageFitnessSlice } from '../src/character/damage-fitness';

// Authored numeric fixtures only, with unrelated map bits deliberately present.
function fixture(fitness = 50000): DamageFitnessSlice {
  return {
    death: {
      actor: { partyIndex: 2, direction: 1, x: 9, y: 8, floor: 4, mapPosition: 100, oldMapPosition: 99,
        statsDeadWord: 0, runtimeDeadWord: 0, controlMethod: 1, windowType: 0, fitness,
        fallDamage: 123456, underwaterCount: 7, drowningCount: 150, waterFallDelay: 2 },
      leaders: [3, 1], cell: { mapPosition: 100, first: (3 | 41 << 11 | 6 << 23 | 0x40044) >>> 0, second: 0xabcde987, belowFirst: 0 },
    },
    physique: 10, spellShield: 0, cheatMode2: 0, cheatMode3: 0,
    fireWhite: 0, fitnessFlashDuration: 254, gruntCount: 99,
  };
}

describe('bounded normal damage-to-death contract', () => {
  it('applies unsigned division, low-word multiplication and byte feedback independently', () => {
    const input = fixture(); const before = structuredClone(input);
    const result = damageOrdinaryFloorFitness(input, 199);
    expect(result.status).toBe('survived');
    expect(result.arithmetic).toEqual({ requestedHit: 199, shieldedHit: 199, quotient: 19, quotientOverflow: false, damage: 1900 });
    expect(result.candidate.death.actor.fitness).toBe(48100);
    expect(result.candidate.fireWhite).toBe(255);
    expect(result.candidate.fitnessFlashDuration).toBe(2);
    expect(result.candidate.death.cell).toEqual(input.death.cell);
    expect(result.candidate.death.leaders).toEqual([3, 1]);
    expect(result.effects).toEqual([{ kind: 'fitness-written', before: 50000, after: 48100 }]);
    expect(input).toEqual(before);
    result.candidate.death.actor.x = 0; result.candidate.death.cell.second = 0; result.candidate.death.leaders[0] = 0;
    expect(input).toEqual(before);
  });

  it.each([
    [755, 10, 'survived', 655], [754, 10, 'died', 654], [1000, 100, 'died', 0],
    [1000, 110, 'died', 1000], [654, 0, 'died', 654], [655, 0, 'survived', 655],
    [0, 0, 'died', 0], [65535, 0, 'survived', 65535],
  ] as const)('fitness %i and hit %i produces %s with fitness %i', (fitness, hit, status, remaining) => {
    const input = fixture(fitness); const before = structuredClone(input);
    const result = damageOrdinaryFloorFitness(input, hit);
    expect(result.status).toBe(status);
    expect(result.candidate.death.actor.fitness).toBe(remaining);
    expect(input).toEqual(before);
    if (status === 'died') {
      expect(result.candidate.death.actor.statsDeadWord).toBe(0xff00);
      expect(result.candidate.death.actor.runtimeDeadWord).toBe(0xff00);
      expect(result.candidate.death.leaders).toEqual([0, 1]);
      expect(result.effects.slice(-3).map(effect => effect.kind)).toEqual(['occupancy-removed', 'pad-release-checked', 'corpse-written']);
      expect(result.candidate.death.cell.first).toBe(0x70040065);
      expect(result.candidate.death.cell.second).toBe(0xabc02987);
      expect(result.effects.some(effect => effect.kind === 'fitness-written')).toBe(hit * 10 <= fitness);
    }
    expect(result.candidate.death.actor).toMatchObject({ fallDamage: 123456, underwaterCount: 7, drowningCount: 150, waterFallDelay: 2,
      x: 9, y: 8, floor: 4, mapPosition: 100 });
  });

  it('uses shield 87 exactly, shifting the unsigned hit before division', () => {
    const shield = fixture(); shield.spellShield = 87;
    expect(damageOrdinaryFloorFitness(shield, 159).arithmetic).toEqual({ requestedHit: 159, shieldedHit: 19, quotient: 1, quotientOverflow: false, damage: 100 });
    shield.spellShield = 88;
    expect(damageOrdinaryFloorFitness(shield, 159).arithmetic?.damage).toBe(1500);
    shield.spellShield = 87; shield.physique = 65535;
    expect(damageOrdinaryFloorFitness(shield, 0xffffffff).arithmetic?.shieldedHit).toBe(536870911);
  });

  it('retains the overflow fallback truncation rather than saturating quotient or damage', () => {
    const input = fixture(65535); input.physique = 1;
    const limit = damageOrdinaryFloorFitness(input, 65535);
    const overflow = damageOrdinaryFloorFitness(input, 65536);
    const maximum = damageOrdinaryFloorFitness(input, 0xffffffff);
    expect(limit.arithmetic).toMatchObject({ quotient: 65535, quotientOverflow: false, damage: 6553500 });
    expect(overflow.arithmetic).toMatchObject({ quotient: 65536, quotientOverflow: true, damage: 6291400 });
    expect(maximum.arithmetic).toMatchObject({ quotient: 0xffffffff, quotientOverflow: true, damage: 6291400 });
    expect(overflow.candidate.death.actor.fitness).toBe(65535);
  });

  it('treats uncontrolled occupancy independently and repeats completed death without feedback or effects', () => {
    const input = fixture(1000); input.death.actor.controlMethod = 0;
    const first = damageOrdinaryFloorFitness(input, 110);
    expect(first.status).toBe('died');
    const before = structuredClone(first.candidate);
    const repeat = damageOrdinaryFloorFitness(first.candidate, 0xffffffff);
    expect(repeat).toEqual({ status: 'already-dead', candidate: before, arithmetic: null, effects: [] });
    expect(repeat.candidate).not.toBe(first.candidate);
    repeat.candidate.death.leaders[1] = 0;
    expect(first.candidate).toEqual(before);
  });

  it('rejects malformed damage/storage and unsupported modifier branches atomically', () => {
    const mutations = [
      (s: DamageFitnessSlice) => { s.physique = 0; },
      (s: DamageFitnessSlice) => { s.physique = 65536; },
      (s: DamageFitnessSlice) => { s.spellShield = -1; },
      (s: DamageFitnessSlice) => { s.fireWhite = 256; },
      (s: DamageFitnessSlice) => { s.fitnessFlashDuration = 1.5; },
      (s: DamageFitnessSlice) => { s.gruntCount = 100; },
      (s: DamageFitnessSlice) => { s.gruntCount = 0xffff; },
      (s: DamageFitnessSlice) => { s.cheatMode2 = 1; },
      (s: DamageFitnessSlice) => { s.cheatMode3 = 255; },
      (s: DamageFitnessSlice) => { s.death.actor.windowType = 4; },
      (s: DamageFitnessSlice) => { Object.assign(s, { inventory: [] }); },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const before = structuredClone(input);
      expect(() => damageOrdinaryFloorFitness(input, 10)).toThrow();
      expect(input).toEqual(before);
    }
    for (const hit of [-1, 1.5, 0x100000000, NaN, Infinity]) {
      const input = fixture(); const before = structuredClone(input);
      expect(() => damageOrdinaryFloorFitness(input, hit)).toThrow();
      expect(input).toEqual(before);
    }
  });

  it('rejects unsupported occupancy, geometry and lifecycle even for a surviving zero hit', () => {
    const mutations = [
      (s: DamageFitnessSlice) => { s.death.cell.first ^= 1 << 11; },
      (s: DamageFitnessSlice) => { s.death.cell.first ^= 1 << 23; },
      (s: DamageFitnessSlice) => { s.death.cell.first |= 1 << 9; },
      (s: DamageFitnessSlice) => { s.death.cell.first &= ~1; },
      (s: DamageFitnessSlice) => { s.death.cell.first = (s.death.cell.first | 0x70000020) >>> 0; },
      (s: DamageFitnessSlice) => { s.death.cell.belowFirst = 2; },
      (s: DamageFitnessSlice) => { s.death.cell.mapPosition--; },
      (s: DamageFitnessSlice) => { s.death.actor.windowType = 7; },
      (s: DamageFitnessSlice) => { s.death.actor.statsDeadWord = 0xff00; },
      (s: DamageFitnessSlice) => { s.death.actor.statsDeadWord = 1; s.death.actor.runtimeDeadWord = 1; },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const before = structuredClone(input);
      expect(() => damageOrdinaryFloorFitness(input, 0)).toThrow();
      expect(input).toEqual(before);
    }
    const dead = damageOrdinaryFloorFitness(fixture(), 5001).candidate;
    dead.death.cell.second ^= 1 << 12;
    const before = structuredClone(dead);
    expect(() => damageOrdinaryFloorFitness(dead, 0)).toThrow();
    expect(dead).toEqual(before);
  });
});
