# Removal selection after the first weight return

27 October 2026. On accepted base
`99810932af49edfa24d57de308d98c121b3e41ee`, the source and decoded original
instructions exclude the post-weight selection decrement for every non-full
contiguous occupied carried prefix. The three accepted
[empty-equipment cases](backpack-empty-equipment-observation.md) remain within
that domain. There is a precise conditional exception at the full-storage
boundary: thirty occupied entries, selection 29 and a nonzero first padding ID.
One fresh original CPU execution establishes that conditional exception through
natural return. It does not establish that gameplay initialization produces its
padding value. The existing disconnected API continues to reject it.

## Invariants and branch condition

The caller is the initialized eligible per-player manual action-4 caller at
`Controls&Movement.s:4562-4588`: player zero, secondary dead word zero, inventory
window one, control method one, pending action four, distinct current and old
references. Equipment is empty and the selected carried entry is occupied.
The earlier input producer and outer player loop are outside this boundary.

Let N be the occupied prefix length, and s the zero-based selected index.
Carried storage has exactly thirty four-byte entries, followed by three separate
padding entries; equipment and temporary storage are separate
(`Equates.i:909-916,1112-1120`). Require 1 <= N <= 30 and 0 <= s < N,
all carried IDs below N occupied and all later carried IDs empty. Tails remain
explicit opaque bytes. Stored count equals N before transfer and remains N
because transfer moves an item into equipment. Padding is not extra inventory.
These are initialized diagnostic storage invariants, not proof of gameplay
production of every such state.

The exact source condition after the first `calc_weight` return is: the carried
ID addressed by the **current** selection is zero, and that selection is nonzero
(`Controls&Movement.s:6326-6335`). The original decoded instructions agree:
rebuild selected address, test its ID, bypass decrement if occupied, then test
selection and bypass decrement if zero. The decrement is a word subtraction.
Private instruction checks also verify the separate earlier subtraction and the
successor/end-store branch order. No instruction bytes or original addresses are
published here.

## Why non-full prefixes cannot reach it

For N < 30 there are exactly two possibilities in
`Controls&Movement.s:6295-6324`:

| Initial selection | Before first weight call | After its return |
| --- | --- | --- |
| s = N - 1 | Immediate successor ID is empty. Clear selected ID; if s is nonzero, decrement selection immediately. | For N > 1 the current selection is N - 2 and occupied. For N = 1 it is zero. Both bypass the later decrement. |
| s < N - 1 | Copy occupied successors forward in order; clear only the final vacated ID. Selection stays s. | The selected ID is the original successor ID and remains occupied, so the later decrement is bypassed. |

The copy/clear rule preserves all other three entry bytes and never swaps with
the final item. `calc_weight` and nested `add_weight` at `5923-6003` do not write
carried entries or selection. They scan equipment plus thirty carried entries,
write weight/grenade-use/feedback, preserve their saved working registers and
return normally. With valid initialized item/statistic storage and successful
natural weight return, they cannot change the condition above. This deduction
does not depend on a particular ordinary item ID or feedback branch.

A finite source-level structural interpreter checks all 435 non-full (N,s)
pairs twice, with zero and nonzero first padding ID: 870 checks, no post-weight
decrement. Padding is never needed to decide the non-full immediate-successor
case. A further thirty full-prefix checks with zero first padding ID also bypass
the later decrement. These are finite deductions from the source control flow,
not additional CPU cases or general weight-behavior tests.

## Exact full-storage exception

With N = 30, s = 29 and a nonzero first padding ID, the immediate-successor test
reads that padding ID before testing the end-store pointer. It therefore enters
the compaction arm. The end-store comparison then stops copying and clears only
the selected ID. No successor is copied, and the earlier selection decrement is
skipped. The first weight return leaves selection 29 addressing an empty ID, so
the later decrement executes and changes selection to 28. For s < 29, compaction
leaves the selection occupied even with this padding value. Thirty structural
sensitivity checks isolate s = 29 as the sole full/nonzero-padding exception.

