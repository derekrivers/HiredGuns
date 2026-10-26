import type { DeathActorSlice } from './death-transition';

/** Logical row-major cell indices, never original addresses. */
export interface DryDescentSlice {
  grid: { width: number; depth: number; floors: number };
  actor: DeathActorSlice & { weight: number; headImages: number; blockNumber: number };
  oldCell: { mapPosition: number; x: number; y: number; floor: number };
  stats: { physique: number; agility: number; gender: number };
  feedback: { spellShield: number; fireWhite: number; gruntCount: number; fitnessFlashDuration: number };
  cells: { source: number; destination: number; secondBelow: number; sourceFirst: number; destinationFirst: number; secondBelowFirst: number; destinationThird: number };
  redrawFlag: number;
}
type WriteTarget = 'actor.waterFallDelay' | 'cells.sourceFirst' | 'actor.oldMapPosition' | 'actor.mapPosition' | 'actor.floor' | 'actor.fallDamage' | 'cells.destinationThird' | 'actor.blockNumber' | 'cells.destinationFirst' | 'redrawFlag';
export type DryDescentRecord =
  | { kind: 'write'; target: WriteTarget; width: 1 | 2 | 4; before: number; after: number }
  | { kind: 'release-check' | 'push-check'; cell: 'source' | 'destination'; first: number; outcome: 'not-pressure-pad' }
  | { kind: 'mine-check'; cell: 'destination'; first: number; outcome: 'no-mine' }
  | { kind: 'head-insertion'; cell: 'destination'; blockNumber: number; variant: number };
export interface DryDescentResult {
  candidate: DryDescentSlice;
  records: DryDescentRecord[];
  arithmetic: { quotient: number | null; seedWord: number | null; beforeDoubling: number; doubled: number; pending: number };
  helperReturn: { actor: 'actor'; stats: 'stats'; cell: 'source' };
}

function data(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Reflect.ownKeys(value).length !== fields.length) throw new Error('Malformed dry descent fields.');
  const copy: Record<string, unknown> = {};
  for (const key of fields) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d)) throw new Error('Expected own dry descent data.');
    copy[key] = d.value;
  }
  return copy;
}
const uint = (n: unknown, max = 0xffffffff): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function snapshot(input: DryDescentSlice): DryDescentSlice {
  const s = data(input, ['grid', 'actor', 'oldCell', 'stats', 'feedback', 'cells', 'redrawFlag']);
  const grid = data(s.grid, ['width', 'depth', 'floors']);
  const actor = data(s.actor, ['partyIndex', 'direction', 'x', 'y', 'floor', 'mapPosition', 'oldMapPosition', 'statsDeadWord', 'runtimeDeadWord', 'controlMethod', 'windowType', 'fitness', 'fallDamage', 'underwaterCount', 'drowningCount', 'waterFallDelay', 'weight', 'headImages', 'blockNumber']);
  const oldCell = data(s.oldCell, ['mapPosition', 'x', 'y', 'floor']);
  const stats = data(s.stats, ['physique', 'agility', 'gender']);
  const feedback = data(s.feedback, ['spellShield', 'fireWhite', 'gruntCount', 'fitnessFlashDuration']);
  const cells = data(s.cells, ['source', 'destination', 'secondBelow', 'sourceFirst', 'destinationFirst', 'secondBelowFirst', 'destinationThird']);
  for (const obj of [grid, actor, oldCell, stats, feedback, cells]) if (!Object.values(obj).every(n => uint(n))) throw new Error('Malformed unsigned dry descent storage.');
  const result = { grid, actor, oldCell, stats, feedback, cells, redrawFlag: s.redrawFlag } as unknown as DryDescentSlice;
  const a = result.actor, g = result.grid, c = result.cells, o = result.oldCell, f = result.feedback;
  if (!Object.values(g).every(n => n >= 1 && n <= 256) ||
      ![a.partyIndex, a.direction].every(n => uint(n, 3)) ||
      ![a.x, a.y, a.floor, a.controlMethod, result.stats.gender, f.fireWhite, f.fitnessFlashDuration, result.redrawFlag].every(n => uint(n, 255)) ||
      ![a.statsDeadWord, a.runtimeDeadWord, a.windowType, a.fitness, a.underwaterCount, a.drowningCount, a.waterFallDelay, a.headImages, a.blockNumber, result.stats.physique, result.stats.agility, f.spellShield, f.gruntCount].every(n => uint(n, 65535))) throw new Error('Malformed dry descent widths.');
  const index = (x: number, y: number, floor: number): number => {
    if (x >= g.width || y >= g.depth || floor >= g.floors) throw new Error('Cell outside logical grid.');
    return (floor * g.depth + y) * g.width + x;
  };
  const source = index(a.x, a.y, a.floor), stride = g.width * g.depth;
  if (a.floor < 2 || a.mapPosition !== source || c.source !== source || c.destination !== source - stride || c.secondBelow !== source - 2 * stride ||
      a.oldMapPosition !== o.mapPosition || o.mapPosition !== index(o.x, o.y, o.floor)) throw new Error('Incoherent logical dry descent cells.');
  if (a.statsDeadWord !== 0 || a.runtimeDeadWord !== 0 || a.windowType !== 0 || a.controlMethod !== 1 || result.stats.gender !== 0 || f.gruntCount !== 99) throw new Error('Unsupported dry descent lifecycle/audio.');
  const head = 32 + a.partyIndex * 4;
  const variant = (c.sourceFirst >>> 23) & 31;
  const expectedVariant = a.partyIndex + (f.fireWhite !== 0 ? 8 : f.spellShield !== 0 ? 4 : 0);
  if (a.headImages !== head || a.blockNumber !== head + a.direction || (c.sourceFirst & 0x1f802) !== ((head + a.direction) << 11 | 2) || variant !== expectedVariant) throw new Error('Source head ownership/initialization mismatch.');
  if ([c.sourceFirst, c.destinationFirst, c.secondBelowFirst].some(n => (n & (0x60004 | 0xf0000020)) !== 0) ||
      (c.sourceFirst & 0x601) !== 0 || (c.destinationFirst & 0x601) !== 1 ||
      (c.secondBelowFirst & 0x601) === 0x201 ||
      (c.destinationFirst & (0x1f802 | 0xf800000)) !== 0 || (c.secondBelowFirst & 0x1f802) !== 0) throw new Error('Unsupported dry descent geometry.');
  if (result.stats.agility === 0 || Math.floor(a.weight / result.stats.agility) > 65535) throw new Error('Unrepresentable dry descent DIVU.');
  return result;
}

