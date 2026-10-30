# Bounded normal-door motion

`transitionDoorMotion` in `src/world/door-motion.ts` is a detached immutable
transition for one explicitly selected normal door. It supplies the immediately
queued taskboard consumer `keyboard-moving-door-integration`. It does not select
runtime doors or change the world, session, checkpoints, renderer or audio.

The behavior is deduced from `Main.s` move_doors (2229–2426),
`Controls&Movement.s` do_button_action and door actions (6748–6771,
7138–7210), `Equates.i` door layout (389–397) and block/variant masks
(588–651), and `ColdStartup.s` timers/xcr_counters (764, 821).
Reset clears door_count in `Controls&Movement.s` around 2797.
No original CPU execution or complete original gameplay parity is claimed.
Private source identities and reproducible evidence stay in `.local/handoff.md`.

## Contract

All inputs are exact plain records with enumerable data descriptors, no extra
keys, accessors, implicit defaults, coercions or arrays. Numbers are integers.
The input has exactly `record`, `target`, `counter`, `action`, `onLift`:

- `record`: `position` is a word offset from map_data1, restricted to aligned
  cells in the existing 10,580-cell map; zero is the inactive sentinel.
  `trigger` is 0..4, `direction` 0..3, `storedType` an unsigned **long**, and
  `delay`, `delayCount`, `key`, `buttonOnly` unsigned storage bytes.
  The source declares door_type as rs.l, despite occasional descriptions as a word.
- `target`: exact `position` matching the record, and unsigned 32-bit `word`.
  The caller supplies an actual snapshot, with no pointer or caller authority
  inferred from labels/hashes. Stored type must have blocking normal type20/21
  and zero variant; all other stored bits are retained and ORed on closure.
  Input word variants are bounded to 0..10; unsupported blocking types stop
  motion as in the source. Arbitrary stored variant bits require a broader contract.
- `counter`: full unsigned 16-bit source door_count **after accumulation**.
  This helper does not increment it. Source xcr_counters increments it by one;
  mapping an accepted simulation tick to that increment is a prototype adaptation.
- `action`: 0 or source button-table action14=open, 15=close, 16=toggle,
  17=lock, 18=unlock. The caller has already selected and authorized this record.
  The action writes the trigger before scheduler evaluation, even for position0.
- `onLift`: explicit source on_a_lift predicate. It affects both sound requests
  and the first variant write following a direction change.

Refusal has `candidate: null`, no partial effects and no input writes. Success
contains the complete frozen detached record/word/counter candidate, scheduler
step count, ordered frozen effects with snapshots, and diagnostics. Effects are
inert metadata: action/delay-count/auto-close/trigger, block or variant changes,
redraw and sample4/5 requests. They do not perform sound, redraw or discovery
writes. Samples retain their source index only; no assets are shipped.
Unchanged raw record bytes and unrelated target bits survive. No mutable input
references are returned. The API accepts no arrays; returned effect arrays are dense.

For example, synthetic `record={position:4,trigger:0,direction:0,
storedType:40962,delay:255,delayCount:0,key:0,buttonOnly:255}`,
`target={position:4,word:40962}`, `counter=7`, `action=14`, `onLift=false`
produces direction1, trigger0, word8429570 and counter1 after one step.

## Source details retained

Counter0..6 returns immediately. Otherwise subtract six as a word; a signed
negative result ends the loop and restores six. Thus 6 does nothing, 7 steps
once/remainder1, 12 steps twice/remainder0. This also reproduces the unusual
32773 boundary (5,462 steps/remainder1) and 32774..65535 (no steps, unchanged).
This is not a modulo-six scheduler. Consumer calls for other records must use
the same starting counter and commit the shared resulting counter only once.
Multiple records or aliased map targets are outside this single-record contract.

Raw delays128..255 disable auto-close. When the block bit is absent, other
delays increment the byte count with wrap and compare **signed** bytes.
Auto-close can overwrite a pending trigger. Open/close triggers are consumed
even when locked; lock waits for stopped, unlock waits for locked. Pending
triggers are not normalized. An already absent opening door retains direction1.

Opening increments variants0..9, then a later step at10 clears only keep_block,
resets delay count and stops. It preserves opacity, variant and every other bit.
Closing an absent block clears its old variant first, then restores storedType
and variant9. Subsequent steps reach0; the following step stops. Closure ORs
storedType exactly and does not invent an opacity flag. Non-door blocking
obstruction stops motion without changing the word. Source onLift branches
skip the newly moving variant write; closure's prior variant clear still occurs.
Full-open/full-closed completion requests sample4 without an extra redraw;
variant writes request redraw, and changed direction requests sample5 unless
onLift. No actor occupancy or original crush semantics are inferred.

## Immediate keyboard consumer

The coordinator has already queued `keyboard-moving-door-integration` directly
after acceptance, as the next sole owner of shared main/world/session/save/UI.
This module does not define a competing save or world interface.

1. Reuse the existing authored gate/patrol/extraction arena and guided setup.
   Leave original Training43 zero-position machinery inactive. Bind one explicit
   synthetic door record and target cell; label the timing adapter as authored.
   Route actual C activation to action14/15/16 as appropriate, with visible
   wait/progress/open/closed/locked state and keyboard hints for the lock test.
2. Accumulate an explicit word counter on accepted world ticks and call the
   transition with the actual target snapshot. Pause/freeze outside this helper.
   Keep collision blocking through variant10 until the erase-block step;
   demonstrate C -> wait -> progress -> open -> traverse -> close -> block,
   reversal, auto-delay and lock/unlock in the same application.
3. Before committing **any** closing candidate, conservatively check every
   actor/NPC current footprint and same-tick destination/reservation. An authored
   occupancy interlock must atomically defer/refuse closure and reconcile counter,
   trigger and queued actions under one deterministic consumer rule. Never commit
   only the word or trust a saved occupancy boolean. Define/replay this adaptation
   explicitly; it is not original obstruction/crush parity.
4. Extend the existing versioned source-bound replay/save lifecycle completely:
   bind source identities and canonical door/target starts, persist/replay
   counter, raw delay/count, trigger/direction/type/key/buttonOnly, target word,
   accepted tick/command order and authored interlock state alongside every
   existing supported field. Hash labels alone are not source-byte verification.
   Validate full state before atomic paused restore; old versions keep doors
   inactive. Reject forged/stale/mismatching recovery without replacing live state.
5. Actual browser acceptance must cover blocked mid-opening traversal, open
   traversal, same-tick actor/NPC closure reservations, vacate/close, pending lock,
   mid-motion paused save/restore, retry/recovery, and existing gate/patrol/
   extraction/inventory/fall regressions. Require independent HIGH review,
   current CI, completed automatic review and resolved findings before release.

Public tests are synthetic arithmetic/bit/branch oracles. `npm run check` is
required for this pure packet. Browser coverage belongs to that concrete consumer;
this packet does not claim a playable moving door yet.
