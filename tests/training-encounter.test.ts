import { describe, expect, it } from 'vitest';
import { createTrainingEncounter, fireTrainingEncounter, resetTrainingEncounter, targetTrainingEncounter, tickTrainingEncounter, validateTrainingEncounter } from '../src/combat/training-encounter';
import type { GunWeapon } from '../src/combat/weapon-transition';

// Entirely synthetic parameters. Live binding is tested only with ignored local inputs.
function weapon(): GunWeapon {
  const row = new Uint8Array(286); row[265] = 8; row[274] = 17; row[284] = 24; row[285] = 3;
  return { itemId: 25, rawHex: Buffer.from(row).toString('hex') };
}
const indices = [11, 3, 0, 5];
describe('isolated authored encounter', () => {
  it('full, partial and empty fixtures use source gun transition atomically and retain the full partial-burst damage', () => {
    const gun = weapon();
    const full = createTrainingEncounter(gun, indices, 1, 'full'), partial = createTrainingEncounter(gun, indices, 1, 'partial');
    const a = fireTrainingEncounter(full, gun), b = fireTrainingEncounter(partial, gun);
    expect(a.equipped.ammo).toBe(16); expect(b.equipped.ammo).toBe(0);
    expect(a.lastDamage).toBe(b.lastDamage); expect(a.lastDamage).toBeGreaterThan(0);
    expect(a.fireDuration).toBe(8); expect(a.fireAccuracy).toBe(17); expect(a.shots).toBe(1);
    expect(a.fitness).toBe(100000 - a.lastDamage); expect(full.equipped.ammo).toBe(24);
    const empty = fireTrainingEncounter(createTrainingEncounter(gun, indices, 0, 'empty'), gun);
    expect(empty).toMatchObject({ status: 'no-ammo', shots: 0, lastDamage: 0, fitness: 100000 });
    expect(Object.isFrozen(a)).toBe(true); expect(Object.isFrozen(a.equipped)).toBe(true);
    expect(Object.isFrozen(a.baseline.equipped)).toBe(true);
  });
  it('retains dummy health on miss, respects source >3 counter and uses explicit per-tick cooldown', () => {
    const gun = weapon(), initial = createTrainingEncounter(gun, indices, 2, 'full');
    const miss = fireTrainingEncounter(targetTrainingEncounter(initial), gun);
    expect(miss).toMatchObject({ target: 'miss', fitness: 100000, lastDamage: 0, shots: 1 });
    let state = fireTrainingEncounter(miss, gun);
    expect(state).toMatchObject({ status: 'already-firing', shots: 1, fireDuration: 8 });
    for (let i = 0; i < 5; i++) state = tickTrainingEncounter(state);
    expect(state.fireDuration).toBe(3);
    state = fireTrainingEncounter(targetTrainingEncounter(state), gun);
    expect(state.shots).toBe(2); expect(state.fitness).toBeLessThan(100000);
    for (let i = 0; i < 20; i++) state = tickTrainingEncounter(state);
    expect(state.fireDuration).toBe(0); expect(tickTrainingEncounter(state)).toBe(state);
    expect(resetTrainingEncounter(state, gun, indices)).toEqual(initial);
  });
  it('restores a detached complete snapshot and rejects missing, extra, malformed and mismatched fields', () => {
    const gun = weapon(), state = tickTrainingEncounter(fireTrainingEncounter(createTrainingEncounter(gun, indices, 0, 'partial'), gun));
    const json = JSON.stringify(state), restored = validateTrainingEncounter(JSON.parse(json), gun, indices);
    expect(restored).toEqual(state); expect(restored).not.toBe(state); expect(restored.equipped).not.toBe(state.equipped);
    for (const key of Object.keys(state)) {
      const value = JSON.parse(json); delete value[key];
      expect(() => validateTrainingEncounter(value, gun, indices)).toThrow();
    }
    const changes = [
      { extra: true }, { version: 2 }, { profile: 'team-gun' }, { canonicalIndex: 3 }, { actor: 4 }, { fixture: 'unbounded' },
      { target: 'enemy' }, { fireDuration: 9 }, { fireDuration: -1 }, { fireAccuracy: 256 }, { fitness: 100001 },
      { lastDamage: -1 }, { shots: 1.5 }, { status: 'death' },
      { equipped: { ...state.equipped, ammo: 25, rawHex: '19001900' } },
      { equipped: { ...state.equipped, damage: 1, rawHex: '19010000' } },
      { baseline: { ...state.baseline, fitness: 1 } },
      { baseline: { ...state.baseline, equipped: { ...state.baseline.equipped, extra: 1 } } },
    ];
    for (const change of changes) expect(() => validateTrainingEncounter({ ...state, ...change }, gun, indices)).toThrow();
    expect(JSON.stringify(state)).toBe(json);
    let calls = 0; const getter = { ...state };
    Object.defineProperty(getter, 'fitness', { enumerable: true, get: () => { calls++; return 1; } });
    expect(() => validateTrainingEncounter(getter, gun, indices)).toThrow(); expect(calls).toBe(0);
  });
  it('clamps dummy zero without actor lifecycle, resets only authored baseline and has no RNG or world input', () => {
    const gun = weapon(), initial = createTrainingEncounter(gun, indices, 3, 'full', 'miss');
    const low = validateTrainingEncounter({ ...initial, target: 'authored-dummy', fitness: 1 }, gun, indices);
    expect(fireTrainingEncounter(low, gun).fitness).toBe(0);
    expect(resetTrainingEncounter(fireTrainingEncounter(initial, gun), gun, indices)).toEqual(initial);
    expect(() => createTrainingEncounter(gun, indices, -1, 'full')).toThrow();
  });
});
