# Bounded occupied-equipment action-three insertion

27 October 2026. On accepted base
`7c8abf05f83c45b3c2c120fb341d251c69973563`, one initialized original CPU
case establishes occupied-equipment insertion at selection zero in the inventory
window. The complete equipment entry becomes the first carried entry; the
original insertion routine shifts every preceding carried entry toward the end,
including empty entries' opaque tails. Equipment receives an ID-only clear.
One actual weight pass and its feedback execute before natural per-player return.
This is evidence only; no API or live behavior is added.

The [empty-equipment action-three observation](backpack-action3-observation.md)
and [stop contract](backpack-action3-stop-contract.md) describe the adjacent stop,
which remains unchanged. This moving path is established directly from source
and decoded original instructions, independently of that stop or the occupied
[action-four exchange](backpack-action4-observation.md) and
[empty-equipment transfer](backpack-empty-equipment-observation.md).

## Source, caller and explicit inputs

Before fixture construction, pinned source and decoded executable instructions
establish stored action three's dispatch to `turn_left`, its window-one equipment
ID test, actual `insert_item` call, success test, complete-entry transfer, ID-only
clear, `calc_weight` call and redraw. The insertion and weight routines themselves
are decoded and modeled before CPU construction. Stored action numbering does
not establish a keyboard key, controller button or input producer.

The executable and revision-matched OCS runtime item table are the unchanged
pinned identities in the adjacent observations. Their actual files, accepted
loader, extracted code, recovered GameFast slice and four original sources are
hash-verified. The complete table agrees with that recovered slice. The equipped
item's actual ID and ordinary category are verified from this table before
constructing the fixture; neither editor nor CD32 item data supplies authority.
Exact identities and private source/decoded listings are retained locally.

The authored eligible caller uses player zero, secondary dead word zero, window
one, control method one, pending action three and wings zero. Current and old
references begin distinct. Selection is zero. The same accepted non-full carried
profile has two occupied entries followed by 28 empty IDs; all thirty complete
four-byte entries have explicit distinguishable tails. Equipment is a complete
ordinary-category item distinct from those carried entries. Temporary storage,
three separate padding entries, previous position, no-room count, incoming weight,
grenade-use, heavy-count, too-heavy and redraw are explicit. Previous position and
no-room count are independently derived source fields, rather than anonymous
padding. All other actor bytes and initialized stack storage are retained.

Stored count is explicitly two as requested for this diagnostic profile. With
occupied equipment this is not a claim that the count equals the complete item
population: three IDs are occupied before and after. The inspected count routine
is not called, and this path neither validates nor updates count. This authored
initialized caller does not establish canonical live actor or save authority.

The additional weight inputs are bound before execution: the complete verified
item table, player-zero physique word, wings and incoming feedback. All three
occupied IDs have ordinary categories, excluding count multiplication. Their
independent weight sum gives a positive representable unsigned quotient on
division by 140, below the signed-word boundary. Physique is explicitly authored
immediately below that quotient and too-heavy starts clear. No silent input
repair or sentinel canonicalization occurs. Other statistics are not read.

## Full storage movement and ordered effects

The exact ordered non-stack writes are:

1. Current reference copies to old; stored action becomes zero.
2. Insertion copies selection to the previous-position word.
3. Twenty-nine complete long copies run backward: carried slot 28 to 29, through
   slot zero to one, in that order. These are direct original `move.l`
   instructions; there is no separate `copy_item` call.
4. The complete equipment entry copies to carried slot zero. Only equipment's
   ID byte clears; its other three bytes remain.
5. Weight clears grenade-use, then writes the independently calculated total.
6. Heavy-count becomes 50, redraw becomes true, then too-heavy becomes true.
7. Weight returns; the action writes redraw true again, then returns naturally.

