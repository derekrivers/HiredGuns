# Master Mechanics Register

[Open the HTML index](index.html) · [Text checklist](CHECKLIST.md) · [Canonical data](register.json)

Training43 is the first complete original-level acceptance target, confirmed by Derek on 30 October 2026. Training44–47 supply additional acceptance candidates. No completed original level is claimed.

The register contains original behaviour and source locators, revision, mapping scope, eight separate evidence stages, implementation/test/document links, playable scenarios, remaining gaps and original-level relationships. It is an initial discovery inventory, not a certificate that every source branch has been found. Item categories, enemy-specific behaviours and interactions must be split into further stable IDs as their mapping advances. The 29 identified psi dispatch entries each have their own open row.

The baseline is accepted main through PR112/113/114 (`b211895b0bf4600bc7c8fa830814284c46293c97`). The player-only authored pad consumer is accepted; original pad runtime selection and other callers remain open. Date and head describe the gameplay assessment; the register tooling added afterwards does not upgrade gameplay claims.

Seven inspected older OCS source files are individually SHA-256 pinned in the baseline and HTML method section. This disambiguates the reference beyond the shared 39.26 version string without copying original assembly into the checkout.

## Register completion

The indicator beside the page title measures **register evidence completion**: covered checkpoints / all registered evidence checkpoints. The builder counts every mechanic row × the current eight STAGES (mapping, reference, rules, playable, integration, save/retry recovery, original-level acceptance and physical play). Only a covered state earns one point; partial/open earn zero, with no effort weighting. Exact counts and the calculation are available beside the indicator by keyboard or pointer, and in the generated text checklist.

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

Training43's dry exit route and source-derived wet approach are inherited from `docs/training43-completion.md`. Its wider water region and sign reachability stay unknown. Training44–47 and other maps have not been promoted from static inventory to required-route proof. Runtime/editor differences remain explicit.

## Closing a gate

Each pass needs a reviewed receipt naming mechanic/level, exact original resource digests and revision, accepted build, scenario, expected/observed outcome, commands and pass/fail/skip counts, recovery continuation and reviewer. Physical acceptance additionally needs real hardware and human observations. No such complete original-level receipt exists in this register. Its validator deliberately refuses a new covered original-level/physical claim until receipt validation is designed and reviewed.

T43-01–10 remain partial/open. Controller/TV assignments and the four-person physical run are DEFERRED to separate human acceptance; they do not block keyboard software work. PR112 food/repair is now included as bounded partial evidence; broader immunity/status branches remain open.

The original register tooling added no runtime execution, mechanics, source redistribution, hosting or scheduled work. Token usage unavailable.

PR112 adds accepted bounded equipped food/repair with v14 authored dry-fall replay. PR113 accepts this register tool and PR114 accepts the bounded Training43 interaction CASE. New wet keyboard play is UNREVIEWED and is not credited as a level, hardware or T43-05 pass. Food/repair row stages remain partial for its wider original scope. The covered-stage numerator is unchanged.

Accepted proof packets: [PR112 food/repair](https://github.com/derekrivers/HiredGuns/pull/112), [PR113 register](https://github.com/derekrivers/HiredGuns/pull/113), [PR114 bounded CASE](https://github.com/derekrivers/HiredGuns/pull/114). Normal merge union is the assessed head above. These links are accepted scopes, not new wet-play receipts.
