import { cellIndex, inBounds, type Action, type LevelData, type Position, type WorldState } from '../../src/contracts';
import { DIRECTIONS, obstruction } from '../../src/sim/world';

/** Test-only bounded BFS of the current static subset; never evidence of original parity. */
export function exitRoute(level: LevelData, world: WorldState, mercenaryId: number): { action: Action; target: Position; exits: boolean }[] {
  const start = world.mercenaries[mercenaryId]!;
  const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;
  const key = (p: Position) => `${p.x},${p.y},${p.z}`;
  const queue: Position[] = [start];
  const parents = new Map<string, { previous: Position; direction: number }>();
  const visited = new Set([key(start)]);
  const relativeActions: Action[] = ['forward', 'strafe-right', 'backward', 'strafe-left'];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const p = queue[cursor]!;
    for (let direction = 0; direction < 4; direction++) {
      const delta = DIRECTIONS[direction]!, n = { x: p.x + delta.x, y: p.y + delta.y, z: p.z };
      if (!inBounds(level, n)) continue;
      const word = level.layers[0][cellIndex(level, n)]!;
      if ((word & 2) && ((word >>> 11) & 63) === 3) {
        const result = [{ action: relativeActions[(direction - start.facing + 4) % 4]!, target: p, exits: true }];
        let current = p;
        while (!same(current, start)) {
          const edge = parents.get(key(current))!;
          result.push({ action: relativeActions[(edge.direction - start.facing + 4) % 4]!, target: current, exits: false });
          current = edge.previous;
        }
        return result.reverse();
      }
      if (visited.has(key(n)) || obstruction(level, n) || world.mercenaries.some((other, i) => i !== mercenaryId && !world.mission.exited[i] && same(other, n))) continue;
      visited.add(key(n)); parents.set(key(n), { previous: p, direction }); queue.push(n);
    }
  }
  throw new Error(`No supported static exit route for mercenary ${mercenaryId}`);
}
