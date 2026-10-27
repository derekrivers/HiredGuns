# Pure occupied manual action-4 exchange

27 October 2026. `transitionBackpackAction4` in
`src/character/backpack-action4.ts` models one disconnected occupied inventory
exchange on accepted base `2e5adfb81556c4c6669eb75fe1ca2fcd2ecb788c`.
The [observation](backpack-action4-observation.md) and its independent private CPU
audit establish the bounded original path; the
[transfer prerequisite](backpack-transfer-contract.md) explains the separate
carried-to-carried evidence gap. No application caller installs this candidate.

The exact input contains `actor`, `physique`, `redrawFlag` and `items`. The
exported interfaces enumerate every nested field. Objects and arrays require
the exact field set as own data descriptors. Nonenumerable data fields are
copied; unexpected string/symbol keys and accessors reject without executing
accessors. Arrays are dense, without additional properties. Each
field is snapshotted, all storage widths and prerequisites are validated, and
arithmetic eligibility is checked before any candidate or record is exposed.
There are no callbacks or input mutations; all result objects/arrays are detached.
Malformed and unsupported input throws. These rejections are API boundaries,
not claims to reproduce original rejected-caller behavior.

Current/old cell references are unsigned logical labels, never executable
addresses; they begin distinct. No cell contents are required or accessed.
Actor storage includes player index, secondary dead word, window/control/action,
selection/count, complete equipment/temporary entries, all thirty carried entries,
three separate padding entries, wings, grenade-use word, weight long, too-heavy
byte and heavy-count word. Packed entries are unsigned big-endian four-byte
longs: ID, damage, count, opaque fourth byte. An empty ID does not erase the
other three bytes. Padding is preserved storage, never extra inventory capacity.
All supplied storage is validated even when unchanged.

The fixed profile is player 0, secondary dead word 0, inventory window 1,
control method 1, pending action 4, selection 1, stored total count 4 and wings 0.
Carried IDs are exactly 1,2,3 followed by 27 empty IDs; equipment ID is 4.
Damage/count/opaque bytes, temporary and padding longs, prior weight/grenade-use/
heavy-count/redraw and logical labels are explicit unsigned storage. Word fields
are 0..65535, bytes 0..255, longs 0..4294967295. The stored count counts equipment
plus carried entries and is retained, not recalculated.

`items` is an exact arithmetic projection of 114 ordered records, each containing
`itemId`, category byte and unsigned weight word. The witness requires revision
`ocs-runtime` and table SHA-256
`633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc`.
A mismatched witness rejects, but matching text cannot authenticate projected
records. This synchronous pure function neither hashes raw tables nor promotes
editable metadata to source authority. Use with original evidence requires an
external verified import of the complete pinned OCS runtime table, followed by
this projection; CD32/editor candidates are not substitutes. Public tests use
only authored synthetic records and a synthetic witness claim, establishing
arithmetic/validation behavior without original-table authority. The private
comparator independently hashes the raw table, checks its recovered GameFast
slice and source/executable pins, and derives this projection anew. Existing
item import and inventory/weight APIs remain unchanged.

The four occupied IDs must have ordinary categories, excluding count-multiplied
categories 4,21,23. Weight visits equipment and all thirty carried slots; empty
IDs add nothing and ordinary items add their unsigned weight once, independently
of damage/count/tails. Long addition retains unsigned 32-bit storage. This
four-item profile cannot overflow that storage. Unsigned division by 140 must
have a positive representable quotient; zero and overflow reject. Both quotient
and physique are then interpreted as signed words for the greater-than comparison.
The API retains quotient/remainder and signed operands as diagnostic arithmetic;
these are not a complete CPU-register snapshot. The four weight words bound the
quotient below the signed-word boundary; no unobserved division-overflow path is
implemented. Physique retains its full unsigned word storage before comparison.

Private prevalidation computes the sum before constructing the observable writes;
the permutation preserves it. The candidate nevertheless records a fresh weight
write even when its incoming weight already equals the total. Records preserve
exact order, widths and before/after values:

1. Old cell receives current; pending action is consumed to byte zero.
2. Full selected entry copies to temporary, then the first copy returns.
3. Full equipment entry copies to selected, then the second copy returns.
4. Full temporary entry copies to equipment, then the third copy returns.
5. Grenade-use word clears to zero; calculated total writes to weight long.
6. The supported feedback branch below executes, then weight returns.
7. Action redraw writes byte 255, including redundant redraw, then action returns.

The temporary retains the original selected entry. Selection, count, current
reference, every other carried entry, opaque empty tails, padding, physique,
wings, caller eligibility fields and item projection are preserved.

Only three feedback paths are supported. Heavy with incoming too-heavy 0 writes
heavy-count word 50, redraw byte 255, too-heavy byte 255. Heavy with incoming
255 writes heavy-count 50 without weight-stage redraw/flag writes. Non-heavy
(including equality) with incoming 255 writes redraw 255 then too-heavy zero,
retaining heavy-count. Non-heavy with incoming zero and other incoming flag
values reject. The action-stage redraw remains a separate final write in all
three paths. Prior feedback values need not be normalized before those writes.

The record stream models three copy returns, the weight return and the natural
action return, interleaved with non-stack storage writes. It does not model every
instruction, stack effect or all 31 nested add-weight returns. Those remain
observations in the private original trace. Return records retain logical actor
and current-cell identity where applicable; no callbacks or continuation run.

Unsupported branches include other players/selections/ID arrangements, internal
holes, full inventories, empty endpoints, insertion/compaction, carried-to-carried
reordering, rejected original callers, category multiplication, equipped grenade,
wings override and division overflow. No physical input, live world, save,
checkpoint, scheduler, renderer, equipment UI or campaign integration is added.
Training43, full-level and physical-controller acceptance remain separate gaps.

Synthetic tests check all three feedback paths, ordered writes/returns and
redundant redraw, full-entry/temporary and padding retention, independent copies,
recalculation, unsigned division/signed comparison, equality, exact data
snapshots and atomic rejection without accessors. Private comparison reconstructs
the complete initialized original memory image for all three frozen cases,
compares every logical candidate field and the ordered write/return stream,
replays original stack effects separately, and requires the resulting complete
8 MiB image to equal original ordered replay and its frozen final hash. This is
bounded equivalence for these inputs, not general inventory parity.

Worker validation: targeted synthetic tests and `npm run check`; parent owns
browser checks, exact-final independent review, commit and PR gates. One
implementation worker, no recursive delegation; token usage unavailable. Private
scripts, raw fixtures, comparison reports and handoff stay ignored under
`.local/backpack-action4-core/`; no original content enters public tests or CI.
The next evidence nomination is now complete for three bounded arrangements:
the [empty-equipment observation](backpack-empty-equipment-observation.md)
executes the same eligible manual action-4 caller through actual compaction,
ID-only clear, selection handling, both weight passes and natural return. The
smallest next implementation is that explicitly bounded empty-equipment path
with its recorded prerequisites and ordered writes. It remains unstarted; this
occupied-exchange API is unchanged.
