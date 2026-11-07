# Work package

Use with the [studio policy](../POLICY.md). Fill this into ignored local records; do not commit actual private assignments or evidence.

| Field | Record |
|---|---|
| Identity and outcome | Task ID, parent player outcome/milestone, acceptance references, purpose |
| Ownership | Accountable department, worker, receiving owner, independent reviewer/reservation |
| Candidate | Accepted base, candidate head/tree, isolated checkout, owned paths |
| Inputs | Dependencies, immutable evidence references, unknown questions, exclusions/protected work |
| Verification agreement | Invariant, independent expectation, observable result, fixture/race setup, direct/browser/source-bound layers, QA acknowledgement where required |
| Acceptance | Success, refusal/failure, unchanged-state guarantees, applicable recovery/Retry and scope limits |
| Capacity | Required resource, holder/task, acquisition/check time, release condition; unneeded resources explicit |
| Routing | Task class under the [routing policy](../POLICY.md#model-and-reasoning-routing), requested model/reasoning, selection reason, high/Astra escalation evidence if applicable, target-host support |
| Dispatch | Fresh chat, authority, attempt, start time or unknown; observed execution model/reasoning when exposed, otherwise unknown, kept separate from requested routing |
| Stop/decision | Stop condition, receiving owner, decision owner, review trigger; two-repair checkpoint |
| Continuation | Human authority reference, next eligible transition/package, accountable next owner, existing wake/check trigger; genuine undelegated decision if any |
| Discovered issues | [Issue workflow](../POLICY.md#bugs-issue-reporting-and-triage), deduplication result, actual issue/comment URL or unposted draft, material new evidence, affected/blocking scope and next owner; report then retain assigned scope |
| Measures | Lifecycle timestamps, blocked cause/age, attempts, measured tokens or unavailable |
| Gate provenance | Gate IDs, exact scopes, authority references and decision owners; bounded unresolved-provenance decision trigger |
| Recovery and closure | Resource recovery owner/deputy and authority; retained evidence, receiver acknowledgement and cleanup condition |
| Completion watch | Actual watcher/owner and existing authorized wake/check that will observe worker completion and retain handoff follow-through until receiver acknowledgement |

## Handoff

Sender: candidate identity, changed paths, output/evidence references, executed checks and failures/NOT_RUN, reused-evidence rationale, findings and discovered-issue links, running/stopped processes and resource-release status.

Receiver: acknowledged / needs_information / rejected; timestamp, received candidate/evidence identity, next action and ownership disposition. Product acceptance remains separate.

An accepting review also needs the [review receipt integrity checks](../review-receipts.md), including native fresh-chat identity and matching current report/manifest references. Record receipt validation errors as pending review evidence, never as an accepting gate.

Use a stable handoff reference combining task, candidate/evidence and requested transition. Record sent/delivery-uncertain separately from receiver acknowledgement. Sender retains follow-through until receipt; persist the next check and owner before returning. Reconcile uncertain delivery before retrying, and follow the [communication protocol](../POLICY.md#communication-and-unattended-follow-through) rather than asking the user to relay routine handoffs.

For asset packages, add named runtime consumer, source/style identity, supported states/directions, required frames, alignment/pivots, transparency, naming, timing, applicable budgets, usage restrictions and omissions. Requirements must be supported by the source or consumer.
