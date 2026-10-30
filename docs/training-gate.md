# Authored keyboard button / static gate practice

Load the ready-to-play Training43 test, then **Set up button / gate practice with
current team**. Setup stays in the guided four-view app and opens paused. It uses
the same verified selected team and current inventory in a canonical authored
arena, with placeholder geometry. This is not original Training43 machinery or
original-map runtime parity. Training43 type-zero signs and zero-position door
slots remain inactive.

1. Start navigation. Slot 1 begins at 4,4,1 facing east toward the panel at 5,4,1.
2. D steps south to the gate lane; W tries the closed gate at 5,5,1 and blocks.
   A steps north again. C activates the front-cell panel and opens the gate.
3. D then W walks onto the open gate. Press 2, then C: slot 2 starts east of the
   panel facing west, and closure refuses while slot 1 occupies the gate.
4. Press 1, W to vacate east. Press 2, C to close. Press 1, S: the gate blocks
   again. Esc pauses; Save checkpoint pauses automatically.

Numbers 1-4 select the WASD actor. The selected view shows panel proximity and
gate state. The gate card shows actor/cell, running/paused, occupancy and activation
before/after or refusal. C uses a physical key edge: held/repeated keydown and a
pause/start boundary cannot repeatedly toggle. Keyup releases the edge; blur pauses
and clears it. C requires running, an available renderer, active static world,
WASD assignment and the exact panel in front. Item/weapon use is not composed with C.

## Simulation and collision

`transitionButtonBlock` is reused unchanged. The canonical fixture uses type 1/2,
actionOut 5 / actionIn 4 and the map-structure-relative target pointer. The accepted
core's action 0/6 support is unchanged; the live fixture does not expose configurable
actions. Unsupported actions, special/aliased targets and next-plane cleanup remain
core refusals; saves cannot replace fixture parameters.

Each activation snapshots panel word, target, discovery and next-plane discovery
from one effective level. Static actors have one cell footprint in the existing
world; no interpolated render position owns collision. Occupancy includes all four
actual current actor cells and successful movement destinations from the same
tick's command batch under that snapshot. A closing operation cannot occupy a
current or reserved actor cell, including a current occupant vacating this tick.
This is an **authored closure interlock**, distinct from the original block-on routine.

Only an accepted immutable candidate replaces panel/target/discovery together.
The unchanged renderer receives the same candidate words as collision before the
session/world install. Refusal leaves those words and rendering unchanged. Imported
base data is never mutated. High unknown bits survive opening and closing. No
moving doors, timers, pads, lifts, water, death, enemies, graphics or audio are added.

## Recovery and mode boundaries

[Training session v9](training-session.md) rebuilds a complete candidate from
canonical arena, exact raw sources and bounded chronological events. Events include
movement batches, compressed waits, activation actor plus same-tick movement, and
paused equip/exchange/return. Even an occupied/away activation records its tick;
it does not reverse the panel. All saved word receipts and the complete checkpoint
must equal replay. Arbitrary serialized geometry, action data, actor positions,
reservations or occupancy are never trusted as fixture authority.

Maximum 128 events / 45000 ticks (15 minutes at prototype 50 Hz), <24 KiB outer
save and <16 KiB nested checkpoint. A rejected prospective tick/operation does not
install partial state. Retry closes the gate and resets history, team positions,
inventory and separate encounter. Open/closed recovery is paused. Source clear or
a newly applied team clears gate mode; generation guards discard stale verification.
Legacy v1-v8 stay in their matching modes with no gate state.

Gate practice supports interleaved current inventory and the independently
validated isolated encounter. Ground-cache and selected-fall mode require reopening
Training43 and a fresh Apply (or the ready preset); they cannot silently mix with
gate history. No changed block/weight is used to recalculate an earlier fall.

Public synthetic tests cover traversal, occupancy/reservations, unknown bits,
chronological items, malformed fields, history/tick bounds and immutable inputs.
Opt-in private-source tests cover v9 recovery, wrong fixture/source/words/history/
checkpoint, canonical geometry and snapshot races. Actual production browser tests
exercise C and movement, selection/pause/held key, open/closed save/retry/restore,
mixed inventory/encounter, cancellation and mode exclusion. Originals and screenshots
remain local/ignored. Final release still requires the coordinator's independent
HIGH review, current CI, completed automatic review and resolved findings.
