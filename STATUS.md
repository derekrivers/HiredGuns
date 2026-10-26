# Status — 26 October 2026

This batch implements one **disconnected pure ordinary-floor landing through
actual damage/death composition** on accepted main
`d6f988d05b789d907dc35cf0639ed37ba589c7de` (PR #19). No open PRs or competing
gameplay owners were present at launch; existing worktree states and the held
presentation edits were preserved. Four views, assignments, bounded dry
extraction, retry/checkpoints, authored dry stairs/falls and separate original
team preparation remain the browser boundary. Training43 is not a complete level.

The [new contract](docs/landing-damage-contract.md) restricts inputs to the
observed alive, window-0/control-1/gender-0/grunt-99 ordinary-floor slice.
Strict nested data descriptors and full damage/death validation apply even when
no damage call is requested. It uses the existing nullable landing preparation,
invokes actual pure damage/death on every nonnull request including zero, then
clears that same logical actor's pending value and rereads the actual candidate
cell, including corpse changes. Ordered redundant clears are retained. Source
redraw writes are modeled separately as inert audit records. The staged
unchanged-cell completion API remains intact. No live simulation/UI/renderer,
descent, inventory, checkpoint or artwork changes are made.

The [frozen original observation](docs/landing-damage-composition-observation.md)
remains unchanged: 61 cases, 14 deaths, maximum 112 original instructions,
with naturally bypassed audio and preserved actor/stats/cell references.
Coordinator private API comparison matches all 61 cases, including 28 requests
and 71 ordered clears, without exclusions. Original sources, observer code,
traces and comparison output remain local and ignored; public tests are synthetic.
Source deductions, bounded CPU observations and pure tests remain separate evidence.

Validation: 20/20 new focused tests passed. Relevant local browser checks passed
13 with one optional original-item skip, including the exact private Training43
all-four extraction route and mid-fall recovery. `npm run check` passed lint,
TypeScript, all 244 tests and production build. Final-commit independent review,
passing CI and integration remain coordinator-owned gates. No protection changes.
One gpt-6.1-sol medium implementation attempt; the authored test fixture needed
one evidence-driven block-presence-bit correction. Token usage unavailable.

Exactly one next task: bounded original-instruction observation of **one-cell
dry descent into ordinary non-pad support**, covering eligibility, pending
generation and occupancy ordering through the later supported landing. Exclude
unsupported neighboring geometry/pad/audio branches explicitly. It is not started.

Integrated descent/fall, live death/control/occupancy and pads/corpses, full wet
traversal and source-bound atomic paused checkpoint recovery still gate activation.
[Training43 completion](docs/training43-completion.md) requires the reachable
optional wet stair; dry extraction cannot satisfy it. Loading must never replay
effects or implicitly attach prepared actors. World/checkpoint version 3,
roster-plan version 1 and artwork integration remain unchanged.

Keep **3 November** physical-controller evidence, **9 November** complete-level
evidence, **16 November** campaign/fallback decision, **20 November** freeze and
**21–26 November** rehearsal for **27 November**. Full campaign remains high risk;
the editor/runtime Locations revision mismatch still prevents campaign travel.
