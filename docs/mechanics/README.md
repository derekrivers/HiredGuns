# Master Mechanics Register

[Open the HTML index](index.html) · [Text checklist](CHECKLIST.md) · [Canonical data](register.json)

Training43 is the first complete original-level acceptance target, confirmed by Derek on 30 October 2026. Training44–47 supply additional acceptance candidates. No completed original level is claimed.

The register contains original behaviour and source locators, revision, mapping scope, eight separate evidence stages, implementation/test/document links, playable scenarios, remaining gaps and original-level relationships. It is an initial discovery inventory, not a certificate that every source branch has been found. Item categories, enemy-specific behaviours and interactions must be split into further stable IDs as their mapping advances. The 29 identified psi dispatch entries each have their own open row.

The baseline is accepted main through PR122 (`81353ad52118875195c925d668cc469ad72d106e`). The player-only authored pad consumer is accepted; original pad runtime selection and other callers remain open. Date and head describe the gameplay assessment; the register tooling added afterwards does not upgrade gameplay claims.

Seven inspected older OCS source files are individually SHA-256 pinned in the baseline and HTML method section. This disambiguates the reference beyond the shared 39.26 version string without copying original assembly into the checkout.

## Whole-game evidence coverage

The indicator beside the page title measures **whole-game evidence coverage**: covered checkpoints / all registered evidence checkpoints. The builder counts every mechanic row × the current eight STAGES (mapping, reference, rules, playable, integration, save/retry recovery, original-level acceptance and physical play). Only a covered state earns one point; partial/open earn zero, with no effort weighting. Exact counts and the calculation are available beside the indicator by keyboard or pointer, and in the generated text checklist.

The total is global: search, family, mapping and level filters only change visible lists. Empty registers display 0.0%; 100.0% requires every checkpoint covered. One-decimal rounding is capped at 99.9% until then. Adding rows or stages changes the denominator automatically. This measures neither game/parity completion, effort nor test-pass rates. The complete original-level acceptance count stays separate, and reviewed-receipt validation still gates original-level/physical claims.

## Open and maintain

The HTML is self-contained and works as a local file, including search, filters, deep links and JSON export. For the existing Vite development server, use `http://127.0.0.1:5173/docs/mechanics/index.html`. Relative links open repository documents, tests and code. This engineering index is not part of the production game build and changes no gameplay.

Edit `register.json`, then run from the repository:

```text
npx tsx tools/build-mechanics-register.ts
npx tsx tools/build-mechanics-register.ts --check
```

The builder verifies IDs, stages, level/scenario references and existence of every evidence link. It generates `index.html` and `CHECKLIST.md`; their freshness is checked in the automated suite. There is no automatic polling or automatic upgrade from source presence or passing CI. Links to tests are not test-run receipts.

Runtime validation also enforces scenario kinds (`original`, `authored`, `diagnostic`), level groups (`training`, `campaign`, `action`) and stable IDs: lowercase hyphen-separated scenario names, `map-` plus a positive decimal level number, uppercase mechanic prefixes plus two digits, and uppercase alphanumeric acceptance prefixes plus two digits. IDs must be unique within each collection and across the rendered document, including fixed controls. TypeScript types alone do not validate edited JSON. Prose may contain quotes or markup-like text: the HTML renderer encodes all dynamic text and quoted attributes, and separately encodes embedded JSON so it cannot end its script element. Public offline browser canaries exercise both refused metadata and accepted prose. These checks protect this static maintenance/rendering boundary; they add no gameplay acceptance or live JSON-import feature. Markdown remains a generated engineering document; review prose and links before publishing through any other renderer.

Run `npm run check` and `npx playwright test tests/browser/mechanics-register.spec.ts` after changes. The tests validate the traceability graph, stale generated output, misleading coverage claims, synthetic static inventory predicates and actual browser navigation/search/export. No originals are needed for those tests.

## Original-level inventory

