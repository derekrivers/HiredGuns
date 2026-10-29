# Gun transition and immediate keyboard encounter consumer

This packet provides `transitionGunShot` in `src/combat/weapon-transition.ts`.
It is a pure deterministic transition for the category-zero NAOMI IV assault
rifle family, with an explicitly authored dummy target. It does not install a
playable encounter. The required next card is
**combat-keyboard-encounter-integration**, queued for the coordinator as soon as
the live inventory lane releases shared session/save ownership.

## Evidence and scope

Bounded inspection of the original `ItemUsage.s`, `Controls&Movement.s`,
`Equates.i` and the privately verified OCS runtime item table supports the gun
category dispatch, four-byte inventory entry, ammo byte, gun parameters and
these operations:

- A nonnegative signed byte fire counter greater than three blocks firing.
- Empty ammo blocks firing. Otherwise spend the smaller of the ammo count and
  animation duration, copy the gun accuracy byte and set the fire duration.
- The player-hit branch forms an unsigned damage argument from damage per hit
  times the **full animation duration**, scaled by 512. Partial bursts retain
  that full argument. Damage is not scaled down to the ammo actually consumed.
- Normal physique/shield arithmetic uses the existing `computeNormalDamage`,
  including its division-overflow behavior. No shared arithmetic changes.

The supported logical profile restricts counters and weapon duration to
nonnegative signed bytes, positive duration/capacity/damage, ammo at most weapon
capacity, this one item identity and the normal gun category. Other categories,
wrapped counters and malformed entries refuse atomically. Unknown entry damage
and fourth bytes survive unchanged; the complete raw weapon row survives at
the caller. No source tables, original bytes or private evidence are published.

`bindVerifiedEncounterGun(rawTable)` hashes and imports the complete table and
accepts only the existing verified OCS runtime revision. It derives a fresh
immutable row for this one weapon. Calling the logical transition directly with
a synthetic row is supported for tests, but **does not authenticate that row**.
Serialized item IDs, labels and hashes alone cannot establish source authority.

The original complete player shot also runs distance/target traversal through
`get_dist`, target-kind selection, fitness lifecycle and `damage_inventory`,
plus weight and audiovisual effects. Those are not implemented here. The
existing `prepareShootingArgument` is a narrow pre-fitness diagnostic projection;
it is deliberately not used as a gun or live consumer. `damageOrdinaryFloorFitness`
would grant actor/death/occupancy semantics that a dummy does not possess, so it
is also deliberately not called.

The caller supplies either `miss` or `authored-dummy`; this is an authored
encounter policy, never original accuracy/range/hit detection. Dummy fitness
subtracts the normal damage amount and saturates at zero. That clamp and target
health are adaptation rules, not original player fitness/death behavior. Zero
dummy fitness changes no actor, control, occupancy, inventory, corpse or mission
state. The accuracy output is retained source state, not a hit probability.
There are no random draws or implicit RNG changes. Adding randomized encounter
rules requires explicit saved RNG ownership in that future consumer.

## Runnable consumer API

The following can run in the same application's TypeScript environment after
local item import. Original bytes remain local. Equip the imported item through
the accepted inventory action; do not create or refill a source inventory item
silently. If the team does not carry this weapon, offer a clearly labelled
authored encounter loadout isolated from original team inventory.

```ts
import { bindVerifiedEncounterGun, transitionGunShot } from './combat/weapon-transition';

const weapon = await bindVerifiedEncounterGun(importedRawItemTable);
// Selected source equipment from the inventory owner, or explicitly authored loadout.
const state = {
  equipped: selectedInventory.equipped,
  fireDuration: 0,
  fireAccuracy: 0,
  target: { kind: 'authored-dummy' as const, fitness: 100000, physique: 100, spellShield: 0 },
};
const result = transitionGunShot({ weapon, ...state });
// Commit the entire candidate together, only after session validation succeeds.
const next = result.candidate;
```

Results distinguish `fired`, `already-firing` and `no-ammo`. Misses consume ammo
and update gun state, but return no damage arithmetic. Blocked results preserve
all state and consume no ammo. All nested returned objects are frozen and share
no mutable input; clone into the live state only within its atomic transaction.
Malformed/unsupported input throws before any candidate is exposed. Validate
even blocked commands; do not partially spend ammo before validating the target.

For the immediate consumer card:

1. Add visible target selection and fire/reset actions to the **same four-view
   application**, with keyboard bindings chosen to avoid existing movement and
   inventory keys. Label the scenario “Authored gun encounter — source-derived
   gun/ammo/damage arithmetic”. Show selected actor/target, ammo, blocked/empty
   state, damage amount and dummy fitness. Source-bound weapon where available.
2. Fire uses one current equipment snapshot and one current target snapshot;
   source inventory and encounter state are committed together. Do not also
   decrement ammo elsewhere. If source inventory is used, update its command
   replay/save model to represent firing interleaved with equip/return. Existing
   equip-only replay cannot reconstruct spent ammo.
3. The counter does not advance inside this action. Use the application's
   accepted fixed simulation tick, decrementing positive encounter fire duration
   by one per tick as an explicitly authored cooldown policy. Pause blocks this
   clock. Prevent browser key-repeat from generating unintended extra commands.
4. Save the encounter version/profile, actor/loadout association, complete
   equipment bytes, fire duration/accuracy, selected target/miss state, dummy
   fitness/physique/shield, and reset baseline or reproducible baseline identity.
   Retain all unrelated inventory entries/tails. Rebind verified weapon bytes
   from the local import on recovery; never trust saved row metadata. A command
   replay alternative must include fire, target selection, reset and exact tick
   ordering under an explicit bound. Do not mix snapshot ammo with replay ammo.
5. Atomic paused recovery validates and builds every inventory/encounter/clock
   candidate before installing any of them. A rejected/cancelled import leaves
   the current session untouched. Legacy saves without encounter data start the
   encounter inactive. Retry/reset restores the authored baseline atomically,
   with explicitly labelled authored ammo replenishment if applicable; it must
   not duplicate a source inventory weapon or refill team ammo accidentally.
6. Required browser evidence: keyboard equip/fire/target/miss, full/partial/empty
   ammo, cooldown and pause, damage and reset, paused save/reload equivalence,
   malformed recovery retaining prior state, and retry restoring baseline.

This packet changes no DOM/session/save files; browser evidence belongs to that
immediately queued consumer, not this mechanics-only packet. Public unit tests
use only synthetic rows/entries. Full check and independent current-head HIGH
review remain integration gates; this is not a CPU parity claim or Training43
complete-level acceptance.
