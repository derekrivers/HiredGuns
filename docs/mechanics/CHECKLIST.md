# Master Mechanics Register — Whole-game evidence coverage: 9.9%

68 / 688 covered checkpoints / all registered evidence checkpoints (86 rows × 8 stages). Mapping, reference, rules, playable, integration, save/retry recovery, original-level acceptance and physical play each count once per row. Only covered earns credit; partial/open earn zero. Global across filters. Whole-game evidence coverage: 68 covered, 129 partial, 491 open. All eight stages have equal weight; 172 cells are original-level acceptance plus hardware, and 232 cells are PSI effects. Broad aggregate rows measure evidence, not software effort, playable-testbed completion, source parity or overall game completion. New accepted playable slices can leave broad rows partial and the percentage unchanged. The earlier roughly 60% was a subjective estimate of a smaller authored functional testbed, not this measured denominator. No replacement effort percentage is calculated. 100% requires every checkpoint covered; near-complete values are capped at 99.9%.

Assessed 2026-10-30; accepted main through PR122: `81353ad52118875195c925d668cc469ad72d106e`.

[Open the interactive HTML index](index.html) · [Canonical JSON](register.json)

Initial game-wide traceability register. Discovery inventory is broad but not certified exhaustive; unclassified item, enemy and source branches remain explicit work. Training43 is first original-level acceptance target.

Baseline: **OCS patched source 39.26 · explicit development-editor adaptation**. Primary behavioural reference is the older OCS patched source, with exact local OCS roster/items. Editor maps are individually digest-pinned; no retail authentication, whole-startup, runtime-map or wall-clock parity is implied. CD32 differences stay explicit.

Covered means only the stated slice. Linked files are not fresh run receipts. No whole-game completion percentage or complete original-level pass is claimed.

## Current playable testbed capability

Same four-view keyboard app with selected original team; explicitly authored practice and bounded original-editor traversal are separate modes, not one complete original level. Counts describe only the listed milestones, not fixed software scope or effort. No capability percentage: scope will grow as source branches are discovered. Accepted118 adds one narrow standing22 record to this chosen list; the list denominator changes by one, with no fixed complete-software denominator or effort percentage. Whole-game rows/stages and covered credit do not change. Accepted120 adds one selected-team/all-dead milestone to this chosen list: denominator increases by one only for the list, without any change to broad row/stage counts or software effort percentage. Accepted122 adds one original99/full responsive recovery milestone to this growing chosen list; all broad stage/gate states stay unchanged. No fixed software denominator or completion/effort percentage follows.

11 listed milestones: 9 playable · 0 partial · 1 open · 1 deferred.

### cap-start — Selected-team startup, movement and extraction: playable

Verified team, selection/pause, dry static navigation and bounded extraction; original startup/runtime parity separate.

Missing dependency / boundary: Full original-level run and runtime startup parity.

