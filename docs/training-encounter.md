# Authored keyboard gun encounter

This candidate adds an authored encounter inside the existing four-view Training43
application, consuming the accepted PR96 gun transition after PR97 inventory
exchange. It requires independent current-head review and integration gates; it
is not accepted Training43 completion.

Open the exact local Training43 editor map and verified OCS Characters/Items,
choose four different actors and Apply. Below the views, choose **Encounter actor**
and **Authored ammo fixture** (full, partial burst or empty), then **Arm authored
encounter** while paused. Start mission and press **F** once to fire. **T** toggles
between an explicitly authored dummy and a miss. **Esc** pauses; **R** while paused
resets/refills only this authored encounter. All selectors/buttons also work with
Tab, arrow keys and Enter. F/T/R ignore repeat and do not run from input/select
fields or with browser shortcut modifiers. F is blocked while paused, loading,
terminal, without graphics, or without an armed encounter.

The panel visibly associates the loadout with one selected team slot/canonical
actor and shows the locally verified gun name, source-derived parameters, ammo,
fire counter, accuracy byte, last action damage, dummy health and shot count.
The loadout is **isolated authored equipment**. It does not claim that the actor
carries this gun or that original team ammo was spent. Source equipment, carried
entries, opaque tails, action bytes, weights and replay remain separate and intact.

## State and policy

`bindVerifiedEncounterGun` rehashes the complete imported Items bytes and derives
the accepted item25 row. The browser never derives authority from saved labels,
IDs, hashes alone or serialized gun rows. `transitionGunShot` commits authored
ammo, counter, accuracy and target damage together. The original full-duration
argument also applies to partial ammo; empty and counter >3 guards remain source
rules. A partial fixture uses min(capacity, duration - 1); a duration-one weapon
cannot offer that fixture. Accuracy is retained source state, not a probability.

Dummy/miss choice, baseline health 100000/physique100/shield0, saturating health,
and cooldown decrement by one per accepted simulation tick are authored policies.
Pause/loading stops accepted ticks. Counter <=3 permits firing, following the
accepted transition even before zero. Blocked/empty actions report zero damage;
shots count only successful discharges. A miss preserves dummy health and spends
ammo. No random draw, invented hit/range test, enemy AI, actor damage/death,
world occupancy or mission mutation is added. The dummy can stay at zero without
changing any actor lifecycle. The diagnostic shooting helper is not used.

## Recovery, reset and bounds

An inactive encounter keeps exact wrapper-v5 export behavior. Active encounters
use exact wrapper v6, with the same three source identities, ordered team indices,
bounded inventory log and unchanged checkpoint-v3 world plus a distinct authored
snapshot. It includes version/profile, team slot/canonical actor, fixture,
complete baseline/equipped entries, target mode and retained dummy health,
physique/shield, counter/accuracy, last action damage/status and shot count.
All required fields and nested exact keys are validated, integer domains bounded,
baseline regenerated from the reverified gun and actor association checked against
the saved ordered team. This is validated authored state, not original authority
or an assertion that an edited snapshot proves an original shot history.

Recovery rebuilds inventory only from source initialization and typed command
replay. It rebinds the gun from raw local bytes, validates the complete encounter
and world, then exposes one candidate. The browser generation guard installs all
parts together only while current. Invalid saves preserve old session/world
apart from pausing; source replacement/clear intentionally removes the active
session immediately, and stale completions cannot resurrect it. Selection, Retry,
rules, new Apply and map changes retain prior cancellation behavior. Inventory
commands preserve the encounter snapshot across their asynchronous reconstruction.

R restores the selected authored fixture, association and current target mode;
it never changes source inventory. Retry/rule restart also restore this authored
baseline alongside the existing source-inventory initialization reset. New Apply
starts inactive. Source/map replacement clears the encounter with the session.
Exact legacy v1–v5 saves initialize it inactive and retain each prior command
schema. No serialized source inventory is introduced. No log is truncated.
The session remains <24 KiB; nested checkpoints remain <16 KiB. No world schema
expansion. Authored shot count is an unsigned 32-bit bound; reset is required
when exhausted.

Public tests use synthetic rows only. Positive source-bound unit/browser checks
are opt-in through HIRED_GUNS_TRAINING_MAP, HIRED_GUNS_CHARACTERS and
HIRED_GUNS_ITEMS. Original inputs, screenshots, traces and local scripts stay
ignored. Use a strict local 5209 browser configuration for this worktree; do not
reuse the frozen or live coordinator previews.
