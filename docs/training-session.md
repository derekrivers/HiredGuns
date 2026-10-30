# Standalone selected-team Training43 session

The browser can now apply four explicitly chosen characters to the exact locally
imported Training43 map. Open the local map, open the verified OCS Characters
and Items files, choose four different characters, then use **Apply team to
Training43**. Apply starts a fresh cooperative mission **paused**. Review control
assignments and press **Start mission**. Retry and rule changes also pause first.
No original team is selected automatically.

Each viewport shows its corresponding chosen character name. The session summary
below the views shows the ordered character identities, initial fitness, physique,
agility and weight. Expand a character to inspect all initial stats, cleared
equipment, thirty carried entries and the separate action entries. These are
immutable session data from `initializeOriginalTeam`: fitness starts at 65535,
ten carried entries copy from the source and twenty clear. A separate
[paused inventory overlay](training-inventory.md) now supports repeated
carried-to-empty-equipment transfers, occupied equipment exchanges, and returns to backpack per actor,
within a shared visible 128-operation session budget. Weight effects on movement remain
unavailable. The initial data in these summaries stays immutable. Changing
preparation choices
leaves an already applied team intact; Apply explicitly replaces it and restarts
the mission. Restoring a session uses the saved order independently of any current
preparation choices.

This is a standalone imported session adaptation. The existing importer and
verified initializer provide its authority. It establishes neither original CPU
startup parity, complete original level behavior nor campaign loading. It does
not depend on resolving the original campaign selector or Locations revision.
Navigation remains the existing static world: water, falls, environmental damage,
world combat, general inventory use, death/control transfer, dynamic occupancy, pads and
corpses are not enabled by this session. A separate
[authored gun encounter](training-encounter.md) now exercises source-derived gun
arithmetic in the same app with isolated authored ammo and a dummy/miss policy.

## Sources and authority

The browser only supplies levels produced by the existing explicit local map
importer. The session module snapshots that level and requires its editor-map
identity to match `TRAINING_43_SHA256` in `sim/mission-profile.ts`. The existing
checkpoint validator binds every level field, including its complete layers and
starts, to the saved world. It rejects recovery against altered map content even
when a caller retains the old source label. A source label alone is not an
alternative map importer.

Both roster and items are copied before asynchronous work and passed as raw
bytes to `initializeOriginalTeam`. That initializer rehashes and reparses them;
editable catalog fields cannot grant authority. Names are reparsed from the same
copied roster. Only the exact OCS pair is accepted; a recognized CD32 roster is
insufficient. Canonical indices must be four distinct integers in 0 through 11,
in the user's order. Source pins remain in the existing modules:

- Training43: `sim/mission-profile.ts`, SHA-256
  `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c`.
- OCS roster: `import/original-team.ts`, SHA-256
  `79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439`.
- OCS items: `import/items.ts`, SHA-256
  `633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc`.

See [character-format.md](character-format.md), [item-format.md](item-format.md)
and [live-character-contract.md](live-character-contract.md) for the existing
formats and initializer limits. Original files and source-derived output stay
local and ignored.

## Recovery and cancellation

**Save checkpoint** pauses and exports a separate
`hired-guns-training-session` version 5 wrapper when a selected team is active
and its encounter is inactive. An active
[authored encounter](training-encounter.md) uses exact version 6 with a complete
validated authored snapshot, rebound gun and actor association; source inventory
still uses the same bounded replay. Legacy v1-v5 restore with the encounter inactive.
The wrapper contains the three source identities, four indices, a bounded
`commands` array (at most 128 equip/exchange/return operations total), and the existing validated
checkpoint string. It contains no roster, map words, arbitrary inventory storage
or new environmental counters. Version 1 wrappers remain accepted and reconstruct
the initial empty equipment with no commands. Version 2 accepts only its exact prior
`{ actor, slot }` equip commands and migrates them to typed equip commands. Version 3
requires exact `{ kind, actor, slot }` commands with kind `equip` or `return`;
return-before-equip, duplicate actions, third actions and unknown kinds reject.
Version 4 retains repeated per-actor equip/return alternation within the total budget.
Version 5 adds occupied exchanges between equip and return, independently per actor;
exchanges in legacy v1-v4 wrappers reject. Each exchange swaps complete four-byte
entries without shifting carried storage or changing total weight. It is a
standalone source deduction; the narrow original action-4 diagnostic stays unchanged.
Version 3 retains its original max-eight one-cycle rules, including third-action
refusal. Retry, rule restart and new Apply reset the budget; exhaustion disables
all inventory commands with visible remaining/exhausted status. Each browser command validates
a prospective save against the current paused world before committing. No accumulated
tails or history are normalized, truncated or reset between cycles.
Old saves are never modified. World/checkpoint schema 3 is unchanged.
The wrapper must be smaller than 24 KiB; the nested checkpoint retains its own
16 KiB bound.

