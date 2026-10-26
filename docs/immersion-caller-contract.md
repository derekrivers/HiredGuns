# Disconnected pure immersion caller

26 October 2026. `src/character/immersion-caller.ts` exports synchronous pure
`transitionImmersion(input)`, one invocation of the OCS `drown` helper. It composes
the existing [water inventory](water-inventory-contract.md) and
[drowning decision](drowning-decision-contract.md) transitions. It does not run
the outer timer or four-player scheduler, install actors, admit wet movement,
dispatch damage/death, draw feedback or change world/checkpoint schemas.

The exact input fields are `actor`, `cellLong` and `items`. The actor has exactly
`statsDeadWord`, `windowType`, `controlMethod`, `race`, `physique`, `fitness`,
`spellWater`, `spellWings`, `underwaterCount`, `drowningIndicator`, `inventory`
and `weight`. Control and race are unsigned bytes; the other numeric actor
fields are unsigned words. Zero physique/fitness are accepted. `cellLong` is an
unsigned 32-bit packed cell value; its correspondence to an actor's map position
is the caller's responsibility. All unrelated bits are retained in the result.
No map ownership or original-source authority is granted.

Inventory and the authored parsed item catalog use the existing water-inventory
contract, including all thirty carried and ten action entries, exact slot fields,
preserved opaque bytes and item-definition validation. The existing weight has
exactly `totalWeight` (unsigned long), `quotient` (unsigned word), `tooHeavy`
(boolean) and `usingGrenade` (0 or 2). It is previously stored state, not a claim
that weight was freshly computed from this inventory. Unvisited/skipped branches
retain all four values. No redraw flags or heavy timers are invented.

All fields, catalog definitions and slot references validate even on an inactive
branch. Missing, extra (including symbol/nonenumerable), inherited-only, malformed
and unsupported fields reject. Exact known nonenumerable fields are accepted and
copied. This universal validation is a stricter API boundary than the original
helper's early return. It does **not** run weight arithmetic on an unvisited or
spell-100-protected branch. A potential quotient overflow in those inventories
is accepted; an actual unprotected scan's unavailable weight rejects atomically,
even if a later race/spell breath branch would reset the counter. No partial
candidate is exposed on failure and no input object is mutated.

The ordered result is:

1. A nonzero **full stats dead word**, window word exactly 7, or control byte
   zero returns `status: "ineligible"`. Inventory and weight are copied unchanged;
   underwater count and drowning indicator are preserved. This includes a dry
   cell: these guards precede the breath reset. Any nonzero stats dead word is a
   source guard, not a canonical lifecycle declaration. Runtime dead storage is
   absent from this slice because this helper does not inspect it. The separate
   death transition's canonical paired-word contract remains unchanged.
2. Otherwise, missing presence bit 2 or depth below 2 returns `status: "breath"`
   and resets only underwater count. Source `keep_water` is `0x00060004` and
   `water_shift` is 17; the masked long rotated left 15 compares its low word,
   equivalent here to `(cellLong >>> 17) & 3` after the presence check. Presence
   and depth are independent, and other packed bits cannot establish immersion.
3. Qualifying water processes equipment plus carried indices 0..15 and recomputes
   supported full-inventory weight. Spell-water exactly 100 skips both operations
   and retains existing weight. The independent candidate preserves carried tail,
   actions and opaque entry bytes according to the inventory helper's contract.
4. After inventory, race byte exactly 1 or spell-water word exactly 97 returns
   `status: "breath"`, clearing only underwater count. Inventory damage and weight
   changes already belong to the returned candidate. Spell 100 supplies no breath
   immunity; other race/spell values also do not qualify.
5. Otherwise `status: "submerged"` composes `decideDrowning`: increment/wrap the
   underwater word, perform the two literal unsigned divisions with their
   overflow/EXT behavior, and compare signed words. The candidate stores the new
   count and indicator. Fitness and all eligibility fields remain unchanged.

Every result contains the independent actor `candidate`, unchanged `cellLong`,
`inventoryStatus` (`not-visited`, `skipped` or `processed`), nullable arithmetic
`decision`, and `damageRequest`. A request is either null or `{ requestedHit }`,
an inert unsigned damage-helper argument. `{ requestedHit: 0 }` is a real request
and is retained on the evidenced signed-threshold/counter-wrap case. It must not
be tested by truthiness. The result makes no survival or death assertion. No
callback or dispatcher is accepted.

Evidence is bounded to `Main.s:600-645`, `Equates.i` water masks and the existing
isolated CPU observations linked by the two helper contracts. Independent caller
review additionally ran 28 cases directly through the original OCS instructions:
full dead-word guards, ignored runtime dead words, exact window/control tests,
all presence/depth combinations, unrelated bits, race/spell exactness,
guard-before-reset and an intercepted zero-hit damage-entry call. The ignored
report `repo/.local/immersion-review/caller-branches.json` has SHA-256
`21aa5a4e6e5bdc8af90e78fcd87816b27f74c304f9b16c32976dee129df5e01c`.
Those caller cases execute the original empty-inventory/weight instructions;
damage entry is intercepted and immediately returned before any damage/death
instruction executes. Existing inventory observations separately cover visits,
non-destructive increments, and the original destructive item helper. Public
composition tests are authored synthetic fixtures, not original runtime traces
or proof of complete destruction/weight/damage/death CPU composition.

Validation: `npm run check` (lint, TypeScript, 191 synthetic repository tests and
production build). Tests cover eligibility and reset ordering, every depth,
immunity/spell distinctions, destruction/scan extent/weight composition, both
arithmetic helpers' boundary behavior, null versus zero requests, independent
copies, supported weight maximum/overflow and atomic malformed rejection. No
browser surface changed. Model: gpt-6.1-sol, medium; one implementation attempt,
no failed repair cycle; dependency discovery required the existing local
node_modules junction. Token usage unavailable. Review/integration and remaining
live descent/fall, death/control/occupancy and atomic recovery gates belong to
the coordinator; no wet activation follows from this pure caller.
