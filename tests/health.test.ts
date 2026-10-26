import { describe, expect, it } from 'vitest';
import { damageFitness, MAX_FALL_DAMAGE, nextFallDamage } from '../src/sim/health';

describe('bounded source integer injury', () => {
  it('uses quotient-only DIVU, ADD.W wrap and source doubling for the fall seed', () => {
    expect(nextFallDamage(0,{weight:0,agility:100,physique:100})).toBe(6400);
    expect(nextFallDamage(0,{weight:299,agility:100,physique:100})).toBe(6528);
    expect(nextFallDamage(0,{weight:100,agility:1,physique:65500})).toBe(4096);
    expect(nextFallDamage(0,{weight:65535,agility:1,physique:1})).toBe(0);
    expect(nextFallDamage(6400,{weight:0,agility:100,physique:100})).toBe(12800);
    expect(nextFallDamage(9000000,{weight:0,agility:100,physique:100})).toBe(16777216);
    expect(nextFallDamage(MAX_FALL_DAMAGE,{weight:0,agility:100,physique:100})).toBe(16777216);
  });
  it('truncates damage division and normalizes the source nonzero death residue', () => {
    expect(damageFitness(65535,100,99)).toEqual({fitness:65535,dead:false,damage:0});
    expect(damageFitness(65535,100,100)).toEqual({fitness:65435,dead:false,damage:100});
    expect(damageFitness(65535,100,12800)).toEqual({fitness:52735,dead:false,damage:12800});
    expect(damageFitness(755,100,100)).toEqual({fitness:655,dead:false,damage:100});
    expect(damageFitness(754,100,100)).toEqual({fitness:0,dead:true,damage:100});
    expect(damageFitness(655,100,0)).toEqual({fitness:655,dead:false,damage:0});
    expect(damageFitness(654,100,0)).toEqual({fitness:0,dead:true,damage:0});
    expect(damageFitness(100,1,100)).toEqual({fitness:0,dead:true,damage:10000});
  });
  it('uses the source overflow substitute low word before MULU rather than a floating approximation', () => {
    expect(damageFitness(65535,1,65535).damage).toBe(6553500);
    // FLOOR(0x0fffffff/100)=2684354; its low word is62914, then MULU100.
    expect(damageFitness(65535,1,65536)).toEqual({fitness:0,dead:true,damage:6291400});
    expect(damageFitness(65535,1,0xffffffff).damage).toBe(6291400);
  });
  it('rejects traps, unsafe words and the unchecked fall-seed overflow range', () => {
    for (const stats of [
      {weight:0,agility:0,physique:100},{weight:0,agility:100,physique:0},
      {weight:65536,agility:1,physique:100},{weight:-1,agility:100,physique:100},
      {weight:0,agility:1.5,physique:100},{weight:0x100000000,agility:100,physique:100},
    ]) expect(()=>nextFallDamage(0,stats)).toThrow();
    for (const previous of [-1,MAX_FALL_DAMAGE+1,NaN,Infinity]) expect(()=>nextFallDamage(previous,{weight:0,agility:100,physique:100})).toThrow();
    for (const [fitness,physique,hit] of [[65536,100,0],[65535,0,1],[65535,100,-1],[65535,100,0x100000000],[65535,100,NaN]]) expect(()=>damageFitness(fitness!,physique!,hit!)).toThrow();
  });
});
