# Status — 26 October 2026

This gameplay batch adds two **disconnected executable transitions**. It changes
no playable browser behavior and does not establish a complete Training43 level.
The browser retains four views, assignments, bounded dry navigation/extraction,
retry/checkpoints, authored dry stairs/falls and separate team preparation.
Original shooting, live inventory/backpack, environmental damage and coherent
original death/recovery are not demonstrated.

Verified launch main: **07da26b6d678a9334e3ade1e696b216e4d0e964a** (PR #15),
pinned as `codex/drowning-batch-base`. No open PRs, all 24 existing worktrees clean,
and idle prior owners were checked before dispatch. PR #14's automatic review
still reports running with no posted findings; PR #15 completed on `598feed`
without findings and has no subsequent findings. Neither is this batch's approval.
Final reviewed head, CI and accepted merge are recorded in the PR and ignored
`.local/batch-next.txt`; coordinator alone owns integration.

## Two completed implementation tasks

- **Drowning decision:** `decideDrowning` validates four unsigned words, wraps
  the counter, preserves both DIVU results/overflow, sign extension and signed
  comparison, preserves the indicator on skip, and returns indicator 150 plus
  an optional unsigned damage request on call. Zero hit differs from no call.
  [Contract](docs/drowning-decision-contract.md). Worker commit:
  `419eb53e6b85ec815e3920990cd10224fefb2de6`.
- **Adjacent prerequisite removed:** `transitionDrowningWaterInventory` supplies
  the missing pure inventory candidate for the observed OCS drowning caller.
  Equipment plus carried indices 0–15 receive literal word-wrapped water damage
  and ID-only replacement; actions/tail/other bytes remain intact. Spell 100
  skips scan and weight; otherwise all equipment/carried weight is recomputed
  within the existing supported quotient boundary. Unsupported candidates reject
  atomically. [Contract](docs/water-inventory-contract.md). Worker commit:
  `10f1a8978fc2fd0fbef1deebf10e809d078e7621`.

Neither API installs actors, dispatches damage/death, changes rendering, or alters
world/checkpoint v3 or roster-plan v1. Qualification and composition remain
external. The [Training43 completion contract](docs/training43-completion.md)
continues to require the optional wet stairs; a dry extraction route is insufficient.

## Evidence, validation and reproduction

One isolated gpt-6.1-sol medium implementation worker; independent gpt-6.1-sol
high binary/simulation reviewer; no recursive delegation. Each transition took
one implementation attempt with no failed repair cycle. Token usage unavailable.
Public fixtures are synthetic. Original bytes, coordinates and traces stay local.

Independent review reproduced the original 31 wet-entry cases with the pinned
result digest, then compared the drowning API with 364 isolated CPU outcomes and
100,000 independent BigInt cases. Thirteen direct original item-helper executions
cover destruction/container and word-wrap edges. These are bounded CPU evidence;
weight composition is source-derived, and the earlier wet harness intercepts
death before its instructions. None proves a traversed wet route or real death.

Reproduce checks from `repo` (the explicit map is private and excluded from CI):

```powershell
npm run check
npx vitest run tests/drowning-decision.test.ts tests/water-inventory.test.ts
$env:HIRED_GUNS_TRAINING_MAP = (Resolve-Path '../research/original/HiredGunsCD32_DevFiles/Maps/Game/Map43_Training/43.map').Path
npx playwright test tests/browser/extraction.spec.ts tests/browser/checkpoints.spec.ts tests/browser/items.spec.ts
```

`npm run check` passes lint, TypeScript, 159 tests and the production build.
Local browser validation passes ten extraction/checkpoint/item cases, including
the explicit private Training43 route; the optional original-item preparation
case is skipped because its separate source environment variables were not set.
Private reviewer reproduction and exact results are
in `.local/batch-next.txt` and `.local/drowning-review/`; preserved source evidence
remains in the earlier worktrees. Final exact-head review and relevant CI must
pass before accepted-main integration.

Browser demo: `npm run dev`, open the shown local URL, use **Open local .map** for
the same Training43 editor file, then **Start mission**. Keys 1–4 assign WASD/QE;
**Save checkpoint**, **Load checkpoint** and **Retry mission** exercise existing
bounded recovery. The focused tests demonstrate the new disconnected APIs;
the browser demo does not invoke them. No physical four-controller test is claimed.

## Next task and remaining gates

Smallest next task: compose one validated pure immersion caller, ordering
qualification/depth, inventory, breath immunity/reset and the drowning decision,
with an inert damage request. It must preserve the inventory-before-immunity rule.
Wet activation still requires integrated falling, actual death/control/occupancy,
pad/corpse consequences and source-bound atomic checkpoints. Loads must never
replay effects or attach prepared original actors implicitly. Usable inventory,
shooting and complete-level completion/retry/recovery remain undemonstrated.

Derek approved the enhanced Adele portrait as the visual direction. Artwork,
originals and the local comparison are unchanged; no new artwork, environment
graphics investigation, campaign expansion or engine migration occurred. The
comparison remains `repo/.local/adele-enhanced/index.html`. Campaign travel stays
disabled because editor/runtime Locations revisions differ. Existing original
asset provenance and renderer limitations remain as previously documented.

Keep **3 November** physical-controller evidence, **9 November** complete-level
evidence, **16 November** campaign/fallback decision, **20 November** freeze and
**21–26 November** rehearsal for **27 November**. Full campaign remains high risk.
