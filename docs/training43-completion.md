# Training43 completion boundary

Evidence-only result, 26 October 2026, accepted base
`68e689b525b4c949c8f1ac587f1d47d02064c262`. This does not deliver a
complete level or enable environmental mechanics. The selected editor source is
SHA-256 `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c`.
The unchanged importer is the input boundary; the auditor never mutates its
level or report. Original positions, words, references and routes stay private.

| Interaction | Classification and acceptance consequence |
| --- | --- |
| Four starts, movement, support, collision and exit bump | Required. All four actors replay the existing static route with the full team present, in the browser helper's order. Every command is checked through `stepWorld`; retirement releases occupancy on the next tick. This proves the bounded route, not original gameplay parity. |
| Panel/button records | Inactive on the inspected initial map. Both panel-flagged cells are type zero: executable source dispatch treats them as signs/no-ops. One referenced record is editor-valid and has a block-off action; that flag alone cannot make a sign invoke it. Both directions and targets are retained, including the other sign's stale lift-toggle record and the unreferenced stale block-off record. No functional floor pad is present. |
| Wet stair pair | Reachable optional, source-only. A dry reachable upper approach descends toward the wet lower stair cell using the source's travel mapping. The live resolver refuses that destination. The static exit route bypasses it; fallback acceptance still requires this interaction to work. |
| Remaining water region | Unknown beyond the wet-entry boundary. Every water cell and its words are recorded, including water on the stair block. Presence does not prove a traversed or survivable route. Header water speed is zero, so the inspected `move_water` path does not advance tides; that does not disable immersion, inventory effects, falling or drowning. |
| Lift hydraulics and door slots | Inactive machinery: each lift/door position sentinel is zero despite other nonzero bytes. Hydraulic blocks remain collision/support geometry, not moving lifts. |
| Enemies and items | Selected editor source has no enemy records, enemy block cells, item low-byte cells or closed eggs. Graphics selectors and high item-layer flags do not establish live objects. OCS runtime43 also has no item cells; CD32 runtime43 has one and requires separate revision-specific coverage. |
| Completion, timeout and retry | Required bounded behavior exists; original death/control cases remain unresolved. |
| Checkpoint recovery | Required; current static route/retirement/terminal state round-trips. Live environmental state is outside this save contract. |

Button interpretation is grounded in OCS `Controls&Movement.s` activation and
panel table around 6521–6646, `button_in`/`button_out` around 6667–6735 and
`do_button_action`/block-off around 6744–6931. Panel type one invokes
`button_in`, which reads **actionOut**; type two invokes `button_out`, which
reads **actionIn**. Floor pads instead read actionIn on entry and actionOut on
release. Runtime dispatch does not test the editor `used` flag. Block-off data
is relative to the map structure; lift/door position fields use the data-layer
origin. The auditor checks alignment, bounds and table strides, records both
action domains and marks unsupported action interpretations unknown. A zero
nothing-action datum is not treated as a cell pointer. A dormant valid action
is not a required mechanic.

Stair reachability follows `Controls&Movement.s` movement around 4720–4895 and
its direction callers from 4901. The dry approach search assumes other actors
can vacate and records that limitation; only the separately replayed extraction
route establishes full-team occupancy. No water-removal transform or invented
wet path is used. `Main.s` player fall around 3970–4075 and drowning around
577–645 show why simply admitting a wet destination would be incomplete.

The reference completion mode is the source-derived first-exit race;
cooperative all-four extraction is a labelled variant. The auditor replays both.
`Main.s check_exit` 379–497 counts dead/uncontrolled participants separately,
handles all-dead before action timeout, then resolves completion. The current
all-alive bounded world is not evidence for those original cases. Timeout has
priority over success in that bounded model; original counter sequence is not
wall-clock parity. Retry must reset the whole mission without developer repair.
Before hazards activate, real death, all-dead recovery, participant controls,
occupancy and pad/corpse consequences must be integrated and independently
reviewed. Current checkpoints round-trip after each retirement and at timeout;
future checkpoints must atomically bind source/roster/item identities, actors,
inventory/weight, environment counters, mutable cells, mission and RNG, restore
paused, reject wrong-source/malformed loads without mutation and never replay
effects. No schema change is proposed here.