The initial pass rehashed all 47 supplied editor map files against the existing private catalogue and used the existing importer plus selected source flag/sentinel rules. It produced ignored `.local/mechanics-register/editor-inventory.json`. Only summarized classifications and file identities appear in the public register; no map cells, coordinates, routes, raw assembly or traces are embedded.

Repeat to a new private filename:

```text
npx tsx tools/audit-mechanics-levels.ts <private-archive-root> <private-catalogue.json> .local/mechanics-register/new-inventory.json
```

The catalogue is the existing `research/evidence/campaign-catalogue.json`, outside the checkout. The archive root contains `Maps/Game/`. Inspect differences, then reconcile the canonical register manually. The tool does not change the register or grant gameplay acceptance.

- **Required / reachable optional:** existing Training43 level-specific audit, within its stated limits.
- **Present unverified:** flags/sentinels identify a source candidate; runtime activation, targets, reachability and puzzle necessity are unverified.
- **Inactive:** absent under the stated initial editor predicate; does not mean impossible after spawning/mutation.
- **Unknown:** the inventory cannot settle the relationship.

Training43's dry exit route and PR115 accepted supported wet entry/return are inherited from `docs/training43-completion.md`. PR118 now proves actual visits to all22 standing wet cells; the solid nonstanding cell and broader outcomes remain open. Training44–47 and other maps have not been promoted from static inventory to required-route proof. Runtime/editor differences remain explicit.

## Closing a gate

Each pass needs a reviewed receipt naming mechanic/level, exact original resource digests and revision, accepted build, scenario, expected/observed outcome, commands and pass/fail/skip counts, recovery continuation and reviewer. Physical acceptance additionally needs real hardware and human observations. No such complete original-level receipt exists in this register. Its validator deliberately refuses a new covered original-level/physical claim until receipt validation is designed and reviewed.

T43-01–10 remain partial/open; T43-05/06 now partial for bounded PR116 proof. Controller/TV assignments and the four-person physical run are DEFERRED to separate human acceptance; they do not block keyboard software work. PR112 food/repair is now included as bounded partial evidence; broader immunity/status branches remain open.

The original register tooling added no runtime execution, mechanics, source redistribution, hosting or scheduled work. Token usage unavailable.

PR112 accepts bounded food/repair; PR114 accepts source CASE classifications;
PR115 accepts supported wet entry/return and v15 recovery. PR116 separately accepts bounded wet injury/death/north corpse/head/control/manual
survivor/first-exit/v16 recovery and Retry. Legacy v15 still refuses requested hits.
Unsupported wet branches/general corpse
items/door-pad callers and whole-level acceptance remain open. The covered numerator is
unchanged; newly supported broad wet rows remain partial.

## Milestone scopes and validation

Canonical `dashboards` contain separate current playable testbed and Training43
software milestone lists. Counts/statuses describe only those explicit lists;
there is no defensible fixed capability denominator or effort percentage.
The earlier roughly 60% was a subjective estimate of a smaller authored testbed.
The whole-game denominator stays the mechanics rows × stages; adding narrow
milestones never changes it. Adding/splitting broad mechanic rows must explicitly
explain the denominator change. Compound acceptance gates remain partial/open.
Hardware is deferred separately and does not block keyboard software work.

Each milestone has stable ID, strict status, scoped evidence, missing dependency,
scenario/controls, lineage to existing mechanics/checklist and optional accepted
registry proof references. PR112/114/115/116/118/120/122 receipts retain exact merge/implementation,
independent review hash, CI and completed automatic IDs. Earlier accepted slices
remain linked to their public proof documents. File presence is not a fresh run.

Validation rejects unknown enum/ID/reference, duplicate/colliding IDs, unsafe paths,
active descriptors, custom prototypes, hidden/symbol/sparse/extra collection fields
and cycles before reading values. New HTML text/attributes use context escaping;
embedded JSON escapes less-than; evidence links accept only existing repository
paths. Synthetic hostile metadata and positive offline canaries exercise the
runtime-accepted boundary. Prior PR113 injection repair remains covered.

