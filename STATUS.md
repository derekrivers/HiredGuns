# Status - 30 October 2026

Mechanics coverage is now indexed in the [Master Mechanics Register](docs/mechanics/index.html)
and [text checklist](docs/mechanics/CHECKLIST.md): 86 scoped mechanic/effect rows,
eight independent evidence stages, 47 digest-checked editor-map inventories,
Training43–47 relationships and ten first-level acceptance gates. Training43 is
the user-confirmed first complete original-level target. Static presence never
grants required-route or gameplay acceptance. The gameplay assessment is pinned
through accepted PR111 `46dec166f0604b6cdcbe75c58f3736dc5fd19da9`;
the timed door and player-only authored pad described below are accepted.
Broader original pad callers and complete-level acceptance remain open.
No gameplay, campaign, physical-hardware or complete-level coverage is added
by the register. Regenerate with `npx tsx tools/build-mechanics-register.ts`.

Current accepted gameplay scope follows. PR112 consumable work remains outside this pinned assessment.

Accepted base: PR111 merge `46dec166f0604b6cdcbe75c58f3736dc5fd19da9`
(tree `1e460bd080a8017159f5b8061a0d831a592f657e`), including same-app
timed door/v12, patrol extraction/v11, static gate/v9, ground-cache/v8,
selected-team fall/v7, inventory and designated source gun arithmetic.

Accepted PR111 player-only authored scenario:
[pressure pad / timed door extraction](docs/training-pressure-pad.md).
One canonical player-only pad in the same arena drives the accepted timed door:
step on opens, step off closes; stationary/turn/blocked moves never retrigger.
Raw floor and preceding-plane descriptor bind the direct button IN/OUT actions.
NPCs reserve space without activating. Existing closure interlocks, clock,
gun/objective/exit rules and manual C/buttons remain. V13 rebuilds pad occupancy
and bounded last-action receipts from movement together with all prior state.
Legacy v1-v12 shapes and replay/byte budgets stay unchanged. Actual four-actor
keyboard extraction without C, paused recovery and Y Retry are exercised.

PR111 was accepted after exact-head independent HIGH review, current CI,
completed automatic review and resolved findings; the coordinator retains
its private receipts. This register candidate requires its own review and CI.

Training43 and the functional test bed remain incomplete. Original signs and
zero-position machinery stay inactive. Original enemy AI/combat/lifecycle,
runtime door/pad selection, pushable/death/corpse/wet/fall pad calls, lifts,
general item use and full-level acceptance remain open. No CPU timing or
original runtime pad/animation parity is claimed. Graphics/audio integration
and physical-controller/TV testing remain deferred. Separate human hardware
acceptance does not block keyboard software work. T43-01–10 remain partial/open.
Token usage unavailable (not measured).