Runtime comparison was limited to map43. Reusing the existing private RNC1
recovery tool, the OCS map expands to 157,738 bytes; CD32 is already that length.
Both share the editor location header and inspected object-table region, but
**all three map layers differ**. OCS raw SHA-256 is
`0ebafa59120809fb58e2924921e8f47a4f8b1e15a927c915e934c03c6123f5d7`;
CD32 raw SHA-256 is
`c6d188bf099a546bce78174b1ea5388000192fcd56e4c246f30d5b2f82e5e097`.
Their panel words agree with the no-op classification. Neither header agreement
nor those selected agreements establish whole-map/runtime equivalence.

The single nominated wet-entry observation is now complete in
[wet-entry-observation.md](wet-entry-observation.md): the pinned OCS instructions
give threshold 38 for the copied selected nonimmune actor. Post-increment counts
37/38 skip damage; 39 calls `damage_fitness` with 7800 and survives with fitness
60435. Thirty-one isolated cases cover that boundary, DIVU overflow, signed
extension/comparison and counter wrap. Original traces and exact private
cell/approach remain local; synthetic death entries are intercepted and do not
establish real death behavior. This evidence owns diagnostic inputs/outputs only.

The arithmetic and literal inventory candidates now compose in the disconnected
[pure immersion caller](immersion-caller-contract.md). It implements the full
per-actor guard/depth/inventory/immunity/reset/decision order. Ineligible actors
preserve breath state; dry/shallow water resets only the counter. Inventory
precedes race-1/spell-97 breath immunity, and spell 100 bypasses inventory/weight
without granting breath immunity. The optional damage request is inert and
preserves zero versus no call. Unsupported candidates reject atomically; no
actor/world/save state is installed. This removes the caller-ordering dependency,
with no new playable browser behavior.

The existing [drowning decision](drowning-decision-contract.md) and
[water inventory](water-inventory-contract.md) remain unchanged. Twenty-eight
additional bounded original-instruction observations cover all actor guard and
water-presence/depth branches, exact immunity, early-return state and a zero-hit
request. They use synthetic state and intercept damage at entry; no damage/death
instructions execute in those probes. Source deduction, original instruction
observation and public synthetic composition tests remain distinct evidence.

The one adjacent prerequisite is the bounded
[supported-floor landing observation](supported-landing-observation.md): 56
synthetic original-instruction cases settle full/quarter/no-hit requests,
unreachable half-hit branch, real zero-hit calls and pending-clear order.
Damage entry is intercepted with an immediate-return model; no damage/death or
descent executes. The [pure supported-floor landing caller](supported-landing-contract.md)
now implements this request/clear boundary. Preparation retains the original
pending value and a nullable inert hit, including real zero-hit requests.
Separate completion accepts only an explicit storage-preserving modeled return
or the matching no-call branch, then records the first clear and final reread
clear in order, including redundant zero writes. Invalid/changed return storage
rejects atomically; unrelated packed cell bits remain unchanged. No actual
damage/death state is committed and no live browser behavior changes.

The subsequent [actual landing-to-damage/death observation](landing-damage-composition-observation.md)
now executes 61 bounded original continuations, including 14 actual ordinary-floor
deaths, with no helper interception. Natural gender-0/grunt-99 branches avoid
audio; gender is an additional observation restriction beyond the pure API.
A0/A1/A2 return to the same actor/stats/current-cell references, and the caller
clears that actor's pending long only after actual helper return. The final reread
sees death's changed occupancy/corpse cell. All pending masks, zero-hit requests
and redundant skip-branch clears are covered; this remains direct continuation
entry, without descent or proof that every synthetic combination is reachable.

The [pure landing/damage composition](landing-damage-contract.md) now implements
that bounded continuation separately from the unchanged-cell completion API.
It atomically validates the complete observed alive/window-0/control-1/gender-0/
grunt-99 slice, preserves null versus zero requests, applies the existing actual
damage/death candidate, accounts for redraw, then clears the same logical actor's
pending and rereads its changed cell in original order. Ordered redundant clears
remain explicit; unsupported geometry/lifecycle/audio cases reject even on no-call
branches. The coordinator compared all 61 frozen original cases without exclusions.
This pure candidate is not installed into a world, and grants no source authority.

