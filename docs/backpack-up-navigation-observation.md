# Bounded upward inventory selection

27 October 2026. On accepted base
`1e7c04aa47f17f59addec0fc85c97fc31e82c810`, two initialized original CPU
executions establish one upward inventory transition and its adjacent zero
selection stop. With the previously supported two-entry contiguous carried
prefix, selection one becomes zero. The eligible caller copies current reference
to old, consumes pending action one, writes selection zero and requests redraw,
in that order. The zero-selection case performs only the two caller writes.
This is evidence only; no implementation or live backpack behavior is added.

## Dispatch and initialized boundary

Independent checks of pinned source and decoded executable instructions establish
stored-action dispatch before either fixture is constructed. The action table in
`Controls&Movement.s:4591-4594` maps action one to `forward`. The caller at
`4562-4588` zero-extends the stored action byte, consumes it, scales its table
index by four and jumps through the original table. Source at `4901-4902`
branches on a non-view window to the window check at `4948-4949`; inventory
window one reaches upward selection at `4950-4954`. This establishes the stored
action's meaning in this window. It does not establish a keyboard key,
controller button, hardware event or earlier input producer.

Both authored diagnostic inputs explicitly initialize player zero, secondary
dead word zero, inventory window one, control method one, pending action one,
wings zero and distinct current and old references. All thirty carried entries
are explicit: IDs 1 and 2, followed by 28 empty IDs, each with distinguishable
opaque tails. Stored count is two. Empty equipment retains nonzero tails.
Temporary storage, three separate padding entries, weight, grenade-use,
too-heavy, heavy-count and incoming redraw are also explicit. The weight is an
opaque sentinel, not an assertion of calculated weight. Source declarations in
`Equates.i:909-916,984-1120` independently establish the retained field widths,
packed four-byte entry layout and separate padding extent. These inputs retain
the non-full storage boundary of the accepted
[downward-navigation contract](backpack-down-navigation-contract.md) and
[empty-equipment contract](backpack-empty-equipment-contract.md); they do not
establish canonical actors or live gameplay authority.

Execution starts at the original outer routine's register save, player-zero
actor/statistics setup and BSR (`4531-4535`). That actual BSR enters the
per-player caller before eligibility. The upward routine's original RTS pops the
actual decoded continuation. Observation ends there, immediately before the next
player's setup (`4537`). The per-player action completes naturally; the outer
four-player routine is only an observed prefix. Its saved register remains on
the stack for later unexecuted restoration. No other player, path-laying call or
outer final return is claimed.

## Observed transition and stop

Source at `4950-4954` tests the selection word. A nonzero selection decrements
as a word before redraw is written as byte 255. Selection zero branches directly
to RTS. Unlike downward navigation, this upward branch does not inspect an
adjacent carried ID or compute a carried-storage address. The two-entry prefix
bounds these cases; the absence of an ID read does not establish wider supported
inputs.

| Initialized selection | Original outcome | Ordered non-stack writes |
| --- | --- | --- |
| One | Selection zero, redraw 255 | Old reference = current reference; action = zero; selection = zero; redraw = 255 |
| Zero | Selection zero, incoming redraw retained | Old reference = current reference; action = zero |

Both executions retain every complete carried entry and tail, equipment,
temporary storage, all three padding entries, count, current reference, wings,
opaque weight, grenade-use, too-heavy and heavy-count. The stop still consumes
the action and performs caller bookkeeping. There is no item copy, removal,
weight calculation or feedback update. The retained item table is never read;
neither weight helper executes. Navigation does not repair or validate incoming
weight.

The caller loads current reference into A2 for bookkeeping. This upward branch
leaves A2 holding that reference through its natural return; this differs from
the observed downward branch, which repurposes A2 as carried-storage base. A0
remains the player-zero actor and A3 the statistics reference established by the
outer setup. No cell contents are read. These are bounded private CPU diagnostics,
not a guarantee of restoration of all caller registers or a logical API pointer
contract.

## Original execution and memory audit

The moving case executes 29 instructions and four non-stack writes; the stop
executes 27 instructions and two. Each executes one actual BSR and one actual
RTS. The decoded next instruction, pushed continuation, popped return target and
stack positions are checked. Maximum stack depth is eight bytes: the outer
saved register and actual call continuation. The per-player call balances; the
remaining four-byte outer save is expected at this observation boundary.

Every executed instruction is checked against unchanged decoded original bytes
within bounded permitted ranges. Original code is read/execute protected. Reads
and writes are restricted to explicitly initialized actor/redraw storage and a
bounded stack region. Complete 8 MiB before images and all initial registers are
fixed before execution. Hooks observe and assert only: no PC, register or memory
state is forced after execution begins, and no helper, return or branch is
intercepted. The original executable, unchanged accepted loader, extracted code,
revision-matched item table, GameFast and four source identities are pinned before
and after the work. The table is retained evidence material, not arithmetic or
logical table authority.

Before constructing each CPU, a chronological source model predicts every read,
all stack and non-stack prior/new writes, the complete path and full final image
from its immutable input. Prediction files are saved before execution. Actual
reads and writes match those predictions exactly. Separately, raw actual writes
replay with chronological prior-value checks over the complete before image.
Both reconstructed whole-memory images equal final CPU memory byte for byte.
A separate raw-replay tool also verifies the full images without importing a
source-model image. Every unknown byte, original code byte and retained table
byte is preserved. A fresh second run reproduces both cases, predictions,
dispatch evidence and report byte for byte, using new output directories that
refuse overwrite. Original material remains unchanged. Private source excerpts,
addresses, decoded bytes, scripts, traces, raw results and complete images stay
ignored under `.local/backpack-up-navigation/` and outside Git/CI.

## Smallest next implementation nomination

UNSTARTED: one disconnected pure upward-navigation transition for this exact
eligible player-zero/secondary-dead-zero/window-one/control-one/action-one slice,
wings zero, count two, IDs 1 and 2 followed by 28 empty IDs, empty equipment,
distinct references, and selection one or the observed selection-zero stop.
Require complete explicit references, all entries/tails, equipment, temporary,
three padding entries, count, opaque weight/feedback and redraw. Validate the
bounded input atomically and expose detached output while preserving all retained
storage. Emit ordered prior/new writes for caller bookkeeping and action
consumption, followed only on movement by selection decrement and redraw, then
one inert logical action return. Do not invoke weight or item arithmetic.
Original pointers/registers remain private diagnostics rather than invented
logical restoration guarantees. This nomination is not started.

Other selections, prefixes, IDs, counts, equipment arrangements, rejected
callers, other players, insertion/drop/reordering, full inventories, padding
provenance, hardware input, live actor authority and general navigation remain
outside these CPU cases. No weight arithmetic, table-authority, startup/padding
audit or full-inventory extension is started. Runtime, contracts, tests, shared
status, world, UI, renderer, save and checkpoint behavior remain unchanged.
Training43 remains incomplete; world/checkpoint three and roster one remain
unchanged. Physical-controller/TV and complete-level acceptance are separate
unresolved gates. Art waits for all designs.

One bounded evidence worker, gpt-6.1-sol medium, no delegation. Two harness
invocations: one failed source-name assertion before CPU construction, corrected using the pinned source,
then one successful execution; one fresh successful repeat. A supplementary
source-layout checker had one preflight declaration/line assertion failure,
corrected from inspected source, then passed. No CPU behavior repair was needed.
Token usage is unavailable. Coordinator owns product/browser checks,
independent exact-final review, commit, PR, CI and integration gates.
