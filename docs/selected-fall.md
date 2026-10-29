# Selected-team dry-fall practice

Candidate on accepted PR99 base `546e298f03a69d73411f7c32ec9a90d56a081be3`.
Open the existing app, use **Load ready-to-play Training43 test**, then
**Selected-team dry-fall practice (authored)**. Existing manual map/team imports
and known-source dropdowns remain available. The practice button requires an
active verified selected team; no source files need choosing again.

The practice map is newly authored `selected-dry-fall-v1`, derived from the four
dry ledges in the existing synthetic drill. It retains synthetic source kind,
null source digest and an authored name. Every map field must match the exact
authored definition before this profile is allowed. This is a separate map in
the same application, not original Training43 geometry or a verified runtime
map. The original map's static profile is unchanged. Returning to Training43
uses the existing one-click preset or manual flow.

## Play and inspect

Loads paused. Start drill, assign WASD with 1–4, and step forward from a ledge.
Existing keyboard groups and controller assignment remain available. Four ledges
give different fall distances. Each viewport shows integer fitness, pending fall
damage and actual current inventory weight. Team details show source physique
and agility. Esc pauses; Retry drill resets positions, fitness, cadence, pending
damage, inventory replay and the separate encounter's authored baseline.

Creation rehashes/reparses the exact OCS roster and Items pair. It reconstructs
the selected team and bounded current inventory replay, then binds each actor's
physique, agility and **totalWeight** to the fall profile. Actions remain separate
from carried/equipped inventory and its weight. Unsupported zero divisors and
fall-seed DIVU overflow refuse before installation. Equipment operations continue
while paused, preserving total weight and all opaque inventory bytes under the
existing adapters. No pickup/drop or weight-changing operation is added.

Gravity and damage retain the accepted [dry-fall arithmetic and ordering](dry-fall.md):
first pulse at tick 7, then every six ticks, gravity before controls, one cell per
pulse and landing injury on the following pulse. Weight/agility contributes to
the seed before the physique addition. No arithmetic change is made. The new
mode replaces the empty synthetic characters with source-bound stats/weight.

Incapacitation retains the existing authored normalization to fitness zero.
Incapacitated actors receive no movement, turn or fire commands and release
occupancy; active actors below conservatively block descent without squash.
An entirely incapacitated team freezes simulation and shows practice exhaustion;
Retry and recovery remain available. Navigation mission outcome remains active,
so exhaustion is explicitly reported separately from original mission failure.
The gun encounter retains its isolated authored loadout and never consumes source
inventory. Its state remains included in recovery when armed.

## Recovery boundary

Selected practice emits training-session **v7**, with exact `scenario` value
`selected-dry-fall-v1` and `sources.map` value `authored:selected-dry-fall-v1`.
It never substitutes an original map SHA. The nested v3 checkpoint fingerprints
the complete authored map. Roster/Items identities, selection and inventory
commands are rebound from original bytes before validating any current physics.
The expected physique/agility/current weight must match every actor; arbitrary
stats from a save never supply their own authority. Fitness/dead consistency,
allowed accumulator sequence, cadence, complete world fields, mission, positions,
support, occupancy, tick and RNG use checkpoint validation. This is structural
current-state validation, not proof that a saved injury history was played.

The wrapper remains smaller than 24 KiB and its checkpoint smaller than 16 KiB.
The complete save is snapshotted before asynchronous verification. Installation
commits session and world together only while the operation generation remains
current, and always paused. Wrong mode, wrong sources, unknown/extra fields,
unsupported stats, malformed state and oversized saves refuse without installing
a partial result. A newer retry, mode switch, source change or preset cancels an
older restore. Source replacement clears the selected practice and returns to
the navigation map. Static-session v1–v6 and ordinary checkpoint v1–v3 formats
retain their existing boundaries; legacy static wrappers cannot invent fall history.

## Source limits and validation

The bounded original helpers/evidence were inspected once: dry descent,
ordinary-floor landing composition, initialized fall entry and lower-cell origin.
The initialized continuation still lacks verified runtime-map provenance. This
practice adapts the accepted synthetic world framework honestly; it does not
install the disconnected original lifecycle/control/pad/corpse helpers or claim
natural original caller reachability, CPU execution, hardware timing or complete
Training43 acceptance. Water, drowning, pads, lifts, squash, corpse mutation,
enemy combat and campaign travel remain excluded.

Public tests use authored profiles/maps and refuse unbound or altered geometry.
Opt-in private tests use ignored original bytes to verify selected stats/weight,
actual keyboard falling and landing, inventory/encounter preservation, mid-fall
download/paused continuation, incapacitated controls, exhaustion, retry, malformed
and wrong-source restores and delayed-operation cancellation. The exhaustion
browser fixture explicitly supplies authored low fitness; it is not a claim that
an entire original team naturally died during the playthrough.

Model: requested gpt-6.1-sol medium. Token usage unavailable. Independent HIGH
review, current CI and actual automatic review are coordinator gates before merge.
