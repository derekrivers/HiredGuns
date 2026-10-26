# Campaign location baseline — 26 October 2026

The archived OCS location table is recovered and CRC-checked. Its nine-byte
difference from the editor reconstruction is a supported revision difference,
not an observed extraction, ordering or field-layout error. The archived CD32
table is byte-identical to that reconstruction. All 47 destination fields are
identical between the three tables. **Campaign travel remains disabled.** This
audit does not establish a playable campaign, simulation parity or a save contract.

## Identity and recovery

Paths below are relative to the local, uncommitted
`research/original/HiredGunsCD32_DevFiles` archive extraction. SHA-256 identities
bind this result to the supplied development archive, not an independently
authenticated retail release.

| Input/output | Bytes | SHA-256 |
|---|---:|---|
| OCS `Test/HiredGuns/World/Locations.dat` | 4,841 | `07f97fba604fee852893e1d9a30b7213fba8fd7fc531d46ce015765616187ed9` |
| OCS decoded table | 25,474 | `96ae99a0dc1236b4bc13f23f9272a85ce88572c36edbbd1e3d160ee573c07283` |
| CD32 `Test/HiredGunsCD32/World/Locations.dat` | 4,838 | `f78d2fe3440b974d24363a7ce503f202a8ba81e6edd90be849acbcf2ea9e045f` |
| CD32 decoded table / editor reconstruction | 25,474 | `83287611d0ee57417024e7598b36061d8b8933eb3edbc20d18c2af686fd7a3fe` |

Both containers have an 18-byte RNC method-1 header, unpacked length 25,474
(47 × 542), leeway zero and three chunks. OCS packed payload length is 4,823,
packed CRC-16 `9af9`, unpacked CRC-16 `5c21`. CD32 packed payload length is
4,820, packed CRC-16 `6caf`, unpacked CRC-16 `df31`. Both packed and unpacked
CRCs were recomputed successfully (reflected polynomial `a001`, initial zero).
There are no trailing container bytes.

Recovery reuses the ignored local
`repo/.local/item-recovery/recover_rnc1_items.py`, SHA-256
`dff422b4f60eaf27927cf07ad4f070b45bbb618e7ec3796904c053c17c18765e`.
It is the existing source-derived diagnostic translation, not a newly published
or general-purpose decoder. OCS reports input position 4,824 against a 4,823-byte
payload, the existing decoder's final one-byte lookahead behavior; CD32 reports
4,820/4,820. Exact output length and both CRCs pass independently of that metadata.
The audit wrapper verifies container identity, length and packed CRC before
executing the explicitly supplied, hash-pinned local decoder, then verifies output
length and CRC itself. No decoder/source or recovered table is committed.

## Reconstruction and differing fields

`Scripts/MakeGameMaps` sorts calls to `Scripts/GrabLocn`; the latter retains the
location header when stripping the 157,196-byte remainder from a 157,738-byte map.
`research/tools/catalogue_campaign.py` reconstructs those headers from the 47
sorted `Maps/Game/**/*.map` inputs. Repeating it produces CRC `df31` and exactly
the CD32 payload above, not merely a CRC collision. The audit's ordered relative
path/full-file-hash manifest SHA-256 is
`c67f3b3b3be89530a1cf9be495867bed045cb4cb0e92132e438993d55ab13060`.

OCS and CD32 `Equates.i` independently describe the same 542-byte layout.
Offsets below are zero-based within a record; record indices are one-based.
Values show editor/CD32 → archived OCS. This is a difference summary, not a copy
of either table.

| Record | Field | Offset | Difference |
|---:|---|---|---|
| 7 (Abandoned Depot) | `locn_mons2` | 531 | 18 → 10 |
| 7 | `locn_sky` | 532 | 3 → 1 |
| 8 (Tomb) | `locn_info` | 295 | One text byte, `65` → `73` hexadecimal |
| 9 (Tomb) | `locn_x`, `locn_y` | 0–3 | (440, 115) → (191, 221); three bytes change |
| 19 (Desalination Plant) | `locn_x`, `locn_y` | 0–3 | (191, 221) → (440, 115); three bytes change |

Only these four records differ: nine bytes in seven field instances. Records 9
and 19 exchange screen coordinates; they do not exchange record positions,
map-number fields, descriptions or destination lists. The isolated text-byte
difference is present in the archived OCS data, so it is not a decoder spelling
correction. The evidence establishes different stored revisions, not which
revision is newer or whether a particular author intended each change.

As corroboration, all 41 packed maps supplied in `Test/HiredGuns/Maps` decode
with valid RNC lengths and CRCs to 157,738 bytes each. Their numeric filenames
select table records. Forty headers match the OCS table exactly, including all
four differing records above. Map 14 alone differs from its table header in 16
bytes at offsets 434–449, within `locn_info`; its destinations still agree.
This additional text revision is separate from the `df31`/`5c21` discrepancy.
The 41 CD32 test maps are already raw 157,738-byte files, not RNC containers;
all their headers match the CD32 table. This corroborates the table revision
distinction without claiming complete map-body equivalence.

