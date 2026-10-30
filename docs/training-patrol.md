# Authored gate patrol

This is one deterministic target in the current four-view application's existing
gate practice. It is AUTHORED policy, not original enemy AI or a completed level.
No source weapon arithmetic, world schema, renderer, physics or health helper changes.

Load the local ready Training43 test, set up button/gate practice, then add the
patrolling target while paused at tick zero. If gate practice has already run or
has item history, Retry it first. Patrol setup starts the canonical closed gate,
selected team starts and original source inventory, with the existing separate
full-magazine encounter for slot 1. The overhead placeholder shows actual collision
cells: N is the active target, 1–4 the players, # blocked, / open gate and C panel.
The four views retain their existing placeholder rendering; NPC geometry is shown
in the overhead display, not added to the 3D renderer.

Start navigation. C activates the front-cell panel; 1–4 assigns WASD, W/S moves
forward/back, A/D sidesteps, Q/E turns and Esc pauses. F designates this same patrol
target regardless of position; T chooses a deliberate miss. This retains the
accepted nonspatial dummy/miss policy, source-bound gun/ammo/cooldown/damage and
saturating health exactly. It adds no aim, range, line of sight, random hits, player
attacks, enemy attacks, player damage, corpse or original lifecycle claim.
Zero health marks the target defeated, stops its route/counter and releases all
NPC occupancy immediately. Later fire still uses the existing gun policy. Arm/R
is unavailable in patrol; Retry resets the whole scenario and loadout.

The fixed adjacent route is (3,5,1), (4,5,1), (5,5,1), (6,5,1), (7,5,1), crossing
the actual gate. Initial index 0, east direction +1, counter 0, health 100000 and
active lifecycle are canonical. Every 16 accepted world ticks attempts one cell.
At an endpoint, closed gate/wall or currently occupied player cell, the target
reverses and waits another full cadence. The visible refusal distinguishes player
from gate/wall; successful movement or endpoint reversal clears it. No RNG is used.
Pause, terminal worlds and rejected prospective ticks/events advance nothing.

Current NPC cell and its successful next destination reserve before stable-ID
player movement. Players cannot enter either, even while the NPC vacates; NPCs
cannot enter player cells occupied at tick start. Swaps and following into vacated
cells refuse. Closure checks include NPC current/destination plus all player current
and prospective cells. This intentionally conservative interlock may refuse a close
for a player destination that is subsequently blocked by the NPC. Opening permits
the next scheduled patrol attempt; a closed-gate attempt on the opening tick still
reverses. Gate changes, collision, world and patrol install as one candidate.

Exact v10 adds `scenario: authored-gate-patrol-v1` and an exact `patrol` receipt
containing version, fixture, history, routeIndex, direction, counter and blocked.
Coordinates/route geometry cannot be supplied by saves. Root encounter, gate words,
inventory commands and schema-3 checkpoint are comparison receipts. Restore rehashes
raw OCS roster/items, recreates canonical geometry/starts, then chronologically
replays all accepted ticks, activations, player commands, item changes and F/T
events. Complete world, gate, patrol, encounter and inventory must match. Encounters
are not merely range-validated snapshots in this scenario. Source labels grant no
authority. Save, item changes and restore reverify raw sources before installation.

Patrol history is capped at 128 events and 45000 ticks; adjacent waits compress
without dropping information. Gate history remains its deterministic event
subsequence, excluding F/T. Outer UTF-8 <24 KiB and nested checkpoint <16 KiB bounds
are unchanged; complete prospective candidates must fit before any live commit.
Exhaustion pauses and retains the previous state. Generation guards cancel stale
setup/save/restore/item work after Retry, source clear, new Apply or mode changes.
Open, closed, active and defeated scenarios restore paused. Retry resets NPC,
gate, world, inventory and encounter. A v9 restore removes the optional patrol;
legacy v1–v9 fields and validation remain unchanged. Ground/v8 and selected fall/v7
still require a fresh Training43 Apply; no historical fall is recalculated.

Tests include an independent integer route oracle, same-tick reservations, closure,
player blocking, defeat/released cells, immutable refused budgets and malformed
history. Ignored exact-source tests and actual production browser tests cover v10
receipts, firing/miss/defeat, keyboard collision/selection, pause, Retry, recovery,
tampering, size/history limits, cancellation and existing test-bed regressions.
Independent HIGH review, current CI, completed automatic review, resolved findings
and coordinator integration remain required. Training43 and the test bed remain
incomplete; original AI, combat and full-level acceptance are still open.
