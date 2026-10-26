# Item baseline evidence

26 October 2026. Local archive and source analysis only. Recovery scripts, decompressed data, source-derived output and reports remain ignored in `repo/.local/item-recovery/` in the supplied workspace. Public tests contain authored synthetic bytes.

## Runtime extraction and revision boundaries

Paths below are relative to `research/original/HiredGunsCD32_DevFiles/`. English items are embedded in `Test/<variant>/Game/GameFast.dat`; there is no standalone English runtime `Items.dat` at that location. OCS `Sources/Main.s:5902-5905,6084-6094` loads/decompresses GameFast and addresses items within it. OCS `Equates.i:2061-2064` places the table after 58,024 bytes of MoreSfx and 45,284 bytes of Windows: raw offset **103,308**, length **32,604**, 114 records of 286 bytes. The first record's fixed text also independently aligns at that offset in all three extracted containers.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| `Test/HiredGuns/Game/GameFast.dat` | 75,817 packed RNC1 | `1a21603950a69b4b8b7aff92cc9cd52172a9df873917a99d694fe988b408e8ec` |
| Recovered OCS GameFast | 155,412 | `2ccc61f52811f4d06ab727d54470eb9a53ae80b93a5093e761b0974fd55a428e` |
| Extracted OCS English item table | 32,604 | `633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc` |
| `Test/HiredGunsCD32/Game/GameFast.dat` (raw) | 155,412 | `f4f47f99ea6f033acc755f8060ab6d1fa447939408af3e321eac3204573b4183` |
| Extracted CD32 English item table | 32,604 | `4a21aabbb1644287c0a2119fd9643f4d6c359d016ff2412da139613d609bdbe8` |
| `Test/HiredGunsEditor/Game/GameFast.dat` | 74,390 packed RNC1 | `961dd98817514ac011af78142930a599d8bdcea30f0162e73ad97274b2196807` |
| Recovered editor GameFast | 156,296 | `62d7e0f074a899f36bde949a1bd0a69008a10ea31e4a1f07bc5bf207b5ffeb40` |
| Editor candidate slice at OCS offset/length (unverified boundary) | 32,604 | `3bf3b3a95de1d9ffdf12fd829b56fc5ece18046600c42abd511bcf6e07f60819` |

OCS recovery passes both RNC header CRC-16 checks (packed `9b44`, unpacked `383e`, polynomial `a001`, initial zero), producing 13 chunks. Editor recovery separately passes packed `de22` and unpacked `f72d`, also 13 chunks. A copied diagnostic translation of local `RNC_1.S` handles bit lookahead/refill and the final zero-length literal after a word read straddles an odd payload boundary. Its final pointer is one byte beyond each packed payload; no nonempty literal reads beyond the payload. This is a local diagnostic decoder, not a production/general-purpose RNC implementation.

The available `Data/GameFast.dat/Items.s` has SHA-256 `be031a5146ab905cf73a729013987d00c333714a3d5b54337fc354bbe92c5a6d` in both the outer archive and `research/snapshot`. Reconstruction of its inspected constants, `dc.b/w/l` and `ds.b` directives produces exactly the CD32 table and standalone `Data/GameFast.dat/Items.dat`. `Data/GameFast.dat/smakefile:15-29,42-44` assembles Items.dat, strips a 32-byte header/four-byte trailer, and joins More.sfx, Windows.gfx, Items.dat, Messages.dat, Monsters.dat and ExGfx.gfx. Joining those archived components reproduces the complete raw CD32 runtime GameFast byte for byte. The active build routes to CD32; older compressed OCS/editor copy commands are commented out. Localized item files are separate build/load paths and are not English replacements.

**The available item data source does not reproduce the OCS runtime table.** OCS versus reconstructed CD32 differs in 190 bytes across four records, including 37 bytes outside text, one weight field and one category field. The verified OCS baseline is therefore the CRC-checked runtime extraction interpreted using the OCS layout and code, not a claim that CD32 item source matches OCS data. Editor's container is recovered separately, but its larger length and legacy roster require independent layout work. The same-offset candidate slice is not recognized as a verified item revision and never grants OCS weight authority.

Code revision hashes in `research/ocs/Sources/`: `Equates.i` `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759`; `Main.s` `cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9`; `Controls&Movement.s` `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15`.

