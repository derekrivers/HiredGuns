# Character baseline evidence

26 October 2026. Local archive analysis, not an emulator/runtime observation. Original data, reconstructed bytes and source-derived recovery scripts remain ignored under `.local/`; none belong in public commits or CI artifacts.

## Verified revisions

Paths below are relative to the supplied `research/original/HiredGunsCD32_DevFiles/` archive extraction unless qualified.

| Input | Format | SHA-256 |
| --- | --- | --- |
| `Test/HiredGuns/ChSelect/Characters.dat` | 2,267 bytes; RNC method 1, 18-byte header plus 2,249-byte payload | `16abd0dfeb603babead2091d2e86e8fdf1ae646841729d927e2e27cd79a1a4ef` |
| Recovered OCS payload | 16,320 bytes; 60 records of 272 bytes | `79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439` |
| `Test/HiredGunsCD32/ChSelect/Characters.dat` | 16,320 raw bytes; 60 records of 272 bytes | `f207ce723e555c89d350e3f95d88f6f576377188e11b56cefc4147a877031f47` |
| `Test/HiredGunsEditor/ChSelect/Characters.dat` | 3,072 raw bytes; 12 legacy records of 256 bytes | `914ad107e030ee276812cffedf6620d148e78c7470a438e4874616a7773da2c8` |

The local diagnostic RNC1 translation recovered the OCS payload in two chunks, consumed all 2,249 payload bytes and passed both header CRC-16 values (packed `1657`, unpacked `2344`, polynomial `a001`, initial zero). Its complete output is byte-identical to assembly data reconstructed from `research/ocs/Sources/Data/Characters.s` (source SHA-256 `9347b6830bbf5f80af8c2b92ee14d9a5151e0cf2d1a519a71df55662b6d45397`). This establishes a matching archived OCS data revision; it does not prove execution behavior.

The raw CD32 file is byte-identical to reconstructed `Sources/Data/Characters.s` in both the outer archive and `research/snapshot` (source SHA-256 `1cf4af5810a592d18d0ef775a06d5c2870c9e81e9dfb36dd54747672888e7c57`). The editor file is byte-identical to `OldCharacters.s` in OCS, outer and snapshot trees (source SHA-256 `eded38ae79dc55e51ba931bf7697ef9a7b95c68b77580353700f21bb3f69a78b`). The legacy file must not be interpreted using current offsets. `Data/smakefile` explicitly builds and routes the current and old variants separately.

## Current record layout

Offsets are bytes from the start of one 272-byte record; words are unsigned big-endian storage values. Preserve the complete record, including padding and uninterpreted fields.

| Offset | Bytes | Source field |
| --- | ---: | --- |
| 0, 33, 66, 99 | 33 each | origin, selection name, gender description, class description |
| 132 | 17 | game name |
| 149 | 28 | graphics load name |
| 177, 178, 179 | 1 each | gender, race, class |
| 180, 182, 184, 186, 188, 190 | 2 each | fitness, physique, agility, experience, footstep period, grunt period |
| 192 | 40 | ten inventory entries |
| 232 | 40 | ten action entries |

Each inventory/action entry is four bytes: item ID, damage, ammunition/count, fourth byte. ID zero denotes empty in the inspected runtime paths; positive IDs address item table entry `ID-1`. `Equates.i:909-914` calls the fourth byte `inven_item_outlined`; `Controls&Movement.s:5515-5524,5567-5570` clears/sets it for inventory display state. Some data comments call it potency. All fourth bytes in the verified current files are zero. Preserve it as raw storage; do not assert a universal potency interpretation.

`Equates.i:928-974` defines the current record; `Macros.i:95` defines the text terminator as zero. Decode display strings only within their fixed fields, retain raw text bytes, and avoid treating arbitrary bytes as UTF-8. A text terminator does not justify discarding the remainder of the fixed field.

The legacy 256-byte layout has four 29-byte text fields at 0/29/58/87, then game name 116, load name 133, gender/race/class 161/162/163, six words 164 through 175, inventory 176 through 215 and actions 216 through 255. This is confirmed by exact reconstruction, not a compatible current-layout profile.

## Banks and selection

