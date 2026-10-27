# Bounded empty-equipment action-three inventory stop

27 October 2026. On accepted base
`842be92800cae8acf1a8a2380065ea4130c742c0`, two initialized original CPU
executions establish the empty-equipment outcome of stored action three in the
inventory window. Selection zero and selection one both return naturally without
moving or copying an item. The eligible caller copies current reference to old
and consumes the action, in that order. All other initialized storage remains
unchanged. This is evidence only; no implementation or live behavior is added.

## Dispatch and initialized caller

Pinned source and decoded executable instructions establish dispatch before any
fixture or CPU is constructed. The stored-action table in
`Controls&Movement.s:4591-4596` maps action three to the left-turn routine. The
eligible caller reads and consumes the stored action, scales its index by four
and jumps through that original table. The routine tests the window and reaches
its inventory branch. That branch tests the equipment ID byte; an empty ID
branches directly to its return. This establishes a stored action's meaning for
this caller, independently of numbering or symmetry with navigation or action
four. It establishes no keyboard key, physical button or input producer.

The two authored initialized callers use player zero, secondary dead word zero,
inventory window one, control method one, pending action three, wings zero and
distinct current and old references. Stored count is two. Every complete carried
entry is explicit: IDs 1 and 2 followed by 28 empty IDs, with distinguishable
opaque tails. Equipment has empty ID and retained nonzero tails. Temporary,
three separate padding entries, incoming redraw, grenade-use, weight,
too-heavy and heavy-count are explicit. The weight is an opaque sentinel, not a
calculated weight claim. Selection is respectively zero or one.

Source declarations independently establish field widths, thirty packed
four-byte carried entries and the separate three-entry padding extent. All
storage is initialized before execution. This retains the bounded non-full
storage profile of the [upward-navigation contract](backpack-up-navigation-contract.md)
and [downward-navigation contract](backpack-down-navigation-contract.md).
These authored callers do not establish canonical actors, a live save or live
world authority.

Execution begins at the original outer routine's register save, player-zero
actor/statistics setup and actual per-player call. The inventory stop executes
its original return and pops the actual decoded continuation. Observation ends
immediately before the next player's setup. The per-player action completes
naturally. The outer four-player routine is only an observed prefix: its saved
register remains on the stack for later unexecuted restoration. Other players,
path laying and the outer final return are not claimed.

## Outcome, ordering and retained storage

| Initialized selection | Natural outcome | Ordered non-stack writes |
| --- | --- | --- |
| Zero | Selection zero and incoming redraw retained | Old reference receives current; action becomes zero |
| One | Selection one and incoming redraw retained | Old reference receives current; action becomes zero |

The equipment ID test precedes any selection read or insertion helper call.
Neither case reads the selection, count, carried entries, equipment tails,
temporary or padding. The empty-equipment branch therefore stops before
insertion, equipment removal, weight calculation or redraw. The source return
label also serves other paths; reaching it here does not mean a full inventory
was detected. Full inventories and occupied equipment were not executed.

Both cases preserve every complete carried entry and tail, the complete
equipment and temporary entries, all three padding entries, selection, count,
current reference, wings, grenade-use, opaque weight, feedback and redraw. No
item copy, ID clear, compaction, count update, weight calculation or feedback
write occurs. The retained item table is never read; it supplies identity only,
not arithmetic authority. The occupied [action-four contract](backpack-action4-contract.md)
is a separate bounded path and supplies no action-three behavior by symmetry.

The caller loads current reference for bookkeeping, and this branch retains
that reference through its natural return. Actor and statistics references remain
those established by the outer setup. No cell contents are read. These are
private bounded CPU diagnostics, not a guarantee of all-register restoration or
a logical pointer contract.

## Original CPU and whole-memory checks

Each case executes 27 instructions, two non-stack writes, one actual call and
one actual return. Maximum stack depth is eight bytes: outer saved register and
actual call continuation. The per-player call balances, leaving the expected
four-byte outer save at this observation boundary. Decoded instructions, pushed
continuation, popped target and stack positions are checked explicitly.

The complete source-derived path, read stream, chronological prior/new writes
and complete final-memory model are frozen before CPU execution. Dispatch and
the complete model are also checked in a separate preflight before any fixture
construction. Each complete immutable input and predicted 8 MiB final image is
saved before constructing its CPU. Initial registers are explicit. Executed
instructions match unchanged decoded original bytes; original code is
read/execute protected. Reads and writes are bounded to initialized actor,
redraw and stack storage. Observation hooks only assert and record. No PC,
register, memory, branch, helper or return is forced after execution begins.

Actual path, reads and ordered prior/new writes match the source prediction
exactly. Separately, actual chronological writes replay over the complete before
image with prior-value checks. Both reconstructions equal the entire final CPU
image byte for byte. A standalone raw replay check imports no source-model
image. All unknown bytes, original code and retained table bytes survive. A
fresh invocation in a new output directory reproduces both cases, predictions,
dispatch and report byte for byte. Existing output targets are refused.
Executable, accepted loader, extracted code, revision-matched table, GameFast
and four source identities are checked before and after. Original material,
listings, scripts, inputs, predictions and raw results remain private and
ignored, outside Git and CI.

## Smallest next implementation nomination

UNSTARTED: one disconnected pure action-three empty-equipment stop for exactly
this eligible player-zero/window-one/control-one caller, secondary dead zero,
wings zero, count two, IDs 1 and 2 followed by 28 empty IDs, empty equipment,
distinct references and selection zero or one. Require every complete explicit
entry, temporary, three padding entries, count, references, opaque weight,
feedback and redraw. Validate the bounded input atomically, expose detached
retained storage, emit ordered prior/new caller bookkeeping and action
consumption, then one inert logical action return. No helper or item arithmetic
is needed for this observed path. The nomination remains unstarted.

Other callers, players, counts, selections, ID arrangements, occupied equipment,
insertion, full inventories, equipment transfer, weight, item use, padding
provenance and hardware input remain unsupported. No broad audit, successor
probe, API, source, test, contract, live input/world/save/schema/UI/renderer or
checkpoint change is made. Training43 remains incomplete; world/checkpoint three
and roster one remain unchanged. Physical-controller/TV and complete-level
acceptance are separate unresolved gates. Art waits for all designs.

One bounded evidence worker, requested gpt-6.1-sol medium; exact runtime model
and effort telemetry are unavailable. No delegation. Two successful CPU harness
invocations, the original pair and fresh repeat; no CPU behavior repair.
Pre-CPU diagnostics preserved an existing-directory refusal, a Python module
name collision corrected by renaming, and a generator substring failure
corrected in a new harness version. Token usage is unavailable. Coordinator
owns checks, independent exact-final review, commit, PR and integration gates.
