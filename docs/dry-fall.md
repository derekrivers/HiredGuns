# Authored dry fall and integer injury

Physics is enabled only when `source.kind === 'synthetic'` and level ID is
`synthetic-fall-v1`. The authored `synthetic-empty-v1` profile gives four
independent actors physique 100, agility 100, inventory weight 0, fitness 65535,
alive status and zero accumulated fall damage. These are newly authored test
characters, not recovered original mercenaries. All other levels retain static
physics; original Training43 water/falling and roster selection remain disabled.

`fall.ts` exports `initialPhysics`, `dryFallEnabled`, `fallCounterAtTick`,
`fallObstruction`, `isDead`, `teamDead` and the world integration helper
`advanceGravity`. `health.ts` exports `nextFallDamage` and `damageFitness`.
World schema 3 adds tagged static/dry-fall physics; checkpoint version 3
preserves the complete state and explicitly migrates static v1/v2 saves.

## Cadence and safe movement

Each active logical tick validates commands, clones the world, increments tick
and fallCounter, then runs gravity before controls. A counter greater than 6
subtracts 6 exactly once and runs one gravity pulse. Starting from 0, pulses occur
at ticks 7,13,19,...; the persisted counter is 0 at tick 0 and
`1 + (tick - 1) % 6` thereafter. This follows `Main.s` `stuff_falls` around 320
and its before-controls ordering around264–278. The browser's candidate 50 Hz
logical clock does not establish original interrupt/main-loop wall-clock parity.

Starts must already stand on supported cells. A dry actor may subsequently be
airborne only above an entirely bounded dry vertical path to known static
support. `fallObstruction` scans that complete path before movement or gravity
can enter it, rejecting water, explosion, pushables, unknown auxiliary/support,
pad/lift floors and void outside the grid. Existing stair and block4 entry guards
remain. Stone/stairs/floor/tree support uses the shared traversal predicate.
`resolveTraversal` adds an optional fifth `allowDrops` parameter, default false;
world enables it only for this profile and independently validates both current
and final paths. Midair horizontal control is an explicit bounded adaptation:
the source's unsupported-origin movement gate is not claimed equivalent.

Each gravity pulse processes alive actors in ID order. Supported actors apply
pending injury and clear it. Unsupported actors descend one level and grow the
accumulator. Reaching support during that descent does not immediately damage
fitness: landing injury occurs on the **next gravity pulse**, following
`Main.s:3950–4055`. With empty weight/physique 100, successive falls accumulate
6400,12800,25600,51200,..., capped at 16777216. Two drops therefore land with
12800 pending and subsequently leave fitness 52735. Six drops are fatal.

An active actor immediately below suspends descent and retains accumulated
damage; no source squash injury is implemented. Occupied-at-start/current
policy remains conservative across a pulse. Already dead or extracted actors
do not block gravity or movement. Newly dead actors release occupancy for
controls later in that same tick. Extracted actors and dead actors receive no
gravity/control updates. A fully dead team freezes state, tick and events;
the navigation mission outcome remains unchanged. Retry creates a fresh world.

## Integer arithmetic and explicit omissions

Fall seeding uses unsigned weight/agility DIVU quotient, wraps the physique
addition to 16 bits, shifts the result left 5, then doubles on each fall. The cap
matches the source's signed comparison within a deliberately positive bounded
range. Zero divisors and fall-seed DIVU overflow reject: the source does not
check that overflow and this subset does not invent its behavior.

`damage_fitness` at `Main.s:1356` divides by physique. Quotient overflow selects
`floor(0x0fffffff/100)`; subsequent unsigned multiplication consumes its **low
word**, giving damage 6291400. Normal damage is the integer quotient times 100.
`decr_fitness` around 1400–1462 kills when damage exceeds fitness or remaining
fitness is below 655. This subset normalizes dead fitness to 0, clearing pending
damage; the source can retain nonzero sub-band residue or the entire pre-hit
fitness when damage exceeds it. The separate disconnected
[damage-to-death contract](damage-death-contract.md) preserves those source
writes; this authored drill retains its existing normalization. It emits `damaged` when
fitness falls and then `died` on death. `fell` identifies each actual descent;
blocked gravity emits an explicit reason. No presentation consumes world RNG.

Shield/cheat/rest modifiers, water delay/drowning, race immunity, inventory
damage, combat, corpse relocation/skeleton map writes, body recovery and source
squash behavior are omitted. A dead marker is presentation only. Source death
also changes exit/dead participant resolution and map bytes; this navigation-only
drill does not claim those original mission mechanics.

## Verification record

Synthetic tests hand-check division truncation, low-word overflow behavior,
ADD.W wrap, death thresholds and cap; four simultaneous fall heights, cadence,
landing delay, death/control/occupancy, no squash, unsafe paths, input/array
immutability, static navigation and terminal retry. The coordinator covers v3
checkpoint continuation and browser UI independently.

Model: gpt-6.1-sol, one bounded implementation attempt; aggregate usage
unavailable. Integrated lint/typecheck/build and all 74 unit tests passed. All 15 local
Chromium checks passed, including four fall heights, actual mid-fall download
and restoration, all-dead failure/retry, and opt-in original-map regressions.
Independent high review and final CI disposition are recorded on the PR.
