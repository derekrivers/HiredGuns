# Bounded occupied ACTION3 insertion

`transitionBackpackAction3Insertion` is a disconnected pure transition for the
two selections established by the [selection-zero observation](backpack-action3-insertion-observation.md)
and [selection-one observation](backpack-action3-selection1-observation.md).
It accepts explicit logical storage and returns a detached, deeply immutable
candidate, ordered records and arithmetic diagnostics. It installs nothing into
the world, renderer, input system or save state. Return records are inert logical
completion metadata; they grant no executable continuation or register guarantee.
The existing stop, navigation, exchange, transfer and weight APIs remain unchanged.

The caller must supply player zero, secondary dead word zero, window one, control
method one, pending action three, wings zero, distinct current/old references,
selection zero or one and stored count two. Carried IDs must be one and two followed by
28 empty IDs; equipment ID must be three. All thirty complete packed big-endian
entries, equipment, temporary and three separate padding entries are required.
Previous-position and no-room-count words, grenade-use, weight, heavy-count,
too-heavy and redraw are explicit. No field receives an inferred default.
References are opaque logical values; this API does not read cell contents.

The complete 114-row arithmetic projection must carry the existing OCS runtime
revision and table identity witness, sequential IDs, byte categories and word
weights. The three used rows must match the observed ordinary categories and
weights. Physique must be the observed word immediately below the positive,
representable quotient; incoming too-heavy must be clear. This deliberately
admits only the observed becomes-heavy branch. Ordinary item contributions do
not multiply by their opaque count bytes. Different items, categories, physique,
feedback, prefixes, other selections, full capacity, wings, overflow and grenade paths
reject. A matching caller-provided hash string does **not** authenticate the
projected values or original bytes: external source verification remains required.
The unused rows are shape/width checked and retained, never treated as byte proof.

Exact own enumerable data descriptors and field sets are required at every
object and array level. Plain and null-prototype records are accepted; arrays
must have the ordinary array prototype, exact length, dense own data slots and
no extra keys. Accessors, inherited fields, hidden fields, symbols, coercible
values, malformed widths and unsupported projections reject before any transition
record or candidate is exposed. Proxies are outside this validation trust boundary.
Input is never mutated. Every output object, table row, array and record is
detached and frozen, with recursively readonly result types.

The ordered effects are:

1. Copy current reference to old and consume the pending action.
2. Copy selection to previous position, then copy complete entries backward from
   slot 28 to 29 through the selected slot to its successor. Selection zero makes
   29 copies; selection one makes 28 and preserves slot zero byte for byte. Empty
   tails move too; the former final empty entry is overwritten. The insertion
   return names the selected slot.
3. Copy the complete equipment long to the selected slot, then clear only equipment's ID
   byte. Equipment's other three bytes survive. These moves are direct writes;
   there are no invented `copy_item` calls or returns.
4. Clear grenade-use, perform one fixed equipment-plus-thirty-slot weight scan,
   and record all 31 add-weight returns, including empty IDs. Write total weight,
   heavy-count 50, redraw true, then too-heavy true.
5. Record weight return, retain the redundant action redraw write, then record
   natural action completion.

Selection zero retains 40 ordered prior/new writes and 74 total records; selection
one has 39 writes and 73 total records. Both retain 34 return records. Each record names its storage width; the
equipment clear records its ID byte rather than a fictitious full-long clear.
Add-weight records retain the visited slot, ID, count byte and accumulator values.
No callback or injected calculator supplies weight behavior. The bounded ordinary
sum, unsigned divide by 140 and positive signed-word comparison preserve the
observed arithmetic without changing shared arithmetic.

Stored count stays two despite three occupied IDs before and after insertion.
There is no population consistency validation, count routine or count repair.
Selection, no-room count, temporary, padding, current reference and wings remain
unchanged. The byte-preserving adapter retains every unprojected byte separately;
this logical result makes no claim to own unknown actor memory, canonical
initialization, a live actor or a valid save.

Public tests use synthetic storage and a synthetic complete arithmetic projection.
They verify full tails, reverse overwrite order, ID-only clear, retained count and
opaque storage, all weight visits, redundant feedback order, immutable detachment,
widths and malformed descriptor rejection. Private comparison against both
accepted original cases checks the complete candidate, all ordered records and
full 8 MiB re-encoding and chronological prior-value replay, retaining unknown
bytes. Original stack writes are audited separately: 34 actual calls and natural
returns balance, maximum depth is 44 bytes and the four-byte outer save remains.
That proves this per-player observation, not an outer four-player return. Original
bytes, source addresses, fixtures, scripts, tables and traces remain ignored and
outside public tests and CI.

Training43 remains incomplete. Live backpack/input binding, full inventory,
canonical actor/storage authority and source-bound atomic paused recovery remain
separate prerequisites. World/checkpoint three and roster one are unchanged;
fall/death/control/occupancy, pads/corpses and wet traversal still gate activation.
The Locations revision mismatch blocks campaign. Physical controllers, TV and
complete-level acceptance remain separate; art integration waits for all designs.
This widening changes only the bounded helper, synthetic tests and this contract.
