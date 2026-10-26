import { expect, test } from 'vitest';
import { cellIndex, type LevelData } from '../src/contracts';
import { blockSurfaces, type SurfaceData } from '../src/render/grid-mesh';
const empty = (): LevelData => ({ size: { width: 4, depth: 5, height: 3 }, layers: [Array<number>(60).fill(0), [], []] } as unknown as LevelData);
function area(surface: SurfaceData): number {
  let sum = 0;
  for (let i = 0; i < surface.positions.length; i += 9) {
    const p = surface.positions;
    const a = [p[i + 3]! - p[i]!, p[i + 4]! - p[i + 1]!, p[i + 5]! - p[i + 2]!];
    const b = [p[i + 6]! - p[i]!, p[i + 7]! - p[i + 1]!, p[i + 8]! - p[i + 2]!];
    const cross = [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
    expect(cross.reduce((s, n, axis) => s + n * surface.normals[i + axis]!, 0)).toBeGreaterThan(0);
    sum += Math.hypot(...cross) / 2;
  }
  return sum;
}
test('two adjacent solid cells become six correctly wound rectangles with no internal face', () => {
  const level = empty();
  for (const x of [1, 2]) level.layers[0][cellIndex(level, { x, y: 3, z: 1 })] = 2;
  const mesh = blockSurfaces(level);
  expect(mesh.walls.positions).toHaveLength(6 * 6 * 3);
  expect(area(mesh.walls)).toBe(10);
  expect(mesh.exits.positions).toHaveLength(0);
  for (let i = 0; i < mesh.walls.positions.length; i += 3) {
    expect(mesh.walls.positions[i]).toBeGreaterThanOrEqual(1);
    expect(mesh.walls.positions[i + 1]).toBeGreaterThanOrEqual(1);
    expect(mesh.walls.positions[i + 1]).toBeLessThanOrEqual(2);
    expect(mesh.walls.positions[i + 2]).toBeGreaterThanOrEqual(3);
  }
});
test('a hollow block retains its inner surfaces and opaque-only cells are visible', () => {
  const level = empty();
  for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    if (x !== 1 || y !== 1 || z !== 1) level.layers[0][cellIndex(level, { x, y, z })] = 64;
  }
  const mesh = blockSurfaces(level);
  expect(area(mesh.walls)).toBe(60);
  expect(mesh.walls.positions).toHaveLength(12 * 6 * 3);
});
test('exit colour remains distinct while solid neighbours hide shared faces', () => {
  const level = empty(); level.layers[0][0] = 2; level.layers[0][1] = (3 << 11) | 2;
  const mesh = blockSurfaces(level);
  expect(area(mesh.walls)).toBe(5); expect(area(mesh.exits)).toBe(5);
  expect(mesh.exits.positions.length).toBeGreaterThan(0);
});
