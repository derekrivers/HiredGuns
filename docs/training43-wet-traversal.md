# Training43 keyboard wet traversal — unreviewed candidate

30 October 2026. Accepted base PR112/113/114:
`b211895b0bf4600bc7c8fa830814284c46293c97`, tree
`ebc8187cc7386d790cc686cabe6e4b13bb642df2`.
**T43-04 remains partial, T43-05 open, original level/test bed incomplete.**
The accepted [interaction CASE](training43-wet-acceptance.md) supplies the exact
private approach/oracle. Its 22 hypothetical wet graph candidates are not receipts
for a complete wet playthrough. New play requires independent exact-head review.

## Play in the existing app

Load ready-to-play Training43 using the opt-in local provider (or manually import
its exact map and OCS roster/items, then apply `[11,3,0,5]`). At paused tick zero,
Tab to **Enable Training43 wet traversal**, Enter. Start mission. Select 4 and
navigate with W/S forward/backward, A/D sidestep and Q/E turn; 1–4 select actors,
Esc pauses. Navigate the actual dry approach, enter the wet stair and reverse
immediately. The app never drives a route. Precise original routes/coordinates
remain private; the case/browser tests derive them from locally verified bytes.

The guided wet panel shows all four actors' race, breath, entries, item passes,
weight, fitness, delay, equipment, scanned item bytes and preserved actions.
Inventory & equipment shows the same current candidate but changing equipment is
disabled during this bounded mode. Retry resets every mutable wet field; Apply
starts another source baseline. An explicit rules change also resets wet state.
Original first-exit and labelled cooperative rules retain their existing meaning.

Slot4/canonical5 is race4 and NONIMMUNE. Slot1's source race1 is the actual immune
comparison. Inventory processing happens before immunity. Only race1 or spell97
exempts breath; spell100 only bypasses inventory. This adapter initializes spells
to zero and refuses live spell changes; it does not invent injuries or spells.
Dry return retains item effects and resets breath at the next scheduled drowning
pass. A pass due on the return tick happens before controls and can still affect
items. Inventory/fitness/body/counters install together, never as display-only data.

## State and scheduling authority

Initial inventory, all thirty carried and ten action entries, equipment, weight,
fitness, physique/agility and race derive from rehashed/reparsed exact raw OCS
bytes. Both dead words zero, window0/control1, spells/counters/pending zero,
leader0, empty corpse/pad lists and north facing are explicit import adapter
choices. They are not original runtime initialization parity. There are four
independent bodies, current/old logical cell references and owned head images.
Overlays retain immutable imported map identity and untouched second planes;
head replacement preserves water/auxiliary with the source mask, and successful
arrival clears only third-plane mine-marker bit29. Movement and overhead
reservations use all four actors, including tick-start occupancy. Exited actors
retire; their owned heads clear on that transition, before current active heads
are installed. Retained retired poses cannot erase a later occupant's head.
No corpse or survivor selection is fabricated.

One candidate tick adds one to the two unsigned scheduler words. Drowning uses
signed >=50 and resets first; party-order inventory/immunity/breath processing
precedes stuff_falls. Falling uses unsigned >6, subtracts6 exactly once, and
party-order wet delay0→2→1→0 with pending cleared and no vertical descent on inert
support. Controls then move/turn/block; mission/clock resolution stays source
ordered as in the accepted world adapter. Old refs capture the pre-control pose.
Dry delay clears only in the scheduled falling pass before controls: returning
between pulses retains the prior delay, and reentry before the next pulse uses
that retained phase. A due drowning/item pass still precedes return movement.
50 Hz and the one-increment-per-tick mapping are explicit fixed-step adaptations,
not original CPU or wall-clock claims. No RNG is consumed by presentation.

Only depth2, ordinary-floor or immediate inert block0 wet support and supported
stair auxiliary8–11 are admitted. Any unsupported wet support/descent/search,
nonzero dead/pending/spell state, unsupported control/window, corpse or pad state
refuses the whole candidate. **Any non-null damage request, including zero,
refuses before inventory/counter/fitness/world/head installation.** On failure
the app pauses at the previous accepted tick. Repeated Start cannot cross the
boundary. In particular exact block0+aux10 death reaches the uncomposed
find_floor/stair north redirect; the ordinary-floor death helper is not invoked.
No water flags, geometry or eligibility are normalized to make it fit.

## Recovery and resource limits

V15 is a new canonical chronological wrapper. It retains raw map bytes locally,
snapshots every caller object/source before its first await, rehashes/reparses
map+roster+items and reconstructs the complete prospective session/world through
bounded history. Complete saved bodies, heads, counters, inventories, source
identities and mission leaves are comparison evidence only. Wrong source,
geometry, chronology, any differing receipt or unsupported replay fails without
installation. Paused restore continues without duplicate inventory/damage/pad or
corpse writes. Main's generation owns success, error, finally and panel feedback;
stale completions cannot take over loading, controls or messages.

Limits: 128 dense events, 45,000 ticks, session strictly below24,576 UTF-8 bytes;
future event/tick and exact save sizes are checked before exposing each candidate.
Descriptor-only snapshots require matching Object/Array prototypes, no accessors,
hidden/symbol/extra/sparse fields or active cycles; depth24, 50,000 value visits,
32,000 entries per collection, 65,536 units per string/key and1,000,000 total
UTF-16 units. Shared DAGs are copied/charged per occurrence. Ordinary reflection
materializes keys; proxy traps are not a sandbox. Parsing is bounded by the
existing strictly-below24KiB wrapper gate, then snapshot depth/work limits.
Original v1–v14 validators/semantics are retained unchanged.

The pinned initial save measured14,326 bytes; after the 29-command dry approach,
entry and first scheduled pass15,683 bytes. These are particular measurements,
not promises that every route fits the budget. Exhaustion pauses atomically;
Retry or an earlier save is required. Mission duration is also bounded by that
history/tick budget. Complete original level/timeouts are not newly claimed.

## Validation

Public synthetic tests cover head masks, arrival markers, four-actor state,
source-order threshold ticks, wet delay/inert support, race/spell branches,
zero-hit distinction, unchanged whole inputs on unsupported transactions,
replay equality and strict density/work limits. Private opt-in tests bind the
accepted raw case and its exact first helper oracle, actual approach/entry,
return, three save points, source/history/head/counter/item/mission tampering,
immutable before-await capture and Retry.

Production-dist browser checks drive actual keyboard approach, entry/reverse
for race4 and source race1, real teammate parking/occupancy, paused v15 recovery,
continuation, Retry, tamper and stale successful/failed loads. Additional boundary
and exit results are recorded in the ignored final handoff. No original assets,
private coordinates, routes, screenshots or traces enter Git or CI. Exact source
helper/CPU receipts are reused within their accepted scope; no broad source or
archive studies are repeated. All new consumer evidence remains UNREVIEWED.

Commands: `npm run check`; `npx tsx tools/build-mechanics-register.ts --check`;
`npx vitest run tests/training-wet.test.ts` (private manifest opt-in via
`HIRED_GUNS_T43_CASE_INPUTS`); production Playwright with the isolated private
config/provider. Every attempt and final result remains in `.local/t43-wet`.
Bounded PR115 repair evidence is separate in `.local/repair115`; it covers
retired-head ownership, scheduled dry delay, exact object/array collection caps,
and the accepted baseline label through PR114. It grants no new wet acceptance.
Model requested: gpt-6.1-sol medium. Token usage unavailable. No delegation.
