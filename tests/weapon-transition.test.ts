import { describe, expect, it } from 'vitest';
import { bindVerifiedEncounterGun, transitionGunShot, type GunShotInput } from '../src/combat/weapon-transition';

// Entirely synthetic row and entry; no original data or runtime parameter fixture.
function input(ammo = 9): GunShotInput {
  const row = new Uint8Array(286);
  row[265] = 4; row[274] = 17; row[284] = 12; row[285] = 3;
  return {
    weapon: { itemId: 25, rawHex: Buffer.from(row).toString('hex') },
    equipped: { itemId: 25, damage: 171, ammo, fourthByte: 205, rawHex: `19ab${ammo.toString(16).padStart(2, '0')}cd` },
    fireDuration: 0, fireAccuracy: 99,
    target: { kind: 'authored-dummy', fitness: 20000, physique: 64, spellShield: 0 },
  };
}
function rowByte(i: GunShotInput, offset: number, value: number): GunShotInput {
  const bytes = Buffer.from(i.weapon.rawHex, 'hex'); bytes[offset] = value;
  return { ...i, weapon: { ...i.weapon, rawHex: bytes.toString('hex') } };
}

describe('bounded source-derived gun with authored encounter target', () => {
  it('spends a burst and applies integer normal damage without changing any input or opaque byte', () => {
    const i = input(), before = structuredClone(i);
    const r = transitionGunShot(i);
    expect(r.status).toBe('fired'); expect(r.ammoSpent).toBe(4); expect(r.requestedHit).toBe(6144);
    expect(r.arithmetic?.damage).toBe(9600);
    expect(r.candidate).toEqual({ equipped: { ...i.equipped, ammo: 5, rawHex: '19ab05cd' },
      fireDuration: 4, fireAccuracy: 17, target: { ...i.target, fitness: 10400 } });
    expect(i).toEqual(before);
    expect(Object.isFrozen(r)).toBe(true); expect(Object.isFrozen(r.candidate.equipped)).toBe(true);
    expect(Object.isFrozen(r.candidate.target)).toBe(true); expect(Object.isFrozen(r.arithmetic)).toBe(true);
  });
  it('uses full duration damage for partial ammo, and clamps only authored dummy health', () => {
    const r = transitionGunShot({ ...input(1), target: { kind: 'authored-dummy', fitness: 10, physique: 64, spellShield: 0 } });
    expect(r.ammoSpent).toBe(1); expect(r.candidate.equipped.rawHex).toBe('19ab00cd');
    expect(r.requestedHit).toBe(6144); expect(r.candidate.target).toEqual({ kind: 'authored-dummy', fitness: 0, physique: 64, spellShield: 0 });
  });
  it('fires at the inclusive counter threshold, blocks above it before testing ammo, and leaves empty guns unchanged', () => {
    expect(transitionGunShot({ ...input(), fireDuration: 3 }).status).toBe('fired');
    for (const i of [{ ...input(0), fireDuration: 4 }, input(0)]) {
      const r = transitionGunShot(i);
      expect(r.status).toBe(i.fireDuration > 3 ? 'already-firing' : 'no-ammo');
      expect(r.ammoSpent).toBe(0); expect(r.requestedHit).toBe(0); expect(r.arithmetic).toBeNull();
      expect(r.candidate).toEqual({ equipped: i.equipped, fireDuration: i.fireDuration, fireAccuracy: i.fireAccuracy, target: i.target });
    }
  });
  it('consumes ammo on an authored miss, with no damage or RNG', () => {
    const r = transitionGunShot({ ...input(), target: { kind: 'miss' } });
    expect(r.ammoSpent).toBe(4); expect(r.candidate.target).toEqual({ kind: 'miss' });
    expect(r.requestedHit).toBe(0); expect(r.arithmetic).toBeNull();
  });
  it('reuses shield and division-overflow arithmetic including integer remainder', () => {
    const r = transitionGunShot({ ...input(), target: { kind: 'authored-dummy', fitness: 20000, physique: 65, spellShield: 87 } });
    expect(r.arithmetic).toMatchObject({ shieldedHit: 768, quotient: 11, remainder: 53, damage: 1100 });
    const wide = rowByte(rowByte(input(), 265, 127), 285, 255);
    expect(transitionGunShot({ ...wide, target: { kind: 'authored-dummy', fitness: 0xffffffff, physique: 1, spellShield: 0 } }).arithmetic?.quotientOverflow).toBe(true);
  });
  it('replays deterministically from JSON state; the caller explicitly owns counter advancement', () => {
    const i = input(), first = transitionGunShot(i);
    expect(transitionGunShot(JSON.parse(JSON.stringify(i)) as GunShotInput)).toEqual(first);
    const next = { ...i, ...first.candidate };
    expect(transitionGunShot(next).status).toBe('already-firing');
    expect(transitionGunShot({ ...next, fireDuration: 3 }).candidate.equipped.ammo).toBe(1);
  });
  it('rejects malformed/unsupported state atomically even if firing would otherwise be blocked', () => {
    const base = input();
    const invalid: unknown[] = [
      { ...base, fireDuration: 128 }, { ...base, fireDuration: NaN }, { ...base, fireAccuracy: Infinity },
      { ...base, fireDuration: 1.5 }, { ...base, extra: 0 },
      { ...base, equipped: { ...base.equipped, rawHex: '19ab09ce' } },
      { ...base, equipped: { ...base.equipped, ammo: 256 } }, input(13),
      { ...base, weapon: { ...base.weapon, itemId: 24 } },
      { ...base, target: { kind: 'authored-dummy', fitness: 1, physique: 0, spellShield: 0 } },
      { ...base, target: { kind: 'actor', fitness: 100 } },
      { ...base, target: { kind: 'miss', unexpected: 0 } },
      rowByte(base, 254, 1), rowByte(base, 265, 0), rowByte(base, 265, 128), rowByte(base, 284, 0), rowByte(base, 285, 0),
    ];
    for (const value of invalid) {
      const before = structuredClone(value);
      expect(() => transitionGunShot(value as GunShotInput)).toThrow(); expect(value).toEqual(before);
    }
    expect(() => transitionGunShot({ ...base, fireDuration: 4, target: { kind: 'authored-dummy', fitness: 1, physique: 0, spellShield: 0 } })).toThrow();
  });
  it('refuses getter fields without invoking them', () => {
    const i = input(); let calls = 0;
    Object.defineProperty(i, 'fireDuration', { enumerable: true, get: () => { calls++; return 0; } });
    expect(() => transitionGunShot(i)).toThrow(); expect(calls).toBe(0);
  });
  it('does not authenticate synthetic or malformed original tables', async () => {
    await expect(bindVerifiedEncounterGun(new Uint8Array(286 * 114))).rejects.toThrow('verified OCS');
    await expect(bindVerifiedEncounterGun(new Uint8Array(1))).rejects.toThrow();
  });
});
