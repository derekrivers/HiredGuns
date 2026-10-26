import { describe, expect, it } from 'vitest';
import { transitionOrdinaryFloorDeath, type OrdinaryFloorDeathSlice } from '../src/character/death-transition';

// Entirely authored numeric storage, not copied original character/map bytes.
function fixture(partyIndex = 2): OrdinaryFloorDeathSlice {
  const direction = 1;
  return {
    actor: { partyIndex, direction, x: 9, y: 8, floor: 4, mapPosition: 100, oldMapPosition: 99,
      statsDeadWord: 0, runtimeDeadWord: 0, controlMethod: 1, windowType: 0,
      fitness: 50000, fallDamage: 123456, underwaterCount: 7, drowningCount: 150, waterFallDelay: 2 },
    leaders: [partyIndex + 1, 1],
    cell: { mapPosition: 100, first: (3 | (32 + partyIndex * 4 + direction) << 11 | (partyIndex + 4) << 23 | 0x40044) >>> 0,
      second: 0xabcde987, belowFirst: 0 },
  };
}

describe('bounded source ordinary-floor death contract', () => {
  it('removes occupancy, checks pad release, then writes corpse and zero-based owner in order', () => {
    const input = fixture();
    const unchanged = structuredClone(input);
    const { candidate, effects, status } = transitionOrdinaryFloorDeath(input);
    expect(status).toBe('transitioned');
    expect(effects).toEqual([
      { kind: 'occupancy-removed', before: input.cell.first, after: 0x40045 },
      { kind: 'pad-release-checked', outcome: 'not-pressure-pad', first: 0x40045 },
      { kind: 'corpse-written', owner: 2, first: 0x70040065, second: 0xabc02987 },
    ]);
    expect(candidate.cell).toEqual({ ...input.cell, first: 0x70040065, second: 0xabc02987 });
    expect(candidate.actor).toEqual({ ...input.actor, statsDeadWord: 0xff00, runtimeDeadWord: 0xff00, oldMapPosition: 100 });
    expect(candidate.leaders).toEqual([0, 1]);
    expect(input).toEqual(unchanged);
    candidate.actor.x = 0; candidate.leaders[1] = 0; candidate.cell.second = 0;
    expect(input).toEqual(unchanged);
  });

  it('does not derive death from fitness, control method, extraction or pending environmental damage', () => {
    const input = fixture(0);
    input.actor.controlMethod = 0;
    input.actor.fitness = 0;
    input.leaders = [0, 0];
    const result = transitionOrdinaryFloorDeath(input);
    expect(result.status).toBe('transitioned'); // explicit call; zero fitness alone is no flag
    expect(input.actor.statsDeadWord).toBe(0);
    expect(result.candidate.actor).toMatchObject({ controlMethod: 0, windowType: 0, fitness: 0,
      fallDamage: 123456, underwaterCount: 7, drowningCount: 150, waterFallDelay: 2 });
    const nonzeroFitness = transitionOrdinaryFloorDeath(fixture());
    expect(nonzeroFitness.candidate.actor.fitness).toBe(50000);
    const extracted = fixture(); extracted.actor.windowType = 7;
    expect(() => transitionOrdinaryFloorDeath(extracted)).toThrow(/Extracted/);
  });

  it.each([0, 1, 2, 3])('writes party %i ownership and clears only matching leaders', party => {
    const input = fixture(party);
    input.leaders = [party + 1, party + 1];
    const { candidate } = transitionOrdinaryFloorDeath(input);
    expect(candidate.leaders).toEqual([0, 0]);
    expect(candidate.cell.second >>> 12 & 255).toBe(party);
    expect(candidate.actor.x).toBe(input.actor.x);
    expect(candidate.actor.y).toBe(input.actor.y);
    expect(candidate.actor.floor).toBe(input.actor.floor);
    expect(candidate.actor.mapPosition).toBe(input.actor.mapPosition);
  });

  it('is idempotent only for a coherent completed slice and emits no duplicate effects', () => {
    const first = transitionOrdinaryFloorDeath(fixture());
    const second = transitionOrdinaryFloorDeath(first.candidate);
    expect(second).toEqual({ status: 'already-dead', candidate: first.candidate, effects: [] });
    expect(second.candidate).not.toBe(first.candidate);
    const mutations = [
      (s: OrdinaryFloorDeathSlice) => { s.cell.second ^= 1 << 12; },
      (s: OrdinaryFloorDeathSlice) => { s.cell.first |= 2; },
      (s: OrdinaryFloorDeathSlice) => { s.cell.first ^= 1 << 28; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.oldMapPosition--; },
      (s: OrdinaryFloorDeathSlice) => { s.leaders[0] = 3; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.runtimeDeadWord = 0x100; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.statsDeadWord = 0; },
    ];
    for (const mutate of mutations) {
      const input = structuredClone(first.candidate); mutate(input);
      const before = structuredClone(input);
      expect(() => transitionOrdinaryFloorDeath(input)).toThrow();
      expect(input).toEqual(before);
    }
  });

  it('rejects pressure pads, support/search, stairs, doors and existing auxiliary objects atomically', () => {
    const mutations = [
      (s: OrdinaryFloorDeathSlice) => { s.cell.first |= 1 << 9; }, // pressure floor
      (s: OrdinaryFloorDeathSlice) => { s.cell.first &= ~1; }, // support search
      (s: OrdinaryFloorDeathSlice) => { s.cell.belowFirst = 16 << 11 | 2; }, // stairs below checked first
      (s: OrdinaryFloorDeathSlice) => { s.cell.belowFirst = 1 << 11 | 2; }, // ordinary supporting block also outside scope
      ...[7, 8, 9, 10, 11, 12, 13, 14].map(aux => (s: OrdinaryFloorDeathSlice) => { s.cell.first = (s.cell.first | aux << 28 | 32) >>> 0; }),
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input); const before = structuredClone(input);
      expect(() => transitionOrdinaryFloorDeath(input)).toThrow(/unsupported/);
      expect(input).toEqual(before);
    }
  });

  it('validates shape, storage, owned occupancy and lifecycle before returning a candidate', () => {
    const mutations = [
      (s: OrdinaryFloorDeathSlice) => { s.actor.partyIndex = 4; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.fitness = -1; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.waterFallDelay = 65536; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.fallDamage = 0x100000000; },
      (s: OrdinaryFloorDeathSlice) => { s.cell.first = NaN; },
      (s: OrdinaryFloorDeathSlice) => { s.cell.first ^= 1 << 23; }, // different occupant
      (s: OrdinaryFloorDeathSlice) => { s.cell.first ^= 1 << 11; }, // different head/direction
      (s: OrdinaryFloorDeathSlice) => { s.cell.mapPosition--; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.statsDeadWord = 0xff00; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.statsDeadWord = 1; s.actor.runtimeDeadWord = 1; },
      (s: OrdinaryFloorDeathSlice) => { s.actor.statsDeadWord = 0xff01; s.actor.runtimeDeadWord = 0xff01; },
      (s: OrdinaryFloorDeathSlice) => { s.leaders[0] = 5; },
      (s: OrdinaryFloorDeathSlice) => { Reflect.deleteProperty(s.leaders, 1); },
      (s: OrdinaryFloorDeathSlice) => { Object.assign(s.actor, { alive: true }); },
      (s: OrdinaryFloorDeathSlice) => { Object.assign(s.cell, { executePad: () => {} }); },
    ];
    for (const mutate of mutations) {
      const input = fixture(); mutate(input);
      const first = input.cell.first; const actor = { ...input.actor }; const leaders = [...input.leaders];
      expect(() => transitionOrdinaryFloorDeath(input)).toThrow();
      expect(input.cell.first).toBe(first); expect(input.actor).toEqual(actor); expect([...input.leaders]).toEqual(leaders);
    }
  });
});
