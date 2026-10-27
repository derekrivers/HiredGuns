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
[paused inventory overlay](training-inventory.md) now supports one
carried-to-empty-equipment transfer followed by one return to backpack per actor. Weight effects on movement remain
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
combat, general inventory use, death/control transfer, dynamic occupancy, pads and
corpses are not enabled by this session.

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
`hired-guns-training-session` version 3 wrapper when a selected team is active.
The wrapper contains the three source identities, four indices, a bounded
`commands` array (at most one equip then one return per actor; eight total), and the existing validated
checkpoint string. It contains no roster, map words, arbitrary inventory storage
or new environmental counters. Version 1 wrappers remain accepted and reconstruct
the initial empty equipment with no commands. Version 2 accepts only its exact prior
`{ actor, slot }` equip commands and migrates them to typed equip commands. Version 3
requires exact `{ kind, actor, slot }` commands with kind `equip` or `return`;
return-before-equip, duplicate actions, third actions and unknown kinds reject.
Old saves are never modified. World/checkpoint schema 3 is unchanged.
The wrapper must be smaller than 24 KiB; the nested checkpoint retains its own
16 KiB bound.

To recover after reloading, reopen the same map and exact OCS roster/items, then
load the session save. No prior Apply is required. Recovery reconstructs the
immutable initial team deterministically, replays the strict typed inventory log to rebuild
the detached inventory overlay, validates exact wrapper fields and
identities, and validates the complete nested world before exposing a candidate.
The browser installs team and world together only if the operation generation
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
