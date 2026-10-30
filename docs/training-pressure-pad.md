# Authored pressure pad / timed door extraction

Load the ready-to-play local Training43 test, then choose **Start pressure pad /
timed door challenge** beside the existing door controls. This is the same
authored patrol/extraction arena with the verified selected team, inventory,
gun, objective lock, clock and Retry workflow. It starts paused. V13 is opt-in;
the existing v1–v12 modes and save shapes remain available.

Start mission. Slot 1 faces east: **D** steps south onto **P (4,5,1)**. Wait for
**WALK THROUGH**, then **W** enters the door and another **W** vacates it.
Stepping off P requests close. Standing still, turning, blocked movement and
held input without a successful cell change do not press again. The status
beside the door shows occupants and the last derived press/release action;
the existing overhead marks P when empty and the occupant number when occupied.
C and the labelled Open/Close/Toggle/Lock/Unlock buttons remain manual alternatives.

For a complete pad-driven keyboard win without C: defeat the designated target
with F, allowing cooldown between shots, then use these routes without turning.

| Selected slot | Keys from canonical start |
| --- | --- |
| 1 | D, wait for WALK THROUGH on P, W four times |
| 2 | A, S twice |
| 3 | W, D, W onto P, wait for WALK THROUGH, D four times |
| 4 | W twice, D |

Each final key bumps the unlocked E at (8,5). Extracted actors retire. Esc pauses;
Y retries after win/timeout. A live NPC physically reserves P and can block entry;
it never enters this adapter's activation path. Defeat it or wait for it to leave.

## Source deduction and authored boundary

Local `Controls&Movement.s` successful player `.moved` path at4872–4889 calls
`check_pad_released` then `check_pad_pushed`. The implementations at6435–6473
and6482–6519 mask `keep_floor` (`0x601`) and require exactly floorpresent plus
floorcode1 (`0x201`). They then subtract ONEPLANE (529 LONG cells) and extract
variant bits23–27 from that preceding-plane descriptor, multiply by28 and select
the button row. Press calls action_IN/data_IN, release action_OUT/data_OUT through
`do_button_action`; redraw is requested after the action. There is no wall-panel
reversed action/type flip or aggregate pressure-count test in these branches.

This canonical fixture has raw floor word `0x80000201` at cell648 (4,5,1), and
descriptor `0x81800042` at119, selecting row3. The authored 32×28-byte button table
retains unused bytes (`used=0x81`, padding byte `0xa5`); these are not eligibility.
Row3 selects press14/open and release15/close with LONG datum9616 for both.
Equates button layouts and the map importer identify9616 as the **map-relative
door-table record offset**, not cell648/649 or map_data1+cell×4. The existing
canonical first door record separately binds map-data cell649 at position2596.
Door action handlers at7133 onward add the map base to that table datum.
Saved labels, occupancy, receipts and arbitrary action data never select a target.

Generic traversal continues rejecting source pad floor codes. Only this canonical
authored variant projects the pad's floor-code bits to ordinary standing floor
for collision/checkpoint validation, retaining other bits. The canonical raw map
is checked exactly at setup/recovery and used for action binding; the projected
snapshot is not pad authority. No original Training43 cells or records change.

Only successful authored player cell transitions activate here, in stable actor
ID order, with each old release before its new press. Explicit manual input is
applied first, then those pad edges, then **one** existing door counter/scheduler
step. Action-only helper calls use counter0 to apply the ordered triggers; the
real accepted-tick counter is consumed once. Latest explicit action replaces a
deferred action. No additional replay events are appended for derived pad edges.
No input chronology, source helper arithmetic, delay or sound handling changes.

The previous conservative door interlock still reserves all player current and
accepted destinations, including vacating actors, plus the NPC current/destination.
Blocked closure freezes the complete prior record/word/counter and retains the
request. A player releasing P into the doorway can finish crossing safely. This
protection and tick clock are authored adaptations; CPU/original-runtime timing,
pad depression animation, audio, pushable, corpse/death, grenade, mine, wet and
fall-trigger integration are not claimed. The source comment at6657 is broader
than this adapter; `Main.s`4095–4096 is a player-fall caller, not NPC eligibility.

## Recovery and limits

V13 uses `authored-pressure-pad-extraction-v1`. Gate state adds
`pad:{occupants,lastActions}`; lastActions is the most recent nonempty batch of
derived `{actor,edge,index,action,datum}` receipts, at most eight per tick. It is
not appended on idle ticks. Occupants are recomputed from accepted player poses;
they do not suppress source branches or authorize actions.

Rehash/reparse the exact roster/item bytes, rebuild the canonical raw geometry,
button table and door record, and replay accepted movement/manual/item/F/T/wait
events in order. Compare the complete session and nested checkpoint, including
pad receipts, door/interlock/counter, gate, NPC, gun, inventory, mission and world.
Tampered floor/descriptor, history/order, source identities and receipts are refused.
Caller inputs are detached before the first await across setup, save, restore and
inventory rebuilding. Generation cancellation covers Retry, selection, source
clear, new Apply and mode changes. Restore installs the full candidate paused.

The existing128-event,45000-tick, <24KiB outer/<16KiB nested limits remain exact.
Prospective ticks, pad edges, manual actions, F/T and items validate the complete
candidate before installation. Budget refusal and failed restore preserve all
working state apart from pause. No lossy/truncated history or larger budget is used.

This is one playable authored interaction. Training43 and the whole test bed
remain incomplete; original pad machinery stays inactive.
