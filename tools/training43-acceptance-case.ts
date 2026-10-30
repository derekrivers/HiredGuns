import { createHash } from 'node:crypto';
import { mkdir, open, readFile, realpath, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cellIndex, inBounds, type Action, type Facing, type LevelData, type Position } from '../src/contracts';
import { importEditorMap, type EditorRecord } from '../src/import/editor-map';
import { importCharacters } from '../src/import/characters';
import { importItems } from '../src/import/items';
import { initializeOriginalTeam } from '../src/import/original-team';
import { transitionImmersion, type ImmersionActor } from '../src/character/immersion-caller';
import { obstruction, resolveTraversal } from '../src/sim/traversal';
import { createWorld, stepWorld } from '../src/sim/world';

// Only module-authored finite policy trees pass through this helper.
function freezePolicy<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezePolicy(child);
    Object.freeze(value);
  }
  return value;
}

export const PINS = freezePolicy({
  map: '646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c',
  roster: '79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439',
  items: '633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc',
  historicalAudit: 'f27e55434913dd28fed6a54c2397ebf2aaa82a0ce8ea1a4a136153e022d5d3d7',
  ocsMain: 'cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9',
  ocsControls: 'd8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15',
  ocsEquates: 'ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759',
} as const);
export type RawCaseInputs = { -readonly [K in keyof typeof PINS]: Uint8Array };
const digest = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const key = (p: Position) => `${p.x},${p.y},${p.z}`;
const directions = [0, 1, 2, 3] as const;
const deltas = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }] as const;
const actions: Action[] = ['forward', 'strafe-right', 'backward', 'strafe-left'];
const wordAt = (level: LevelData, p: Position): number | null => inBounds(level, p) ? level.layers[0][cellIndex(level, p)]! : null;
const block = (w: number) => w & 0x1f802;
const water = (w: number) => (w & 4) !== 0;
const position = (level: LevelData, i: number): Position => ({ x: i % level.size.width,
  y: Math.floor(i / level.size.width) % level.size.depth, z: Math.floor(i / (level.size.width * level.size.depth)) });
const shifted = (p: Position, z: number) => ({ ...p, z: p.z + z });

export interface CaseStep {
  from: Position; target: Position; direction: Facing; action: Action;
  branch: 'level' | 'stairs-up' | 'stairs-down';
}
export interface CandidateStep { step: CaseStep; status: 'candidate' | 'blocked' | 'unknown'; blocker: string | null }

/** Only supported, inert geometry. Never clears water bits or returns an executed move. */
export function sourceWetCandidate(level: LevelData, from: Position, direction: Facing): CandidateStep {
  if (!directions.includes(direction)) throw new Error('Invalid direction');
  const delta = deltas[direction];
  const step: CaseStep = { from: { ...from }, target: { x: from.x + delta.x, y: from.y + delta.y, z: from.z },
    direction, action: actions[direction]!, branch: 'level' };
  const result = (status: CandidateStep['status'], blocker: string | null): CandidateStep => ({ step, status, blocker });
  const current = wordAt(level, from);
  if (current === null) return result('blocked', 'boundary');
  const inert = (w: number) => !(w & (16 | 256)) && (!(w & 1) || (w & 0x600) === 0) &&
    (!(w & 32) || (w >>> 28) >= 8 && (w >>> 28) <= 11);
  const stable = (p: Position, w: number) => {
    if (w & (2 | 64)) return false;
    if (w & 1) return true;
    const below = wordAt(level, shifted(p, -1));
    // Exact ordinary block/stair support; other support branches need separate proof.
    return below !== null && [2, (16 << 11) | 2, (17 << 11) | 2, (18 << 11) | 2, (19 << 11) | 2].includes(block(below));
  };
  if (!inert(current)) return result('unknown', 'current floor/auxiliary/mine/pushable caller unsupported');
  if (water(current) ? !stable(from, current) : obstruction(level, from) !== null) {
    return result('unknown', 'current support requires wet player_fall/descent/occupancy composition');
  }
  const below = wordAt(level, shifted(from, -1));
  if ((current & 0xf0000020) >>> 0 === (((8 + direction) << 28) | 32) >>> 0) {
    step.branch = 'stairs-up'; step.target.z++;
    const overhead = wordAt(level, shifted(from, 1));
    if (overhead === null) return result('blocked', 'boundary');
    if (overhead & (0x1f802 | 0x601 | 64)) return result('blocked', 'source stairs-up overhead mask');
    if (!inert(overhead)) return result('unknown', 'overhead effect unsupported');
  } else if (below !== null && block(below) === (([18, 19, 16, 17][direction]! << 11) | 2)) {
    const nominal = wordAt(level, step.target);
    if (nominal === null) return result('blocked', 'boundary');
    if (!(nominal & 0x601)) {
      const lower = wordAt(level, shifted(step.target, -1));
      if (lower === null) return result('blocked', 'boundary');
      const mask = lower & (0x1f802 | 64);
      if (mask === 0 || mask >= ((32 << 11) | 2) && mask <= ((47 << 11) | 2)) {
        step.branch = 'stairs-down'; step.target.z--;
      }
    }
  }
  const target = wordAt(level, step.target);
  if (target === null) return result('blocked', 'boundary');
  if (target & (2 | 64)) return result('blocked', 'source destination block/opaque mask');
  if (!inert(target)) return result('unknown', 'destination floor/auxiliary/mine/pushable caller unsupported');
  if (!stable(step.target, target)) return result('unknown', 'destination requires wet player_fall/descent/landing composition');
  if (!water(target) && obstruction(level, step.target) !== null) return result('unknown', 'destination outside accepted dry standing predicate');
  return result('candidate', null);
}

