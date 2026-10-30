# Status - 30 October 2026

Accepted gameplay base: PR107, `011cb17e7f5d1683b4a5949fe01d22b8e2798f5f`
(tree `4711a2b2b5d8522e6f697a65fda95a2a1bf410a3`). This includes same-app
keyboard gate/v9 and patrol/v10, ground-cache/v8, selected-team dry-fall/v7,
guided controls, source-bound inventory and isolated gun arithmetic.

Candidate on `codex/training43-patrol-extraction`:
[authored cooperative patrol extraction](docs/training-patrol-mission.md).
One opt-in challenge joins the existing gate, designated F/T target and all-four
extraction. Target defeat unlocks the marked exit. Fixed ten source counts use
6,010 accepted ticks; timeout wins ties. Visible steps/count/status, keyboard
walkthrough and terminal Y Retry make the objective finishable by one person.
V11 rebuilds the complete mission/gate/NPC/inventory/gun chronology from canonical
starts and reverified sources, with unchanged checkpoint 3 and size/history limits.
Legacy practice v9/v10 retain navigation; ground/fall require matching fresh setup.

Implementation check and production browser evidence belong to the ignored worker
handoff. Independent HIGH review of the exact final head, current CI, completed
automatic review and resolved findings remain coordinator release gates. Unmerged.

Training43 and the functional test bed remain incomplete. Original signs and
zero-position doors stay inactive. Original enemy AI/combat/lifecycle, moving doors,
pads, lifts, wet outcomes, general item use, original fall/death/control/corpse
behavior, movement weight effects and full-level acceptance remain open.
Graphics/audio integration and physical-controller/TV testing remain deferred.
Token usage unavailable (not measured).
