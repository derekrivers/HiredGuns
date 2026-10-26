# Bounded editor map import

`src/import/editor-map.ts` exports `async importEditorMap(bytes: Uint8Array)`.
It returns `{ level: LevelData, report: ImportReport }` and uses browser Web Crypto
SHA-256. Input is copied synchronously before hashing. A subarray is read relative
to its own beginning. Only the exact 157,738-byte development editor layout is
accepted. There is no verified magic signature: the length and coordinate checks
establish structural compatibility, not authenticity or runtime equivalence.

The source is a 542-byte location record followed by a map structure. All
multibyte numeric fields are big-endian. The grid is 23 x 23 x 20, x varies
fastest, y next, z last. Source z increases upward. `Controls&Movement.s`
`.stairs_up` adds one 529-cell stride and increments the floor coordinate;
`.stairs_down` subtracts them. `HGedit1.c` calls `currz+1` the floor above.
No coordinate axis is inverted or rebased. Comments in OCS `Equates.i` describing
older 0–19/1–20 position ranges do not override the editor dimensions or observed
byte/index behavior.

| Region | Absolute offset | Count x stride |
|---|---:|---:|
| Location | 0 | 1 x 542 |
| Map header (name pointers, title, starts, exit, water settings) | 542 | 1 x 154 |
| Explosions | 696 | 32 x 16 |
| Horizons, opaque artwork | 1208 | 4 x 576 |
| Text triggers | 3512 | 50 x 6 |
| End marker | 3812 | 1 x 4 |
| Text messages, opaque bytes | 3816 | 3072 |
| Editor monsters | 6888 | 128 x 16 |
| End marker | 8936 | 1 x 4 |
| Buttons | 8940 | 32 x 28 |
| Lifts | 9836 | 32 x 10 |
| End marker | 10156 | 1 x 2 |
| Doors | 10158 | 32 x 12 |
| End marker | 10542 | 1 x 2 |
| Pushables | 10544 | 32 x 6 |
| End marker | 10736 | 1 x 2 |
| Text artwork, opaque bytes | 10738 | 36 x 480 |
| First leading safety net | 28018 | 460 |
| Layer 1 | 28478 | 10580 x 4 |
| Layer 1 trailing + layer 2 leading safety nets | 70798 | 920 |
| Layer 2 | 71718 | 10580 x 4 |
| Layer 2 trailing + layer 3 leading safety nets | 114038 | 920 |
| Layer 3 | 114958 | 10580 x 4 |
| Last trailing safety net | 157278 | 460 |

The editor header `HGmapstructure.h` defines the object layouts. Its explosion
struct is 16 bytes and its pushable is 6 bytes; do not impose host C alignment.
OCS `Equates.i` reserves the same 2048-byte monster region but its runtime
`monster_size` is **22**, including movement/direction/stun fields. This importer
reads **128 editor records of 16 bytes** and must never be used on a runtime
monster table. Explosion interpretation also differs in runtime sources; fields
in this report follow the editor header, not runtime simulation semantics.

Starts are four triples at 670, 673, 676 and 679. Exit is at 682. Each component
must fit the grid; starts default to facing north because source facing is absent.
An all-zero exit is retained; it is not assumed to be an enabled exit. The title
is a NUL-terminated Latin-1 byte string at 550 with maximum length 120. Empty
titles get a descriptive fallback. Full location string/control bytes, title
suffix bytes and map name predecessor/successor values survive in preserved data.

The three `level.layers` arrays contain every unsigned source word, including
unknown or currently unsupported bit combinations. `report.preservedRanges`
contains all remaining bytes as hex with absolute offsets. Together these four
ranges and the three arrays reconstruct the source byte for byte. Every object
slot also includes its raw bytes and a decoded editor field dictionary. `nonzero`
means any byte is nonzero; it does **not** prove an object is active or reachable.
Coordinates/pointers inside unused object slots are preserved, not executed or
assumed valid. Counts are inventory hints, not a mechanic or reachability proof.

The digest covers the entire source, including opaque bytes. Level ID is
`editor-<sha256>` and revision is `unverified-editor`. No runtime revision is
inferred. Campaign travel is always disabled: the independently reconstructed
location graph CRC is `df31`, while the archived runtime table expects `5c21`.
Destination values remain raw one-based location indices, not links to execute.

The report explicitly warns that starts are not proven walkable. Source movement
allows support from a block below even with no floor bit in the occupied cell.
Testing only the floor bit is insufficient. Full behavior also needs original
block semantics, support, falling, stairs, doors, water, buttons, lifts, pushables,
explosions, items, eggs, monsters and text triggers. These are inventory/preserved
data here. The browser navigation layer must implement a bounded, explicit subset
and block unsupported behavior, rather than silently treating imported maps as
complete games.

Egg inventory follows the source auxiliary encoding: layer 1 `aux_here` bit set
with auxiliary type zero identifies a closed egg. Layer 2's hatch timer may be
zero; a nonzero timer alone does not establish egg presence. Open eggs (auxiliary
type one) and other auxiliary types are excluded from the closed-egg count.

## Local use and verification

The package pins `tsx@4.23.15` and provides the `import:map` script. Run:

```text
npm run import:map -- <local-source.map> --out .local/map13.json
```

Without `--out` the report is printed to stdout. Output files must be direct
`.local/<simple-name>.json` children of the current workspace; existing files and
symbolic links are not replaced. Original maps and generated JSON containing
source bytes must remain local and must not enter commits or CI artifacts.

Independent forensic evidence is in local `research/tools/inspect_formats.py`,
`catalogue_campaign.py`, `audit.py`, `research/evidence/maps.json` and
`campaign-catalogue.json`. Public tests use synthetic byte arrays, including exact
size failures, coordinate boundaries, endian/high-bit values, first/last cell
indexes, object-stride boundaries, subarray input, mutation during hashing and
full source reconstruction. They do not need original assets.

Local Map13 Dropzone validation recorded independently with Python `struct` and
`hashlib`: SHA-256
`28df7fb340f3560054b3ee2c2195253ed13f773a91a1b516df95107d1d82aba1`;
157,738 bytes; 10,580 words per layer; 5,819 block-flag cells, 7,052 opaque cells;
zero explicit floors, water, panels, explosions, auxiliary, pushable or item
cells and zero nonzero object records. The four starts are an adjacent 2 x 2
group on z=11, each empty with solid opaque type-0 block (`0x42`) below. This is
the lowest-complexity campaign-related navigation candidate, requiring solid
block support from below, horizontal movement and solid/opaque obstruction.
It does not establish campaign travel, a functional exit or complete original
level behavior. Source title is empty; its trailing bytes remain preserved.

All 47 Game editor maps were locally imported and their digests matched the
independent campaign catalogue. `npm run check` passed lint, TypeScript, nine
synthetic tests and production build. A CLI smoke run using `tsx@4.23.15` wrote
Map13 output into ignored `.local/`; a requested output outside `.local/` was
rejected without creating that file. No original/generated content was staged.

Implementation record: gpt-6.1-sol, one implementation attempt and one repair
after independent review identified a hatch-timer/presence inventory error.
The repair adds a synthetic zero-timer egg, timed egg, open egg, unrelated
auxiliary and stale-timer case. Aggregate token usage unavailable.