## Record storage

OCS `Equates.i:796-827` defines this layout. Words are unsigned big-endian storage values. Inventory ID zero means empty; positive ID addresses table record `ID-1`.

| Offset | Bytes | Field |
| --- | ---: | --- |
| 0,16,32,48 | 16 each | two header and two footer text fields |
| 64 through 235, stride 19 | 19 each | ten information text fields |
| 254,255,256,257 | 1 each | category, image, container type, water damage |
| 258,260,262 | 2 each | maximum damage, weight, animation colour |
| 264,265,266,267 | 1 each | animation, animation duration, flash colour, sample |
| 268,270,272 | 2 each | sample period, external sample, external sample period |
| 274 | 12 | category-dependent extension |

Full record hex retains every byte, including text tails and extension bytes. Display strings stop only within their fixed field at zero and provide inert single-byte transcriptions; control bytes and DEL become replacement characters. Original formatting opcodes/coordinates and spacing conventions are not rendered as original UI. Unrecognized categories and extensions remain inspection data; no item behavior is inferred from text.

## Selection and source arithmetic

`initializeInventory` is a pure copy of selection setup established in [character-format.md](character-format.md): empty four-byte equipment, ten copied carried entries plus twenty empty entries, and ten separately copied action entries. It creates independent objects and never changes actor/checkpoint state. Starting equipped items must not be invented from action templates.

`computeSourceWeight` transcribes OCS `Controls&Movement.s:5923-6003` for synthetic testing and inspection. It includes equipment plus all thirty carried slots. Only categories **4 (ammo), 21 (grenade), 23 (sentry)** multiply unsigned word weight by the count byte. Category 24 (cell ammo), mine and armed mine do not multiply. Empty ID 0 contributes zero even if other entry bytes are nonzero. Equipped grenade sets the source `using_grenade` word to 2; all other equipment clears it. Spell-wings word 24 overrides the completed total to zero. Actions never contribute.

Products use unsigned MULU operands, accumulation wraps as an unsigned 32-bit ADD.L, and DIVU divides by 140 with a 16-bit quotient. A quotient above 65535 reports unavailable because 68000 DIVU overflow leaves the destination undefined. The subsequent CMP.W/BLE compares quotient and physique as **signed 16-bit** values, including synthetic values above 32767. Equality is not too heavy. The preview reports this comparison; it does not implement heavy_count, redraw, movement effects or spell mechanics.

`inspectSelectionInventory` reconstructs and rehashes the complete preserved roster/item bytes, then reimports and derives the selected canonical record. Editable digest metadata or parsed fields cannot grant authority. Only OCS roster digest `79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439` paired with the OCS item digest above returns weight `status:"verified"`. Unknown, CD32, editor and mixed pairs return `status:"unavailable"`, while retaining inspection and pure selection initialization. `computeSourceWeight` itself returns only `status:"computed"`, never verified. This is source-derived preparation arithmetic, not emulator/runtime behavior parity or a gameplay activation gate being opened.

## Local reproduction

Run recovery from the repository worktree (the script locates sibling `research/` from that working directory):

```powershell
python 'C:\Users\derek\OneDrive\Documents\ChatGPT\Hired Guns\repo\.local\item-recovery\verify_items.py'
npx tsx tools/import-items.ts 'C:\Users\derek\OneDrive\Documents\ChatGPT\Hired Guns\repo\.local\item-recovery\HiredGuns-items.raw'
```

Recovery uses the adjacent ignored `recover_rnc1_items.py`, and writes variant-specific table payloads plus `item-report.json`. CLI input is an exact 32,604-byte raw table, never a GameFast container or packed stream. Without `--out` it prints source identity only. Optional `--out .local/items.json` writes the full report exclusively under the current worktree's real `.local/` directory, refusing existing files and symbolic-link outputs. The browser keeps loaded catalogs in memory; roster selection plans contain no item data and no persistent inventory state.

Research: inherited diagnostic failed its final literal bounds assertion; one source-driven bit-refill translation attempt exposed the final zero-length/odd-boundary condition, and a second repair accepted only zero-length access there. Both container CRCs then passed. Implementation synthetic tests passed on their first run. Model: gpt-6.1-sol, medium reasoning; token usage unavailable. No recursive delegation or emulator/runtime comparison.
