# Explicit ground-slot transfer

This packet provides immutable logical item ownership transitions, with no DOM,
world, session, save, importer or character changes. It does not inject original
map objects. `src/items/ground-transfer.ts` consumes an explicit four-byte ground
entry and the accepted 30-carried/10-action inventory shape. Every result owns
fresh storage, including refusals. Invalid data throws before any caller mutation.
Output objects are detached copies; they are not frozen.

## Source deductions and deliberate bounds

Inspected once in the local original `Controls&Movement.s`:

| Bounded routine | Supported deduction |
| --- | --- |
| `pick_up_into_inven`, lines 5532–5634 | Refuse when already too heavy; insert into carried storage; no-room branch follows insertion failure. Skeleton and ordinary map paths differ. |
| `pick_up`, lines 5636–5707; `get_item`, lines 5793–5851 | Pickup into equipment first inserts occupied equipment into carried storage; full storage prevents this replacement. Empty equipment requires no free carried slot. |
| `calc_weight` / `add_weight`, lines 5927–6005 | Recalculate source table/count weight and signed-word physique comparison. Reuse accepted `computeSourceWeight`; category 4/21/23 count arithmetic is weight arithmetic, not a stack mechanic. |
| `drop_item`, lines 6106–6254 | Ordinary supported-floor drop requires empty eligible map placement and clears equipment ID. Other auxiliaries can refuse; skeleton and field-generator paths are distinct and excluded here. |
| `copy_item`, line 6287; `remove_item`, line 6299; `insert_item`, line 6351 | Four-byte inventory copies; ID-only removal; insertion shifts the complete tail and checks the last carried ID. Accepted `returnEquipmentToBackpack` is reused for stowing occupied equipment. |

The commands are exactly:

```ts
{ version: 1, kind: 'pickup-equipment' }
{ version: 1, kind: 'pickup-carried' }
{ version: 1, kind: 'drop-equipment' }
```

The supported equipment exchange is ground-to-equipment replacement with the old
equipment inserted at the current carried selection. It does **not** swap the old
equipment onto occupied ground. No inspected source routine establishes a direct
occupied-ground swap or direct carried-to-ground opcode. Those operations need a
source-supported routing/ordering rule and eligible map-cell/auxiliary input;
they are not silently invented. Users can return/equip using the accepted existing
inventory controls, then drop equipment.

Pickup checks the **existing** computed overweight state, not prospective weight.
It can make the actor too heavy. Pickup into carried, or pickup replacing occupied
equipment, refuses with `no-room` when carried slot 29 is occupied. Pickup into
empty equipment succeeds even with all 30 carried entries occupied. Full storage
is valid input, not an exception. The bounded profile requires a contiguous carried
prefix and a selection of an occupied carried entry, or zero for an empty prefix.
It excludes spells (`spell_wings` is zero), DIVU overflow and invalid source words.

## Authored ground-overlay policies

An original ordinary map item is packed in map fields, not a four-byte inventory
entry. Its pickup writes ID/damage/ammo and can set outlined; drop serializes only
the corresponding map fields. This module deliberately transports the **entire**
four-byte entry, including its unknown fourth byte. Clearing ownership changes only
the ID and its `rawHex` representation. Empty ground entries retain their other
three bytes as a tombstone; they are not a second owned item. No outline flag,
ammo merging, count modification, pointer/control rule or no-room countdown is
simulated. Carried insertion preserves the original full-tail shift, including
empty-entry bytes; actions are always copied unchanged.

The caller chooses one explicit reachable ground slot and checks actor lifecycle,
position, floor support, collision, occupied cells, and auxiliary eligibility.
This module assumes that placement decision has already been made. `ground-occupied`
is the explicit overlay's single-slot policy, not a claim to implement all original
drop eligibility branches. No coordinates, ground list or world state are accepted.

All input state/command fields are exact, own enumerable data properties; no
accessors, inherited fields, custom array prototypes/subclasses, sparse arrays,
extra keys or malformed raw hex. Slot copying reads validated indices into fresh
ordinary arrays and never invokes caller-provided array methods. Every
equipment, carried, action and ground entry is checked, including empty tails.
Byte fields are integers in 0–255; nonzero item IDs must be in 1–114. Carried/action
widths are exactly 30/10; selected position must fit the prefix. `rawHex` must agree
with all four bytes. Physique is an unsigned source word. Unavailable arithmetic
throws atomically. Supported no-op/refusal outcomes return unchanged detached state:
`empty-ground`, `empty-equipment`, `ground-occupied`, `no-room`, `already-too-heavy`.

`transferGroundItem(state, catalog, physique, command)` returns weight marked
`computed`: editable catalog fields and labels grant no original authority.
`transferOriginalGroundItem(state, command, {roster, items}, canonicalIndex)`
snapshots raw bytes, state and command before awaiting; reparses and verifies the
exact OCS pair via accepted import/inspection helpers and derives canonical
physique. Its `verified` weight means verified **table and physique arithmetic on
the supplied logical inventory**. It does not authenticate that inventory's history,
ground placement or actor binding. The consumer must bind canonical index and live
inventory to its freshly verified selected team. Never restore a claimed verified
weight, item label, catalog metadata or hash alone as authority. Original bytes,
records and scripts stay ignored and out of CI.