/** One observed dry-cell move. Injury stays pending for a separate later call. */
export function transitionDryDescent(input: DryDescentSlice): DryDescentResult {
  const candidate = snapshot(input), records: DryDescentRecord[] = [];
  const a = candidate.actor, c = candidate.cells;
  const write = (target: WriteTarget, width: 1 | 2 | 4, before: number, after: number): number => {
    records.push({ kind: 'write', target, width, before, after }); return after;
  };
  a.waterFallDelay = write('actor.waterFallDelay', 2, a.waterFallDelay, 0);
  c.sourceFirst = write('cells.sourceFirst', 4, c.sourceFirst, (c.sourceFirst & 0xf07e07fd) >>> 0);
  a.oldMapPosition = write('actor.oldMapPosition', 4, a.oldMapPosition, a.mapPosition);
  candidate.oldCell = { mapPosition: a.oldMapPosition, x: a.x, y: a.y, floor: a.floor };
  a.mapPosition = write('actor.mapPosition', 4, a.mapPosition, c.destination);
  a.floor = write('actor.floor', 1, a.floor, a.floor - 1);
  const quotient = a.fallDamage === 0 ? Math.floor(a.weight / candidate.stats.agility) : null;
  const seedWord = quotient === null ? null : (quotient + candidate.stats.physique) & 65535;
  const beforeDoubling = seedWord === null ? a.fallDamage : seedWord * 32;
  const doubled = (beforeDoubling * 2) >>> 0;
  const pending = (doubled | 0) < 0x1000000 ? doubled : 0x1000000;
  a.fallDamage = write('actor.fallDamage', 4, a.fallDamage, pending);
  records.push({ kind: 'release-check', cell: 'source', first: c.sourceFirst, outcome: 'not-pressure-pad' });
  records.push({ kind: 'push-check', cell: 'destination', first: c.destinationFirst, outcome: 'not-pressure-pad' });
  records.push({ kind: 'mine-check', cell: 'destination', first: c.destinationFirst, outcome: 'no-mine' });
  c.destinationThird = write('cells.destinationThird', 4, c.destinationThird, (c.destinationThird & 0xdfffffff) >>> 0);
  const variant = a.partyIndex + (candidate.feedback.fireWhite !== 0 ? 8 : candidate.feedback.spellShield !== 0 ? 4 : 0);
  records.push({ kind: 'head-insertion', cell: 'destination', blockNumber: a.headImages + a.direction, variant });
  a.blockNumber = write('actor.blockNumber', 2, a.blockNumber, a.headImages + a.direction);
  c.destinationFirst = write('cells.destinationFirst', 4, c.destinationFirst, (c.destinationFirst & 0xf07e07fd) >>> 0);
  c.destinationFirst = write('cells.destinationFirst', 4, c.destinationFirst, (c.destinationFirst | a.blockNumber << 11 | variant << 23 | 2) >>> 0);
  candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
  return { candidate, records, arithmetic: { quotient, seedWord, beforeDoubling, doubled, pending }, helperReturn: { actor: 'actor', stats: 'stats', cell: 'source' } };
}