To recover after reloading, reopen the same map and exact OCS roster/items, then
load the session save. No prior Apply is required. Recovery reconstructs the
immutable initial team deterministically, replays the strict typed inventory log to rebuild
the detached inventory overlay, validates exact wrapper fields and
identities, and validates the complete nested world before exposing a candidate.
The browser installs team, encounter and world together only if the operation generation
is still current. Recovery remains paused and preserves actor poses, mission,
tick and RNG. Malformed data, invalid indices, absent/changed sources or wrong
map leave the working world and team intact, apart from pausing navigation.

Starting a map or roster/item replacement, even a subsequently rejected file,
pauses and clears the active session before reading. Clearing items also clears
the team. The previous world can remain as ordinary static navigation while
paused. Retry and rule changes reset the overlay to initialization as they restart
the
world. New operations and changed preparation choices
invalidate pending browser operations. Stale completion cannot install a team,
world, inventory overlay or download. Equip and return use this same generation guard;
a cancelled reconstruction cannot replace inventory after retry, rule/selection
changes, source clearing/replacement or map changes. Source import generations
also reject replaced reads; manual
selection cancels an outstanding team-plan read. Source byte snapshots and
checkpoint snapshots prevent caller mutation during hashing.

Without an active selected team, existing legacy and schema-3 checkpoint handling
is retained. While a team is active, a plain checkpoint is refused: it cannot
silently restore poses while retaining stale selected-team data. Reopening a map
clears the session and permits legacy recovery again. Team-plan files remain
preparation-only and are separate from session saves.

## Validation

Public tests use synthetic/unverified inputs only. They check session refusal,
strict wrapper shape/size, no input mutation and continued ordinary checkpoint
recovery. Positive session tests are opt-in and use the exact original hashes;
no test substitutes a synthetic map or roster identity for verified authority.

```powershell
npm run check
npm run test:browser
# Set all three to local, ignored original inputs for the opt-in checks:
$env:HIRED_GUNS_TRAINING_MAP = '<local verified editor map>'
$env:HIRED_GUNS_CHARACTERS = '<local verified raw OCS roster>'
$env:HIRED_GUNS_ITEMS = '<local verified raw OCS item table>'
npx vitest run tests/training-session.test.ts
npx playwright test tests/browser/training-session.spec.ts
```

The local unit checks compare against the accepted initializer, prove ordered,
detached immutable teams and round-trip complete mission/world state, and reject
changed sources, map content, indices, identity extensions and malformed nested
checkpoints. Browser checks exercise visible selection/apply, actual static
movement and turning, save/change/paused restore, retry, clear/new map, legacy
refusal and recovery without an existing team. Delayed real file reads and real
digest results test cancellation during both phases without replacing hashes.
A delayed real map read also verifies that Retry and rule changes immediately
restore Apply availability on the retained verified map, and that the stale map
result cannot clear a subsequently applied team. Malformed, oversized and
wrong-source team-plan refusals also refresh Apply immediately after cancelling
a pending map import, while retaining the existing choices and matching sources.
Optional screenshots are written only when `HIRED_GUNS_SESSION_SCREENSHOT` names
a private local path. Physical-controller/TV and complete-level acceptance remain
separate.

This is one implementation batch on accepted base
`9f78aac01a0f9b79809e2712cf8674c44a85199f`. Requested implementation model/effort:
Sol 6.1 medium; runtime model/effort selection and token usage are not exposed.
One feature attempt, with evidence-driven encoding, test input/observation and
legacy oversized-file error corrections; no blind repair cycle. Independent current-head HIGH simulation/save review, completed
automatic review/findings resolution and relevant CI are coordinator gates; this
implementation does not approve or merge itself.


Ground-enabled static sessions use the bounded [v8 authored cache replay](training-ground.md). Legacy v1–v7 remain supported. Ground inventory, weight, overlay and movement are reconstructed together from verified initial ownership; selected dry-fall ground actions are unavailable.


