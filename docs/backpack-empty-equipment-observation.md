# OCS action-4 transfer into empty equipment

27 October 2026. On accepted base
`9e38962234ee0768507204be1e9763d320a278da`, a private diagnostic executed the
original eligible per-player manual action-4 caller with occupied selected
carried storage and empty equipment through transfer, carried compaction,
selection handling, both weight calculations, feedback, redraw and natural
return. Three bounded cases passed. No application implementation or live
inventory installation follows from this observation.

The executable, loader and source identities are the pinned identities in the
[occupied observation](backpack-action4-observation.md). The executable SHA-256
is `46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`.
The complete OCS runtime item table SHA-256 is
`633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc`,
verified against its recovered GameFast slice. The diagnostic also checks the
frozen occupied observer and independent audit hashes without changing them.
Unicorn 2.1.4 executes the original M68000 instructions; Capstone 5.0.7 supplies
the bounded decoded instruction inventory. No helper, weight calculation or
return is intercepted or replaced.

## Caller and storage prerequisites

The entry remains `Controls&Movement.s:4562-4588`, with initialized registers,
player index zero, secondary dead word zero, inventory window 1, control method
1 and pending action 4. Current and old cell references begin distinct. The
caller writes current to old and consumes the action before dispatch. Earlier
mouse production, the outer four-player loop and physical input are outside this
execution boundary. Current cell contents are neither read nor changed.

`Equates.i:909-916,1112-1120` supplies thirty four-byte carried entries, separate
equipment and temporary entries, and three padding entries. Each case starts
with a contiguous small occupied prefix and a reachable zero-based selection.
The remaining carried IDs and equipment ID are empty, with deliberately nonzero
trailing bytes. Occupied entries have distinct full values. Temporary storage,
padding, unrelated actor storage and incoming feedback are initialized with
distinguishable values. Empty IDs do not imply zero trailing bytes.

The stored total item count begins equal to the occupied prefix length:
`count_items` at `Controls&Movement.s:6008-6031` counts equipment plus carried
entries. That routine is inspected source, not an executed prerequisite in these
cases. The action conserves that total, and execution neither calls the count
routine nor writes the count. Player zero's physique word, wings word zero,
grenade-use word, weight long, heavy-count word, too-heavy byte and global redraw
byte are explicit input. Only the physique word in the player-stat roster is
read by these executions; no other player's statistics are required or observed.

The occupied IDs use ordinary categories from the verified table, excluding
count-multiplied categories. Their independent weight sum has a positive,
representable unsigned quotient on division by 140, below the signed-word
boundary. Physique is chosen immediately below or above that quotient for the
case's feedback branch. No count multiplication, grenade equipment, wings
override or division overflow is exercised.

## Actual transfer and removal

`turn_right` at `Controls&Movement.s:5241-5273` copies all four selected bytes
directly into empty equipment, then calls `remove_item` at `6295-6337`. Temporary
storage is unused and unchanged. The cases distinguish these removal paths:

| Initial occupied prefix and selection | Observed carried writes and selection |
| --- | --- |
| Four entries, selection 1 | Two successors copy forward in order, each as a complete four-byte entry. Only the ID of the final vacated occupied entry clears. Selection remains 1. |
| Two entries, selection 1 | The immediate successor is empty. Only the selected entry's ID clears; selection decrements to zero before the first weight calculation. |
| One entry, selection 0 | The immediate successor is empty. Only the selected entry's ID clears; selection remains zero. |

The first case is ordered compaction, not a swap with the final occupied entry.
All ID-only clears retain the other three bytes from the storage being cleared.
Pre-existing empty entries, including their opaque tails, are unchanged.
Equipment retains the original selected entry in full; padding, temporary
storage and stored total count remain unchanged.

The removal routine calculates weight, then examines the selected carried ID for
its final scroll adjustment. The multi-successor case leaves that selection
occupied. The two direct-empty-successor cases have already handled selection
before weight. A distinct post-weight decrement branch exists in the inspected
source but is not taken by these cases; its behavior is not established here.

