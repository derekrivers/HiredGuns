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

/** A separate newly authored mission fixture; the navigation map remains unchanged. */
export function createExtractionDemo(): LevelData {
  const level = createDemoLevel();
  level.id = 'synthetic-extraction-v1'; level.name = 'Extraction drill';
  level.exit = { x: 6, y: 1, z: 1 };
  level.layers[0][cellIndex(level, level.exit)] = (3 << 11) | 2;
  level.unsupportedMechanics = ['Synthetic extraction drill; not an original mission'];
  return level;
}

/** Four dry source-shaped stair lanes, with no original map data. */
export function createStairsDemo(): LevelData {
  const level: LevelData = {
    schemaVersion: 1, id: 'synthetic-stairs-v1', name: 'Dry stair drill',
    source: { kind: 'synthetic', sha256: null, revision: 'synthetic' },
    size: { width: 12, depth: 12, height: 5 },
    layers: [Array<number>(720).fill(0), Array<number>(720).fill(0), Array<number>(720).fill(0)],
    starts: [2, 4, 6, 8].map(x => ({ x, y: 8, z: 1, facing: 0 })) as LevelData['starts'],
    exit: { x: 6, y: 1, z: 2 }, unsupportedMechanics: ['Dry static stairs only; no falling, water, combat or mission objective'],
  };
  const put = (x: number, y: number, z: number, word: number) => { level.layers[0][cellIndex(level, { x, y, z })] = word; };
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    put(x, y, 0, 2);
    if (x === 0 || y === 0 || x === 11 || y === 11) {
      for (let z = 1; z < 5; z++) put(x, y, z, 2);
    } else {
      put(x, y, 1, 1);
      if (y <= 6) put(x, y, 2, 1);
    }
  }
  for (const x of [2, 4, 6, 8]) {
    put(x, 8, 1, ((8 << 28) | 32 | 1) >>> 0);
    put(x, 7, 1, (16 << 11) | 2);
  }
  return level;
}

/** Authored characters and geometry for dry fall damage/recovery testing. */
export function createFallDemo(): LevelData {
  const level: LevelData = {
    schemaVersion: 1, id: 'synthetic-fall-v1', name: 'Dry fall drill',
    source: { kind: 'synthetic', sha256: null, revision: 'synthetic' },
    size: { width: 12, depth: 12, height: 9 },
    layers: [Array<number>(1296).fill(0), Array<number>(1296).fill(0), Array<number>(1296).fill(0)],
    starts: [
      {x:2,y:8,z:3,facing:0}, {x:4,y:8,z:4,facing:0},
      {x:6,y:8,z:5,facing:0}, {x:8,y:8,z:7,facing:0},
    ],
    exit: {x:6,y:1,z:1},
    unsupportedMechanics: ['Synthetic empty-inventory profiles; dry falls only. No original roster, water, squash or corpses.'],
  };
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    level.layers[0][cellIndex(level,{x,y,z:0})] = 2;
    if (x === 0 || y === 0 || x === 11 || y === 11) {
      for (let z = 1; z < 9; z++) level.layers[0][cellIndex(level,{x,y,z})] = 2;
    } else level.layers[0][cellIndex(level,{x,y,z:1})] = 1;
  }
  for (const p of level.starts) level.layers[0][cellIndex(level,p)] = 1;
  return level;
}