Both current revisions contain five banks of twelve records: English, French, German, Italian, Spanish, in that order, with bank stride 3,264. These headings occur in OCS `Characters.s:24,495,966,1437,1908`. Every corresponding record's bytes 132 through 271 are identical across all five language banks within each revision. The OCS and CD32 canonical banks have the same stats and identity fields but differing starting inventory bytes for six records; keep their profile identities distinct.

OCS `ChSelect.s:381-418` and outer `Sources/ChSelect.s:593` onward select one-based character number minus one, multiply by 272 and copy from offset 132 of the first bank. Display redraw applies `lang * (12*272)` separately (OCS `ChSelect.s:468-478`, outer `ChSelect.s:689-700`). Thus twelve canonical roster choices are established, not sixty independent characters. A selection plan should record revision digest, canonical index, and ordered party slots independently of control-player count.

The copy creates a 146-byte stats block: bytes 0 through 139 contain the record tail, followed by cleared old fitness band, dead flag, flash duration and pad. It clears the four-byte equipped slot, copies the first ten inventory entries into a thirty-slot carried inventory, and clears the remaining twenty slots. Action entries are copied in the stats block; they are not ten additional carried items. See OCS `Equates.i:1127-1145` and `ChSelect.s:381-418`. Compile-time demo rosters have their own selection path (`ChSelect.s:47-60`) and should not silently define an interactive party.

## Simulation gates

Importing this baseline does not establish simulation parity. OCS `Main.s:5309-5353` copies original stats, equipped item and thirty carried entries into live state, resets fitness to its full word value, initializes positions and calls weight calculation. A browser selection preview must not imply those stats already govern a playable actor.

Weight needs the matching item table and category semantics: OCS `Controls&Movement.s:5923-6003` includes equipped and all thirty carried entries, multiplies item weight by ammunition/count only for ammo, grenade and sentry categories, applies the feather spell override, and compares the quotient after division by 140 with physique. Inventory/action templates alone are insufficient; do not count actions as carried items or multiply every item by ammunition.

Death needs explicit alive, controlled, extraction and occupancy state. OCS `Main.s:1146-1230` changes dead flags, removes occupancy, releases pads and writes corpse markers; `Controls&Movement.s:4562-4568` skips dead/extracted/uncontrolled actors. Health/fall/drowning activation additionally needs verified 68000 arithmetic, inventory water damage and save-state migration. Those runtime mechanics remain gated; this evidence supports import inspection and ordered selection only.

## Reproduce locally

The ignored recovery bundle is at `repo/.local/roster-recovery/` in this workspace. From any directory, run PowerShell:

```powershell
python 'C:\Users\derek\OneDrive\Documents\ChatGPT\Hired Guns\repo\.local\roster-recovery\inspect_roster.py'
python 'C:\Users\derek\OneDrive\Documents\ChatGPT\Hired Guns\repo\.local\roster-recovery\recover_rnc1.py'
python 'C:\Users\derek\OneDrive\Documents\ChatGPT\Hired Guns\repo\.local\roster-recovery\verify_roster.py'
```

The bundle records exact record hashes and byte differences in `roster-report.json`; that detailed output is local original-content evidence and must stay ignored. Data reconstruction handles the inspected source data directives, not arbitrary assembly. The RNC script is a diagnostic translation of local `RNC_1.S`, not a reviewed general-purpose production decoder. The browser and CLI accept raw 16,320-byte payloads, identify the two verified hashes and label any other revision unverified inspection data. They preserve all bytes and reject packed or legacy inputs. Unknown revisions do not establish a verified original profile or unlock gameplay.

After local recovery, open `.local/roster-recovery/ocs-rnc-recovered.raw` in the browser's character preparation panel, or run `npm run import:characters -- .local/roster-recovery/ocs-rnc-recovered.raw --out .local/roster.json`. The preparation plan is exactly `{format:"hired-guns-roster-selection", version:1, source, characters}`. Source contains SHA-256, byte length, layout and revision; characters contains four different zero-based canonical indices in team order. Loading requires an exact source match. It contains no original stats, inventory or artwork, and never modifies world/checkpoint state. The panel has no default team. Text is displayed with DOM text APIs; controls are replaced for display and complete bytes remain in raw hex.

Research attempts: one small data-parser whitespace correction; first RNC recovery attempt succeeded. Token usage unavailable. No emulator/runtime comparison performed.
