# Bounded ordinary-floor death contract

26 October 2026. `src/character/death-transition.ts` implements a pure, synchronous
transformation of an authored local actor/map slice. It is disconnected from the
simulation, original-team initializer, UI and checkpoint codec. This is a narrow
source-derived branch, with synthetic tests; it does not establish faithful death
behavior or activate original actors. See [live-character-prerequisites.md](live-character-prerequisites.md)
for source identities and the remaining activation gates, and
[live-character-contract.md](live-character-contract.md) for separate initialization.

## Accepted slice and lifecycle

`transitionOrdinaryFloorDeath` requires exact fields and bounded integer storage:
one party slot (0..3), direction, pose, current/old map indices, both dead words,
control method, window type, fitness, pending fall/drowning words, two leader
references and the current cell's first/second words plus the below-cell first
word. Map indices are opaque identifiers within this local slice, not original
memory pointers. The caller must establish their correspondence to a complete
map; this API has no complete-map or other-actor validation authority.

Alive source dead words must both be zero. Completed words must both be `0xff00`.
Other combinations reject, including low-byte-only flags and `0xff01`. Source
`ST.B` writes the first byte of each big-endian word (`Main.s:1147-1148`); from
initialized zero this yields `0xff00`. Controls test the full runtime word
(`Controls&Movement.s:4563`), drowning/falling the full stats word
(`Main.s:600,3973`), whereas head insertion tests the runtime byte
(`Controls&Movement.s:8264`). This contract deliberately excludes noncanonical
words rather than equating those guards.

Fitness is preserved, including zero or nonzero fitness. Calling the function is
an explicit death request; it does not decide when health should cause death.
Control method remains independent: zero control method does not imply death,
and does not prohibit this transformation when owned occupancy exists. Extracted
window type 7 rejects because its occupancy/extraction reconciliation is outside
this branch. This restriction is a contract boundary, not a new source death
guard. Source extraction itself sets window type 7 without invoking death
(`Controls&Movement.s:4849-4860`).

For a new transition, the cell must contain the actor's initialized head family
and direction, with a matching zero-based owner variant (ordinary, shield or
white variants 0..11). Head bases 32/36/40/44 are explicitly bound to slots
0/1/2/3 in `Main.s:5107-5108,5142-5143,5177-5178,5217-5218`; head insertion uses
direction, image base and owner variant (`Controls&Movement.s:8270-8297`).
The floor must be present and type 0, below-cell block bits must be empty, and
all current auxiliary bits must be absent. Requiring the below block to be empty
is conservative: the source checks it before the current floor, including stair
redirection (`Main.s:1173-1193`). No supporting-block or downward search branch
is implemented.

## Ordered candidate and effects

All validation completes before any output is exposed. The function copies its
input and modifies only the copy:

1. Set both dead words, clear matching one-based leaders, and copy current map
   index to old map index (`Main.s:1146-1170`).
2. Clear the cell's person bits: block plus complete variant (`1171`;
   `Equates.i:560-605`). Record `occupancy-removed` with before/after words.
3. Record `pad-release-checked` against that post-removal old-position cell.
   Source invokes release after removal (`1172`); the accepted type-0 floor exits
   at the non-pressure-pad test (`Controls&Movement.s:6478-6494,6515-6516`). No
   configured out action or redraw is produced on this branch.
4. Write auxiliary type 7 and the zero-based party owner in second-word bits
   12..19, preserving other bits (`Main.s:1213-1222`;
   `Equates.i:654,665,676`). Record `corpse-written`.

The returned effects are inert ordered audit records, not commands to dispatch.
There is no effect callback, pad executor or arbitrary caller-supplied mutation.
The candidate already contains the complete supported map writes. Live x/y/floor
and current map index do not move. Inventory is outside this slice and no item
transfer is claimed (`Main.s:1213-1222` has none).

`handle_dead` does not clear fitness, pending fall damage, underwater count,
drowning indicator or water-fall delay. These fields are therefore preserved.
Some callers later clear fall damage (`Main.s:4038-4061`); that caller-specific
continuation is not folded into death. Drowning inventory damage, immunity and
health arithmetic are separate unresolved gates, not effects generated here.

A second call accepts only a coherent completed local slice: canonical dead
words, removed person bits, same-cell skeleton with matching owner, old index
equal to current index, and no matching leader. It returns an independent equal
candidate with `already-dead` and no effects. Inconsistent dead maps reject;
idempotence is a browser contract addition, not a claim that original repeated
`handle_dead` calls were safe.

## Unsupported paths and recovery requirement

Pressure-pad floors reject atomically. Resolving their configured out action
requires the below-cell variant, button data and `do_button_action` consequences
(`Controls&Movement.s:6496-6513`) before corpse placement can inspect the resulting
map. No general action semantics have been invented. Downward support search,
stairs, doors, blocked no-skeleton paths (`Main.s:1173-1317`), existing auxiliary
objects/corpse replacement, inventory recovery, audio and redraw remain outside
this implementation. A caller cannot supply a resolved effect list to bypass
these limits. Zero output on rejection leaves all input records unchanged.

A future live adapter must validate the complete team and full map, including
other actors' occupancy and every corpse owner, then install actor flags,
inventory, leader changes, map occupancy, corpse data and all pad consequences
as one coherent state. A local slice is insufficient evidence for that install.
Recovery must snapshot that committed state atomically. Loading a dead flag into
an earlier map or rerunning death effects during load could retain occupancy or
release a pad twice. Any future save migration must explicitly account for these
mutations, reject incomplete candidates before installation and preserve the
working world on failure. No world schema, checkpoint version or codec changes
are made here; existing schema/version 3 remains unchanged.

Validation uses authored numeric fixtures only: exact write ordering and bit
preservation, all four owners, independent outputs, zero/nonzero fitness,
uncontrolled/extracted distinction, environmental preservation, repeat/no effects,
inconsistent completed slices, unsupported geometry/pads and malformed candidates.
No original data, decoded map or source was copied into tests or commits.
Model: gpt-6.1-sol, medium. Initial fixture omitted the block-presence bit;
repair 1 corrected it and incorporated inspected full-word dead guards. Repair 2
corrected TypeScript narrowing/tuple-delete test syntax. Token usage unavailable;
no executable/emulator comparison or recursive delegation.

`npm run check` passed lint, TypeScript, all 106 unit tests (including nine here)
and the production build. This isolated module has no browser surface; browser
integration/activation is intentionally absent and requires the gates above.
