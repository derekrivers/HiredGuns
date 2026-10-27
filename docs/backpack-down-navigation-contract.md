# Pure bounded backpack downward navigation

27 October 2026. `transitionBackpackDownNavigation` in
`src/character/backpack-down-navigation.ts` implements the two cases in the
[original observation](backpack-down-navigation-observation.md), on accepted base
`8ed228a51941715de546ec5d12c585fe16d61e06`. This is a disconnected synchronous
logical transition. No application caller installs its result.

The exact input fields are `actor` and `redrawFlag`. The exported actor interface
requires player index, secondary dead word, window, control, action, current/old
references, selection, count, equipment, temporary, thirty carried entries, three
separate padding entries, wings, grenade-use, weight, too-heavy and heavy-count.
Every field is explicit, including unchanged storage. Bytes are unsigned 0..255,
words 0..65535 and longs 0..4294967295. Equipment, temporary, carried and padding
entries are packed big-endian four-byte longs. Each carried/equipment ID is the
high byte; all three trailing bytes survive, including those of empty entries.
Padding remains separate storage and provides no inventory capacity.

The bounded caller requires player zero, secondary dead word zero, inventory
window one, control method one and pending action two. Current and old references
are distinct unsigned logical labels. The stored count is two, equipment ID is
empty, carried IDs are exactly 1,2 followed by 28 empty IDs, and selection is
zero or one. Wings is zero, matching its explicitly initialized fixture field.
Other storage within its declared width is retained opaque data. Weight,
grenade-use and feedback are neither calculated nor normalized. There is no
physique field, item-table projection, item-category check or revision witness:
the observed path reads none of those. Cell contents are neither supplied nor
read. These diagnostic inputs do not establish canonical or live actor authority.

All objects require exactly their enumerated own, enumerable data properties
with ordinary or null object prototypes. Arrays require their ordinary array
prototype, exact length, dense enumerable own data entries and no extra keys.
Accessors, hidden fields, inherited required fields, custom prototypes, unexpected
string/symbol keys, sparse arrays, coercible objects and invalid numeric widths
reject. Descriptor reflection never calls property getters or numeric coercion.
Proxies are outside the input trust boundary. Validation and a detached snapshot
complete before any result is exposed. Rejection throws without changing input,
and models an API boundary rather than original rejected-caller behavior.

The result has only `candidate` and `records`. Its complete detached candidate,
actor, carried/padding arrays, records and individual records are frozen at
runtime. Readonly result types also expose the immutable storage. Callers may
retain or inspect this inert proposal; no callbacks or continuations execute.

Records preserve these non-stack writes, including widths and prior/new values:

1. Copy current reference to old reference as a long.
2. Consume pending action two to byte zero.
3. For selection zero only, write selection word one, then redraw byte 255.
4. Append `{ kind: 'action-return', actor: 'actor' }`.

Selection zero has the occupied immediate successor and advances to one.
Selection one encounters the empty successor and retains both selection and
incoming redraw; it still performs both caller writes. A moving input whose
redraw is already 255 still emits the redundant redraw write. All other storage,
including count, current reference, every full entry, temporary, padding, wings,
weight and feedback, remains unchanged.

The action-return record expresses logical completion only. In the original CPU
execution, A2 becomes the carried-storage base; it is not restored to the current
cell. The original outer save and actual BSR/RTS are private diagnostics. The
per-player return reaches its real continuation while the outer routine retains
its saved register for later restoration. This API claims neither original
register restoration nor completion of the outer four-player routine.

Synthetic tests compare both complete candidates and exact record sequences,
unchanged tails/storage, redundant redraw, opaque unsigned endpoints, detachment,
deep immutability and atomic rejection across storage and descriptor defects.
The ignored private comparator checks the pinned observer and independent audit
reports/scripts and source/executable/table prerequisites. For both freshly
reproduced CPU cases it decodes every logical field, compares the whole candidate
and ordered records, encodes all candidate storage over the complete initial
8 MiB image, and separately replays logical writes with chronological prior-value
checks. Original stack writes are audited and applied separately. Both rebuilt
images must equal each complete original final image and the independently
reproduced images byte for byte, preserving all unknown bytes. The retained table
is checked as evidence material; it supplies no logical arithmetic or API witness.

Other players, counts, IDs, prefixes, selections (including 29), equipment
arrangements, rejected callers, full storage, insertion/drop/reordering, weight
logic, padding provenance, hardware input and general navigation remain outside
this contract. Existing APIs, exports, installers, live backpack behavior, world,
UI, renderer, save and checkpoint behavior remain unchanged. Training43,
physical-controller/TV and complete-level acceptance remain separate unresolved
gates. Art waits for all designs. No successor is started.

One implementation worker; no delegation. Targeted tests, typecheck, lint and
private comparison precede coordinator full checks, browser checks, exact-final
independent review, commit and PR gates. Private scripts/results/handoff stay
ignored under `.local/backpack-down-navigation-core/`. Token usage unavailable.
