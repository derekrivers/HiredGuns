# Bounded normal damage-to-death contract

26 October 2026. `src/character/damage-fitness.ts` implements
`damageOrdinaryFloorFitness(input, requestedHit)`, a pure synchronous contract for
an authored local slice. It composes the accepted
[ordinary-floor death contract](death-transition-contract.md). It neither installs
actors nor connects simulation, controls, rendering, extraction or checkpoints.
Source and selected isolated CPU evidence are described in
[damage-fitness-evidence.md](damage-fitness-evidence.md); that evidence does not
establish whole-game parity.

## Accepted inputs

The exact input fields are `death` (the existing ordinary-floor slice), `physique`,
`spellShield`, both cheat-mode bytes, `fireWhite`, `fitnessFlashDuration` and
`gruntCount`. The requested hit is an explicit unsigned 32-bit integer, not a
fitness decrement. Physique must be 1..65535: zero would cause a DIVU exception.
Shield and grunt storage are words; feedback and cheat storage are bytes.
Both cheats must be zero, the window must be neither resting type 4 nor extracted
type 7, and grunt count must be 0..99. Nonzero cheats, resting damage/window
changes and the audio branch are unsupported and reject. Source uses a signed
word comparison for grunt count; this contract deliberately also rejects wrapped
negative counters `0x8000..0xffff`, although source would skip audio for them.

Every call reuses death validation, including exact nested fields, canonical dead
words, ordinary-floor geometry, map-position correspondence, owned occupancy and
auxiliary restrictions. This conservative restriction applies even to a hit that
would survive or do zero damage; it ensures a newly required death never exposes
an unsupported partial candidate. Pressure pads, supporting blocks, stair/search
geometry, another occupant and existing auxiliary objects reject atomically.
The validator's speculative death result is private and never dispatched.

## Arithmetic and writes

The accepted normal branch follows `Main.s:1356-1371,1407-1459`:

1. Shield word exactly 87 logically shifts the unsigned requested hit right by
   three before division. Other word values do not reduce it.
2. Divide by physique using unsigned integer division. A quotient up to 65535
   contributes its low word to unsigned multiplication by 100. A larger quotient
   follows the source fallback, integer `0x0fffffff / 100`, whose **low word** is
   then multiplied by 100. Consequently quotient 65535 produces damage 6,553,500,
   whereas overflow produces 6,291,400; this is not saturation.
3. Set the fire-white byte to 255. Add the low byte of
   `(damage >>> 9) + 1` to the flash-duration byte, wrapping modulo 256.
4. Compare damage against zero-extended fitness as unsigned longs. Greater
   damage invokes death **before subtraction**, preserving the original fitness.
   Otherwise store fitness minus damage; a result below 655 invokes death after
   that write. Fitness 655 survives. Zero damage can therefore kill an alive
   slice with fitness below 655, and death may preserve nonzero fitness.
5. Death composes the existing ordered occupancy removal, non-pressure-pad
   release check and corpse-owner write. Matching leaders clear; unrelated bits,
   current position, inventory and pending environmental state do not change.

`arithmetic` reports the requested hit, shielded hit, mathematical quotient,
overflow decision and normalized damage. Its quotient is a diagnostic computed
before the source overflow fallback, **not** the CPU register's packed
quotient/remainder or post-fallback value. Damage is the actual bounded decrement
passed into the accepted normal `decr_fitness` path. No direct public decrement
API bypasses physique or shield arithmetic.

The returned candidate is independently copied. `effects` are inert ordered audit
records: the fitness write, when subtraction occurs, followed by death's three
map records when needed. Feedback bytes are in the candidate. There are no audio,
redraw or other dispatch callbacks; source redraw flags and rendering machinery
are outside this slice. No inventory mutation or item transfer is modeled.
Fall damage, underwater count, drowning duration and water-fall delay stay intact.
The landing caller's later fall-damage clear is a caller continuation, not an
effect of this API.

## Lifecycle and rejection

The result is `survived`, `died` or `already-dead`. Runtime/stat dead words are the
lifecycle authority; fitness and control eligibility are separate. A zero control
method with valid owned occupancy is accepted, and type-7 extraction rejects.
The original helper itself has no dead/control/extraction guard. This local
contract's coherent-repeat rule is a browser adaptation: canonical completed
death returns a separate equal candidate, null arithmetic and no effects, without
reapplying feedback or damage. An inconsistent corpse, flags, leader or old-map
position rejects instead of pretending it is an inert repeat.

All validation finishes before a candidate is returned. Failed arithmetic,
storage, lifecycle, occupancy or geometry validation leaves every input field
unchanged, including pending damage. No result grants complete-map authority or
source identity. A future live adapter must validate the full team/map and commit
fitness, flags, occupancy, leaders, corpse data and any newly supported pad effects
atomically. Save recovery must snapshot that coherent state without replaying
damage/death. Schema/checkpoint version 3 and existing synthetic health behavior
remain unchanged; live original activation and migration remain gated by
[live-character-prerequisites.md](live-character-prerequisites.md).

Validation uses 14 synthetic cases (120 total repository tests): division,
shield exactness, unsigned hit maximum, overflow fallback, feedback wrap,
fitness 654/655, equality/overdamage, nonzero fitness at death, preserved pending
state, uncontrolled versus extracted lifecycle, inert repeats, malformed storage,
and immutable unsupported candidates. `npm run check` passed lint, typecheck, all
tests and production build. The module has no browser surface or live adapter.
Original assembly, binaries, maps and decoded assets are absent from these tests.

Model: gpt-6.1-sol, medium. Initial authored head constant failed occupancy
validation; repair 1 replaced it with explicit synthetic bit construction. The
next full check passed. Source/executable/CPU evidence came from the separate
evidence worker; no recursive delegation. Token usage unavailable.
