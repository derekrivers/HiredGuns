# Pure one-cell dry descent

26 October 2026. `transitionDryDescent` in `src/character/dry-descent.ts`
implements one disconnected transition on accepted PR #21 base
`b204004f0e76d04ead001348c8e5c8be0341502d`. The
[frozen observation](dry-descent-observation.md) supplies original-instruction
evidence. No world, scheduler, renderer, inventory, save or artwork is changed.
Training43 remains incomplete.

Input is exactly `grid`, `actor`, `oldCell`, `stats`, `feedback`, `cells` and
`redrawFlag`; the exported TypeScript interface enumerates every nested field.
Every boundary requires exact own data descriptors. Missing, extra, symbol,
hidden extra and accessor properties reject without evaluating getters. Exact
nonenumerable own data is accepted and copied into ordinary independent storage.
All snapshots and validation complete before any candidate is exposed; errors
throw without mutation or a partial result. There are no callbacks.

Grid dimensions are integers 1..256. Labels are explicitly row-major logical
indices `(floor * depth + y) * width + x`, never executable addresses or arbitrary
opaque labels. Actor pose must lie inside the grid, with floor at least two;
current and source labels must match its index. Destination and second-below
must equal exactly one and two vertical strides below it. `oldCell` supplies a
bounded logical pose witness matching the actor's old label. Its output witness
follows the old-label write to source; that metadata update is not an additional
CPU memory write. This checks local correspondence, not complete-map authority.

Actor storage extends `DeathActorSlice` with unsigned long weight and word
headImages/blockNumber. Party and direction are 0..3, x/y/floor/control are bytes;
dead flags, window, fitness, environmental counts/delay and head fields are words;
labels and pending are unsigned longs. Stats physique/agility are words, gender
is a byte. Feedback shield/grunt are words, fireWhite/flash/redraw are bytes.
All values must be integers in range, including unchanged storage. Both dead
words are zero, window=0, control=1, gender=0 and grunt=99. Head family must be
32/36/40/44 for its party, blockNumber must equal family+direction, and source
packed head must match. Source owner variant must match party plus eight for
nonzero fireWhite, otherwise four for nonzero shield, otherwise zero. White
takes precedence. These are initialized ordinary heads only.
Canonical incoming blockNumber is an API restriction: the original helper
overwrites that word and does not require its old value to match the head.

All three first-layer cells have zero water and auxiliary masks. Source floor
mask is zero; destination has ordinary type-zero floor, no block or owner
variant. Both lower block masks are empty, excluding the second-below type-four
support branch. A second-below pressure pad is also excluded. Pads, mines,
occupants, transformed heads, wet paths, stairs, teleport/squash/support branches
and ineligible guards reject. Opaque bits outside the executed masks survive;
third-layer storage is an unrestricted unsigned long, including its no-monster
bit. The second layer is neither read nor written in this slice and is not an
input. Callers retain it independently.

Agility must be nonzero and unsigned weight/agility quotient must fit a word,
even when existing pending bypasses seeding. With zero pending the quotient
discards remainder, adds physique modulo 65536, zero-extends and shifts left five.
Otherwise the existing pending long is used. Doubling wraps modulo 2^32. The
cap comparison interprets the doubled value as signed; values at least
0x1000000 are capped, while high-bit values remain unsigned in the output.
Zero physique is valid storage for this arithmetic-only call; a later landing
with damage has its own stricter physique requirements. Public arithmetic edge
tests extend source-deduced width behavior beyond the frozen execution matrix;
they do not establish those inputs' gameplay reachability.

The candidate clears delay, removes source person bits with `0xf07e07fd`, moves
old/current labels, decrements floor and writes pending. Real observed ordinary
release and push checks are inert records against the post-removal source and
pre-placement destination. Mine testing unconditionally clears destination
third-layer bit 29 using `0xdfffffff`, including when no mine is present. Head
insertion writes blockNumber, clears destination person bits, ORs head/variant
and writes redraw=255. Actor fitness, x/y/direction, feedback and breath counts
are preserved. Injury remains pending, including zero after wrapping.

