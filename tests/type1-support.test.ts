import { describe, expect, it } from 'vitest';
import { transitionType1Support, type Type1SupportSlice } from '../src/character/type1-support';
import { computeNormalDamage } from '../src/character/damage-arithmetic';

function fixture(owner = 0, direction = 0, variant = 0): Type1SupportSlice {
  return {
    grid: { width: 16, depth: 16, floors: 4 },
    actor: { partyIndex: owner, direction, x: 7, y: 8, floor: 2, mapPosition: 647, oldMapPosition: 648,
      statsDeadWord: 0, runtimeDeadWord: 0, controlMethod: 1, windowType: 0, fitness: 65535,
      fallDamage: 100, underwaterCount: 23, drowningCount: 19, waterFallDelay: 17,
      weight: 0xffffffff, headImages: 32 + owner * 4, blockNumber: 32 + owner * 4 + direction },
    oldCell: { mapPosition: 648, x: 8, y: 8, floor: 2 },
    stats: { physique: 100, agility: 0, gender: 0 },
    feedback: { spellShield: variant === 1 ? 87 : 0, fireWhite: variant === 2 ? 1 : 0, gruntCount: 99, fitnessFlashDuration: 253 },
    cells: { current: 647, below: 391, secondBelow: 135,
      currentFirst: (0x400080 | (32 + owner * 4 + direction) << 11 | (owner + variant * 4) << 23 | 2) >>> 0,
      belowFirst: 0x400882, secondBelowFirst: 0x400080, currentSecond: 0xa5bcd321, currentThird: 0xa5bcd321 },
    cheats: { mode2: 0, mode3: 0 }, leaders: [1, 4],
    redrawFlag: 37,
  };
}

