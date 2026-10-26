# Pure initial inert type-one support

26 October 2026. `transitionType1Support` in `src/character/type1-support.ts`
implements exactly one disconnected initial dry support transition on accepted
main `e1e9d11d278d82eddcc23d45b35e1ecd77f3b46f`, pinned by
`codex/type1-support-transition-base`. The [observation](type1-support-observation.md)
is the bounded source/CPU evidence. No world, scheduler, inventory, save, UI or
artwork changes. Training43 remains incomplete.

Input has exactly `grid`, `actor`, `oldCell`, `stats`, `feedback`, `cells`,
`cheats`, `leaders` and `redrawFlag`; the exported interface enumerates every
nested field. All objects require exact own data descriptors, including hidden
and symbol keys; accessors reject without execution. Exact nonenumerable data
is accepted and copied. Leaders are an exact dense pair of unsigned words 0..4.
All numerical storage must be unsigned integers of its declared width, even if
unchanged. Snapshot, geometry validation and arithmetic eligibility complete
before any candidate or records are exposed. There are no callbacks or input
writes, and all output storage is independent.

Grid dimensions are 1..256; labels are bounded row-major logical indices
`(floor * depth + y) * width + x`, never executable addresses. Actor pose,
current label and current-cell label must agree; floor is at least two. Below
and second-below labels must be exactly one and two vertical strides below.
The bounded old-pose witness must match the old label; neither changes. This
local correspondence grants no whole-map, actor, roster or source authority.

Actor storage follows the dry-descent actor slice: byte pose/control, word
fitness/dead/window/environment counters/delay/head fields, long pending/weight/
labels, party/direction 0..3. Both dead words are zero, window=0, control=1,
gender=0, grunt=99 and cheats=0. Physique is 1..65535; agility is any unsigned
word, including zero, and weight any unsigned long. Neither weight nor agility
is a division input. Head family is 32/36/40/44 by owner; blockNumber is family
plus direction and must match packed current occupancy. Owner variant must
match party plus eight for nonzero fireWhite, otherwise four for nonzero shield,
otherwise zero. White has priority. Requiring coherent incoming head and feedback
is intentionally stricter than merely invoking the original helper.

Current floor mask `0x601` is zero, current occupancy remains owned, immediate
below block mask `0x1f802` is exactly `0x802`, and second-below block mask is zero.
All three first-layer cells have zero water `0x60004` and auxiliary `0xf0000020`
masks; both lower cells exclude pressure pads. Current second/third words are
unrestricted unsigned longs and preserved, as are all opaque bits, cells,
pose, current/old references, heads, weight, agility, breath/dead storage and leaders.
Other supports, wet paths, pads, mines, stairs, teleport/squash, descent and
ineligible guards are outside this contract.

Pending zero produces null arithmetic and no damage request, including fitness
zero. Nonzero pending is the full unchanged requested hit. Shared arithmetic in
`damage-arithmetic.ts` applies shield exactly 87 before unsigned DIVU, retains
the mathematical quotient and remainder, detects quotient greater than 65535,
then multiplies the low word of either quotient or overflow fallback
`floor(0x0fffffff / 100)` by 100. Diagnostics expose `multiplierWord`; remainder
is mathematical, not a claim that the CPU produces packed DIVU output on overflow.
Ordinary-floor damage reuses only this arithmetic and retains its public result
shape and complete death validator. No fabricated floor or erased support is used.

A nonzero request rejects atomically if computed damage exceeds fitness or the
subtraction leaves less than 655. Equality, zero damage with low fitness and
fallback damage therefore reject. Pending zero with low fitness is accepted.
All arithmetic runs before survival classification; there is no threshold shortcut.

The candidate first writes delay word zero. Actual damage then writes fireWhite
byte 255, wrapped flash byte `(old + (damage >>> 9) + 1) & 255`, and fitness word,
including unchanged fitness on zero damage. A change in integer fitness band
`floor(fitness / 655)` writes redraw byte 255. An actual damage helper-return
record names the same actor/stats/current cell; pending long zero follows it.
Final current first-word reread records its literal zero water mask, with no extra
clear. No-call records contain only delay write and reread. `records` retain all
ordered redundant writes with target, width and before/after; they are inert audit
data, not a full instruction/read/stack trace. Outer `helperReturn` always names
the current logical cell; no descent, seed, doubling, cap or head insertion occurs.

Validation: 74 public synthetic tests use authored integers only, covering all 48
owner/direction/variant combinations, white priority, exact records, preserved
storage, null versus actual zero damage, survival 655 / fatal 654, equality/overdamage,
shield neighbors, DIVU remainder/limit/fallback, flash wrapping, descriptor and
numeric boundaries, geometry/ownership/lifecycle rejection and output independence.
`npm run check` passes lint, types, 373 tests (299 prior plus 74) and build.

Coordinator private comparison accounts explicitly for all 57 worker and 55
independent completed eligible fixtures. Worker 23 candidates match complete modeled
outputs and 108 ordered writes / 152 records; 34 exact inputs reject intentionally
because their incoming head variants disagree with shield/white feedback.
Independent 16 candidates match complete outputs and 80 writes / 112 records; 39
intentionally reject for that same stricter coherent-priority requirement.
No fixture is silently excluded or rewritten to force support. The one worker
and four independent stopped fatal prefixes reject atomically; four independent
inputs already fail incoming ownership/feedback validation, separately from
coherent public fatal tests. Six original guard cases remain outside this API.
Stopped prefixes are not completed fatal returns and supply no invented return.
Fresh read-only reproduction preserves original `__file__`, redirects only OUT,
and matches frozen worker/independent and 18/71 descent report hashes. Private
source bytes, addresses, coordinates, scripts and traces remain ignored.
Coordinator browser baseline passes 19 with four optional private-input skips;
explicit local Training43 extraction passes all four checks, including the all-four route.
No browser behavior changes. Independent current-commit review and CI remain gates.

The independent reviewer additionally authored 96 coherent original-helper probes:
89 completed eligible returns match complete candidates, 526 writes and 703 ordered
records; seven stopped fatal prefixes reject atomically. These fresh initialized
fixtures cover all owners/directions across five coherent white/shield combinations
and arithmetic edges. They are separate from the unchanged frozen fixtures above;
they do not establish cadence, whole-map authority or a completed fatal return.

Model: gpt-6.1-sol medium; one implementation attempt, one authored redraw-band
expectation correction (755 and 655 share band 1), no failed implementation repair
cycle and no recursive delegation. Token usage unavailable. No worker commit.

Exactly one next nomination, unstarted: bounded original fatal TYPE1 support
search/placement/return observation at the already reached prerequisite. It must
settle actual support search, corpse writes, restored references and subsequent
caller clear/reread before any fatal extension. Integrated falling, full team/
control/occupancy/pads/corpses, wet traversal and source-bound atomic paused
checkpoint recovery still gate live activation. Shooting, live backpack and full
original recovery remain undemonstrated. Physical controller/TV/full-level evidence
is separate. World/checkpoint 3 and roster-plan 1 remain unchanged.