Lineage: [MOV-01](index.html#MOV-01), [T43-02](index.html#T43-02), [T43-03](index.html#T43-03). [Entry and controls](index.html#scenario-training43).

- [training-session.md](../../docs/training-session.md): Verified team, selection/pause, dry static navigation and bounded extraction; original startup/runtime parity separate.
- [training-session.spec.ts](../../tests/browser/training-session.spec.ts): Verified team, selection/pause, dry static navigation and bounded extraction; original startup/runtime parity separate.

### cap-inventory — Inventory pickup, drop, exchange, equip and return: playable

Paused bounded source-owned inventory plus authored ground cache; no general arbitrary transfer caller.

Missing dependency / boundary: Original map generators/corpse items, general carried/cross-actor callers and interleaved ground-fall.

Lineage: [INV-01](index.html#INV-01), [INV-02](index.html#INV-02), [INV-04](index.html#INV-04), [INV-07](index.html#INV-07). [Entry and controls](index.html#scenario-ground).

- [training-inventory.md](../../docs/training-inventory.md): Paused bounded source-owned inventory plus authored ground cache; no general arbitrary transfer caller.
- [training-ground.md](../../docs/training-ground.md): Paused bounded source-owned inventory plus authored ground cache; no general arbitrary transfer caller.

### cap-food — Food and repair after authored dry-fall injury: playable

PR112 FOOD excluding medical64 and REPAIR heal actual dry-fall injury; equipment ID clear preserves three opaque bytes, source weight and v14 history.

Missing dependency / boundary: Medical64 poison cure, immunity and revival unsupported.

Lineage: [INV-06](index.html#INV-06), [LIFE-06](index.html#LIFE-06). [Entry and controls](index.html#scenario-consumables). [proof-112](index.html#proof-112)

- [training-consumables.md](../../docs/training-consumables.md): PR112 FOOD excluding medical64 and REPAIR heal actual dry-fall injury; equipment ID clear preserves three opaque bytes, source weight and v14 history.
- [training-consumables.test.ts](../../tests/training-consumables.test.ts): PR112 FOOD excluding medical64 and REPAIR heal actual dry-fall injury; equipment ID clear preserves three opaque bytes, source weight and v14 history.
- [training-consumables.spec.ts](../../tests/browser/training-consumables.spec.ts): PR112 FOOD excluding medical64 and REPAIR heal actual dry-fall injury; equipment ID clear preserves three opaque bytes, source weight and v14 history.

### cap-combat — Authored gun, patrol, doors and pressure pad: playable

Accepted designated hit/miss gun, authored enemy patrol/defeat, gate, timed door and player pad; keyboard F/T/R, C and movement as documented.

Missing dependency / boundary: Original spatial combat/AI/enemy attacks, lifts and broader world callers.

Lineage: [COMBAT-01](index.html#COMBAT-01), [COMBAT-02](index.html#COMBAT-02), [AI-01](index.html#AI-01), [ENV-01](index.html#ENV-01), [ENV-02](index.html#ENV-02), [ENV-05](index.html#ENV-05), [T43-04](index.html#T43-04). [Entry and controls](index.html#scenario-encounter).

- [training-encounter.md](../../docs/training-encounter.md): Accepted designated hit/miss gun, authored enemy patrol/defeat, gate, timed door and player pad; keyboard F/T/R, C and movement as documented.
- [training-pressure-pad.md](../../docs/training-pressure-pad.md): Accepted designated hit/miss gun, authored enemy patrol/defeat, gate, timed door and player pad; keyboard F/T/R, C and movement as documented.
- [training-patrol.md](../../docs/training-patrol.md): Accepted designated hit/miss gun, authored enemy patrol/defeat, gate, timed door and player pad; keyboard F/T/R, C and movement as documented.

### cap-wet — Original-editor wet entry/return and recovery: playable

PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [MOV-03](index.html#MOV-03), [ENV-08](index.html#ENV-08), [LIFE-03](index.html#LIFE-03), [LIFE-04](index.html#LIFE-04), [T43-05](index.html#T43-05), [T43-07](index.html#T43-07). [Entry and controls](index.html#scenario-wet). [proof-115](index.html#proof-115)

- [training43-wet-traversal.md](../../docs/training43-wet-traversal.md): PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.
- [training-wet.test.ts](../../tests/training-wet.test.ts): PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.
- [training-wet.spec.ts](../../tests/browser/training-wet.spec.ts): PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.

### cap-end — Complete coherent software testbed: open

Accepted bounded slices do not constitute programme acceptance.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [T43-10](index.html#T43-10). [Entry and controls](index.html#scenario-training43).

- [training43-completion.md](../../docs/training43-completion.md): Accepted bounded slices do not constitute programme acceptance.

### cap-lifecycle — Bounded wet injury, fatal continuation and survivor recovery: playable

Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [LIFE-01](index.html#LIFE-01), [LIFE-02](index.html#LIFE-02), [LIFE-03](index.html#LIFE-03), [T43-05](index.html#T43-05), [T43-06](index.html#T43-06), [T43-07](index.html#T43-07). [Entry and controls](index.html#scenario-wet-lifecycle). [proof-116](index.html#proof-116)

- [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.
- [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.
- [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.

### cap-hardware — Four people, controllers and TV: deferred

Separate physical acceptance; does not block keyboard software.

Missing dependency / boundary: Actual complete four-player hardware run and reviewed receipt.

Lineage: [T43-09](index.html#T43-09). [Entry and controls](index.html#scenario-training43).

- [training43-completion.md](../../docs/training43-completion.md): Separate physical acceptance; does not block keyboard software.

### cap-standing22 — All 22 standing wet cells and corridor survivor recovery: playable

Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [MOV-03](index.html#MOV-03), [ENV-08](index.html#ENV-08), [LIFE-02](index.html#LIFE-02), [LIFE-03](index.html#LIFE-03), [T43-04](index.html#T43-04), [T43-05](index.html#T43-05), [T43-07](index.html#T43-07), [T43-08](index.html#T43-08). [Entry and controls](index.html#scenario-wet-region). [proof-118](index.html#proof-118)

- [training43-wet-region.md](../../docs/training43-wet-region.md): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.
- [training-wet-region.test.ts](../../tests/training-wet-region.test.ts): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.
- [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.

### cap-selected-all-dead — Selected-team wet lifecycle, all-dead and v18 recovery: playable

Accepted PR120 selected raw team &#91;1,3,0,5&#93;, races &#91;0,0,3,4&#93;, real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [LIFE-03](index.html#LIFE-03), [LIFE-04](index.html#LIFE-04), [T43-02](index.html#T43-02), [T43-06](index.html#T43-06), [T43-07](index.html#T43-07), [T43-08](index.html#T43-08). [Entry and controls](index.html#scenario-wet-party). [proof-120](index.html#proof-120)

- [Accepted PR120 scope and controls](../../docs/training43-selected-team-all-dead.md): Accepted PR120 selected raw team &#91;1,3,0,5&#93;, races &#91;0,0,3,4&#93;, real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team.
- [Production test definitions](../../tests/browser/training-wet-party.spec.ts): Definitions and inherited evidence, not a fresh execution by this metadata change. Full route historical; fresh final HIGH recovery/diagnostics explicitly separated.
- [Accepted v18 ownership and replay](../../src/sim/training-wet-party.ts): Own shape before optional discriminator reads; entire history and source-bound state reconstruction.

### cap-source-timeout — Original99 timeout and full responsive v19 recovery: playable

Accepted PR122 original99 action deadline59499; full59498/59499 session/world, bodies/inventory/catalogs/opaque planes/corpse/counters/mission and canonical bytes; all-dead before timeout before exit, terminal freeze, Retry/both rules. Real task yields after16 ticks or8ms elapsed target, cancellation after raw awaits/before heavy work/during replay/before installation, visible progress and unavailable Start/Save/reentrant Load. Legacy1–18 formats/caps/bytes unchanged; their replay is not newly async-cancellable.

Missing dependency / boundary: Whole Training43 software remains INCOMPLETE. R08 sign rendering/readability is UNKNOWN/OPEN; its unaccepted candidate gets no credit. General corpse items/replacement and unsupported source/search/geometry modes remain open where reachable. Full successful recovery55.5–66.4s and Node80s+ remain costly; no speedup, universal latency bound or CPU-runtime parity. Assets/hardware separately DEFERRED, not software gates.

Lineage: [T43-07](index.html#T43-07), [T43-08](index.html#T43-08), [LIFE-03](index.html#LIFE-03), [LIFE-04](index.html#LIFE-04). [Entry and controls](index.html#scenario-source-timeout). [proof-122](index.html#proof-122)

- [Accepted122 proof and controls](../../docs/training43-source-timeout-recovery.md): Accepted PR122 original99 action deadline59499; full59498/59499 session/world, bodies/inventory/catalogs/opaque planes/corpse/counters/mission and canonical bytes; all-dead before timeout before exit, terminal freeze, Retry/both rules. Real task yields after16 ticks or8ms elapsed target, cancellation after raw awaits/before heavy work/during replay/before installation, visible progress and unavailable Start/Save/reentrant Load. Legacy1–18 formats/caps/bytes unchanged; their replay is not newly async-cancellable.
- [Source-bound full replay definitions](../../tests/training-timeout.test.ts): Definitions; fresh accepted HIGH18 source cases and whole native expectations are distinct from this metadata verification.
- [Actual production controls and recovery definitions](../../tests/browser/training-timeout.spec.ts): Accepted HIGH49 committed definitions in one clean13.69min run plus9 independent definitions in one separate clean run; no count sum as coverage.
- [Accepted full-history transition and cancellation](../../src/sim/training-timeout.ts): Source locators only; this metadata packet changes no src.

## Training43 software acceptance

First original-level target is map43, not map45A. Narrow subrecords below inherit existing checklist IDs without closing the compound gates. Counts are a dated list, not an acceptance percentage. Hardware is deferred separately. Editor identity is not runtime parity; Locations CRC df31 versus archived 5c21 still blocks campaign substitution. Accepted118 adds one narrow standing22 record to this chosen list; the list denominator changes by one, with no fixed complete-software denominator or effort percentage. Whole-game rows/stages and covered credit do not change. Accepted120 adds one selected-team/all-dead milestone to this chosen list: denominator increases by one only for the list, without any change to broad row/stage counts or software effort percentage. Accepted122 adds one original99/full responsive recovery milestone to this growing chosen list; all broad stage/gate states stay unchanged. No fixed software denominator or completion/effort percentage follows.

10 listed milestones: 7 playable · 2 partial · 1 open · 0 deferred.

### t43-dry — Selected team and bounded dry route: playable

Same-app selected-team dry movement, first-exit and cooperative route are accepted bounded adaptations.

Missing dependency / boundary: Complete original gameplay and runtime identity remain open.

Lineage: [T43-01](index.html#T43-01), [T43-02](index.html#T43-02), [T43-03](index.html#T43-03). [Entry and controls](index.html#scenario-training43).

- [training-session.md](../../docs/training-session.md): Same-app selected-team dry movement, first-exit and cooperative route are accepted bounded adaptations.
- [training43-completion.md](../../docs/training43-completion.md): Same-app selected-team dry movement, first-exit and cooperative route are accepted bounded adaptations.

### t43-case — Interaction CASE classification: partial

PR114 classifies 23 water cells: 22 graph candidates and one solid/nonstanding; both signs dry type0, 50 inactive positionals.

Missing dependency / boundary: Candidates do not establish complete wet playthrough or all reachable outcomes.

Lineage: [T43-04](index.html#T43-04). [Entry and controls](index.html#scenario-wet). [proof-114](index.html#proof-114)

- [training43-wet-acceptance.md](../../docs/training43-wet-acceptance.md): PR114 classifies 23 water cells: 22 graph candidates and one solid/nonstanding; both signs dry type0, 50 inactive positionals.

### t43-entry — Supported wet-stair entry and reverse: playable

PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [T43-04](index.html#T43-04), [T43-05](index.html#T43-05). [Entry and controls](index.html#scenario-wet). [proof-115](index.html#proof-115)

- [training43-wet-traversal.md](../../docs/training43-wet-traversal.md): PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.
- [training-wet.spec.ts](../../tests/browser/training-wet.spec.ts): PR115 actual 29-command dry approach, supported wet entry/return, race4 breath and inventory/weight/fitness, race1 keyboard parking, full four-head ownership, v15 paused replay before wet/after item/after return, Retry, first exit and single cooperative retirement. Stops before every non-null requested hit including zero; no injury/death/corpse.

### t43-replay — Paused wet chronology, Retry and bounded exits: playable

PR115 v15 replay before wet/after item/after return; fresh Retry, original first exit and single cooperative retirement. Legacy v1-v14 retained.

Missing dependency / boundary: Whole-level environmental recovery and complete original timeout acceptance remain open; PR120 separately accepts bounded selected-team all-dead/v18 recovery.

Lineage: [T43-07](index.html#T43-07), [T43-08](index.html#T43-08). [Entry and controls](index.html#scenario-wet). [proof-115](index.html#proof-115)

- [training43-wet-traversal.md](../../docs/training43-wet-traversal.md): PR115 v15 replay before wet/after item/after return; fresh Retry, original first exit and single cooperative retirement. Legacy v1-v14 retained.
- [training-wet.test.ts](../../tests/training-wet.test.ts): PR115 v15 replay before wet/after item/after return; fresh Retry, original first exit and single cooperative retirement. Legacy v1-v14 retained.

### t43-lifecycle — Complete wet and lifecycle outcomes: partial

PR116 accepts the bounded fatal branch and v16 recovery; compound T43-05/06 remain partial. PR118 separately accepts standing22 and corridor same-cell corpse with v17; the broad family remains partial.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [T43-05](index.html#T43-05), [T43-06](index.html#T43-06). [Entry and controls](index.html#scenario-wet-lifecycle). [proof-116](index.html#proof-116), [proof-118](index.html#proof-118)

- [training43-wet-traversal.md](../../docs/training43-wet-traversal.md): T43-05/06 remain partial with accepted entry/return and bounded lifecycle subrecords; wider wet and whole-level outcomes remain open.
- [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.
- [training43-wet-region.md](../../docs/training43-wet-region.md): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.

### t43-fatal — Bounded wet injury, fatal continuation and survivor recovery: playable

Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [LIFE-01](index.html#LIFE-01), [LIFE-02](index.html#LIFE-02), [LIFE-03](index.html#LIFE-03), [T43-05](index.html#T43-05), [T43-06](index.html#T43-06), [T43-07](index.html#T43-07). [Entry and controls](index.html#scenario-wet-lifecycle). [proof-116](index.html#proof-116)

- [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.
- [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.
- [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts): Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.

### t43-accept — Complete original-level software receipt: open

No complete original level accepted.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [T43-10](index.html#T43-10). [Entry and controls](index.html#scenario-training43).

- [training43-completion.md](../../docs/training43-completion.md): No complete original level accepted.

### t43-standing22 — All 22 standing wet cells and corridor survivor recovery: playable

Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [MOV-03](index.html#MOV-03), [ENV-08](index.html#ENV-08), [LIFE-02](index.html#LIFE-02), [LIFE-03](index.html#LIFE-03), [T43-04](index.html#T43-04), [T43-05](index.html#T43-05), [T43-07](index.html#T43-07), [T43-08](index.html#T43-08). [Entry and controls](index.html#scenario-wet-region). [proof-118](index.html#proof-118)

- [training43-wet-region.md](../../docs/training43-wet-region.md): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.
- [training-wet-region.test.ts](../../tests/training-wet-region.test.ts): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.
- [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts): Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage.

### t43-selected-all-dead — Selected-team wet lifecycle, all-dead and v18 recovery: playable

Accepted PR120 selected raw team &#91;1,3,0,5&#93;, races &#91;0,0,3,4&#93;, real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team.

Missing dependency / boundary: Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

Lineage: [LIFE-03](index.html#LIFE-03), [LIFE-04](index.html#LIFE-04), [T43-02](index.html#T43-02), [T43-06](index.html#T43-06), [T43-07](index.html#T43-07), [T43-08](index.html#T43-08). [Entry and controls](index.html#scenario-wet-party). [proof-120](index.html#proof-120)

- [Accepted PR120 scope and controls](../../docs/training43-selected-team-all-dead.md): Accepted PR120 selected raw team &#91;1,3,0,5&#93;, races &#91;0,0,3,4&#93;, real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team.
- [Production test definitions](../../tests/browser/training-wet-party.spec.ts): Definitions and inherited evidence, not a fresh execution by this metadata change. Full route historical; fresh final HIGH recovery/diagnostics explicitly separated.
- [Accepted v18 ownership and replay](../../src/sim/training-wet-party.ts): Own shape before optional discriminator reads; entire history and source-bound state reconstruction.

### t43-source-timeout — Original99 timeout and full responsive v19 recovery: playable

Accepted PR122 original99 action deadline59499; full59498/59499 session/world, bodies/inventory/catalogs/opaque planes/corpse/counters/mission and canonical bytes; all-dead before timeout before exit, terminal freeze, Retry/both rules. Real task yields after16 ticks or8ms elapsed target, cancellation after raw awaits/before heavy work/during replay/before installation, visible progress and unavailable Start/Save/reentrant Load. Legacy1–18 formats/caps/bytes unchanged; their replay is not newly async-cancellable.

Missing dependency / boundary: Whole Training43 software remains INCOMPLETE. R08 sign rendering/readability is UNKNOWN/OPEN; its unaccepted candidate gets no credit. General corpse items/replacement and unsupported source/search/geometry modes remain open where reachable. Full successful recovery55.5–66.4s and Node80s+ remain costly; no speedup, universal latency bound or CPU-runtime parity. Assets/hardware separately DEFERRED, not software gates.

Lineage: [T43-07](index.html#T43-07), [T43-08](index.html#T43-08), [LIFE-03](index.html#LIFE-03), [LIFE-04](index.html#LIFE-04). [Entry and controls](index.html#scenario-source-timeout). [proof-122](index.html#proof-122)

- [Accepted122 proof and controls](../../docs/training43-source-timeout-recovery.md): Accepted PR122 original99 action deadline59499; full59498/59499 session/world, bodies/inventory/catalogs/opaque planes/corpse/counters/mission and canonical bytes; all-dead before timeout before exit, terminal freeze, Retry/both rules. Real task yields after16 ticks or8ms elapsed target, cancellation after raw awaits/before heavy work/during replay/before installation, visible progress and unavailable Start/Save/reentrant Load. Legacy1–18 formats/caps/bytes unchanged; their replay is not newly async-cancellable.
- [Source-bound full replay definitions](../../tests/training-timeout.test.ts): Definitions; fresh accepted HIGH18 source cases and whole native expectations are distinct from this metadata verification.
- [Actual production controls and recovery definitions](../../tests/browser/training-timeout.spec.ts): Accepted HIGH49 committed definitions in one clean13.69min run plus9 independent definitions in one separate clean run; no count sum as coverage.
- [Accepted full-history transition and cancellation](../../src/sim/training-timeout.ts): Source locators only; this metadata packet changes no src.

## Accepted proof receipts

- PR112: merge `c82f889eb3707ed8e8f88c32a8f97640739b3e84`; implementation `90fef3f83a8fe6e7eb5b0c54ed6789f5166ce06f`; independent review SHA-256 `fd88fc085b4fc6f0fd12feef669d95d6125722de28960602bd342956f857bae0`; CI 41031464191, 41031455459; automatic 6518416644; receipt 6519283288; kind separate-receipt-comment.
- PR114: merge `b211895b0bf4600bc7c8fa830814284c46293c97`; implementation `e6367e6f5e2489c40f5acbd00da7dc27d9b6169f`; independent review SHA-256 `c94d256773bf2502f282352c242d71e5a7cc0d357b8af7b8f940d18815e004d0`; CI 41035558425, 41035553248; automatic 6519462817; receipt 6519933477; kind separate-receipt-comment.
- PR115: merge `e2b2d5ff4090c5c39006abea147a24450ca5c17b`; implementation `4d3c8f1aaee8b5ce5911904e17d48f75c49896b9`; independent review SHA-256 `20672779d17533e354a40847002ab5b8f8b4484636a61c0f03abc6863ce8e350`; CI 41049281097, 41049271263; automatic 6520939225; receipt 6521769394; kind separate-receipt-comment.
- PR116: merge `db5d2930eb07ef98ddda1d09bb1968efed0f57d3`; implementation `2c1178d68ad887c218f2bc3975bba7b6024d032f`; independent review SHA-256 `0352332ec54bf4e29d70798a06c98ba43e2047f265d904a282b08e5cff0ec24a`; CI 41064673415, 41064666632; automatic 6523347081; receipt 6524247429; kind separate-receipt-comment.
- PR118: merge `decf689b2803772034bcae150544d1820395dcd5`; implementation `b3710c91d980597b1e13905c3afd432a491ff76e`; independent review SHA-256 `f117875e938d538cec7436be22ba5b2f7e71aa89528b550b38745bd2fe20f848`; CI 41071904326, 41071757626; automatic 6525460623; receipt 6525460623; kind actual-summary-state-completed-exact-no-findings;no separate receipt comment observed. Accepted union tree d78e3293e6f67e91c6d15c53631bb54f46510224; reviewed source tree a3b5964dbede6c20c16285c4db8661b3b176c8e4; source-proof base PR116 db5d2930eb07ef98ddda1d09bb1968efed0f57d3.
- PR120: merge `9c11a985d79b28ef6c4e167966f1863647af5ba8`; implementation `79b3335571addf96c46464b25bb460ca28e9804d`; independent review SHA-256 `6153ae4bb86305701f2111eca59b6e67b5dd382a74ef5c48b2c64946e0ffce68`; CI 41110437096, 41110429681; automatic 6527929680; receipt 6531111769; kind separate-receipt-comment. Accepted union tree 574c5a954aa390883d79906bff80a803f2eb4009; reviewed source tree fdb34eb8a0f7229d46482e5319bd483961b04653; source-proof base PR118 decf689b2803772034bcae150544d1820395dcd5.
- PR122: merge `81353ad52118875195c925d668cc469ad72d106e`; implementation `7540c012f8a7bb9ee343b09628eecb0c85c4fb85`; independent review SHA-256 `c7ad6b0b461bd0ea049cfea8b9e1d957650c8b5b3ddc5c01e93f03155a95e180`; CI 41136204108, 41136195941; automatic 6533377523; receipt 6534702086; kind separate-receipt-comment. Accepted union tree 07126bf9a65a38fb15d3c4f75b6f915ad134b611; reviewed source tree 6f28744d18198aa929c042d9ca2041ee816e22f1; source-proof base PR120 9c11a985d79b28ef6c4e167966f1863647af5ba8.

## Training43: first original-level acceptance

- [ ] **T43-01 Pin level and source revision** — Partial. Use the exact editor digest; disclose runtime-body differences and north-facing adaptation. Identities are pinned; a reviewed whole-level acceptance receipt remains open.
- [ ] **T43-02 Initialize and control four selected actors** — Partial. Bind roster/items and actor state; exercise all four keyboard-controlled actors. Physical input assignments are DEFERRED to separate human controller/TV acceptance and do not block keyboard software work. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-03 Complete required dry traversal and exit** — Partial. Retain demonstrated full-team dry route; include original dead/control outcome rules before whole-level acceptance. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-04 Classify every reachable interaction** — Partial. Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-05 Wet stairs and environmental outcomes** — Partial. Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-06 Death, control, occupancy and corpses** — Partial. Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-07 Atomic checkpoint around every interaction** — Partial. Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-08 Outcome, timeout and fresh retry** — Partial. Accepted PR118 actual keyboard traversal of all 22 standing wet CASE cells by nonimmune race4 and source-immune race1, full four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. Separate corridor same-cell corpse/dead-input guard/manual survivor/return/terminal recovery supplements PR116 stair aux10 NORTH corpse proof. Observed visits are replay-derived, never movement authority or whole-level coverage. Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad gate remains partial.
- [ ] **T43-09 Physical four-player complete run** — Open. DEFERRED: separate human acceptance with four people on event PC/TV; verify disconnect recovery and usable inventory/interactions. This physical gate does not block keyboard software work.
- [ ] **T43-10 Acceptance receipt and regression replay** — Open. Record exact build/source digests, modes, player/hardware observations and all open deviations; link reproducible tests.

## Mechanics

| ID | Mechanic | Mapping | Reference | Rules | Playable | Integration | Recovery | Original level | Physical |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [SYS-01](index.html#SYS-01) | Revision and resource identity | Partial | Partial | Covered slice | Covered slice | Partial | Partial | Open | Open |
| [SYS-02](index.html#SYS-02) | Team initialization | Partial | Partial | Covered slice | Covered slice | Partial | Covered slice | Open | Open |
| [SYS-03](index.html#SYS-03) | Counters and simulation timing | Partial | Partial | Covered slice | Covered slice | Partial | Partial | Open | Open |
| [SYS-04](index.html#SYS-04) | Randomness and deterministic continuation | Open | Open | Partial | Partial | Open | Partial | Open | Open |
| [SYS-05](index.html#SYS-05) | Input, selection and party control | Partial | Partial | Covered slice | Covered slice | Partial | Partial | Open | Open |
| [SYS-06](index.html#SYS-06) | Leader and follower behaviour | Open | Open | Open | Open | Open | Open | Open | Open |
| [MOV-01](index.html#MOV-01) | Grid movement and occupancy | Partial | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [MOV-02](index.html#MOV-02) | Standing support and clearance | Partial | Partial | Covered slice | Covered slice | Partial | Covered slice | Open | Open |
| [MOV-03](index.html#MOV-03) | Directional stairs | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [MOV-04](index.html#MOV-04) | Player falling and landing | Partial | Partial | Covered slice | Covered slice | Partial | Covered slice | Open | Open |
| [MOV-05](index.html#MOV-05) | Pushable blocks | Open | Open | Open | Open | Open | Open | Open | Open |
| [MOV-06](index.html#MOV-06) | Falling objects and squash | Open | Open | Open | Open | Open | Open | Open | Open |
| [ENV-01](index.html#ENV-01) | Wall buttons and action dispatch | Partial | Partial | Covered slice | Covered slice | Partial | Covered slice | Open | Open |
| [ENV-02](index.html#ENV-02) | Pressure pads and release | Partial | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [ENV-03](index.html#ENV-03) | Floor mutations | Open | Open | Open | Open | Open | Open | Open | Open |
| [ENV-04](index.html#ENV-04) | Block mutations | Partial | Partial | Open | Open | Open | Open | Open | Open |
| [ENV-05](index.html#ENV-05) | Door motion and reversal | Partial | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [ENV-06](index.html#ENV-06) | Door keys, locks and eligibility | Partial | Partial | Partial | Partial | Partial | Partial | Open | Open |
| [ENV-07](index.html#ENV-07) | Lifts and moving support | Open | Open | Open | Open | Open | Open | Open | Open |
| [ENV-08](index.html#ENV-08) | Water entry and wet traversal | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [ENV-09](index.html#ENV-09) | Water level changes | Open | Open | Open | Open | Open | Open | Open | Open |
| [ENV-10](index.html#ENV-10) | Teleport fields | Open | Open | Open | Open | Open | Open | Open | Open |
| [ENV-11](index.html#ENV-11) | Repulsion and other field dispatch | Open | Open | Open | Open | Open | Open | Open | Open |
| [INV-01](index.html#INV-01) | Roster, item decoding and initial inventory | Covered slice | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [INV-02](index.html#INV-02) | Equip, exchange and return | Partial | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [INV-03](index.html#INV-03) | Weight and movement encumbrance | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [INV-04](index.html#INV-04) | Original ground items and pickup/drop | Partial | Partial | Covered slice | Covered slice | Partial | Covered slice | Open | Open |
| [INV-05](index.html#INV-05) | Reload and ammunition use | Open | Open | Open | Open | Open | Open | Open | Open |
| [INV-06](index.html#INV-06) | Food, repair and immunity items | Partial | Partial | Partial | Partial | Partial | Partial | Open | Open |
| [INV-07](index.html#INV-07) | Containers, corpse loot and transfer | Open | Open | Open | Open | Open | Open | Open | Open |
| [INV-08](index.html#INV-08) | Other item dispatch and utility devices | Open | Open | Open | Open | Open | Open | Open | Open |
| [COMBAT-01](index.html#COMBAT-01) | Normal gun arithmetic | Covered slice | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [COMBAT-02](index.html#COMBAT-02) | Spatial targeting, range and hit resolution | Open | Open | Open | Open | Open | Open | Open | Open |
| [COMBAT-03](index.html#COMBAT-03) | Launchers, flamers and projectiles | Open | Open | Open | Open | Open | Open | Open | Open |
| [COMBAT-04](index.html#COMBAT-04) | Grenades and explosions | Open | Open | Open | Open | Open | Open | Open | Open |
| [COMBAT-05](index.html#COMBAT-05) | Mines | Open | Open | Open | Open | Open | Open | Open | Open |
| [COMBAT-06](index.html#COMBAT-06) | Sentries | Open | Open | Open | Open | Open | Open | Open | Open |
| [AI-01](index.html#AI-01) | Original enemy navigation and detection | Open | Open | Partial | Partial | Partial | Partial | Open | Open |
| [AI-02](index.html#AI-02) | Enemy attack, damage and death | Open | Open | Partial | Partial | Partial | Partial | Open | Open |
| [AI-03](index.html#AI-03) | Eggs and spawning | Open | Open | Open | Open | Open | Open | Open | Open |
| [AI-04](index.html#AI-04) | Enemy falling, water and teleport | Open | Open | Open | Open | Open | Open | Open | Open |
| [LIFE-01](index.html#LIFE-01) | Fitness, armour and damage modifiers | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [LIFE-02](index.html#LIFE-02) | Death, corpses and control transfer | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [LIFE-03](index.html#LIFE-03) | Breath and drowning | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [LIFE-04](index.html#LIFE-04) | Water inventory damage | Partial | Partial | Covered slice | Partial | Partial | Partial | Open | Open |
| [LIFE-05](index.html#LIFE-05) | Poison and timed statuses | Open | Open | Open | Open | Open | Open | Open | Open |
| [LIFE-06](index.html#LIFE-06) | Healing, fitness fields and progression | Partial | Partial | Partial | Partial | Partial | Partial | Open | Open |
| [PSI-01](index.html#PSI-01) | Psi dispatch, charges and effect lifetime | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-02](index.html#PSI-02) | Fireball | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-03](index.html#PSI-03) | Inferno | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-04](index.html#PSI-04) | Blast | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-05](index.html#PSI-05) | Devastate | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-06](index.html#PSI-06) | Fire shield | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-07](index.html#PSI-07) | Shield | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-08](index.html#PSI-08) | Granite strength | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-09](index.html#PSI-09) | Titanium strength | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-10](index.html#PSI-10) | Wall | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-11](index.html#PSI-11) | Banish wall | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-12](index.html#PSI-12) | Bridge | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-13](index.html#PSI-13) | Float | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-14](index.html#PSI-14) | Feather | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-15](index.html#PSI-15) | Sonic blast | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-16](index.html#PSI-16) | Shock blast | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-17](index.html#PSI-17) | Gills | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-18](index.html#PSI-18) | Part waves | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-19](index.html#PSI-19) | Quench | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-20](index.html#PSI-20) | Water tight | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-21](index.html#PSI-21) | Electrify | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-22](index.html#PSI-22) | Lightning | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-23](index.html#PSI-23) | Fry | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-24](index.html#PSI-24) | Farsight | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-25](index.html#PSI-25) | Teleport | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-26](index.html#PSI-26) | Shift | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-27](index.html#PSI-27) | Cure poison | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-28](index.html#PSI-28) | Heal | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-29](index.html#PSI-29) | Transmute | Open | Open | Open | Open | Open | Open | Open | Open |
| [PSI-30](index.html#PSI-30) | Miracle | Open | Open | Open | Open | Open | Open | Open | Open |
| [WORLD-01](index.html#WORLD-01) | Map import and runtime transformation | Partial | Partial | Covered slice | Covered slice | Partial | Partial | Open | Open |
| [WORLD-02](index.html#WORLD-02) | Exit, timeout and mission outcome | Partial | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [WORLD-03](index.html#WORLD-03) | Messages, signs and triggers | Open | Open | Open | Open | Open | Open | Open | Open |
| [WORLD-04](index.html#WORLD-04) | Campaign travel and completion | Partial | Partial | Partial | Open | Open | Open | Open | Open |
| [WORLD-05](index.html#WORLD-05) | Checkpoint, retry and deterministic recovery | Covered slice | Partial | Covered slice | Covered slice | Covered slice | Covered slice | Open | Open |
| [WORLD-06](index.html#WORLD-06) | Complete original-level acceptance | Partial | Partial | Partial | Partial | Partial | Partial | Open | Open |
| [PRESENT-01](index.html#PRESENT-01) | Four-view gameplay rendering | Partial | Partial | Partial | Covered slice | Partial | Open | Open | Open |
| [PRESENT-02](index.html#PRESENT-02) | Gameplay audio and cue integration | Partial | Partial | Partial | Partial | Open | Open | Open | Open |
| [PRESENT-03](index.html#PRESENT-03) | Physical controllers and event TV | Covered slice | Open | Covered slice | Partial | Partial | Open | Open | Open |

### SYS-01 — Revision and resource identity

**Original:** Use a named source/data revision; editor, OCS runtime and CD32 bodies are distinct inputs. Preserve unidentified fields.

**Source:** OCS Equates.i; runtime loaders; campaign table audit; baseline ocs-3926.

**Mapped scope:** Verified identities for selected map/roster/item resources; original startup/resource selection remains incomplete.

**Evidence:** [campaign-location-baseline.md](../../docs/campaign-location-baseline.md), [map-format.md](../../docs/map-format.md), [character-format.md](../../docs/character-format.md), [item-format.md](../../docs/item-format.md)

**Tests:** [import-editor-map.test.ts](../../tests/import-editor-map.test.ts), [characters.test.ts](../../tests/characters.test.ts), [items.test.ts](../../tests/items.test.ts)

**Scenarios:** training43

**Gaps:** Runtime map selection and full startup provenance remain unresolved.

**Next:** Pin every level acceptance case to its editor/runtime digest and document deviations explicitly.

### SYS-02 — Team initialization

**Original:** Initialize chosen actors, source stats, carried inventory, controls and map references in original caller order.

**Source:** Main.s startup; character initialization helpers; baseline ocs-3926.

**Mapped scope:** Source-bound selected-team browser adaptation plus isolated original initialization observations.

**Evidence:** [training-session.md](../../docs/training-session.md), [team-initialization-helpers.md](../../docs/team-initialization-helpers.md), [startup-reset-placement-observation.md](../../docs/startup-reset-placement-observation.md)

**Tests:** [original-team.test.ts](../../tests/original-team.test.ts), [training-session.test.ts](../../tests/training-session.test.ts), [training-session.spec.ts](../../tests/browser/training-session.spec.ts)

**Scenarios:** training43

**Gaps:** Full original startup/hardware parity is unproved.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### SYS-03 — Counters and simulation timing

**Original:** Advance gameplay counters in their original order with correct integer widths and interrupt/main-loop relationships.

**Source:** Main.s; ColdStartup.s counter updates; baseline ocs-3926.

**Mapped scope:** Fixed 50 Hz browser policy; source countdown arithmetic, not original wall-clock parity.

**Evidence:** [timing-modernisation.md](../../docs/timing-modernisation.md), [mission-rules.md](../../docs/mission-rules.md)

**Tests:** [timing-probe.test.ts](../../tests/timing-probe.test.ts), [mission.test.ts](../../tests/mission.test.ts)

**Scenarios:** extraction

**Gaps:** Original cadence measurement and all interacting counters remain open.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### SYS-04 — Randomness and deterministic continuation

**Original:** Retain the original sources and consumption order of randomness for combat, AI and other random decisions.

**Source:** Main.s and MonsterMovement.s; hardware-derived seed paths; baseline ocs-3926.

**Mapped scope:** Architecture has explicit RNG state; no whole-game original RNG mapping.

**Evidence:** [reference-comparison.md](../../docs/reference-comparison.md)

**Tests:** [checkpoint.test.ts](../../tests/checkpoint.test.ts)

**Scenarios:** None linked

**Gaps:** Repeatability of authored rules does not prove original random outcomes.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### SYS-05 — Input, selection and party control

**Original:** Route commands to controlled living actors; select views; preserve fewer-human party-control behaviour and original control gates.

**Source:** Controls&Movement.s; Main.s death/control dispatch; baseline ocs-3926.

**Mapped scope:** Browser four-input routing plus bounded original mouse-selection evidence.

**Evidence:** [mouse0-selection-contract.md](../../docs/mouse0-selection-contract.md), [after-death-control-observation.md](../../docs/after-death-control-observation.md), [controller-tv-acceptance.md](../../docs/controller-tv-acceptance.md)

**Tests:** [input.test.ts](../../tests/input.test.ts), [mouse0-selection.test.ts](../../tests/mouse0-selection.test.ts), [controller-preview.spec.ts](../../tests/browser/controller-preview.spec.ts)

**Scenarios:** training43, controller

**Gaps:** Following, death selection and four physical controllers are separate gaps.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### SYS-06 — Leader and follower behaviour

**Original:** Move followers under original leader selection, spacing, obstruction and death rules.

**Source:** Main.s follow_leader; Controls&Movement.s leadership controls; baseline ocs-3926.

**Mapped scope:** Named source subsystem; detailed mapping not completed.

**Evidence:** [after-death-control-observation.md](../../docs/after-death-control-observation.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Independent actor switching does not implement followers.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### MOV-01 — Grid movement and occupancy

**Original:** Resolve forward/back/strafe/turn against cell geometry and actors, updating current/old references in order.

**Source:** Controls&Movement.s movement; Main.s reference placement; baseline ocs-3926.

**Mapped scope:** Dry browser movement works; stable-ID/no-swap policy is authored rather than full original collision parity.

**Evidence:** [static-traversal.md](../../docs/static-traversal.md), [initialized-player-reference-placement-observation.md](../../docs/initialized-player-reference-placement-observation.md)

**Tests:** [navigation.test.ts](../../tests/navigation.test.ts), [navigation.spec.ts](../../tests/browser/navigation.spec.ts), [extraction.spec.ts](../../tests/browser/extraction.spec.ts)

**Scenarios:** training43, patrol

**Gaps:** Original simultaneous occupancy and dynamic/wet interactions need reference-backed cases.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### MOV-02 — Standing support and clearance

**Original:** Determine valid standing/support cells, including unusual two-level support and overhead obstruction.

**Source:** Controls&Movement.s movement obstruction; Main.s player_fall; baseline ocs-3926.

**Mapped scope:** Dry supported floor/block/tree subset.

**Evidence:** [static-traversal.md](../../docs/static-traversal.md), [type1-support-contract.md](../../docs/type1-support-contract.md)

**Tests:** [traversal.test.ts](../../tests/traversal.test.ts), [type1-support.test.ts](../../tests/type1-support.test.ts)

**Scenarios:** training43, stairs

**Gaps:** Moving support, wet state and entity squash remain outside the dry subset.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### MOV-03 — Directional stairs

**Original:** Apply directional ascent/descent, paired stairs, target clearance and wet destination consequences.

**Source:** Controls&Movement.s move and directional callers; baseline ocs-3926.

**Mapped scope:** Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial. PR120 adds the bounded selected-team/all-dead/v18 milestone; broader stage classifications are unchanged.

**Evidence:** [static-traversal.md](../../docs/static-traversal.md), [training43-completion.md](../../docs/training43-completion.md), [Accepted PR115 wet consumer](../../docs/training43-wet-traversal.md), [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md), [training43-wet-region.md](../../docs/training43-wet-region.md), [PR120 selected-team all-dead](../../docs/training43-selected-team-all-dead.md)

**Tests:** [traversal.test.ts](../../tests/traversal.test.ts), [stairs.spec.ts](../../tests/browser/stairs.spec.ts), [training-wet.test.ts](../../tests/training-wet.test.ts), [training-wet.spec.ts](../../tests/browser/training-wet.spec.ts), [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts), [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts), [training-wet-region.test.ts](../../tests/training-wet-region.test.ts), [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts)

**Scenarios:** training43, stairs, wet, wet-lifecycle, wet-region, wet-party

**Gaps:** Accepted122 covers bounded original99 timeout/full v19 recovery. General corpse items/replacement and unsupported wet/source/geometry branches remain open where reachable. Initial pinned machinery predicates are inactive only at that revision; no whole43 or hardware acceptance. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

**Next:** Cover remaining original branches and compound whole-level gates with separate reviewed source-bound proof.

### MOV-04 — Player falling and landing

**Original:** Accumulate fall damage using source agility/weight/physique; descend, land and apply lifecycle effects in order.

**Source:** Main.s player_fall; damage_fitness; baseline ocs-3926.

**Mapped scope:** Dry selected-team practice; narrow original descent/landing helpers are separately evidenced.

**Evidence:** [selected-fall.md](../../docs/selected-fall.md), [dry-descent-contract.md](../../docs/dry-descent-contract.md), [landing-damage-contract.md](../../docs/landing-damage-contract.md)

**Tests:** [fall.test.ts](../../tests/fall.test.ts), [landing-damage.test.ts](../../tests/landing-damage.test.ts), [selected-fall.spec.ts](../../tests/browser/selected-fall.spec.ts)

**Scenarios:** fall

**Gaps:** Original map/wet/pad/corpse lifecycle and changing-weight history are not integrated.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### MOV-05 — Pushable blocks

**Original:** Push blocks only into eligible cells and update support, occupancy, pads and falling state.

**Source:** Controls&Movement.s pushable movement; Main.s block fall; baseline ocs-3926.

**Mapped scope:** Source inventory identified; executable/puzzle behaviour not mapped.

**Evidence:** [map-format.md](../../docs/map-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Pushable metadata presence is not a functioning puzzle.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### MOV-06 — Falling objects and squash

**Original:** Advance unsupported blocks/items/actors, trigger impacts and preserve crush/squash consequences and call order.

**Source:** Main.s falling objects; MonsterMovement.s monsters_fall; baseline ocs-3926.

**Mapped scope:** Only player dry-fall subset exists; object/squash rules unimplemented.

**Evidence:** [dry-descent-observation.md](../../docs/dry-descent-observation.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Current authored no-crush guards do not prove original crushing.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-01 — Wall buttons and action dispatch

**Original:** Dispatch panel types to the correct IN/OUT action, resolving target address domains and preserving no-ops.

**Source:** Controls&Movement.s activate_panel; button_in/out; do_button_action; baseline ocs-3926.

**Mapped scope:** Bounded source button-to-door core and authored keyboard panel.

**Evidence:** [button-door-transition.md](../../docs/button-door-transition.md), [training-gate.md](../../docs/training-gate.md), [training43-completion.md](../../docs/training43-completion.md)

**Tests:** [button-door-transition.test.ts](../../tests/button-door-transition.test.ts), [training-gate.test.ts](../../tests/training-gate.test.ts), [training-gate.spec.ts](../../tests/browser/training-gate.spec.ts)

**Scenarios:** gate, moving-door

**Gaps:** Original runtime target binding and complete action table remain incomplete.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-02 — Pressure pads and release

**Original:** Player/object entry invokes actionIn; release invokes actionOut; all occupant and lifecycle transitions must participate.

**Source:** Controls&Movement.s movement and pad entry/release; Main.s death; baseline ocs-3926.

**Mapped scope:** Accepted PR111: source-derived successful-player entry/release in one canonical authored pad/door arena. Original runtime selection and other entity/lifecycle callers remain outside scope.

**Evidence:** [training43-completion.md](../../docs/training43-completion.md), [death-transition-contract.md](../../docs/death-transition-contract.md), [training-pressure-pad.md](../../docs/training-pressure-pad.md)

**Tests:** [training-pressure-pad.test.ts](../../tests/training-pressure-pad.test.ts), [training-pressure-pad.spec.ts](../../tests/browser/training-pressure-pad.spec.ts)

**Scenarios:** pressure-pad

**Gaps:** Player-only authored entry/release: original pad/door runtime selection, pushable, death/corpse, wet and fall-trigger callers remain open.

**Next:** Map and integrate each original pad caller, preserving release/press ordering and full recovery.

### ENV-03 — Floor mutations

**Original:** Button actions enable, remove or toggle floors with the correct support/falling consequences.

**Source:** Equates.i button actions 1–3; Controls&Movement.s do_button_action; baseline ocs-3926.

**Mapped scope:** Action family identified; target validity and integrated outcomes not mapped.

**Evidence:** [training43-completion.md](../../docs/training43-completion.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Stored action records can be dormant or unreachable.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-04 — Block mutations

**Original:** Button actions enable, remove or toggle blocks and update collision, actors and dependent state.

**Source:** Equates.i button actions 4–6; Controls&Movement.s do_button_action; baseline ocs-3926.

**Mapped scope:** Selected block-off target classification exists; no general integrated action system.

**Evidence:** [training43-completion.md](../../docs/training43-completion.md)

**Tests:** [training43-audit.test.ts](../../tests/training43-audit.test.ts)

**Scenarios:** None linked

**Gaps:** A static audit is not execution of a block-change puzzle.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-05 — Door motion and reversal

**Original:** Open/close/reverse normal doors through source variants, counters, delayed closure and pending actions.

**Source:** Main.s move_doors; Controls&Movement.s actions 14–18; baseline ocs-3926.

**Mapped scope:** Accepted normal-door helper and authored tick/occupancy adapter.

**Evidence:** [door-motion.md](../../docs/door-motion.md), [training-moving-door.md](../../docs/training-moving-door.md)

**Tests:** [door-motion.test.ts](../../tests/door-motion.test.ts), [training-moving-door.test.ts](../../tests/training-moving-door.test.ts), [training-moving-door.spec.ts](../../tests/browser/training-moving-door.spec.ts)

**Scenarios:** moving-door

**Gaps:** Original runtime selection, wall-clock timing and obstruction/crush behaviour unproved.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-06 — Door keys, locks and eligibility

**Original:** Resolve key possession, button-only restrictions, actor eligibility and lock/unlock conditions before door activation.

**Source:** Equates.i door_key/button_only; Controls&Movement.s door action dispatch; baseline ocs-3926.

**Mapped scope:** Authored accessible lock/unlock works; original key/actor eligibility not inferred.

**Evidence:** [door-motion.md](../../docs/door-motion.md), [training-moving-door.md](../../docs/training-moving-door.md)

**Tests:** [door-motion.test.ts](../../tests/door-motion.test.ts), [training-moving-door.spec.ts](../../tests/browser/training-moving-door.spec.ts)

**Scenarios:** moving-door

**Gaps:** Current synthetic fixture has no authentic original key puzzle.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-07 — Lifts and moving support

**Original:** Move lifts through limits/directions/automove; carry eligible occupants and blocks while updating support and pads.

**Source:** Main.s move_lifts; Equates.i lift records; baseline ocs-3926.

**Mapped scope:** Records and action families identified; no live lift implementation.

**Evidence:** [map-format.md](../../docs/map-format.md), [training43-completion.md](../../docs/training43-completion.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Inactive Training43 lift slots cannot establish lift coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-08 — Water entry and wet traversal

**Original:** Evaluate water depth, stairs, movement, immersion and actor-specific immunity without bypassing inventory/lifecycle effects.

**Source:** Main.s drowning/player_fall; Controls&Movement.s movement; baseline ocs-3926.

**Mapped scope:** Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial. PR120 adds the bounded selected-team/all-dead/v18 milestone; broader stage classifications are unchanged.

**Evidence:** [immersion-caller-contract.md](../../docs/immersion-caller-contract.md), [wet-entry-observation.md](../../docs/wet-entry-observation.md), [water-executable-evidence.md](../../docs/water-executable-evidence.md), [Accepted PR114 bounded CASE](../../docs/training43-wet-acceptance.md), [Accepted PR115 wet consumer](../../docs/training43-wet-traversal.md), [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md), [training43-wet-region.md](../../docs/training43-wet-region.md), [PR120 selected-team all-dead](../../docs/training43-selected-team-all-dead.md)

**Tests:** [immersion-caller.test.ts](../../tests/immersion-caller.test.ts), [training-wet.test.ts](../../tests/training-wet.test.ts), [training-wet.spec.ts](../../tests/browser/training-wet.spec.ts), [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts), [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts), [training-wet-region.test.ts](../../tests/training-wet-region.test.ts), [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts)

**Scenarios:** wet, wet-lifecycle, wet-region, wet-party

**Gaps:** Accepted122 covers bounded original99 timeout/full v19 recovery. General corpse items/replacement and unsupported wet/source/geometry branches remain open where reachable. Initial pinned machinery predicates are inactive only at that revision; no whole43 or hardware acceptance. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

**Next:** Cover remaining original branches and compound whole-level gates with separate reviewed source-bound proof.

### ENV-09 — Water level changes

**Original:** Advance water between bounds according to map state and timer, with resulting actor/item/geometry effects.

**Source:** Main.s move_water; Equates.i water limits/speed; baseline ocs-3926.

**Mapped scope:** Header fields decoded; changing-water behaviour unmapped.

**Evidence:** [map-format.md](../../docs/map-format.md), [training43-completion.md](../../docs/training43-completion.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Zero Training43 water speed does not disable immersion or prove moving-water mechanics.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-10 — Teleport fields

**Original:** Resolve destination cells and transfer actors/entities with collision, references and environmental consequences.

**Source:** Equates.i block type 6; Main.s teleport and MonsterMovement.s teleport_monster; baseline ocs-3926.

**Mapped scope:** Field type identified; runtime behaviour unimplemented.

**Evidence:** [map-format.md](../../docs/map-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Destination metadata and entity-specific caller rules need mapping.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### ENV-11 — Repulsion and other field dispatch

**Original:** Retain field-type dispatch and documented no-op behaviour rather than inventing effects from graphics.

**Source:** Equates.i field types; Controls&Movement.s movement dispatch; baseline ocs-3926.

**Mapped scope:** Source enum describes repulsion as inert; executable dispatch not yet pinned.

**Evidence:** [map-format.md](../../docs/map-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Confirm no-op semantics against selected source before marking mapped.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-01 — Roster, item decoding and initial inventory

**Original:** Decode source records and initialize stats, equipment, carried entries and actions without treating unknown bytes as padding.

**Source:** Character/Items record layouts; accepted initialization helpers; baseline ocs-3926.

**Mapped scope:** Exact verified OCS pair supports pure initialization and browser selected team.

**Evidence:** [character-format.md](../../docs/character-format.md), [item-format.md](../../docs/item-format.md), [training-session.md](../../docs/training-session.md)

**Tests:** [characters.test.ts](../../tests/characters.test.ts), [items.test.ts](../../tests/items.test.ts), [original-team.test.ts](../../tests/original-team.test.ts), [items.spec.ts](../../tests/browser/items.spec.ts)

**Scenarios:** training43

**Gaps:** Mapping completion applies to the documented initialization slice, not every live item rule.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-02 — Equip, exchange and return

**Original:** Transfer complete entries, compact/insert in original order, enforce capacity and recalculate weight.

**Source:** Controls&Movement.s inventory ACTION3/ACTION4; calc_weight; baseline ocs-3926.

**Mapped scope:** Repeatable paused selected-team transfers; broader original UI/caller semantics remain separate.

**Evidence:** [training-inventory.md](../../docs/training-inventory.md), [backpack-transfer-contract.md](../../docs/backpack-transfer-contract.md)

**Tests:** [training-inventory.test.ts](../../tests/training-inventory.test.ts), [training-inventory.spec.ts](../../tests/browser/training-inventory.spec.ts)

**Scenarios:** training43, ground, patrol

**Gaps:** Real-time controller inventory use and unsupported storage shapes remain open.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-03 — Weight and movement encumbrance

**Original:** Compute total weight from item categories/counts and apply original encumbrance/cadence effects.

**Source:** Controls&Movement.s calc_weight/add_weight; heavy_count updates; baseline ocs-3926.

**Mapped scope:** Verified weight calculation and fall seed; ordinary movement weight effects not implemented.

**Evidence:** [item-format.md](../../docs/item-format.md), [selected-fall.md](../../docs/selected-fall.md), [training-ground.md](../../docs/training-ground.md)

**Tests:** [items.test.ts](../../tests/items.test.ts), [training-ground.test.ts](../../tests/training-ground.test.ts)

**Scenarios:** ground, fall

**Gaps:** Weight display and pickup refusal do not establish encumbered movement.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-04 — Original ground items and pickup/drop

**Original:** Resolve original packed map items, ownership, pickup/drop, capacity and item-specific storage semantics.

**Source:** Controls&Movement.s pick_up/get_item/drop; editor/runtime item layer; baseline ocs-3926.

**Mapped scope:** Authored relocated cache demonstrates transfers; original packed placement remains unimplemented.

**Evidence:** [ground-transfer.md](../../docs/ground-transfer.md), [training-ground.md](../../docs/training-ground.md)

**Tests:** [ground-transfer.test.ts](../../tests/ground-transfer.test.ts), [training-ground.test.ts](../../tests/training-ground.test.ts), [training-ground.spec.ts](../../tests/browser/training-ground.spec.ts)

**Scenarios:** ground

**Gaps:** No direct carried drop, original ground packing, corpse/container or ground-swap coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-05 — Reload and ammunition use

**Original:** Use compatible ammunition and update equipped weapon/carried quantities through original item-use dispatch.

**Source:** ItemUsage.s .use_ammo; inventory item-use dispatch; baseline ocs-3926.

**Mapped scope:** Source branch identified; encounter reset is not a reload mechanic.

**Evidence:** [weapon-transition.md](../../docs/weapon-transition.md), [training-encounter.md](../../docs/training-encounter.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Gun encounter ammo is separate from the selected original inventory.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-06 — Food, repair and immunity items

**Original:** Apply food, equipment repair and immunity items with correct consumption, caps, targets and counters.

**Source:** ItemUsage.s .use_food/.use_repair/.use_immu; baseline ocs-3926.

**Mapped scope:** Accepted PR112: paused source-owned equipped food/repair in authored selected-team dry-fall practice, full v14 chronological recovery. Immunity items, poison/medical and original world callers remain open.

**Evidence:** [item-format.md](../../docs/item-format.md), [training-session.md](../../docs/training-session.md)

**Tests:** [training-consumables.test.ts](../../tests/training-consumables.test.ts), [training-consumables.spec.ts](../../tests/browser/training-consumables.spec.ts)

**Scenarios:** consumables

**Gaps:** Each dispatch branch needs separate cases before this family can close.

**Next:** Compose additional original item/status callers separately; preserve accepted food/repair race guards and weight/health chronology.

### INV-07 — Containers, corpse loot and transfer

**Original:** Expose contents and transfer items between actors, corpses/containers and ground without loss or duplication.

**Source:** Equates.i container/dead-player auxiliary types; inventory callers; baseline ocs-3926.

**Mapped scope:** Storage types identified; general interaction/loot rules unimplemented.

**Evidence:** [death-transition-contract.md](../../docs/death-transition-contract.md), [ground-transfer.md](../../docs/ground-transfer.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Authored shared cache does not implement corpse or container inventories.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### INV-08 — Other item dispatch and utility devices

**Original:** Preserve each original category dispatch, including detection devices and explicit inert handlers.

**Source:** ItemUsage.s .use_dts/.use_dts2/.use_sentrycntrl and item dispatch; baseline ocs-3926.

**Mapped scope:** Source dispatch discovery only; exact branch inventory needs completion.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Unclassified item categories must be added here or split into their own rows.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### COMBAT-01 — Normal gun arithmetic

**Original:** Respect ammo/cooldown guards and full configured burst damage, including partial-ammo integer behaviour.

**Source:** ItemUsage.s .use_gun/fire_missile; damage_fitness arithmetic; baseline ocs-3926.

**Mapped scope:** One category-zero NAOMI IV family, authored dummy/miss target.

**Evidence:** [weapon-transition.md](../../docs/weapon-transition.md), [training-encounter.md](../../docs/training-encounter.md)

**Tests:** [weapon-transition.test.ts](../../tests/weapon-transition.test.ts), [training-encounter.test.ts](../../tests/training-encounter.test.ts), [training-encounter.spec.ts](../../tests/browser/training-encounter.spec.ts)

**Scenarios:** encounter, patrol, moving-door

**Gaps:** Mapped means this narrow family; not all weapons, spatial targeting or original CPU whole-shot parity.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### COMBAT-02 — Spatial targeting, range and hit resolution

**Original:** Traverse facing/distance/obstructions and select player, monster, egg or sentry hit paths with original accuracy policy.

**Source:** ItemUsage.s get_dist/get_player_hit/get_monster_hit/get_egg_hit/get_sentry_hit; baseline ocs-3926.

**Mapped scope:** Source routines identified; F/T currently designates a target nonspatially.

**Evidence:** [weapon-transition.md](../../docs/weapon-transition.md), [training-patrol.md](../../docs/training-patrol.md)

**Tests:** Open

**Scenarios:** encounter, patrol

**Gaps:** No spatial aim/range/LOS, player hit or original accuracy outcomes.

**Next:** Implement a bounded spatial shot with wall, range, facing, miss and target-kind cases.

### COMBAT-03 — Launchers, flamers and projectiles

**Original:** Spawn/advance projectile and area effects using original ammo, speed, direction, collision and target rules.

**Source:** ItemUsage.s .use_launcher/.use_grlauncher/.use_flamer/do_fireballs; baseline ocs-3926.

**Mapped scope:** Source subsystem identified; ordinary gun arithmetic does not cover projectile families.

**Evidence:** [weapon-transition.md](../../docs/weapon-transition.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** All weapon categories beyond the accepted normal-gun slice remain open.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### COMBAT-04 — Grenades and explosions

**Original:** Throw/advance grenades and apply timed blast/stun effects to world entities in original order.

**Source:** ItemUsage.s .use_grenade; Main.s explosives/effect updates; baseline ocs-3926.

**Mapped scope:** Source family identified; no live grenade/explosion system.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Fuse, height, ownership, blast/stun and save-in-flight cases required.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### COMBAT-05 — Mines

**Original:** Arm, place and trigger mines for players/monsters/objects with correct damage and ownership effects.

**Source:** ItemUsage.s .use_mine; Main.s test_mine/trigger_mine; MonsterMovement.s test_mine_monster; baseline ocs-3926.

**Mapped scope:** Named callers inspected; no implemented mine behaviour.

**Evidence:** [dry-descent-observation.md](../../docs/dry-descent-observation.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Movement/fall entry and every trigger caller need integration cases.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### COMBAT-06 — Sentries

**Original:** Place and control sentries, reserve cells and execute their target/fire/damage lifecycle.

**Source:** ItemUsage.s .use_sentry/.use_sentrycntrl; sentry systems; baseline ocs-3926.

**Mapped scope:** Placement/control source branches identified; full system unmapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Do not interpret the inert source control handler as proof of the whole sentry system.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### AI-01 — Original enemy navigation and detection

**Original:** Select eligible players and move using original approach/retreat/random/obstruction rules.

**Source:** MonsterMovement.s find_closest_player/move_towards/move_away/do_movement; baseline ocs-3926.

**Mapped scope:** Authored fixed patrol is playable; original AI is unimplemented.

**Evidence:** [training-patrol.md](../../docs/training-patrol.md)

**Tests:** [training-patrol.test.ts](../../tests/training-patrol.test.ts), [training-patrol.spec.ts](../../tests/browser/training-patrol.spec.ts)

**Scenarios:** patrol, moving-door

**Gaps:** Authored back-and-forth route is not original detection or pursuit.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### AI-02 — Enemy attack, damage and death

**Original:** Apply monster-specific attacks/cadence, player injuries and original enemy health/death/occupancy outcomes.

**Source:** MonsterMovement.s monster_fire_fireball/damage_monster_fitness; Main.s damage helpers; baseline ocs-3926.

**Mapped scope:** Dummy zero-health defeat releases authored occupancy; original lifecycle not integrated.

**Evidence:** [training-patrol.md](../../docs/training-patrol.md), [damage-death-contract.md](../../docs/damage-death-contract.md)

**Tests:** [training-patrol.test.ts](../../tests/training-patrol.test.ts)

**Scenarios:** patrol

**Gaps:** Enemies cannot currently attack players; species-specific behaviours remain open.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### AI-03 — Eggs and spawning

**Original:** Hatch eggs under original counters/actions and initialize spawned enemies with valid occupancy.

**Source:** MonsterMovement.s hatch_eggs/do_hatch/add_monster; button hatch action; baseline ocs-3926.

**Mapped scope:** Closed-egg markers identified; spawn behaviours not mapped.

**Evidence:** [map-format.md](../../docs/map-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Graphics selectors and auxiliary presence do not prove a live hatch.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### AI-04 — Enemy falling, water and teleport

**Original:** Apply entity-specific gravity, environmental movement and teleport transitions with occupancy and attacks.

**Source:** MonsterMovement.s monsters_fall/teleport_monster; baseline ocs-3926.

**Mapped scope:** Named original callers; not covered by player fall helpers.

**Evidence:** [dry-descent-observation.md](../../docs/dry-descent-observation.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Entity-specific lifecycle must compose with movement, combat and saves.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### LIFE-01 — Fitness, armour and damage modifiers

**Original:** Apply original integer fitness/physique/shield/modifier arithmetic and inventory damage under the correct caller guards.

**Source:** Main.s damage_fitness; ItemUsage.s shooting path; baseline ocs-3926.

**Mapped scope:** Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.

**Evidence:** [damage-fitness-evidence.md](../../docs/damage-fitness-evidence.md), [damage-death-contract.md](../../docs/damage-death-contract.md), [shooting-argument-contract.md](../../docs/shooting-argument-contract.md), [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md), [training43-wet-region.md](../../docs/training43-wet-region.md)

**Tests:** [damage-fitness.test.ts](../../tests/damage-fitness.test.ts), [health.test.ts](../../tests/health.test.ts), [shooting-argument.test.ts](../../tests/shooting-argument.test.ts), [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts), [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts), [training-wet-region.test.ts](../../tests/training-wet-region.test.ts), [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts)

**Scenarios:** fall, encounter, wet-lifecycle, wet-region

**Gaps:** Accepted122 covers bounded original99 timeout/full v19 recovery. General corpse items/replacement and unsupported wet/source/geometry branches remain open where reachable. Initial pinned machinery predicates are inactive only at that revision; no whole43 or hardware acceptance. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

**Next:** Cover remaining original branches and compound whole-level gates with separate reviewed source-bound proof.

### LIFE-02 — Death, corpses and control transfer

**Original:** Mark death, remove occupancy, release pads, clear leaders and write corpse markers in original order; preserve original selection rules.

**Source:** Main.s death transition; Controls&Movement.s actor/control gates; baseline ocs-3926.

**Mapped scope:** Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial.

**Evidence:** [death-transition-contract.md](../../docs/death-transition-contract.md), [after-death-control-observation.md](../../docs/after-death-control-observation.md), [initialized-postdeath-fixture-fit.md](../../docs/initialized-postdeath-fixture-fit.md), [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md), [training43-wet-region.md](../../docs/training43-wet-region.md)

**Tests:** [death-transition.test.ts](../../tests/death-transition.test.ts), [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts), [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts), [training-wet-region.test.ts](../../tests/training-wet-region.test.ts), [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts)

**Scenarios:** fall, wet-lifecycle, wet-region

**Gaps:** Accepted122 covers bounded original99 timeout/full v19 recovery. General corpse items/replacement and unsupported wet/source/geometry branches remain open where reachable. Initial pinned machinery predicates are inactive only at that revision; no whole43 or hardware acceptance. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

**Next:** Cover remaining original branches and compound whole-level gates with separate reviewed source-bound proof.

### LIFE-03 — Breath and drowning

**Original:** Evaluate guards/depth/immunity, increment/reset breath and apply threshold damage in original integer order.

**Source:** Main.s drowning; pinned OCS wet-entry CPU observations; baseline ocs-3926.

**Mapped scope:** Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial. PR120 adds the bounded selected-team/all-dead/v18 milestone; broader stage classifications are unchanged.

**Evidence:** [wet-entry-observation.md](../../docs/wet-entry-observation.md), [drowning-decision-contract.md](../../docs/drowning-decision-contract.md), [immersion-caller-contract.md](../../docs/immersion-caller-contract.md), [Accepted PR114 bounded CASE](../../docs/training43-wet-acceptance.md), [Accepted PR115 wet consumer](../../docs/training43-wet-traversal.md), [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md), [training43-wet-region.md](../../docs/training43-wet-region.md), [PR120 selected-team all-dead](../../docs/training43-selected-team-all-dead.md), [Accepted122 timeout/recovery](../../docs/training43-source-timeout-recovery.md)

**Tests:** [drowning-decision.test.ts](../../tests/drowning-decision.test.ts), [immersion-caller.test.ts](../../tests/immersion-caller.test.ts), [training-wet.test.ts](../../tests/training-wet.test.ts), [training-wet.spec.ts](../../tests/browser/training-wet.spec.ts), [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts), [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts), [training-wet-region.test.ts](../../tests/training-wet-region.test.ts), [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts)

**Scenarios:** wet, wet-lifecycle, wet-region, wet-party

**Gaps:** Accepted122 covers bounded original99 timeout/full v19 recovery. General corpse items/replacement and unsupported wet/source/geometry branches remain open where reachable. Initial pinned machinery predicates are inactive only at that revision; no whole43 or hardware acceptance. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

**Next:** Cover remaining original branches and compound whole-level gates with separate reviewed source-bound proof.

### LIFE-04 — Water inventory damage

**Original:** Process equipped/carried entries and weight before breath immunity, retaining spell-specific bypass behaviour.

**Source:** Main.s immersion inventory ordering; water inventory helper; baseline ocs-3926.

**Mapped scope:** Accepted PR116 bounded original-editor wet injury/death, north-search corpse, owned four-head/dead-input guards, explicit manual survivor selection, freed-body/corpse walk, first exit, v16 paused chronological recovery and Retry. Broad original family remains partial. PR120 adds the bounded selected-team/all-dead/v18 milestone; broader stage classifications are unchanged.

**Evidence:** [water-inventory-contract.md](../../docs/water-inventory-contract.md), [immersion-caller-contract.md](../../docs/immersion-caller-contract.md), [Accepted PR114 bounded CASE](../../docs/training43-wet-acceptance.md), [Accepted PR115 wet consumer](../../docs/training43-wet-traversal.md), [training43-wet-lifecycle.md](../../docs/training43-wet-lifecycle.md), [training43-wet-region.md](../../docs/training43-wet-region.md), [PR120 selected-team all-dead](../../docs/training43-selected-team-all-dead.md), [Accepted122 timeout/recovery](../../docs/training43-source-timeout-recovery.md)

**Tests:** [water-inventory.test.ts](../../tests/water-inventory.test.ts), [training-wet.test.ts](../../tests/training-wet.test.ts), [training-wet.spec.ts](../../tests/browser/training-wet.spec.ts), [training-wet-lifecycle.test.ts](../../tests/training-wet-lifecycle.test.ts), [training-wet-lifecycle.spec.ts](../../tests/browser/training-wet-lifecycle.spec.ts), [training-wet-region.test.ts](../../tests/training-wet-region.test.ts), [training-wet-region.spec.ts](../../tests/browser/training-wet-region.spec.ts)

**Scenarios:** wet, wet-lifecycle, wet-region, wet-party

**Gaps:** Accepted122 covers bounded original99 timeout/full v19 recovery. General corpse items/replacement and unsupported wet/source/geometry branches remain open where reachable. Initial pinned machinery predicates are inactive only at that revision; no whole43 or hardware acceptance. Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates.

**Next:** Cover remaining original branches and compound whole-level gates with separate reviewed source-bound proof.

### LIFE-05 — Poison and timed statuses

**Original:** Accumulate poison and other statuses through timer updates, apply delayed damage and expire effects in source order.

**Source:** ColdStartup.s poison accumulation; Main.s status/damage updates; baseline ocs-3926.

**Mapped scope:** Original source branch identified; no complete timed-status implementation.

**Evidence:** [damage-death-contract.md](../../docs/damage-death-contract.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Hardware-driven gameplay counters must be mapped rather than discarded.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### LIFE-06 — Healing, fitness fields and progression

**Original:** Apply fitness-boost fields, healing, experience gains and resulting stat/cap changes as defined by original callers.

**Source:** Equates.i field type 2; Main.s fitness; ItemUsage.s experience updates; baseline ocs-3926.

**Mapped scope:** PR112 bounded equipped FOOD/nonmedical64 and REPAIR restore actual authored dry-fall fitness with caps/ID clear/source weight/v14 replay. Fitness fields, experience and progression remain open; see narrower INV-06 milestone.

**Evidence:** [character-format.md](../../docs/character-format.md), [Accepted PR112 food/repair scope](../../docs/training-consumables.md)

**Tests:** [training-consumables.test.ts](../../tests/training-consumables.test.ts), [training-consumables.spec.ts](../../tests/browser/training-consumables.spec.ts)

**Scenarios:** consumables

**Gaps:** Split progression/experience into separate rows when its full branch inventory is established.

**Next:** Map fields/progression/experience separately; no revival or general healing-family acceptance.

### PSI-01 — Psi dispatch, charges and effect lifetime

**Original:** Resolve original psi effect dispatch, consumption, eligibility, experience, duration and world/actor consequences.

**Source:** ItemUsage.s .use_psiamp/psi_table; baseline ocs-3926.

**Mapped scope:** Dispatch names inventoried; no live psi effects. Individual effect rows below remain open.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** An immunity branch observed by drowning tests does not implement casting the spell.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-02 — Fireball

**Original:** Projectile fire effect. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Fireball; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-03 — Inferno

**Original:** Multi-direction fire effect. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Inferno; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-04 — Blast

**Original:** Area blast effect. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Blast; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-05 — Devastate

**Original:** Larger destructive effect. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Devastate; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-06 — Fire shield

**Original:** Timed fire protection. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Fire shield; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-07 — Shield

**Original:** Timed damage protection. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Shield; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-08 — Granite strength

**Original:** Strength/physique modification. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Granite strength; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-09 — Titanium strength

**Original:** Strength/physique modification. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Titanium strength; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-10 — Wall

**Original:** World block creation. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Wall; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-11 — Banish wall

**Original:** World block removal. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Banish wall; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-12 — Bridge

**Original:** World support creation. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Bridge; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-13 — Float

**Original:** Actor support/fall modification. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Float; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-14 — Feather

**Original:** Actor fall modification. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Feather; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-15 — Sonic blast

**Original:** Area attack. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Sonic blast; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-16 — Shock blast

**Original:** Area attack. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Shock blast; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-17 — Gills

**Original:** Breath immunity. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Gills; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-18 — Part waves

**Original:** Water/world modification. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Part waves; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-19 — Quench

**Original:** Water/fire interaction. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Quench; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-20 — Water tight

**Original:** Inventory immersion protection. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Water tight; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-21 — Electrify

**Original:** Electrical attack. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Electrify; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-22 — Lightning

**Original:** Electrical attack. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Lightning; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-23 — Fry

**Original:** Electrical attack. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Fry; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-24 — Farsight

**Original:** Visibility effect. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Farsight; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-25 — Teleport

**Original:** Actor relocation. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Teleport; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-26 — Shift

**Original:** Actor/world relocation. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Shift; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-27 — Cure poison

**Original:** Status removal. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Cure poison; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-28 — Heal

**Original:** Fitness recovery. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Heal; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-29 — Transmute

**Original:** Item/world transformation. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Transmute; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PSI-30 — Miracle

**Original:** Combined effect. Exact targets, arithmetic, charges, duration and refusal cases require original branch mapping.

**Source:** ItemUsage.s psi_table branch: Miracle; baseline ocs-3926.

**Mapped scope:** Dispatch-name discovery only; behavioural description is provisional until its handler is mapped.

**Evidence:** [item-format.md](../../docs/item-format.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** No casting, executable reference, playable scenario or integrated recovery coverage.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### WORLD-01 — Map import and runtime transformation

**Original:** Parse the chosen resource and apply original runtime table/entity/map transformations before installing gameplay.

**Source:** Map loader; Equates.i; runtime selector producers; baseline ocs-3926.

**Mapped scope:** Byte-preserving editor importer exists; full runtime map loader/startup remains gated.

**Evidence:** [map-format.md](../../docs/map-format.md), [runtime-map-selector-producer.md](../../docs/runtime-map-selector-producer.md), [runtime-lower-cell-load-origin.md](../../docs/runtime-lower-cell-load-origin.md)

**Tests:** [import-editor-map.test.ts](../../tests/import-editor-map.test.ts), [training43-audit.test.ts](../../tests/training43-audit.test.ts)

**Scenarios:** training43

**Gaps:** Editor geometry equality is not runtime-map identity.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### WORLD-02 — Exit, timeout and mission outcome

**Original:** Evaluate exits, clock, dead/uncontrolled participants and terminal priority; preserve first-exit reference mode.

**Source:** Main.s check_exit; source countdown logic; baseline ocs-3926.

**Mapped scope:** All-alive first-exit and labelled cooperative extraction work; dead/control cases unresolved.

**Evidence:** [mission-rules.md](../../docs/mission-rules.md), [training-patrol-mission.md](../../docs/training-patrol-mission.md), [training43-completion.md](../../docs/training43-completion.md), [Accepted122 timeout/recovery](../../docs/training43-source-timeout-recovery.md)

**Tests:** [mission.test.ts](../../tests/mission.test.ts), [extraction.spec.ts](../../tests/browser/extraction.spec.ts), [training-patrol-mission.spec.ts](../../tests/browser/training-patrol-mission.spec.ts)

**Scenarios:** training43, extraction, patrol

**Gaps:** Complete original participant and all-dead semantics require live lifecycle.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### WORLD-03 — Messages, signs and triggers

**Original:** Dispatch cell signs and one-shot positional messages, including speaker and language conditions.

**Source:** Main.s push_messages; Controls&Movement.s panel text dispatch; baseline ocs-3926.

**Mapped scope:** Trigger records preserved; original message/sign gameplay not activated.

**Evidence:** [map-format.md](../../docs/map-format.md), [training43-completion.md](../../docs/training43-completion.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Inactive panel actions must not be promoted into functioning switches.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### WORLD-04 — Campaign travel and completion

**Original:** Select allowed destinations, load matching resources and preserve equipment/progress through campaign ending.

**Source:** WorldMap.s validate_choice; OCS Locations table and runtime map loaders; baseline ocs-3926.

**Mapped scope:** Location baseline discrepancy explained; executable travel and full campaign unimplemented.

**Evidence:** [campaign-location-baseline.md](../../docs/campaign-location-baseline.md), [runtime-map-selector-producer.md](../../docs/runtime-map-selector-producer.md)

**Tests:** Open

**Scenarios:** None linked

**Gaps:** Start-map runtime resource, dispatcher provenance and every campaign route remain open.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### WORLD-05 — Checkpoint, retry and deterministic recovery

**Original:** Atomically save/restore all installed mutable state and reset a mission without duplicating or replaying effects.

**Source:** Browser adaptation contract; original save parity separately unproved; baseline ocs-3926.

**Mapped scope:** World checkpoint v3 plus source-bound accepted scenario wrappers through v13.

**Evidence:** [checkpoints.md](../../docs/checkpoints.md), [training-session.md](../../docs/training-session.md), [training-moving-door.md](../../docs/training-moving-door.md), [training-pressure-pad.md](../../docs/training-pressure-pad.md)

**Tests:** [checkpoint.test.ts](../../tests/checkpoint.test.ts), [training-session.test.ts](../../tests/training-session.test.ts), [checkpoints.spec.ts](../../tests/browser/checkpoints.spec.ts), [training-moving-door.spec.ts](../../tests/browser/training-moving-door.spec.ts), [training-pressure-pad.spec.ts](../../tests/browser/training-pressure-pad.spec.ts)

**Scenarios:** training43, ground, fall, moving-door, pressure-pad

**Gaps:** Coverage is restricted to accepted modes; wet/lifecycle/lift state is not saved because it is not installed.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### WORLD-06 — Complete original-level acceptance

**Original:** A source-pinned level supports all required and reachable optional interactions, failure/retry and recoverable progress with four local players.

**Source:** Training43 completion boundary and user-selected first acceptance target; baseline ocs-3926.

**Mapped scope:** Training43 static route proven; whole-level acceptance remains open.

**Evidence:** [training43-completion.md](../../docs/training43-completion.md), [fallback-assessment.md](../../docs/fallback-assessment.md), [controller-tv-acceptance.md](../../docs/controller-tv-acceptance.md)

**Tests:** [training43-audit.test.ts](../../tests/training43-audit.test.ts), [extraction.spec.ts](../../tests/browser/extraction.spec.ts)

**Scenarios:** training43

**Gaps:** Wet stairs/region, lifecycle and complete recovery block keyboard software acceptance. Physical four-player controller/TV acceptance is DEFERRED separately and does not block keyboard software work.

**Next:** Close the Training43 acceptance checklist; retain the original first-exit and labelled cooperative variant.

### PRESENT-01 — Four-view gameplay rendering

**Original:** Show every actor and active mechanic with legible geometry, state and feedback in all four views.

**Source:** Browser renderer; original graphics reference separately scoped; baseline ocs-3926.

**Mapped scope:** Placeholder 3D views and authored overlays; NPC appears in overhead marker rather than original actor rendering.

**Evidence:** [render-performance.md](../../docs/render-performance.md), [testbed-ux.md](../../docs/testbed-ux.md), [training-patrol.md](../../docs/training-patrol.md)

**Tests:** [grid-mesh.test.ts](../../tests/grid-mesh.test.ts), [render-preview.spec.ts](../../tests/browser/render-preview.spec.ts), [testbed-ux.spec.ts](../../tests/browser/testbed-ux.spec.ts)

**Scenarios:** training43, patrol

**Gaps:** Original asset/animation integration and complete visual gameplay feedback remain deferred.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PRESENT-02 — Gameplay audio and cue integration

**Original:** Trigger correct gameplay cues from accepted events and route readable four-player feedback.

**Source:** Original cue mapping; browser event/audio adaptation; baseline ocs-3926.

**Mapped scope:** Separate audio diagnostic exists; gameplay cue integration deferred.

**Evidence:** [browser-audio.md](../../docs/browser-audio.md)

**Tests:** [audio-service.test.ts](../../tests/audio-service.test.ts), [audio-preview.spec.ts](../../tests/browser/audio-preview.spec.ts)

**Scenarios:** audio

**Gaps:** Sound helper effects may remain inert; previews are not in-game cue acceptance.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

### PRESENT-03 — Physical controllers and event TV

**Original:** Four people control distinct actors and use inventory/interactions, recover device faults and read all views on event hardware.

**Source:** Modern platform acceptance; original controller fidelity is separate; baseline ocs-3926.

**Mapped scope:** Synthetic routing and a physical-observation diagnostic; no accepted physical session.

**Evidence:** [controller-tv-acceptance.md](../../docs/controller-tv-acceptance.md)

**Tests:** [input.test.ts](../../tests/input.test.ts), [controller-preview.spec.ts](../../tests/browser/controller-preview.spec.ts)

**Scenarios:** controller

**Gaps:** Real controllers, disconnect/reconnect, full gameplay and seating-distance TV checks outstanding.

**Next:** Define the original branch conditions, make a bounded scenario and link its expected outcomes.

## Original-level relationships

Flags/sentinels are static observations. Only Training43 has the existing detailed approach/route audit. Other map requirements and reachability remain unverified.

### 01 · ArtificialIsland

Maps/Game/Map01_ArtificialIsland/01.map; SHA-256 `fc7d5734b4e0dafc68eff7d67122c9bc48be94f5655cfcbb5f5cc3fd3d02f5ef`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 02 · CaveSystem

Maps/Game/Map02_CaveSystem/02.map; SHA-256 `bd5b4f880f64321919f1960d42177caa79712e0452831c0c67c3478568e33b65`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 03 · LabTestSite

Maps/Game/Map03_LabTestSite/03.map; SHA-256 `08c29bbfad5ebebe3398e4cb436ad70ef68d092f3b68740bda69aa58318d3225`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 04 · Laboratory

Maps/Game/Map04_Laboratory/04.map; SHA-256 `1395ffb86240b0077288963f86645522693843f01cca70672ec45fd480a444fc`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 05 · Refinery

Maps/Game/Map05_Refinery/05.map; SHA-256 `ad470ea8697cc706e16ffafaec9ac5ebf82ed5df0f0db04058e2c77e87de6fc8`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 06 · UrbanDevelopment

Maps/Game/Map06_UrbanDevelopment/06.map; SHA-256 `c5fb49f5876cf950fce5e9edcf9678983fff5200d0fa9a5ba2360a1cbfa5f6d4`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 07 · AbandonedDepot

Maps/Game/Map07_AbandonedDepot/07.map; SHA-256 `d7a187fe80821d231dac6a4a7abef40537f5bc621248c75a56e04e0fa307b8e5`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 08 · Tomb

Maps/Game/Map08_Tomb/08.map; SHA-256 `1be65b7cf3f91ba15b86f0b412be57d8f43bd14e8b6e77ee2c641fee20c2a7bf`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 09 · Tomb

Maps/Game/Map09_Tomb/09.map; SHA-256 `4490eba70a8892aefbe6dd3768c938f33df8faaf8a75ff5ba79103c69809cbf7`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 10 · AmmoDepot

Maps/Game/Map10_AmmoDepot/10.map; SHA-256 `fed60e0e6770734363bc20df466052c6be909931b45c0b4bf4ec388eca686712`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 11 · SatelliteUplink

Maps/Game/Map11_SatelliteUplink/11.map; SHA-256 `5f010ca9ad80a23c6b3913ca7033789fe55123357a3f212ca7e50c553f5ac8a1`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 12 · DefenseBattery

Maps/Game/Map12_DefenseBattery/12.map; SHA-256 `74fc0a7ff325eaddb7527190f4d2120841f0db7415413e756aa9df349c320698`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 13 · Dropzone

Maps/Game/Map13_Dropzone/13.map; SHA-256 `28df7fb340f3560054b3ee2c2195253ed13f773a91a1b516df95107d1d82aba1`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 14 · Tomb

Maps/Game/Map14_Tomb/14.map; SHA-256 `ca1ff19e7704c12e96a5d4af790f06fd982eb80eae509d6e657781f15f541be2`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 15 · Tomb

Maps/Game/Map15_Tomb/15.map; SHA-256 `a0ac32b845e0ed57d6380dd3b54a831fc3496475146533f11b970ae346840839`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 16 · NotUsed

Maps/Game/Map16_NotUsed/16.map; SHA-256 `dd411b49be7e613452ab0c9561843b8e3a8985a877e85f1dce4b68acf5a8bae9`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 17 · OperationCentre

Maps/Game/Map17_OperationCentre/17.map; SHA-256 `f4592859bb0383c1acf4e35641e8b46d5f5a08265e1688d5d0e09dbd82bb9deb`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 18 · FusionReactor

Maps/Game/Map18_FusionReactor/18.map; SHA-256 `089c63c029e06b4ac59ac7b1dfd7bf8f4a884c4e176517a0099f00b14547228b`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 19 · DesalinationPlant

Maps/Game/Map19_DesalinationPlant/19.map; SHA-256 `b274ddff50dcffba690dfa431a5c43d6acf65a25f85acb64d4283fdb12000589`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 20 · UrbanDevelopment

Maps/Game/Map20_UrbanDevelopment/20.map; SHA-256 `c4918825c323f6e6fb276ccf1de2f38cc691fd2c45220a95b4e1101ae407b01c`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 21 · Spaceport

Maps/Game/Map21_Spaceport/21.map; SHA-256 `84148bae8705d6deb73632ecdddbe8331c58b7618381de20b518e259fcef2a61`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 22 · Stopover

Maps/Game/Map22_Stopover/22.map; SHA-256 `85052fa7ed373de185a01934c2cc1e207404bf8cf35d93551702d4602686c0e2`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 23 · 1pl

Maps/Game/Map23_1pl/23.map; SHA-256 `897e51c723b504d423e7189d8dd206b6849d27270535bda12dbf1cfa909e5817`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 24 · 1pl

Maps/Game/Map24_1pl/24.map; SHA-256 `f1a1952dba1451c6e7a14d79d95a6ae563ae139aacc89e55c2e8df12c95bb9ec`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 25 · 1pl

Maps/Game/Map25_1pl/25.map; SHA-256 `78b2d00e44375bbfdf132c1c2a00858f51e7f8be9e1032c613ed69bb762362e6`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 26 · 1pl

Maps/Game/Map26_1pl/26.map; SHA-256 `97efd43f7dace1188c9db724a06af86c87c766533b1748008503e9a470642d5d`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 27 · 1pl

Maps/Game/Map27_1pl/27.map; SHA-256 `f1d3ba442713589cb5ddb68d94b3370658e16fc564d8e3130d7afddab0300d1c`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 28 · 2pl

Maps/Game/Map28_2pl/28.map; SHA-256 `9907689ff4796c284cd6c9b23853ad53ebf8b9c0da551e695e75cadaff3729cf`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 29 · 2pl

Maps/Game/Map29_2pl/29.map; SHA-256 `f6d95382294c93ee85fef2a268447d60ca657a9416e96dbb33712df4efa63467`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 30 · 2pl

Maps/Game/Map30_2pl/30.map; SHA-256 `40fe602ce5b24437930da0d4496c8a0ca78e2ffb85fff37e7fecb42dd5842699`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 31 · 2pl

Maps/Game/Map31_2pl/31.map; SHA-256 `49ebafb1dbbe458de06fe94fcbeaeb189805a5a3db71c298bd642d2876782af8`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 32 · 2pl

Maps/Game/Map32_2pl/32.map; SHA-256 `d9907cb64b7b3d459ba1e8e2030aa025e85f926c99714111288fec57c8f15026`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 33 · 3pl

Maps/Game/Map33_3pl/33.map; SHA-256 `f30888ad9e678f95424314622f8df8388535ddb966fcc50eeabba0439a98600d`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [ENV-09](index.html#ENV-09): **present-unverified** — Water flags plus nonzero editor water speed; movement, limits and runtime transforms unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 34 · 3pl

Maps/Game/Map34_3pl/34.map; SHA-256 `8b0a66edbdc1505616c7b4823363aa279b986bbbb7804c8e86d9dbe3bb3b7379`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 35 · 3pl

Maps/Game/Map35_3pl/35.map; SHA-256 `95760f9536ade3e3552b2316abcbf2110a6022da22ebf7d360a7488e71bf3e53`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 36 · 3pl

Maps/Game/Map36_3pl/36.map; SHA-256 `7653e6cfbbd6bc032a2e868e733dcbba7f9c6304f7d474bb610e7af36ac0d267`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 37 · 3pl

Maps/Game/Map37_3pl/37.map; SHA-256 `77de8f628af793cc28b06180a816cf32557ee99ab0fe9c504e4f85c6dfa8f5d0`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 38 · 4pl

Maps/Game/Map38_4pl/38.map; SHA-256 `56caf1ec3158417a780261e8f938345fb9bbd05de2841ebc6c3184a14bc54b74`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 39 · 4pl

Maps/Game/Map39_4pl/39.map; SHA-256 `552b42c0d16d0dd9e88fa02686cd19fae3df14aec43fc89654e14b06ff7c7042`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 40 · 4pl

Maps/Game/Map40_4pl/40.map; SHA-256 `4ed88e088126d0f6874e96b8329f6ea686d9f8c64367d641c43ce2fea12023c4`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 41 · 4pl

Maps/Game/Map41_4pl/41.map; SHA-256 `739d1f3d8654fb76b88e78676915b96cc25c3a7f198fecffd4ef75c8900f678c`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### 42 · 4pl

Maps/Game/Map42_4pl/42.map; SHA-256 `5118cf81c05a79f3dbbc5d8e6679f55102d0984882506a0232c4b653e5a205a7`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [WORLD-03](index.html#WORLD-03): **present-unverified** — Nonzero text-trigger position observed; message dispatch, one-shot and language conditions unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### Training43

Maps/Game/Map43_Training/43.map; SHA-256 `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **required** — Exact editor Training43: all four actors replay the bounded dry exit route; checkpoints after retirement. Original dead/control and wall-clock parity remain unproved.
- [MOV-03](index.html#MOV-03): **reachable-optional** — PR115 supported wet entry/return plus PR116 bounded wet injury/death/corpse/head/control and v16 recovery accepted. Standing22 is accepted PR118; unsupported and whole-level outcomes remain open. Original classification unchanged; actual keyboard standing22 visits add bounded evidence, not a whole-level pass.
- [ENV-08](index.html#ENV-08): **unknown** — PR115 supported wet entry/return plus PR116 bounded wet injury/death/corpse/head/control and v16 recovery accepted. Standing22 is accepted PR118; unsupported and whole-level outcomes remain open. Original classification unchanged; actual keyboard standing22 visits add bounded evidence, not a whole-level pass.
- [LIFE-03](index.html#LIFE-03): **unknown** — PR115 supported wet entry/return plus PR116 bounded wet injury/death/corpse/head/control and v16 recovery accepted. Standing22 is accepted PR118; unsupported and whole-level outcomes remain open. Original classification unchanged; actual keyboard standing22 visits add bounded evidence, not a whole-level pass.
- [WORLD-02](index.html#WORLD-02): **required** — Exact editor Training43: all four actors replay the bounded dry exit route; checkpoints after retirement. Original dead/control and wall-clock parity remain unproved.
- [WORLD-03](index.html#WORLD-03): **unknown** — Reachable dry signs; button type0 dispatch is nop, followed by use_item, so whole activation is not proved nop. DrawViews.s2984–3044 and Equates.i480-byte/36 bitmap slots require separate rendering/readability proof. UNKNOWN/OPEN; unaccepted sign-view candidate receives no credit.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [MOV-02](index.html#MOV-02): **reachable-optional** — Existing Training43 audit identifies reachable two-level support; guarded immediate-above entry remains distinct.
- [WORLD-05](index.html#WORLD-05): **required** — Original-level recovery must include all installed environment/lifecycle state, not just the current dry route.
- [WORLD-06](index.html#WORLD-06): **required** — User-selected first original-level acceptance case: Training43.
- [PRESENT-03](index.html#PRESENT-03): **required** — Birthday human acceptance requires four physical players/controllers and TV validation. DEFERRED separately; does not block keyboard software work.

### Training44

Maps/Game/Map44_Training/44.map; SHA-256 `0de94cdae32aceabc02a4038972894915e2c840eb46a63011c40caa222272ca5`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### Training45

Maps/Game/Map45_Training/45.map; SHA-256 `a8fa4fe2799e609150cf373b4b7d716f64c86534475669240afa61d56a2cf18f`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-10](index.html#ENV-10): **present-unverified** — Teleport block type 6 observed; destination storage and traversal unverified.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### Training46

Maps/Game/Map46_Training/46.map; SHA-256 `7dc18eff0cd9f250b7b8f2bf54266031c9bb1fc621bde670e29b7d6ed67e8db0`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

### Training47

Maps/Game/Map47_Training/47.map; SHA-256 `06f7a8ef46fd541f314bc6d33f4d19741cb635ff081019e30d8a511a8047e94f`. Supplied development editor map; not asserted equivalent to OCS/CD32 runtime body.

- [MOV-01](index.html#MOV-01): **present-unverified** — Four editor start triples exist. Start walkability, occupancy and executable startup are separate checks.
- [MOV-03](index.html#MOV-03): **present-unverified** — Stair block/auxiliary types decoded; direction, wet entry and reachability not replayed.
- [ENV-01](index.html#ENV-01): **present-unverified** — Panel bit plus dispatch type 1/2. Types 0/3 and editor used flags do not activate buttons.
- [ENV-02](index.html#ENV-02): **present-unverified** — Floor-present bit plus floor type 1. Descriptor/target validity, entry/release and reachability remain unaudited.
- [ENV-05](index.html#ENV-05): **present-unverified** — Nonzero door position sentinel. Door cell/record binding and reachability remain unaudited.
- [ENV-07](index.html#ENV-07): **present-unverified** — Nonzero lift position sentinel; hydraulic geometry alone is not a moving lift.
- [MOV-05](index.html#MOV-05): **present-unverified** — Pushable flag or push-block type observed; ability to push and required puzzle role unverified.
- [ENV-08](index.html#ENV-08): **present-unverified** — Water presence flag observed; depth, drowning eligibility and navigable routes unverified.
- [LIFE-03](index.html#LIFE-03): **present-unverified** — Water is a candidate for immersion/drowning, not proof that an eligible actor reaches deep water.
- [INV-04](index.html#INV-04): **present-unverified** — Item-layer low byte is nonzero; upper texture/question flags alone do not establish an item.
- [AI-03](index.html#AI-03): **present-unverified** — Auxiliary-present with closed-egg type 0, including zero hatch timer. Hatch outcome/reachability unverified.
- [WORLD-02](index.html#WORLD-02): **present-unverified** — Exit block type 3 observed. Header coordinates alone do not activate completion; approach and outcome not replayed.
- [ENV-03](index.html#ENV-03): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-04](index.html#ENV-04): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [ENV-06](index.html#ENV-06): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [AI-02](index.html#AI-02): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.
- [PSI-01](index.html#PSI-01): **unknown** — Stored button/item/monster metadata alone cannot establish an active call, valid target or required interaction. Dedicated runtime/caller audit needed.

## Maintenance

Edit register.json, reconcile accepted main and evidence, then run `npx tsx tools/build-mechanics-register.ts`. Use `--check` to verify generated files and links. Original inputs remain private. See the HTML method section for acceptance receipt requirements.
