# Initial original team contract

26 October 2026. This batch implements pure initialization in
`src/import/original-team.ts`. It does not install actors in the simulation,
connect UI controls, or change world schema 3, checkpoint version 3, or roster
selection plan version 1. Death and environmental prerequisites remain separate
gates. Character/item evidence is documented in character-format.md and
item-format.md; it establishes source-derived initialization, not runtime parity.

`initializeOriginalTeam(roster, items, indices)` requires four explicit, ordered,
different canonical indices in 0..11. Inputs are local raw Uint8Arrays or imported
catalogs. Catalogs reconstruct the complete 60-by-272 roster and 114-by-286 item
table from dense arrays of preserved raw records. Both byte sequences, choices
and claimed source identities are copied before the first await. Imports rehash
the bytes and rederive all parsed fields; a catalog's claimed identity must match
its evidence. Edited parsed stats, inventory, categories and weights cannot grant
authority or change the resulting actors.

The only accepted pair is:

| Source | Bytes/layout | SHA-256 |
| --- | --- | --- |
| OCS roster | 16,320 / front272-five-banks | `79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439` |
| OCS English runtime item table | 32,604 / items286-114 | `633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc` |

Unknown, CD32, editor, mixed and spoofed pairs reject. Returned `sources` retain
both complete identities (digest, byte length, layout and revision). Each actor
contains its canonical index, copied numeric stats with fitness reset to **65535**
(OCS Main.s:5329), cleared equipment, ten copied plus twenty cleared carried slots,
ten separately copied action slots, and verified initial weight. Nonzero carried
and action IDs must refer to the item table. Action entries never contribute to
weight. Initialization uses the source arithmetic's normal initial state, without
an active feather override; a nonrepresentable weight quotient rejects. No alive,
controlled, extraction, position, occupancy, spell or environmental flags are
invented. The result is an initial actor-data contract, not a resumable world.
All mutable returned objects are independent of inputs, other actors and later
calls. The caller owns its result and may mutate it; no persistent authority
token or executable catalog is returned.

`constructInitialTeam` separately exercises the synchronous copy/weight behavior
with authored catalogs. It validates dense inputs, selected canonical records,
stat words, slot bytes and item references, and returns only `computed` weight.
It cannot produce the verified team type. The verified API has no injectable
digest, allowlist, constructor, profile switch or verification bypass. Public tests
contain synthetic bytes only; a successful exact-source run requires local files.

## Proposed future ownership and migration (unimplemented)

Before any gameplay activation, the simulation must own explicit actor lifecycle,
control eligibility, extraction, occupancy, position, fall/drowning state and
environmental mutations. The death audit must establish ordering for inventory
water damage, immunity, health, pad release, corpse markers and occupancy removal.
The six initial stats and inventory here cannot substitute for those invariants.
World creation should consume a newly verified team only after that gate passes;
the UI should request creation explicitly and provide four choices, never attach
the current preparation to an existing world. Controller assignments belong to
session input, independent of actor indices and team size.

A future world schema 4 and checkpoint envelope version 4 should own immutable
original profile/source identities and ordered canonical indices alongside mutable
actor stats, equipment, thirty carried slots, ten action slots, lifecycle and
environment state. Every mutable slot must be validated byte by byte and against
the bound item revision; dead/extracted/controlled/occupancy and fitness constraints
must be shared with simulation validation. Source-derived initial records and
the mutable live state must be distinguishable so healing/damage or inventory
changes are never silently reset to a selection template. Save validation needs
the future death/environment audit's actual representable-state rules before any
codec is implemented. Digests bind revisions, not authenticity against deliberate
save edits.

Old versions 1/2/3 should retain their existing static/synthetic recovery behavior
without original actors, elapsed original health history or attachment to an open
preparation. A future migration may explicitly wrap those worlds in a legacy
non-original mode; it must not manufacture source identities or initialization.
Unsupported original modes should reject before replacing the current world.
Loading should construct and validate a complete candidate first, then install it
atomically while paused. Failed loads should preserve the current world and
session preparation.

Original catalogs should stay session-local. On a future original save reload,
require the user to reopen both exact local raw sources, reconstruct and hash
them again, and compare both identities against the save before validating live
state. A roster plan alone cannot restore item authority. Save payloads should
contain bounded mutable state and source identities, not original tables, text,
artwork or raw record copies. Source bytes and save input must be snapshotted
before asynchronous validation. These are proposals requiring separate review;
this batch implements no new save format, migration, source reload UI or gameplay.

Validation: focused synthetic construction/authority tests, lint, typecheck,
unit tests and production build. Model: gpt-6.1-sol, medium; token usage
unavailable. Initial implementation passed focused tests; one evidence-driven
correction resets initial fitness to 65535 instead of retaining the roster word.
dependency setup required an absolute-path Windows junction. No emulator/runtime
comparison or original environmental behavior is claimed.
