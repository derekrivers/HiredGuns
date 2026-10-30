# Status - 30 October 2026

Accepted gameplay base: PR106, `da41c93cac5e7fa9f42fec698864622d96ce7fa3`
(tree `97cbd3a845a4147baf660c7c9494a3f84ca1f727`). This includes the same-app
keyboard static gate/v9, ground-cache/v8, selected-team dry-fall/v7, guided controls,
source-bound inventory and isolated gun encounter.

Candidate on `codex/training43-patrol-encounter`:
[authored gate patrol](docs/training-patrol.md). One deterministic target traverses
the existing gate lane, reserves current/next cells, reverses for closed gates or
players, and stops/releases occupancy at zero health. F retains the accepted
nonspatial designated-target policy and source gun arithmetic; T misses. A visible
overhead placeholder shares actual collision cells. V10 rebuilds full world/NPC/
gate/inventory/encounter chronology from canonical starts and verified raw sources.
Legacy v1-v9 and separate ground/fall workflows remain supported.

Implementation checks and production browser evidence belong to the worker handoff.
Independent HIGH review of the final head, current CI, completed automatic review
and resolved findings remain coordinator-owned release gates. Candidate is unmerged.

Training43 and the functional test bed remain incomplete. Original signs and
zero-position doors stay inactive. Original enemy AI/combat/lifecycle, moving doors,
pads, lifts, wet outcomes, general item use, original fall/death/control/corpse
behavior, movement weight effects and full-level acceptance remain open.
Graphics/audio integration and physical-controller/TV testing remain deferred.
Token usage unavailable (not measured).
