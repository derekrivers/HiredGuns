# Current owner records and recovery

The [policy](POLICY.md) defines authority. These helpers enforce record consistency only; they do not dispatch work, authenticate authority, release resources or approve products.

## One current snapshot

Keep the same owner and registered status path. Version 2 is a closed record: `schema` (exactly `studio-owner-status-v2`), `schemaVersion`, `department`, `ownerThreadId`, `revision`, `updatedAt`, `observedAt`, `authorityRef`, `state`, `activeTask`, `candidates`, `currentBlockers`, `nextAction`, `resources`, `handoffs`, `evidenceRefs`, `historyRef`. The schema name distinguishes unrelated legacy records that also used version 2. The executable schema is `tools/studio/studio_state.py`; run its validator rather than maintaining a competing schema.

- `state`: unknown, idle, working, waiting or blocked. Migration is not a new observation. Preserve source timestamps separately; use null when observation time is unknown. An old observation never authorizes new work or proves current availability.
- `activeTask`: null or taskId/threadId/status/candidateId. Execution status is unknown, running, waiting, interrupted, ready_for_review or in_review. Completion belongs in history and the next handoff; a worker's report is not product acceptance.
- `candidates`: ID, full base/head/tree, disposition (pending/held/accepted/rejected), and scoped evidenceRef. One identity per ID. Multiple distinct PRs are allowed. Acceptance still needs the independent receipt/gates; this validator checks structure only.
- `currentBlockers`: ID, affected scope, owner, nextAction, exitCriterion and evidenceRef. Do not collapse unrelated holds into one department-wide stop.
- `resources`: unique name, state (unknown/held/released), holderTask, observedAt and evidenceRef. A release cannot retain a holder; a held resource needs one. Unknown is never free capacity.
- `handoffs`: stable ID, candidateId or null, transition, receiver, disposition, evidenceRef and nextCheck. A missing wake is recorded as unavailable with its recovery owner, not as a monitoring promise.
- `evidenceRefs`: links to private owner evidence and acceptance/backlog/plan records, without copying their current task fields. `historyRef` links the exact prior bytes and SHA-256; archives are history only.

Prepare a complete draft, validate, then compare-and-replace using the old file's actual SHA-256:

```text
python tools/studio/studio_state.py validate DRAFT_JSON
python tools/studio/studio_state.py write --state OWNER_STATUS --draft DRAFT_JSON --owner DEPARTMENT --expected-sha256 OLD_DIGEST
python tools/studio/studio_state.py render OWNER_STATUS OTHER_OWNER_STATUS
```

Only initial legacy migration uses `--migrate` with revision 1. Subsequent revisions increment exactly once. The writer acquires an exclusive adjacent lock, checks the expected digest, writes and verifies the exact prior bytes under `history/<status-stem>/<sha256>.json`, then atomically replaces the snapshot. On conflict, reread and reconcile; never retry with a new digest without reviewing the competing change. All writers must use this protocol: it cannot prevent a separate uncooperative process from writing between the last comparison and replacement. The owner/deputy check is operational authority, not filesystem access control.

Migration checklist: confirm no active owner writer, inventory consumers, preserve and verify old bytes, prepare explicit selected identities and unresolved conflicts, validate the draft, switch the original status path, check consumer views, and record rollback/handoff in the existing owner ledger. Do not guess from whichever nested historical field appears last. Keep existing acceptance registers and source evidence unchanged. For rollback, archive the failed snapshot and restore the verified legacy bytes under the same owner lock after checking the expected current digest; restore affected consumers too. Never roll back over later unique owner work.

## Ownership recovery

The owning department recovers its resource; an explicitly authorized deputy may act. Producer routes unresolved ownership to the product owner if neither is available. A timeout is an investigation trigger, not a revocation.

1. Record resource, holder task/chat, last verified process identity and the interruption evidence. Inspect actual chat and task-owned process state; idle chat alone is insufficient.
2. Preserve working tree changes, untracked/ignored evidence, failures and output references. Check whether subprocesses still run. Never stop shared or unidentified processes.
3. If execution continues, obtain the applicable stop authority and verify termination. If termination/identity cannot be established, leave the resource unknown/held and record the exact next decision.
4. Record the recovery decision: owner/deputy and authority, observed stopped processes, retained work locations, old holder revoked and time/evidence. A replacement task/reservation is a separate normal dispatch decision.
5. For a file lock, verify the recorded PID's process identity and that its write cannot continue before removing that exact lock. Do not remove locks merely because their PID is missing from an old log or their timestamp is old. Retain the lock receipt with recovery evidence.

This procedure grants no permission to resume a paused programme, discard unique work or bypass review.

## Flow measurement

Copy the [empty sample](templates/flow-sample.json) into the producer's local trial record. Each interval has `taskId`, positive `attempt`, `phase`, UTC `start`/`end` or null, `result` (complete/failed/interrupted/unknown), and measured attempt-total `tokens` or null. Phases are implementation, review, handoff_wait, administration and blocked. Repeated token totals for one attempt must agree; the calculator counts them once.

```text
python tools/studio/flow_metrics.py LOCAL_SAMPLE_JSON
```

Keep recorded duration coverage distinct from total lead time. Same-phase overlaps are unioned; different phases may overlap and must not be summed. Missing phases stay unknown. Include failed attempts. A single trial has no comparative savings result until a comparable baseline exists. Producer ends the trial at the outcome's acceptance or explicit stop and records adopt/revise/rollback; no schedule is added.
