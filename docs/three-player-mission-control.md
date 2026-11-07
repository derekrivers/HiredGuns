# PROD-03 synthetic three-player mission control candidate

Issue: https://github.com/derekrivers/HiredGuns/issues/141

This candidate exposes **Synthetic three-player mission** in the existing
four-view app. Slots 1–3 use their separate keyboard groups; slot 4 is explicitly
inactive (`control=0`) with no input assignment. Assignments are fixed in this
bounded profile. `Unassigned` in ordinary navigation still has its existing
meaning and does not create inactive mission participants.

The fixture has an exit one forward step from each start. Sidestepping exercises
movement without ending the mission. No exit continues; the first active exit
wins, with lowest actor ID winning simultaneous exits. Three active dead words
fail the mission even while the inactive fourth actor remains biologically alive.
Source bookkeeping counts control zero in both inside/dead counters; it does not
set biological death. Priority remains all-dead, then timeout, then exit. The
two-count source clock expires at tick 1202. Terminal input does not advance time
or history.

The labelled synthetic death button injects dead words for slots 1–3 in one
simulation tick. This is an outcome oracle, not native injury or corpse creation.
The inactive body retains position, facing and occupancy. No inventory, corpse,
leader or other Training43 lifecycle fields are introduced or changed. The
shared selected-party mission resolver still defaults to four control1 actors;
only this synthetic caller supplies `[1,1,1,0]`.

Only that exact ordered profile is admitted. Invalid profile setup, inactive-slot
commands (including mixed batches), and inactive synthetic death requests throw
before any session, world, mission or history write. Setup and stepping are pure
transactions; they do not touch the input router. The app fixes router assignments
before running and refuses assignment changes in this profile. Snapshot/import
validation compares the complete reconstructed profile, world and history.

Save checkpoint / Load checkpoint use the dedicated
`synthetic-three-assigned-v1` envelope. Open this fixture before loading its save.
History is run-length encoded and bounded to the 1202-tick mission and a save
smaller than 24 KiB; a prospective over-budget transaction is refused before
commit. Retry reconstructs the same 3+1 profile, original positions, live dead
words and empty history. Other scenario buttons leave this profile and restore
the ordinary four keyboard assignments.

Validation is deliberately limited to the focused package. Deterministic cases
live in `tests/mission.test.ts`; same-app synthetic cases live in
`tests/browser/three-player-mission-control.spec.ts`, including Save/Load and Retry.
The implementation writer does not execute browser tests: QA owns the reserved
browser slot and independent exact-head review. Full repository checks, CI and
acceptance remain coordinator/QA gates.

No current T43-R05 reachability, Training43 whole-level acceptance, native runtime
parity, cooperative completion, auto-survivor behavior, other player modes,
original content, publication or production schedule change is claimed.

Implementation attempt 1. Requested model/reasoning: gpt-6.1-sol / medium.
Actual runtime model/reasoning and measured token usage are unavailable.
Base commit: `fcb526b92c51b93429dbb884ce4188d8103de983`.
Verified base tree: `f3c582058c51d0653e40db9fae5b6305d7f2e37d`.
Isolated checkout: task-specific candidate worktree.
Branch: `codex/prod03-three-player-mission-control`.
Initial verification PowerShell process exited normally.
No server, browser, reviewer or successor worker was started by this attempt.

Local checks (all from the isolated checkout; exit 0):

- `npm exec -- vitest run tests/mission.test.ts tests/mission-profile.test.ts tests/training-wet-party.test.ts tests/training-timeout.test.ts`
  — 4 files passed, 63 tests passed, 7 skipped (private-source cases).
- `npm exec -- eslint src/main.ts src/sim/mission.ts src/sim/mission-profile.ts src/sim/three-player-mission.ts tests/mission.test.ts tests/browser/three-player-mission-control.spec.ts`
  — no diagnostics.
- `npm run typecheck` — `tsc --noEmit`, no diagnostics.
- `git diff --check` — no whitespace errors.

Browser tests were authored and typechecked but deliberately not executed.
No full `npm run check` was run under this package's explicit focused-check limit.
Gameplay must provide QA the fresh candidate commit/tree, obtain the separately
reserved review and browser results, and apply the normal protected merge gates.
This writer did not merge, push, open a successor chat or claim acceptance.
