# Bounded ACTION3 full-capacity refusal

27 October 2026. On accepted base
`1a9349aa8f530b9e0e99137ae4445174feb348b4`, one initialized original CPU
case establishes the occupied-equipment ACTION3 refusal with thirty occupied
carried slots and selection zero. Insertion records the selection as previous
position, sets the no-room counter to 150 and returns failure. The caller then
returns naturally, preserving all inventory entries and weight feedback.
This adds evidence only; no API or live behavior changes.

The adjacent [successful insertion observation](backpack-action3-insertion-observation.md)
and [pure insertion contract](backpack-action3-insertion-contract.md) remain
restricted to their accepted non-full profile. This refusal is established from
source and decoded original instructions before constructing the fixture.

## Predicate and explicit caller

Stored action three dispatches to `turn_left`. For window one and occupied
equipment it calls `insert_item`. That routine copies selection to previous
position before testing the **ID byte of the final carried slot**. A nonzero ID
selects the full branch: return value becomes negative and the no-room counter
becomes 150. The caller tests that word and takes its negative-result branch to
return. Stored count is not the capacity predicate. No extra control case was
needed to establish this source-directed path.

The unchanged pinned OCS executable, accepted loader, extracted code, recovered
GameFast table slice and original source files are hash-verified before and after
execution. The complete item table agrees with that slice. Source declarations
bind the thirty four-byte carried entries, equipment, temporary entry, three
separate padding entries, selection, stored count, previous position and no-room
counter. Actual revision item IDs, ordinary categories, item stride and entry
width are checked before fixture construction. Editor or CD32 tables supply no
authority. Exact original identities and listings remain private.

The authored eligible caller is player zero, secondary dead word zero, window
one, control method one, pending action three and wings zero, with distinct
current and old references. Selection is zero. All thirty complete carried
entries have occupied IDs and distinct explicit opaque tails; equipment is a
complete ordinary item. Temporary storage, all three padding entries, previous
position, no-room counter, incoming weight, grenade-use, heavy-count, too-heavy,
redraw and player-zero physique are explicit. Other actor bytes and initialized
stack storage are retained, including unknown fields.

Stored count is explicitly thirty although there are thirty-one occupied IDs
including equipment. This is an authored diagnostic, not a canonical population
claim. The path neither calls the counting routine nor validates or repairs the
count. The table identity and authored caller do not establish canonical live
actor, initialization, save or hardware authority. Physique and the complete
retained table are explicit inputs but are not read on this refusal path.

## Exact effects and return boundary

The ordered non-stack writes are:

1. Copy current reference to old reference.
2. Consume the stored action by clearing its byte.
3. Copy selection zero to the previous-position word.
4. Write 150 to the no-room-counter word.

The actual insertion call returns its negative failure value; the caller tests
it and returns naturally. There is no full-entry copy, equipment clear, temporary
copy, compaction, `calc_weight` call or `add_weight` call. No redraw or other
feedback write occurs. The no-room counter write itself is the observed effect;
this probe does not execute a later display, countdown, sound or feedback consumer.

All thirty complete carried entries, equipment and every opaque tail remain
unchanged. Selection, count, temporary, three padding entries, current reference,
wings, physique, grenade-use, weight, heavy-count, too-heavy and redraw retain
their exact input bytes. No cell contents are read or written. Working references
change as specified by the insertion instructions; no general pointer or register
restoration contract is inferred from the successful path.

## Original execution and verification

Execution begins at the original outer save, player-zero actor/statistics setup
and actual per-player BSR. Every initial data/address register, SR and entry PC
is explicit and read back before execution. The complete immutable 8 MiB input,
source-predicted path, reads, chronological prior/new writes and final image are
persisted before CPU construction. Original code remains read/execute protected.
Hooks observe and assert; no PC, register, memory, branch, helper or return is
forced during execution.

The case executes 42 instructions, 13 data reads and seven chronological writes,
four outside the stack. Two actual calls and their two natural returns balance;
maximum stack depth is twelve bytes. Each decoded instruction's bytes, nested
call continuation, return stack position and popped target are checked. All data
accesses stay within explicitly initialized storage. Observation ends at the
actual per-player continuation before the next player's setup, retaining the
four-byte outer save. The per-player transition completes; the outer four-player
routine remains an observed prefix.

Source and CPU paths, reads, writes and interleaved read/write events agree
exactly. The complete final image equals the source model. A standalone verifier
replays chronological raw CPU writes over the before image with prior-value
checks and obtains the complete final image without opening a model image.
Full retained-storage comparison also passes. Unknown bytes, original code and
the retained table are unchanged wherever no write occurs. Fresh invocations of
the same single case produce every output file byte for byte in new directories;
existing output targets reject. Original bytes, addresses, coordinates, maps,
actor items, scripts, fixtures, listings, traces and results remain private and
ignored, outside Git and CI.

One requested gpt-6.1-sol medium worker; actual runtime model/effort telemetry and
token usage are unavailable. No delegation or extra case. The first execution
passed; subsequent harness versions added chronological-event, nested-stack and
initial-register-readback assertions and passed fresh repeats of the same input.
All earlier versions and outputs are retained. No failed behavior repair was
needed. Coordinator owns final checks, independent review, commit and integration.

UNSTARTED next nomination: one disconnected pure ACTION3 refusal transition
restricted to this same caller, selection zero, thirty occupied complete carried
entries, explicit ordinary equipment and diagnostic count. It must preserve all
storage and opaque feedback while recording caller bookkeeping, previous-position
and no-room-counter order. No successor is started here.

Training43 remains incomplete; world/checkpoint three and roster one are
unchanged. Full fall/death/control/occupancy, pads/corpses, wet traversal and
source-bound atomic paused recovery still gate activation. Locations revision
mismatch blocks campaign. Physical-controller/TV and complete-level acceptance
remain separate. Art preparation and integration wait for all designs. No world,
input, save, schema, UI, renderer, arithmetic, engine, campaign, audio, art,
source-authority, import or shared-status changes are made.
