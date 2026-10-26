import { describe, expect, it } from 'vitest';
import { transitionDryDescent, type DryDescentSlice } from '../src/character/dry-descent';
import { composeOrdinaryFloorLanding } from '../src/character/landing-damage';

function fixture(owner = 0, direction = 0, variant = 0): DryDescentSlice {
  return {
    grid: { width: 16, depth: 16, floors: 4 },
    actor: { partyIndex: owner, direction, x: 7, y: 8, floor: 2, mapPosition: 647, oldMapPosition: 648,
      statsDeadWord: 0, runtimeDeadWord: 0, controlMethod: 1, windowType: 0, fitness: 65535,
      fallDamage: 0, underwaterCount: 23, drowningCount: 19, waterFallDelay: 17,
      weight: 0, headImages: 32 + owner * 4, blockNumber: 32 + owner * 4 + direction },
    oldCell: { mapPosition: 648, x: 8, y: 8, floor: 2 },
    stats: { physique: 100, agility: 100, gender: 0 },
    feedback: { spellShield: variant === 1 ? 87 : 0, fireWhite: variant === 2 ? 1 : 0, gruntCount: 99, fitnessFlashDuration: 253 },
    cells: { source: 647, destination: 391, secondBelow: 135,
      sourceFirst: (0x400080 | (32 + owner * 4 + direction) << 11 | (owner + variant * 4) << 23 | 2) >>> 0,
      destinationFirst: 0x400081, secondBelowFirst: 0x400080, destinationThird: 0xa5bcd321 },
    redrawFlag: 37,
  };
}