## Two weight passes and ordered feedback

Removal calls the actual `calc_weight` before returning. The action caller then
calls it again. Each pass visits equipment and all thirty carried slots through
the original `add_weight`: exactly two weight calls and 62 add-weight calls per
case. Both passes calculate the same independently checked total. Both write
grenade-use zero and the weight long, including the second pass's redundant
writes. The stored total item count is unrelated to the fixed thirty-slot scan.

The complete non-stack write order is caller bookkeeping, full-entry equipment
copy, ordered successor copies where applicable, ID-only clear, direct selection
decrement where applicable, the first weight/feedback sequence, the second
weight/feedback sequence, and final action redraw. Within each weight sequence,
grenade-use clears before the calculated weight writes, followed by feedback:

| Case and incoming feedback | First pass after weight write | Second pass after weight write |
| --- | --- | --- |
| Multi-successor compaction; becomes heavy | Heavy count 50, redraw true, too-heavy true, in order. | Heavy count 50 again; no feedback redraw or flag write. |
| Last selected; already heavy | Heavy count 50. | Heavy count 50 again. |
| Sole selected; clears heavy | Redraw true, then too-heavy zero; heavy count retained. | No feedback writes; heavy count retained. |

Every case then receives the separate final action redraw, including redundant
redraw. The copy helper, removal helper, both weight helpers and every nested
add-weight return execute normally. Each dynamic return target is checked
against its actual next instruction, including the final action RTS to the
diagnostic-supplied sentinel with its stack balanced.

## Audit and implementation boundary

Every data read is restricted to explicitly initialized actor, verified table,
player-zero physique, redraw or stack storage. Instruction execution is confined
to the decoded caller/dispatch, empty-equipment transfer, copy, removal and weight
ranges. Stack storage is initialized and bounded to 256 bytes. Maximum observed
depth is 40 bytes. The cases execute 798, 727 and 701 instructions respectively,
within a 2,500-instruction limit, and produce 15, 12 and 11 non-stack writes.
Every write retains its prior value and participates in ordered replay over the
complete initialized 8 MiB image. Replay equals final CPU memory byte for byte;
original code and table bytes remain unchanged. A fresh second run reproduces
the complete report byte for byte. Exact private inputs, bytes, addresses,
registers, reads, writes and traces remain ignored locally.

The smallest next implementable transition is this bounded eligible action-4
occupied-selected/empty-equipment transfer with the three observed prefix and
selection arrangements, complete four-byte preservation and ID-only clearing,
unchanged total count, ordered compaction, and both weight/feedback passes. It
requires explicit thirty-slot storage, reachable selection/contiguity, equipment,
temporary and padding storage, count, caller references/eligibility,
player/physique/feedback state and verified revision-matched item data. Existing
occupied-exchange implementation remains unchanged; adding this path needs its
own synthetic tests and independent review.

Other players, arbitrary selections or IDs, internal holes, full inventory,
empty source, insertion, store, drop, navigation, carried-to-carried reordering,
category multipliers, grenade equipment, wings override, overflow and rejected
callers remain outside this evidence. No source/runtime/import/item/weight API,
UI, renderer, world, save or checkpoint changes are made. Training43 remains
incomplete; world/checkpoint 3 and roster 1 are unchanged. Physical controllers,
TV and full-level acceptance remain separate gaps. Art waits for all designs.

Private reproduction, report hashes and handoff are retained under
`.local/backpack-empty-equipment/`. One bounded worker, no delegation, one batch;
token usage unavailable. A private decoding setup initially split an embedded
loader string and was corrected before execution. Original CPU execution passed
on its first attempt. A category projection offset was corrected against the
existing comparator before the final runs; no behavior repair was needed.
Coordinator owns repository checks, independent review, commit and PR gates.
No successor work is started.
