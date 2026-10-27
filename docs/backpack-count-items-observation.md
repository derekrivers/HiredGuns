# Bounded original item-count observation

27 October 2026, accepted base
`d11ea466053105c33309996969a5bda0f0b5ea38`. One original CPU case observes
`count_items` on the unchanged complete input of the accepted
[selection-one insertion observation](backpack-action3-selection1-observation.md).
The routine writes stored count three from incoming count two, then returns
naturally through a real original caller BSR. This adds evidence only; the
[pure insertion contract](backpack-action3-insertion-contract.md) and its
preservation of diagnostic count two remain unchanged.

## Responsibility established before input selection

Original source and decoded executable instructions establish the predicate
before the input is selected: initialize a word accumulator to zero, count
equipment once when its ID byte is nonzero, then inspect all thirty carried
slots and count each nonzero ID once. Write the accumulator to the stored-count
word. The scan neither stops at an empty ID nor uses incoming stored count.
Item categories, quantity bytes and opaque entry tails are not read. Category
and quantity rules in weight arithmetic provide no counting authority.

Source inspection finds the `damage_inventory` call: its actor-reference setup
immediately precedes a BSR to `count_items`, followed by a stored-count test and
division in the surrounding caller. The bounded execution begins at that
original actor-reference setup and ends at the BSR's actual continuation, before
the caller's count test. Earlier cheat-mode testing and caller register saving,
later damage distribution, weight calculation and whole-caller return are not
executed. This explicit entry into the middle of the caller does not establish
normal gameplay reachability or eligibility of the complete damage path.

## Immutable diagnostic input and explicit entry

The entire accepted initialized 8 MiB selection-one **before** image is reused
byte for byte. No memory byte or item population is changed, and no new fixture
matrix or control case is introduced. It contains two occupied carried IDs,
occupied ordinary equipment, incoming stored count two, selection one and the
complete retained actor, code, table and initialized stack storage. These are
authored diagnostic values with external provenance, not canonical initialized
actors or live inventory authority. Unknown fields and their external origins
remain unknown; emulator backing does not make them source-known.

All eighteen initial register values are explicit and read back before execution.
Relative to the accepted observation, only entry PC and the actor reference
required in the caller's working address register change. The original setup
copies that reference into the callee's actor register. Stack position and all
stack bytes retain the accepted input. The real BSR creates its own return
frame; no external return frame, synthetic helper or forced return is used.

The executable, extracted code, loader, item table, original source declarations,
complete accepted input and exact accepted HIGH review are hash-verified. Private
records retain their paths and identities. Original source, listings, addresses,
images, traces, scripts and results remain local and ignored, outside Git and CI.

## Actual effects and complete preservation

The original call pushes its natural continuation. The callee saves its three
working data registers and one address register, scans occupied equipment and
all thirty carried IDs, writes count three, restores its saved registers and
executes RTS. Incoming count two is overwritten directly with the calculated
word; no intermediate count clear is stored. Exactly one non-stack write occurs.

Equipment and carried entries remain in their original categories and locations;
all complete entries, quantity bytes and tails are unchanged. Temporary storage,
all three padding entries, selection, previous position, no-room count, weight,
grenade-use, heavy-count, too-heavy, redraw and all other actor bytes are unchanged.
The retained original table and code are unchanged. The callee restores its saved
registers; the caller's preceding actor-reference setup remains visible. This
bounded register observation is not a general caller restoration contract.

The call executes 134 instructions, 36 data reads and six chronological writes:
five stack writes and the count-word write. One actual BSR and one natural RTS
balance with maximum stack depth twenty bytes and the original entry stack
position restored. The surrounding damage caller remains an unexecuted prefix
and continuation boundary, not a completed caller or live damage observation.

## Source prediction, original CPU and raw replay

Before CPU construction, the complete input, all initial registers, source-expected
instruction path, reads, chronological prior/new writes, interleaved events and
full predicted final image are persisted. Original code is read/execute protected.
Hooks only observe and assert decoded instruction bytes, initialized access
ranges, stack bounds and the actual call continuation popped by RTS. They do not
write memory or registers, alter PC, intercept helpers or force branches/returns.

The original CPU path and every read/write/event equal the source prediction.
The full final 8 MiB equals the source image. A separate raw chronological replay
uses only the immutable input and CPU writes, checks every recorded prior value
and produces the identical full final image without importing the model image.
Explicit actor-storage comparison permits only the count word to differ; stack
effects are separately included in complete-memory equality. A fresh invocation
of the same single case reproduces every output file byte for byte. New output
directories and exclusive new-file creation preserve all previous results.

The first harness preparation stopped before input loading or CPU construction
because an exact whitespace assertion did not match the original declaration's
two tabs. The original script and empty failed output are preserved. Source bytes
justify a token-based declaration assertion; two fresh executions then pass with
the identical accepted input and no behavior repair. Requested implementation
model is gpt-6.1-sol medium; actual runtime telemetry and token usage are unavailable.
No delegation or successor implementation is performed by this worker.

UNSTARTED next nomination: one disconnected pure count transition restricted to
this exact diagnostic storage, with explicit equipment and thirty carried ID
reads, a single count-word write and complete preservation of remaining storage.
It must remain separate from insertion; this observation grants no insertion
count repair, general inventory API, category widening or live installation.

Training43 remains incomplete. Full fall/death/control/occupancy, pads/corpses,
wet traversal and source-bound atomic paused recovery still gate live hazards.
World/checkpoint three and roster one are unchanged. Locations revision mismatch
blocks campaign; physical-controller/TV and full-level acceptance remain separate.
Art preparation and integration wait for all designs. No runtime, shared source
authority, world, save, schema, UI, renderer, engine, campaign, audio or art changes
are made. Coordinator alone integrates after exact-final independent HIGH review,
current successful CI, completed automatic review and resolution of all findings.
