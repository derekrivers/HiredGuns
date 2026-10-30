# Training43 completion boundary

Accepted gameplay through PR105 at `a130fb75a4e676464205164bd10c39e0ca2925aa`
(tree `d3afbdb1cf8c68b9184b78df61d43ac593c3fc2e`). Same-app verified team,
paused inventory/exchange, isolated gun encounter, one-click setup, selected-team
authored dry fall, guided controls and authored ground cache have accepted packets.
PR100 supplies the accepted immutable button/block transition.

Candidate: [keyboard button/static gate practice](training-gate.md), using a
canonical authored arena and the current verified selected team. C reverses a
front-cell panel via PR100; closed gates block movement, open gates admit actual
walkthrough, and authored occupancy/reservation protection refuses closure.
Source-bound v9 replay preserves interleaved inventory and independently validated
encounter state. Ground-cache and dry-fall modes stay separate; reopen Training43
and Apply a fresh team to switch. This packet awaits independent HIGH/current CI/
completed automatic review and normal coordinator integration.

| Capability | Current scope and remaining boundary |
| --- | --- |
| Startup / movement / selection / pause | Same guided app; four views, verified local OCS team and keyboard control. Original startup and hardware-controller parity remain separate. |
| Inventory / ground | Accepted paused equip/exchange/return and authored relocated-cache pickup/drop with v8 recovery. Gate v9 supports interleaved inventory. No original world item placement or general use. |
| Weapons / encounters | Accepted isolated authored dummy/miss and source-derived gun arithmetic. Separate authored ammo; no world enemies. |
| Buttons / gates | Candidate same-app authored static panel/gate, shared collision/display candidate and closure interlock. Original Training43 signs and inactive door slots remain inactive; moving doors, pads and lifts unavailable. |
| Falling / water / death | Accepted selected-team authored dry fall with v7 recovery. No gate/ground mixed fall replay; no changed-block recalculation of old injuries. Wet outcomes and original lifecycle remain unavailable. |
| Mission / retry / recovery | Accepted bounded Training43 extraction/timeouts. Candidate gate retry resets words/history/inventory/encounter; complete paused v9 recovery verifies canonical fixture and chronological world. Schema 3 and size bounds unchanged. |

Training43 and the complete functional test bed remain incomplete. No original-map
runtime parity, full level, enemy, wet, moving-door, campaign, graphics or audio
completion is claimed. Public tests use synthetic fixtures; private originals and
browser evidence stay ignored. Physical controllers/TV remain deferred.

The original assessment below is historical; its unchanged-browser/recovery statements predate the accepted session/inventory work.

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
Those next pure candidates are now accepted in PR36 and PR37. The
[empty-equipment transition](backpack-empty-equipment-contract.md) retains the
three observed prefix/selection arrangements, full-entry transfer, forward
compaction, ID-only clears, unchanged count/temp/padding and both weight passes.
All three complete candidates, interleaved records and full-memory reconstructions
match original execution. Its post-weight selection decrement remains excluded.
The [mouse-0 candidate](mouse0-selection-contract.md) covers exactly five observed
decisions with complete initialized storage/layout validation and inert pointer
records. All five full candidates, ordered writes and raw-memory reconstructions
match; this creates no automatic living fallback or alive/dead validator.

Both exact-final independent reviews approve without findings, automatic reviews
complete at those heads without findings and relevant CI passes (513 and 552
tests respectively). Public browser checks pass 19/four optional-private skips;
each lane's local Training43 extraction passes 4/4. Coordinator verifies the
combined merged deltas and runs 562 tests, lint/types and build successfully.
Neither transition is installed live. Source/layout/storage-codec authority,
hardware/input binding and live actor/occupancy adapters remain prerequisites.
PR39 and PR40 now accept the post-weight reachability evidence and private
source-bound mouse fixture diagnostic, through main
`e85cc8059df963a9cf9bc978224cf6b496cc930d`. The
[selection boundary](backpack-post-weight-selection-observation.md) proves the
decrement unreachable for non-full contiguous prefixes. One original CPU run
reaches it with all thirty slots occupied, selection 29 and nonzero first padding
ID. Gameplay padding provenance remains unproved, and API rejection is unchanged.
Structural deductions are not additional CPU cases. The
[private source-bound fixture producer](mouse0-source-binding.md) reproduces five
complete projections, ordered writes and full-memory reconstructions with exact
codec ownership. Original static identity does not make its authored roster or
opaque storage canonical live state.

