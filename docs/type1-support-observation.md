# Initial inert type-one support: bounded evidence

26 October 2026, accepted PR #22 base
`ece0ab935dea2e477ce7a36acdd278c7be72546a`. Evidence only: the real original
per-player fall helper is entered before its guards with initialized owned
synthetic storage. Current floor is absent; the immediate lower cell contains
inert block type one, and the second lower cell has empty block bits. All cells
are dry, without auxiliary objects or pads. No descent, implementation, world,
save, renderer, inventory, artwork or scheduler changes are made.

The result is **57 completed eligible no-call/survival returns, three guard
returns and one deliberately stopped death continuation**. The fatal fixture
reaches the previously excluded death support-search prerequisite. Execution
stops before its first instruction; no fatal return, corpse placement, subsequent
pending clear or final reread is claimed. Dependent fatal work stopped there.
Training43 remains incomplete and no live activation is authorized.

Reproduce privately from this worktree:

```powershell
python .local/type1-support/observe.py
npx --no-install tsx .local/type1-support/compare.ts
```

The observer reuses only the loader/setup prefix of the frozen sibling
`landing-composition/.local/landing-composition/observe.py`, preserving its
original `__file__` resolution. Frozen descent observers/results remain unchanged.
The executable SHA-256 is
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`;
source pins are Main.s `cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9`,
Controls&Movement.s `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15`,
and Equates.i `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759`.
Observer SHA-256 is `7dd02875aedb598fdf83a9cb50eaca6c71bda10d81571b06437cc369bc951cda`;
results `7d3592fa0dff50840aa5dd667546b5e99b792ca353e9cc6b70dd29d08bc121fd`;
comparator `63e42acfdcf286e0e8e9c4288d6be55f8104936e4614b65dba45b19b3db2ff6b`;
API report `8ef69742596b08548e4e3d00cc98f559d37b806bbc5f3bcf7efb518347a40c83`.
Original bytes, decoded listings, addresses, access records and traces stay ignored.

Source deduction and CPU observation agree on this bounded path. Eligibility
reads the stats dead **word**, compares window **word** to exactly 7, then tests
control **byte** for zero. Guard failures retain incoming A2 and share the final
cell reread through it; these probes initialize it to a distinct dry cell. They
make no universal no-op claim for arbitrary incoming references. Eligible entry
loads A2 from the actor's current **long** reference, applies the current water
**long** mask `0x60004` and clears delay as a **word**. It tests current floor bit
zero with a long bit test, checks second-below masked block long for exactly
`0x2002` (type four plus presence), then tests immediate-below block-presence bit
one. Our second-below test fails; immediate support succeeds.

The supplying word is immediate-below, masked by `0x1f802`, yielding `0x802`.
A2 still identifies **current**, not supplying lower cell. A1 is saved/restored
around the teleport equality test against `0x3002`; signed long squash threshold
comparisons follow. Type one lies below `0x4002` and branches straight to the
landing continuation. No teleport, squash, head insertion, pad push, mine check
or descent helper executes on completed returns. Masked equality/comparison
operands are positive even when unrelated lower-cell bits are set. The opaque
fixture verifies those bits do not alter the type-one path. Other block types
are source-inspected exclusions, not executed comparison-edge coverage.

The landing continuation reads pending as a **long**; zero bypasses damage.
For nonzero pending it reads water from **current**, whose literal mask is zero
in this slice, and supplies the full unchanged unsigned pending to the real
damage helper. Weight and agility are never read: deliberately maximal weight
and zero agility remain unchanged without division. No seed, doubling or cap
arithmetic occurs. Existing [landing-mask evidence](supported-landing-observation.md)
settles the other literal mask comparisons independently; those branches are
not executed or newly claimed here. Floor absence is literal: packed current
`first & 0x601` is zero, not ordinary floor one.

There is a null request when pending is zero. There is **no real requested-hit
zero** on this strict dry branch: any nonzero pending is passed unchanged.
There are actual zero-damage calls: pending one divided by physique 100 gives
zero damage but still writes feedback, writes unchanged fitness and clears
pending after helper return. This is distinct from no call. Gender zero and
grunt count 99 bypass audio naturally; no code patch or helper interception is
used. The only execution stop is the explicitly labelled unsupported prerequisite.

| Authored input | Observed completed outcome |
| --- | --- |
| Pending 0, fitness 1000 or 0 | No request; fitness preserved; only delay word written |
| Pending 1, physique 100, fitness 1000 | Request 1, damage 0, feedback written, fitness preserved |
| Pending 100, physique 100, fitness 755 | Damage 100, fitness 655, survives |
| Pending 799, physique 100, shield exactly 87 | Shift before division, damage 0, survives |
| Same pending/physique, shield 86, fitness 65535 | Damage 700, fitness 64835, survives |
| Pending 65535, physique 65535, fitness 65535 | Damage 100, fitness 65435, survives |

Forty-eight cases cover all four owners, four directions and three initialized
owner variants. Additional opaque-bit and maximal-divisor cases preserve owned
current occupancy and both lower words. The maximum executed count is 99,
within 350 instructions per invocation, using Python 3.13.7, Unicorn 2.1.4,
explicit M68000 and Capstone 5.0.7. Calls are explicit isolated invocations;
no main-loop cadence, reachability of synthetic inputs or whole-map authority
is established.

For completed eligible returns the exact ordered non-stack writes are:

1. Delay word zero, even though support prevents descent.
2. On a real request: fire-white byte 255, wrapped flash byte
   `(oldFlash + (damage >> 9) + 1) & 255`, fitness word after subtraction
   (including unchanged fitness when damage is zero), then redraw byte 255
   only if integer fitness bands divided by 655 change.
3. On nonzero pending: pending long zero after actual damage helper returns.
4. Final reread of actual current first word; mask zero produces no second clear.

No-call returns write only delay. Guard returns write nothing. Every completed
eligible return preserves actor/stats/current references; old reference, pose, floor,
head/block fields, current occupancy, current second/third words, both lower
words, leaders, dead words, underwater/drowning counters, weight/agility,
shield, gender and grunt remain intact. Redraw otherwise preserves its initial
byte. The complete target/width/value/before sequence is replayed against the
initial 8 MiB memory image and compared with actual final memory, excluding only
a bounded stack range. Reads are restricted to initialized ranges; code is
read/execute protected and executable/source hashes are rechecked. These
assertions cover all other actor, cell and global bytes, not merely named outputs.

The single fatal probe uses requested hit one, actual damage zero and initial
fitness 654. Actual damage invokes death because resulting fitness is below
655. Before the stopped search, observed ordered writes are delay, fire-white,
flash, unchanged fitness, stats dead byte, runtime dead byte, matching leader
word zero, old-reference long=current, then current occupancy removal long.
The real non-pad release helper executes and returns. Pending still equals one;
no caller clear/final reread has occurred. Full-memory replay verifies this
prefix only. This stop is not a helper return or a completed dead candidate.
Source deduction predicts equality death (subtraction equal to fitness leaves
zero), overdamage death, and quotient-overflow fallback; no additional fatal
fixtures execute after the prerequisite appears. Existing ordinary-floor death
observations cannot establish this different geometry's return behavior.

The private comparator checks all 57 returned eligible request decisions against
`prepareSupportedLanding`, preserving null versus nonnull, and their pending
write widths/order. All 57 unmodified complete inputs are atomically rejected
by `composeOrdinaryFloorLanding`: its death validator requires ordinary current
floor and empty below-block geometry even on no-call branches. This rejection
is expected. No floor bit is invented and no lower block erased to force API
acceptance. Fitness/current/cell fields can be represented by that API's shape,
but its supported geometry cannot represent this transition. No whole-candidate
API parity comparison is claimed.

Exactly one smallest **next implementation** is nominated: a disconnected pure
initial inert-type-one support transition restricted to eligible dry no-call or
**computed surviving** damage. Inputs must explicitly include initialized actor,
stats, matching owned current cell plus its second word, immediate type-one lower
word, empty-block second-lower word, bounded logical vertical correspondence,
old/current labels, delay, feedback, leaders and redraw; explicit physique, shield,
cheats, gender/grunt, both dead words, window and control are required. Preserve pose/head and
all other modeled fields; return candidate delay/fitness/feedback/redraw/pending,
current/old labels, unchanged packed cells, actual current return label and ordered
inert write/helper-return/reread records. Validate exact unsigned storage,
ownership, lifecycle/audio/cheats and exact geometry atomically before any
candidate. Compute the full existing shield, unsigned DIVU, overflow fallback
and damage multiplication before deciding eligibility; preserve null versus
zero-damage calls. Pending zero may retain fitness below 655 because no helper runs.
For nonzero pending reject if damage exceeds fitness or subtraction leaves less
than 655; this also rejects division-overflow fallback's fatal damage. Do not
call the existing ordinary-floor death composition with fabricated geometry.
The needed damage arithmetic may be factored/reused only without weakening its
existing death validator. No implementation is supplied in this evidence task.

Actual type-one-supported death placement and return is an explicit prerequisite
before widening that slice to fatal outcomes. Its separate bounded observation
would need to settle the already reached support-search branch, corpse writes,
restored references and subsequent caller clear/reread without other support
geometry. It is **not started** here. Pads, other block types, mines, wet paths,
stairs, multi-cell traversal and scheduling remain excluded.

Baseline and final-worktree `npm run check` pass lint/types, 299 tests and build;
frozen 18/71 reports reproduce unchanged. Public browser regressions pass 19 with four optional private-input
skips. Independent review and CI remain coordinator gates. Model: gpt-6.1-sol, medium; one observer authoring attempt, one decoded
range correction, discovered fatal prerequisite and stopped, one evidence-based
ordered-prefix correction, one owned opaque-fixture correction. No recursive
delegation or commit. Token usage unavailable.
