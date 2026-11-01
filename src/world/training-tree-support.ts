import { cellIndex, type LevelData } from '../contracts';

export const TREE_SUPPORT_ID = 'synthetic-training43-mov02-tree-v1';
export const TREE_SUPPORT_TITLE = 'Static tree support — authored demonstration';

/** Standalone synthetic teaching fixture. No original Training43 geometry. */
export function createTreeSupportLevel(): LevelData {
  const level: LevelData = {
    schemaVersion: 1, id: TREE_SUPPORT_ID, name: TREE_SUPPORT_TITLE,
    source: { kind: 'synthetic', sha256: null, revision: 'synthetic' },
    size: { width: 7, depth: 5, height: 4 },
    layers: [Array<number>(140).fill(0), Array<number>(140).fill(0), Array<number>(140).fill(0)],
    starts: [
      { x: 2, y: 2, z: 2, facing: 1 }, { x: 0, y: 0, z: 2, facing: 0 },
      { x: 0, y: 2, z: 2, facing: 0 }, { x: 0, y: 4, z: 2, facing: 0 },
    ],
    exit: { x: 6, y: 4, z: 2 },
    unsupportedMechanics: ['Standalone synthetic Training43 teaching fixture: static step and return only; no original-map route, gravity, native retention or parity.'],
  };
  for (const start of level.starts) level.layers[0][cellIndex(level, start)] = 1;
  level.layers[0][cellIndex(level, { x: 3, y: 2, z: 0 })] = 8194;
  return level;
}
