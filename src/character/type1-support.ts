import type { DeathActorSlice } from './death-transition';
import { computeNormalDamage } from './damage-arithmetic';

/** Logical row-major cell indices, never original addresses. */
export interface Type1SupportSlice {
  grid: { width: number; depth: number; floors: number };
  actor: DeathActorSlice & { weight: number; headImages: number; blockNumber: number };
  oldCell: { mapPosition: number; x: number; y: number; floor: number };
  stats: { physique: number; agility: number; gender: number };
  feedback: { spellShield: number; fireWhite: number; gruntCount: number; fitnessFlashDuration: number };
  cells: { current: number; below: number; secondBelow: number; currentFirst: number; currentSecond: number; currentThird: number; belowFirst: number; secondBelowFirst: number };
  cheats: { mode2: number; mode3: number };
  leaders: [number, number];
  redrawFlag: number;
}
type WriteTarget = 'actor.waterFallDelay' | 'feedback.fireWhite' | 'feedback.fitnessFlashDuration' | 'actor.fitness' | 'redrawFlag' | 'actor.fallDamage' | 'actor.statsDeadWord' | 'actor.runtimeDeadWord' | 'actor.oldMapPosition' | 'leaders.0' | 'leaders.1' | 'cells.currentFirst' | 'cells.currentSecond';
export type Type1SupportRecord =
  | { kind: 'write'; target: WriteTarget; width: 1 | 2 | 4; before: number; after: number }
  | { kind: 'release-return' | 'death-return'; cell: 'current' }
  | { kind: 'damage-return' | 'helper-return'; actor: 'actor'; stats: 'stats'; cell: 'current' }
  | { kind: 'cell-reread'; cell: 'current'; first: number; mask: number };
export interface Type1SupportResult {
  candidate: Type1SupportSlice;
  status: 'damage-skipped' | 'survived' | 'died';
  records: Type1SupportRecord[];
  arithmetic: ReturnType<typeof computeNormalDamage> | null;
  helperReturn: { actor: 'actor'; stats: 'stats'; cell: 'current' };
}

function data(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Reflect.ownKeys(value).length !== fields.length) throw new Error('Malformed type-one support fields.');
  const copy: Record<string, unknown> = {};
  for (const key of fields) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d)) throw new Error('Expected own type-one support data.');
    copy[key] = d.value;
  }
  return copy;
}
const uint = (n: unknown, max = 0xffffffff): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function snapshot(input: Type1SupportSlice): Type1SupportSlice {
  const s = data(input, ['grid', 'actor', 'oldCell', 'stats', 'feedback', 'cells', 'cheats', 'leaders', 'redrawFlag']);
  const grid = data(s.grid, ['width', 'depth', 'floors']);
  const actor = data(s.actor, ['partyIndex', 'direction', 'x', 'y', 'floor', 'mapPosition', 'oldMapPosition', 'statsDeadWord', 'runtimeDeadWord', 'controlMethod', 'windowType', 'fitness', 'fallDamage', 'underwaterCount', 'drowningCount', 'waterFallDelay', 'weight', 'headImages', 'blockNumber']);
  const oldCell = data(s.oldCell, ['mapPosition', 'x', 'y', 'floor']);
  const stats = data(s.stats, ['physique', 'agility', 'gender']);
  const feedback = data(s.feedback, ['spellShield', 'fireWhite', 'gruntCount', 'fitnessFlashDuration']);
  const cells = data(s.cells, ['current', 'below', 'secondBelow', 'currentFirst', 'currentSecond', 'currentThird', 'belowFirst', 'secondBelowFirst']);
  const cheats = data(s.cheats, ['mode2', 'mode3']);
  const leaders = dataLeaders(s.leaders);
  for (const obj of [grid, actor, oldCell, stats, feedback, cells, cheats]) if (!Object.values(obj).every(n => uint(n))) throw new Error('Malformed unsigned type-one support storage.');
  const result = { grid, actor, oldCell, stats, feedback, cells, cheats, leaders, redrawFlag: s.redrawFlag } as unknown as Type1SupportSlice;
  const a = result.actor, g = result.grid, c = result.cells, o = result.oldCell, f = result.feedback;
  if (!Object.values(g).every(n => n >= 1 && n <= 256) ||
      ![a.partyIndex, a.direction].every(n => uint(n, 3)) ||
      ![a.x, a.y, a.floor, a.controlMethod, result.stats.gender, f.fireWhite, f.fitnessFlashDuration, result.cheats.mode2, result.cheats.mode3, result.redrawFlag].every(n => uint(n, 255)) ||
      ![a.statsDeadWord, a.runtimeDeadWord, a.windowType, a.fitness, a.underwaterCount, a.drowningCount, a.waterFallDelay, a.headImages, a.blockNumber, result.stats.physique, result.stats.agility, f.spellShield, f.gruntCount].every(n => uint(n, 65535))) throw new Error('Malformed type-one support widths.');
  const index = (x: number, y: number, floor: number): number => {
    if (x >= g.width || y >= g.depth || floor >= g.floors) throw new Error('Cell outside logical grid.');
    return (floor * g.depth + y) * g.width + x;
  };
  const source = index(a.x, a.y, a.floor), stride = g.width * g.depth;
  if (a.floor < 2 || a.mapPosition !== source || c.current !== source || c.below !== source - stride || c.secondBelow !== source - 2 * stride ||
      a.oldMapPosition !== o.mapPosition || o.mapPosition !== index(o.x, o.y, o.floor)) throw new Error('Incoherent logical type-one support cells.');
  if (a.statsDeadWord !== 0 || a.runtimeDeadWord !== 0 || a.windowType !== 0 || a.controlMethod !== 1 || result.stats.gender !== 0 || f.gruntCount !== 99) throw new Error('Unsupported type-one support lifecycle/audio.');
  const head = 32 + a.partyIndex * 4;
  const variant = (c.currentFirst >>> 23) & 31;
  const expectedVariant = a.partyIndex + (f.fireWhite !== 0 ? 8 : f.spellShield !== 0 ? 4 : 0);
  if (a.headImages !== head || a.blockNumber !== head + a.direction || (c.currentFirst & 0x1f802) !== ((head + a.direction) << 11 | 2) || variant !== expectedVariant) throw new Error('Source head ownership/initialization mismatch.');
  if ([c.currentFirst, c.belowFirst, c.secondBelowFirst].some(n => (n & (0x60004 | 0xf0000020)) !== 0) ||
      (c.currentFirst & 0x601) !== 0 ||
      [c.belowFirst, c.secondBelowFirst].some(n => (n & 0x601) === 0x201) ||
      (c.belowFirst & 0x1f802) !== 0x802 || (c.secondBelowFirst & 0x1f802) !== 0) throw new Error('Unsupported type-one support geometry.');
  if (result.stats.physique === 0 || result.cheats.mode2 !== 0 || result.cheats.mode3 !== 0) throw new Error('Unsupported type-one support physique/cheats.');
  return result;
}