## Campaign links and remaining uncertainty

`WorldMap.s:validate_choice` reads up to four big-endian destination words at
offset 534, stops at zero and subtracts one before comparing a zero-based
location index. `locn_map_num` at offset 526 separately selects the loaded map.
All 376 destination bytes, type flags, map-number fields and disk fields match
between the reconstructed, archived CD32 and archived OCS tables. There is no
remaining destination-word discrepancy attributable to this CRC mismatch.

The coordinate swap changes where records 9 and 19 appear on the world map.
Links involving record 9 (neighbors 5, 6, 10, 14) and record 19 (neighbors 12,
20) keep their numeric targets and map identities. Their geographic placement
must use the chosen revision; interpreting links from editor screen positions
as the OCS geography would be wrong. The audit does not infer a historical
intended geography from this swap.

The archived OCS map set contains the 19 non-start campaign maps named by
`Maps/Build_Game_Maps`, but no standalone map 13 (Dropzone/start). Its outgoing
link to record 7 is present in the table; the standalone-map execution of that
start transition is not established. Other missing test-map IDs are 16, 22, 24,
32 and 36; these are outside the campaign-related type-0/2/3 records.

All campaign edges remain unverified as executable travel/completion behavior:
selection restrictions, completed-location behavior, start/end transitions,
mission prerequisites, map mechanics and resource loading have not been booted
and exercised here. Source includes cheat and conditional `se` selection paths;
table equality does not resolve executable build flags. Foreign-language text
replacement is also outside this English-table comparison. The matching link
baseline closes the byte-discrepancy investigation, not these runtime gates.

## Reproduction and validation

Run from the isolated worktree, with the sibling private research and recovery
directories available. `--identify` inventories input hashes without executing
the decoder; compare them with the identities above before using them as pins.

```powershell
python -m unittest discover -s tools -p test_audit_campaign_locations.py
python tools/audit_campaign_locations.py --archive ../research/original/HiredGunsCD32_DevFiles/Test/HiredGuns/World/Locations.dat --maps ../research/original/HiredGunsCD32_DevFiles/Maps/Game --decoder ../repo/.local/item-recovery/recover_rnc1_items.py --identify
python tools/audit_campaign_locations.py --archive ../research/original/HiredGunsCD32_DevFiles/Test/HiredGuns/World/Locations.dat --maps ../research/original/HiredGunsCD32_DevFiles/Maps/Game --decoder ../repo/.local/item-recovery/recover_rnc1_items.py --archive-sha256 07f97fba604fee852893e1d9a30b7213fba8fd7fc531d46ce015765616187ed9 --maps-sha256 c67f3b3b3be89530a1cf9be495867bed045cb4cb0e92132e438993d55ab13060 --decoder-sha256 dff422b4f60eaf27927cf07ad4f070b45bbb618e7ec3796904c053c17c18765e
```

Repeat with the CD32 archive path and packed-file SHA-256 above. Reports expose
hashes, field names and changed spans, not original text/table bytes. Any private
decoded diagnostics stay under ignored `.local/`. Synthetic tests exercise field
and record boundaries, malformed containers, identity checks, CRC failures and
decoder-output validation. No original data is required by the public tests.

To reproduce the map-header corroboration, add `--runtime-maps` pointing to the
corresponding `Test/HiredGuns/Maps` or `Test/HiredGunsCD32/Maps` directory, plus
`--runtime-maps-sha256` with its ordered full-file manifest pin:

| Runtime map set | Manifest SHA-256 |
|---|---|
| OCS | `20bd84e3d88b22fb231852cb7fd9afe021447d977c66438029665ab4066f4fac` |
| CD32 | `f33b4b79cd37c0457dbf65a9ef793e17cfaea8db222f521dd91a3dd9eae4ab67` |

`--identify` with that option inventories the additional pin. The optional
comparison checks raw or CRC-validated RNC maps and compares only headers and
destination fields; it does not establish whole-map or gameplay equivalence.

This task is bounded to dedicated audit tooling, synthetic tests and this
document. Existing `STATUS.md` and earlier format documents retain the travel
gate; this document refines the reason rather than enabling it. Implementation
uses Sol medium; binary-format review uses independent Sol high. Recovery of
both location tables succeeded on the first attempt. An optional CD32 map probe
rejected method-1 decoding because those files are raw; inspection of the header
and exact length supplied new evidence, and a raw comparison then succeeded.
No decoder repair was needed. Token usage is unavailable. Final validation,
reviewed commit and CI/merge disposition are recorded in the pull request.
