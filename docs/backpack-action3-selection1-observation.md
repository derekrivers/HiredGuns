# Bounded ACTION3 insertion at selection one

27 October 2026. On accepted base
`10db81029864b5270120f889f7b511e4007bf647`, one original CPU case establishes
occupied-equipment ACTION3 insertion at selection one. It retains the complete
authored input from the accepted [selection-zero observation](backpack-action3-insertion-observation.md)
except for the explicit selection word. This adds evidence only. The existing
[pure insertion contract](backpack-action3-insertion-contract.md) still accepts
selection zero only; no API, runtime or live behavior changes.

## Source and complete input

Original source and decoded executable instructions establish the path before
fixture construction. Stored action three dispatches to the inventory branch of
`turn_left`. Occupied equipment calls `insert_item`; success transfers the full
equipment entry, clears only its ID, calls actual `calc_weight`, writes redraw
and returns. Stored action numbering establishes no physical input binding.

Insertion derives its target from the carried-storage start plus selection
times the complete four-byte entry size. It copies selection to previous position
before testing the final carried ID for capacity. The reverse loop copies one
complete entry at a time and continues while its source address is greater than
the selected target. Selection one therefore stops at slot one. This range is
derived directly from the original source and decoded comparison, rather than
assumed from the adjacent selection-zero result or another inventory action.

The executable, accepted loader, extracted code, complete revision-matched OCS
runtime item table, recovered GameFast table slice and original source files are
hash-verified before and after execution. Source declarations bind thirty carried
entries, equipment, temporary storage, three separate padding entries, selection,
stored count, previous position, no-room counter and explicit feedback fields.
Original item categories and weights agree with the retained table slice before
fixture construction. Editor and CD32 tables provide no authority here.

The eligible authored caller remains player zero, secondary dead word zero,
window one, control method one, pending action three and wings zero. Current and
old references start distinct. Carried storage has the same two occupied entries
followed by 28 empty IDs, with all complete entries and distinguishable opaque
tails retained. Equipment is the same complete ordinary item. Temporary storage,
all three padding entries, previous position, no-room count, weight, grenade-use,
heavy-count, too-heavy, redraw and physique retain their exact baseline bytes.

The sole fixture change is selection zero becoming one: one byte differs in the
entire initialized 8 MiB image. Its source declaration and target arithmetic are
recorded before CPU construction. Every other byte, including unknown actor
fields, table, code and initialized stack storage, is identical to the accepted
selection-zero input. There is no population repair or sentinel normalization.
Stored count stays two despite three occupied IDs including equipment. This
diagnostic input establishes no canonical initialization, live actor or save
authority. The counting routine is neither called nor inferred.

## Ordered effects and preservation

The exact non-stack write order is:

1. Copy current reference to old; consume the pending action.
2. Copy selection one to the previous-position word.
3. Make 28 complete long copies backward, slot 28 to 29 through slot one to two.
4. Copy complete equipment into carried slot one; clear only equipment's ID.
5. Clear grenade-use and write the total from one real weight pass.
6. Write heavy-count 50, redraw true, then too-heavy true.
7. After weight returns, write redraw true again and return naturally.

Carried slot zero remains byte-identical. Every original slot one through 28
survives one slot later, including empty-entry tails; the old final empty entry
is overwritten. Equipment's other three bytes survive its ID-only clear. There
is no `copy_item` call, temporary copy, compaction or carried ID-only clear.
Selection remains one. Stored count, no-room counter, temporary, three padding
entries, current reference, wings and other untouched storage are preserved.
No cell contents are accessed.

The insertion target and working references end at slot one. The real weight
save/restore retains those working values; this is a bounded CPU diagnostic,
not a general register-restoration contract. Exactly one `calc_weight` and 31
nested `add_weight` calls execute, visiting empty equipment and all thirty carried
slots. The three ordinary items contribute once each, independently of their
opaque count bytes and the stored count. Their total and the original unsigned
division/signed-word physique comparison select the same becomes-heavy branch
as the baseline. The source-derived feedback and redundant action redraw order
are unchanged. Other categories, overflow, wings and feedback paths are excluded.

## Execution and complete-memory proof

The complete input, source-predicted path, exact reads, chronological prior/new
writes, interleaved events and final image are persisted before CPU construction.
Execution starts at the original outer save, player-zero actor/statistics setup
and actual per-player BSR. All eighteen initial register values, comprising the
data/address registers, SR and entry PC, are explicit and read back. Original code is read/execute protected.
Hooks only observe and assert unchanged instruction bytes, initialized accesses,
stack bounds and natural call continuations; they force no execution state.

The case executes 530 instructions, 160 data reads and 81 chronological writes,
39 outside the stack. All 34 actual calls and 34 natural returns balance with
maximum stack depth 44 bytes. Each nested continuation, actual return-stack
position and popped target is checked. The action reaches its actual per-player
continuation before the next player's setup, retaining the four-byte outer save.
Per-player completion is distinct from the outer four-player prefix.

CPU path, reads, writes and interleaved events exactly match the source prediction.
The complete final image matches the model. A separate verifier opens no model
image and replays raw chronological CPU writes over the entire input with every
prior value checked, obtaining the complete final image. Separate retained-storage
checks cover all thirty carried entries, equipment tails, selection/count,
temporary and padding. Unknown/unwritten bytes, code and full table survive.
Two fresh invocations of the same single case produce every output file byte
for byte. Existing output targets reject. No additional profile or control case
was needed. Original bytes, addresses, listings, fixtures, scripts, traces and
results stay private and ignored, outside Git and CI.

One requested gpt-6.1-sol medium worker; runtime model/effort telemetry and token
usage are unavailable. No delegation. One pre-CPU source-line assertion had an
incorrect line number; that attempt is preserved and corrected from the actual
source. Both original CPU executions then passed without behavior repair or
fixture changes. Independent HIGH review and exact-head automatic/CI gates are
separate acceptance requirements; a pending gate is never approval.

UNSTARTED next nomination: widen the disconnected pure ACTION3 insertion helper
to this exact selection-one profile, preserving the complete explicit storage,
slot-zero retention, 28 reverse copies, ID-only clear, diagnostic count and the
single weight/feedback/redraw sequence. Require complete original candidate,
ordered-record and retained full-image comparison. No successor is started.

Training43 remains incomplete. World/checkpoint three and roster one are
unchanged. Full fall/death/control/occupancy, pads/corpses, wet traversal and
source-bound atomic paused recovery remain activation prerequisites. Locations
revision mismatch blocks campaign. Physical controllers, TV and complete-level
acceptance remain separate. Art preparation/integration waits for all designs.
No world, input, save, schema, renderer, UI, audio, art, shared arithmetic,
source-authority, engine, campaign or shared-status changes are made.
