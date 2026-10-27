# After-death mouse selection boundary

27 October 2026. One bounded evidence task on accepted base
`4fc901fa8383ac61d9828cac473733fc5e842bfe` (PR30). No implementation or live
installation. The result is **no automatic survivor selection on the inspected
death/mouse path**. Death clears its matching leader but preserves the selected
mouse actor and every device assignment. The smallest identified selection
prerequisite is an explicit mouse button over a view assigned to that mouse while
in game mode. This is not a general automatic team-control transfer rule.

The independent backpack PR31 merged during this observation. Its interfaces and
inventory changes are not inputs to this task. Shared status/completion documents
remain coordinator-owned. Training43 remains incomplete; browser behavior is
unchanged.

## Source deduction and executable binding

The retained OCS executable SHA-256 is
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`.
The unchanged private loader SHA-256 is
`1296dd0ddffdb1819b00dde2ee93243f74373047ae2018909e8fd29d9ca9419d`.
`Main.s`, `Controls&Movement.s`, `Equates.i` and `ColdStartup.s` hashes match
the identities in [live-character-prerequisites.md](live-character-prerequisites.md).
Selected decoded instructions bind the following source boundaries to that
executable; this does not establish whole-build correspondence.

- `Main.s:1146–1172` sets both dead bytes, independently clears matching
  one-based leaders, copies current to old, removes person occupancy and calls
  pad release. The inspected death return has no selected-mouse or control-byte
  write. Existing [fatal TYPE1 evidence](type1-fatal-support-observation.md)
  establishes the same-cell corpse placement and caller return boundary.
- `ColdStartup.s:2241–2311` (`get_sprite_image0`) selects a view from initialized
  mouse coordinates and gadget offsets. It requires target control byte 5 and
  game mode 1 before either nonzero left/right button writes the one-based
  `mouse0_player`. These selection writes precede window/gadget dispatch. There
  is no dead-word check, leader lookup or surviving-roster search in this helper.
  A button level is sufficient here; old-button edge checks concern later gadget
  actions. Selection therefore must not be described as an alive-actor validator.
- `Controls&Movement.s:874–889` (`mouse`) routes a nonzero action low byte only
  to the matching selected one-based actor and then clears the mouse action word.
  It has no dead guard. The later `.check_player_controls` dead-word guard at
  `4562–4568` returns before consuming that dead actor's action or changing old
  position. A selected dead actor can consequently receive an action which this
  later guard does not execute.
- Source caller ordering is separate evidence: `ColdStartup.s:725–750`
  reads mouse hardware before selection and updates sprite hardware afterward;
  `Main.s:263–280` calls falling before scan/swap/follow/control processing.
  `follow_leader` at `Controls&Movement.s:4147–4217` uses existing leader values;
  a zero applicable leader returns without choosing a replacement.

No execution of those surrounding hardware callers, following movement or the
whole game loop is claimed. “First” here identifies the smallest located explicit
selection boundary after death, not its measured first interrupt/tick or cadence.
Device assignment, selected mouse actor and team leader are different state.

## Initialized original CPU execution

One fixed, authored four-record runtime roster is initialized at the executable's
actual actor/stats strides. It is synthetic storage, not imported canonical roster
authority or a proof of map reachability. Slots are zero-based in this document;
the original selection/leader references are one-based.

All four actors initially have control 5, window 0, both dead words zero, party
numbers 0–3 and distinct current references. Mouse 0 selects slot 0; leader 1 is
1 and leader 2 is 0. The target surviving view is slot 1; slots 1–3 have fitness
65535 and remain alive throughout. Initialized view offsets follow the inspected
one-player layout. Coordinates stay private. The target point is within slot 1's
view region but outside every original window-0 gadget rectangle, verified against
the pinned static table. This isolates selection from movement/inventory actions.

Slot 0 enters the real per-player fall helper before eligibility with pending 1,
fitness 654, physique 100, shield 0, gender 0, grunt count 99, both cheats zero,
dry current, immediate inert TYPE1 support and the already observed bounded
lower-cell geometry. The actual zero-damage request still kills fitness 654.
Natural gender/grunt branches avoid audio. Control 5 is deliberately a separate
original CPU observation: the accepted pure TYPE1 API still allows only 1/2/255;
this document does not widen it.

The fatal call returns naturally. Its exact ordered non-stack writes are:

1. Delay word 0; white byte 255; flash byte 254→255; fitness word 654→654.
2. Stats and runtime dead high bytes 0→255, yielding words `0xff00`; leader 1
   word 1→0; old long becomes current.
3. Current first long loses person/owner bits; another long clears auxiliary
   bits; another inserts corpse type 7. Current second long clears corpse-owner
   data, then inserts owner 0 with a separate redundant write.
4. Redraw byte 93→255; pending long 1→0 after actual damage return.

Those are 15 writes. Non-pad release returns before support inspection; death
returns before redraw; decrement and damage return before the pending clear;
the final current-cell reread sees the corpse with dry mask zero before outer
return. Actor/stats/current references are restored at damage return. Current,
pose, control 5, window 0, inventory/weight, environmental counters and other
opaque storage are preserved. The three surviving actor/stats records are
unchanged. Mouse selection stays 1, naming the now-dead slot 0; leaders become
`[0,0]`. Death does not nominate slot 1.

Each decision edge starts from a copy of that actual post-death memory. Only the
explicit button/device/mode inputs below differ; helper registers and an outer
return sentinel are initialized for each direct invocation. These are separate
bounded calls, not an emulated uninterrupted frame.

| Selection invocation over slot 1 | Selected value after natural return | Exact non-stack writes |
| --- | --- | --- |
| No buttons, target control 5, mode 1 | 1, still dead slot 0 | Last-image pointer only |
| Left button nonzero, target control 5, mode 1 | 2, surviving slot 1 | Selection word 1→2; last-image pointer |
| Right button nonzero, target control 5, mode 1 | 2, surviving slot 1 | Selection word 1→2; last-image pointer |
| Left button, target control 1, mode 1 | 1 | Last-image pointer only |
| Left button, target control 5, mode 2 | 1 | Last-image pointer only |

The last-image write stores the same original base sprite pointer on all five
paths; no image bytes or sprite hardware are accessed. All actor control/window/
dead/current/old fields, both leaders, roster records and redraw are preserved by
selection. No gadget action is generated at the chosen point.

For each edge, a separately initialized mouse action word 22 is then passed to
the real routing helper for slots 0,1,2,3 in order. This explicit input is not a
claim that the preceding no-gadget click generated action 22. Exactly the selected
actor receives action byte 22, followed by mouse action word 0; the other three
calls write nothing. Where selection remains 1, the real dead-actor control guard
also returns naturally with no writes, leaving that actor's action 22 intact.
No surviving action dispatcher or world movement is executed.

The observation completes 29 balanced natural returns: one fatal helper, five
selection calls, twenty routing calls and three dead guards. Across them there
are 681 executed instructions, 295 CPU reads, 68 writes including stack, and 32
ordered non-stack writes. Every CPU data read must fall within initialized
fixture storage, original code/static data or the initialized bounded stack.
Every call/RTS return address is checked, with the final stack restored past its
sentinel. The original code is RX and unchanged. Chronological read/write replay
checks every before-value and compares all 8 MiB after each invocation, proving
all other bytes unchanged. No helper is patched, intercepted or forced to return.

## Reproduction, limits and next transition

Private source, executable, coordinates, addresses, bytes, scripts and traces stay
ignored under the isolated worktree's `.local/after-death-control`. The retained
observer, source pins, full initialized memory, exact write assertions, decoded
listing and reproduction command are indexed in its handoff. Fresh reproduction
changes only OUT, preserving the original script identity and loader; existing
output directories intentionally fail rather than overwrite evidence.

Public change: this evidence document only. No new behavior tests or public API
are introduced. Existing public tests use synthetic data. `npm run check` passes
lint, types, 495 tests and build. Browser and local Training43 receipts are
recorded in the private handoff; they establish the unchanged browser boundary,
not original controller or complete-level acceptance.

One smallest next implementable transition is a **disconnected bounded mouse-0
view selection candidate**: with validated initialized four-view layout, current
selection, target control, game mode and button storage, preserve selection or
write the explicit target in the observed order and retain the pointer effect as
an inert record. It must preserve dead/window/control/leader/roster state and must
not infer an automatic living fallback. No implementation starts in this batch.
The existing hardware-input/layout/source binding and live actor/occupancy adapter
remain prerequisites for activation; leader election and following movement need
their own evidence before implementation.

This result covers one mouse, one fixed surviving roster/layout, one fatal actor,
one target view and the five listed decisions. It does not establish all-dead or
retry behavior, mouse-1/controller alternatives, full team installation, arbitrary
window/gadget actions, scheduling or reachability. Source deductions above are
distinct from executed helpers and from public synthetic tests. There are no
stopped/intercepted successes in the authoritative completed run; earlier failed
harness attempts remain private and make no completed-observation claim.

Training43 is incomplete. World/checkpoint 3 and roster-plan 1 are unchanged.
Team/control/occupancy/pad/corpse/wet behavior and source-bound atomic paused
recovery still gate live hazards. Locations revision mismatch blocks campaign;
physical controllers, TV and full-level acceptance remain separate. Held artwork,
galleries/manifests and four presentation dirty paths are preserved; art integration
waits until all designs finish. No live wet/death/inventory, save/schema, renderer,
engine or campaign behavior is installed.

Model: gpt-6.1-sol; token usage unavailable. Initial harness stopped at a missing
decoded TYPE1 continuation range; inspection added the existing source-bound range.
A second attempt rejected an incorrect no-gadget expectation. Reassessment against
the original gadget table identified an actual table gap for the final fixture.
Both failed outputs are retained. The completed run adds exact call/return checks;
independent review must approve the final public commit before coordinator merge.