Coordinator independently reads/hash-verifies both exact-final HIGH approvals,
completed no-finding automatic reviews, relevant successful CI and sequential
normal merged deltas/combined tree. Both changes are documentation-only: the
562-test baseline, browser behavior, schemas and live gates remain unchanged.
PR42 and PR43 now accept those two bounded diagnostics, through main
`4669edd91f3e5f09ab4727ba1e36d0179615bd50`. The
[downward selection evidence](backpack-down-navigation-observation.md) establishes
selection zero to one and the adjacent empty-successor stop, preserving inventory
and opaque weight/feedback. The per-player original call returns naturally;
the outer routine remains an observed prefix. The
[canonical initialization diagnostic](initialized-team-source-storage.md) calls
the verified initializer and produces complete stats plus source-owned partial
runtime/global storage. Of 6,938 covered bytes, 1,196 are known and 5,742 remain
explicitly unknown. Complete initialized memory still needs the bounded prestate;
source deduction is not CPU initialization parity or post-death fixture fit.

Both exact-final independent HIGH approvals, completed no-finding automatic
reviews and relevant green CI pass. Each lane records 562 tests/lint/types/build,
public browser 19 passed/four optional skips and local Training43 extraction 4/4.
Coordinator verifies sequential normal merged deltas and combined tree; these
documentation-only changes retain the runtime baseline.

The next accepted sequence is PR45's pure DOWN transition, PR46's source-derived
initialization prestate diagnostic, PR47's UP CPU evidence and PR48's pure UP
transition. Current main after shared-status PR44 is
`6e2e3c43cb144f442afefb4e220f687454b5369d`. The two pure navigation helpers
handle only their observed two-entry movement/stop cases, preserving complete
inventory and opaque weight/feedback with immutable detached results and ordered
writes. Complete candidates and full-memory replays match the original cases.
No live input installation, general inventory coverage or weight authority follows.

The initialization prestate diagnostic keeps earlier clear effects distinct from
unknown return bytes and records the indirect frame/timing dependencies. Its
private read-manifest omission was corrected and independently re-reviewed.
It claims no original CPU run or complete initialized memory. All accepted exact
heads have independent approval, completed no-finding automatic reviews and
relevant green CI. PR45 records 570 tests and PR48 578; each records public browser
19 passed/four optional skips and local Training43 extraction 4/4. Coordinator
verifies normal merged deltas/trees and runs 578 tests/lint/types/build on accepted
PR48 main. The later shared-status merge is documentation-only.

PR49's [return-footprint diagnostic](team-initialization-footprint.md) is now accepted
at main `f49ffbc4b30b0a098d028468931eb7df0144e037`. Unchanged original instructions
execute the caller clears and quick-initialization to natural return with explicit
authored memory frames and hardware reads. Independent original CPU/source proof,
ordered effects and full 16 MiB replay agree. Source-owned values/origins remain
distinct from emulator backing; these inputs grant no canonical live or physical
hardware authority. Four actual team-helper invocations remain a separate task.

The exact final head has independent HIGH approval, completed no-finding automatic
review after one documented retry, and relevant green CI. Coordinator verifies
normal expected-head merge and combined tree. This documentation-only change
retains the 578-test runtime baseline; its lane records 570 tests, public browser
19/four optional skips and local Training43 extraction 4/4 on the earlier base.
PR50's [empty-equipment ACTION3 stop evidence](backpack-action3-observation.md)
is now accepted at main `19399aa94edbeffbdf807e6abf4511688b168489`. Both initialized
selections return naturally after bookkeeping and action consumption, preserving
all inventory, selection and redraw. Exact-final independent HIGH approval binds
explicit registers and guarded comparison outputs; automatic review completed
without findings after its one documented retry, with relevant green CI (578
tests, public browser 19/four optional skips) and separate local Training43 4/4.
Coordinator verifies normal expected-head merge and combined tree; no live
behavior changes.

