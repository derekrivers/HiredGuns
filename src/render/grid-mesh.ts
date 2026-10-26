import { cellIndex, type LevelData } from '../contracts';

export interface SurfaceData { positions: number[]; normals: number[] }
/** Greedy faces for static placeholder blocks. Grid axes become Three x,z,y. */
export function blockSurfaces(level: LevelData): { walls: SurfaceData; exits: SurfaceData; stairs: SurfaceData } {
  const walls: SurfaceData = { positions: [], normals: [] }, exits: SurfaceData = { positions: [], normals: [] }, stairs: SurfaceData = { positions: [], normals: [] };
  const dimensions = [level.size.width, level.size.height, level.size.depth];
  const materialAt = (p: number[]): number => {
    if (p.some((coordinate, axis) => coordinate < 0 || coordinate >= dimensions[axis]!)) return 0;
    const word = level.layers[0][cellIndex(level, { x: p[0]!, y: p[2]!, z: p[1]! })]!;
    const block = (word >>> 11) & 63;
    return word & 66 ? (word & 2) && block === 3 ? 2 : (word & 2) && block >= 16 && block <= 19 ? 3 : 1 : 0;
  };
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    const width = dimensions[u]!, height = dimensions[v]!;
    for (let slice = 0; slice < dimensions[axis]!; slice++) {
      const mask = new Uint8Array(width * height);
      for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
        const p = [0, 0, 0]; p[axis] = slice; p[u] = column; p[v] = row;
        const material = materialAt(p); p[axis] = slice + sign;
        if (material && !materialAt(p)) mask[row * width + column] = material;
      }
      for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
        const material = mask[row * width + column]!;
        if (!material) continue;
        let w = 1, h = 1;
        while (column + w < width && mask[row * width + column + w] === material) w++;
        outer: while (row + h < height) {
          for (let i = 0; i < w; i++) if (mask[(row + h) * width + column + i] !== material) break outer;
          h++;
        }
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) mask[(row + j) * width + column + i] = 0;
        const corners = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
        corners.forEach(p => { p[axis] = slice + (sign > 0 ? 1 : 0); });
        for (let i = 0; i < 4; i++) { corners[i]![u] = column + (i === 1 || i === 2 ? w : 0); corners[i]![v] = row + (i >= 2 ? h : 0); }
        const surface = material === 2 ? exits : material === 3 ? stairs : walls;
        const normal = [0, 0, 0]; normal[axis] = sign;
        for (const corner of sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) {
          surface.positions.push(...corners[corner]!); surface.normals.push(...normal);
        }
      }
    }
  }
  return { walls, exits, stairs };
}
