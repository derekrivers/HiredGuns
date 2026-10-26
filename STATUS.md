# Status — 26 October 2026

Baseline: OCS patched 39.26 source is the behavioural reference candidate. Supplied editor data is a separate, unverified revision. No original executable boot/rebuild or campaign playthrough has been established.

## First batch evidence

- Foundation PR #1 merged after passing CI and independent Sol medium review at 29ce2ca. Build excludes Vite public assets. No original data committed.
- Importer PR #2 merged after passing CI and independent Sol high review at e3c2163. All 47 local Game map hashes match the existing catalogue. A zero-timer egg inventory error was found in review and fixed with source-backed regression coverage. CLI requires ignored .local/ output and refuses replacement.
- Four-view navigation PR #3 merged after passing CI and independent Sol high review at c58b91e: one WebGL scene, four scissored cameras, independent keyboard/standard-pad assignment, explicit disconnect/reconnect status, focus-loss pause, fixed 50 Hz headless simulation, conservative static collision/support and camera interpolation.
- Local full check: 18 tests, lint, typecheck and production build pass. Four Chromium browser tests pass, including simulated four-pad movement/disconnect/reconnect, keyboard/team reassignment, resizing, malformed file recovery and actual local Map13 import/navigation. Synthetic screenshot visually inspected. Physical controller tests and original executable reference remain pending.
- Existing graphics decoder revalidated without replacement: 50/50 checksums and 19/19 independent BOB comparisons. No assets used in the renderer; 12 face comparisons remain to revalidate before asset use.
- Implementation: importer Sol medium, initial attempt plus one review-driven repair. Reviews Sol medium (foundation) and high (binary formats). Aggregate token usage unavailable.

## Recovery batch evidence

- Navigation checkpoint codec implemented by Sol medium in one attempt. Entire level content is fingerprinted; strict version/field/bounds/occupancy checks reject incompatible or corrupt saves. UI exports/loads files and preserves current state on failed load. Controller assignments and original map content are excluded.
- Recovery batch PR #4: independent Sol high review and CI passed at 86217ed. Full check passes 29 tests, lint/typecheck/build. All seven local Chromium checks pass, including checkpoint export/reset/restore, mismatch/oversize rejection, bounded-tick exhaustion/recovery and the prior four-view/Dropzone checks. Current merge disposition is recorded in PR #4.
- Independent saves review caught extreme-tick continuation overflow. Shared simulation limits now stop safely before unsafe integers, checkpoint validation reserves a resumable tick, and UI pauses with reset/earlier-checkpoint recovery. Regression tests cover the exact boundary. One codec review repair; one browser assertion corrected to inspect the intentionally hidden empty error element.
- [Fallback assessment](docs/fallback-assessment.md): Training 43 is a low-complexity mechanics candidate, not a proven birthday release. No campaign exit is reachable under current static-only rules in an individual-start flood check; training 43 has a static exit approach. Source exit handling requires bumping an exit block and evaluating mode-specific success. No original executable boot or complete-level playthrough yet.
- Input ZIP SHA-256 independently rechecked: 2f982ae5662fa9e211e685ae6224a56ec61f87bf9edae93ccddb433071269aa9.

## Next bounded batch

| Task | Dependencies / owner | Files | Acceptance / allowance / escalation |
|---|---|---|---|
| Exit and failure baseline | Reviewed recovery + original mode evidence; Sol medium | contracts, sim mission state, checkpoint schema/tests, UI | Source-backed exit/retirement and timer/failure/retry fixtures; all-four route evidence in Training43; explicit competitive/cooperative policy. 2–3 human-equivalent hours; stop claiming parity if mode/timing cannot be established. |
| Required environment subset | Chosen original route + exit baseline; Sol medium | importer metadata contract, sim environment, renderer, synthetic tests | Source-backed route-required stairs/lifts/pads/water; four-player start-to-exit playthrough with deviations recorded. 2–3 hours per coherent mechanic group; reassess after two failed repairs. |

Keep a known-good navigation build before extending simulation/save schemas. Original reference boot, campaign revision comparison and physical four-controller tests remain open evidence gates. No complete original level or campaign is currently validated.

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