describe('initial inert type-one support', () => {
  it('preserves complete owned storage for every owner/direction/variant, with white priority', () => {
    for (let owner = 0; owner < 4; owner++) for (let direction = 0; direction < 4; direction++) for (let variant = 0; variant < 3; variant++) {
      const i = fixture(owner, direction, variant);
      if (variant === 2) i.feedback.spellShield = 87;
      const before = structuredClone(i), r = transitionType1Support(i);
      const damage = variant ? 0 : 100;
      expect(r.candidate).toEqual({ ...before, actor: { ...before.actor, waterFallDelay: 0, fallDamage: 0, fitness: 65535 - damage },
        feedback: { ...before.feedback, fireWhite: 255, fitnessFlashDuration: 254 }, redrawFlag: damage ? 255 : 37 });
      expect(r.helperReturn).toEqual({ actor: 'actor', stats: 'stats', cell: 'current' });
      expect(i).toEqual(before);
      r.candidate.actor.x = 1; r.candidate.cells.currentFirst = 0; r.candidate.stats.agility = 1;
      r.candidate.feedback.fireWhite = 0; r.candidate.leaders[0] = 0; r.candidate.oldCell.x = 1;
      r.candidate.grid.width = 1; r.candidate.cheats.mode2 = 1;
      expect(i).toEqual(before);
    }
  });
  it('orders exact writes, actual damage return, clear and reread, retaining redundant writes', () => {
    const i = fixture(); i.actor.fitness = 1310; i.actor.waterFallDelay = 0; i.feedback.fireWhite = 255;
    i.cells.currentFirst = (i.cells.currentFirst | 8 << 23) >>> 0; i.redrawFlag = 255;
    const r = transitionType1Support(i);
    expect(r.records).toEqual([
      { kind: 'write', target: 'actor.waterFallDelay', width: 2, before: 0, after: 0 },
      { kind: 'write', target: 'feedback.fireWhite', width: 1, before: 255, after: 255 },
      { kind: 'write', target: 'feedback.fitnessFlashDuration', width: 1, before: 253, after: 254 },
      { kind: 'write', target: 'actor.fitness', width: 2, before: 1310, after: 1210 },
      { kind: 'write', target: 'redrawFlag', width: 1, before: 255, after: 255 },
      { kind: 'damage-return', actor: 'actor', stats: 'stats', cell: 'current' },
      { kind: 'write', target: 'actor.fallDamage', width: 4, before: 100, after: 0 },
      { kind: 'cell-reread', cell: 'current', first: i.cells.currentFirst, mask: 0 },
      { kind: 'helper-return', actor: 'actor', stats: 'stats', cell: 'current' },
    ]);
  });
  it('distinguishes no call with fitness zero from real zero damage', () => {
    const i = fixture(); i.actor.fallDamage = 0; i.actor.fitness = 0;
    const r = transitionType1Support(i);
    expect(r.status).toBe('damage-skipped'); expect(r.arithmetic).toBeNull();
    expect(r.candidate).toEqual({ ...i, actor: { ...i.actor, waterFallDelay: 0 } });
    expect(r.records).toEqual([
      { kind: 'write', target: 'actor.waterFallDelay', width: 2, before: 17, after: 0 },
      { kind: 'cell-reread', cell: 'current', first: i.cells.currentFirst, mask: 0 },
      { kind: 'helper-return', actor: 'actor', stats: 'stats', cell: 'current' },
    ]);
    i.actor.fallDamage = 1; i.actor.fitness = 655; i.feedback.fitnessFlashDuration = 255;
    const z = transitionType1Support(i);
    expect(z.arithmetic?.damage).toBe(0); expect(z.candidate.feedback.fitnessFlashDuration).toBe(0);
    expect(z.records.filter(x => x.kind === 'write').map(x => x.target)).toEqual(['actor.waterFallDelay', 'feedback.fireWhite', 'feedback.fitnessFlashDuration', 'actor.fitness', 'actor.fallDamage']);
    i.actor.fitness = 654; const before = structuredClone(i);
    expect(transitionType1Support(i).status).toBe('died'); expect(i).toEqual(before);
  });
  it.each([[100, 755, true], [100, 754, false], [100, 100, false], [100, 99, false], [1, 0, false]])('classifies pending %i fitness %i without input mutation', (pending, fitness, accepted) => {
    const i = fixture(); Object.assign(i.actor, { fallDamage: pending, fitness }); const before = structuredClone(i);
    if (accepted) expect(transitionType1Support(i).candidate.actor.fitness).toBe(655);
    else expect(transitionType1Support(i).status).toBe('died');
    expect(i).toEqual(before);
  });
  it.each([[86, 700], [87, 0], [88, 700]])('uses shield exactly %i', (shield, damage) => {
    const i = fixture(0, 0, 1); i.feedback.spellShield = shield; i.actor.fallDamage = 799;
    expect(transitionType1Support(i).arithmetic?.damage).toBe(damage);
  });
  it.each([[65535, 1, 65535, 0, false, 6553500], [65536, 1, 65536, 0, true, 6291400], [0xffffffff, 65535, 65537, 0, true, 6291400], [65535, 65535, 1, 0, false, 100], [799, 100, 7, 99, false, 700]])('retains full DIVU diagnostics %i/%i', (hit, physique, quotient, remainder, overflow, damage) => {
    expect(computeNormalDamage(hit, physique, 0)).toEqual({ requestedHit: hit, shieldedHit: hit, quotient, remainder, quotientOverflow: overflow, multiplierWord: overflow ? 62914 : quotient, damage });
    const i = fixture(); i.actor.fallDamage = hit; i.stats.physique = physique;
    const r = transitionType1Support(i);
    expect(r.arithmetic?.damage).toBe(damage);
    if (damage > 65535) expect(r.status).toBe('died');
  });
  it('preserves opaque bits, packed cell layers and maximal unchanged weight with zero agility', () => {
    const i = fixture(); for (const k of ['currentFirst', 'belowFirst', 'secondBelowFirst'] as const) i.cells[k] |= 0x7801d8;
    i.feedback.fitnessFlashDuration = 255; i.actor.fallDamage = 6400;
    const r = transitionType1Support(i); expect(r.candidate.cells).toEqual(i.cells);
    expect(r.candidate.actor.weight).toBe(0xffffffff); expect(r.candidate.stats.agility).toBe(0);
    expect(r.candidate.feedback.fitnessFlashDuration).toBe(12);
  });
  it('orders every fatal write and distinct return, including redundant owner zero', () => {
    const i = fixture(); i.actor.fitness = 100; i.leaders = [1, 1];
    i.actor.waterFallDelay = 0; i.redrawFlag = 255;
    const before = structuredClone(i), r = transitionType1Support(i);
    const removed = (i.cells.currentFirst & 0xf07e07fd) >>> 0;
    const cleared = (removed & 0x0fffffdf) >>> 0;
    const corpse = (cleared | 0x70000020) >>> 0;
    const second = (i.cells.currentSecond & 0xfff00fff) >>> 0;
    const ret = (kind: string) => ({ kind, actor: 'actor', stats: 'stats', cell: 'current' });
    expect(r.records).toEqual([
      { kind: 'write', target: 'actor.waterFallDelay', width: 2, before: 0, after: 0 },
      { kind: 'write', target: 'feedback.fireWhite', width: 1, before: 0, after: 255 },
      { kind: 'write', target: 'feedback.fitnessFlashDuration', width: 1, before: 253, after: 254 },
      { kind: 'write', target: 'actor.fitness', width: 2, before: 100, after: 0 },
      { kind: 'write', target: 'actor.statsDeadWord', width: 1, before: 0, after: 255 },
      { kind: 'write', target: 'actor.runtimeDeadWord', width: 1, before: 0, after: 255 },
      { kind: 'write', target: 'leaders.0', width: 2, before: 1, after: 0 },
      { kind: 'write', target: 'leaders.1', width: 2, before: 1, after: 0 },
      { kind: 'write', target: 'actor.oldMapPosition', width: 4, before: 648, after: 647 },
      { kind: 'write', target: 'cells.currentFirst', width: 4, before: i.cells.currentFirst, after: removed },
      { kind: 'release-return', cell: 'current' },
      { kind: 'write', target: 'cells.currentFirst', width: 4, before: removed, after: cleared },
      { kind: 'write', target: 'cells.currentFirst', width: 4, before: cleared, after: corpse },
      { kind: 'write', target: 'cells.currentSecond', width: 4, before: i.cells.currentSecond, after: second },
      { kind: 'write', target: 'cells.currentSecond', width: 4, before: second, after: second },
      { kind: 'death-return', cell: 'current' },
      { kind: 'write', target: 'redrawFlag', width: 1, before: 255, after: 255 },
      ret('damage-return'),
      { kind: 'write', target: 'actor.fallDamage', width: 4, before: 100, after: 0 },
      { kind: 'cell-reread', cell: 'current', first: corpse, mask: 0 },
      ret('helper-return'),
    ]);
    expect(r.candidate).toEqual({ ...before,
      actor: { ...before.actor, oldMapPosition: 647, fitness: 0, statsDeadWord: 0xff00, runtimeDeadWord: 0xff00, waterFallDelay: 0, fallDamage: 0 },
      oldCell: { mapPosition: 647, x: 7, y: 8, floor: 2 },
      cells: { ...before.cells, currentFirst: corpse, currentSecond: second },
      feedback: { ...before.feedback, fireWhite: 255, fitnessFlashDuration: 254 }, leaders: [0, 0], redrawFlag: 255 });
    expect(i).toEqual(before);
  });
  it('covers fatal owners, directions, feedback priority and independent leader matches', () => {
    for (let owner = 0; owner < 4; owner++) for (let direction = 0; direction < 4; direction++) for (let variant = 0; variant < 3; variant++) {
      for (const leaders of [[0, 0], [owner + 1, 0], [0, owner + 1], [owner + 1, owner + 1], [(owner + 1) % 4 + 1, 0]]) {
        const i = fixture(owner, direction, variant); i.leaders = leaders as [number, number];
        i.actor.fitness = 654; i.actor.fallDamage = 1;
        if (variant === 2) i.feedback.spellShield = 87;
        const before = structuredClone(i), r = transitionType1Support(i);
        expect(r.status).toBe('died'); expect(r.candidate.actor.fitness).toBe(654);
        expect(r.candidate.leaders).toEqual(leaders.map(n => n === owner + 1 ? 0 : n));
        expect(r.candidate.cells.currentSecond).toBe(((i.cells.currentSecond & 0xfff00fff) | owner << 12) >>> 0);
        expect(r.candidate.actor).toEqual({ ...i.actor, statsDeadWord: 0xff00, runtimeDeadWord: 0xff00, oldMapPosition: i.actor.mapPosition, waterFallDelay: 0, fallDamage: 0 });
        expect(i).toEqual(before);
        r.candidate.oldCell.x = 0; r.candidate.leaders[0] = 4; r.candidate.cells.belowFirst = 0;
        expect(i).toEqual(before);
      }
    }
  });
  it('retains overdamage fitness without a fitness write and rejects excluded fatal branches atomically', () => {
    const i = fixture(); i.actor.fitness = 99;
    const r = transitionType1Support(i); expect(r.candidate.actor.fitness).toBe(99);
    expect(r.records.some(x => x.kind === 'write' && x.target === 'actor.fitness')).toBe(false);
    for (const change of [
      (x: Type1SupportSlice) => { x.actor.controlMethod = 2; },
      (x: Type1SupportSlice) => { x.cells.currentFirst |= 0x20; },
      (x: Type1SupportSlice) => { x.cells.belowFirst = 0x2002; },
      (x: Type1SupportSlice) => { x.cells.secondBelowFirst |= 0x201; },
      (x: Type1SupportSlice) => { x.feedback.gruntCount = 98; },
    ]) { const bad = structuredClone(i); change(bad); const before = structuredClone(bad); expect(() => transitionType1Support(bad)).toThrow(); expect(bad).toEqual(before); }
  });
  const invalid: ((i: Type1SupportSlice) => void)[] = [
    i => { i.actor.statsDeadWord = 1; }, i => { i.actor.runtimeDeadWord = 0xff00; },
    i => { i.actor.windowType = 7; }, i => { i.actor.windowType = 4; }, i => { i.actor.controlMethod = 0; },
    i => { i.stats.gender = 1; }, i => { i.feedback.gruntCount = 98; }, i => { i.cheats.mode2 = 1; }, i => { i.cheats.mode3 = 1; },
    i => { i.actor.mapPosition++; }, i => { i.cells.current++; }, i => { i.cells.below++; }, i => { i.cells.secondBelow++; },
    i => { i.oldCell.x++; }, i => { i.actor.oldMapPosition++; }, i => { i.actor.floor = 1; },
    i => { i.grid.width = 0; }, i => { i.grid.floors = 2; }, i => { i.actor.x = 16; },
    i => { i.actor.headImages++; }, i => { i.actor.blockNumber++; }, i => { i.actor.direction = 1; },
    i => { i.feedback.fireWhite = 1; }, i => { i.feedback.spellShield = 87; }, i => { i.cells.currentFirst ^= 1 << 23; },
    i => { i.cells.currentFirst |= 1; }, i => { i.cells.belowFirst ^= 2; }, i => { i.cells.belowFirst ^= 0x1800; },
    i => { i.cells.secondBelowFirst |= 2; }, i => { i.cells.secondBelowFirst |= 0x2002; }, i => { i.cells.belowFirst |= 0x201; },
    i => { i.cells.secondBelowFirst |= 0x201; }, i => { i.cells.currentFirst |= 4; }, i => { i.cells.belowFirst |= 4; },
    i => { i.cells.secondBelowFirst |= 4; }, i => { i.cells.currentFirst |= 0x20; }, i => { i.cells.belowFirst |= 0x20; },
    i => { i.cells.secondBelowFirst |= 0x20; }, i => { i.stats.physique = 0; }, i => { i.stats.physique = 65536; },
    i => { i.actor.fallDamage = -1; }, i => { i.actor.fallDamage = 0x100000000; }, i => { i.actor.weight = NaN; },
    i => { i.redrawFlag = Infinity; }, i => { i.stats.agility = 1.5; }, i => { i.leaders[0] = 5; },
  ];
  it.each(invalid.map((mutate, n) => ({ mutate, n })))('rejects malformed/unsupported storage $n without mutation', ({ mutate }) => {
    const i = fixture(); mutate(i); const before = structuredClone(i);
    expect(() => transitionType1Support(i)).toThrow(); expect(i).toEqual(before);
  });
  const boundaries = ['root', 'grid', 'actor', 'oldCell', 'stats', 'feedback', 'cells', 'cheats', 'leaders'] as const;
  it.each(boundaries)('enforces exact own data at %s boundary without getters', boundary => {
    const select = (i: Type1SupportSlice) => boundary === 'root' ? i : i[boundary];
    for (const mode of ['extra', 'hidden', 'symbol', 'accessor', 'inherited']) {
      const i = fixture(), obj = select(i), key = Object.keys(obj)[0]!;
      let calls = 0;
      if (mode === 'extra') Object.defineProperty(obj, 'extra', { value: 1, enumerable: true });
      if (mode === 'hidden') Object.defineProperty(obj, 'extra', { value: 1 });
      if (mode === 'symbol') Object.defineProperty(obj, Symbol('extra'), { value: 1 });
      if (mode === 'accessor') Object.defineProperty(obj, key, { get: () => { calls++; return 1; } });
      if (mode === 'inherited') { const value = Object.getOwnPropertyDescriptor(obj, key)!.value; Reflect.deleteProperty(obj, key); Object.setPrototypeOf(obj, { [key]: value }); }
      expect(() => transitionType1Support(i)).toThrow(); expect(calls).toBe(0);
    }
  });
  it('rejects nonnumeric, fractional, signed and oversized storage at every numeric leaf', () => {
    const seed = fixture();
    for (const [group, obj] of Object.entries(seed)) {
      const keys = typeof obj === 'number' ? [''] : Object.keys(obj);
      for (const key of keys) for (const bad of [NaN, Infinity, -1, 0.5, 0x100000000, '1', null, undefined]) {
        const i = fixture();
        if (key === '') Reflect.set(i, group, bad);
        else Reflect.set(Reflect.get(i, group), key, bad);
        expect(() => transitionType1Support(i)).toThrow();
      }
    }
  });
  it('accepts exact hidden own data and copies it into independent ordinary objects', () => {
    const i = fixture(); for (const obj of [i, i.grid, i.actor, i.oldCell, i.stats, i.feedback, i.cells, i.cheats, i.leaders]) {
      for (const key of Object.keys(obj)) Object.defineProperty(obj, key, { enumerable: false });
    }
    const r = transitionType1Support(i); expect(Object.keys(r.candidate.actor)).toHaveLength(19);
    expect(r.candidate.leaders).toEqual([1, 4]); expect(r.candidate.cells).not.toBe(i.cells);
  });
});
