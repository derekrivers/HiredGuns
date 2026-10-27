# Bounded downward inventory selection

27 October 2026. On accepted base
`e85cc8059df963a9cf9bc978224cf6b496cc930d`, two initialized original CPU
executions establish one downward inventory transition and its adjacent
empty-successor stop. With the already supported two-entry contiguous carried
prefix, selection zero becomes one. The caller copies current reference to old,
consumes pending action two, writes selection one and requests redraw, in that
order. Inventory contents, count, equipment, temporary storage, padding, weight
and feedback remain unchanged. This is evidence only; no implementation or live
backpack behavior is added.

## Dispatch and initialized boundary

Separate checks of pinned source and decoded executable instructions establish
dispatch before constructing either CPU fixture. The action table in
`Controls&Movement.s:4591-4596` maps action two to `backward`. The caller at
`4562-4588` zero-extends the stored action byte, consumes it, scales its table
index by four and jumps through the original table. `backward` first tests the
window; inventory window one branches to `5021-5036`. That branch is downward
inventory selection, despite the routine's world-movement name. No action or
register is injected after execution begins. These checks establish the stored
action dispatch; they do not identify a keyboard key, controller button,
hardware event or earlier input producer.

Both fixtures explicitly initialize player zero, secondary dead word zero,
inventory window one, control method one, pending action two and distinct old
and current references. Thirty carried entries contain occupied IDs 1 and 2,
then empty IDs, with distinguishable opaque tails; stored count is two. Equipment
is empty with nonzero tails. Temporary storage, three separate padding entries,
weight, grenade-use, too-heavy, heavy-count and redraw are explicit retained
values. The weight value is a sentinel, not an assertion of calculated weight.
These are authored diagnostic inputs, not a canonical actor or a proven live
gameplay state. They preserve the non-full storage boundary of the accepted
[empty-equipment contract](backpack-empty-equipment-contract.md).

Execution begins with the original outer routine's register save, player-zero
actor/statistics address setup and BSR (`4531-4535`). Its actual BSR enters the
per-player caller before eligibility. The downward routine's original RTS pops
that real continuation. Observation ends immediately at the continuation before
the next player's setup (`4537`). Thus the per-player action completes naturally;
the outer four-player routine is only an observed prefix. Its saved register
remains on the stack for its later, unexecuted restoration. No other player,
path-laying call or outer final return is claimed.

## Observed transition and stop

Source at `5024-5032` first tests the index-29 limit, then reads the immediate
successor's ID. With selection zero it reads occupied slot one and increments
selection as a word before writing redraw 255. With selection one in the same
two-entry prefix it reads empty slot two and returns without either write. The
second case delimits this transition; it does not expand the occupied prefix or
audit general navigation.

| Initialized selection | Original outcome | Ordered non-stack writes |
| --- | --- | --- |
| Zero | Selection one, redraw 255 | Old reference = current reference; action = zero; selection = one; redraw = 255 |
| One | Selection one, incoming redraw retained | Old reference = current reference; action = zero |

The no-move case still consumes the action and performs caller bookkeeping. Both
retain every four-byte carried entry, equipment, temporary and padding byte,
stored count, current reference, weight, grenade-use, too-heavy and heavy-count.
There is no copy, removal, weight calculation or feedback update. Neither
`calc_weight` nor `add_weight` executes, and the retained item table is never
read. Navigation therefore does not repair or validate the incoming weight.

The caller initially loads the current reference into A2 for bookkeeping; the
navigation routine subsequently repurposes A2 as the carried-storage base. A2
is not restored to the current cell at return. A0 remains the player-zero actor
and A3 the original outer setup's player-zero statistics reference. Current
reference storage remains unchanged, and cell contents are never read. A future
logical contract must not describe this as restoration of all caller registers.

## Original execution and memory audit

The moving case executes 35 instructions and four non-stack writes; the stop
executes 33 instructions and two. Each executes one actual BSR and one actual
RTS, with the decoded next instruction, pushed continuation, return target and
stack position checked. Maximum stack depth is eight bytes: the outer saved
register and real call continuation. The per-player return balances its call;
the remaining four-byte outer save is expected at this observation boundary.

Every instruction is checked against the unchanged decoded original bytes in
the bounded permitted ranges. Code is read/execute protected. Reads are limited
to explicitly initialized actor, redraw and bounded 256-byte stack storage.
All inputs and registers are fixed before execution; hooks observe and assert
only. No helper, return or branch is intercepted, and no PC, register or memory
state is forced during execution. The original executable, loader, source and
revision-matched item-table pins remain those of the retained evidence.

Each complete initialized 8 MiB before image is retained privately. A chronological
source model predicts all stack and non-stack writes independently of the
observed write values. Separately, every actual write replays with its prior
value checked in chronological order. Both reconstructed whole-memory images
equal final CPU memory byte for byte. Original code and table remain unchanged;
all unmodeled storage and unknown tails remain preserved. A fresh second run
reproduces both complete cases and the report byte for byte. Private inputs,
addresses, source excerpts, decoded bytes, traces and full memory images stay
ignored under `.local/backpack-down-navigation/` and outside Git/CI.

## Smallest next implementation nomination

UNSTARTED: one disconnected pure downward-navigation transition for this exact
eligible player-zero/window-one/control-one/action-two slice, IDs 1 and 2 as a
contiguous prefix with the remaining 28 IDs empty, count two, empty equipment,
and selection zero or the observed selection-one stop. Require complete explicit
storage for references, entries/tails, equipment, temporary, padding, count,
weight/feedback and redraw. Validate the bounded input atomically, expose
detached output and preserve all retained storage. Emit ordered prior/new writes
for caller bookkeeping and action consumption, followed only on movement by the
selection and redraw writes, then an inert logical action return. Do not invoke
weight or item arithmetic. Original pointer/register details remain private
diagnostics rather than invented logical return guarantees.

Index 29, other prefixes/IDs/selections, rejected callers, other players,
equipment arrangements, insertion/drop/reordering, hardware input, source-bound
live actor authority and general navigation remain outside these CPU cases.
The [post-weight padding-sensitive exception](backpack-post-weight-selection-observation.md)
is unrelated; no padding/startup provenance audit or full-inventory extension is
started. Runtime, contracts, tests, shared status, world, UI, renderer, save and
checkpoint behavior remain unchanged. Training43, physical-controller/TV and
complete-level acceptance remain separate unresolved gates; art waits for all
designs. One bounded worker, no delegation, one execution attempt and no repairs;
token usage unavailable. Coordinator owns full checks, independent exact-final
review, commit, PR, CI and integration gates. No successor is started.
