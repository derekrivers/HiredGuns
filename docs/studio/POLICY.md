# Studio coordination policy

This is the canonical, versioned policy for reusable Hired Guns coordination workflows. Repository `AGENTS.md` contains the essential always-applicable rules. Skills describe how to apply this policy; they do not grant extra permissions. Explicit user instructions remain authoritative.

## Roles and decisions

| Role | Accountable for | Boundary |
|---|---|---|
| Product owner | Intended experience, fidelity/adaptations, scope and target decisions | Delegates routine sequencing without delegating acceptance waivers |
| Studio producer (existing house role) | Ordered player outcomes, dependencies, capacity planning, forecast, decision follow-through, process improvement and existing progress reporting | Cannot take department writes, dispatch its workers, change gates, merge or resume paused work |
| Gameplay/design/engineering | Source interpretation, player journeys, implementation, testability, shared integration and final normal merge | Cannot independently approve its own candidate |
| QA/release | Verification planning, independent current-head review, regression and acceptance evidence; heavy browser/replay resource | Early collaboration does not remove independent final review; QA-authored changes need a different reviewer |
| Assets/technical art | Source-backed package requirements, approved style, package validation and integration handoff | Gameplay acknowledges integration ownership; asset completion is separate from software acceptance |
| Issue triage | Deduplication, severity, routing and bounded blocker investigations | Producer owns cross-department delivery sequence; an issue does not authorize implementation |
| Audio | Assigned audio evidence and integration work | Current local authorization and paused state apply |

Department coordinators own their status and ledgers. Producer references those records and owns the delivery plan; it does not maintain competing task ownership. Existing work retains its scope, worktree, evidence and gates. Adopt new fields at a natural handoff, without restarting work to retrofit paperwork.

## Git and local records

Git holds this policy, reusable skills, empty templates, validation helpers and reviewed policy rationale. Ignored local storage holds actual coordinator identities, absolute machine paths, automation settings, current tasks, reservations, forecasts, raw results and private evidence. Never copy private game/source/asset material into Git, public issues, CI artifacts or public previews.

On a configured studio host, `.local/studio/coordinators.json` locates owners and their status files. The local operating plan holds deployment-specific instructions; the production plan holds outcome ordering. Software acceptance and milestone registers remain their existing owners' records. Snapshot timestamps and source identities must be visible. Local historical instructions cannot override newer user authority or reviewed policy; report unresolved conflicts to the proper owner.

A fresh clone can read this policy and skills without local records. Missing local records mean operational state is unavailable; do not invent owners, tasks, accepted builds or an active schedule, and do not silently initialize a competing studio. Use the user's identified authoritative records when available. A generated view or active chat is not evidence of gameplay progress.

## Work and handoffs

Organize small packages under player-visible outcomes. Discovery, implementation, bounded acceptance, whole-level software acceptance, presentation integration and physical rehearsal are distinct milestones. Unknown relevance remains an open question, not inactive behaviour or an automatic implementation dependency. Existing software scope does not acquire asset/audio/hardware prerequisites merely because a broader backlog lists them.

Use the [work-package template](templates/work-package.md). New packages/repairs/reviews need a fresh user-visible chat with concise context and explicit model/reasoning under the existing routing policy. No forks, reused worker chats, recursive worker delegation or duplicate active tasks. Check current owner records before dispatch, and use only available, authorized chat tooling. If the required dispatch capability is unavailable, report that limit rather than silently substituting another execution model.

Lifecycle: proposed -> ready -> in_progress -> ready_for_review -> in_review -> accepted. Blocking is recorded separately with cause, owner, next action, exit criterion and timestamp when known. Preserve historical status vocabularies and failed attempts. Ready requires bounded scope, necessary evidence, feasible verification, prerequisite ownership and a receiving owner. Dispatch also requires current authority and resource availability.

For risky save/recovery/cancellation changes, engineering and QA agree the invariant, independent expected result, observation interface, race setup and test layers before implementation is ready. Direct simulation checks and browser-boundary checks answer different questions; neither automatically replaces source-bound or whole-app evidence.

