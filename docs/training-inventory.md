# Paused Training43 equip and return to backpack

In an explicitly applied selected-team Training43 session, pause and choose an
occupied carried slot for **Equip**. Inspect its item name and full four-byte
entry. Then choose an insertion position and **Return to backpack**. Each of the
four mercenaries independently permits one equip followed by one return, at most
eight commands total. Completed cycles disable both buttons until Retry, rule
restart or a new Apply. Empty equipment cannot return. Running navigation and
pending reconstruction disable commands. Equipment names, raw bytes, freshly
verified current weight and all thirty carried entries remain inspectable; the
initial-team summaries remain immutable.

Return positions are occupied carried slots (insertion before that entry), with
position zero additionally supported when the carried prefix is empty. Front is
always available for a supported prefix. The selected range is therefore
`0..max(0, occupiedPrefixLength - 1)` for a contiguous prefix shorter than thirty.
Appending after the last occupied entry is not exposed. Full storage, holes,
invalid positions and unavailable arithmetic refuse without mutation.

## Binding and source deduction

This standalone explicit-import adaptation starts on accepted PR88 merge
`13f657051dda6a0f2d8293823379a9168a676af4`. Every command snapshots and rehashes
raw roster/items, reparses names/arithmetic and rebuilds the complete overlay from
`initializeOriginalTeam`. The exact verified OCS pair authenticates initialization;
editable item metadata and synthetic ID patterns supply no authority. Initial
team, item table and installed overlay are detached and recursively frozen.
Original campaign-loader fidelity is not a gate for this explicit-import adapter.

Equip retains the accepted action-4 source transcription: copy the selected full
entry to empty equipment, compact occupied successors forward, clear only the
final occupied ID and retain empty tails/actions. Last/sole removal retains its
accepted logical selection adjustment.

Return transcribes original `Controls&Movement.s` ACTION3 inventory branch
(`turn_left`, window one) and `insert_item`. After the occupied-equipment test,
insertion tests the final carried ID for capacity. The loop copies full longs
backward from slot 28 to 29 down through the selected position to its successor,
including every empty tail. The former slot 29 is overwritten exactly as in the
source, never normalized. Then the full four-byte equipment entry replaces the
selected carried entry and only equipment's ID clears: damage, ammo and fourth
byte survive. Actions and carried entries before the insertion position remain
unchanged. Logical selection stays at the insertion position. The original loop
always copies slot 28 before comparing its target, so slot 29 is never an adapter
target. Restricting nonempty selection to occupied positions follows the carried
selection domain; zero also handles an emptied backpack after sole-item equip.

These are generic source deductions for this command, beyond the two authored
CPU observations at selections zero and one. See the accepted
[insertion observation](backpack-action3-insertion-observation.md),
[selection-one observation](backpack-action3-selection1-observation.md),
[insertion contract](backpack-action3-insertion-contract.md) and
[no-room observation](backpack-action3-no-room-observation.md). Their deliberately
narrow ID1/2/equipment3 and stored-count fixtures neither authenticate nor constrain
actual selected actors. Their helpers stay unchanged and are not invoked here.
No new original CPU observation, actor pointer, physical control binding, padding,
stored count, count repair, pending action or feedback authority is claimed.

Fresh weight uses accepted `computeSourceWeight` over equipment and all thirty
carried entries, raw verified item weights/categories, count multipliers,
unsigned division by 140 and signed-word physique comparison. Unavailable results
reject the whole candidate. Transfers conserve total weight, checked before and
after. Grenade-use is arithmetic metadata only; return recalculates it after
clearing equipment. No use, firing, consumption or movement-weight effect follows.

## Recovery and cancellation

The separate `hired-guns-training-session` wrapper exports version 3, with exact
fields `format`, `version`, `sources`, `indices`, `commands`, `checkpoint`. The
dense command array has at most eight entries, each exactly
`{ kind: 'equip' | 'return', actor, slot }`. Actor is integer 0..3; equip slot is
integer 0..29 and return slot 0..28, further restricted by replay's current prefix.
Each actor must equip once before returning once. Unknown kind, duplicates,
conflicts, return before equip, third action and extra/missing fields reject.
Empty logs are valid. Version 1 keeps its prior exact fields and reconstructs
initial inventory. Version 2 retains only its exact bounded `{ actor, slot }`
equip log, at most four unique actors, migrated to typed equips. Old saves are
never mutated. Other versions reject. Wrapper size remains below 24 KiB and
nested checkpoint below 16 KiB. World/checkpoint 3 and roster-plan 1 stay unchanged.

No arbitrary serialized inventory is trusted. Sources, choices and commands are
snapshotted before asynchronous work, then verified initialization plus replay
reconstructs every byte and weight. Export snapshots the command log before any
hashing. Recovery validates the complete nested world/map and source identities;
the browser installs team, overlay and world synchronously only at the current
generation, paused. Equip/return share this generation guard and retain the
current navigation world: their freshly constructed world is validation only.

Retry and rule restart reset both world and inventory cycle to initial state.
Source/map clear or replacement clears the session. Preparation changes cancel
pending work and retain the applied session. New Apply, save/restore, malformed
team-plan attempts and existing map cancellation paths retain PR84/PR88 guards.
Late genuine digest completions cannot resurrect a cancelled return or recovery.
Rejected recovery preserves the working team/overlay/world while pausing. This
covers static navigation only, with no environmental recovery claim.

## Validation and limits

Public tests use synthetic data/refusal only. Exhaustive authored prefix/position
cases check complete backward copies, nonzero empty tails, full storage, ID-only
clearing, untouched actions, invalid range, unavailable weight and atomic failure.
Strict typed command tests cover bounds, density, order and eight-command limit.
Opt-in exact-source tests exercise actual selected actors, full byte/weight
oracles, immutable initialization, all-four independence, paused equip/return,
completed-cycle refusal, navigation, full overlay/world/mission/tick/RNG recovery,
v1/v2 compatibility, malformed kinds/orders/bounds and source mismatch. Delayed
real hashing exercises equip/return/restore cancellation across selection, retry,
rules, source/map changes and new Apply; retained PR84/PR88 races and Training43
all-four extraction also run.

```powershell
npm run check
npx playwright test --config .local/playwright.config.ts
# With the three genuine private source variables from training-session.md:
npx vitest run tests/training-inventory.test.ts tests/training-session.test.ts
npx playwright test --config .local/playwright.config.ts tests/browser/training-inventory.spec.ts tests/browser/training-session.spec.ts tests/browser/extraction.spec.ts
npx tsx .local/byte-oracle.ts
```

Private originals, source-derived scripts/results and screenshots remain ignored;
strict local browser port is 5197. No occupied exchange, use/firing/consumption,
drop, damage, hazards, actual death/occupancy/pads/corpses, art/engine/renderer or
campaign change is included. No hardware, TV or full-level acceptance is claimed.
Coordinator assigns independent current-head HIGH simulation/save review, CI and
completed automatic-review disposition and owns merge. This worker does not
self-approve, merge, retrigger automatic review or delegate. Requested Sol6.1
medium; actual runtime model/effort and token metadata unavailable. One bounded
implementation batch; attempt and evidence receipts live in the ignored handoff.

One next nomination, **unstarted**: physical controller/TV acceptance of the
selected-team equip/return, navigation and recovery on the event PC. No successor
implementation has started.
