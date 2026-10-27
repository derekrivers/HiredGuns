# Paused Training43 equip into empty equipment

In an explicitly applied selected-team Training43 session, each of the four
mercenaries has a separate carried-slot selector and **Equip** button. Pause,
choose an occupied carried slot, inspect its item name and complete four-byte
entry, then equip it. The equipment entry and freshly verified weight appear
beside the selector. Expand current inventory data to inspect all thirty carried
entries, separate actions, selection and weight. The original initial-team
summaries remain immutable. Running navigation disables the command. Equipment
must be empty: each actor can equip once, independently of the other three.

Retry and rule changes restart the world and reset every inventory overlay to
the same source initialization. Apply constructs a fresh team and world. Source
replacement/clear or map replacement clears the overlay together with the team.
Preparation choice changes cancel pending operations while retaining the last
applied team, matching the existing session behavior.

## Binding and source deduction

This is an explicit-import standalone adaptation on accepted PR84 base
`9e2ad98e75fe9dc5074c7168fa8fb59e874c7c7b`. The session snapshots raw roster,
items, ordered choices and equip commands before hashing. `initializeOriginalTeam`
verifies the exact OCS pair anew, and `importItems` reparses the same raw item
snapshot for names and arithmetic. Complete detached session candidates replace
one another; initial team data is recursively frozen and never edited. Save and
equip reconstruct from source inputs rather than trusting editable item metadata
or arbitrary overlay objects. The verified item table remains frozen with each
session. No synthetic ID pattern authenticates selected characters.

The logical adapter in `sim/training-inventory.ts` transcribes the inventory
branch selected by manual action 4 in original `Controls&Movement.s`: `turn_right`
window 1 copies the selected entry into empty `inven_using`, calls `remove_item`,
then recalculates weight. `copy_item` copies the complete long. `remove_item`
copies successors forward until the first empty successor and clears only the
final ID byte, preserving that entry's remaining three bytes. If the immediate
successor is empty, selection decrements once when positive; otherwise selection
stays at the chosen slot. For a non-full contiguous prefix the post-weight
selection test cannot decrement again. The adapter requires thirty carried
entries, ten separate actions, empty equipment, a nonempty prefix shorter than
thirty, no later nonempty entries and an occupied selected slot. Full storage,
holes and empty selections refuse atomically. Unknown tails, actions and all
untouched slots remain intact; there is no normalization.

These generic transfer deductions follow source inspection for this concrete
command. They extend beyond the three CPU-observed arrangements in
[the observation](backpack-empty-equipment-observation.md). The deliberately
narrow [existing pure helper](backpack-empty-equipment-contract.md) remains
unchanged and is not invoked to grant authority to actual selected characters.
The new adapter models no original actor pointer, controller, padding, stored
count, pending action, redraw or feedback timer. Its selection is a logical
overlay field, rather than an assertion about an initialized original pointer.
No new original CPU observation or natural gameplay caller is claimed.

Weight uses accepted `computeSourceWeight`: scan equipment plus thirty carried
entries, unsigned item weights, count multiplication for categories 4/21/23,
unsigned division by 140 and signed-word physique comparison. Spell effects are
absent. Unavailable arithmetic rejects the whole candidate. Moving an unchanged
entry preserves total weight; this invariant is checked after transfer. Grenade
`usingGrenade` is arithmetic metadata from the accepted weight helper only; it
does not activate or consume an item. There are no weight effects on navigation.

## Recovery and cancellation

The separate `hired-guns-training-session` wrapper is now version 2. Its exact
fields are `format`, `version`, `sources`, `indices`, `commands`, `checkpoint`.
Commands have exactly `{ actor, slot }`, integers in 0..3 and 0..29. The array is
dense, has at most four entries, and cannot name an actor twice. Replay starts
from the reverified immutable initialization, validates each selected occupied
slot and empty equipment, and derives every inventory byte and weight. Version 1
keeps its original exact fields and migrates by reconstructing an empty command
log; the input save is never modified. Other versions, extra fields, malformed,
duplicate/conflicting commands, bad choices, wrong sources and unavailable
transfers reject. The existing 24 KiB wrapper and 16 KiB nested checkpoint bounds
remain. World/checkpoint schema 3 and roster-plan version 1 are unchanged.

Recovery exposes the reconstructed inventory/team and validated world as one
candidate. The browser installs both synchronously only when its generation is
current, paused. Equip shares the same cancellation generation but retains the
current navigation world: reconstruction's fresh world is only a validation
candidate. While a command is pending, further equip and navigation are blocked.
Retry, rule changes, selection changes, source/map changes and new save/restore
operations invalidate stale completions. Late file reads or genuine hash results
cannot resurrect the overlay. Rejected recovery preserves the working world and
inventory while pausing. This is session recovery for static navigation, with no
environmental save claim.

## Validation and limits

Public unit cases use authored data without original-positive identities. They
cover four-byte copying, forward compaction, ID-only clearing, retained empty
tails/actions, sole/last selection, multiplier/grenade arithmetic, strict command
bounds and atomic refusal. Public browser checks confirm no inventory command
without an applied verified session. Opt-in exact-source unit and actual browser
checks cover four actors, initial binding, paused choose/equip, further-equip
refusal, independence, full overlay bytes and weights, navigation, complete world,
mission/tick/RNG recovery, retry/rule resets, version-1 compatibility, malformed
commands, wrong sources and delayed real hashing across cancellation paths.

```powershell
npm run check
npx playwright test --config .local/playwright.config.ts
# With the three private source environment variables from training-session.md:
npx vitest run tests/training-inventory.test.ts tests/training-session.test.ts
npx playwright test --config .local/playwright.config.ts tests/browser/training-inventory.spec.ts
npx playwright test --config .local/playwright.config.ts tests/browser/training-session.spec.ts tests/browser/extraction.spec.ts
```

Private originals/configuration/results remain ignored. No firing, grenade use,
consumption, weapon activation, action 3/unequip, occupied exchange, drop, damage,
hazards, world/stat effects, renderer/art/engine/campaign or controller work is
included. Original campaign-loader fidelity is not a prerequisite for this
standalone adapter. Physical controllers, TV and full original level acceptance
remain separate. The coordinator assigns independent current-head HIGH save and
simulation review and owns integration; this implementation does not self-approve,
merge or retry automatic review. Requested Sol6.1 medium; actual runtime model,
effort and token usage are unavailable. One implementation batch; no delegation.

One next nomination, **unstarted**: physical controller/TV acceptance of the
selected-team session with paused equip, navigation and save/restore on the event
PC. No successor implementation is started here.
