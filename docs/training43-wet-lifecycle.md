# Training43 wet damage and lifecycle extension — accepted PR116

Accepted merge `db5d2930eb07ef98ddda1d09bb1968efed0f57d3`, reviewed implementation
`2c1178d68ad887c218f2bc3975bba7b6024d032f`, tree
`9fc72ab7680fed7105094b79be737b77b0348a34`. Exact final independent HIGH,
current CI and completed automatic review were verified by the coordinator
before normal expected-head merge. Bounded injury/death/north corpse/head
ownership/dead input guard/explicit manual survivor/freed-body and corpse walk/
first exit/v16 paused recovery and Retry are accepted. T43-04/05/06/07/08 remain
partial; the original level and functional testbed are incomplete. Wider water,
all-dead, original99-count timeout beyond45000 ticks/general corpse items and
door/pad callers remain open; physical controller/TV acceptance stays deferred.
Legacy [entry/return and v15 recovery](training43-wet-traversal.md) retain their
separate non-null damage refusal boundary, including zero.

## Same-app controls

Load the ready-to-play Training43 test using the local opt-in provider, or import
the matching raw editor map, OCS roster and items and apply `[11,3,0,5]`.
At fresh paused tick zero, choose **Enable wet damage and lifecycle**. Then Start
mission. Select 4 and navigate the existing dry approach with W/S/A/D and Q/E;
remain on supported water to observe injury and an actual fatal transition.
The application never drives a route or teleports a character. Esc pauses.
Exact source routes, cells, screenshots and traces stay private under `.local`.

The existing four views remain, with placeholders and readable fitness/dead-word,
damage request, corpse ownership and living-actor feedback. Death retains the
selected view and keyboard assignment. Its controls are guarded. Press 1–4 to
select a living actor explicitly; selection, source control method and the two
leader references are distinct. No automatic survivor selection is inferred from
the [after-death observation](after-death-control-observation.md).
Input-device assignments retain the existing local UI policy and are not saved.

Inventory displays the same committed inventory/weight as the live wet body.
Changing equipment, item transfer and corpse-item recovery remain unavailable.
Retry reconstructs every mutable field, including health, feedback, both dead
words, leaders, heads, corpse planes, counters, history and mission. Rule changes
also restart the full state. Clear sources leaves a fresh static proving ground.

## Source arithmetic and caller order

This consumes the accepted immutable [immersion](immersion-caller-contract.md),
[water inventory](water-inventory-contract.md),
[drowning decision](drowning-decision-contract.md), source team initializer and
`computeNormalDamage`. The conservative ordinary-floor damage/death validators
remain unchanged; no supporting block or wet stair is passed to them as a
fabricated ordinary floor. The new full-map companion owns geometry/lifecycle
validation independently of the numerical core.

Race4 is NONIMMUNE. Race1 or spell97 breath immunity follows inventory processing;
spell100 bypasses inventory only. The live adapter initializes spells to zero and
does not author spell changes. Every source non-null request, including zero,
passes through normal unsigned hit/physique/shield arithmetic. Exact shield87,
DIVU overflow fallback and low-word multiplication retain their accepted limits.
Overdamage invokes death before subtraction and preserves fitness. Otherwise the
subtraction happens first and fitness below655 invokes death. Thus zero damage
can kill at654 while655 survives; dead fitness need not be zero.

One fixed step increments the scheduler words once. Signed drowning>=50 resets
before its complete party-order caller; unsigned falling>6 then subtracts6 once,
before controls and existing mission resolution. Inventory, breath, fitness,
fatal continuation and all four actors install in one transaction. A newly dead
actor skips the later fall/control callers, retaining its underwater count, delay,
pending value and inventory as the source guards require. Dry delay changes only
at a scheduled fall pass. Unsupported pending/descent/spell/control branches
refuse the complete candidate. No newly dead head is reinserted.

Physique, initialized fitness and complete equipment/30 carried/10 action entries
come from the verified source initializer; race comes from the parsed roster.
Both dead words, leaders, control1/window0, shield/cheats, feedback and grunt0
initialization are declared importer adapter choices. Damage sets fireWhite255
and adds `((damage>>>9)+1)` modulo256 to fitnessFlashDuration. Redraw intent is
retained. **Feedback is retained adapter storage:** no original interrupt, sound
or drawing scheduler is installed. Grunt_count remains0, so the inspected signed
grunt>=100 branch is excluded, rather than dropping its required counter clear.
Fitness flashes, drowning indicators and white-head variants are visible state,
not an original animation/sound claim. These counter/display choices do not
change the admitted normal damage arithmetic or its fatal trigger.

The explicit expandedAudioMemory0 adapter takes `play_ex_sfx`'s immediate
return (`Main.s:835–848`). Thus the female sample6 call through the
register-preserving `PLAY_EX_SAMPLE` macro (`Miscroutines.s:2521–2531`) has no
skipped health, map or mixer write on this branch. No playback is installed or
claimed. Nonzero audio-memory bindings refuse. Existing source/CPU receipts retain
their original bounded scope; no CPU, hardware or wall-clock parity is claimed.