The [one-cell dry descent observation](dry-descent-observation.md) now executes
18 bounded original-instruction cases from the real per-player helper before
eligibility: 15 explicit descent/landing sequences, three guard cases and five
actual deaths. It records the incoming-A2 guard reread, word-wrapped seed and
signed long cap, source occupancy removal, old/current references, floor and
pending writes, real non-pad checks, unconditional third-layer no-monster-bit
clear, actual head insertion and later damage-return/clear order. All 15 naturally
produced landing inputs satisfy the accepted pure composition slice. This is
synthetic initialized storage and explicit helper invocation, with no real tick
cadence, full-map authority or live browser activation established.

The [pure one-cell dry descent transition](dry-descent-contract.md) now implements
that nominated slice independently of the world. Exact own-data snapshots validate
unsigned storage, initialized ownership, bounded logical current/old correspondence,
dry geometry and DIVU before exposing a candidate. It preserves wrapped arithmetic,
packed bits, eleven ordered writes, non-pad checks, third-layer no-monster clearing,
head insertion/redraw and source-cell helper return while current names destination.
Injury remains pending; later landing is an explicit separate composition. Public
synthetic tests and the private 15-case first-return comparator pass, including 165
ordered writes and 225 interleaved records. Frozen 18 and independent 71 reports
reproduce byte-for-byte; this does not establish whole-map authority or cadence.
The full check passes 299 tests; public browser 19/4 optional skips and explicit
local Training43 extraction 4/4 pass. Training43 remains incomplete and unchanged live.

The [initial inert type-one support observation](type1-support-observation.md)
now records 57 complete eligible no-call/survival returns from the real helper
before guards, three guard returns and one deliberately stopped fatal
continuation. Dry support clears delay without descent and retains current/old
references, pose and occupancy. Actual surviving damage returns before pending
clear and current-cell reread. Full-memory and exact ordered-write assertions
pass. The fatal case reaches the excluded death support-search prerequisite;
execution stops before its first excluded stair comparison, after the lower-cell
read/mask, with pending uncleared. No fatal
return or corpse placement is claimed. Existing request decisions match 57/57;
ordinary-floor composition rejects 57/57 unchanged inputs atomically because
this support geometry is outside its contract.

The [pure initial TYPE1 support transition](type1-support-contract.md) now
implements exactly one disconnected dry no-call/computed-survival slice. Complete
own-data storage, coherent head/feedback priority and bounded logical vertical
correspondence validate atomically. Nonzero requests compute full unsigned damage
arithmetic before rejecting any fatal result; pending zero retains low fitness.
Exact ordered writes, actual helper return and current reread preserve references,
packed cells and all unchanged modeled storage. Shared arithmetic preserves the
ordinary-floor damage API and death validator; no geometry is fabricated.

All 57 worker plus 55 independent completed fixtures are explicitly accounted for:
23 plus 16 full candidates match outputs and ordered writes/records; 34 plus 39
exact inputs intentionally reject because original fixture head variants disagree
with this API's stricter coherent feedback priority. No fixture is rewritten or
silently excluded. Five stopped fatal prefixes reject atomically; no fatal return
is claimed. Public synthetic tests cover coherent fatal boundaries separately.
The full check passes 373 tests, lint/types and build; review/CI are coordinator gates.
No live installation or schema change occurs. The historical next nomination was
bounded actual fatal TYPE1 support search/placement/return observation.

The [fatal TYPE1 support observation](type1-fatal-support-observation.md) now
completes 200 natural original-helper returns (111 fatal, 89 survival/no-call).
Death accepts immediate TYPE1 support and installs the corpse in current without
another cell or search advance. Exact writes, full-memory replay, restored actor/
stats/current references, actual damage return, pending clear and changed-cell
reread pass. The prior stop followed the lower read/mask, before its first excluded
stair comparison; prior frozen prefixes remain unchanged. Bounded leader and
nonzero-control cases do not establish team installation or gameplay reachability.
This observation added no implementation or live behavior. Its nominated fatal
extension is now implemented in the disconnected pure TYPE1 support transition
under the existing strict storage/geometry/control-1 prerequisites. Training43,
world/checkpoint 3, roster-plan 1 and all activation/campaign/physical gates remain
unchanged.

Accepted PR27 implements that fatal extension. All 354 private original fixture
inputs are accounted for: 306 full candidates, including 210 fatal outcomes,
match exact writes and return records; 48 control-2/255 inputs reject unchanged.
Historical stopped reports remain prefixes, without invented completions.
The accepted runtime check passes 376 tests, lint/types and build. The next
environment lane is the separately reviewed eligibility extension for observed
controls 2 and 255 under the same bounds; it is active but not accepted.