The insertion routine tests the final carried ID for available space. It does
not stop copying at the first empty ID: empty tails move with their complete
entries. Every original carried entry from zero through 28 survives one slot
later. The previous final empty entry, including its tails, is overwritten by the
previous penultimate entry. Equipment's complete original value survives in slot
zero, and its now-empty equipment storage retains its original tails. No temporary
copy, carried ID-only clear or compaction occurs.

Selection remains zero. Stored count, no-room count, temporary, all three padding
entries, current reference, wings and all other untouched storage remain exactly
unchanged. No cell contents are read or written. Insertion leaves its working
references at the first carried entry; the real weight save/restore retains those
values. These private CPU diagnostics make no general pointer or all-register
restoration contract.

Exactly one `calc_weight` and 31 nested `add_weight` calls execute: equipment and
all thirty carried slots. Equipment is already empty, so its contribution is
zero despite retained tails. The three ordinary carried items contribute once
each; empty IDs contribute nothing. This fixed-slot scan does not use stored
count. The original signed word physique comparison selects the observed
becomes-heavy feedback branch. Category multiplication, equipped grenade, wings
override, overflow and other feedback branches are not observed here.

## Original execution and complete-memory verification

Execution starts at the original outer save, player-zero actor/statistics setup
and actual per-player BSR. All data/address registers, SR and entry PC are
explicit before execution. The action and every nested helper execute unchanged
original instructions; the original code is read/execute protected. Every decoded
instruction, stack position, actual call continuation and natural RTS target is
checked. Hooks only observe and assert. No register, PC, memory, helper return or
branch is forced after execution begins.

The case executes 535 instructions, 161 data reads and 82 chronological writes,
of which 40 are outside the stack. Thirty-four actual calls and their 34 natural
returns balance. Maximum stack depth is 44 bytes. Observation ends at the actual
per-player continuation before the next player's setup, retaining the four-byte
outer register save. The per-player action completes naturally; the outer
four-player routine remains an observed prefix, not a completed outer return.

The complete immutable 8 MiB input, full source-predicted final image, exact path,
read stream and ordered prior/new writes are saved before CPU construction.
Every data access is covered by explicitly initialized actor, table, physique,
redraw or stack storage. The actual path, reads and writes equal those predictions.
The complete final image equals the source model. Separately, chronological raw
CPU writes replay with prior-value checks over the entire before image and equal
the complete final image without importing the model image. Unknown bytes,
original code and the complete retained table remain unchanged wherever source
performs no write. A fresh invocation reproduces every output file byte for byte;
new output targets are required. All original material, inputs, scripts, listings,
traces and results remain private and ignored, outside Git and CI.

One requested gpt-6.1-sol medium worker; exact runtime telemetry and token usage
are unavailable. No delegation. The first CPU execution matched the complete
predicted behavior but a copied final-register assertion incorrectly expected the
statistics reference. Source insertion explicitly changes that reference and
weight restores the insertion value. The original script and failed output are
preserved; only that assertion was corrected in a new harness version. Two fresh
runs of the same single unchanged fixture then passed. No behavior repair,
additional case or same-transition control was required. Coordinator owns final
checks, independent review, commit, PR and integration.

UNSTARTED next nomination: one disconnected pure insertion transition restricted
to this same eligible caller, selection zero, two-entry non-full carried profile,
explicit ordinary equipment, full storage and observed becomes-heavy arithmetic.
It must include previous-position/no-room storage, all backward full-entry copies,
ID-only equipment clear, retained count/selection and the single real weight/
feedback/redraw order before any installation is considered.

Other callers, selections, items, prefixes, capacity boundaries, padding
provenance, general inventory, input hardware and canonical initialization remain
unsupported. No API, test, runtime, source authority, import, shared status,
world, save, schema, UI, renderer or checkpoint changes are made. Training43
remains incomplete; world/checkpoint three and roster one are unchanged. Full
fall/death/control/occupancy, pads/corpses, wet traversal and source-bound atomic
paused recovery still gate activation. Locations revision mismatch blocks
campaign; physical-controller/TV and complete-level acceptance remain separate.
Art preparation and integration wait for all designs. No successor is started.
