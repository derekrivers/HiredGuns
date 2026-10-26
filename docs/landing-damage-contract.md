# Pure ordinary-floor landing through actual damage/death

26 October 2026. `src/character/landing-damage.ts` adds exactly one disconnected
composition, `composeOrdinaryFloorLanding(input)`. Its evidence is the
[61-case original-instruction observation](landing-damage-composition-observation.md).
It leaves the [staged unchanged-cell API](supported-landing-contract.md) intact.
There is no world installation, renderer, UI, descent, inventory, save or artwork
change, and Training43 remains incomplete.

Input has exactly `damage` (the existing `DamageFitnessSlice`), `gender` and
`redrawFlag`. Gender must be 0; redraw is an explicit byte. The complete nested
damage/death storage is required, including unsigned 32-bit `actor.fallDamage`
and packed `cell.first`. Both dead words must be zero, window type 0, control
method 1 and grunt count 99. Both cheats are zero; physique is 1..65535. All
other numeric ranges and ordinary-floor geometry/head/owner constraints remain
those of the existing [damage](damage-death-contract.md) and
[death](death-transition-contract.md) contracts. Restrictions apply even when
the landing mask skips damage. In particular, unsupported corpse/auxiliary,
pressure-pad, support-search, resting, uncontrolled or audio slices reject.

The one nested actor owns the runtime fields and its one stats slice; partyIndex
identifies its logical slot. Actor mapPosition must equal the sole cell's
mapPosition. These are logical labels, never dereferenced original addresses.
There are no independent helper-target pointers, actor substitutions or external
return receipts. The caller still owes full roster/source/team/map correspondence
before any future live adapter; this local correspondence cannot establish it.

Every object boundary uses exact own data descriptors, including the two dense
leader entries. Missing, extra, inherited-only, symbol, hidden extra and accessor
properties reject before any candidate is exposed; accessors are not executed.
Exact nonenumerable own data fields are copied into ordinary enumerable storage
before delegation. The snapshot then validates the complete damage restrictions
and calls the existing death validator privately, discarding its candidate.
Thus no-call branches also validate their complete potential damage/death input.
Invalid inputs are never mutated; returned candidates and records are independent.

The composition uses `prepareSupportedLanding` directly. Its returned nullable
request is retained in `prepared`, with original pending and packed cell intact.
Every nonnull request invokes `damageOrdinaryFloorFitness`, including requested
hit zero. A null request applies no damage candidate or feedback. The existing
damage result supplies actual fitness, flags, leaders, occupancy and corpse data;
the composition never normalizes death fitness or fabricates an unchanged cell.
`status` is `damage-skipped`, `survived` or `died`; `arithmetic` is null only
on the no-call branch.

After the helper returns, or after the no-call branch, nonzero pending is cleared
on that same candidate actor, with phase `after-helper-return` or `damage-skipped`.
The composition then rereads that candidate's actual cell first word, including
fatal corpse changes, and masks it with `0x60004`. At mask at least `0x40004`,
it records a second clear with phase `final-cell-reread`, even if pending was
already zero. `pendingWrites` preserves the ordered before/after values without
coalescing redundant writes. Opaque packed bits survive except the accepted
death transition's explicit occupancy/corpse masks. Underwater/drowning/delay,
position and unrelated modeled fields remain intact.

Redraw is accounted for separately from the existing damage API: source
`Main.s:1444-1459` writes 255 after death returns, or after surviving subtraction
when integer fitness bands `floor(fitness/655)` differ. Initial redraw bytes are
otherwise preserved, and an already-255 write is still recorded. `effects` orders
the existing damage audit records, this redraw write if any, the first pending
clear if any, the actual cell reread and the final clear if any. Feedback bytes
are in the candidate, as in the existing API; this list is not a complete CPU
memory-access trace. Death's flag/leader/old-position writes are also represented
by its candidate rather than new individual audit records. All effects are inert
descriptions of an already-computed candidate, never callbacks to dispatch.

Evidence remains separated: the frozen observer executes 61 original bounded
continuations, including 14 actual deaths, with gender-0/grunt-99 natural audio
bypasses. Source inspection independently establishes the redraw condition and
ordering; the frozen observer checks selected outcomes. Public tests use only
authored synthetic numbers, including all eight masks, pending 0/1/3/4/65535/
high-bit/uint32-max, real zero-hit death, fitness 654/655, equality/overdamage,
exact shields, quotient limits/overflow, feedback wrap, all owners/directions/
owner variants, changed-cell reread, redundant clears and strict atomic rejection.
None of this establishes pre-landing support traversal, gameplay reachability
of every synthetic input, female/grunt audio, repeated death, pressure-pad actions,
live actor authority, whole-game parity or checkpoint safety.

Validation: focused synthetic tests passed 20/20; `npm run check` passed lint,
TypeScript, all 244 repository tests and production build, using the ignored
dependency junction to the existing repository installation. The coordinator independently
compared all 61 frozen observer cases with this API: 14 deaths, 28 requests and
71 ordered clears matched, with no exclusions. The diagnostic script/results
retain SHA-256 `1296dd0ddffdb1819b00dde2ee93243f74373047ae2018909e8fd29d9ca9419d`
and `3fb876965eb2a2042cedb1705aaaf42255dd2d40014bda3629075f1f84e2b451`.
Private sources, traces and comparison output remain ignored. Relevant browser
checks passed 13 with one optional original-item skip, including the exact local
Training43 all-four route and mid-fall recovery; existing browser behavior remains
the bounded authored/static behavior. Final-commit review/CI are separate gates.

Model: gpt-6.1-sol, medium; one implementation attempt. The first synthetic
fixture omitted the owned-block presence bit; one evidence-driven fixture repair
added it before the focused suite passed. Token usage unavailable. No recursive
delegation or commit by this worker.

Exactly one next supported task is a bounded original-instruction observation
of one-cell dry descent into ordinary non-pad support, covering eligibility,
pending generation and occupancy ordering through the later supported landing.
Neighboring unsupported geometry/pad/audio branches must remain excluded explicitly.
This evidence task is not started here.
Integrated descent/fall, full wet traversal, death/control/occupancy and pad/corpse
installation, and source-bound atomic paused recovery remain live activation gates.