Worker completion means ready for review. Sender records candidate identity, outputs, checks including failures/NOT_RUN, justified evidence reuse, findings, process state and resource release. Receiver explicitly acknowledges that candidate/evidence and next action, or records missing information/rejection. Sender retains follow-through until acknowledgement. A handoff acknowledgement does not approve the product or grant a merge.

Retain one writer at shared gameplay integration boundaries, one heavy browser/replay execution, existing department worker limits and reserved independent review capacity. Gameplay controls its writer slot; QA controls its heavy slot. Holder, task and release condition belong in the owning status. Confirm relinquishment and actual worker/process state before reassignment. Silence, elapsed time and stale records never release ownership automatically.

## Review and acceptance

Product candidates require independent review of the current head, required checks/CI, disposition of actual automatic-review findings and normal expected-head/protected-branch merge by gameplay. A changed candidate requires renewed head-specific review. Reused evidence needs an explicit unchanged-dependency justification; stale checks and summaries are insufficient. Keep failures and retries separate; after two failed repairs without new evidence, reassess scope/evidence before another attempt.

Run the repository's required checks and relevant browser checks for the affected boundary. A process-only change does not need a heavy gameplay replay merely to produce a status report. A required check that was not run remains NOT_RUN with its reason. No review skill may relax an assertion, timeout, product contract or access restriction to obtain a pass.

Playable acceptance requires the established same-app workflow and independent source expectations at the stated scope, including applicable refusal/failure, outcome/Retry and supported paused recovery. A synthetic fixture, imported map, research report, screenshot or completed asset pack does not establish a complete original level. Simulated controls do not establish physical playtesting. Evidence of advancing replay does not prove eventual completion or correctness. Preserve explicit adaptations, unsupported behaviour and unproven native parity.

## Continuous process improvement

Producer reviews flow after meaningful handoffs, repeated blockers, failed reviews/repairs and through existing authorized reporting runs. Normal active-worker waits are not blockers. Reconcile apparent stalls with the owner before intervention; stale telemetry is an observation problem, not proof a worker is stuck. This policy adds no timer, automation, worker restart or resumption.

Record observed delay/rework separately from its hypothesized cause. Prefer a single bounded change with an accountable owner, evidence baseline, success measure, trial boundary, cost/tradeoff and rollback condition. Use the [process-change template](templates/process-change.md). Trial records remain local; only public-safe, reviewed lessons and adopted policy changes enter Git. No unchanged polling reports or ceremonial retrospective is required.

Producer may adjust future sequencing within existing delegated scope. The relevant department reviews proposals affecting its workflow, tests or owned tooling; normal source review applies to implementation. Product-owner decisions remain necessary for changes outside delegated scope, including user-defined acceptance, fidelity, deadline, budget or resumption. A proposal is not approval. Record an existing authorization when sufficient; do not seek redundant permission for routine sequencing.

Compare trial results with the baseline using known timestamps and comparable scope: ready-to-accepted lead time, review wait, blocked age by cause, repairs and accepted player outcomes. Include failed attempts. Missing measurements stay unknown; token counts are measured or unavailable. Do not infer performance, cost savings or delivery dates from task counts. Adopt, revise or roll back based on evidence; update this policy once and keep skills linked to it.

## Reporting and operational dashboards

Forecast remaining outcomes, dependencies, estimate ranges/basis or unknowns, implementation/review capacity and rehearsal reserve. Escalate concrete options when the target is unsupported or a decision exceeds authority. Notifications are for material changes, failures, completion or required decisions; unchanged/non-actionable state stays quiet.

Activity displays distinguish a coordinator from its assigned worker, reported status from observed execution, and worker completion from accepted delivery. Show data age, missing/conflicting observations and offline state. Do not imply that refreshing an old record proves live activity. Remote views expose only the approved minimal operational fields and preserve private access; they do not publish original assets or evidence. A dashboard is a view over owner records, never another dispatcher or acceptance authority.
