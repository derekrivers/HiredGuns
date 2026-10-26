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

Exactly one next task is the report's disconnected pure one-cell dry descent
transition: atomically validate the observed eligible owned dry empty-block
ordinary-destination slice and logical adjacency, then return changed pose/refs,
pending, packed source/destination occupancy, third-layer word, redraw and ordered
inert records. Return with injury pending; leave the later supported landing to
the existing composition. No implementation or second task was started here.
Unsupported support geometry, pads/mines, wet paths and scheduling stay excluded.

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