## Immediate consumer: inventory-ground-keyboard-integration

The coordinator already queues this consumer immediately after the live fall
owner releases shared state and this packet is accepted. Do not start another
disconnected core descendant. The consumer is sole owner of main/world/session/save
and UI during its integration; this packet edits none of them.

Keep the ready-to-play setup menu and known local roster/items dropdowns. In the
same four-view application, use a labeled authored ground-item scenario when
Training43 contains no suitable ground item. Use a deliberate inventory-shaped
entry from verified inputs for the authored placement; retain every byte and label
the placement as authored. Do not imply that Training43 originally placed it there.
Keep previews 5217 and frozen 5196 intact until a deliberate accepted release.

Concrete call at an already validated nearby slot:

```ts
const result = await transferOriginalGroundItem(
  { inventory: liveActor.inventory, ground: overlaySlot.entry,
    selection: liveActor.inventorySelection },
  { version: 1, kind: 'pickup-equipment' },
  verifiedLocalRawInputs,
  selectedTeam.actors[actorIndex].canonicalIndex,
);
// After stale-state/cancellation checks, commit ALL of these in one transaction:
// actor.inventory = result.state.inventory
// actor.inventorySelection = result.state.selection
// actor.weight = result.weight
// overlay[groundId].entry = result.state.ground
// append the successful replay command and advance the session revision
```

Integration fields and version contract (a **proposal**, not an implemented save
schema change in this packet):

* Retain existing save/session version compatibility. Introduce a distinct
  `groundTransfersVersion: 1` section when upgrading the consumer's then-current
  session format; do not guess a future shared version number here.
* Fixture identity: `groundScenario: { id, version: 1 }`, with a bounded allowlist of
  stable slot IDs and authored initial entries/positions owned by the consumer.
  A slot needs `{ id, x, y, z, entry }`; use the world's established coordinate
  units/domain, not a new conversion. Imported ground is not enabled implicitly.
* Serializable replay envelope:
  `{ groundTransfersVersion: 1, sequence, actor, groundId, transfer: { version: 1,
  kind: 'pickup-equipment' | 'pickup-carried' | 'drop-equipment' } }`.
  `actor` is 0–3, `groundId` is a fixture allowlisted string, and `sequence` is the
  shared monotonically ordered action index. Consumer validates exact fields,
  dense arrays, a bounded command budget and the fixed version. The core validates
  only the nested transfer command; it does not claim to parse this envelope.
* Ground transfers must share one ordered replay stream with equip/return/exchange
  and movement/fall commands. Separate logs replayed by kind would reorder ownership
  and pickup positions. Source selection/canonical indices, fixture identity and
  current selection must be recoverable in that same deterministic ordering.
* Reconstruct initial selected team/fixture from verified raw inputs; replay actions
  and derive inventories, weights and overlay together. If persisting a current
  overlay snapshot, validate all fields and compare it with replay. Do not trust
  caller-supplied cached weight or accept duplicate slot IDs or unknown fixtures.
* Retry resets actor inventory/weight, ground entries, selections and ordered log
  together. Paused save/import prepares the complete replacement before commit.
  Canceled/stale asynchronous imports or transfers must not commit any field.

Bind pickup/drop keys through the existing keyboard command queue and selected
actor; show action labels and key hints in the existing application. Distinguish
"Backpack full", "Already too heavy", "Ground occupied", "Nothing to pick up"
and "Nothing equipped". A transfer's `no-room` does not consume ground, alter
equipment or append a successful ownership command. Input ordering and nearby
slot resolution are consumer policies, not source control parity.

Consumer acceptance must include real browser keyboard pickup/drop near the actor,
occupied-equipment stowing, full capacity feedback, authored-label visibility,
single ownership (no duplicate/lost full entries), source-bound team weight,
movement/fall interleaving, pause-save-load, retry and stale/canceled import checks.
No browser evidence is claimed for this DOM-free packet. No original CPU execution
or parity is claimed. Enemy AI, rendering, art, sound and campaign remain outside it.

## Validation

Public synthetic tests exercise all supported insertion positions for prefix sizes
0–29, full-capacity refusal, empty equipment with full carried storage, all four
bytes/tails/actions, overweight-before versus overweight-after behavior, special
weight categories/counts, strict malformed input rejection, and deterministic
128-command ownership replay. An opt-in private test uses
`HIRED_GUNS_CHARACTERS` / `HIRED_GUNS_ITEMS`, exact raw pair verification and a
separate packed-byte weight/entry oracle. It also checks snapshots before await
and rejects substituted raw evidence. The oracle is a local byte calculation,
not original machine execution. Run `npm run check` and the targeted test with
those private environment variables; CI runs synthetic tests only.