`records` preserves all eleven non-stack writes with byte widths, before/after
values and logical targets, interleaved with release, push, mine-test and head
entry records in the observed order. Redundant writes are retained. The mine
entry record precedes the mandatory third-layer write; head entry precedes its
block-number write. These records describe the completed candidate and dispatch
nothing. Their known outcomes annotate helper-entry markers, not return
timestamps: the actual no-mine decision occurs after the third-layer write.
They are not a full instruction/read/stack trace. `helperReturn` names
the same logical actor/stats and **source** cell: original A2 remains source
although actor current label now names destination. There are no public memory
addresses or fabricated destination return reference. `arithmetic` exposes the
nullable seed quotient/word, pre-double value, wrapped double and final pending.

Later landing remains an explicit separate call to the existing
[landing/damage composition](landing-damage-contract.md), with destination as
its current cell and independently retained second-layer/leaders/damage storage.
The composition example in the public suite demonstrates default descent then
landing without mutation or automatic damage dispatch. This API grants no actor,
source, roster, world or checkpoint authority and establishes no tick cadence.

Validation: 55 public synthetic tests cover all 48 owner/direction/variant
combinations, exact ordered records, opaque bits, arithmetic truncation/wrap/cap,
zero/overflow rejection, logical correspondence, ownership, storage widths,
descriptor boundaries, atomicity and independent later landing. `npm run check`
passes lint, TypeScript, all 299 tests (244 prior plus 55), and production build.
Coordinator browser checks pass 19 with four optional private-input skips; a
separate explicit local Training43 run passes all four extraction checks,
including the exact original all-four route. Browser behavior is unchanged;
those checks do not establish original falling parity or a complete level.

Private reproduction reads both frozen scripts unchanged, preserving their
original `__file__` and source/hash inputs while redirecting only generated
outputs into this worktree's ignored storage. Observer18 results reproduce
SHA-256 `994c726ea5a76c9ab1049b6b8798871aa4e472c6ba3e16a18c545fa8c892041e`;
independent71 results reproduce
`0b2d047f913901bdf8372da67359bb92b202d3319b2abcd1a3dfecdc52186791` byte-for-byte.
Original scripts remain SHA-256
`2d43e35acd08ec2470fba08425b06da097ad731ae7188b41008a9e908a2c4749` and
`e94e34413c67466a1619ff690140d324900e36be9c47cddbc92b48d5a3697d4b`.

The private `.local/dry-descent/compare.ts` compares all 15 eligible frozen
first-call outputs without exclusions: pending, fitness, floor, normalized
logical old/current refs, full source/destination words, third word, blockNumber,
redraw and source-return correspondence. All 165 writes match exact order,
width and before/after values after explicit address-to-logical-label conversion;
all 225 interleaved write/helper-entry records match order. Inputs remain
unchanged. Comparator output SHA-256 is
`0cb2d9b43d54d864597d9ac6f209d310078a2f3325afb680b0611ce81fe1da12`.
Guard cases are reproduced but outside this eligible API. Independent71's
patterned initial blockNumber and wet/aux second-below fixture are outside the
strict nominated API; their reproduction is separate corroboration, not an
API comparison. Frozen CPU assertions separately cover full initialized-memory
preservation; the comparator does not pretend to compare unmodeled storage,
whole maps, scheduling or all future gameplay. Scripts, original addresses,
traces and results remain ignored; public tests contain authored integers only.

An independent reviewer additionally compares 100 first-call CPU cases: the
15 frozen cases plus 85 separately initialized valid reruns, including all
owner/direction/variant combinations, white-over-shield priority and opaque bits.
All 1,100 writes match order, width and before/after values using target-derived
logical mapping, along with complete candidate fields and helper-entry order.
Its 332 atomic rejection probes and three guard rejections pass. This is
additional bounded synthetic evidence; final-commit approval remains separate.

Model: gpt-6.1-sol medium, one implementation attempt; one evidence-driven
synthetic opaque-mask correction and one lint-only unused-binding correction.
Token usage unavailable. Independent final-commit review and CI are coordinator
integration gates.

Exactly one next supported task, unstarted: observe the original per-player
helper's initial immediate-below inert type-one block support branch, in bounded
dry non-pad/no-aux synthetic storage with no teleport or squash, through its
supported-landing continuation. Establish its own entry, geometry, return and
damage/clear evidence before proposing implementation. Full team/control,
occupancy/pads/corpses, wet traversal and source-bound paused recovery remain
unresolved live-activation gates.