PR53 adds the disconnected pure empty-equipment ACTION3 stop. PR55 supplies
separate occupied-equipment insertion CPU evidence and PR56 implements only that
bounded insertion slice. Current main is
`1a9349aa8f530b9e0e99137ae4445174feb348b4`. Reverse full-entry copies, full equipment
transfer, ID-only clear, one weight/feedback pass and redundant redraw retain
source order; complete candidates, 74 ordered records and full 8 MiB replay agree.
Stored count two remains despite three occupied IDs, an explicit diagnostic
limitation without population consistency, general inventory or live authority.

Each accepted final head has independent HIGH approval, completed no-finding
automatic review and relevant green CI. Public browser checks pass 19/four
optional skips and each separate local Training43 extraction passes 4/4.
Coordinator verifies normal merged deltas/trees and runs 594 tests/lint/types/build
on accepted PR56 main. Browser behavior remains unchanged; these helpers are
disconnected and do not replace physical-controller/TV/full-level acceptance.
Subsequently accepted PR57 supplies original full-capacity ACTION3 refusal
CPU evidence; PR58 adds the disconnected bounded refusal transition. The final
carried ID alone selects failure. Complete storage and feedback remain intact;
four ordered non-stack writes and two natural return records match the original
case, complete candidate encoding and chronological 8 MiB replay. Diagnostic
count thirty despite thirty-one occupied IDs grants no population or live authority.

Accepted PR54 executes all four original initialization helpers and actual weight
calls through the boundary before time-limit bookkeeping. Independent source
chronology, complete 16 MiB replay and all four bounded actor-data results agree.
Source-known/unknown origins remain distinct from authored memory/hardware inputs.
The outer caller has not returned; whole startup and live installation remain
outside this evidence. Its single documented stalled-review retry completed
without findings.

Each exact final head has independent HIGH approval, completed no-finding
automatic review and relevant green CI. Coordinator read/hash-verifies reports
and verifies sequential normal merged deltas/trees. Root PR58 main passes 602
tests, lint/types and build; the following PR54 merge is documentation-only.
Each lane records public browser 19/four optional skips and separate local
Training43 extraction 4/4. Live behavior remains unchanged. Current accepted main
is `10db81029864b5270120f889f7b511e4007bf647`.

PR60 subsequently establishes the exact original selection-one insertion case;
PR62 admits it in the disconnected pure helper while preserving complete prior
selection-zero results. Slot zero stays intact, 28 reverse full-entry copies
precede equipment transfer/ID-only clear and one weight/feedback pass. Complete
candidates, ordered write/return records and full 8 MiB encoding/replay agree with
independent original CPU executions for both selections. Count remains diagnostic;
no general inventory, population consistency or live authority follows.

PR61 accepts the remaining initialization timer tail and natural outer return.
Independent source/CPU and full 16 MiB replay agree. The return consumes unchanged
externally authored diagnostic stack bytes, with no actual preceding startup-call
provenance. Raw SR differs from architectural flags predicted for the final store;
CCR parity remains unproved. No state correction, forced return or whole startup
claim conceals those limits. Known/unknown source origins remain separate.

All three exact finals have independent HIGH approval, completed no-finding
automatic review and relevant successful CI. Coordinator reads/hash-verifies
reports and verifies sequential normal merged deltas/trees. Current main is
`d11ea466053105c33309996969a5bda0f0b5ea38`; its combined check passes 609 tests,
lint/types and build. Each lane records public browser 19/four optional skips and
separate local Training43 extraction 4/4. Live behavior is unchanged.

PR64 supplies original count-items evidence and PR66 implements only its bounded
disconnected transition: equipment plus thirty carried ID reads, count two to
three, then a natural helper-return record. Independent source/CPU candidates,
33-record chronology and complete 8 MiB encoding/replay agree. Explicit middle-
caller entry supplies no earlier damage eligibility, gameplay reachability or
whole-caller execution. Separate insertion counts remain diagnostic; no general
live counting policy or population repair follows.

