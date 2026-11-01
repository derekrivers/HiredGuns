import { describe, expect, it } from 'vitest';
import { cellIndex, type PlayerCommand, type WorldState } from '../src/contracts';
import { createTreeSupportLevel } from '../src/world/training-tree-support';
import { createWorld, stepWorld } from '../src/sim/world';
import { obstruction, resolveTraversal } from '../src/sim/traversal';
import { dryFallEnabled, selectedFallLevel } from '../src/sim/fall';
import { extractionProfile, missionRulesForLevel } from '../src/sim/mission-profile';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';

const a = { x: 2, y: 2, z: 2, facing: 1 } as const;
const b = { x: 3, y: 2, z: 2 };
const forward: PlayerCommand[] = [{ mercenaryId: 0, action: 'forward' }];
const backward: PlayerCommand[] = [{ mercenaryId: 0, action: 'backward' }];
function expectedWorld(initial: WorldState, tick: number, x: number): WorldState {
  const expected = structuredClone(initial);
  expected.tick = tick; expected.mercenaries[0].x = x;
  return expected;
}

describe('standalone synthetic Training43 MOV-02 static tree support', () => {
  it('pins all fixture metadata, words, starts and the static navigation-only world', () => {
    const level = createTreeSupportLevel();
    const plane = Array<number>(140).fill(0);
    // Independent flattened indices: ((z * 5) + y) * 7 + x.
    for (const index of [86, 70, 84, 98]) plane[index] = 1;
    plane[17] = 8194;
    expect(level).toEqual({
      schemaVersion: 1, id: 'synthetic-training43-mov02-tree-v1',
      name: 'Static tree support — authored demonstration',
      source: { kind: 'synthetic', sha256: null, revision: 'synthetic' },
      size: { width: 7, depth: 5, height: 4 },
      layers: [plane, Array<number>(140).fill(0), Array<number>(140).fill(0)],
      starts: [a, { x: 0, y: 0, z: 2, facing: 0 }, { x: 0, y: 2, z: 2, facing: 0 }, { x: 0, y: 4, z: 2, facing: 0 }],
      exit: { x: 6, y: 4, z: 2 },
      unsupportedMechanics: ['Standalone synthetic Training43 teaching fixture: static step and return only; no original-map route, gravity, native retention or parity.'],
    });
    expect(createWorld(level)).toEqual({
      schemaVersion: 3, levelId: level.id, tick: 0, rng: 0x48475231,
      mercenaries: level.starts.map((start, id) => ({ ...start, id })),
      physics: { mode: 'static' },
      mission: { rules: { mode: 'navigation', timeLimit: null }, outcome: 'active', exited: [false, false, false, false], clock: null, winner: null },
    });
    expect(dryFallEnabled(level)).toBe(false);
    expect(selectedFallLevel(level)).toBe(false);
    expect(extractionProfile(level)).toBeNull();
    expect(missionRulesForLevel(level)).toEqual({ mode: 'navigation', timeLimit: null });
    for (const mode of ['cooperative-extraction', 'first-exit'] as const) expect(() => missionRulesForLevel(level, mode)).toThrow('not enabled');
  });

  it('admits the empty tree-supported pose and returns with only tick and slot0 x changed', () => {
    const level = createTreeSupportLevel(), initial = createWorld(level);
    const inputs = structuredClone({ level, initial, forward, backward });
    expect(obstruction(level, b)).toBeNull();
    expect(resolveTraversal(level, a, 1)).toEqual({ target: b, kind: 'level', reason: null });
    const high = stepWorld(level, initial, forward);
    const highSnapshot = structuredClone(high);
    expect(high).toEqual({ world: expectedWorld(initial, 1, 3), events: [{ tick: 1, mercenaryId: 0, kind: 'moved' }] });
    expect(resolveTraversal(level, high.world.mercenaries[0], 3)).toEqual({ target: { x: 2, y: 2, z: 2 }, kind: 'level', reason: null });
    expect(stepWorld(level, high.world, backward)).toEqual({ world: expectedWorld(initial, 2, 2), events: [{ tick: 2, mercenaryId: 0, kind: 'moved' }] });
    expect(high).toEqual(highSnapshot);
    expect({ level, initial, forward, backward }).toEqual(inputs);
  });

  it('round trips tick1 through save3, continues identically and retries from a fresh fixture', async () => {
    const level = createTreeSupportLevel(), initial = createWorld(level);
    const high = stepWorld(level, initial, forward).world;
    const before = structuredClone({ level, initial, high });
    const json = await exportCheckpoint(level, high);
    expect(JSON.parse(json).version).toBe(3);
    const loaded = await importCheckpoint(createTreeSupportLevel(), json);
    expect(loaded).toEqual(high);
    expect(stepWorld(level, loaded, backward)).toEqual(stepWorld(level, high, backward));
    expect({ level, initial, high }).toEqual(before);
    const retryLevel = createTreeSupportLevel();
    expect(retryLevel).toEqual(level); expect(retryLevel).not.toBe(level);
    expect(retryLevel.layers[0]).not.toBe(level.layers[0]);
    const retry = createWorld(retryLevel);
    expect(retry).toEqual(initial);
    expect(stepWorld(retryLevel, retry, forward)).toEqual({ world: high, events: [{ tick: 1, mercenaryId: 0, kind: 'moved' }] });
  });

  for (const [label, word] of [['missing', 0], ['pushable', 8194 | 256]] as const) {
    it(`rejects ${label} tree support without changing any pose`, () => {
      const level = createTreeSupportLevel();
      level.layers[0][cellIndex(level, { ...b, z: 0 })] = word;
      const initial = createWorld(level);
      expect(obstruction(level, b)).toBe('unsupported drop');
      expect(resolveTraversal(level, a, 1)).toEqual({ target: b, kind: 'level', reason: 'unsupported drop' });
      expect(stepWorld(level, initial, forward)).toEqual({ world: expectedWorld(initial, 1, 2), events: [{ tick: 1, mercenaryId: 0, kind: 'blocked', reason: 'unsupported drop' }] });
    });
  }

  // A stone word2 would independently support B; use a non-supporting solid
  // type1 plus opaque/environment obstructions to isolate tree admission.
  for (const word of [2050, 64, 4, 256, 32]) {
    it(`rejects obstructed intermediate word ${word}`, () => {
      const level = createTreeSupportLevel();
      level.layers[0][cellIndex(level, { ...b, z: 1 })] = word;
      const initial = createWorld(level);
      expect(resolveTraversal(level, a, 1)).toEqual({ target: b, kind: 'level', reason: 'unsupported drop' });
      expect(stepWorld(level, initial, forward)).toEqual({ world: expectedWorld(initial, 1, 2), events: [{ tick: 1, mercenaryId: 0, kind: 'blocked', reason: 'unsupported drop' }] });
    });
  }

  it('refuses floorless entry immediately above block4 from a separately valid adjacent origin', () => {
    const level = createTreeSupportLevel(), origin = { ...a, z: 1 }, target = { ...b, z: 1 };
    level.starts[0] = origin;
    level.layers[0][cellIndex(level, origin)] = 1;
    const initial = createWorld(level);
    expect(obstruction(level, origin)).toBeNull();
    expect(resolveTraversal(level, origin, 1)).toEqual({ target, kind: 'level', reason: 'block4 entry' });
    expect(stepWorld(level, initial, forward)).toEqual({ world: expectedWorld(initial, 1, 2), events: [{ tick: 1, mercenaryId: 0, kind: 'blocked', reason: 'block4 entry' }] });
  });
});
