# Team checkpoints, version 3

`src/sim/checkpoint.ts` exports browser-compatible `exportCheckpoint(level, world)`
and `importCheckpoint(level, json)`. Export pauses through the UI and downloads
compact JSON. Import returns a fresh state after full validation; the UI stays
paused so assignments can be checked. Both operations snapshot inputs before
asynchronous SHA-256 hashing, preventing later mutation from mixing states.

## Envelope and level binding

The envelope is exactly `{format:"hired-guns-save", version:3, levelHash, world}`.
The world uses schema 3 and contains levelId, tick, RNG, four mercenaries, mission
and physics. No original map arrays, artwork or controller assignments are saved.

Character preparation is a separate version1 `hired-guns-roster-selection` plan,
containing only the raw roster source identity and four ordered canonical indices.
It is never applied to this world or included in checkpoints. Thus this import
batch needs no world/save migration. A future live-character change must review
its own schema version, verified source binding, inventory and death invariants;
loading an old checkpoint must not silently attach the current preparation.

`levelHash` is SHA-256 of UTF-8 canonical JSON for ALL LevelData fields. Object
keys sort lexically; arrays/source-word/start order remain meaningful. Geometry,
source descriptor/digest/revision, dimensions, exit, name and mechanics all
participate. Source hash or level ID alone is insufficient. Reordering object
insertion order has no effect. The digest prevents accidental wrong-map loading;
it is not a signature or a defense against deliberate save editing.

Level data remains schema 1. Structural validation requires exact fields, three
dense unsigned-32 arrays of the expected bounded grid size, four valid starts,
a bounded exit, defined source enums/digest and mechanics strings.

## Physics and migration

Static worlds save exactly `physics:{mode:"static"}`. The newly authored
`synthetic-fall-v1` level with synthetic source enables `dry-fall` physics only.
It saves profileId `synthetic-empty-v1`, fallCounter and four ordered actors.
Each actor has physique, agility, weight, fitness, dead and fallDamage. The
fixed empty-inventory profile is authored: physique 100/agility 100/weight 0,
initial fitness 65535. It is not an imported original character or chosen roster.

Validation binds stats/profile to that mode, requires the fall phase derived
from tick (0 at tick 0; 1+(tick-1)%6 thereafter), bounded fitness/death consistency,
and the profile's possible accumulated damage sequence or cap. Dead actors have
fitness 0 and pending damage 0. Living poses may be midair only over a safely
bounded dry fall path; dead poses must be supported. Active actors cannot overlap;
dead/extracted actors no longer occupy cells. Retired extraction poses must have
a valid traversal to a type3 exit, including stair-transformed approaches.
The codec validates representable state and invariants, not a full input replay.

Version1 envelopes require exactly world schema 1's five fields. They migrate to
schema 3 static navigation with zero exit state, even on profiled mission maps.
Version2 envelopes require world schema 2's six fields and preserve their mission
rules, clock, exits and outcome, adding static physics. Neither migration invents
character stats, fitness or elapsed fall history. Both reject the dry-fall drill.
Version3 requires schema 3 and explicit physics; mixed versions, extra/missing
fields and unknown profile/mode data reject. Re-export always writes version 3.
Older game builds cannot load version 3 saves.

## Defensive loading and limits

Input must be smaller than 16,384 characters AND 16,384 UTF-8 bytes, checked before
JSON parsing. Export enforces the same limit. Each nested object has exact keys;
arrays are dense with exact lengths. Primitive replacements, numeric strings,
non-finite/fractional/out-of-range numbers and extra fields reject.

Tick is an integer in 0..4294967294 (`MAX_WORLD_TICK-1`); RNG is 0..4294967295.
The last resumable tick advances once to 4294967295, then further stepping fails
atomically and the UI pauses for retry/reset or an earlier checkpoint. The
exhausted tick itself cannot be saved. Mission clock must match tick exactly;
mission rules, outcome, winner and exits retain their existing validation.

Navigation poses share the same collision/support predicate as runtime movement.
Dry-fall poses use the safe-path predicate: water, dynamic/unknown environments,
unsafe voids and unsupported support do not become save backdoors. All-dead
fall drills restore frozen and offer Retry drill; mid-fall saves continue the
same cadence, accumulated damage and eventual landing injury/death.

Unit tests cover canonical hashing, malformed/oversized inputs, strict legacy
migration, mission state, dry profile/phase/stat tampering, mid-fall continuation,
death occupancy and immutable snapshots. Browser tests exercise actual downloads,
reset/load/continue, dead and all-dead restoration and mismatched-map rejection.
See dry-fall.md and PR validation for source rules and current test totals.