function validateGeometry(level: LevelData): void {
  const { width, depth, height } = level.size;
  const count = width * depth * height;
  if (![width, depth, height].every(n => Number.isInteger(n) && n > 0 && n <= 256) || count > 10580 ||
    level.layers.length !== 3 || level.layers.some(l => l.length !== count ||
      Array.from({ length: count }, (_, i) => l[i]).some(n => !Number.isInteger(n) || n! < 0 || n! > 0xffffffff)) ||
    level.starts.length !== 4 || level.starts.some(p => !inBounds(level, p))) throw new Error('Malformed case geometry');
}
interface SearchNode { at: Position; route: CaseStep[] }
function search(level: LevelData, starts: Position[], candidate: boolean, occupied: Position[] = []): SearchNode[] {
  const queue: SearchNode[] = starts.map(at => ({ at: { ...at }, route: [] }));
  const seen = new Set(starts.map(key)), occupiedKeys = new Set(occupied.map(key));
  for (let i = 0; i < queue.length; i++) for (const direction of directions) {
    const node = queue[i]!;
    const resolved = candidate ? sourceWetCandidate(level, node.at, direction) : null;
    const dry = candidate ? null : resolveTraversal(level, { ...node.at, facing: 0 }, direction, p => occupiedKeys.has(key(p)));
    if (candidate ? resolved!.status !== 'candidate' : dry!.reason !== null) continue;
    const step = resolved?.step ?? { from: node.at, target: dry!.target, branch: dry!.kind, direction, action: actions[direction]! };
    if (occupiedKeys.has(key(step.target)) || seen.has(key(step.target))) continue;
    seen.add(key(step.target)); queue.push({ at: step.target, route: [...node.route, step] });
  }
  return queue;
}

/** Source sentinel is first zero position, not nonzero-record count or editor used flags. */
export function classifyTextTriggers(level: LevelData, rows: readonly EditorRecord[], dry: Set<string>, candidates: Set<string>) {
  let ended = false;
  return rows.map(row => {
    const raw = row.fields.position, offset = row.fields.messageOffset;
    if (!Number.isInteger(raw) || raw! < 0 || raw! > 0xffffffff || !Number.isInteger(offset) || offset! < 0 || offset! > 65535) throw new Error('Malformed text trigger');
    const afterSentinel = ended;
    if (raw === 0) ended = true;
    if (afterSentinel || raw === 0 || raw === 0xffffffff) return { index: row.index, classification: 'inactive' as const,
      reason: afterSentinel ? 'after first zero sentinel' : raw === 0 ? 'zero terminator' : 'consumed one-shot sentinel', position: null };
    const count = level.layers[0].length;
    if (raw! % 4 || raw! / 4 >= count || offset! >= 3072 || offset! + 13 > 3072) return {
      index: row.index, classification: 'unknown' as const, reason: 'invalid data1-relative position or message node offset', position: null };
    const p = position(level, raw! / 4);
    return { index: row.index, classification: dry.has(key(p)) ? 'reachable-optional' as const : 'unknown' as const,
      reason: dry.has(key(p)) ? 'dry approach; lang=0 and speaker byte eligibility still required' : candidates.has(key(p)) ?
        'source wet candidate only; lang/speaker and live traversal unexecuted' : 'no supported approach', position: p };
  });
}

