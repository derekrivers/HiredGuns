# Training43 supported wet-region exploration

The existing four-view application has a **wet-region exploration** setup beside
the earlier wet modes. Load the verified local ready-to-play Training43 inputs,
enable at fresh PAUSED tick zero, choose mission rules, then Start mission.
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
audio production and campaign work remain deferred. Independent final review,
current CI, completed automatic review and coordinator integration still gate
release of this candidate.
