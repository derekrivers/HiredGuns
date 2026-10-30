# Training43 sign view cue

This packet supplies a readable **“Sign ahead (placeholder)”** cue in each of
the existing four view headers. It derives presence from the installed actor's
facing cell and clears on turning away, leaving the approach, invalid/dead/exited
view state, source/team removal, another map and pending asynchronous work.
Paused checkpoint recovery recomputes the cue from the installed pair. There is
no sign command, world write, saved cue, new save version or new renderer.

This addresses the bounded view/readback gap in T43-R08. Both original type-0
panels have source-evidenced dry approaches. This placeholder does **not** render
their original messages. Lettering, its bitmap appearance and visual parity are
deferred presentation work. Required/reachable Training43 software and unknown
branches remain incomplete until their separate registered acceptance gates pass.

## Native predicate and authority

| Reference | SHA-256 | Bounded consumer |
| --- | --- | --- |
| OCS `Controls&Movement.s` | `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15` | `activate` 5290–5322; `activate_it` 6526; panel dispatch 6627–6645 |
| OCS `Drawviews.s` | `1a56a8ac2d3dc503ff9668b0d6bedec70fbd2a9558c0b44889084527ded94277` | `draw_view` 380; `window1` 536–565; `scan_view` 2556; `blit_view` 2646, panel/text branch 2984–3044 |
| OCS `Tables.s` | `8b9c9ba63e704cda0c9fa75de536386b3b4763c44b5a0e143039b72d3c1d785c` | Direction tables 344–422; visibility-removal row 57 at 250–251 |
| OCS `Equates.i` | `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759` | `text_size` 339; `texts` 435; panel/variant masks |
| Development editor map, 157,738 bytes | `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c` | Exact local import only; raw map/coordinates/routes remain private |

The four directional scan tables put the same-floor immediately facing cell in
view slot 57. Its visibility-removal row begins with the terminating sentinel,
so that row does not hide the cell. The drawing loop skips an invisible slot,
requires panel presence, draws the panel and then tests type zero and slot 57.
It selects the five-bit variant and OR-copies its embedded 48×40 two-plane
graphic. Each image occupies 480 bytes; the native allocation has 36 slots and
the encoded variant range is 0–31. No bitmap is decoded, installed, OCRed or
published by this packet. This is a source deduction, not a fresh CPU/display
observation or proof that the current renderer matches native pixels.

The adjacent-cell check in `draw_team` 280–312 separately excludes type-zero
text from its behind-pushable indication. It is not the text rendering caller.
Likewise, type zero has no **button dispatch**, but `.panel_ret` continues to
`use_item`, and `activate` first calls `set_leader`. This packet adds no G/Space
activation, held-item, firing, pushing or leader semantics. Stale button/action,
lift and editor `used` records confer no activation authority. Pushable and
nonzero panel types are conservatively refused by this cue.

## Implementation and consumer scope

`src/sim/training-sign.ts` wraps the unchanged raw importer. Only a raw import
with the pinned digest receives an immutable presentation token. A private weak
map binds that token to the exact returned level object and a copied first-plane
snapshot. A forged digest/token or a cloned level cannot authenticate itself.
The production read checks identity, source, shape/bounds, current facing word
against that snapshot, panel type/variant and actor viewport/lifecycle guards.
It never stores an actor pose or prospective recovery candidate.

`deriveSignCue` is the pure projected predicate used by synthetic public tests.
Its `admitted` field is an explicit caller assertion, **not original provenance**;
production reaches it through `readTrainingSignCue` and raw admission. Main's
existing verified-team lifecycle remains the authority for the current session.
This token does not independently reauthenticate every session field or freeze
all level geometry against arbitrary external JavaScript mutation. Main's actual
imports and installed pairs are the stated trust boundary. Descriptor reads
avoid ordinary getters and inherited optional state; JavaScript proxy traps are
not sandboxed. No new ordinary `wetParty`, `wetRegion` or optional profile read
is introduced in the HUD.

`src/training-sign-panel.ts` owns only four DOM labels. Main refreshes them in
`updateMissionHud`, including normal frame updates, pause/loading changes,
Retry/rules, source clear and source-bound recovery progress. The labels clear
while loading, then reflect whichever complete pair the current generation
installs or retains. The v19 source clock, byte/tuple limits, full replay,
generation cancellation and atomic world/session installation are unchanged.
The directly related limitations text now names the accepted Training43 wet
modes instead of claiming all water is blocked.

## Validation and acceptance

Public tests use synthetic positions/words only. They exercise all directions,
edges, source/admission, actor, dead/exited/control/window, panel types,
pushables, invisibility, variant bounds, malformed words/inputs, getter refusal
and input preservation. Private opt-in binds the real raw map and the T43-04
case; original data and browser downloads/screenshots stay in ignored `.local`.

The browser workflow uses actual setup controls, team selection `[1,3,0,5]`,
Enable original99, Start, 1–4 and WASD/QE. Starting occupancy may require real
keyboard staging of teammates before the selected actor can leave. All routes
are derived through accepted source traversal and each step is checked against
the live display; there are no teleports, fabricated floors, raw flag changes,
forged readiness or product autorouting. Full paused save bytes compare world,
source counters, actor state, inventories, overlays, mission and chronology
before/after repeated HUD queries and normal Load. Loading and cancellation
checks must prove that neither the previous cue nor a future pose leaks.

Fresh results, failures, exact production identity, scoped unchanged-proof reuse
and the complete hash/length manifest are recorded in `.local/handoff.md` for
independent review. The prior real original99 wait and full source recovery are
reused only for unchanged implementation blobs; they are not reported as a new
live wait here. Model: gpt-6.1-sol medium; token usage unavailable. Independent
current-head HIGH review, relevant CI, actual automatic review/findings and the
normal coordinator merge remain required. No acceptance percentage is claimed.