export function classifyInteractions(level: LevelData, triggerRows: readonly EditorRecord[]) {
  validateGeometry(level);
  const dry = search(level, level.starts, false);
  // Accepted dry support includes block4 two-level support, outside this wet subset.
  // Seed from the complete dry union; never pretend the wet subset replaces it.
  const candidate = search(level, dry.map(n => n.at), true);
  const dryKeys = new Set(dry.map(n => key(n.at))), candidateKeys = new Set(candidate.map(n => key(n.at)));
  const waters = level.layers[0].flatMap((word, index) => {
    if (!water(word)) return [];
    const p = position(level, index), node = candidate.find(n => key(n.at) === key(p));
    return [{ position: p, sourceWord: word, depth: (word >>> 17) & 3,
      classification: word & (2 | 64) ? 'inactive' as const : 'unknown' as const,
      candidateReachable: !!node, candidateRoute: node?.route ?? null,
      blocker: word & (2 | 64) ? 'solid wet support cell; not a standing destination' : node ?
        'stable source movement candidate; live wet counters/head placement/scheduling/recovery missing' :
        'no stable source candidate; wet descent/support caller must be established' }];
  });
  const frontiers = dry.flatMap(node => directions.flatMap(direction => {
    const wet = sourceWetCandidate(level, node.at, direction);
    const targetWord = wordAt(level, wet.step.target);
    return wet.status === 'candidate' && targetWord !== null && water(targetWord) ? [{ ...wet.step, sourceWord: targetWord,
      currentRefusal: resolveTraversal(level, { ...node.at, facing: 0 }, direction).reason }] : [];
  }));
  const signs = level.layers[0].flatMap((word, index) => {
    if (!(word & 8)) return [];
    const p = position(level, index), type = (word >>> 19) & 3;
    const viewpoints = dry.filter(n => Math.abs(n.at.x - p.x) + Math.abs(n.at.y - p.y) === 1 && n.at.z === p.z).map(n => n.at);
    return [{ position: p, panelType: type, variant: (word >>> 23) & 31, dryAdjacent: viewpoints,
      classification: type === 0 && viewpoints.length ? 'reachable-optional' as const : 'unknown' as const,
      activation: type === 0 || type === 3 ? 'no button dispatch' : 'button caller requires independent action validation',
      limit: 'adjacent approach only; text rendering/readability not executed; no original text exported' }];
  });
  return { dryApproachCount: dry.length, candidateStandingCount: candidate.length, frontiers, waters, signs,
    textTriggers: classifyTextTriggers(level, triggerRows, dryKeys, candidateKeys),
    occupancyLimit: 'union searches ignore other actors; only selected occupied approach below is replayed with three stationary teammates',
    candidateScope: 'source-based hypothetical stable movement graph, NOT executed route or current physics acceptance' };
}

export function verifyRawInputs(input: RawCaseInputs): RawCaseInputs {
  if (!input || Reflect.ownKeys(input).length !== Object.keys(PINS).length) throw new Error('Malformed raw source fields');
  const snapshot = {} as RawCaseInputs;
  for (const name of Object.keys(PINS) as (keyof typeof PINS)[]) {
    const descriptor = Object.getOwnPropertyDescriptor(input, name);
    if (!descriptor || !('value' in descriptor) || !(descriptor.value instanceof Uint8Array)) throw new Error(`Missing raw ${name}`);
    snapshot[name] = new Uint8Array(descriptor.value);
    if (digest(snapshot[name]) !== PINS[name]) throw new Error(`Source digest mismatch: ${name}`);
  }
  return snapshot;
}

