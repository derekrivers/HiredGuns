# Status - 30 October 2026

Accepted base: PR109 merge `48cff7ed7b56e7ec7dfd81784510328297baaa38`
(tree `833a10767f3b2bc92ee65bef3fee9c2e7bf5b4fc`), including accepted
source door helper and same-app static gate/v9, patrol/v10, extraction/v11,
ground-cache/v8, selected-team fall/v7, inventory and designated gun arithmetic.

Candidate on `codex/training43-moving-door`:
[authored timed door / patrol extraction](docs/training-moving-door.md).
One-click canonical mode uses the same arena and challenge, actual C open/close,
wait/progress, full-open traversal, reversal, auto-delay and accessible lock/unlock.
The helper stays unchanged. Authored accepted-tick timing and complete player/NPC
current/destination closure interlock preserve atomic source state. V12 canonical
source-byte-bound replay covers all door/raw counter/pending/interlock fields
alongside the existing world/gun/inventory/mission state. Prior v1–v11 and limits
stay unchanged. Retry and paused recovery reset/restore the whole scenario.

Implementation and browser evidence belong to the ignored worker handoff.
Independent HIGH review at exact final head, current CI, completed automatic
review and resolved findings remain coordinator release gates. Unmerged.

Training43 and the functional test bed remain incomplete. Original signs and
zero-position doors stay inactive. Original enemy AI/combat/lifecycle, runtime door selection,
pads, lifts, wet outcomes, general item use, original fall/death/control/corpse
behavior, movement weight effects and full-level acceptance remain open.
Graphics/audio integration and physical-controller/TV testing remain deferred.
Token usage unavailable (not measured).