Accepted PR28 adds the [occupied backpack action-4 observation](backpack-action4-observation.md).
Three bounded original caller executions perform full-entry equipment/selected/
temporary copies, actual weight and feedback calculations, redundant redraws
and natural returns. Independent raw CPU execution reproduces the complete
traces and final-memory hashes. No inventory API, live installation or arbitrary
carried reorder is established. Its fixed prerequisites and unobserved categories,
overflow, rejected callers, full inventories and holes remain explicit. The
next backpack lane is the disconnected pure occupied exchange under those
prerequisites; it is active but not accepted.

Both accepted PRs have exact-final independent approval, completed automatic
reviews without findings and passing relevant CI. Public browser checks pass
19 with four optional-private skips; each lane's local Training43 extraction
checks pass 4/4. These results do not change live browser behavior or establish
physical-controller, TV or complete-level acceptance.

The previously active successor nominations are now accepted in PR30 and PR31.
PR30 retains the same TYPE1 snapshot and geometry but admits observed controls
1, 2 and 255 only. All 354 unchanged original inputs match full candidates,
including 258 fatal outcomes, 4,441 writes and 6,017 ordered records. No party
control transfer occurs in this helper. PR31 adds the disconnected
[pure occupied action-4 exchange](backpack-action4-contract.md) under the fixed
observed prerequisites, with all three original-case candidate/write/raw-memory
comparisons passing. It grants no item-import authority or live inventory use.
Both exact-final independent and automatic reviews pass without unresolved
findings, and relevant CI passes. Coordinator's combined accepted-tree check
passes 503 tests, lint/types and build. Browser behavior remains unchanged.

Those next evidence nominations are now accepted in PR33 and PR34. The
[empty-equipment observation](backpack-empty-equipment-observation.md) executes
three original action-4 transfer/compaction cases, preserving opaque tails on
ID-only clears and executing both weight passes (62 helper calls per case).
Its distinct post-weight selection-decrement branch remains unobserved.
The [after-death control observation](after-death-control-observation.md) verifies
29 natural helper returns. There is no automatic survivor selection on the
inspected death/mouse path: explicit button input over a matching controlled view
in game mode changes mouse selection. Selection is not an alive/dead validator;
device assignment, leader and selected actor remain distinct state. The separate
CPU control-5 observation does not widen the pure TYPE1 contract.

Both exact-final independent and automatic reviews pass without findings, and
relevant CI passes 503 tests plus the public browser baseline; local Training43
extraction is 4/4. These are evidence-only additions with unchanged runtime.
The next independent pure candidates are bounded mouse-0 view selection and
empty-equipment action-4 transfer/compaction under the observed prerequisites.
Neither candidate is accepted yet; no live adapter, automatic living fallback,
hardware cadence or generalized inventory behavior is established.

Integrated descent/fall, actual death/control/occupancy and pad/corpse behavior,
full wet-region outcome and source-bound atomic checkpoint recovery remain
unresolved gates. Completing the pure caller does not authorize wet activation.

Reproduction from this worktree, with the exact local editor file supplied:

```powershell
npx tsx tools/audit-training43.ts $env:HIRED_GUNS_TRAINING_MAP
npm run check
npx playwright test tests/browser/extraction.spec.ts
```

The tool verifies the digest and exclusively creates ignored
`.local/training43/coverage.json`; retain or rename an earlier report before a
repeat. It contains digest-tagged interaction records, target classification,
evidence/blocker, all starts, full routes, dry approaches, wet frontier and
mission/checkpoint results. Private `inspect.py` and `compare.py` in that same
directory reproduce the map43-only recovery and `runtime-comparison.json`
against existing local recovery tooling. They and original output remain
outside Git and public CI. Public tests use synthetic input only and cover
reference units/bounds, no-op versus functional dispatch, missing references,
active versus stale sentinels/item flags, and wrong-source rejection.

Validation: `npm ci`; `npm run check` (127 unit tests, lint, TypeScript and
production build); local extraction browser checks (4/4, including exact
Training43 all-four route) passed. Route helper and browser procedure were
unchanged. Independent exact-head review and CI are coordinator-owned gates.
Model: gpt-6.1-sol, one implementation attempt, one diagnostic correction for
object-key-order-sensitive checkpoint comparison; no failed repair cycle or
recursive delegation. Token usage unavailable.
