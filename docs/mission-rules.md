# Bounded extraction rules

`createWorld(level, seed?, rules = missionRulesForLevel(level))` now creates a
world with schema 2 and explicit mission state. Rules are checked against the
profile for the current source revision. The exact locally verified Training43
editor digest enables a limit of 99; the newly authored extraction fixture
enables a limit of 2. Other revisions retain navigation mode. Explicit navigation
is available even on a profiled level and carries no timer, exits or winner.
Profiles do not establish complete original gameplay compatibility.

The three modes are:

- `navigation`: existing conservative movement; exit blocks remain obstacles.
- `cooperative-extraction`: all four mercenaries must retire through exits;
  winner remains null.
- `first-exit`: any mercenary exit completes the mission; among simultaneous
  exits the lowest ID wins, following the source's player1-to-player4 scan.

All four mercenaries are alive in this bounded simulation. No combat, deaths,
inventory, dynamic doors, buttons, lifts, monsters or other mission mechanics
are added. First-exit is the source alive-only race case, not a full simulation
of the original action-mode participant/death rules. Campaign travel remains
disabled because the editor/runtime graph revision mismatch is unresolved.

## Exit and occupancy

A movement attempt toward a cell with `block_here` set and block type 3 retires
the actor. The header's exit coordinate is not the activation condition. The
actor stays at its supported approach position rather than entering the exit
block. Retired actors ignore further commands and no longer occupy the grid.
Other active actors may occupy a previously retired actor's saved position;
retired actor positions can overlap each other too.

Commands are validated atomically and processed in stable mercenary ID order.
Every command in the current tick is processed before outcome resolution,
including simultaneous first-exit attempts. To retain the navigation model's
occupied-at-start rule, an actor retiring during this tick releases its approach
cell for other actors on the **next** tick. This is a conservative explicit
deviation from the source's sequential head-map updates, not an original timing
parity claim. Already-retired actors never block movement.

`Controls&Movement.s` around 4820–4870 identifies exit block type 3 during a bump
and sets `window_type` to 7 without taking the normal moved-position branch.
Its `put_head_in_map` around 8261 skips window type 7, supporting retired actors'
removal from occupancy. These sources are locally retained outside Git.

## Countdown and outcome

The serialized source clock is `{tens, units, subticks}`. It begins at
`floor(timeLimit/10), timeLimit%10, 600`. Each logical simulation tick decrements
subticks. It visits zero, then the following decrement resets it to 600 and
borrows one decimal unit, with decimal tens borrow as needed. There are exactly
**601 logical ticks per displayed unit**, not 600. The implementation computes
the equivalent integer counters from elapsed ticks, avoiding accumulated drift.

| Limit | Tick | Tens | Units | Subticks |
|---:|---:|---:|---:|---:|
| 2 | 0 | 0 | 2 | 600 |
| 2 | 600 | 0 | 2 | 0 |
| 2 | 601 | 0 | 1 | 600 |
| 2 | 1201 | 0 | 1 | 0 |
| 2 | 1202 | 0 | 0 | 600 |
| 99 | 6010 | 8 | 9 | 600 |
| 99 | 59499 | 0 | 0 | 600 |

Initialization follows `Main.s` 5291–5305; integer decrement/borrow follows
`ColdStartup.s` 1422–1450, called from the action-game vblank path around
784–828. Some source comments describe time units differently. The browser
currently advances this candidate counter once per 50 Hz logical tick. This
preserves the inspected counter sequence; it does **not** establish original
wall-clock parity, interrupt cadence under all original modes, or display
animation timing. Suspension/catch-up behavior follows the existing fixed clock.

After processing commands, reaching zero tens and units fails the mission,
including when the final required exits occur on that same tick. Timeout takes
precedence over success, following `Main.s` `check_exit` around 379–497. A
synthetic limit of 2 therefore expires at tick1202; Training43's limit of 99 at
tick59499. First-exit completion sets the winner; cooperative completion and
failure retain a null winner.

Events include `exited` for each retired actor, `complete` for the first-exit
winner or last cooperative actor processed, and `failed` with actor ID0 for clock
expiry. Existing movement/turn/block events remain. Terminal worlds return an
unchanged fresh snapshot and no further events; their tick and countdown stop.
Retry uses a new `createWorld` with the selected rules, resetting exits, outcome,
clock and positions. RNG remains explicit and presentation does not consume it.

## Verification record

Synthetic tests cover source counter boundaries and decimal borrow, exact rule
allowlists, header-independent block exits, retirement without movement,
next-tick occupancy release, stable simultaneous commands/winner, cooperative
all-four completion, timeout priority, terminal freeze, retry and mission
checkpoint continuation. Public fixtures contain no original map content.

Implementation model: gpt-6.1-sol; one bounded implementation attempt, one
TypeScript test-helper correction after compiler feedback. `npm ci` and
`npm run check` passed (40 tests total). Aggregate token usage unavailable.
Original-level route and browser integration evidence are coordinated separately;
this unit suite does not claim original mission parity or physical playtesting.