export const CONSUMER = freezePolicy({
  id: 'training43-keyboard-wet-traversal', mandatoryNext: true, app: 'existing four-view application, exact imported editor geometry',
  ownership: ['one serialized live owner for body/current/old references and packed heads',
    'stats dead word and runtime dead word distinct; window/control separate',
    'underwater/drowning/water-fall delay and global scheduler counters',
    'fitness/feedback, complete equipment/carried/actions and source weight',
    'all four occupancy, leaders, corpses, pad effects, mission and chronological recovery'],
  browser: ['actual keyboard approach, one wet entry and immediate reverse stair return before any damage request',
    'visible selected actor/paused state; before/after breath counter, item bytes/weight, fitness and no-damage result',
    'race1 comparison still processes inventory before breath reset; race4 is nonimmune',
    'original first-exit preserved; cooperative mode explicitly labelled; fresh Y Retry reconstructs all mutable state',
    'paused save before wet/after item pass/after return, restore paused, continue without duplicate effects',
    'wrong source, altered counters/heads/item history and interrupted async loads refuse atomically'],
  refusesUntilProven: ['any non-null damageRequest (including zero) needs wet-supported damage/death composition before commit',
    'support search/descent, corpse placement and all-dead/control transfer need full map and source callers',
    'existing dry-only ordinary-floor damage/death helper rejects this wet supported stair; never strip water or fabricate floor',
    'no stepping beyond supported cells, occupancy bypass, continued submerged damage or partial recovery'],
  scheduler: 'Declare fixed-step adaptation explicitly: OCS game loop drowning before stuff_falls/controls; drowning signed gate >=50 resets global count; stuff_falls unsigned gate >6 subtracts 6 once, players_fall in party order; wet delay 0->2->1->0 clears pending. No wall-clock claim.',
} as const);