PR65 proves one sufficient initialized/post-death incompatibility witness: a
source-known control byte selects the original rejection branch. Independent
source mapping retains twenty scalar differences and 699 unknown codec bytes;
death/reference/invocation and actual-caller prerequisites remain. Frozen full-
memory death/selection replays, reproduction and refusals pass. This comparison
executes no new original CPU case and supplies no adapter or complete repair.

Each accepted exact final has independent HIGH approval, completed no-finding
automatic review and relevant green CI. Coordinator reads/hash-verifies reports
and verifies normal sequential merged deltas/trees. Current accepted main is
`6179dcae6136c85feeb9a09ae4a086e614b5d587`; its combined check passes 616 tests,
lint/types and build. Each lane records public browser 19/four optional skips and
separate local Training43 extraction 4/4. Live behavior remains unchanged.

PR68 establishes the [original post-count boundary](backpack-postcount-division-observation.md): the same diagnostic
dividend overflows unsigned division by count three, preserves the operand and
adds no memory writes or exception. Defined overflow flags are checked separately
from undefined N/Z. The observation stops before equipment setup/distribution;
it establishes no ordinary damage amount or earlier caller eligibility.

PR69 establishes [original one-human initialization](team-initialization-one-human-observation.md). Original instructions
assign mouse one to all four actors. Independent source/CPU proof and full 16 MiB
comparison/replay agree; only five final bytes differ from the four-human case.
Three control mismatches disappear, leaving seventeen differing scalar fields
and 699 unknown codec bytes in the authored post-death comparison. Death, cell
references, invocation and actual-caller prerequisites remain. External diagnostic
return-frame and unproved architectural CCR parity limits are unchanged.

Both accepted exact heads have independent HIGH approval, completed no-finding
automatic review and relevant successful CI. Coordinator reads/hash-verifies
reports and verifies normal merged deltas/trees. Both are documentation-only;
the accepted runtime baseline remains 616 tests/lint/types/build. Each lane
records public browser 19/four optional skips and verified local Training43
extraction 4/4. Live behavior is unchanged.

PR71 establishes the [source-bound shooting argument prefix](shooting-inventory-argument-observation.md).
Original item-parameter reads and arithmetic produce the bounded full-width
argument and four-long saved frame. Independent source/CPU/8 MiB replay agrees.
Execution stops before the fitness call; restoring that frame and entering
inventory damage remain conditional source deductions, not executed behavior.
No live equipped-gun, ordinary hit or general parameter authority follows.

PR72 establishes [four-actor reference placement](initialized-player-reference-placement-observation.md) as a new direct diagnostic
invocation on the accepted initialized image. Original calls assign CURRENT/OLD,
write heads and advance complete paths for all four actors. Independent source/CPU
prediction and full 16 MiB replay agree; all 185 reads have source origins without
a stack exemption. The external entry frame, editor payload and unexecuted startup/
monster-reset sequence remain explicit. Distinct destinations do not establish
collision handling, general occupancy resolution, death or post-death compatibility.

Both accepted exact heads have independent HIGH approval, completed no-finding
automatic review and relevant successful CI. Coordinator reads/hash-verifies reports
and verifies normal merged deltas/trees. These are documentation-only changes;
the accepted runtime baseline remains 616 tests/lint/types/build. Each lane records
public browser 19/four optional skips and verified local Training43 extraction 4/4.
Live behavior remains unchanged.

PR74 establishes the [original startup initialization/reset/placement prefix](startup-reset-placement-observation.md).
Three actual consecutive original calls execute initialization, all monster resets
and four-actor placement, returning naturally to the next caller instruction.
Independent source/CPU prediction, every read origin, actual call frames and full
16 MiB replay agree. This removes the direct-entry and intervening-reset gaps for
these diagnostic inputs. Earlier startup, runtime-map identity, hardware/CCR parity,
death, collisions and general occupancy remain unproved; no live adapter follows.

