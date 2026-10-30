# Master Mechanics Register

[Open the HTML index](index.html) · [Text checklist](CHECKLIST.md) · [Canonical data](register.json)

Training43 is the first complete original-level acceptance target, confirmed by Derek on 30 October 2026. Training44–47 supply additional acceptance candidates. No completed original level is claimed.

The register contains original behaviour and source locators, revision, mapping scope, eight separate evidence stages, implementation/test/document links, playable scenarios, remaining gaps and original-level relationships. It is an initial discovery inventory, not a certificate that every source branch has been found. Item categories, enemy-specific behaviours and interactions must be split into further stable IDs as their mapping advances. The 29 identified psi dispatch entries each have their own open row.

The baseline is accepted main through PR118 (`decf689b2803772034bcae150544d1820395dcd5`). The player-only authored pad consumer is accepted; original pad runtime selection and other callers remain open. Date and head describe the gameplay assessment; the register tooling added afterwards does not upgrade gameplay claims.

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
Unsupported wet branches/all-dead/original99-count timeout beyond45000 ticks/general corpse
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
registry proof references. PR112/114/115/116/118 receipts retain exact merge/implementation,
independent review hash, CI and completed automatic IDs. Earlier accepted slices
remain linked to their public proof documents. File presence is not a fresh run.

Validation rejects unknown enum/ID/reference, duplicate/colliding IDs, unsafe paths,
active descriptors, custom prototypes, hidden/symbol/sparse/extra collection fields
and cycles before reading values. New HTML text/attributes use context escaping;
embedded JSON escapes less-than; evidence links accept only existing repository
paths. Synthetic hostile metadata and positive offline canaries exercise the
runtime-accepted boundary. Prior PR113 injection repair remains covered.

This candidate index is for review at port5361 only, clearly UNREVIEWED until
independent review/current CI/automatic gates and coordinator acceptance. The
accepted port5341, older port5311/snapshot/root originals remain frozen. Serve docs with the Vite
**development** server or open the canonical HTML file; production app fallback
does not serve this engineering page.

PR118 accepts [standing wet-region exploration](../training43-wet-region.md): actual keyboard visits to all **22 standing wet CASE cells**, by nonimmune race4 and source-immune race1, four-actor occupancy, dry reverse, first exit, v17 paused recovery and Retry. The 23rd water cell is solid/nonstanding. Visits are replay-derived observations, not movement authority, hypothetical BFS proof or a whole-level percentage. The new corridor same-cell corpse/manual-survivor witness is distinct from PR116 stair aux10 NORTH corpse proof.

Select **Enable wet-region exploration** at fresh PAUSED tick0 in the ready Training43 setup, choose rules, then Start mission; 1–4 select, W/S A/D move, Q/E turn, Esc pause, save/load paused and Retry fresh. V15 entry/return still refuses every non-null requested hit including zero; v16 remains the separate wet damage/lifecycle control. Exact versions1–16 remain supported.

The current wet factory hardcodes ready indices `[11,3,0,5]`, including immune race1. Selected-team wet support and source all-dead remain open; the parallel selected-team/all-dead candidate is UNREVIEWED and receives no credit. General corpse items/replacement, unsupported source geometry/search branches, doors/pads/lifts/enemy AI, original99-count timeout beyond45000 ticks, full43/testbed and source CPU/runtime timing remain open. Physical controller/TV acceptance is separately DEFERRED. Broad T43-04/05/07/08 gates remain partial.

PR118 receiptKind explicitly identifies the SAME completed automatic summary-state6525460623; no separate receipt comment was observed. Earlier separate receipt IDs remain unchanged. Required own DATA shapes precede all new API reads, including receiptKind and the118 union/reviewed tree/source-proof base fields.
