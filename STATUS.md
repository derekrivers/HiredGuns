# Status — 26 October 2026

Baseline: OCS patched 39.26 source is the behavioural reference candidate. Supplied editor data is a separate, unverified revision. No original executable boot/rebuild or campaign playthrough has been established.

## First batch evidence

- Foundation PR #1 merged after passing CI and independent Sol medium review at 29ce2ca. Build excludes Vite public assets. No original data committed.
- Importer PR #2 merged after passing CI and independent Sol high review at e3c2163. All 47 local Game map hashes match the existing catalogue. A zero-timer egg inventory error was found in review and fixed with source-backed regression coverage. CLI requires ignored .local/ output and refuses replacement.
- Four-view navigation implemented: one WebGL scene, four scissored cameras, independent keyboard/standard-pad assignment, explicit disconnect/reconnect status, pause on focus loss, fixed 50 Hz headless simulation, conservative static collision/support and camera interpolation. Navigation PR review/CI pending.
- Local full check: 18 tests, lint, typecheck and production build pass. Four Chromium browser tests pass, including simulated four-pad movement/disconnect/reconnect, keyboard/team reassignment, resizing, malformed file recovery and actual local Map13 import/navigation. Synthetic screenshot visually inspected. Physical controller tests and original executable reference remain pending.
- Existing graphics decoder revalidated without replacement: 50/50 checksums and 19/19 independent BOB comparisons. No assets used in the renderer; 12 face comparisons remain to revalidate before asset use.
- Implementation: importer Sol medium, initial attempt plus one review-driven repair. Reviews Sol medium (foundation) and high (binary formats). Aggregate token usage unavailable.

## Task allowances

| Task | Dependencies / owner | Files | Acceptance / allowance / escalation |
|---|---|---|---|
| Foundation | None; coordinator | configs, CI, contracts, README | Fresh install/check, intended public files only, independent review. 1–2 human-equivalent hours; reassess after two failed repairs. |
| Editor-map baseline | Foundation; Sol medium worker | src/import/, tools/import-map.ts, tests/import* | Real local import with hash/bounds/records, malformed synthetic fixtures, explicit unknown fields; 2–3 hours. Escalate offset contradictions or two failed repairs. |
| Four-view navigation | Contracts/importer; coordinator | src/sim/, src/input/, src/render/, src/main.ts, styles, tests | Four synchronized WebGL views, independent assignment and movement/collision tests, browser smoke. 2–3 hours. Reassess unsupported starts/geometry or WebGL failure. |

Worker/review model and effort recorded with results. Aggregate token usage unavailable; allowances are estimates, not enforced budgets.

## Later gates

- Select fallback level by required mechanics; add combat/inventory/puzzles, real exit, failure/retry and versioned checkpoint recovery. Target 9 November.
- Four-view navigation target 3 November; physical four-controller event PC/TV test pending.
- Campaign: 47 editor maps catalogued, 20 campaign-related records including start; zero browser levels validated. Location headers CRC df31 differs from archived RNC header's 5c21; travel blocked pending comparison.
- Campaign scope decision 16 November; feature freeze 20 November; rehearsal/fixes 21–26 November; birthday 27 November 2026.
- Recover assets via existing local tools, not a new decruncher. Validate 50 checksum / 19 BOB / 12 face results before asset use.

No recurring work is scheduled. Rights/provenance and physical playtests remain delivery constraints.
