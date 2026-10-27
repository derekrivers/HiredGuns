# Canonical initialized team storage diagnostic

27 October 2026. This private diagnostic calls the existing
`initializeOriginalTeam(roster, items, indices)` with the exact verified OCS
roster/item pair and four explicit ordered canonical indices. It produces one
source-bound team and source-derived storage fragments. It does not produce a
complete initialized memory image. The only public change is this document;
tools, original bytes, actor data, coordinates, reconstructions and receipts stay
ignored under `.local/initialized-team-source-storage`.

Both complete input payloads are checked for length and SHA-256 before use:
the 16,320-byte roster has identity
`79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439`,
and the 32,604-byte OCS item table has identity
`633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc`.
The actual initializer reimports and verifies both sources. The report retains
complete source identities, ordered indices, four actor-data results, their
verified inventory/weight values and separate logical party-slot ownership.
Reconstructing all raw records through the unchanged importers reproduces every
one of the 48,924 input bytes. Original files and in-memory input arguments remain
unchanged. The chosen diagnostic order does not become a default live roster.

The source parser handles only the pinned plain record-definition blocks. It
checks complete nonoverlapping byte ownership for four runtime records, four
stats records and the early variables prefix through the last mouse-image field.
It does not infer absolute memory placement, allocation alignment or a general
assembler. The previously reviewed mouse fixture's intervening allocation is
authored fixture metadata; its size and opaque contents are not canonical
initialization evidence. Here runtime, stats and global fragments remain separate
logical regions.

The stats producer copies each selected record's complete 140-byte tail, preserves
names, race/gender/class, both inventory templates and all other source bytes,
then applies the six source status/padding clears and the initialization fitness
override. All four complete 146-byte stats blocks round-trip losslessly. Their
boundary is the common initialization helper's source-derived result, before the
outer caller's separate three-human fourth-slot adjustment. They are not a
snapshot after the entire initialization caller.

Runtime fragments contain only unconditional source writes: equipment and thirty
carried entries, copied footstep/grunt periods, copied dead word, bumping sentinel,
view/draw requests, fixed ordered-slot metadata and the independent view-layout
stores. The third slot's horizontal layout remains unknown because the human-count
branch selects it. The early global prefix contains only the fixed pointer and
independent initialization stores established by the inspected source. Values,
source field ownership and origins are retained privately for every known byte.

| Logical storage | Total bytes | Known bytes | Unknown bytes |
| --- | ---: | ---: | ---: |
| Four stats records | 584 | 584 | 0 |
| Four runtime records | 6,040 | 604 | 5,436 |
| Early variables prefix | 314 | 8 | 306 |
| Total | 6,938 | 1,196 | 5,742 |

Each byte has exactly one source-field owner. Unknown values are explicit nulls;
they have no invented raw-byte encoding. The known runtime counts by slot are
152, 152, 148 and 152. Source-defined clear operations are recorded as prerequisites,
but their presumed zero values are not installed into unresolved runtime/global
bytes without the initialized caller prestate. Verified API weight remains actor
data: actual weight storage additionally reads the runtime spell field and prior
feedback state, so this diagnostic does not fabricate those bytes or their writes.
Sparse fragments round-trip losslessly while retaining every unknown marker;
complete raw-byte roundtrips apply to the input payloads and produced stats only.
No full-runtime raw roundtrip is claimed.

The smallest next dependency is a source-bound return prestate for the bounded
quick-initialization path under one explicit human/control configuration. It must
account for the hardware-seeded RNG, map starts, runtime clear effects, control
globals, pointer bases and remaining initialized globals/layout, preserving any
unresolved hardware or external-call origin. That would permit narrowly invoking
the four actual initialization helpers and determining their complete storage.
A whole startup audit is not necessary to state this blocker. No CPU call was
needed or performed for the current copy/write fragments: source deduction and an
actual TypeScript initialization call are distinct from executable observation.
The retained executable is identity-checked only; this adds no instruction-parity
claim. This nomination remains **unstarted**.

The launcher pins producer, driver and manifest; the manifest pins the existing
import/initialization modules, five source files, executable and both payloads.
Wrong identities, truncations, malformed or repeated selections and optimized
Python execution reject. Output must be a fresh strict descendant of the ignored
lane. Existing complete, partial and file outputs reject without overwrite.
Twenty-two private refusal cases pass and preserve original inputs. A second
fresh run reproduces all seven artifacts byte-for-byte; ownership, origin masks,
artifact hashes and stats/raw-input roundtrips are checked separately.

These canonical initial actor data are not proven to satisfy the authored
post-death mouse fixture. No fixture sentinel or opaque value is relabelled as
canonical. A coherent post-death invocation, hardware/input binding and live
actor/occupancy adapters remain separate prerequisites. Existing contracts,
source authority, runtime, allowlists, schemas, world/checkpoint version 3 and
roster-plan version 1 are unchanged. Training43 remains incomplete; no live
installation, hazards, campaign, art or browser behavior changes occur.
Model: gpt-6.1-sol, medium; token usage unavailable.