This metadata candidate remains UNREVIEWED until its own independent HIGH/current CI/actual automatic/findings/normal-merge gates. Candidate verification uses5401; reviewer5403 is reserved. Released register5385 is forever frozen at accepted121 and assesses120. Released keyboard5391 is frozen at7540/merge81353. No new index is published or opened by this worker.

PR118 accepts [standing wet-region exploration](../training43-wet-region.md): actual keyboard visits to all **22 standing wet CASE cells**, by nonimmune race4 and source-immune race1, four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. The 23rd water cell is solid/nonstanding. Visits are replay-derived observations, not movement authority, hypothetical BFS proof or a whole-level percentage. The new corridor same-cell corpse/manual-survivor witness is distinct from PR116 stair aux10 NORTH corpse proof.

Select **Enable wet-region exploration** at fresh PAUSED tick0 in the ready Training43 setup, choose rules, then Start mission; 1–4 select, W/S A/D move, Q/E turn, Esc pause, save/load paused and Retry fresh. V15 entry/return still refuses every non-null requested hit including zero; v16 remains the separate wet damage/lifecycle control. Exact versions1–16 remain supported.

Accepted PR120 selected raw team [1,3,0,5], races [0,0,3,4], real keyboard four distinct wet deaths at ticks2050/4850/8050/10550, source all-dead before timeout/exit with positive clock82, both dead words0xff00, retained positive fitness, explicit manual selection, full v18 paused recovery and Retry. No auto-selection or forged ready team.

Accepted PR122 proves the admitted original99 timeout at59499 total ticks, full source-bound v19 paused recovery at59498/59499, terminal freeze, complete Retry/both action rules and responsive generation cancellation. The8ms yield target is not a universal bound; full recovery remains costly. General corpse items/replacement and unsupported geometry/search/source modes remain unsupported or unknown, requiring reachable evidence before closure. Whole Training43 software acceptance and runtime CPU parity remain open. Assets, sprites, sound, polish and physical controller/TV acceptance are separately DEFERRED, not software gates. Broad T43-04/05/07/08 gates remain partial.

PR118 receiptKind explicitly identifies the SAME completed automatic summary-state6525460623; no separate receipt comment was observed. Earlier separate receipt IDs remain unchanged. Required own DATA shapes precede all new API reads, including receiptKind and the118 union/reviewed tree/source-proof base fields.

PR120 requires own tree/reviewedTree/sourceProofBase data fields before all three APIs read them; PR118 retains its summary-state receipt rule, while PR120 has a separate actual receipt6531111769. No receipt kind is relaxed. The [required/reachable function and behavior register](../training43-completion.md#requiredreachable-training43-software-register) controls Training43 software dependencies.


PR122 accepts [original99 timeout and full responsive v19 recovery](../training43-source-timeout-recovery.md), recorded as one new milestone per growing list. Its actual accepted union07126, reviewed source tree6f287 and source-proof base accepted1209c11 remain distinct. Proof122 requires own tree/reviewedTree/sourceProofBase and receiptKind data before all three public APIs read them; separate receipt6534702086 remains distinct from actual completed exact7540 automatic6533377523. PR118 retains its same-summary receipt rule. Accepted121 metadata mergead0/head3b3/tree72c remains preserved and assesses120 only.

The22 standing cells and accepted120 all-dead outcome remain bounded inherited proof. R08 sign rendering/readability stays UNKNOWN/OPEN: a type0 button nop is followed by use_item, and does not establish whole activation nop. Whole Training43 software remains incomplete. All86×8 stage states remain68 covered/129 partial/491 open,9.9%; the testbed11/software10 chosen lists are not fixed completion denominators. Legacy1–18 caps/bytes and replay responsiveness scope remain unchanged. The8ms yield target is not a universal bound; full recovery remains costly.
