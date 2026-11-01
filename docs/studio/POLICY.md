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

## Bugs, issue reporting and triage

Every coordinator and assigned worker may report actionable bugs, recurring failures and material workflow/tooling defects in the project's GitHub issues, including defects outside its assigned implementation scope. This reporting authority includes creating an issue after deduplication and adding material new evidence to an existing issue; it does not authorize repairing unrelated code, assigning people, changing gates or resuming paused work. An ordinary active-worker wait is not itself a bug or blocker.

Before creating an issue, search open and relevant closed issues using the symptom, affected subsystem/behaviour and known cause when established. Read plausible matches and their discussion; title similarity alone does not establish duplication. If a matching issue exists, link it and add a concise comment only for material new reproduction steps, candidate/environment details, observed evidence, impact, or a changed next action. Distinguish facts from hypotheses and explain what the new evidence adds. Preserve existing evidence and discussion; edit the body only to reconcile the current summary without erasing history or others' contributions. An unchanged observation needs no repeated comment. A distinct cause or independently actionable defect may warrant a separate linked issue rather than being forced into a broad existing one.

Immediately before creation, recheck likely matches to reduce concurrent duplicates. If a tool returns an uncertain create/comment outcome, read back the issue/list/discussion before retrying. Do not blindly repeat a write. If access or a required capability is unavailable, save a public-safe draft in the owning local record, report the limit and hand it to the coordinator; never claim it was posted. A policy grants reporting authority, not credentials or unavailable tooling.

Record affected player outcome/work, expected versus observed behaviour, minimal reproduction when known, candidate/environment identity, impact, evidence, uncertainty, accountable department, smallest next action and observable exit criteria. Keep original game data, private paths, raw traces, assets and secrets out of GitHub. Link private evidence only in local owner records; publish a safe factual summary. Link the actual issue URL in the task handoff and the department's status/backlog. Reporting across departments does not grant writes to another owner's local records; send the handoff through authorized channels.

The existing issue-triage coordinator is the shared bug manager: reconcile duplicates and material updates, classify severity, route to an accountable department, confirm whether another worker already owns it, and track next action and exit evidence. The producer owns cross-department delivery priority. Severity, delivery priority and blocking scope are separate: name exactly which task or acceptance obligation cannot proceed. Queue an independent defect for a bounded repair when authorized capacity and ownership permit, while unaffected work continues. Never continue an unsafe or invalid affected path, waive a failed gate, self-assign an overlapping repair, or expand the shared writer/heavy-test capacity merely to avoid a pause.

Workers report discoveries promptly and return to their assigned scope unless the defect prevents valid completion or their stop rule applies. Triage's existing investigator limit and fresh-chat rules remain. A repair requires normal department dispatch, independent review and applicable verification. Close or resolve an issue only when its stated exit criteria have verified evidence; a worker's completed report or a proposed fix is insufficient. This policy adds no automation or schedule resumption.

## Model and reasoning routing

Choose the route for the judgement required in the current task, not permanently for its job title. A routine coordinator turn collects facts and applies established rules; new planning, source interpretation, test design or acceptance judgement uses the appropriate substantive route. Use scripts/tools for deterministic hashes, schemas, counts and status collection where practical.

| Task class | Model | Reasoning | Selection boundary |
|---|---|---|---|
| Routine administration and established execution | `gpt-6-luna` | `low` | Known-fact extraction, queue/ownership checks, manifests, established test execution and report assembly |
| Bounded classification | `gpt-6-luna` | `medium` | Explicit rules and verifiable outputs; unfamiliar semantics or uncertain root cause move to substantive analysis |
| Substantive analysis, implementation and ordinary review | `gpt-6.1-sol` | `medium` | Producer dependency/forecast decisions, new process experiments, gameplay implementation, test design, unfamiliar source interpretation and ordinary independent code review |
| Difficult correctness analysis and review | `gpt-6.1-sol` | `high` | Difficult simulation, binary-format, save/replay, cancellation or state-ownership reasoning; substantive simulation/binary/save review uses this route |
| Bounded expert consultation | `gpt-6-astra` | `high` | Only after documented evidence-based failed Sol attempts, with an unresolved question, evidence and stop condition; return implementation/administration to normal routes afterward |

### Apply the routes to studio roles