describe('pure bounded one-cell dry descent', () => {
  it('moves every initialized owner/direction/feedback variant and preserves unrelated storage', () => {
    for (let owner = 0; owner < 4; owner++) for (let direction = 0; direction < 4; direction++) for (let variant = 0; variant < 3; variant++) {
      const input = fixture(owner, direction, variant), before = structuredClone(input);
      const r = transitionDryDescent(input), a = r.candidate.actor;
      expect(input).toEqual(before);
      expect(a).toEqual({ ...input.actor, floor: 1, oldMapPosition: 647, mapPosition: 391, fallDamage: 6400, waterFallDelay: 0 });
      expect(r.candidate.cells).toEqual({ ...input.cells, sourceFirst: 0x400080,
        destinationFirst: (input.cells.sourceFirst | 1) >>> 0, destinationThird: 0x85bcd321 });
      expect(r.candidate.oldCell).toEqual({ mapPosition: 647, x: 7, y: 8, floor: 2 });
      expect(r.candidate.feedback).toEqual(input.feedback);
      expect(r.helperReturn).toEqual({ actor: 'actor', stats: 'stats', cell: 'source' });
      expect(r.candidate.redrawFlag).toBe(255);
      r.candidate.actor.fitness = 1; r.candidate.stats.agility = 1;
      expect(input).toEqual(before);
    }
  });
  it('records every write including redundant clear and exact helper entry order', () => {
    const r = transitionDryDescent(fixture());
    expect(r.records).toEqual([
      { kind: 'write', target: 'actor.waterFallDelay', width: 2, before: 17, after: 0 },
      { kind: 'write', target: 'cells.sourceFirst', width: 4, before: 0x410082, after: 0x400080 },
      { kind: 'write', target: 'actor.oldMapPosition', width: 4, before: 648, after: 647 },
      { kind: 'write', target: 'actor.mapPosition', width: 4, before: 647, after: 391 },
      { kind: 'write', target: 'actor.floor', width: 1, before: 2, after: 1 },
      { kind: 'write', target: 'actor.fallDamage', width: 4, before: 0, after: 6400 },
      { kind: 'release-check', cell: 'source', first: 0x400080, outcome: 'not-pressure-pad' },
      { kind: 'push-check', cell: 'destination', first: 0x400081, outcome: 'not-pressure-pad' },
      { kind: 'mine-check', cell: 'destination', first: 0x400081, outcome: 'no-mine' },
      { kind: 'write', target: 'cells.destinationThird', width: 4, before: 0xa5bcd321, after: 0x85bcd321 },
      { kind: 'head-insertion', cell: 'destination', blockNumber: 32, variant: 0 },
      { kind: 'write', target: 'actor.blockNumber', width: 2, before: 32, after: 32 },
      { kind: 'write', target: 'cells.destinationFirst', width: 4, before: 0x400081, after: 0x400081 },
      { kind: 'write', target: 'cells.destinationFirst', width: 4, before: 0x400081, after: 0x410083 },
      { kind: 'write', target: 'redrawFlag', width: 1, before: 37, after: 255 },
    ]);
  });
  it.each([
    [0, 299, 100, 100, 6528], [0, 65535, 1, 1, 0], [0, 65535, 1, 2, 64],
    [0, 0xfffeffff, 65535, 100, 6336], [0, 0, 1, 0, 0],
    [0x7fffff, 0, 100, 100, 0xfffffe], [0x800000, 0, 100, 100, 0x1000000],
    [0x800001, 0, 100, 100, 0x1000000], [0x40000000, 0, 100, 100, 0x80000000],
    [0x7fffffff, 0, 100, 100, 0xfffffffe], [0x80000000, 0, 100, 100, 0],
    [0xffffffff, 0, 100, 100, 0xfffffffe],
  ])('preserves word/long arithmetic pending %i weight %i agility %i physique %i', (pending, weight, agility, physique, expected) => {
    const input = fixture(); Object.assign(input.actor, { fallDamage: pending, weight }); Object.assign(input.stats, { agility, physique });
    const r = transitionDryDescent(input);
    expect(r.candidate.actor.fallDamage).toBe(expected);
    expect(r.arithmetic.pending).toBe(expected);
    expect(r.arithmetic.quotient).toBe(pending ? null : Math.floor(weight / agility));
  });
  it('preserves every opaque permitted packed bit and white takes precedence over shield', () => {
    const i = fixture(3, 2, 2); i.feedback.spellShield = 87;
    i.cells.sourceFirst |= 0x7801d8; i.cells.destinationFirst |= 0x7801d8; i.cells.secondBelowFirst |= 0x7801d8;
    const r = transitionDryDescent(i);
    expect(r.candidate.cells.sourceFirst).toBe((i.cells.sourceFirst & 0xf07e07fd) >>> 0);
    expect(r.candidate.cells.destinationFirst).toBe(((i.cells.destinationFirst & 0xf07e07fd) | 46 << 11 | 11 << 23 | 2) >>> 0);
    expect(r.candidate.cells.secondBelowFirst).toBe(i.cells.secondBelowFirst);
  });
  const invalid: ((i: DryDescentSlice) => void)[] = [
    i => { i.actor.statsDeadWord = 1; }, i => { i.actor.runtimeDeadWord = 0xff00; },
    i => { i.actor.windowType = 7; }, i => { i.actor.controlMethod = 0; }, i => { i.stats.gender = 1; }, i => { i.feedback.gruntCount = 98; },
    i => { i.actor.mapPosition++; }, i => { i.cells.destination++; }, i => { i.cells.secondBelow++; },
    i => { i.oldCell.x++; }, i => { i.actor.oldMapPosition++; }, i => { i.actor.floor = 1; },
    i => { i.grid.width = 0; }, i => { i.grid.floors = 2; }, i => { i.actor.x = 16; },
    i => { i.actor.headImages++; }, i => { i.actor.blockNumber++; }, i => { i.actor.direction = 1; },
    i => { i.feedback.fireWhite = 1; }, i => { i.cells.sourceFirst ^= 1 << 23; },
    i => { i.cells.sourceFirst |= 1; }, i => { i.cells.destinationFirst |= 0x200; },
    i => { i.cells.destinationFirst |= 2; }, i => { i.cells.destinationFirst |= 1 << 23; },
    i => { i.cells.secondBelowFirst |= 4 << 11 | 2; }, i => { i.cells.secondBelowFirst |= 2; },
    i => { i.cells.sourceFirst |= 4; }, i => { i.cells.destinationFirst |= 0x20000; }, i => { i.cells.secondBelowFirst |= 0x20; },
    i => { i.stats.agility = 0; }, i => { i.actor.weight = 65536; i.stats.agility = 1; },
    i => { i.actor.fallDamage = 1; i.actor.weight = 65536; i.stats.agility = 1; },
    i => { i.actor.weight = -1; }, i => { i.stats.physique = 65536; }, i => { i.redrawFlag = 256; },
    i => { i.actor.waterFallDelay = 0.5; }, i => { i.cells.destinationThird = NaN; },
  ];
  it.each(invalid.map((edit, n) => ({ edit, n })))('rejects unsupported storage/geometry atomically $n', ({ edit }) => {
    const input = fixture(); edit(input); const before = structuredClone(input);
    expect(() => transitionDryDescent(input)).toThrow(); expect(input).toEqual(before);
  });
  it('rejects extra, symbol, inherited and accessor fields without executing getters', () => {
    for (const select of [(i: DryDescentSlice) => i, (i: DryDescentSlice) => i.actor, (i: DryDescentSlice) => i.grid, (i: DryDescentSlice) => i.oldCell, (i: DryDescentSlice) => i.stats, (i: DryDescentSlice) => i.cells, (i: DryDescentSlice) => i.feedback]) {
      for (const kind of ['extra', 'symbol', 'accessor', 'inherited']) {
        const i = fixture(), target = select(i), key = Object.keys(target)[0]!; let calls = 0;
        if (kind === 'extra') Object.defineProperty(target, 'extra', { value: 0 });
        if (kind === 'symbol') Object.defineProperty(target, Symbol(), { value: 0 });
        if (kind === 'accessor') Object.defineProperty(target, key, { get: () => { calls++; return 0; } });
        if (kind === 'inherited') { const value = (target as unknown as Record<string, unknown>)[key]; Reflect.deleteProperty(target, key); Object.setPrototypeOf(target, { [key]: value }); }
        expect(() => transitionDryDescent(i)).toThrow(); expect(calls).toBe(0);
      }
    }
  });
  it('copies exact nonenumerable own data before computing', () => {
    const i = fixture(); Object.defineProperty(i.actor, 'weight', { value: 299, enumerable: false });
    expect(transitionDryDescent(i).candidate.actor.fallDamage).toBe(6528);
  });
  it('leaves later landing to the separate existing composition', () => {
    const r = transitionDryDescent(fixture()), a = r.candidate.actor;
    const { weight: _weight, headImages: _head, blockNumber: _block, ...actor } = a;
    expect([_weight, _head, _block]).toEqual([0, 32, 32]);
    const landing = composeOrdinaryFloorLanding({ gender: 0, redrawFlag: r.candidate.redrawFlag, damage: {
      death: { actor, leaders: [1, 4], cell: { mapPosition: a.mapPosition, first: r.candidate.cells.destinationFirst, second: 0xa5bcd321, belowFirst: r.candidate.cells.secondBelowFirst } },
      physique: 100, spellShield: 0, cheatMode2: 0, cheatMode3: 0, fireWhite: 0, fitnessFlashDuration: 253, gruntCount: 99,
    } });
    expect(a.fallDamage).toBe(6400); expect(a.fitness).toBe(65535);
    expect(landing.candidate.damage.death.actor.fitness).toBe(59135);
    expect(landing.candidate.damage.death.actor.fallDamage).toBe(0);
  });
});
