---
name: studio-acceptance-review
description: Independently assess a Hired Guns candidate or claimed playable milestone against its existing acceptance contract and evidence. Use for review and release-readiness assessment, not to implement a candidate or redefine its gates.
---

Read the canonical [studio policy](../../../docs/studio/POLICY.md), repository rules and the identified candidate's acceptance contract. Confirm independence from authorship and pin accepted base, current candidate head/tree and intended scope. Missing local evidence means unavailable, not passed or not applicable.

Map each required obligation to observed evidence: deterministic rules, relevant browser/UI behaviour, source-bound expectations, applicable refusal/failure, outcomes/Retry and supported paused recovery. Separate bounded behaviour, integrated journeys, whole-level software, presentation and physical rehearsal. Keep unknown/reachable unsupported behaviour open.

Inspect required checks/CI and actual automatic findings at the candidate identity. Preserve original failures, retries and NOT_RUN cases. Reuse evidence only with an unchanged-dependency justification. A changed head needs renewed review. Partial replay progress, synthetic fixtures, task counts or source maps cannot establish unobserved acceptance.

Run only checks permitted by the current task and resource ownership. Do not change product code while independently reviewing it, relax assertions/timeouts, take the heavy slot from another owner, or turn this skill into merge authority. Route an unobservable invariant to the engineering/QA verification agreement; report the gate held until sufficient evidence exists.

Return the exact reviewed identity, acceptance scope, evidence inventory, actionable findings, pass/fail/NOT_RUN disposition and remaining gates. Gameplay alone performs the normal final merge after the established conditions. Write the review to its existing local evidence location, keeping private originals out of public summaries.
