# Button / static blocking overlay transition

`transitionButtonBlock` in `src/world/button-door-transition.ts` computes one
immutable panel activation candidate. It does not install map, world, collision,
UI, save, timer or audio behavior. All public examples/tests are synthetic.
Logical parameters, parsed fields, labels and editor `used` metadata do not
authenticate an original map revision. The existing `EditorRecord` representation
is reused read-only via `{ index, fields }`; its `rawHex`, `offset` and `nonzero`
are not inputs or runtime activation predicates. Import/provenance validation
remains the caller's responsibility.

## Source boundary

Private OCS `Controls&Movement.s`: activation/panel table around 6521–6646,
`button_in` / `button_out` around 6667–6735, action dispatch and block actions
around 6744–6931. `Equates.i` supplies word masks and grid dimensions.

- Panel presence and type select dispatch. Type 0/3 are no-ops. Type 1 executes
  **actionOut/dataOut**, then becomes type 2; type 2 executes **actionIn/dataIn**,
  then becomes type 1. Editor `used` is not tested. Each activation executes again;
  there is no invented debounce or held-key state in this function.
- Action 0 does nothing to the target, but still reverses the active panel.
  Its datum is not dereferenced. Supported block actions are 4 on, 5 off, 6 toggle.
- On writes an opaque plain wall and sets the discovery question mark even when
  the wall already exists. Off on an absent block does not write target/discovery;
  off on a wall clears block, opacity and panel fields and marks discovery.
  Other bits survive, including variant bits. Toggle tests block presence.
- `block_off` then examines the **next plane in layer 2** and can clear auxiliary
  metadata there. This packet refuses that required cleanup instead of ignoring
  it. It also refuses an off operation at the final plane: the original safety
  buffer is not a playable cell in the importer. It does not assume that data is
  an item or corpse. The supplied neighbor word must come from the same snapshot.

The selected Training43 initial panels are type-zero signs. Its zero-position
door slots are inactive; stale nonzero records do not activate them. This packet
does not change that classification or turn those records into playable buttons.

Door actions 14–18 in `Controls&Movement.s` write trigger bytes; they do not
immediately remove collision. The bounded inspection of `Main.s` `move_doors`
around 2229–2430 shows the separate six-count scheduler, delay counters,
direction/lock state, variant animation, door type restoration and obstruction
tests. A complete motion adapter needs those explicit timer/door states and a
consistent source actor-occupancy map. They are absent from this contract;
every door action is refused. No generic door movement is invented.

## Authored fixture policy and validation

The fixture domain is a plain static wall or empty target in the existing
23×23×20 grid. Indices are integers, x fastest; active datum must equal the
existing importer map-data origin plus four times target index. This is a
map-structure-relative pointer, not a door-table pointer or a cell index.
All words/data are unsigned 32-bit integers, action/used fields bytes, and button
index 0–31 must match the active panel variant. Input object shapes are exact
plain data objects without accessors. Extra keys, invalid bounds/words, variant
mismatch, aliased panel/target, unsupported actions and dynamic/special targets
return `{ status: 'refused', reason, candidate: null }` before any output commit.
`used` is validated as a retained byte but has no activation authority.

The target cannot carry water, explosion, auxiliary, pushable or panel-presence
flags. Special block types are refused, rather than implementing their broader
effects. Unknown bits outside the operated masks are retained. A pushable panel
is refused because source pushing precedes activation.

`targetOccupied` is a mandatory **authored safety interlock**, not a claim about
the original block-on routine. A closing/on operation is refused when occupied;
opening is allowed. The consumer must compute occupancy across every actor
footprint and pending movement reservation; no corpse or pad behavior is assumed.
No RNG, hidden state, floating arithmetic or clock advancement is used.

## Concrete consumer API and serialized state

```ts
// Synthetic authored button/gate fixture only; never an imported Training43 claim.
const state = {
  panelIndex: 0, panelWord: 524296,
  button: { index: 0, fields: {
    used: 0, actionIn: 4, actionOut: 5, dataIn: 27940, dataOut: 27940,
  } },
  overlay: {
    targetIndex: 1, word: 67, discoveryWord: 0, nextPlaneDiscoveryWord: 0,
  },
};
const result = transitionButtonBlock({ ...state, targetOccupied: false });
if (result.status !== 'refused') {
  // Commit these together, then derive collision/rendering from the committed word.
  const next = { ...state, ...result.candidate };
  // next.panelWord = 1048584; next.overlay.word = 1;
  // next.overlay.discoveryWord = 1024; all other fields retained.
  const serialized = JSON.stringify(next);
  void serialized;
}
```

JSON contains no hidden runtime handles. `targetOccupied` is recomputed from the
current session and must not be trusted from saved data. Freeze protects the
returned result, candidate and overlay; no mutable input objects are shared.
The function validates each activation, but save loading must additionally bind
the selected fixture/map identity, validate every retained field, and check all
saved panel/overlay/neighbor values against replay from the fixture's initial
state. Replaying without an authored command bound or identity is insufficient.

## Immediately queued smallest consumer card

Task board entry: **button-door-keyboard-integration**, already
`immediate-consumer-queued`. Coordinator dispatches it after selected-team dry
fall and the ground-item consumer release sole shared-state ownership. This
packet neither starts a successor nor edits shared modules.

1. In the same four-view app, retain the existing ready-to-play setup and add an
   explicitly labelled **authored button / static gate fixture**. Do not rewrite
   Training43 panel types, `used` flags or door slots. Use an isolated synthetic
   fixture identity and reachable supported floor geometry in the same workflow.
2. Bind one keyboard activation edge to the controlled actor's front-cell panel
   after bounds/facing checks. Reuse the held-key policy from input handling;
   this function is an activation primitive, not a repeat filter. No input when
   paused, loading, terminal or outside the fixture. Keep weapon-use composition
   explicit, since source activation can proceed to item use; this fixture only
   promises panel activation.
3. Snapshot panel, target, target discovery and next-plane discovery from one
   effective world state. Compute all actor occupancy/reservations explicitly.
   Evaluate; atomically commit only accepted candidate to overlay, collision and
   visible gate state. Refusal leaves panel and gate unchanged. Do not mutate
   imported base words or render a gate using a different collision snapshot.
4. Persist fixture identity, initial parameters and bounded activation history
   with supported mutable words in the paused session save. Replay/validate into
   a complete candidate before replacing any state. Older saves load with this
   fixture inactive. Restore while paused, cancel stale async loads on reset,
   preserve current inventory/encounter/fall state, reset fixture on retry.
5. Actual browser acceptance: closed gate blocks walk; keyboard activation opens
   collision; walk through; attempted closure while any actor occupies/reserves
   gate refuses atomically; vacate, close, block again; save open and closed,
   retry, restore each and repeat traversal. Reject tampered parameters/words,
   excessive history, wrong fixture identity and stale loads without partial
   recovery. Check selection/pause and existing ready-to-play regression.

`npm run check` and targeted transition tests validate this pure packet. Browser,
CPU/runtime/hardware parity and playable Training43 machinery are not claimed.