## Fatal geometry and ownership

Pinned OCS `Main.s:1146–1317` orders both big-endian dead-byte writes (zero words
become0xff00), matching-leader clears, old=current, person erasure and the
post-erasure pad-release check before find_floor. The admitted wet pose has no
active pressure pad. Its support and aux10 cause a **north** search redirect.
The derived corpse target differs from the retained body/current reference.
The implementation never moves the actor to the skeleton.

The bounded search reads the complete prospective three-plane map. Below-block
stairs16–19 take precedence over the current floor and redirect south/west/north/
east. Support types0–6 or a floor find a floor; missing support searches downward.
Aux8/9/10/11 redirect south/west/north/east. A solid redirected block0–6 returns
the source no-skeleton outcome. Door12/13 fallback is explicitly **uncomposed and
refused**; no alternate corpse target is guessed. Cycles, out-of-map reads,
more than64 search iterations, unknown/pad floors, occupied final targets and
auxiliary/corpse replacement refuse before any partial candidate is exposed.

Person erasure uses source mask0xf07e07fd. Corpse installation changes only
aux presence/type to7 and second-plane owner bits12–19; other packed bits and
the third plane remain intact. Head arrival retains the existing third-plane
bit29 clearing. Sparse first/third-plane and second-plane overlays are derived
from history, never accepted as saved authority. All four bodies, owned heads,
corpse owners and both leaders are checked together.

Departures and new retirements clear before active head writes, across ID order.
Already dead/retired retained poses confer no head ownership. A living actor may
enter the freed body cell and the actual owned inert corpse cell without erasing
the corpse or treating it as a living occupant. Aux7 is non-solid in the bounded
source movement branch; corpse inventory transfer remains absent. Replacement
by a later death is refused rather than silently losing an earlier owner.

Original first-exit remains available to living actors. The labelled cooperative
variant still requires all four extractions; a dead actor does not count as
extracted and therefore prevents that goal. Timeout and Retry retain their
existing meaning. No all-dead wet playthrough is claimed: this ready team has a
breath-immune race1 actor. Wider water geometry, general corpse replacement,
doors/pads/lifts/enemies/items and original all-dead mission policy remain open.

## Recovery and verification

V16 is a distinct canonical wrapper. V1–v15 retain their validators/semantics;
v15 still refuses any non-null damage request, including zero. Raw source bytes,
map, rules, history and all caller state are synchronously descriptor-snapshotted
before the first await. Every recovery rehashes/reparses map+roster+items,
rebuilds the source baseline, and chronologically derives full-party health,
both dead words, all planes, heads, corpse search/owner, leaders, control,
inventory/actions/weight, counters and mission state. Saved leaves only compare.
Restore is PAUSED, without duplicate damage, item passes, corpse writes or pad
effects. Main generation owns success/error/finally/loading and panel feedback
across Retry, source clear, selection, Apply, rule and mode changes.

Limits remain128 dense events,45000 ticks, strictly below24576 UTF-8
save bytes, snapshot depth24/50000 visits/32000 entries/65536 string units and
1000000 aggregate string/key units. Future history and exact serialized size
are checked before exposing a candidate. Getter/unknown/prototype/sparse/cycle
and shared-DAG work checks remain. Ordinary reflection and proxy traps retain
the documented non-sandbox limit. Budgets do not promise a full mission duration.

V16 command events contain `idle`, `count` and `commands`: the idle run executes
first, then the exact command run. One trailing idle-only record has count0.
This avoids charging separate command and idle events for every keyboard move;
an internal expanded representation is capped at257 segments before traversal.
Saved compact events are descriptor-validated and expanded before replay, with
the same45000 total-tick bound checked before any loop. V15's128-segment RLE
gate and old checkpoints are unchanged. Arbitrary old v16 candidate leaves are
not migrated or normalized into source authority.

Public tests contain synthetic data only: independent ordinary-floor numerical
comparison, 654/655, zero/equality/overdamage, unsigned overflow, directional
support/search/no-skeleton/refusal cases, full-party ordering, body/head/corpse
ownership and atomic rejection. Private source checks bind the actual approach,
first nonfatal request, fatal continuation and north search, full inventory and
source masks. Production browser checks use real keys, paused saves before
damage/after injury/after death/after survivor movement/terminal, continued play,
Retry and tampered source/history/health/dead/head/corpse/owner/search/counters/
mission rejection. Async ownership checks cover both stale success and errors.
Exact fresh commands/results, failures and hashes are in `.local/handoff.md`.

Required commands: `npm run check`,
`npx tsx tools/build-mechanics-register.ts --check`, private opt-in relevant unit
tests and production Playwright lifecycle plus accepted115 wet regressions.
Register assessment is reconciled through **accepted PR116**, with narrow scope
and broader families/whole-level gates still partial/open. Global evidence68/688 remains
dynamic register evidence, not game/effort/test completion. Model requested:
gpt-6.1-sol medium; tokens unavailable, no delegation or model escalation.
