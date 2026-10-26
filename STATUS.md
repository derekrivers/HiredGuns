# Status — 26 October 2026

This batch implements one **disconnected pure supported-floor landing caller**.
It changes no playable browser behavior. Four views, assignments, bounded dry
extraction, retry/checkpoints, authored dry stairs/falls and separate original
team preparation remain the demonstrated browser boundary. Original shooting,
a usable live backpack, environmental damage and complete original death/recovery
remain undemonstrated. Training43 is not a complete playable level.

Launch main was fetched and verified at **dbeee873cf24325ca69a4a3da554af5e1e37903b**
(PR #17), pinned as `codex/supported-landing-base`. No open PRs or competing
gameplay owner were found. All 29 preexisting worktrees were inspected; the
presentation prototype's owned dirty edits were preserved. Both previous-PR CI
runs passed. Earlier approvals are not this batch's approval. The connector could
list rulesets but could not read branch protection (403); no settings changed.

## Callable boundary

`prepareSupportedLanding` validates unsigned 32-bit `fallDamage` and `cellLong`,
copies the pre-dispatch slice unchanged, and computes a nullable inert damage
request. Pending zero requests nothing. For nonzero pending, mask zero requests
the full value; masks 4 and 0x20000 request a logical quarter, including real
zero-hit calls. Masks at or above 0x20004 skip damage. There is no half-hit path.

`completeSupportedLanding` separately validates the explicit no-call or modeled
helper-return boundary. It accepts only unchanged pending/cell storage under the
observation's return convention, recomputes the branch and returns a new candidate
with ordered clear audit records. Initially nonzero pending clears after the
modeled return or on the skip branch. The final cell reread adds a clear at masks
at or above 0x40004, including redundant zero writes. Unrelated packed cell bits
stay intact. Invalid or unsupported inputs reject atomically.

The [API contract](docs/supported-landing-contract.md) states caller obligations.
There is no callback, actual damage/death dispatch, actor installation, descent
resolver, wet activation, inventory/world mutation or save-schema change. An
after-return candidate does not attest that damage/death ran or committed. Real
death may change storage/references; this API rejects changed return storage and
does not establish A0/A2 preservation across that helper.

## Evidence and validation

[Supported landing observation](docs/supported-landing-observation.md) remains the
bounded original-instruction evidence: direct supported-continuation entry,
damage intercepted before execution, immediate return preserving A0/A2 and
actor/cell storage. It proves neither descent eligibility nor helper composition.
This batch reran the unchanged private observer: **56 cases**, four zero-hit calls,
matching script/report hashes. A separate private API comparison matches all 56
cases, 18 requests and **69 ordered pending writes**. Original payloads, addresses,
traces and reports remain ignored; public tests use authored synthetic inputs.

Implementation commit: `031594cb030ebbca419cbb9e1362395de6927b07`.
One gpt-6.1-sol medium worker, one implementation attempt, no repair cycle;
independent gpt-6.1-sol high simulation review and coordinator-only integration
are required; no recursive delegation. Token usage unavailable. Final exact
commit, review and CI are recorded in the PR and ignored `.local/batch-next.txt`;
earlier handoffs are preserved.

`npm run check` passed lint, TypeScript, all **224 tests** and the production
build; the landing module contributes 33 synthetic tests. Local browser regression
checks passed **13 cases**, including explicit private Training43 extraction and
authored fall/recovery. One optional original-item preparation case skipped
because its separate source inputs were not supplied.

Reproduction from this worktree:

```powershell
npm run check
npx vitest run tests/supported-landing.test.ts
npx tsx .local/landing-review/compare.ts
$env:HIRED_GUNS_TRAINING_MAP = (Resolve-Path '../research/original/HiredGunsCD32_DevFiles/Maps/Game/Map43_Training/43.map').Path
npx playwright test tests/browser/extraction.spec.ts tests/browser/checkpoints.spec.ts tests/browser/items.spec.ts tests/browser/fall.spec.ts
```

Private observation: from sibling `immersion-caller`, run
`python .local/landing-observation/observe.py`. The comparison script/report in
this worktree are local-only and are not prerequisites for public tests/CI.

Browser demo: `npm run dev`, open the shown local URL, **Open local .map** with
the same Training43 editor file, then **Start mission**. Keys 1–4 assign WASD/QE.
**Save checkpoint**, **Load checkpoint** and **Retry mission** exercise existing
bounded recovery. The new landing API is demonstrated through tests only.

## Remaining gates and exactly one next task

Removed: the pure supported-floor landing request/clear implementation dependency,
under the observation's explicit return model. The immersion caller and its
inventory/drowning dependencies remain separate accepted contracts.

Exactly one next task: obtain a bounded **actual landing-to-damage/death composition
observation** for the accepted ordinary-floor slice, including surviving/fatal hits,
A0/A2/reference preservation and post-return pending-write targets/order. Do not
start it in this batch. It must resolve whether real helper return can satisfy
the landing continuation before a composed caller is implemented.

Integrated descent/fall, actual death/control/occupancy and pad/corpse behavior,
full wet-region traversal and source-bound atomic checkpoint recovery still gate
activation. [Training43 completion](docs/training43-completion.md) requires the
reachable optional wet stair interaction; dry extraction cannot satisfy it.
Loading must never replay effects or implicitly attach prepared actors. World and
checkpoint version 3, roster-plan version 1 and artwork integration are unchanged.

Keep **3 November** physical-controller evidence, **9 November** complete-level
evidence, **16 November** campaign/fallback decision, **20 November** freeze and
**21–26 November** rehearsal for **27 November**. Full campaign remains high risk;
the editor/runtime Locations revision mismatch still prevents campaign travel.
