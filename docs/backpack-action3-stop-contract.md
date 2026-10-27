# Pure bounded backpack action-three empty-equipment stop

27 October 2026. `transitionBackpackAction3Stop` in
`src/character/backpack-action3-stop.ts` implements exactly the two initialized
cases in the [original observation](backpack-action3-observation.md), on accepted
base `19399aa94edbeffbdf807e6abf4511688b168489`. It is a disconnected synchronous
logical transition with no application caller or result installer.

The input contains exactly `actor` and `redrawFlag`. The actor requires explicit
player index, secondary dead word, window, control method, pending action,
current/old references, selection, count, equipment, temporary, thirty carried
entries, three separate padding entries, wings, grenade-use, weight, too-heavy
and heavy-count. Bytes are unsigned 0..255, words 0..65535 and longs
0..4294967295. Equipment, temporary, carried and padding entries are packed
big-endian four-byte longs. Each carried/equipment ID is its high byte; every
trailing byte is retained, including empty-entry tails. Padding is separate
storage and conveys no inventory capacity or provenance.

The bounded caller is player zero, secondary dead word zero, inventory window
one, control method one, pending action three and wings zero. Current and old
references are distinct unsigned logical labels. Count is two, carried IDs are
exactly 1,2 followed by 28 empty IDs, equipment ID is empty, and selection is zero
or one. All remaining storage is opaque within its declared width. The API
requires no item table, physique, cell contents, item category, calculated weight
or revision witness. These authored diagnostic inputs confer no live actor,
world, save or item authority.

Objects must contain exactly the required own enumerable data properties, with
ordinary or null object prototypes. Arrays must have the ordinary array
prototype, exact length, dense own enumerable data entries and no extra keys.
Accessors, inherited or hidden fields, unexpected string/symbol properties,
sparse arrays, custom prototypes, coercible objects and invalid numeric widths
reject. Descriptor reflection invokes neither getters nor numeric coercion.
Proxies are outside the trust boundary. Validation and a detached complete
snapshot finish before any result is exposed. Rejection throws atomically and
leaves input untouched; it describes this API boundary, not original behavior
for unsupported callers.

The result contains exactly `candidate` and `records`. Its complete candidate,
actor, carried/padding arrays, record array, individual records and result are
frozen at runtime. The exposed result types are readonly. The candidate shares
no mutable input storage. The ordered records are:

1. Long write of current reference to old reference, with prior/new values.
2. Byte write consuming pending action three to zero, with prior/new values.
3. `{ kind: 'action-return', actor: 'actor' }`.

Both selections retain their incoming selection and redraw. Count, current
reference, every complete carried entry and tail, equipment/tails, temporary,
three padding entries, wings, grenade-use, opaque weight and feedback all remain
unchanged. No insertion, item copy, clearing, count update, compaction, weight
arithmetic, redraw write or helper invocation occurs. The stored-action dispatch
and empty-equipment branch are established directly by source and decoded CPU
evidence; no behavior is inferred from up/down or action four.

The inert action-return record has no callback or continuation and makes no
register-restoration claim. In the original bounded execution the actual BSR/RTS
balances the per-player call and reaches its decoded continuation; the outer
routine's saved register remains for later unexecuted restoration. This API
claims neither the outer four-player completion nor a live input producer.

Public tests use synthetic data only. They compare both complete candidates and
exact ordered records, retained opaque storage and width endpoints, input
immutability, detached deeply frozen results, strict descriptor/shape validation
and atomic rejection. The ignored private worker comparator freshly reproduces
only the same two CPU cases with the unchanged pinned `observe_v3.py` (explicit
A6 and entry PC), the independently audited harness, and guarded `compare_v2.py`.
Original code remains RX; natural BSR/RTS and the outer prefix, source prediction,
complete 8 MiB images and raw chronological prior-value replay are retained.
The API comparator decodes all fields, compares complete candidates and ordered
records, encodes all candidate storage over each entire before image, and checks
logical-write replay independently. Separately audited stack effects are then
applied; both full reconstructed images equal the original CPU after image and
the independently reproduced image byte for byte. Original source, code and
retained table identities are checked; the table supplies identity only.
Existing output targets are refused. All private scripts and outputs stay under
`.local/backpack-action3-stop-core/worker/`, outside Git and CI.

Other players, dead/window/control/action values, counts, IDs, selections,
occupied equipment, full inventory, insertion/transfer/drop, item use, weight
logic, padding provenance and hardware input are unsupported. Existing APIs,
exports, shared status, installers, live input/world/save/schema/UI/renderer and
checkpoint behavior remain unchanged. Training43, physical-controller/TV and
complete-level acceptance remain separate unresolved gates. Art waits for all
designs. No successor is started.

One implementation worker; requested gpt-6.1-sol medium, exact runtime telemetry
and token usage unavailable. No worker delegation. One API implementation attempt;
one private comparator diagnostic corrected the independently documented hash
field capitalization after inspecting the report, before any report write.
Fresh original and independent CPU reproductions passed on their first attempts.
Targeted tests, typecheck, lint and private comparison precede coordinator full
checks, browser checks, independent final review, commit, PR and integration gates.
