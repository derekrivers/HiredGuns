import { cellIndex, type LevelData } from './contracts';

/** Newly authored synthetic fixture. No original map or artwork. */
export function createDemoLevel(): LevelData {
  const level: LevelData = {
    schemaVersion: 1, id: 'synthetic-navigation-v1', name: 'Navigation proving ground',
    source: { kind: 'synthetic', sha256: null, revision: 'synthetic' },
    size: { width: 12, depth: 12, height: 3 },
    layers: [Array<number>(432).fill(0), Array<number>(432).fill(0), Array<number>(432).fill(0)],
    starts: [
      { x: 3, y: 8, z: 1, facing: 0 }, { x: 5, y: 8, z: 1, facing: 0 },
      { x: 7, y: 8, z: 1, facing: 0 }, { x: 9, y: 8, z: 1, facing: 0 },
    ],
    exit: { x: 6, y: 1, z: 1 }, unsupportedMechanics: ['Synthetic navigation only: no mission, combat or exit logic'],
  };
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    level.layers[0][cellIndex(level, { x, y, z: 0 })] = 2;
    if (x === 0 || y === 0 || x === 11 || y === 11 || (y === 4 && x > 2 && x < 9 && x !== 6)) {
      level.layers[0][cellIndex(level, { x, y, z: 1 })] = 2;
      level.layers[0][cellIndex(level, { x, y, z: 2 })] = 2;
    }
  }
  return level;
}
