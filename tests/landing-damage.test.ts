import { describe, expect, it } from 'vitest';
import { composeOrdinaryFloorLanding, type LandingDamageSlice } from '../src/character/landing-damage';

function fixture(pending = 100, mask = 0, fitness = 1000, owner = 0, direction = 0, variant = 0): LandingDamageSlice {
  return { gender: 0, redrawFlag: 37, damage: {
    death: {
      actor: { partyIndex: owner, direction, x: 9, y: 8, floor: 4, mapPosition: 100, oldMapPosition: 99,
        statsDeadWord: 0, runtimeDeadWord: 0, controlMethod: 1, windowType: 0, fitness,
        fallDamage: pending, underwaterCount: 23, drowningCount: 19, waterFallDelay: 2 },
      leaders: [owner + 1, (owner + 1) % 4 + 1],
      cell: { mapPosition: 100, first: (0x83 | (32 + owner * 4 + direction) << 11 | (owner + variant * 4) << 23 | mask) >>> 0,
        second: 0xa5b5d321, belowFirst: 0x80 },
    }, physique: 100, spellShield: 0, cheatMode2: 0, cheatMode3: 0, fireWhite: 12, fitnessFlashDuration: 253, gruntCount: 99,
  } };
}
const masks = [0, 4, 0x20000, 0x20004, 0x40000, 0x40004, 0x60000, 0x60004];

