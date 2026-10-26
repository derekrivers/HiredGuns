# Live original character prerequisites

26 October 2026. Bounded inspection of supplied OCS source and previously
recovered data, supplemented by selected executable anchors and isolated CPU
observations in [water-executable-evidence.md](water-executable-evidence.md).
Most behavior below remains source-derived; the added evidence is identified
explicitly and does not establish whole-game executable parity.
Original source, data and derived reports remain local and ignored. No live
original actor activation, implementation or save-schema change is implemented
here. Existing synthetic dry fall remains a bounded adaptation.

## Evidence identity

Line references below are one-based in `research/ocs/Sources/`, relative to the
workspace parent of the repository worktrees. SHA-256 values were rechecked:

| Source | SHA-256 |
| --- | --- |
| `Main.s` | `cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9` |
| `ChSelect.s` | `7b0cc57ea6becefcea5a14fbadc6534b300f15638eeb3c6684c0818dedd9f4b0` |
| `Controls&Movement.s` | `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15` |
| `Equates.i` | `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759` |
| `ColdStartup.s` | `5c9c64ee626ab8fb13bf321fad5ac0940e80a5db0b3366ce57af8c12daa971ee` |

Rehashed local payloads match the established OCS roster digest
`79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439`
and OCS English item digest
`633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc`.
See [character-format.md](character-format.md) and [item-format.md](item-format.md)
for archive identities, recovery CRCs, field offsets and revision boundaries.
These data matches alone do not establish that an archived executable implements
the inspected source. The separately recovered OCS executable matches the local
OCS build artifact, with selected water/initialization anchors inspected; see
[water-executable-evidence.md](water-executable-evidence.md#identity-and-recovery).
CD32 item source matches CD32 data, not the OCS item payload.

## Selection becomes live state through a separate initialization

`ChSelect.s:381-418` selects the canonical record using a one-based number,
copies its 140-byte tail into the original stats block, clears the following
six status/pad bytes and four-byte equipment slot, copies ten carried entries,
and clears twenty further carried entries. The copied actions remain stats
templates, separate from carried inventory. The resulting stats structure is
146 bytes (`Equates.i:1127-1145`).

`Main.s:5049-5053` clears variable and timer storage before initialization.
`Main.s:5104-5247` initializes four ordered party slots from their respective
original stats and map start positions. The common helper at `5309-5351` copies
146 stats bytes, equipment and thirty carried entries; copies footstep/grunt
periods; clears old fitness band and flash; sets fitness to **65535** regardless
of its roster value; copies the dead word into the runtime dead word; sets
bumping target to -1; advances the source RNG for direction; reads x/y/floor;
requests view redraw; and calculates weight. A roster selection or weight
preview therefore cannot itself constitute a live actor.

The bounded synthetic CPU run of the identified OCS initialization helper
observed the fitness override, dead-word copy, inventory copy, position and RNG
setup. It does not cover full game startup or occupancy; see the linked
executable evidence for inputs and limits.

Verified storage needed by these paths includes stats race, fitness, physique,
agility and dead word, plus runtime x/y/floor, direction, old/current map
position, weight (long), fall damage (long), underwater count (word), drowning
indicator duration (word), runtime dead word, control method (byte), window
type (word), water-fall delay (word), spell words, equipment and carried slots
(`Equates.i:984-1043,1093-1118,1127-1145`). Naming a source field verifies its
storage/use here, not full semantics across the game. Preserve unknown bytes.

## Alive, controlled and extracted are separate conditions

The controls guard skips nonzero runtime `dead_flag2`, window type 7, or zero
`control_method` (`Controls&Movement.s:4562-4568`). Drowning and falling instead
test the stats `dead_flag`, then the same extraction/control conditions
(`Main.s:600-605,3972-3978`). Death sets the first byte of both word flags using
ST.B (`Main.s:1146-1148`); do not infer death solely from zero fitness.

One human controls four actors in one-player mode; two humans still control
four actors. Three-player mode disables the fourth control method and marks
that slot dead with zero fitness after initialization
(`Main.s:5063-5098,5249-5255`). Human count is therefore neither roster count nor
an interchangeable alive flag. A zero control method may be inactive without
an ordinary death transition.

Exit collision sets `window_type=7`, requests redraw and returns
(`Controls&Movement.s:4849-4860`). This is the observed extraction marker;
the branch does not call death handling, relocate the actor, or release a pad.
`put_head_in_map` rejects runtime-dead and extracted actors
(`8263-8267`), but has no control-method guard. Occupancy must consequently be
traced as map state, not inferred from one generic actor-status Boolean.

`Main.s:479-498` counts dead **or uncontrolled** slots in both its resolved
and dead/inactive totals; living controlled window-7 slots count only as
resolved. Four dead/inactive slots trigger the death path (`401-410`), while
campaign resolution uses the resolved total (`467-474`). Action modes have
additional conditions (`417-462`); this does not establish a general browser
mission-outcome implementation.

## Death changes occupancy, pads and corpse map data

`Main.s:1156-1172` clears matching leader references, saves the current map
position as old position, erases the person bits, then invokes pad release.
Pad release reads old position, tests a pressure-pad floor, resolves the button
variant and executes its configured out action
(`Controls&Movement.s:6478-6516`). A visual dead marker does not perform this
map action or its consequences.

Corpse placement searches downward for support, handles block/stair/door
geometry, and can choose no skeleton when blocked (`Main.s:1173-1317`). In the
ordinary placement branch it replaces auxiliary map bits with type 7 and writes
the zero-based party number into auxiliary data in the second map part
(`1213-1222`; `Equates.i:654,665,676`). This is a map mutation, not movement of
the live actor's x/y/floor: that branch does not update those position fields.
The routine does not transfer carried items there. Body recovery and effects
on existing auxiliary objects require separate evidence before implementation.

A future checkpoint must preserve actor flags and inventory together with the
post-transition map bits, corpse owner and pad/button consequences. Restoring
only a dead actor flag into the pre-death map would retain occupancy or lose
the skeleton/action; rerunning death on load could release the pad twice.
Take a coherent state snapshot after the ordered transition, with explicit
migration for saves lacking those mutations. This is a required browser state
design consequence of the source ordering, not an inspected original save
format or a new schema implemented here.

Fitness death is also not a guaranteed write of zero: damage exceeding fitness
calls death before subtraction; subtraction leaving a fitness band below 655
also calls death (`Main.s:1444-1455`). Existing synthetic normalization to zero
is documented in [dry-fall.md](dry-fall.md), not original parity.
The selected matched-executable boundaries and isolated CPU observations are now
recorded in [damage-fitness-evidence.md](damage-fitness-evidence.md). The separate
[pure damage contract](damage-death-contract.md) composes only the accepted
ordinary-floor death slice; it preserves both overdamage fitness and sub-band
residue without activating original actors.

## Water damages inventory before drowning immunity

`Main.s:577-598` dispatches drowning when the word timer reaches 50 and clears
that timer. For each eligible actor it checks water presence/depth, then calls
inventory damage **before** race 1 or spell-water 97 grants breath/reset
(`600-643`). Those drowning immunities do not bypass the inventory call.
The inventory routine separately skips its entire operation only for
spell-water **100** (`Controls&Movement.s:5849-5851`).

Per-item logic uses item water-damage byte and max-damage word, combines damage
in word arithmetic after shifting by eight, and either stores the resulting
damage byte or replaces the item ID according to container type (IDs 52, 111,
or 22). It does not clear the other entry bytes on replacement
(`Controls&Movement.s:5870-5914`). Weight is recalculated after the scan.
Do not silently turn this into floating-point durability or erase the entry.

**Confirmed baseline loop discrepancy:** `5859` loads the thirty-slot loop
count into **d0**, while `5862` decrements **d1**. The per-item helper does not
write d1. At the inspected drowning call site `Main.s:612` sets d1.w to
`32-water_shift`, which is 15 (`Equates.i:573`), and the subsequent rotate does
not change d1. Register tracing therefore yields equipment plus **sixteen**
carried entries on this source path, rather than thirty. The routine saves and
restores d1 around the scan. The recovered archived OCS executable confirms
these instructions and caller register value. Bounded isolated CPU runs with
synthetic inventory observed equipment plus carried indices 0–15 damaged for
race 1 and spell-water 97, followed by a breath reset; spell-water 100 skipped
inventory damage and did not give that reset. See
[water-executable-evidence.md](water-executable-evidence.md) for hashes, offsets,
recovery checks and harness limits. This resolves the discrepancy for that
baseline, without proving all released versions share it. Choosing literal
behavior or an explicit adaptation remains a separate implementation decision.

After immunity checks, underwater count increments as a word. The breath
threshold uses unsigned physique-times-fitness, DIVU by the assembled constant
`65536/100`, sign extension of the quotient word and a second DIVU by 400;
the final comparison is signed word BLE (`Main.s:624-634`). Exceeding it sets
the drowning indicator to 150 and passes count-times-200 to damage_fitness
(`636-639`). DIVU overflow/sign-extension cases must not be replaced by a
continuous percentage formula. Leaving qualifying water or receiving breath
immunity clears underwater count (`643`); extraction/death guards return
without that reset.

## Falling has coupled state and map ordering

The loop orders drowning, water movement, falling, lifts/doors/projectiles and
monsters before player controls, and exit resolution after drawing
(`Main.s:263-280`). Falling runs when fall_count is unsigned greater than 6,
subtracts 6 once, then processes blocks before players (`320-330`). Counter
increments are in `ColdStartup.s:915-925`. This establishes source ordering,
not a measured browser-to-original wall-clock conversion.

`Main.s:3980-3994` slows descent in deep water using a word delay of 2 and clears
pending fall damage. Dry descent erases old occupancy, changes map pointer and
floor, seeds/grows pending damage, then releases/pushes pads, tests mines,
reinserts the head and requests redraw (`4011-4035`). The seed uses weight,
agility DIVU, ADD.W physique, shift by 5, doubling and a signed cap at 0x1000000.
Supported actors apply pending damage on the later pulse and clear it;
water changes or suppresses that damage (`4038-4061`). Teleport support and
occupant squash are separate branches (`4063-4130`). Controls also reject
unsupported-origin dry movement (`Controls&Movement.s:4728-4743`). The existing
synthetic drill omits/adapts those interactions explicitly.

## Activation blocker and bounded next evidence

Keep live original stats, health, drowning and falling disabled. Recovered
roster/items establish input identities and preparation arithmetic only.
Selected OCS executable/source anchors and the water scan discrepancy now have
bounded evidence; whole-build source correspondence is not established.
Activation still needs resolution of 68000 edge arithmetic, explicit death/control/extraction
and occupancy transitions, pad/corpse map effects, and checkpoint migration for
all newly live state. The isolated initialization and immune inventory
observations do not replace full transition evidence. Obtain bounded traces
for drowning threshold, full landing/death effects and extraction before claiming original
parity. Campaign travel remains separately blocked by the
known Locations revision mismatch.

Research: one bounded source-inspection pass, followed by the linked executable
inspection and synthetic CPU observations; no source repairs, full-system
emulator comparison or recursive delegation. Model: gpt-6.1-sol; token usage
unavailable. Original payloads/recovery reports remain local and ignored.
