# Training43 supported wet-region exploration — accepted PR118

The existing four-view application has a **wet-region exploration** setup beside
the earlier wet modes. Load the verified local ready-to-play Training43 inputs,
choose **Enable wet-region exploration** at fresh PAUSED tick zero, choose mission rules, then Start mission.
Select slots with 1–4; W/S move forward/back, A/D strafe, Q/E turn and Esc pauses.
Save and restore while paused. Retry reconstructs the complete initial team.
Original map, source files, routes and screenshots remain private ignored inputs.

The display counts distinct wet cells actually occupied during this run. This
is observation of keyboard play, never navigation authority, a suggested route,
or a percentage of original-level completion. Slot 1 is source race 1 and breath
immune; inventory still processes. Slot 4 is race 4 and nonimmune. Injury/death
uses the accepted source arithmetic, bounded corpse search and explicit survivor
selection. First-exit remains available to living actors; cooperative extraction
requires all four actors. There is no automatic survivor selection.

## Geometry and source boundary

The exact original-editor CASE contains 22 candidate standing wet cells and one
solid wet cell. Every standing candidate has depth two over the same inert block
support already admitted by the accepted wet implementation. The corridor needs
no newly invented support, descent, current or gravity rule. The solid cell is
not an entry pose. Actual production keyboard tests traverse the entire standing
corridor, reverse through the original stair, and reach the first exit with
four-actor occupancy enforced. CASE graph routes alone are not gameplay proof.

This mode reuses `stepWetLifecycle` for each complete prospective source tick.
It does not duplicate immersion, item processing, weight, damage, death search,
head installation, movement, mission or scheduler logic. Drowning precedes
scheduled falling and controls. Dry return changes delay only at a scheduled
fall pass. Existing opaque map planes, source masks, old/current body references,
all four living heads, retained dead bodies, corpse owners and explicit control
rules remain authoritative. Unsupported geometry/search/pads/doors/corpse
replacement still refuse the whole prospective candidate before installation.

Relevant inspected source branches are OCS Controls & Movement `move` through
`moved`, Main `player_fall`, and Main `handle_dead`/`find_floor` (including the
actual north redirect). Accepted numerical/source proof is reused unchanged.
Fixed 50 Hz counters and retained display feedback remain declared adapters;
no original CPU, audio, interrupt or hardware timing claim follows.

## Recovery and compatibility

Version **17**, scenario `training43-wet-region-v1`, adds a replay-derived sorted
set of visited wet cells. Recovery rehashes and reparses map, roster and items,
reconstructs the original baseline and complete chronological history, and
compares the entire saved state, including visits. It never installs unchecked
saved leaves. Callers, raw bytes and descriptor-safe state snapshot before the
first asynchronous hash. Main generation ownership covers installation, errors,
loading and feedback across Retry, selection, source clear, new Apply and rules.

All previous versions 1–16 retain their formats and validators. Version 15 still
refuses every non-null damage request, including zero. Version 16 keeps its
existing bounded search and lifecycle semantics. Version 17 retains the same
128 packed events, 257 internal events, 45,000 ticks and **strictly below 24 KiB
UTF-8** limit, with prospective live preflight. Existing depth/work/density,
collection, ordinary-prototype and descriptor constraints remain. This is a
bounded exploration/recovery packet, not an arbitrary-length original session.

## Verification and limits

Public fixtures are synthetic. New counterexamples cover unsupported support,
pad/door/depth/opaque cells, malformed histories, future tick/event/byte budgets,
immutable callers and public descriptor dispatch. Private original tests cover
all standing candidates and reverse travel, source identity, full-state recovery
and tamper rejection. Production tests use actual keyboard input and displayed
ticks, full paused checkpoints before entry, after entry, after an additional
cell, at the far end, around nonfatal injury, after return and at the first exit.
The race-1 run also verifies breath immunity with continued inventory processing.
Retry and asynchronous cancellation/error tests exercise the actual app.

The earlier accepted wet-stair fatal/corpse/survivor evidence remains separate.
An additional production v17 case dies in the corridor cell beyond the stair:
the source derives a corpse at that same cell, the dead body retains its pose,
and an explicitly selected immune survivor enters the owned corpse cell, returns
and exits. Paused recovery covers death, guarded dead input, corpse occupancy,
return and terminal state without repeating effects. This is distinct from the
accepted stair auxiliary redirect and does not broaden general corpse items.
No all-dead original playthrough, full source timeout beyond the replay cap,
general corpse items, broader world interactions, complete original Training43,
complete test bed or physical controller/TV acceptance is inferred. Graphics,
audio production and campaign work remain deferred. PR118 gameplay is accepted at the normal merge below. This new dashboard reconciliation is a separate candidate requiring its own independent HIGH/current CI/automatic/coordinator gates.

## Accepted identity and bounded evidence

Accepted main merge `decf689b2803772034bcae150544d1820395dcd5`, union tree
`d78e3293e6f67e91c6d15c53631bb54f46510224`, parents accepted117 `c8f80d9ff2f362e2e5752badcd2797deba623ca2`
and reviewed118 `b3710c91d980597b1e13905c3afd432a491ff76e`.
Source-proof head is that exact b371 commit, tree `a3b5964dbede6c20c16285c4db8661b3b176c8e4`,
based on accepted116 `db5d2930eb07ef98ddda1d09bb1968efed0f57d3`.
The actual union equals the independently tested predicted union. These are distinct identities.
Independent final report SHA256 `f117875e938d538cec7436be22ba5b2f7e71aa89528b550b38745bd2fe20f848`.
CI runs `41071904326` and `41071757626`; actual automatic `6525460623` completed
on exact b371 with no findings. Registry receipt `6525460623` is that SAME
actual completed summary-state comment; no separate receipt comment was observed.
[Accepted proof metadata](mechanics/index.html#proof-118) preserves this distinction.

Fresh independent proof scope: 57 production definitions (26 region, 2 additional,
29 clean legacy); 99 targeted tests including 5 original-source definitions;
1039 public pass /53 optional skip at source head; 1046 public pass /53 skip in
accepted117+118 union. These counts are separate scopes, not completion rates or
57 original playthroughs. Unchanged accepted116 numerical/source/search authority
is explicitly reused within unchanged blobs; no new CPU/archive study is claimed.

Race4 first hit5200 leaves fitness60335; return/exit fitness37535. Race1 keeps
breath0 and zero damage requests while inventory changes. Full paused recovery
covers before/within/far/injury/dry return/scheduled reset/terminal, plus corridor
before death/death/guarded input/corpse survivor/return/exit terminal and Retry.
All22 standing cells have inert immediate and two-below support66. Each tick
uses the same accepted indivisible `stepWetLifecycle`; no geometry/flag stripping,
teleport, autoroute or authored substitute broadens source physics.

Current ready team is `[11,3,0,5]`; its immune actor prevents an honest all-dead
wet witness. Selected-team/all-dead work remains UNREVIEWED. This accepted narrow
slice adds no broad mechanic covered credit, row denominator or whole-level pass.
Historical failed worker runs remain private and preserved; later clean independent
proof does not relabel them as passing.