A new ignored diagnostic, derived from the existing pinned observer, executed
exactly that conditional case from the actual eligible caller. All thirty IDs
are ordinary verified runtime-table items, using the previously observed four
ordinary IDs repeatedly with distinguishable entry tails. Equipment starts empty;
temporary storage, all padding and unrelated actor bytes are explicit sentinels.
The first padding ID is nonzero. Wings is zero; incoming feedback is already
heavy; physique is one below the positive representable weight quotient, below
the signed-word boundary. No category multiplier, grenade equipment, division
overflow or wings override is involved.

Observed order is caller bookkeeping, complete selected-entry equipment copy,
selected-ID-only clear, first weight/feedback pass, post-weight selection
subtraction, second weight/feedback pass, final action redraw and natural return.
Both passes clear grenade-use, write the same independently summed weight and
write heavy-count 50. The already-heavy flag needs no feedback redraw. Selection
changes only once, after the first weight RTS and before the second weight entry.
Equipment retains all four selected bytes. Other carried entries, temporary,
padding and total count remain unchanged. No PC, live register or memory state
is forced during execution; only initial diagnostic inputs are supplied.

The execution uses 1,456 instructions, twelve non-stack writes, two weight calls,
62 nested add-weight calls and 67 actual returns. Maximum stack depth is forty
bytes within initialized bounded stack storage. Every data read stays within
initialized actor, verified table, physique, redraw or stack storage. Every
instruction stays within the decoded permitted ranges. Actual decoded BSR
continuations, pushed stack values and dynamic RTS targets are checked, including
balanced final return. Ordered prior/new-value replay equals the complete final
8 MiB memory image; original executable/table bytes remain unchanged and code is
read/execute protected. A fresh second run reproduces the full report byte for
byte. This is conditional CPU reachability, not a claim of normal game reachability.

## Evidence and decision boundary

The original source/executable/table/loader pins are unchanged from the linked
observation. The frozen observer and separate independent auditor were rerun
unchanged into fresh ignored output, reproducing complete report SHA-256 values
`d1a0dae8afc9030534d20d4f2c6e0260601b9f9a3e56051cd8d8fb86669bd95b`
and `8b0ac68905c8c899dd89ff40ee6e27b4a99a60597a0450d067f1693a21048ea7`.
Those three original CPU cases still do not execute the later decrement. The
fresh full-storage diagnostic has its own report and checks; the frozen auditor
is not claimed to have audited a new full-storage case.

Navigation source at `Controls&Movement.s:5021-5037` permits one-step movement
toward an occupied successor and stops at 29. This supports the selection bound;
it does not produce a nonzero padding ID. Narrow source inspection of player
initialization at `Main.s:5309-5323` finds equipment and thirty carried-entry
copies, not authority for the first padding ID. No complete startup/save/storage
provenance audit was performed. Thus it would be false either to declare the
branch unreachable for all initialized contiguous inputs, or to call this
padding-sensitive diagnostic a proven gameplay state. The existing API's three
non-full arrangements remain unchanged and the exception stays rejected.

The next useful bounded nomination is evidence-only eligible inventory downward
navigation with the already supported two-entry prefix: selection zero and a
nonempty successor should become selection one, consume the pending downward
action, copy current reference to old and request redraw, while retaining every
entry, count, weight and feedback field. It requires the initialized caller,
explicit two-entry prefix/rest-empty thirty-slot storage, selection zero,
references and redraw state, and a separately verified downward action dispatch.
The empty-successor stop and index-29 stop require their own bounded evidence.
No successor is started.

Only this new observation and the prior contract's final nomination paragraph
change. Runtime, imports, item/weight APIs, tests, shared status, world, UI,
renderer and saves remain untouched. Private source, bytes, coordinates, item
data, traces, scripts, exact inputs/results and reproduction handoff stay ignored
under `.local/backpack-post-weight/`, absent from Git and CI. One bounded worker,
no delegation; token usage unavailable. One structural-check source-line typo
and one dynamic-call audit setup error were corrected; no original behavior was
repaired. Coordinator owns checks, independent review, commit, PR and CI gates.
