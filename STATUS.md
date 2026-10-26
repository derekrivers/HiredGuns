# Status - 26 October 2026

Main through PRs #1-#7 provides four views, control reassignment, navigation/checkpoints, bounded Training43 extraction, dry stairs and the authored dry-fall drill. Latest starting merge: `31406f5`. No complete faithful original level or campaign is validated. No original executable boot/rebuild or physical four-controller event-PC/TV test is established.

## Character baseline batch

- Verified the three archive variants independently. OCS 2,267-byte RNC1 data recovers to 16,320 bytes with both CRCs passing and exactly matches OCS Characters.s. CD32 raw 16,320 bytes matches the separate AGA/snapshot source. Editor raw 3,072 bytes matches legacy OldCharacters.s, a different 256-byte layout. Hashes, offsets and source references: docs/character-format.md. Detailed reports, recovery scripts and original bytes remain ignored in .local/roster-recovery/.
- Current records are five language banks of twelve 272-byte records. Canonical selection uses the first bank. OCS/CD32 stats and identity agree but six characters' starting inventories differ; identities remain distinct. Every record byte, text padding, inventory and action byte is preserved. Actions are not additional carried/equipped items; source selection clears equipment and expands ten initial carried slots to thirty.
- Browser/CLI raw import identifies verified OCS/CD32 digests, labels other 16,320-byte inputs unverified inspection data, and rejects packed/legacy layouts. Character preparation shows source stats and ten carried slots, requires four explicit distinct choices and exports/restores an ordered plan bound to the full source identity. No default Training43 roster is invented. Preparation never applies to world state; checkpoints/world remain version3 without migration. Future live-character state needs a separately reviewed version change.
- Scope/ownership: Sol medium isolated source-evidence worker; coordinator importer, selection, UI and tests; independent high format/persistence review before merge. Allowance 1-3 human-equivalent hours per bounded task; two failed repairs without new evidence trigger reassessment. Usage unavailable. Validation and current-head review/CI disposition are recorded on the batch PR.

## Working gameplay baseline and limits

- PR #7 passed 74 unit tests, 15 local browser checks, independent high review and CI. Source-derived dry-fall cadence/damage/death is restricted to authored synthetic characters (physique/agility100, empty inventory). Version3 preserves fall cadence, pending injury, fitness and death; v1/v2 explicitly migrate to static physics. Original falls remain disabled. See docs/dry-fall.md and docs/checkpoints.md.
- Dry directional stairs use shared support/collision validation, including elevated checkpoint restoration. Water, pads, lifts, dynamic support, unknown hazards and unsafe drops remain blocked. Training43's actual wet staircase stays blocked. See docs/static-traversal.md.
- Exact Training43 hash `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c` supports the proven four-mercenary extraction route. Cooperative extraction is an explicit variant; original first-exit race is separate. Integer countdown uses 601-tick borrow on a candidate 50 Hz clock; original wall-clock parity remains unverified. Other original revisions remain navigation-only. No whole-level playability claim.
- Item definitions/weight, inventory mutation/water damage, original live roster, drowning, corpse/environment mutation, combat/enemies, original timing and broad mission dependencies remain unsupported. Roster preparation does not unlock these mechanics.

## Next bounded batch

1. **Matching item/weight baseline** — Sol medium implementation, independent high binary/arithmetic review. Recover the OCS item table revision, preserve unknown fields, resolve equipped plus thirty carried slots and category-specific ammo weight; synthetic arithmetic fixtures and local hash checks. Dependency: verified roster. Allow 1-3 hours; escalate conflicting source/binary evidence after two failed repairs.
2. **Live character/save contract** — coordinator integration with Sol medium worker and high persistence review. Explicit source-bound team initialization, inventory, alive/controlled/extracted separation and versioned migration; no implicit roster attachment to old saves. Dependency: item/weight baseline. Allow 2-3 hours; stop activation if death/environment invariants remain unsupported.
3. **Death/water readiness audit** — bounded Sol medium source work, high review for simulation decisions. Establish corpse/map deltas, inventory-before-immunity ordering and drowning/fall state before implementing original water. Preserve working drills and local original-map regressions; do not bypass guards to claim wet-stair coverage.

## Later gates

Campaign travel remains disabled: reconstructed Locations CRC df31 differs from archived runtime 5c21. The archive's 47 maps and 20 campaign-related records do not prove playability. Graphics remain placeholders; 50/50 custom graphics checksums and 19/19 BOB comparisons were revalidated, with twelve face comparisons still pending before asset use. Original ZIP SHA-256 remains recorded in prior evidence.

Decision gates: navigation 3 November; complete original level 9 November; campaign scope 16 November; feature freeze 20 November; rehearsal/fixes 21-26 November; birthday 27 November 2026. Full campaign remains high-risk. No recurring work is scheduled.
