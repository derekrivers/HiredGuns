# Shooting item argument producer boundary

27 October 2026, accepted base
`f353e6781f23f283b2f9575e77bfc744b1b69414`. One bounded original CPU case
addresses the argument-provenance prerequisite identified by the accepted
[post-count division observation](backpack-postcount-division-observation.md).
This adds evidence only; runtime and shared arithmetic remain unchanged.

Original source, declarations and executable decoding agree before input
construction. The player-hit prefix first derives a target actor address from
an index. It then clears the complete damage register, loads the selected gun
row's damage byte, clears a second register, loads the animation-duration byte,
multiplies the unsigned words and shifts the long result twice. The prior
register's diagnostic upper word therefore does not survive this producer.
The resulting upper word depends on the original parameters and long shifts;
a zero upper word is not a universal consequence of loading bytes.

Exactly one row is selected from the pinned original runtime item table. The
retained original roster source already identifies its item number as a gun;
the table's category and source declarations corroborate that interpretation.
This establishes a parameter origin, without establishing that this gun is
equipped, usable or selected by any live actor. Original row identity, full bytes,
source lines, table/index mapping and hashes remain private.

The complete accepted initialized eight-mebibyte diagnostic image is reused
except for copying that entire pinned row into a separate declared item
allocation. Every copied byte and its prior value are recorded. All other
memory, including the complete actor allocation, unknown fields, inventory
entries, tails, padding and existing stack backing, is retained. The eighteen
initial registers are explicit and read back before execution. The entry's low
index word is declared externally for this diagnostic target; its high word
retains a nonzero diagnostic pattern. The selected row pointer and original
prefix entry are also explicit. This is a middle-routine fixture, without
normal-hit reachability or canonical actor authority.

Before CPU construction, private records persist the source/decode pins, input
identity, all initial registers, every expected instruction, non-status register
snapshot, data read, stack write with prior value, final register prediction and
complete predicted memory image. For this row the independently calculated long
amount fits in one word, so the predicted upper word is zero. That result comes
from the pinned bytes and original arithmetic, without injecting a damage
amount or clearing its upper word at a later boundary.

The actual original prefix executes eighteen instructions, two item-byte reads
and four long stack writes. It forms the actor/statistics arguments and saves
the complete damage register and three address registers. The saved damage
long and every saved pointer match the prediction. The stack is sixteen bytes
below entry at the stop, with the complete frame still present. There is no
call, return or stack pop in this observed prefix.

Execution stops immediately before the original fitness-call instruction.
Neither fitness nor inventory damage executes. The source and binary separately
show a full long-register restore after that call and then the inventory call.
This is only a conditional preservation plan: a natural return to that restore
with the saved frame intact would recover the saved damage long and pointers.
No actual fitness return, intact frame across fitness, inventory-call entry or
whole-caller continuation is demonstrated here. Execution never jumps across the
fitness call, and supplies no fabricated return or exception.

Original code is read/execute protected. Observation hooks check instruction
bytes, restrict reads to the two initialized row fields and restrict writes to
the predicted saved frame. No execution-time register/PC write, interception,
stub or flag repair occurs. All non-status instruction snapshots agree with the
prediction. Raw status values are retained; only the predicted unchanged extend
bit is asserted, without a broader condition-code parity claim. Full-image
comparison proves all bytes outside the saved frame unchanged from the declared
input. A separate model-free replay checks interleaved raw reads and prior-value
writes against that input and reproduces the complete CPU image. Two fresh
same-case runs produce byte-identical artifacts in exclusively new directories.

Two pre-CPU harness failures are preserved: the default text decoder rejected
an original source byte, then a source-line assertion pointed at the preceding
instruction. Explicit byte-preserving text decoding and directly inspected line
numbers corrected those checks. Neither attempt reached CPU construction or
changed any input. Both fresh executions of the corrected harness pass. Requested
implementation model is gpt-6.1-sol medium; actual model/effort telemetry and token
usage are unavailable. Original bytes, source, addresses, layouts, scripts,
traces and detailed results remain ignored and outside Git/CI.

This removes the arbitrary-diagnostic-amount prerequisite for this one parameter
row at the pre-fitness boundary. It grants no ordinary inventory division input,
normal shooting reachability, item distribution, damage eligibility, shared
arithmetic implementation or live inventory. Main's explosion caller and all
fitness/environment damage, death, control and occupancy semantics remain
separate.

Exactly one UNSTARTED next nomination: resolve the actual fitness-call and
natural caller-continuation dependency under its separate ownership, including
saved-frame preservation through the real restore and inventory-call entry,
before using this source-produced argument for an ordinary inventory division.
No successor work starts in this batch.

Training43 remains incomplete; world/checkpoint three and roster one are
unchanged. Full falling/death/control/occupancy, pads/corpses, wet traversal and
source-bound atomic paused recovery gate live hazards. Locations revision
mismatch blocks campaign. Physical controllers, TV and complete-level acceptance
remain separate. Art preparation/integration waits for all designs. Coordinator
alone integrates after exact-final independent HIGH review, current successful
CI, completed automatic review and resolution of findings.
