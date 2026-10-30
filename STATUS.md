# Current gameplay candidate — consumable dry-fall extension

Accepted base: PR111 merge `46dec166f0604b6cdcbe75c58f3736dc5fd19da9`.
The same-app authored selected-team dry-fall extension now supports source-bound
ordinary equipped food and repair use with H/button, integer fitness gain,
equipment ID clearing and reduced source weight. Race restrictions, unsupported
medical64 poison cure, other categories, empty/dead/pending/running refusals
are explicit. Full chronological v14 recovery includes movement/falls/equipment/use,
source rehashing, bounded history and atomic paused installation. Legacy v1–v13
remain intact. [Scope and controls](docs/training-consumables.md).

Implementation validation: npm check, public synthetic chronology/arithmetic,
private verified-source session checks and actual application browser checks.
Exact commands, all attempts and production-build evidence are retained in the
ignored worker handoff. Independent exact-final HIGH/current CI/completed
automatic review and coordinator merge remain outstanding. Not self-approved.
Training43 / complete functional test bed are not accepted. General inventory
transfer, poison/wet/death/corpse, original enemy/world machinery and lifts remain
open. Graphics/audio/controller/TV work stays deferred. Token usage unavailable.

## Historical candidate assessment (preserved)

# Status - 30 October 2026

Accepted base: PR110 merge `e4cfd07c675924a75d17a731569a72d9056a10af`
(tree `0329329f169041fcfb4a63984788c4c70cbbee2b`), including same-app
timed door/v12, patrol extraction/v11, static gate/v9, ground-cache/v8,
selected-team fall/v7, inventory and designated source gun arithmetic.

Candidate on `codex/training43-pressure-pad`:
[pressure pad / timed door extraction](docs/training-pressure-pad.md).
One canonical player-only pad in the same arena drives the accepted timed door:
step on opens, step off closes; stationary/turn/blocked moves never retrigger.
Raw floor and preceding-plane descriptor bind the direct button IN/OUT actions.
NPCs reserve space without activating. Existing closure interlocks, clock,
gun/objective/exit rules and manual C/buttons remain. V13 rebuilds pad occupancy
and bounded last-action receipts from movement together with all prior state.
Legacy v1-v12 shapes and replay/byte budgets stay unchanged. Actual four-actor
keyboard extraction without C, paused recovery and Y Retry are exercised.

Implementation and browser evidence belong to the ignored worker handoff.
Independent HIGH review at exact final head, current CI, completed automatic
review and resolved findings remain coordinator release gates. Unmerged.

Training43 and the functional test bed remain incomplete. Original signs and
zero-position machinery stay inactive. Original enemy AI/combat/lifecycle,
runtime door/pad selection, pushable/death/corpse/wet/fall pad calls, lifts,
general item use and full-level acceptance remain open. No CPU timing or
original runtime pad/animation parity is claimed. Graphics/audio integration
and physical-controller/TV testing remain deferred.
Token usage unavailable (not measured).