PR75 adds the [disconnected bounded shooting argument producer](shooting-argument-contract.md).
The exact accepted pre-fitness profile produces complete logical registers,
nineteen boundaries and the four-long saved frame with ordered reads/stores.
Independent source/CPU/codec and full-image replay agree. Metadata and opaque
references remain external witnesses. Fitness execution, natural saved-frame
preservation, restore and inventory-call entry remain separate dependencies.

Both exact final heads have independent HIGH approval, completed no-finding
automatic review and successful relevant CI. Coordinator reads/hash-verifies
reports and verifies sequential normal merges and the combined tree. Accepted
PR75 main passes 623 tests, lint/types and build; PR74 then changes documentation
only. Each lane passes public browser 19/four optional skips and separate verified
local Training43 extraction 4/4. Live browser behavior remains unchanged.

PR77 establishes [actor-one damage/death entry prerequisites](initialized-death-entry-prerequisites.md).
The retained placement snapshot supplies neither an actual environmental caller
nor an actor-one hit argument/register pairing. Source-known zero pending damage
would bypass fitness if the landing guard were reached; no reachability or new
CPU execution follows from that conditional source deduction.

PR78 establishes the [initialized fall-entry prefix](initialized-fall-entry-observation.md).
An explicit diagnostic entry on unchanged accepted memory executes nineteen
original instructions, six reads, two stores and one real inner call. It stops
before the first source-unknown lower-cell operand; no unknown byte is consumed.
Independent source/CPU/full-image replay and preservation checks agree. The frame
remains open: no natural return, descent, landing, damage, death or occupancy
transition is established. Diagnostic entry supplies no startup reachability.

Both exact heads have independent HIGH approval, completed no-finding automatic
review and successful relevant CI. PR77's single documented stalled-review retry
completed; no further retry applies. Coordinator verifies normal expected-head
merges and trees. Both changes are documentation only, retaining the 623-test
runtime baseline and unchanged live browser behavior. Both lanes pass public
browser nineteen/four optional skips and verified separate Training43 four/four.

PR80 establishes [four diagnostic editor-input origins](initialized-fall-lower-cell-origin.md)
for the blocked operand. Complete payload placement and retained replay bind the
input bytes, but the extension stays separate and uninstalled. Accepted null
origins and the source-known mask remain unchanged; runtime origins remain zero.

PR81 records the [runtime load provenance boundary](runtime-lower-cell-load-origin.md):
the runtime selector lacks a source-known value and origin. Packed and raw archive
candidates remain unselected. Static loader/decompression semantics establish no
actual selected file, returned bytes or output relationship.

PR82 binds the [original selector-copy producers](runtime-map-selector-producer.md).
Both action and validated campaign paths copy a complete location record; a
symbolic byte-origin projection identifies the selector's place in those copies.
No numeric selection, copy execution or runtime table authority follows. Actual
dispatcher mode/caller and matching runtime Locations input/load identity remain
missing. The preceding table-loader dependency is not waived by the local
unknown dispatcher-data read. Locations revision mismatch still blocks graph
substitution. This source/input gate is recorded; no repetitive primary audit
or selection/copy/fall continuation is started.

All three exact final heads have independent HIGH approval, completed no-finding
automatic review and successful relevant CI. Coordinator reads/hash-verifies
reports and verifies normal expected-head merges and trees. These documentation
changes retain the 623-test runtime baseline and unchanged live browser behavior.
Each lane passes public browser nineteen/four optional skips and separate verified
Training43 extraction four/four. No new original CPU or decompression executes;
the open fall frame, four accepted null origins and unknown mask remain intact.

Historical prerequisite snapshot through PR82 is
`9c1ac1efe65f26c550c344fa9c3d90b48381da90`; current integration is above.

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


Pending review: the [authored ground cache consumer](training-ground.md) adds same-app keyboard equipment/carried pickup and equipment drop, physical 30-slot capacity, source-bound ownership/weight and chronological static-world v8 recovery. It relocates initial team carried entries into a labelled authored overlay. Original map-item placement, general use, direct carried drop, ground swaps, corpses and weight-dependent interleaved dry-fall remain outside this candidate. Existing ground-core acceptance is distinct from this consumer�s pending independent HIGH/CI/automatic gates.
