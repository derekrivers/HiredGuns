# Navigation checkpoints, version 1

`src/sim/checkpoint.ts` provides two browser-compatible asynchronous functions:

```ts
exportCheckpoint(level: LevelData, world: WorldState): Promise<string>
importCheckpoint(level: LevelData, json: string): Promise<WorldState>
```

Export returns compact JSON using the existing `SaveEnvelope` contract:
`{ format: "hired-guns-save", version: 1, levelHash, world }`. Import returns a
fresh state only after validation. Neither operation mutates its level/world
arguments. Each operation snapshots validated input synchronously before its
first asynchronous digest operation, preventing caller mutation during hashing
from producing a mixed checkpoint. Callers should replace their live state only
after the import promise resolves successfully.

This is a **navigation-only checkpoint**. Version 1 contains the world schema,
level ID, simulation tick, explicit unsigned RNG state and four mercenaries'
IDs, positions and facings. It contains no original map arrays, artwork, campaign
graph, inventory, monsters, combat, triggers, dynamic doors or mission state.
Adding any persistent simulation state requires a reviewed schema/version bump
and corresponding validation or explicit migration. Unknown fields are rejected
so future state is never silently dropped by the version 1 codec. Do not present
these files as complete original mission saves.

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
Format/version must match exactly, and `levelHash` must be 64 lowercase hex
digits matching the current level. The world accepts exactly `schemaVersion`,
`levelId`, `tick`, `rng` and `mercenaries`; its schema is 1 and level ID must
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

Each occupied cell must pass the same conservative `obstruction()` predicate
as navigation, including boundary, solid/opaque obstruction, unsupported
environment and missing support. Mercenaries cannot overlap. The codec never
repairs, repositions, clamps or discards invalid state. A failed import leaves
the caller's existing world untouched; a failed export leaves its input intact.

## Verification and implementation record

Public tests use only newly authored synthetic levels. They cover JSON round
trips, continued simulation/event equality and explicit RNG continuation;
independent Node SHA-256 reproduction of canonical level hashing; object key
reordering; same-ID changes to every layer, dimensions, starts, source, exit and
metadata; malformed/oversized/multibyte input; all missing/extra field classes;
versions, identities, safe integer and unsigned bounds; ordered IDs, overlaps,
blocked/unsupported cells; and snapshots during asynchronous hashing.

Implementation model: gpt-6.1-sol. One implementation attempt and one repair
after review reproduced unsafe tick continuation at the previous safe-integer
boundary. The repair tests the last resumable tick, safe first continuation,
terminal export/import rejection and atomic failure on a further step.
`npm run check` passed after the repair (29 tests total, including 11 checkpoint
tests), with the shared world tick guard present.
Aggregate token usage unavailable. Independent review is coordinated
separately before integration. The codec is independent of DOM/UI; browser UI
export/load verification belongs to its integration change.
