/** Bounded source-derived death slice, deliberately disconnected from live worlds. */
export interface DeathActorSlice {
  partyIndex: number;
  direction: number;
  x: number;
  y: number;
  floor: number;
  mapPosition: number;
  oldMapPosition: number;
  statsDeadWord: number;
  runtimeDeadWord: number;
  controlMethod: number;
  windowType: number;
  fitness: number;
  fallDamage: number;
  underwaterCount: number;
  drowningCount: number;
  waterFallDelay: number;
}
export interface OrdinaryFloorDeathSlice {
  actor: DeathActorSlice;
  leaders: [number, number]; // source one-based slots; zero means no leader
  cell: { mapPosition: number; first: number; second: number; belowFirst: number };
}
export type DeathEffect =
  | { kind: 'occupancy-removed'; before: number; after: number }
  | { kind: 'pad-release-checked'; outcome: 'not-pressure-pad'; first: number }
  | { kind: 'corpse-written'; owner: number; first: number; second: number };
export interface OrdinaryFloorDeathResult {
  status: 'transitioned' | 'already-dead';
  candidate: OrdinaryFloorDeathSlice;
  effects: DeathEffect[];
}

const FLOOR = 0x601;
const BLOCK = 0x1f802;
const VARIANT = 0xf800000;
const AUX = 0xf0000020;
const AUX_DATA = 0xff000;
const SKELETON = 0x70000020;
const unsigned = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function keys(value: unknown, expected: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== expected.length || expected.some(k => !Object.hasOwn(value, k))) {
    throw new Error('Malformed death slice fields.');
  }
}
function validate(slice: OrdinaryFloorDeathSlice): void {
  keys(slice, ['actor', 'leaders', 'cell']);
  keys(slice.actor, ['partyIndex', 'direction', 'x', 'y', 'floor', 'mapPosition', 'oldMapPosition', 'statsDeadWord', 'runtimeDeadWord', 'controlMethod', 'windowType', 'fitness', 'fallDamage', 'underwaterCount', 'drowningCount', 'waterFallDelay']);
  keys(slice.cell, ['mapPosition', 'first', 'second', 'belowFirst']);
  const a = slice.actor;
  if (!Object.values(a).every(n => unsigned(n, 0xffffffff)) ||
      ![a.partyIndex, a.direction].every(n => unsigned(n, 3)) ||
      ![a.x, a.y, a.floor, a.controlMethod].every(n => unsigned(n, 255)) ||
      ![a.statsDeadWord, a.runtimeDeadWord, a.windowType, a.fitness, a.underwaterCount, a.drowningCount, a.waterFallDelay].every(n => unsigned(n, 65535)) ||
      !Object.values(slice.cell).every(n => unsigned(n, 0xffffffff)) ||
      !Array.isArray(slice.leaders) || slice.leaders.length !== 2 || Object.keys(slice.leaders).length !== 2 ||
      ![0, 1].every(i => Object.hasOwn(slice.leaders, i) && unsigned(slice.leaders[i]!, 4))) {
    throw new Error('Malformed death slice numeric storage.');
  }
  // Controls/drowning/falling test the full word, unlike put_head_in_map's
  // byte guard. This bounded contract accepts only initialized zero words or
  // the exact ST.B result from those words, never a low-byte-only dead flag.
  if (![0, 0xff00].includes(a.statsDeadWord) || a.statsDeadWord !== a.runtimeDeadWord) throw new Error('Inconsistent or unsupported source dead flags.');
  if (a.mapPosition !== slice.cell.mapPosition) throw new Error('Occupancy cell does not match actor map position.');
  if (a.windowType === 7) throw new Error('Extracted actor is outside the occupied ordinary-floor contract.');
  // Main.s tests below-block geometry before testing the current floor bit.
  if ((slice.cell.belowFirst & BLOCK) !== 0 || (slice.cell.first & FLOOR) !== 1) {
    throw new Error('Pressure pads, support search and nonordinary floors are unsupported.');
  }
}

/**
 * Main.s:1146-1222 ordinary same-cell branch only. No health trigger, pad action,
 * corpse search, inventory transfer, audio, save installation or source authority.
 * Rejects the complete candidate before exposing any replacement state.
 */
export function transitionOrdinaryFloorDeath(input: OrdinaryFloorDeathSlice): OrdinaryFloorDeathResult {
  validate(input);
  const candidate = structuredClone(input);
  const { actor, cell } = candidate;
  const owner = (cell.second & AUX_DATA) >>> 12;
  if (actor.runtimeDeadWord !== 0) {
    if ((cell.first & (BLOCK | VARIANT)) !== 0 || (cell.first & AUX) !== SKELETON || owner !== actor.partyIndex ||
        actor.oldMapPosition !== actor.mapPosition || candidate.leaders.includes(actor.partyIndex + 1)) {
      throw new Error('Dead slice is not a coherent completed ordinary-floor transition.');
    }
    return { status: 'already-dead', candidate, effects: [] };
  }
  // Initialized head bases are 32/36/40/44 for party 0/1/2/3 (Main.s:5107,
  // 5142,5177,5217); arbitrary transformed head families remain unsupported.
  const expectedBlock = ((32 + actor.partyIndex * 4 + actor.direction) << 11) | 2;
  const variant = (cell.first & VARIANT) >>> 23;
  if ((cell.first & BLOCK) !== expectedBlock || variant > 11 || variant % 4 !== actor.partyIndex) {
    throw new Error('Cell does not contain this actor head and owner variant.');
  }
  if ((cell.first & AUX) !== 0) throw new Error('Existing auxiliary objects and corpse replacement are unsupported.');
  actor.statsDeadWord |= 0xff00; // ST.B changes the first byte of a big-endian word.
  actor.runtimeDeadWord |= 0xff00;
  candidate.leaders = candidate.leaders.map(n => n === actor.partyIndex + 1 ? 0 : n) as [number, number];
  actor.oldMapPosition = actor.mapPosition;
  const before = cell.first;
  cell.first = (cell.first & ~(BLOCK | VARIANT)) >>> 0;
  const effects: DeathEffect[] = [{ kind: 'occupancy-removed', before, after: cell.first }];
  // check_pad_released sees the post-removal word at old_mem_position. The
  // validated ordinary floor exits at .no_pad; no configured out action runs.
  effects.push({ kind: 'pad-release-checked', outcome: 'not-pressure-pad', first: cell.first });
  cell.first = ((cell.first & ~AUX) | SKELETON) >>> 0;
  cell.second = ((cell.second & ~AUX_DATA) | actor.partyIndex << 12) >>> 0;
  effects.push({ kind: 'corpse-written', owner: actor.partyIndex, first: cell.first, second: cell.second });
  return { status: 'transitioned', candidate, effects };
}
