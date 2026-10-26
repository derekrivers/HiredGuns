# Status - 26 October 2026

Main through PR #8 (`6c8cf57`) provides four views, control reassignment, navigation/checkpoints, bounded Training43 extraction, dry stairs/falls and source-bound character preparation. No complete faithful original level/campaign, executable rebuild/boot or physical four-controller event-PC/TV test is validated.

## Item inspection batch

- Scope: verify OCS item revision, byte-preserving local import, pure initialization/weight and preparation inspection only. No original character stats/inventory enter simulation. Item data/weight previews remain session-only; roster plans remain version 1, world/checkpoints version 3. No persistent item state is introduced.
- OCS items are embedded in GameFast.dat, not Items.gfx. Matching source/binary identities, build paths, revision differences and arithmetic rules are recorded in docs/item-format.md. Detailed original evidence/recovery stays ignored under .local/item-recovery/.
- Initial inventory clears equipment, copies ten carried slots and clears twenty more; action templates stay separate. Authoritative weight requires the exact verified OCS roster/item pair. Unknown/CD32/editor pairings cannot silently inherit that authority. Raw records and unknown fields are preserved.
- Ownership/allowance: isolated Sol medium evidence/import/weight worker (1-3 human-equivalent hours); coordinator UI/integration (1-2 hours); independent Sol high current-head binary/arithmetic/persistence review before merge (about 1 hour). Two failed repairs without new evidence trigger reassessment. Token usage unavailable. Local validation: npm run check passes 88 unit tests plus lint/typecheck/build; all 21 browser checks pass with local Dropzone, Training43, OCS roster/items. Twelve weights match an independent raw-byte calculation; three CD32/mixed pairings remain unavailable. Production 4173 has four views, no page errors or external requests; panel screenshot inspected. CLI exclusive-create refusal verified. Independent current-head review and CI disposition are recorded on the PR and local handoff before merge.

## Working baseline and limits

- PR #8 passed 79 unit tests, all 19 local browser checks, independent high current-head review and both CI runs. Character sources remain distinct: OCS RNC recovery passes both CRCs and exactly matches OCS Characters.s; CD32 matches separate AGA/snapshot source; legacy editor layout is unsupported. Five language banks contain twelve canonical first-bank choices. See docs/character-format.md.
- Team preparation requires four explicit ordered distinct choices bound to the exact roster source. It never attaches original actors to old checkpoints or changes gameplay. Current items do not establish inventory mutation/water damage, drowning, corpse/environment mutation or faithful death.
- Authored dry-fall drill uses physique/agility 100 and empty inventory, with source-derived cadence/damage and version 3 recovery. Original falling remains disabled. Dry stairs use shared support/collision checks; water, pads, lifts, dynamic/unknown support and unsafe drops remain blocked. Training43's wet staircase stays blocked. See docs/dry-fall.md, docs/static-traversal.md and docs/checkpoints.md.
- Exact Training43 hash `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c` supports a proven four-mercenary extraction route, not whole-level playability. Cooperative extraction is an explicit variant; first-exit race is separate. 601-tick borrow uses a candidate 50 Hz clock; original wall-clock parity is unverified. Other revisions remain navigation-only.
- Campaign travel stays disabled: reconstructed Locations CRC df31 differs from archived runtime 5c21. 47 maps and 20 campaign-related records do not prove playability. Combat/enemies, broader mission dependencies and original timing remain unsupported. Placeholder graphics remain in use.

## Next bounded batch

1. Review a live-character/save contract separately: verified source-bound initialization, inventory state and explicit migration; no implicit roster attachment to existing saves. Dependency: accepted item baseline. Sol medium implementation, independent high persistence review; allow 2-3 hours and stop activation if death/environment invariants remain unsupported.
2. Audit death/water prerequisites: corpse/map changes, inventory-before-immunity ordering, drowning and fall state. Sol medium source work, high review; allow 1-3 hours. Keep original water/falling gated until evidence and implementation tests support them.

Preserve all working drills, checkpoint recovery and opt-in original-map regression tests. Preview 4173 already exists; check servers before starting more. Local handoff: .local/item-next.txt. Original data and scripts remain local; public tests use authored synthetic fixtures.

Decision gates: navigation 3 November; complete level 9 November; campaign scope 16 November; feature freeze 20 November; rehearsal 21-26 November; birthday 27 November 2026. Full campaign remains high-risk. No recurring work is scheduled.
