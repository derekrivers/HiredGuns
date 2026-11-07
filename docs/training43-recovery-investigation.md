# Training43 recovery investigation

The inventory selection candidate remains under review. The studio remains paused.
This report addresses the restore timeout and observation gap tracked in issue 135.

## What the timeout established

The preserved earlier browser check stopped at its 30,000 ms assertion while
replay was advancing at 2,891 of 3,176 ticks. Forty-seven earlier properties had
passed. That result did not establish a crash, semantic mismatch, eventual
completion or hardware cause. No documented product restore service-level target
was found. The repository's 30-second Playwright test-case timeout is distinct
from the focused assertion timeout; the latter's original author and rationale
remain unknown. The 59,499 simulation-tick mission limit is a separate contract.

A new normal-app check used the exact preserved 3,176-tick checkpoint, unchanged
raw sources and a 30-second restore assertion. Before this repair it completed in
27.4 seconds. After removing redundant private-map comparisons it completed in
17.1 seconds. Both runs compared the entire subsequently exported canonical save
with the supplied checkpoint. These are individual observations, not a benchmark
distribution, native timing claim or retroactive pass for the earlier failure.

## Repair and preserved authority

Reconstruction still copies caller data, imports all three raw sources and checks
the entire supplied map against the newly imported geometry. Public stepping
still checks complete map authority. The private reconstruction and verification
loops now use their privately owned geometry without rewalking that same map on
every tick. Ticks copy mutable overlay planes; progress callbacks receive only
primitive counts. All simulation ticks, catalog/static checks, admission caps,
prospective serialization and final full-pair comparisons remain.

This explicitly revises the older admission note's implementation prescription
to compare the map every tick. It preserves the source-authority obligation at
untrusted boundaries; independent review must verify that ownership premise and
the callback-mutation regression before acceptance. It is not permission to
reuse caller-owned geometry, memoize mutable state or weaken source comparisons.

Restore also records whether the validated pair was installed before updating the
display. A subsequent display exception now reports that the restored state is
retained and paused. A failure before installation continues to report that the
prior state is retained. Neither message promises rollback of a committed pair.

## Observation method

Historical bans on instrumentation, test edits and Save downloads belonged to
specific task or phase scopes; they were not established as global product rules.
The new bounded closeout uses the separately selected observer graph for complete
installed-pair and genuine operation-settlement evidence. Normal application
execution does not expose its port. The old one-run runner package and its
approvals were not reused or relabelled as executed.

The first live observer cases use an independently derived complete v19 tick-zero
pair. They cover a genuine fulfilled restore superseded by Retry, a genuine
rejected restore superseded by Retry, and a current rejected restore. Full pairs,
generation/revision, actual settlement and stale effects are checked, with zero
downloads during each case. A further v23 case interrupts genuine nonempty replay after observed progress,
then verifies actual superseded settlement, the complete independently derived
reset pair and no stale write/error/download. These cases do not establish every
cancellation trigger, every schedule or whole-level completion.

All failed harness setup/observation attempts remain in local evidence. Browser
checks use one worker, no automatic retries and the existing 30-second assertion
limit. Original game data, fixtures and raw journals remain private.

## Remaining acceptance

The source-valid history-capacity check now reconstructs 512 ordinary ticks at
256 packed records, round-trips the complete pair and rejects the next packed
event without changing the prior pair. A separate callback-mutation regression
checks that nonempty replay owns its geometry and raw bytes. Neither test invents
a maximal reachable scene by editing saved bodies or histories.

The byte/work obligation now has an independently calculated structural bound
for final review. The existing strict UTF-8 save guard constrains
variable overlays and death traces; their contribution to capture work can then
be bounded independently of reachability. Maximum canonical expanded history is
512 events: at most two per packed tuple. Fixed source structure, all optional
death/operation schemas and every capture root must be included in the proof.
An accounting envelope is not an importable fixture or a claim about reachability.
The conservative full-pair capture bound is 46,816 visits versus the unchanged
50,000 cap: 39,331 fixed/envelope visits, 2,560 expanded-history visits and at most
4,925 variable visits. The variable bound uses the 24,575-byte maximum admitted
save, a 14,730-byte conservative fixed minimum, and delimiter slack for five
variable arrays. Separate bounds cover import's wrapper-plus-map capture,
aggregate string/key units, depth and collection sizes. Main-owned reset/advance
are induction edges over admitted pairs, not arbitrary untrusted-input APIs.
Final review must verify the decomposition, constants and universal guard paths
before crediting this prospective proof method. No size, work, timeout or mission
limit changes, and no old failed result becomes a pass.

Current local lint, type-check, unit tests and production build pass. The built
application was also exercised with the observer port absent, and its generated
assets contain no observer registration/runtime markers. Fresh independent final
acceptance, exact-head CI and normal merge gates remain separate. An implemented
repair or a passing diagnostic alone does not authorize merging this candidate.
