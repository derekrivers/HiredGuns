# Mission checkpoints, version 2

`src/sim/checkpoint.ts` provides two browser-compatible asynchronous functions:

```ts
exportCheckpoint(level: LevelData, world: WorldState): Promise<string>
importCheckpoint(level: LevelData, json: string): Promise<WorldState>
```

Export returns compact JSON using the existing `SaveEnvelope` contract:
`{ format: "hired-guns-save", version: 2, levelHash, world }`. Import returns a
fresh state only after validation. Neither operation mutates its level/world
arguments. Each operation snapshots validated input synchronously before its
first asynchronous digest operation, preventing caller mutation during hashing
from producing a mixed checkpoint. Callers should replace their live state only
after the import promise resolves successfully.

Version 2 saves the entire current bounded simulation: world schema 2, level ID,
tick, RNG, four mercenaries and mission rules, outcome, retired/exited flags,
source clock and winner. It contains no original map arrays, artwork, campaign
graph, inventory, monsters, combat, triggers or dynamic doors. Adding persistent
state still requires a reviewed schema/version bump with validation or explicit
migration. Unknown fields reject rather than silently dropping future state.
These checkpoints cover the bounded extraction/navigation model, not complete
original Hired Guns mission saves. See [mission-rules.md](mission-rules.md).

Version 1 navigation envelopes remain readable through explicit migration. Their
world must have schema 1 and exactly its original five fields; a mission field
is rejected. The result has schema 2 and navigation rules with null clock/winner,
active outcome and all exits false. This remains navigation even for Training43
or another currently profiled mission level. Legacy saves never invent elapsed
mission counters or activate mission objectives. Re-export always emits version
2. Unsupported envelope/world versions and mixed schemas reject.

## Level binding

`levelHash` is SHA-256 of the canonical JSON representation of **all current
LevelData fields**. The canonical representation recursively sorts object keys
using JavaScript's lexical string ordering, retains array order and uses JSON
primitive encoding. Hash input is UTF-8; the result is lowercase hexadecimal.
The exact current unsigned layer words, grid dimensions, starts/facings, exit,
source descriptor/digest/revision, schema, ID, name and unsupported-mechanics
list participate. Source SHA-256 and level ID alone are insufficient: editing
geometry while retaining them produces a different checkpoint fingerprint.
Reordering object insertion order produces the same fingerprint. Changing any
array order is significant. No hash is stored in or trusted from the level.

The codec first validates and copies the current level contract. Sizes are
positive safe integers with a safe-integer cell count; exactly three dense
unsigned-32 arrays must match it. Source enums/digest, four bounded starts and
facings, exit coordinates and mechanics strings must have their defined shapes.
Extra or missing contract fields reject. This is structural validation, not
proof that the level implements original Hired Guns mechanics.

The fingerprint prevents accidental loading against different level content.
It is an integrity/compatibility identifier, not a cryptographic signature or a
mechanism to prevent a user editing both the state and its hash.

## Defensive loading

Input must be a string smaller than 16,384 characters **and** smaller than
16,384 UTF-8 bytes. Both checks run before `JSON.parse`; UTF-8 encoding is only
attempted after the character bound passes. Oversized multibyte text therefore
cannot bypass the byte limit. Export enforces the same limit on its output.

The envelope accepts exactly `format`, `version`, `levelHash` and `world`.
Format and a supported version must match exactly, and `levelHash` must be 64 lowercase hex
digits matching the current level. The world accepts exactly `schemaVersion`,
`levelId`, `tick`, `rng`, `mercenaries` and `mission`; its schema is 2 and level ID must
match. Tick is an integer in 0..4294967294 (`MAX_WORLD_TICK - 1`). RNG is an integer in 0..4294967295,
including zero. Mercenaries form a dense array of exactly four entries with
ordered, unique IDs 0,1,2,3. Each entry accepts exactly `id,x,y,z,facing`.
Coordinates must be finite integers inside the grid and facing must be 0..3.
Nulls, primitive replacements, fractions, numeric strings, unsafe integers,
non-finite values, unknown versions and extra/missing fields reject.

The shared navigation limit `MAX_WORLD_TICK` is 4294967295 (`0xffffffff`). A
checkpoint at the last resumable tick, 4294967294, loads and can advance once
safely to that limit. Navigation refuses the next step before changing state;
the UI pauses and offers Reset or loading an earlier checkpoint. The terminal
tick itself cannot be exported or imported as a resumable checkpoint. This
bounded continuation rule prevents safe-integer overflow and frozen tick-based
input repeat; a checkpoint never silently clamps, wraps or resets the clock.

Each mercenary position must pass the same conservative `obstruction()` predicate
as navigation, including boundary, solid/opaque obstruction, unsupported
environment and missing support. Active mercenaries cannot overlap; retired
positions may overlap other retired or active positions, but must still be
supported, bounded and horizontally beside an exit block of source type3.
Navigation mode forbids all retired flags.

Mission fields and nested rules/clock have exact key sets. Rules must match the
current level's allowlisted mode/time-limit profile. The source clock must equal
the counter derived from the saved tick, including the 601-tick borrow period.
Navigation requires null clock/winner and active outcome. A mission cannot exit
at tick0. Timed missions fail exactly when the derived display reaches zero;
before that, cooperative completion requires all four exits, while first-exit
completion requires any exit and winner equal to the lowest exited ID. All other
outcome/winner combinations reject. Timeout takes precedence over completion.
Terminal mission snapshots are saved at their frozen completion/failure tick;
later continuation does not advance them.

The codec never
repairs, repositions, clamps or discards invalid state. A failed import leaves
the caller's existing world untouched; a failed export leaves its input intact.

## Verification and implementation record

Public tests use only newly authored synthetic levels. They cover JSON round
trips, continued simulation/event equality and explicit RNG continuation;
independent Node SHA-256 reproduction of canonical level hashing; object key
reordering; same-ID changes to every layer, dimensions, starts, source, exit and
metadata; malformed/oversized/multibyte input; all missing/extra field classes;
versions, identities, safe integer and unsigned bounds; ordered IDs, overlaps,
blocked/unsupported cells; and snapshots during asynchronous hashing. Version2
tests also cover full mission continuation/terminal state, retired overlaps,
clock/outcome/winner/rule tampering and strict legacy migration.

Implementation model: gpt-6.1-sol. The earlier version1 tick-limit review repair
is retained. Version2 adds mission state and explicit migration in one bounded
implementation attempt; one TypeScript test-helper assignment was corrected
after compiler feedback. `npm ci` and `npm run check` passed (40 total tests,
including 14 checkpoint and 8 mission tests). Aggregate token usage unavailable.
Independent review is coordinated separately before integration. The codec is
independent of DOM/UI; browser export/load checks belong to its integration.