describe('actual ordinary-floor landing composition', () => {
  it.each(masks)('preserves null versus full/quarter/zero requests and ordered clears at mask %i', mask => {
    for (const pending of [0, 1, 3, 4, 65535, 0x80000000, 0xffffffff]) {
      const input = fixture(pending, mask); const before = structuredClone(input);
      const result = composeOrdinaryFloorLanding(input);
      const hit = pending === 0 || mask >= 0x20004 ? null : mask === 0 ? pending : pending >>> 2;
      expect(result.prepared).toEqual({ preDispatch: { fallDamage: pending, cellLong: input.damage.death.cell.first }, damageRequest: hit === null ? null : { requestedHit: hit } });
      expect(result.arithmetic?.requestedHit ?? null).toBe(hit);
      expect(result.candidate.damage.death.actor.fallDamage).toBe(0);
      const writes = pending === 0 ? [] : [{ phase: hit === null ? 'damage-skipped' : 'after-helper-return', before: pending, after: 0 }];
      if (mask >= 0x40004) writes.push({ phase: 'final-cell-reread', before: 0, after: 0 });
      expect(result.pendingWrites).toEqual(writes);
      expect(result.effects.filter(e => e.kind === 'pending-cleared').map(e => e.write)).toEqual(writes);
      expect(result.effects.find(e => e.kind === 'cell-reread')).toEqual({ kind: 'cell-reread', first: result.candidate.damage.death.cell.first, mask });
      expect(input).toEqual(before);
      if (hit === null) expect(result.candidate).toEqual({ ...input, damage: { ...input.damage, death: { ...input.damage.death, actor: { ...input.damage.death.actor, fallDamage: 0 } } } });
    }
  });

  it.each([[755, 100, 655, 'survived'], [754, 100, 654, 'died'], [1000, 1000, 0, 'died'], [654, 1, 654, 'died'], [655, 1, 655, 'survived']] as const)(
    'executes actual boundary fitness %i pending %i', (fitness, pending, remaining, status) => {
      const input = fixture(pending, pending === 1 ? 4 : 0, fitness);
      const result = composeOrdinaryFloorLanding(input);
      expect(result.status).toBe(status);
      expect(result.candidate.damage.death.actor.fitness).toBe(remaining);
      expect(result.candidate.damage.fireWhite).toBe(255);
      expect(result.arithmetic?.damage).toBe(pending === 1 ? 0 : pending);
      if (status === 'died') {
        expect(result.candidate.damage.death.actor).toMatchObject({ statsDeadWord: 0xff00, runtimeDeadWord: 0xff00, oldMapPosition: 100 });
        expect(result.effects.map(e => e.kind).slice(-6)).toEqual(['occupancy-removed', 'pad-release-checked', 'corpse-written', 'redraw-written', 'pending-cleared', 'cell-reread']);
        const reread = result.effects.at(-1);
        expect(reread).toEqual({ kind: 'cell-reread', first: (0x700000a1 | (pending === 1 ? 4 : 0)) >>> 0, mask: pending === 1 ? 4 : 0 });
      }
    });

  it('preserves opaque data and every head direction/ordinary/shield/white owner variant through death', () => {
    for (let owner = 0; owner < 4; owner++) for (let direction = 0; direction < 4; direction++) for (let variant = 0; variant < 3; variant++) {
      const input = fixture(1100, 0, 1000, owner, direction, variant);
      const result = composeOrdinaryFloorLanding(input);
      expect(result.status).toBe('died');
      expect(result.candidate.damage.death.cell).toEqual({ mapPosition: 100, first: 0x700000a1, second: ((input.damage.death.cell.second & ~0xff000) | owner << 12) >>> 0, belowFirst: 0x80 });
      expect(result.candidate.damage.death.leaders).toEqual([0, (owner + 1) % 4 + 1]);
      expect(result.candidate.damage.death.actor).toMatchObject({ partyIndex: owner, direction, x: 9, y: 8, floor: 4, mapPosition: 100, underwaterCount: 23, drowningCount: 19, waterFallDelay: 2, fitness: 1000 });
    }
  });

  it('retains unsigned shields, division limits, overflow fallback and feedback wrap', () => {
    for (const [pending, physique, shield, hit, damage] of [
      [799, 100, 87, 99, 0], [799, 100, 88, 799, 700],
      [65535, 1, 0, 65535, 6553500], [65536, 1, 0, 65536, 6291400],
      [0xffffffff, 65535, 0, 0xffffffff, 6291400], [0xffffffff, 65535, 87, 536870911, 819200],
    ]) {
      const input = fixture(pending); input.damage.physique = physique!; input.damage.spellShield = shield!;
      const result = composeOrdinaryFloorLanding(input);
      expect(result.arithmetic).toMatchObject({ shieldedHit: hit, damage });
      expect(result.candidate.damage.fitnessFlashDuration).toBe((253 + ((damage! >>> 9) + 1 & 255)) & 255);
    }
  });

  it('records redraw after death/band change, including redundant writes, and preserves other initial bytes', () => {
    for (const initial of [0, 37, 255]) {
      for (const [fitness, pending, changes] of [[1000, 100, false], [1400, 100, true], [754, 100, true], [1000, 0, false]] as const) {
        const input = fixture(pending, 0, fitness); input.redrawFlag = initial;
        const result = composeOrdinaryFloorLanding(input);
        expect(result.candidate.redrawFlag).toBe(changes ? 255 : initial);
        expect(result.effects.filter(e => e.kind === 'redraw-written')).toEqual(changes ? [{ kind: 'redraw-written', before: initial, after: 255 }] : []);
      }
    }
  });

  it('returns independent candidates and independent audit records without input mutations', () => {
    const input = fixture(); const before = structuredClone(input); const result = composeOrdinaryFloorLanding(input);
    result.candidate.damage.death.actor.x = 0; result.candidate.damage.death.cell.second = 0; result.candidate.damage.death.leaders[0] = 0;
    result.prepared.preDispatch.fallDamage = 999;
    result.pendingWrites[0]!.before = 999;
    expect(result.effects.find(e => e.kind === 'pending-cleared')).toEqual({ kind: 'pending-cleared', write: { phase: 'after-helper-return', before: 100, after: 0 } });
    expect(input).toEqual(before);
  });

  it('atomically rejects unsupported storage, lifecycle, audio, source correspondence and geometry even on no-call branches', () => {
    const mutations: ((s: LandingDamageSlice) => void)[] = [
      s => { s.gender = 1; }, s => { s.redrawFlag = 256; }, s => { s.damage.gruntCount = 98; },
      s => { s.damage.cheatMode2 = 1; }, s => { s.damage.cheatMode3 = 1; }, s => { s.damage.physique = 0; },
      s => { s.damage.spellShield = 65536; }, s => { s.damage.fireWhite = -1; }, s => { s.damage.fitnessFlashDuration = NaN; },
      s => { s.damage.death.actor.controlMethod = 0; }, s => { s.damage.death.actor.windowType = 4; },
      s => { s.damage.death.actor.statsDeadWord = 0xff00; s.damage.death.actor.runtimeDeadWord = 0xff00; },
      s => { s.damage.death.actor.fallDamage = 0x100000000; }, s => { s.damage.death.actor.fitness = 65536; },
      s => { s.damage.death.cell.mapPosition--; }, s => { s.damage.death.cell.first ^= 1 << 11; },
      s => { s.damage.death.cell.first ^= 1 << 23; }, s => { s.damage.death.cell.first |= 0x200; },
      s => { s.damage.death.cell.first = (s.damage.death.cell.first | 0x70000020) >>> 0; },
      s => { s.damage.death.cell.belowFirst |= 2; }, s => { s.damage.death.leaders[1] = 5; },
    ];
    for (const pending of [0, 100]) for (const mask of [0, 0x60004]) for (const mutate of mutations) {
      const input = fixture(pending, mask); mutate(input); const before = structuredClone(input);
      expect(() => composeOrdinaryFloorLanding(input)).toThrow(); expect(input).toEqual(before);
    }
    for (const bad of [-1, 1.5, NaN, Infinity, 0x100000000]) {
      const input = fixture(); input.damage.death.cell.first = bad;
      expect(() => composeOrdinaryFloorLanding(input)).toThrow();
    }
  });

  it('rejects strict malformed descriptors at every nested boundary without executing getters', () => {
    const boundaries = [(s: LandingDamageSlice) => s, (s: LandingDamageSlice) => s.damage,
      (s: LandingDamageSlice) => s.damage.death, (s: LandingDamageSlice) => s.damage.death.actor,
      (s: LandingDamageSlice) => s.damage.death.cell, (s: LandingDamageSlice) => s.damage.death.leaders];
    for (const boundary of boundaries) for (const mode of ['symbol', 'hidden', 'extra', 'accessor', 'missing', 'inherited']) {
      const input = fixture(0); const object = boundary(input); const key = Object.keys(object)[0]!;
      let reads = 0;
      const descriptors = Object.getOwnPropertyDescriptors(object);
      if (mode === 'symbol') Object.defineProperty(object, Symbol('extra'), { value: 1 });
      if (mode === 'hidden') Object.defineProperty(object, 'extra', { value: 1 });
      if (mode === 'extra') Object.assign(object, { extra: 1 });
      if (mode === 'accessor') Object.defineProperty(object, key, { get: () => { reads++; throw new Error('Getter ran'); }, configurable: true });
      if (mode === 'missing' || mode === 'inherited') {
        const record = object as unknown as Record<string, unknown>; const value = record[key]; delete record[key];
        if (mode === 'inherited') Object.setPrototypeOf(object, { [key]: value });
      }
      const before = Object.getOwnPropertyDescriptors(object);
      expect(() => composeOrdinaryFloorLanding(input)).toThrow();
      expect(reads).toBe(0); expect(Object.getOwnPropertyDescriptors(object)).toEqual(before);
      expect(descriptors).toBeDefined();
    }
  });

  it('accepts exact nonenumerable own data by snapshotting before delegating', () => {
    const input = fixture();
    Object.defineProperty(input.damage.death.actor, 'fallDamage', { enumerable: false });
    Object.defineProperty(input.damage, 'physique', { enumerable: false });
    expect(composeOrdinaryFloorLanding(input).status).toBe('survived');
  });
});
