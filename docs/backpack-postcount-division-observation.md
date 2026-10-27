# Original post-count division boundary

27 October 2026, accepted base
`6179dcae6136c85feeb9a09ae4a086e614b5d587`. One original CPU case extends the
accepted [count observation](backpack-count-items-observation.md) on its identical
complete diagnostic input. This evidence changes no runtime or public API.
The [pure count contract](backpack-count-contract.md) remains separate.

Source and executable decoding precede input loading. Immediately after the
actual count BSR's natural RTS, the caller tests the stored count word, branches
to its later weight path only if zero, and otherwise divides the full unsigned
data register by that count word. The declared damage input is a word, but the
decoded DIVU uses a 32-bit dividend and a 16-bit divisor. Treating only the low
word as the dividend would describe a different execution.

The complete accepted initialized 8 MiB before image and all eighteen explicit
initial registers are reused without alteration. This includes the retained
diagnostic data-register value, whose upper word is nonzero. Its provenance is
external authored diagnostic input, not a demonstrated ordinary damage amount.
No earlier caller, eligibility test or register save establishes how normal
gameplay would supply that register. Unknown retained fields remain unknown;
initialized emulator backing supplies no canonical actor authority.

The original actor-reference setup, real BSR, count helper and natural RTS run
again on one CPU. At the actual continuation, every prior instruction snapshot,
read, write, interleaved event, call/return and the complete memory image equal
the accepted count execution. Execution continues with those same registers and
memory, without restarting at the boundary or supplying a synthetic return.

Count three makes the zero branch fall through. The following division reads
that same word again. The mathematical unsigned quotient exceeds the result's
16-bit width. The architecture specifies overflow with operands unaffected;
division by zero is the separate trap condition. X is unchanged, V is set, C
is cleared, and N/Z are undefined on overflow. These rules come from the
[M68000 programmer's reference, DIVU](https://www.nxp.com/docs/en/reference-manual/M68000PRM.pdf).

The actual CPU preserves the full dividend register, exposes the predicted
defined X/V/C bits through its raw status-register accessor and raises no
exception. No value is asserted for architecturally undefined N/Z. This is
bounded emulator evidence, without a broader condition-code or hardware claim.
No flag repair, exception suppression, helper interception, branch forcing or
execution-time register/PC write occurs.

The stop is immediately after DIVU, before the equipment-address setup and
before the first damage-item call. Neither item damage/distribution nor the
later weight calculation executes. No new stack effect occurs after count's
natural return. The complete extended path has 137 instructions, 38 data reads
and the same six writes as count alone: five actual stack writes and count two
becoming three. The continuation adds two count-word reads and no memory write.
The full final 8 MiB therefore remains identical to accepted count-after.

Before CPU construction, private records persist original source/decode pins,
the immutable input, all initial registers, expected path/read/prior/new-write
events, final defined register/flag predictions and the complete predicted image.
Original code is read/execute protected. Observation hooks assert original
instruction bytes, initialized access ranges, bounded stack use and the actual
LIFO BSR/RTS continuation. A separate model-free replay applies only raw CPU
writes to the immutable input, checking every prior value. Prediction, actual
CPU and replay agree across every byte. Complete actor storage permits only the
count word to differ; all entries, tails, padding, temporary storage, references,
selection and weight/feedback remain unchanged. Two fresh same-case runs produce
byte-identical artifacts in exclusively new output directories.

The first execution's metadata incorrectly described the raw status accessor as
not exposing overflow, despite its recorded status having V set. That run and
script are preserved. The corrected harness persists defined flag/register
predictions before CPU construction and asserts the accessor result; both fresh
runs pass without changing input or execution behavior. Requested implementation
model is gpt-6.1-sol medium; actual model/effort telemetry and token usage are
unavailable. Original bytes, source, addresses, layouts, scripts, traces and
results remain ignored and outside Git/CI.

This is a middle-caller diagnostic overflow observation. It grants no ordinary
non-overflow damage amount, earlier cheat eligibility, caller MOVEM, normal damage
reachability, whole-caller return, item damage, insertion count repair, shared
arithmetic implementation, canonical actor installation or live inventory.
Environment damage and actor/control/occupancy semantics are separate.

Exactly one UNSTARTED next nomination: establish the original immediate caller's
damage-register preparation through the real damage-inventory call boundary,
including the upper word's source provenance, before selecting any new division
input or attempting item distribution. That dependency must not be filled by
inventing an amount or zero-extending this accepted diagnostic register.

Training43 remains incomplete; world/checkpoint three and roster one are
unchanged. Full falling/death/control/occupancy, pads/corpses, wet traversal and
source-bound atomic paused recovery gate live hazards. Locations revision
mismatch blocks campaign. Physical controllers, TV and complete-level acceptance
remain separate. Art preparation/integration waits for all designs. Coordinator
alone integrates after exact-final independent HIGH review, current successful
CI, completed automatic review and resolution of findings.
