import { cellIndex, inBounds, type Facing, type LevelData, type Position, type Spawn } from '../contracts';

const DELTAS = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}] as const;
const UP_AUX = [8,9,10,11] as const;
const DOWN_BLOCK = [18,19,16,17] as const;
export interface TraversalResult { target: Position; reason: string | null; kind: 'level' | 'stairs-up' | 'stairs-down' }

function wordAt(level: LevelData, p: Position): number | null {
  return inBounds(level,p) ? level.layers[0][cellIndex(level,p)] ?? null : null;
}
const blockType = (word: number) => (word >>> 11) & 63;
function environmentReason(word: number): string | null {
  if (word & (4|16|256)) return 'unsupported environment';
  const floor = (word >>> 9) & 3;
  if ((word & 1) && (floor === 1 || floor === 2)) return 'unsupported environment';
  if ((word & 32) && ((word >>> 28) < 8 || (word >>> 28) > 11)) return 'unsupported environment';
  return null;
}
function staticBlock(word: number | null, types: readonly number[]): boolean {
  return word !== null && (word & 2) !== 0 && (word & 256) === 0 && types.includes(blockType(word));
}

/** Conservative standing predicate shared by navigation, starts and checkpoints. */
export function obstruction(level: LevelData, p: Position): string | null {
  const word = wordAt(level,p);
  if (word === null) return 'boundary';
  const environment = environmentReason(word);
  if (environment) return environment;
  if (word & (2|64)) return 'block';
  if (word & 1) return null;
  const below = wordAt(level,{...p,z:p.z-1});
  if (staticBlock(below,[0,16,17,18,19])) return null;
  // Block 4 has a two-level extent. Its intermediate cell is not an entry pose.
  const twoBelow = wordAt(level,{...p,z:p.z-2});
  if (below !== null && !(below & (2|64)) && !environmentReason(below) && staticBlock(twoBelow,[4])) return null;
  return 'unsupported drop';
}

/** Resolve a dry static step. Occupancy includes active actors at tick start/current. */
export function resolveTraversal(level: LevelData, from: Spawn, travelDirection: Facing, occupied: (p: Position) => boolean = () => false, allowDrops = false): TraversalResult {
  if (!Number.isInteger(travelDirection) || travelDirection < 0 || travelDirection > 3) throw new Error('Invalid travel direction');
  const delta = DELTAS[travelDirection];
  const result: TraversalResult = {target:{x:from.x+delta.x,y:from.y+delta.y,z:from.z},reason:null,kind:'level'};
  const currentReason = obstruction(level,from);
  if (currentReason && !(allowDrops && currentReason === 'unsupported drop')) return {...result,reason:`current ${currentReason}`};
  const current = wordAt(level,from)!;
  const below = wordAt(level,{...from,z:from.z-1});
  if ((current & 32) && (current >>> 28) === UP_AUX[travelDirection]) {
    result.kind = 'stairs-up'; result.target.z++;
    const overheadPosition = {...from,z:from.z+1};
    const overhead = wordAt(level,overheadPosition);
    if (overhead === null) return {...result,reason:'boundary'};
    if (environmentReason(overhead)) return {...result,reason:'unsupported overhead environment'};
    if (overhead & (2|64)) return {...result,reason:'stairs overhead block'};
    if (overhead & 1) return {...result,reason:'stairs overhead floor'};
    if (occupied(overheadPosition)) return {...result,reason:'occupied overhead'};
  } else if (staticBlock(below,[DOWN_BLOCK[travelDirection]])) {
    const levelDestination = wordAt(level,result.target);
    if (levelDestination === null) return {...result,reason:'boundary'};
    // A floor keeps the actor on this level; pads/lifts still fail final validation.
    if (!(levelDestination & 1)) {
      const lower = wordAt(level,{...result.target,z:from.z-1});
      if (lower === null || !(lower & (2|64)) || ((lower & 2) && !(lower & 64) && blockType(lower) >= 32 && blockType(lower) <= 47)) {
        result.kind = 'stairs-down'; result.target.z--;
        // The source checks the shifted feet cell. Keep the nominal upper cell
        // dry too until water/environment state is implemented; geometry stays source-shaped.
        if (environmentReason(levelDestination)) return {...result,reason:'unsupported descent environment'};
      }
    }
  }
  const targetWord = wordAt(level,result.target);
  if (targetWord === null) return {...result,reason:'boundary'};
  const environment = environmentReason(targetWord);
  if (environment) return {...result,reason:environment};
  // Source bumps solid targets (including exits) before empty-cell support.
  if (targetWord & (2|64)) return {...result,reason:'block'};
  const targetBelow = wordAt(level,{...result.target,z:result.target.z-1});
  if (!(targetWord & 1) && staticBlock(targetBelow,[4])) return {...result,reason:'block4 entry'};
  if (occupied(result.target)) return {...result,reason:'occupied'};
  const standingReason = obstruction(level,result.target);
  return {...result,reason:allowDrops && standingReason === 'unsupported drop' ? null : standingReason};
}