/** Rehash bytes and regenerate all evidence; metadata and saved claims grant no authority. */
export async function generateAcceptanceCase(input: RawCaseInputs) {
  const raw = verifyRawInputs(input);
  const [{ level, report }, roster, items, team] = await Promise.all([importEditorMap(raw.map), importCharacters(raw.roster),
    importItems(raw.items), initializeOriginalTeam(raw.roster, raw.items, [11, 3, 0, 5])]);
  const classification = classifyInteractions(level, report.records.textTriggers!);
  if (classification.frontiers.length !== 1) throw new Error('Expected unique Training43 stable wet frontier');
  const frontier = classification.frontiers[0]!;
  const slot = 3; // Actual ready-team race4 countercase, not an immunity label supplied by metadata.
  const occupied = level.starts.filter((_, i) => i !== slot);
  const approach = search(level, [level.starts[slot]!], false, occupied).find(n => key(n.at) === key(frontier.from));
  if (!approach) throw new Error('Selected actor dry approach blocked by actual team occupancy');
  let world = createWorld(level);
  for (const move of approach.route) {
    const next = stepWorld(level, world, [{ mercenaryId: slot, action: move.action }]);
    if (!next.events.some(e => e.mercenaryId === slot && e.kind === 'moved') ||
      key(next.world.mercenaries[slot]) !== key(move.target)) throw new Error('Actual four-actor dry approach replay blocked');
    world = next.world;
  }
  const returnStep = sourceWetCandidate(level, frontier.target, ((frontier.direction + 2) % 4) as Facing);
  if (returnStep.status !== 'candidate' || key(returnStep.step.target) !== key(frontier.from)) throw new Error('No supported immediate stair return');
  const actorFor = (i: number): ImmersionActor => {
    const initial = team.actors[i]!, source = roster.records[initial.canonicalIndex]!;
    const { totalWeight, quotient, tooHeavy, usingGrenade } = initial.weight;
    return { statsDeadWord: 0, windowType: 0, controlMethod: 1, race: source.race, physique: initial.stats.physique,
      fitness: initial.stats.fitness, spellWater: 0, spellWings: 0, underwaterCount: 0, drowningIndicator: 0,
      inventory: structuredClone(initial.inventory), weight: { totalWeight, quotient, tooHeavy, usingGrenade } };
  };
  const initial = actorFor(slot), first = transitionImmersion({ actor: initial, cellLong: frontier.sourceWord, items });
  const second = transitionImmersion({ actor: first.candidate, cellLong: frontier.sourceWord, items });
  const dryReturn = transitionImmersion({ actor: second.candidate, cellLong: wordAt(level, frontier.from)!, items });
  const comparisonActor = actorFor(0), comparison = transitionImmersion({ actor: comparisonActor, cellLong: frontier.sourceWord, items });
  const threshold = first.decision!.thresholdWord;
  const person = (32 + slot * 4) << 11 | slot << 23 | 2;
  const dryWord = wordAt(level, frontier.from)!;
  const head = (word: number) => ((word & 0xf07e07fd) | person) >>> 0;
  const boundaries = [threshold - 1, threshold, threshold + 1].map(postCounter => {
    const actor = { ...initial, underwaterCount: (postCounter - 1) & 65535 };
    return { kind: 'isolated conditional arithmetic probe; not waited gameplay' as const,
      input: actor, output: transitionImmersion({ actor, cellLong: frontier.sourceWord, items }) };
  });
  const historical: unknown = JSON.parse(Buffer.from(raw.historicalAudit).toString('utf8'));
  if (!historical || typeof historical !== 'object' || !('sourceDigest' in historical) || historical.sourceDigest !== PINS.map || !('routes' in historical)) throw new Error('Historical audit shape mismatch');
  return { format: 'training43-wet-acceptance-case' as const, version: 1 as const,
    base: '46dec166f0604b6cdcbe75c58f3736dc5fd19da9', pins: { ...PINS },
    resource: { bytes: raw.map.length, identity: 'development editor Training43 + exact OCS roster/items; standalone explicit import adaptation' },
    classification, setup: { readyTeam: [11, 3, 0, 5], selectedSlot: slot, selectedCanonicalIndex: team.actors[slot]!.canonicalIndex,
      actor: initial, guardOrigins: 'authored explicit import adapter: both dead words=0, control=1, view=0, spells/counters/pending=0; source initial team supplies fitness/inventory/weight; north facing adaptation',
      stationaryTeammates: occupied, facing: 0, selectKey: '4' },
    dryApproach: approach.route, dryApproachReplay: { commands: approach.route.length, tick: world.tick,
      selectedPose: world.mercenaries[slot], otherActorsUnmoved: world.mercenaries.every((p, i) => i === slot || key(p) === key(level.starts[i]!)) },
    entry: frontier, return: returnStep.step,
    minimumKeyboard: { select: '4', approach: approach.route.map(s => ({ key: ['W', 'D', 'S', 'A'][s.direction], action: s.action })),
      enter: ['W', 'D', 'S', 'A'][frontier.direction], return: ['W', 'D', 'S', 'A'][returnStep.step.direction],
      limit: 'shortest dry approach with three fixed teammates, north-facing strafe controls; entry/return conditional until live consumer' },
    helperInvocations: { first, second, dryReturn, comparison: { slot: 0, input: comparisonActor, output: comparison }, boundaries,
      scope: 'accepted pure helpers invoked on exact source-derived inventory; no original CPU, live scheduler or damage dispatch executed' },
    bodyAndHeadContract: { stage: 'source-derived expected ownership, NOT applied to world' as const,
      runtimeDeadWord: 0, direction: 0, headImages: 32 + slot * 4, blockNumber: 32 + slot * 4, ownerVariant: slot,
      before: { current: cellIndex(level, frontier.from), first: head(dryWord) },
      afterEntry: { old: cellIndex(level, frontier.from), current: cellIndex(level, frontier.target),
        departedFirst: (dryWord & 0xf07e07fd) >>> 0, arrivedFirst: head(frontier.sourceWord),
        arrivedSecond: level.layers[1][cellIndex(level, frontier.target)],
        arrivedThird: (level.layers[2][cellIndex(level, frontier.target)]! & 0xdfffffff) >>> 0 },
      afterReturn: { old: cellIndex(level, frontier.target), current: cellIndex(level, frontier.from),
        departedFirst: (frontier.sourceWord & 0xf07e07fd) >>> 0, arrivedFirst: head(dryWord),
        arrivedSecond: level.layers[1][cellIndex(level, frontier.from)],
        arrivedThird: (level.layers[2][cellIndex(level, frontier.from)]! & 0xdfffffff) >>> 0 },
      reference: 'Controls&Movement.s controls 4562-4572, moved 4871-4891, put_head_in_map 8263-8301; logical cell indices, never original pointers',
      limits: 'non-audio no-white/no-shield adapter. Validate all four heads, old/current refs, ownership and destination/overhead occupancy before atomic commit; preserve water/aux and other planes, except test_mine third-plane bit29 clear' },
    wetSupport: { below: wordAt(level, shifted(frontier.target, -1)), secondBelow: wordAt(level, shifted(frontier.target, -2)),
      branch: 'Main.s player_fall wet delay, ordinary inert immediate-below block support; no vertical descent is required by this geometry',
      sourceExpectedCalls: [{ delayBefore: 0, delayAfter: 2, pendingAfter: 0 }, { delayBefore: 2, delayAfter: 1, pendingAfter: 0 },
        { delayBefore: 1, delayAfter: 0, pendingAfter: 0 }],
      expectationScope: 'conditional source deductions on unchanged supported pose, not implemented wet physics or measured ticks; dry return clears delay',
      missing: 'waterFallDelay, fallDamage and global fall/drown counters not represented in current static world; accepted dry descent rejects water; add supported wet delay/support caller with preserved refs/head ownership' },
    deathBoundary: { kind: 'conditional source branch prerequisite, NOT executed death' as const,
      entryAuxType: frontier.sourceWord >>> 28,
      immediateBelowBlock: block(wordAt(level, shifted(frontier.target, -1))!),
      firstSearchRedirect: { ...frontier.target, y: frontier.target.y - 1 },
      firstRedirectWord: wordAt(level, { ...frontier.target, y: frontier.target.y - 1 }),
      requiredCaller: 'Main.s handle_dead 1173-1222: inert block0 support -> found_floor -> auxiliary10 -> stairss 1295 onward -> north cell find_floor; validate full search/corpse owner and return references',
      refusal: 'accepted ordinary-floor damage/death requires floor0 with no auxiliary and empty below block; exact wet stair fails both support and auxiliary restrictions. No partial item/counter/fitness/death commit on unsupported request.',
      control: 'retain selected actor/device assignment on source death; leader clear is separate. No automatic survivor selection inferred from after-death evidence. Explicit keyboard selection is an adapter; dead controls, all-dead/exit ties and corpse ownership must be reconciled.' },
    reusedDryExit: { sha256: PINS.historicalAudit, routes: historical.routes,
      limit: 'historical accepted dry full-team/first-exit evidence reused unchanged; no new exit run or wet-to-exit execution' },
    consumer: structuredClone(CONSUMER),
    acceptance: { T43_04: 'partial: complete bounded static water/sign classification; live wet candidates remain unknown',
      T43_05: 'not passed', deeperWet: 'all source water depth=2 on one elevation; no deeper water target is established; supported corridor candidates are not gameplay',
      lifecycle: 'source handle_dead support search on wet stairs and after-death controls/occupancy/corpse/recovery remain prerequisites' } };
}
export type AcceptanceCase = Awaited<ReturnType<typeof generateAcceptanceCase>>;