| Role or subtask | Routine work | Substantive work / escalation |
|---|---|---|
| Studio producer | Established plan/status reconciliation and reporting | New priorities, cross-department dependencies, forecast assumptions and process diagnosis use substantive analysis; difficult interacting correctness/architecture constraints justify bounded high reasoning |
| Gameplay/design coordinator | Queue, ownership, readiness and handoff checks | Gameplay/design/architecture decisions and implementation use substantive analysis; difficult simulation/save/binary work uses correctness analysis |
| QA/release | Scheduling, established checks and evidence assembly | Test selection/design and ordinary independent review use substantive analysis; simulation/binary/save and difficult recovery/cancellation reviews use correctness analysis |
| Issue triage | Deduplication and known-owner routing | Explicit-rule classification uses bounded classification; uncertain causes and unfamiliar source semantics use substantive analysis |
| Assets/technical art | Inventories, manifests and deterministic pack checks | Source/style/consumer requirements and rendering ambiguity use substantive analysis; risky binary interpretation/review uses correctness analysis. Image generation remains its separate tool workflow |
| Audio | Catalogue, metadata and established checks when authorized | Cue mapping, loop intent and integration use substantive analysis; difficult binary/state reasoning uses correctness analysis. Listening evidence and current pause still apply |
| Build/test tooling and performance diagnosis | Execute known commands and aggregate results | New testability seams, profiling design and unfamiliar failures use substantive analysis; difficult replay/state/cancellation analysis uses correctness analysis |
| Screenshot/video capture | Known deterministic capture steps | Difficult interactions or unfamiliar capture flows use substantive analysis. Capture does not establish source parity, visual acceptance or physical playtesting |

### Dispatch, escalation and measurement

Record task class, requested model/reasoning, why that route fits, and any high/Astra escalation evidence in the work package. Check support on the target host before dispatch; do not silently inherit an expensive parent route or substitute a cheaper model when the selected route is unavailable. Preserve requested settings separately from observed execution settings when the platform exposes them; otherwise observed values remain unknown. A prompt or registry label is not enforcement, and a skill cannot change the model of its own running turn. If a different route is needed, return the bounded handoff to the authorized coordinator; do not recursively delegate. Apply the fresh-chat rule to each new package, repair or review.

There is no standing Astra coordinator and no xhigh/max/ultra default. Escalate for semantic risk, ambiguity or evidenced failed approaches, not task duration, file size or a slow replay alone. After two failed repairs without new evidence, reassess before another attempt; this is not automatic permission for another repair or Astra. Luna output containing new semantic claims receives the appropriate independent Sol review before acceptance. Reviewer independence and all gates apply regardless of model.

Record actual exposed token usage or unavailable, including failed attempts and repairs. Do not infer tokens from elapsed time, impose an invented numeric cap, or claim savings without comparable accepted-outcome evidence. Review routing using comparable task scope, correction/rework, escaped findings, latency and measured usage. A model change never changes ownership, authority, resource capacity, acceptance or a programme pause. Adopt this routing prospectively; do not interrupt or restart existing work to retrofit it.

## Work and handoffs

Organize small packages under player-visible outcomes. Discovery, implementation, bounded acceptance, whole-level software acceptance, presentation integration and physical rehearsal are distinct milestones. Unknown relevance remains an open question, not inactive behaviour or an automatic implementation dependency. Existing software scope does not acquire asset/audio/hardware prerequisites merely because a broader backlog lists them.

