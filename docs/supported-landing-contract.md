# Pure supported-floor landing request and clear continuation

26 October 2026. `src/character/supported-landing.ts` implements one disconnected
supported-floor landing caller as two synchronous stages. The bounded evidence is
the [supported-floor landing observation](supported-landing-observation.md).
These stages do not establish support, descend, schedule actors, dispatch a
damage/death helper or install actor/map state. They do not change the authored
[dry-fall drill](dry-fall.md), simulation types, browser behavior or checkpoints.

`prepareSupportedLanding(input)` accepts exactly `fallDamage` and `cellLong`,
each an explicit integer in 0..4294967295. The latter is the packed cell long,
including opaque bits. It returns an independent `preDispatch` copy with pending
damage unchanged and a nullable inert `damageRequest: { requestedHit }`.
The request follows this literal table for `mask = cellLong & 0x60004`:

| Pending | Mask | Request |
| --- | --- | --- |
| 0 | Any | null |
| Nonzero | 0 | Full unsigned pending value |
| Nonzero | 4 or 0x20000 | Pending logically shifted right twice |
| Nonzero | At least 0x20004 | null |

There is no half-hit branch. A nonzero pending value below four on either
quarter-hit encoding returns `{ requestedHit: 0 }`, a real request. Callers
must test for null explicitly. Preparing a request neither clears pending nor
claims that damage occurred, the actor survived, or a helper returned.

`completeSupportedLanding(input)` accepts exactly `preDispatch` (the same
two-field slice) and `continuation`, with exactly `kind` and `slice`. It
revalidates the pre-dispatch slice and recomputes the request; callers cannot
provide a decision or effect list as authority. For a nonnull request, `kind`
must be `modeled-helper-return`; for null it must be `no-helper-call`.
The continuation slice is another explicit two-field slice. Both its pending
value and its entire cell long must equal the pre-dispatch values. Changed
storage rejects as unsupported, including an opaque cell bit change.

`modeled-helper-return` explicitly selects the observation's immediate-return,
storage-preserving convention. It does not prove that a real helper was invoked
or that its references survived. The observation preserved A0/A2 plus actor and
cell storage while intercepting damage at entry. No actual damage/death
instructions executed. This API has no registers, reference tokens, callbacks,
actual helper composition or authority to assert real death-reference
preservation. For null requests, the supplied continuation slice describes the
unchanged state on the branch that makes no helper call.

Completion returns an independent `candidate` and ordered `pendingWrites`:

1. If pending was nonzero, write zero with phase `after-helper-return` when a
   request existed, otherwise `damage-skipped`. The modeled helper sees the
   original nonzero pending; this write occurs only in the completion stage.
2. Reread the candidate cell and mask it. At or above `0x40004`, write zero with
   phase `final-cell-reread`, including when the first write already cleared it
   or pending was initially zero. Each record has the actual `before` and
   `after: 0`; redundant writes are retained.

The final pending value is zero on this unchanged-cell slice. Initial zero
below the final threshold produces no writes. The packed cell long is always
preserved exactly. Records describe writes already represented by the candidate;
they are inert audit records, not effects to dispatch again.

Every boundary rejects missing, extra, symbol, nonenumerable extra, inherited-only
and accessor fields; exact own nonenumerable data fields are accepted. Wrong
types, fractions, nonfinite or out-of-range numbers and mismatched continuation
kinds reject before producing a candidate. Accessors are not executed. Inputs
are never mutated, including unsupported post-return storage; output copies are
independent. The caller must retain the matching pre-dispatch slice: the API is
pure and stateless, with no execution receipt or replay prevention.

The caller remains responsible for proving support, eligibility, pending-state
origin and the cell's correspondence to the actor. Only the two explicit fields
are modeled; unrelated actor state has no representation or mutation here. A
future real composition with [ordinary-floor damage/death](damage-death-contract.md)
must validate the complete accepted actor/map slice, actual helper outcome and
preserved actor/cell references before targeting the post-return clear. Passing
this API a slice is insufficient evidence for live installation. Integrated
descent, death/control/occupancy and pads/corpses, full wet-region outcomes and
atomic source-bound recovery remain unresolved. No wet activation follows.

Public tests use authored synthetic integers only: every mask, unsigned maxima
and high-bit logical shifts, null versus zero hits, retained pre-dispatch pending,
ordered/redundant writes, exact opaque-bit preservation, independent outputs,
malformed storage/shape and immutable unsupported return rejection. No original
bytes, private addresses or traces appear in code or tests. Browser validation,
private comparison and independent review remain coordinator-owned.

Validation: focused tests passed 33/33; `npm run check` passed lint, TypeScript,
all 224 repository tests and production build. Dependency setup used an ignored
`node_modules` junction to the existing repository dependencies.

Model: gpt-6.1-sol, medium; one implementation attempt. Token usage unavailable.
