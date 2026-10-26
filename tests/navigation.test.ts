import { expect, test } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { cellIndex, type PlayerCommand } from '../src/contracts';
import { createWorld, nextRandom, obstruction, stepWorld } from '../src/sim/world';
import { FixedClock } from '../src/sim/clock';

test('four simultaneous moves share a world, preserve input state and ignore command array order', () => {
  const level = createDemoLevel(), start = createWorld(level);
  const commands: PlayerCommand[] = [0, 1, 2, 3].map(mercenaryId => ({ mercenaryId, action: 'forward' }));
  const a = stepWorld(level, start, commands), b = stepWorld(level, start, [...commands].reverse());
  expect(a).toEqual(b);
  expect(a.world.mercenaries.map(p => p.y)).toEqual([7, 7, 7, 7]);
  expect(start.mercenaries.map(p => p.y)).toEqual([8, 8, 8, 8]);
  expect(a.events.filter(e => e.kind === 'moved')).toHaveLength(4);
});
test('walls, missing support, hazards, grid boundary and occupied squares block navigation', () => {
  const level = createDemoLevel(), world = createWorld(level);
  world.mercenaries[0] = { id: 0, x: 3, y: 5, z: 1, facing: 0 };
  expect(stepWorld(level, world, [{ mercenaryId: 0, action: 'forward' }]).events[0]?.reason).toBe('block');
  level.layers[0][cellIndex(level, { x: 3, y: 6, z: 0 })] = 0;
  expect(obstruction(level, { x: 3, y: 6, z: 1 })).toBe('unsupported drop');
  level.layers[0][cellIndex(level, { x: 4, y: 6, z: 1 })] = 5;
  expect(obstruction(level, { x: 4, y: 6, z: 1 })).toBe('unsupported environment');
  expect(obstruction(level, { x: -1, y: 1, z: 1 })).toBe('boundary');
  level.layers[0][cellIndex(level, { x: 2, y: 6, z: 1 })] = 64;
  expect(obstruction(level, { x: 2, y: 6, z: 1 })).toBe('block');
  world.mercenaries[1] = { id: 1, x: 4, y: 5, z: 1, facing: 3 };
  const swap = stepWorld(level, world, [{ mercenaryId: 0, action: 'strafe-right' }, { mercenaryId: 1, action: 'forward' }]);
  expect(swap.events.map(e => e.reason)).toEqual(['occupied', 'occupied']);
});
test('contested destination winner is stable and duplicate commands reject atomically', () => {
  const level = createDemoLevel(), world = createWorld(level);
  const result = stepWorld(level, world, [{ mercenaryId: 1, action: 'strafe-left' }, { mercenaryId: 0, action: 'strafe-right' }]);
  expect(result.events.map(e => e.kind)).toEqual(['moved', 'blocked']);
  expect(() => stepWorld(level, world, [{ mercenaryId: 0, action: 'forward' }, { mercenaryId: 0, action: 'backward' }])).toThrow('Duplicate');
  expect(world.tick).toBe(0);
});
test('turns and backward/strafe movement are relative to facing', () => {
  const level = createDemoLevel(); let world = createWorld(level);
  world = stepWorld(level, world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
  expect(world.mercenaries[0].facing).toBe(1);
  world = stepWorld(level, world, [{ mercenaryId: 0, action: 'backward' }]).world;
  expect(world.mercenaries[0].x).toBe(2);
  world = stepWorld(level, world, [{ mercenaryId: 0, action: 'strafe-left' }]).world;
  expect(world.mercenaries[0].y).toBe(7);
});
test('command replay continues identically after JSON round trip; RNG uses explicit state', () => {
  const level = createDemoLevel(); let world = createWorld(level);
  for (let i = 0; i < 3; i++) world = stepWorld(level, world, [{ mercenaryId: 0, action: 'forward' }]).world;
  const snapshot = JSON.parse(JSON.stringify(world));
  expect(stepWorld(level, snapshot, [{ mercenaryId: 1, action: 'forward' }])).toEqual(stepWorld(level, world, [{ mercenaryId: 1, action: 'forward' }]));
  expect(nextRandom(1)).toBe(270369);
  expect(nextRandom(1)).toBe(nextRandom(1));
});
test('fixed clock batches at 50 Hz and limits catchup after suspension', () => {
  const clock = new FixedClock(); let ticks = 0;
  clock.advance(19, () => ticks++); expect(ticks).toBe(0);
  clock.advance(1, () => ticks++); expect(ticks).toBe(1);
  clock.advance(10000, () => ticks++); expect(ticks).toBe(6);
  clock.reset(); expect(clock.advance(0, () => ticks++)).toBe(0);
});