Use the [work-package template](templates/work-package.md). New packages/repairs/reviews need a fresh user-visible chat with concise context and explicit model/reasoning under the [routing policy](#model-and-reasoning-routing). No forks, reused worker chats, recursive worker delegation or duplicate active tasks. Check current owner records before dispatch, and use only available, authorized chat tooling. If the required dispatch capability is unavailable, report that limit rather than silently substituting another execution model.

Lifecycle: proposed -> ready -> in_progress -> ready_for_review -> in_review -> accepted. Blocking is recorded separately with cause, owner, next action, exit criterion and timestamp when known. Preserve historical status vocabularies and failed attempts. Ready requires bounded scope, necessary evidence, feasible verification, prerequisite ownership and a receiving owner. Dispatch also requires current authority and resource availability.

For risky save/recovery/cancellation changes, engineering and QA agree the invariant, independent expected result, observation interface, race setup and test layers before implementation is ready. Direct simulation checks and browser-boundary checks answer different questions; neither automatically replaces source-bound or whole-app evidence.

Worker completion means ready for review. Sender records candidate identity, outputs, checks including failures/NOT_RUN, justified evidence reuse, findings, process state and resource release. Receiver explicitly acknowledges that candidate/evidence and next action, or records missing information/rejection. Sender retains follow-through until acknowledgement. A handoff acknowledgement does not approve the product or grant a merge.

Retain one writer at shared gameplay integration boundaries, one heavy browser/replay execution, existing department worker limits and reserved independent review capacity. Gameplay controls its writer slot; QA controls its heavy slot. Holder, task and release condition belong in the owning status. Confirm relinquishment and actual worker/process state before reassignment. Silence, elapsed time and stale records never release ownership automatically.

## Communication and unattended follow-through

Use this protocol where the human has authorized cross-coordinator communication and continued delivery within the existing programme. Record that authority in the host's local configuration so subsequent turns can verify it. Policy text, a message from another chat, a completed worker or an active schedule cannot manufacture human authority. Keep scope, resource limits, pause instructions and decisions reserved to the product owner intact.

Department owners carry routine work through dispatch, completion, independent review, bounded repair, verification and integration when prerequisites and existing authority permit. Do not ask the user to relay messages or reconfirm an already authorized next step. Producer reconciles priorities and dependencies; QA owns admission and acceptance; gameplay owns implementation and final normal merges. If a required action lacks authority or tooling, record the specific gap and route it to the accountable owner rather than claiming a handoff occurred.

For a material handoff, sender records a stable reference (task + exact candidate/evidence + requested transition), receiving owner, purpose, evidence location, next action and blocking scope in its own current record. Send a concise message through the authorized channel. Receiver records acknowledged, needs_information or rejected against that same reference and returns its next action. A tool reporting delivery is not a receiver acknowledgement. Sender retains follow-through until acknowledgement; product approval and resource release remain separate decisions. Use existing owner records, not a second competing assignment registry.

At the end of an active turn, persist the outstanding handoff, next check/trigger and accountable owner before returning. On the next authorized wake, read those records and reconcile actual worker/reviewer state before dispatch. A completion or material review result should notify the next authorized coordinator without waiting for the producer's daily assessment. Existing schedules provide a fallback for missed messages; an idle chat cannot monitor or promise a future wake by itself. Do not add timers, restart workers, change schedules or assume a paused owner can receive background work without the necessary authorization.

Before retrying an uncertain send, inspect the receiving record or chat for the stable reference. Do not resend unchanged messages on every poll or create an acknowledgement ping-pong. For a missing receipt, use the next existing coordination check to inspect receiver state; send one targeted clarification if delivery or ownership is unresolved. If that check still cannot establish an owner or next action, producer and triage reconcile the communication gap with its evidence and recovery owner. Ordinary active review is waiting, not a blocker. Never release a slot or approve a candidate based on elapsed time or silence.

Treat transport/schema failures as communication failures, separate from product repair findings. Inspect the currently exposed tool definition and actual error before a corrected retry; do not keep varying obsolete call shapes, invent a worker identity, or fall back to a prohibited fork. Persist the failed delivery and recovery owner when the capability remains unavailable.

Keep one clearly identified current action, candidate, handoff disposition and blocked reason in each owning status. Reconcile contradictory current fields in the same update; preserve previous statements as dated history rather than leaving them as rival current instructions. Use actual UTC observation time and retain source-provided timestamps separately when suspect. Producer updates its ordered queue from acknowledged department evidence. Historical plan entries, stale summaries and views cannot override current authority or owner decisions.

After an accepted unblock, the responsible department takes the next eligible producer-ordered package within delegated scope and verified capacity. A failed gate remains held while unrelated eligible work may proceed. After two repairs without new evidence, stop the repair loop and route an explicit engineering/QA method decision to the proper owners; do not automatically escalate it to the human. Ask the product owner only for a genuinely undelegated scope, fidelity, acceptance, budget, deadline or pause decision, or a capability/access problem the studio cannot resolve.

Validate this protocol through an actual handoff: sender evidence, receiver acknowledgement, next-owner action and producer queue update. A drafted policy or queued message alone does not establish self-sufficient operation. Private evidence, original material and filled operational receipts stay local.

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