## Authored static gate practice (v9)

The [same-app keyboard gate](training-gate.md) starts from a verified selected team
on Training43, preserves current inventory and the separate encounter, and moves
the team to canonical authored geometry. Gate setup is paused. C activates once
per physical press while running, at the controlled actor's front-cell panel.
The four views and collision use the same complete accepted gate candidate.

Exact version 9 adds `scenario: "authored-static-gate-v1"` and
`gate: {version:1,fixture,history,panelWord,overlay}`. Its map identity is
`authored:authored-static-gate-v1`. Unknown or extra fields refuse. The retained
words are comparison receipts only: recovery reconstructs canonical geometry,
rehashes the raw roster/items, replays bounded chronological movement, activation
and item events, and compares every gate word and the complete nested checkpoint
against that result. Inventory commands must also equal the item subsequence.
No serialized geometry, action parameters, cached occupancy or arbitrary world
positions grant authority. The checkpoint binds the final effective collision
map, without changing schema 3. No replay effects touch the live world.

The shared gate history allows 128 events and 45000 ticks (compressed waits).
The outer <24 KiB and nested <16 KiB limits stay unchanged. Every live tick checks
the prospective wrapper budget before install; exhaustion pauses without installing
that tick. Retry resets canonical closed gate, history, positions, initial inventory
and encounter. Open and closed saves restore paused. Generation guards cancel
stale setup, item, save and load operations after reset/source changes/new Apply.
Invalid saves leave the current session, inventory, gate, collision and views intact,
apart from pausing. Legacy v1-v8 retain their exact existing fields and validation;
they open with gate practice inactive and require their matching original mode.

Ground-cache/v8 and selected-fall/v7 stay separate from gate/v9: reopen Training43
and Apply a fresh team (or load the ready preset) to switch modes. Gate setup refuses
an existing ground overlay or fall mode. No past fall is recalculated against new
blocks or inventory weight. Gate item actions retain the independent encounter
without refilling ammo; its existing validator remains the authority for that state.

## Authored gate patrol (v10)

The optional [same-app patrol target](training-patrol.md) extends fresh gate
practice at paused tick zero. Setup explicitly starts canonical gate/team/inventory
and a full authored slot-1 loadout. F uses the accepted nonspatial designated-target
policy and source gun helper; T misses. Zero dummy health stops this authored NPC
and releases occupancy. Arm/R is unavailable; Retry resets the whole scenario.

Exact v10 adds `scenario: "authored-gate-patrol-v1"` and a `patrol` receipt with
exact fields `{version:1,fixture,history,routeIndex,direction,counter,blocked}`.
The map binding stays canonical authored gate geometry. Restore rehashes both raw
sources and chronologically replays accepted ticks, player commands, activations,
item operations and F/T events. Complete patrol, encounter, gate, inventory and
world must match. Route/coordinates and serialized health grant no authority.
Legacy v1-v9 fields and validation stay unchanged; loading v9 removes patrol.

Histories retain all events within 128 records and 45000 ticks, with lossless
adjacent waits. Prospective ticks/F/T events check complete UTF-8 <24 KiB outer
and <16 KiB nested candidates before install. Invalid/budget-refused work mutates
nothing. Save and paused item work reverify the full chronology. Generation guards
cancel stale setup/save/restore/item work after Retry, source clear, new Apply or
mode switch. Open/closed and active/defeated saves restore paused. Ground/fall still
require a fresh Apply; no old fall is recalculated.

## Authored cooperative patrol extraction (v11)

The opt-in [patrol extraction challenge](training-patrol-mission.md) uses a distinct
canonical `authored-patrol-extraction-v1` fixture and the v10 field set. Its fixed
cooperative profile has ten 601-tick source counts. Target defeat derives the exit
unlock; replay binds all gate/NPC/gun/inventory events, exit retirement, outcome and
clock against the nested checkpoint. There is no serialized lock/rule/geometry
shortcut. Restores pause; Y retries terminal outcomes with held/repeat/form guards.
All asynchronous replay inputs are owned before hashing. The same 128-event,
45000-tick, <24 KiB outer and <16 KiB nested limits apply prospectively and atomically.
Matching v9/v10 restores leave challenge mode and recover the navigation arena.
Original Training43/ground/fall workflows and prior save shapes remain unchanged.