function dataLeaders(value: unknown): [number, number] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).length !== 3 || value.length !== 2) throw new Error('Malformed leaders.');
  const values = [0, 1].map(i => {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d) || !uint(d.value, 4)) throw new Error('Expected own leader word.');
    return d.value as number;
  });
  return [values[0]!, values[1]!];
}

/** Disconnected initial inert type-one support, including bounded corpse placement. */
export function transitionType1Support(input: Type1SupportSlice): Type1SupportResult {
  const candidate = snapshot(input), records: Type1SupportRecord[] = [];
  const a = candidate.actor, f = candidate.feedback;
  const arithmetic = a.fallDamage === 0 ? null : computeNormalDamage(a.fallDamage, candidate.stats.physique, f.spellShield);
  const fatal = arithmetic !== null && (arithmetic.damage > a.fitness || a.fitness - arithmetic.damage < 655);
  const returned = (kind: 'release-return' | 'death-return' | 'damage-return' | 'helper-return'): void => {
    if (kind === 'release-return' || kind === 'death-return') records.push({ kind, cell: 'current' });
    else records.push({ kind, actor: 'actor', stats: 'stats', cell: 'current' });
  };
  const write = (target: WriteTarget, width: 1 | 2 | 4, before: number, after: number): number => {
    records.push({ kind: 'write', target, width, before, after }); return after;
  };
  a.waterFallDelay = write('actor.waterFallDelay', 2, a.waterFallDelay, 0);
  if (arithmetic !== null) {
    f.fireWhite = write('feedback.fireWhite', 1, f.fireWhite, 255);
    f.fitnessFlashDuration = write('feedback.fitnessFlashDuration', 1, f.fitnessFlashDuration, (f.fitnessFlashDuration + (arithmetic.damage >>> 9) + 1) & 255);
    const before = a.fitness;
    if (arithmetic.damage <= before) a.fitness = write('actor.fitness', 2, before, before - arithmetic.damage);
    if (fatal) {
      // The original writes only the high byte of each initialized zero dead word.
      a.statsDeadWord = write('actor.statsDeadWord', 1, a.statsDeadWord >>> 8, 255) << 8;
      a.runtimeDeadWord = write('actor.runtimeDeadWord', 1, a.runtimeDeadWord >>> 8, 255) << 8;
      for (const n of [0, 1] as const) if (candidate.leaders[n] === a.partyIndex + 1) {
        candidate.leaders[n] = write(n === 0 ? 'leaders.0' : 'leaders.1', 2, candidate.leaders[n], 0);
      }
      a.oldMapPosition = write('actor.oldMapPosition', 4, a.oldMapPosition, a.mapPosition);
      candidate.oldCell = { mapPosition: a.mapPosition, x: a.x, y: a.y, floor: a.floor };
      const c = candidate.cells;
      c.currentFirst = write('cells.currentFirst', 4, c.currentFirst, (c.currentFirst & 0xf07e07fd) >>> 0);
      returned('release-return');
      c.currentFirst = write('cells.currentFirst', 4, c.currentFirst, (c.currentFirst & 0x0fffffdf) >>> 0);
      c.currentFirst = write('cells.currentFirst', 4, c.currentFirst, (c.currentFirst | 0x70000020) >>> 0);
      c.currentSecond = write('cells.currentSecond', 4, c.currentSecond, (c.currentSecond & 0xfff00fff) >>> 0);
      c.currentSecond = write('cells.currentSecond', 4, c.currentSecond, (c.currentSecond | a.partyIndex << 12) >>> 0);
      returned('death-return');
    }
    if (fatal || Math.floor(before / 655) !== Math.floor(a.fitness / 655)) candidate.redrawFlag = write('redrawFlag', 1, candidate.redrawFlag, 255);
    returned('damage-return');
    a.fallDamage = write('actor.fallDamage', 4, a.fallDamage, 0);
  }
  records.push({ kind: 'cell-reread', cell: 'current', first: candidate.cells.currentFirst, mask: candidate.cells.currentFirst & 0x60004 });
  returned('helper-return');
  return { candidate, status: arithmetic === null ? 'damage-skipped' : fatal ? 'died' : 'survived', arithmetic, records, helperReturn: { actor: 'actor', stats: 'stats', cell: 'current' } };
}
