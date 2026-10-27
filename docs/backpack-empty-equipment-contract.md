# Pure empty-equipment manual action-4 transfer

27 October 2026. `transitionBackpackEmptyEquipment` in
`src/character/backpack-empty-equipment.ts` implements one disconnected transition
on accepted base `a079a4da6b850d98a744b0e781e821894928a689`. The
[original observation](backpack-empty-equipment-observation.md) establishes three
bounded cases. No application caller installs this candidate. The existing
occupied-exchange function, source authorities and import/weight APIs are unchanged.

The input uses the existing logical actor/item interfaces as type-only aliases.
Its exact own fields are actor, physique, redrawFlag and items. Every object must
have its exact field set as own data descriptors; arrays must be dense with no
extra string or symbol properties. Nonenumerable own data is copied. Accessors
reject without invocation. Every supplied field is snapshotted and validated
before any result is exposed. Results are detached; there are no callbacks,
input mutations, DOM operations or live installations. Invalid input throws as an
API boundary, without claiming original rejected-caller behavior. Proxies are not
an input trust boundary; descriptor reflection is ordinary JavaScript reflection.

Actor storage includes player index, secondary dead word, window/control/action,
current and old cell references, selection, count, equipment, temporary, thirty
carried entries, three padding entries, wings, grenade-use, weight, too-heavy and
heavy-count. Bytes are unsigned 0..255, words 0..65535 and longs 0..4294967295.
Packed four-byte entries retain ID, damage, count and opaque fourth byte in
big-endian order. Empty IDs retain their three trailing bytes. Padding is separate
storage. Cell references are distinct unsigned logical labels; cell contents are
neither supplied nor accessed.

The eligible caller is player zero, secondary dead word zero, window one, control
method one, pending action four and wings zero. Equipment ID must be empty.
Exactly these carried ID prefixes and selections are accepted:

| Occupied IDs | Selection | Required incoming feedback and arithmetic |
| --- | --- | --- |
| 1,2,3,4 | 1 | too-heavy zero; quotient greater than signed physique |
| 1,2 | 1 | too-heavy 255; quotient greater than signed physique |
| 1 | 0 | too-heavy 255; quotient no greater than signed physique |

All remaining carried IDs must be empty and stored count must equal prefix
length. Other IDs, arrangements, selections and combinations of feedback with
these cases reject. Tails, prior weight/grenade-use/heavy-count/redraw, temporary,
padding and logical references remain explicit variable storage. Only physique
from player zero is required. No other player's statistics are inferred.

The item projection contains all 114 ordered records with itemId, category byte
and unsigned weight word, revision `ocs-runtime` and the existing pinned table
SHA-256. Matching witness text does not authenticate editable projected records.
An externally verified import of the complete revision-matched OCS runtime table
is a prerequisite for original-evidence use. Public tests use authored synthetic
records and witness claims. Occupied items must exclude count-multiplied
categories 4,21,23. Equipment cannot be grenade-category; wings override is
excluded. Unsigned division by 140 must yield a positive quotient below 32768.
The quotient and physique are compared as signed words. Equality is non-heavy.
The bounded four-item ordinary sum cannot overflow unsigned long storage; no
division-overflow behavior is implemented.

Caller bookkeeping writes current reference to old, then consumes the action.
The complete selected entry copies into empty equipment and the copy returns.
For the four-entry case, successors copy forward in order into slots one then
two, each followed by its copy return. The last vacated ID clears as a one-byte
write, preserving that entry's tails. In the other cases the immediate successor
is empty: selected ID clears and selection decrements from one to zero only in
the two-entry case, before weight calculation. The sole-entry selection remains
zero. The source's separate post-weight decrement is unobserved and excluded by
the exact arrangements. Temporary, padding, count, current reference, all other
actor storage and every item projection field remain unchanged.

Removal calls the first weight pass before its return. The caller then calls a
second independent pass. Both actually scan equipment and all thirty carried
entries; each adds ordinary unsigned item weights once regardless of count or
tails. Each clears grenade-use before scanning and writes the fresh weight long
after scanning, including redundant second-pass writes. Each of the 62 nested
add-weight returns records pass, slot, ID, count byte and accumulator before/after.
These diagnostics model helper arithmetic, not full CPU-register snapshots.

For the four-entry case, first-pass feedback writes heavy-count 50, redraw 255,
then too-heavy 255. Second-pass feedback repeats heavy-count 50 only. In the
two-entry case both passes write heavy-count 50 only. In the sole-entry case the
first pass writes redraw 255 then too-heavy zero and retains heavy-count; the
second pass has no feedback writes. Every case receives a separate final action
redraw write, including redundant redraw, before the action return.

The ordered record union includes every non-stack write with width and prior/new
value, copy returns with source/destination, all nested add-weight returns, both
weight returns, removal return and final action return. Weight returns retain
pass and logical actor/current-reference identity; removal/action returns retain
that identity. One-byte carried writes refer to the ID byte, so their prior value
is the ID rather than the packed entry. Private prevalidation arithmetic creates
no observable records. No original addresses, stack instructions or executable
continuations appear in this logical API.

Synthetic tests cover all three full candidates, preservation/detachment, ordered
copies, ID-only clear, pre-weight selection, two scans and 62 helper returns,
redundant writes, nested boundaries, case-specific feedback, unsigned arithmetic,
signed comparison/equality, exact descriptors and atomic rejection. The ignored
private comparator pins original CPU/observer and independent audit script/report,
source/executable/table identities and the recovered GameFast slice. For all three
original cases it compares every candidate field, arithmetic and complete ordered
write/return stream, replays logical writes with prior-value checks, and rebuilds
the full initialized 8 MiB final image. Original audited stack spill is replayed
separately. All complete images equal frozen CPU final memory hashes byte for
byte. This establishes bounded equivalence for those cases only.

Unsupported work includes arbitrary ID arrangements or feedback branches,
internal holes, full inventories, empty source, insertion/store/drop/navigation,
carried-to-carried reordering, category multipliers, equipped grenade, wings,
overflow, other players, rejected original callers, input production, UI,
renderer, world, save, checkpoint and campaign integration. Training43 and
physical-controller/TV/full-level acceptance remain incomplete separate gates.
Art waits for all designs. No successor is started.

One implementation worker, no delegation. Targeted synthetic tests, lint,
typecheck and private comparison precede coordinator full checks, browser checks,
independent review, commit and PR gates. Private scripts, inputs, outputs and
handoff remain ignored under `.local/backpack-empty-equipment-core/`. Token usage
is unavailable. Next smallest nomination is an evidence-only investigation of the source
post-weight selection-decrement branch: establish a reachable bounded arrangement
from initialized caller/storage, or document that it is unreachable under
contiguous inputs. This nominates no branch behavior and starts no evidence work.
Any wider transition first needs separate original execution evidence.