// Measured pinned witness: 226892 pretty-printed bytes, 7782 value visits,
// depth 9, largest collection 50, largest string/key 274, total string/key units 53960.
export const WITNESS_LIMITS = freezePolicy({ bytes: 1048576, depth: 32, visits: 32768,
  collection: 256, string: 4096, stringUnits: 262144 } as const);

/** Descriptor-only call-time copy. Shared subtrees count again, so DAGs cannot
 * bypass the visit budget; active cycles reject. Never rereads a caller value. */
export function snapshotAcceptanceWitness(value: unknown): unknown {
  const active = new WeakSet<object>();
  let visits = 0, units = 0;
  const string = (s: string) => {
    if (s.length > WITNESS_LIMITS.string || (units += s.length) > WITNESS_LIMITS.stringUnits)
      throw new Error('JSON witness string budget exceeded');
  };
  const copy = (v: unknown, depth: number): unknown => {
    if (++visits > WITNESS_LIMITS.visits) throw new Error('JSON witness visit budget exceeded');
    if (depth > WITNESS_LIMITS.depth) throw new Error('JSON witness depth budget exceeded');
    if (typeof v === 'string') { string(v); return v; }
    if (v === null || typeof v === 'boolean' || typeof v === 'number' && Number.isSafeInteger(v)) return v;
    if (!v || typeof v !== 'object' || active.has(v) ||
      ![Object.prototype, Array.prototype].includes(Object.getPrototypeOf(v) as object)) throw new Error('Case requires plain JSON data');
    const array = Array.isArray(v);
    const length = array ? Object.getOwnPropertyDescriptor(v, 'length')?.value as unknown : 0;
    if (array && (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0 || length > WITNESS_LIMITS.collection))
      throw new Error('JSON witness collection budget exceeded');
    const keys = Reflect.ownKeys(v);
    if (keys.length > WITNESS_LIMITS.collection + (array ? 1 : 0)) throw new Error('JSON witness collection budget exceeded');
    if (array && keys.length !== (length as number) + 1) throw new Error('Case requires dense JSON arrays');
    active.add(v);
    const result: Record<string, unknown> | unknown[] = array ? [] : {};
    for (const key of keys) {
      if (array && key === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (typeof key !== 'string' || !d || !('value' in d) || !d.enumerable) throw new Error('Case requires enumerable JSON data fields');
      string(key);
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= (length as number))) throw new Error('Case requires dense JSON arrays');
      Object.defineProperty(result, key, { value: copy(d.value, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    active.delete(v);
    return result;
  };
  return copy(value, 0);
}

/** Byte and lexical nesting checks precede JSON.parse's allocations. */
export function parseAcceptanceWitness(text: string): unknown {
  if (text.length > WITNESS_LIMITS.bytes || Buffer.byteLength(text, 'utf8') > WITNESS_LIMITS.bytes)
    throw new Error('JSON witness byte budget exceeded');
  let depth = 0, quoted = false, escaped = false;
  for (const c of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '[' || c === '{') {
      if (++depth > WITNESS_LIMITS.depth) throw new Error('JSON witness nesting budget exceeded');
    } else if (c === ']' || c === '}') depth--;
  }
  return snapshotAcceptanceWitness(JSON.parse(text) as unknown);
}

export async function readAcceptanceWitness(path: string): Promise<unknown> {
  const file = await open(path, 'r');
  try {
    const metadata = await file.stat();
    if (!metadata.isFile()) throw new Error('JSON witness requires a regular file');
    if (metadata.size > WITNESS_LIMITS.bytes) throw new Error('JSON witness byte budget exceeded');
    // Fixed-size allocation and capped reads also handle growth after stat.
    const buffer = Buffer.alloc(WITNESS_LIMITS.bytes + 1);
    let used = 0;
    while (used < buffer.length) {
      const { bytesRead } = await file.read(buffer, used, buffer.length - used, null);
      if (!bytesRead) break;
      used += bytesRead;
    }
    if (used > WITNESS_LIMITS.bytes) throw new Error('JSON witness byte budget exceeded');
    return parseAcceptanceWitness(buffer.subarray(0, used).toString('utf8'));
  } finally { await file.close(); }
}

export async function validateAcceptanceCase(value: unknown, raw: RawCaseInputs): Promise<AcceptanceCase> {
  const snapshot = snapshotAcceptanceWitness(value);
  const expected = await generateAcceptanceCase(raw);
  if (!isDeepStrictEqual(snapshot, expected)) throw new Error('Case differs from canonical source regeneration');
  return expected;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 7) throw new Error('Usage: tsx tools/training43-acceptance-case.ts <map> <roster> <items> <OCS Sources directory> <historical coverage.json> <new .local/output.json> <generate|validate>');
  const [map, roster, items, source, audit, output, mode] = args as [string, string, string, string, string, string, string];
  if (!['generate', 'validate'].includes(mode)) throw new Error('Unknown mode');
  const names = ['map', 'roster', 'items', 'ocsMain', 'ocsControls', 'ocsEquates', 'historicalAudit'] as const;
  const paths = [map, roster, items, resolve(source, 'Main.s'), resolve(source, 'Controls&Movement.s'), resolve(source, 'Equates.i'), audit];
  const buffers = await Promise.all(paths.map(p => readFile(p)));
  const raw = Object.fromEntries(names.map((n, i) => [n, buffers[i]!])) as unknown as RawCaseInputs;
  const root = await realpath(process.cwd()), local = resolve(root, '.local'), destination = resolve(output);
  if (dirname(destination) !== resolve(local, 't43-04') || !destination.endsWith('.json')) throw new Error('Output must be private .local/t43-04/*.json');
  await mkdir(local, { recursive: true });
  if (relative(root, await realpath(local)) !== '.local') throw new Error('Private directory redirects outside worktree');
  await mkdir(dirname(destination), { recursive: true });
  const actualParent = await realpath(dirname(destination));
  if (relative(root, await realpath(local)) !== '.local' || relative(local, actualParent).startsWith('..')) throw new Error('Private directory redirects outside worktree');
  const result = mode === 'validate' ? await validateAcceptanceCase(await readAcceptanceWitness(destination), raw) : await generateAcceptanceCase(raw);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (mode === 'generate') await writeFile(destination, json, { flag: 'wx' });
  process.stdout.write(`${mode}: ${relative(root, destination)} SHA256 ${digest(json)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1;
});
