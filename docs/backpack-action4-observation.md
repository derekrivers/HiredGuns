# OCS occupied action-4 exchange observation

27 October 2026. On accepted base `4f68d1ea67302d7ca94adea49c7c053610215e0a`,
a private diagnostic executed the original OCS per-player control caller through
its inventory action-4 occupied selected-carried/equipment branch, actual weight
calculation and natural return. Three bounded cases passed. This establishes
that supported manual exchange slice; it does not establish arbitrary
carried-to-carried reordering or a playable inventory UI.

## Identity and execution boundary

The source pins are those in [backpack-transfer-contract.md](backpack-transfer-contract.md):
`Controls&Movement.s` SHA-256
`d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15`,
`ColdStartup.s` `5c9c64ee626ab8fb13bf321fad5ac0940e80a5db0b3366ce57af8c12daa971ee`,
and `Equates.i` `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759`.
The retained original executable SHA-256 is
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`.
The diagnostic reuses the pinned retained loader, uses Unicorn 2.1.4 in M68000
mode and Capstone 5.0.7, and changes no original instruction or helper return.

Weight reads use the complete verified OCS runtime item table, SHA-256
`633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc`,
checked against the recovered OCS GameFast slice. The table is initialized at the
runtime location addressed by this executable. The source-derived CD32 table
and editor candidate are not substitutes; see [item-format.md](item-format.md).

The entry is the actual per-player caller at
`Controls&Movement.s:4562-4588`, reached here with explicitly initialized
registers and caller state. Its earlier mouse producer and outer four-player
loop are not executed. Source inspection establishes action production/transport
at `ColdStartup.s:2241-2450,2467-2646,2728-2740` and
`Controls&Movement.s:874-887`; this observation starts with the produced action
already in the actor. It does not claim a physical input or rendered interaction.
The executable tests control method before window type; the inspected source
lists those two guards in the opposite order. All guards are satisfied here.
This observation preserves that revision distinction and does not establish
source/executable equivalence for rejected inputs.

## Fixed prerequisites and observed result

All cases set secondary dead word zero, inventory window 1, nonzero control
method and pending action 4. Player index is zero. Current and old cell references
start distinct; the caller loads current into its working reference, writes
current to old, consumes the action, and dispatches action 4. The current cell
itself is not read or changed by this inventory branch.

Selection is zero-based carried index 1. Equipment and the first three carried
entries are occupied, each with distinct full four-byte values; the remaining
27 carried IDs are empty with deliberately nonzero opaque tails. Temporary
storage and unrelated actor bytes start with distinguishable sentinels. Thus
selected storage is reachable within a contiguous occupied prefix and capacity
is thirty; these cases do not exercise a full inventory or an internal hole.
Selection and the stored total item count of four (three carried plus one
equipped, as counted by the source count routine) remain unchanged. Padding, all other carried
entries and every other unlisted byte remain unchanged.

`turn_right` at `5241-5273` takes the occupied exchange branch. It executes
three calls to the original full-entry copy at `6283-6284`: selected to temporary,
equipment to selected, temporary to equipment. All four bytes survive each copy,
including damage, count and the opaque fourth byte. Temporary storage retains
the original selected entry after return. No compaction, insertion, ID-only clear
or carried navigation occurs.

Actual `calc_weight`/`add_weight` at `5923-6003` executes once, including one
equipment contribution and all thirty carried contributions. The four occupied
IDs in this bounded fixture have ordinary categories, so their original table
weights contribute without count multiplication. Empty IDs contribute nothing
despite their opaque tails. The fixed wings word is not the weight override.
The calculated total equals the independent sum of those four OCS table weights;
its division by 140 is representable. The original signed word comparison with
physique chooses the feedback path. Grenade-use state is cleared for the
resulting ordinary equipped category. Category multiplication, equipped grenade,
wings override and division overflow remain source deductions, not observations
from these three cases.

The exact ordered non-stack writes, expressed without private original values,
are:

1. Old cell reference receives current; pending control action receives zero.
2. Temporary receives the complete selected entry.
3. Selected receives the complete equipment entry.
4. Equipment receives the complete temporary entry.
5. Grenade-use word receives zero; actor weight receives the calculated total.
6. Feedback follows the case below.
7. The action branch writes redraw true, then returns naturally to the caller's
   diagnostic-supplied return sentinel with its stack balanced.

| Initial feedback and physique | Observed feedback writes before final action redraw |
| --- | --- |
| Not heavy; physique below calculated quotient | Heavy count becomes 50, redraw true, too-heavy byte true, in that order. |
| Already heavy; same lower physique | Heavy count becomes 50; existing too-heavy/redraw state is not rewritten by weight calculation. |
| Already heavy; physique above calculated quotient | Redraw true, too-heavy byte zero, in that order; heavy count is retained. |

The second case still receives the action branch's final redraw. Exact values,
program counters, registers, reads, full ordered writes (including stack), input
bytes and final bytes remain in the ignored private report. The original return
instruction executes; no intercepted weight, helper or death path substitutes
for execution.

## Audit and implementation boundary

Every data read is checked against explicitly initialized actor, item-table,
physique, redraw or stack ranges. Instruction execution is restricted to decoded
caller/dispatch, occupied exchange, copy and weight ranges. Stack use is bounded
to a 256-byte initialized region; maximum observed depth is 36 bytes. The cases
execute 410, 407 and 408 instructions respectively within a 1,500-instruction
limit. Every write checks its prior value during ordered replay over the complete
8 MiB memory image. Replay equals final memory byte for byte, and original code
and item-table bytes remain unchanged. Each copy return and the weight return
to the action branch are checked against
their actual next caller instructions. The final executed instruction is the
action branch RTS. Natural return and final stack position
are asserted for all three cases.

No application API, tests, browser behavior or live installation changed. The
smallest next implementable transition is this occupied selected/equipment
exchange with its actual caller bookkeeping, full-entry temporary copies and
weight/feedback/redraw writes. It requires an explicit initialized actor and
selection, occupied endpoints, thirty carried entries, temporary storage,
verified revision-matched item data, player/physique and feedback state, and
caller eligibility/current-old references. Any broader API must either retain
these prerequisites or separately establish its additional branches. A future
implementation still needs synthetic tests and independent review; no successor
work is started here. Full-level, rendering and physical-controller gaps remain.

Private reproduction and hashes are retained under this lane's ignored
`.local/backpack-action4/`, including `observe.py`, `cpu-results.json`,
`run-output.txt`, `handoff.txt` and `status-fragment.md`. The report includes
script/loader/runtime/source identities. One gpt-6.1-sol medium worker, no
recursive delegation. Initial decoding setup had one filename/import correction;
original CPU execution passed on its first attempt. Explicit register
initialization was then strengthened and the three cases passed again. No
behavior repair attempts; token usage unavailable. Coordinator owns baseline,
browser checks, independent high binary review, commit and PR gates.
