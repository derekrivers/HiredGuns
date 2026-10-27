# Backpack transfer prerequisite

26 October 2026. Source inspection on base
`c13909a5cd367e0c72bd43069a2a64027e1c0ba7` does **not** establish the
requested manual carried-to-carried move/exchange. No transfer API or behavior
tests are implemented. This is a bounded prerequisite finding, not a claim that
every original revision lacks such an interaction. No original instructions were
executed and no CPU, emulator, timing or playable backpack parity is claimed.

## Inspected source identity and path

All paths below are relative to the local ignored `research/ocs/Sources/` tree.
References identify source locations; no original source text, bytes, addresses
or traces are reproduced here.

| File | SHA-256 |
| --- | --- |
| `Controls&Movement.s` | `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15` |
| `ColdStartup.s` | `5c9c64ee626ab8fb13bf321fad5ac0940e80a5db0b3366ce57af8c12daa971ee` |
| `Equates.i` | `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759` |

`ColdStartup.s:2241-2450,2467-2646` was inspected for both mouse gadget
producers, including window selection, hit testing and button-edge action
production. Window 1 chooses the common inventory gadget table at
`2728-2740`. Its actions lead to inventory navigation, selected-item use,
equipment storage/use, pickup, drop, information, window switching and leader
selection. A button edge supplies an action code. This inspected path supplies
neither two carried indices nor a captured dragged-entry payload. The second
mouse path uses the same table, with its own control-method and button state;
its right-button ownership test differs from the first path and must not be
silently normalized in any future input transcription.

`Controls&Movement.s:874-887` transfers each selected mouse action into the
actor's control action. The caller at `4528-4621` checks the actor's secondary
dead flag, excludes window 7, requires a nonzero control method, loads the current
cell reference, updates the old cell reference, consumes a nonzero action and
dispatches it. The complete inspected dispatch provides no separate
carried-to-carried action. A caller cannot infer permission to exchange arbitrary
carried entries from the generic four-byte copy helper.

## Storage domain and actual branch distinctions

`Equates.i:909-916,1112-1120` defines four-byte entries and thirty carried
slots, separate from equipment, temporary storage and trailing padding. Thus
zero-based carried storage indices are 0 through 29. This storage bound does not
establish that arbitrary pairs are reachable manual selections.

Inventory navigation at `Controls&Movement.s:4947-4955,5021-5037` changes one
selection position. Moving toward the beginning stops at zero. Moving toward the
end stops at 29 and also refuses a next entry whose item ID is zero. In particular,
a synthetic hole can prevent reaching later occupied storage by that path. No
direct selection of an arbitrary carried index was established by the inspected
mouse table. Padding and temporary storage are not extra carried slots.

| Source branch | Established source deduction | Why it cannot define the requested operation |
| --- | --- | --- |
| `turn_right`, inventory branch, `5241-5273` | Empty selected item returns without transfer. Occupied selection with empty equipment copies into equipment and compacts carried storage. Occupied equipment uses temporary storage for three full-entry copies. Weight calculation and redraw follow successful transfer. | The second endpoint is equipment, not a second carried index. |
| `turn_left`, inventory branch, `5183-5199` | Empty equipment returns. Otherwise insertion needs a free final carried slot, shifts storage relative to the current selection, copies equipment, clears only equipment's item ID, then calculates weight and requests redraw. | This is insertion, not replacement of a specified carried destination. |
| `inven_to_hands`, `6066-6095` | Uses the selected carried slot and equipment, including the temporary-storage exchange when both are occupied. Returns an explicit success/failure value. | This helper is also called from drop orchestration at `6037-6064`; substituting a standalone exchange loses caller behavior. |
| `copy_item`, `6283-6284` | Copies all four bytes between caller-supplied locations. | It has no manual-selection, endpoint-domain, emptiness or same-index policy. |
| `remove_item`, `6295-6337`; `insert_item`, `6347-6370` | Removal compacts occupied successors and clears only an item ID; insertion shifts entries and has a full-inventory feedback path. Selection and weight/feedback state can change. | Neither is a two-index carried swap; empty storage need not become four zero bytes. |

The full-entry copies preserve damage, ammunition/count and the fourth byte.
ID-only clears preserve opaque trailing bytes in an empty entry. The fourth byte
also participates in display state, as documented in
[character-format.md](character-format.md); it must not be regenerated from an
assumed potency or normalized on emptiness. Existing imported `rawHex` is a
representation of all four bytes, not an additional original field.

These deductions do not establish carried-to-carried move, swap, empty-source,
empty-destination, both-empty or same-index behavior. They also do not establish
drag-start, drag-cancel or drag-release prerequisites. Assigning familiar UI
semantics to those cases would invent an original contract.

## Required evidence before implementation

The requested pure candidate requires an identified manual caller that supplies
both carried endpoints, together with its selection/drag prerequisites and exact
empty/same-index branches. Its modeled input must include every required caller
state, rather than pretending equipment-mediated insertion and compaction are a
weight-preserving carried permutation. The inspected existing transfer callers
require equipment, selection position, temporary storage where applicable,
inventory capacity/contiguity assumptions, weight calculation and feedback; the
outer action path also owns eligibility and current/old cell bookkeeping.

Until that prerequisite is established, there is no justified API for explicit
two-index carried exchange and no justified ordered write list. Consequently this
lane adds no implementation, no callbacks, no partial result and no synthetic tests
that could be mistaken for source evidence. It changes no world, checkpoint,
selection-plan, UI, equipment, action, item-table or weight behavior. Existing
initialization and import contracts remain as documented in
[item-format.md](item-format.md) and
[live-character-contract.md](live-character-contract.md).

Historical next narrow backpack nomination (now completed by the bounded
[action-4 observation](backpack-action4-observation.md)): observe the identified
OCS manual inventory action-4 caller through selected-carried/equipment exchange
and return, with occupied selected/equipment entries and fixed initialized caller
state, recording all storage and ordered writes including weight/feedback. This
establishes the actual supported manual exchange as a separate bounded scope;
it would not by itself authorize carried-to-carried reordering.

Validation for this documentation-only result: inspected both mouse producers,
their shared inventory gadget table, action transport/dispatch, all source calls
to the entry-copy helper, navigation, insertion/removal and equipment-transfer
branches against the hashes above. Existing item and initial-team synthetic tests
were read for current contracts. Coordinator owns baseline checks, independent
review and CI. One gpt-6.1-sol medium implementation worker produced this
prerequisite finding; no implementation or repair attempts and no recursive
delegation. Token usage is unavailable.

27 October status: the occupied action-4 caller/exchange/weight/return observation
is complete for the three fixed cases documented in the linked evidence. No
carried-to-carried contract or application implementation follows from it. The
smallest next implementation is the explicitly bounded occupied manual exchange
with its recorded caller and feedback prerequisites; it remains unstarted.
