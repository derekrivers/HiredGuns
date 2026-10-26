import { expect, test } from 'vitest';
import { cellIndex, inBounds, type LevelData } from '../src/contracts';
const level = { size: { width: 23, depth: 23, height: 20 } } as LevelData;
test('index reaches final source cell and bounds reject guard space', () => {
  expect(cellIndex(level, { x: 22, y: 22, z: 19 })).toBe(10579);
  expect(inBounds(level, { x: 23, y: 0, z: 0 })).toBe(false);
  expect(inBounds(level, { x: 0, y: 0, z: -1 })).toBe(false);
  expect(inBounds(level, { x: 0.5, y: 0, z: 0 })).toBe(false);
});
