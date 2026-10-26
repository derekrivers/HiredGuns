# Status — 26 October 2026

Four-view navigation, recovery and bounded Training 43 extraction are merged through PR #5. Current branch adds dry static stairs; no complete faithful original level or campaign is validated yet. OCS patched 39.26 is the behavioral reference candidate; editor data remains a separate unverified revision. No original executable boot/rebuild has been established.

## Current dry-stair batch

- Pure traversal resolver handles all four source stair directions for forward/back/strafe, overhead clearance, target collision and team occupancy. Shared standing validation supports stone/stairs below and tree block4 two levels below; unsafe drops, water, dynamic floors and unknown auxiliaries remain blocked.
- A newly authored four-lane Dry stair drill exposes climbing/descent and elevated checkpoint continuation through normal controls. Amber placeholders distinguish stair blocks. No original map/asset data is added.
- Exit approach validation now follows the same traversal rules, so a stair exit can round-trip its retired lower approach pose; hazardous or obstructed approaches reject. World/save schemas stay at version2 because no persistent state was added.
- Validation and independent review are pending integration. One implementation worker (Sol medium), coordinator UI/save integration, high simulation/save review; allowance 2�3 human-equivalent hours each, two failed repairs without new evidence then reassess. Aggregate usage unavailable.

## Extraction baseline

- Exact Training 43 SHA-256 646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c enables exit missions. Other original revisions stay navigation-only.
- Type-3 block bumps retire mercenaries. Cooperative extraction requires all four; original alive-only first-exit race is an explicit alternative. Source countdown preserves 601-tick integer borrow; timeout wins deadline ties. Candidate 50 Hz is not original wall-clock parity.
- Retry resets mission state. V2 checkpoints preserve rules, counter, exits and outcome; strict V1 navigation migration remains supported. Retired mercenaries no longer occupy cells.
- Local full check passes 43 unit tests, lint/typecheck/build. All 11 Chromium checks passed, including actual Training 43 all-four keyboard extraction, Dropzone navigation, synthetic completion/retry/timeout, partial/completed restoration, first-exit race, assignment and simulated-pad reconnect. PR #5 records independent review, CI and merge disposition.
- Rendering proof: hidden faces removed and coplanar placeholder faces merged; Training 43 block triangles reduced 83,112 to 922. Initial slow software-rendered route test failed, the geometry change resolved it, and the original route passed. Synthetic mesh tests verify winding/area, cavities and distinct exit surfaces. No event-hardware performance claim.
- Model/attempts: Sol medium core worker, one implementation with one test-helper compiler correction; coordinator UI/renderer integration, one evidence-driven geometry repair. Aggregate token usage unavailable. Source, maps, artwork and route data stay out of public commits.
- Independent review passed production logic checks and a full local suite. One intermittent original-route test overshot a planned cell after delayed key-up; its driver now releases inside the page at the observed HUD target and still uses production keyboard handlers. No simulation hook or direct state changes are used for the route proof.

| Task | Owner / files | Acceptance / allowance / escalation |
|---|---|---|
| Exit/failure and save contract | Sol medium; contracts, sim mission/world/checkpoint, synthetic tests | Source counters/exit priority, retirement/occupancy, full save continuation and legacy migration. 2–3 human-equivalent hours; two unsuccessful repairs without new evidence then reassess. |
| Browser route and presentation | Coordinator; UI/renderer, browser tests, new synthetic drill | Four mercenaries finish actual local route, retry/recovery, distinct modes, four usable views; independent high review and passing CI before merge. 2–3 hours; reduce rendering scope if real route fails. |

## Next bounded batch

1. Reference and training mechanics: identify a runnable original reference and verify mode/timing. Both Training 43 lower stair cells contain water; preserve that coupling. Implement source-backed static stairs/block-4 support first with dry synthetic cases, then extend cadence/fall/health/water state explicitly before claiming original staircase traversal. Add pressure-pad/lift/button coverage only from area evidence. Acceptance is original-area coverage and recorded deviations, not another import count. Sol medium; 2–3 hours per coherent mechanic group; escalate contradictory source/runtime evidence.
2. Campaign baseline: decode/compare archived runtime locations against editor headers before enabling travel. CRC mismatch df31 versus 5c21 remains isolated. Keep individual campaign records imported/blocked until their required mechanics and playthroughs are proven.

## Evidence and delivery gates

- PRs #1–#4: clean checkout/build/CI/contracts, 47 hash-matched local editor imports, four views/control routing and validated navigation recovery. Independent Sol medium/high reviews and relevant CI passed; review notes are on the PRs, not separate human approvals.
- Original ZIP SHA-256 rechecked: 2f982ae5662fa9e211e685ae6224a56ec61f87bf9edae93ccddb433071269aa9. Existing graphics tooling revalidated 50/50 checksums and 19/19 independent BOB comparisons. 12 face comparisons remain to revalidate before asset use; renderer uses placeholders.
- Physical four-controller event PC/TV test, original executable observations, broader original mechanics and complete-level validation remain open. All simulated controller results are software routing evidence only.
- Targets: four-view navigation 3 November; complete original level 9 November; campaign scope decision 16 November; feature freeze 20 November; rehearsal/fixes 21–26 November; birthday 27 November 2026. These are gates, not guarantees.
- Full campaign remains high-risk. 20 campaign-related records include the start; import counts do not establish playability. See docs/fallback-assessment.md and docs/mission-rules.md for current boundaries.

No recurring work is scheduled. Keep the known-good navigation build available while extending simulation and checkpoint schemas. Rights/provenance and physical playtests remain separate release constraints.
