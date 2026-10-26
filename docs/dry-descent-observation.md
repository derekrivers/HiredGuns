# Bounded dry descent through later supported landing

26 October 2026. Evidence only, accepted pinned main
`5033b63b315a96ba31f443c2e536f79620714703`. This observation executes one
original per-player fall-helper invocation that descends exactly one dry cell,
then a second explicit invocation on the returned actor/map state that reaches
ordinary supported landing and actual damage/death. Entry is the original
per-player helper called by `players_fall`, before its eligibility tests; neither
invocation enters directly at the landing continuation. No implementation, live
world, inventory, schema, checkpoints, artwork or browser behavior changes.

The private reproducer is `.local/dry-descent/observe.py`, followed by
`npx --no-install tsx .local/dry-descent/compare.ts`. It reuses the frozen sibling
`landing-composition/.local/landing-composition/observe.py` loader, source pins,
M68000 CPU setup, disassembler and helper ranges without modifying that file.
The sibling `landing-damage-compose/.local/landing-compose-review/probe.py` and
`compare.ts` were read as comparison guidance and remain unchanged. Original
source, addresses, instruction bytes, decoded listings, accesses and traces stay
in ignored private storage. Public values below are authored synthetic integers.

| Identity | SHA-256 |
| --- | --- |
| Recovered OCS executable, 142260 bytes | `46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84` |
| Main.s | `cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9` |
| Controls&Movement.s | `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15` |
| Equates.i | `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759` |
| Observer | `2d43e35acd08ec2470fba08425b06da097ad731ae7188b41008a9e908a2c4749` |
| Private results.json | `994c726ea5a76c9ab1049b6b8798871aa4e472c6ba3e16a18c545fa8c892041e` |
| Private compare.ts | `21da5fee70186bdb4ed45c2c1ff275b809156e4682ffcdc76970ca29322a3662` |
| Private api-results.json | `dadd1100b00c89248f3de5fbcd19fecd07b8d2ce016d1d780fdb772308aaf340` |
| Frozen reused observer | `1296dd0ddffdb1819b00dde2ee93243f74373047ae2018909e8fd29d9ca9419d` |

Actual execution comprises 18 cases: 15 two-invocation dry-descent/landing cases
and three one-invocation eligibility cases. Each invocation is capped at 350
original instructions; the longest complete two-call case executes 218. Python
3.13.7, Unicorn 2.1.4 with explicit M68000 model and Capstone 5.0.7 execute the
loaded instructions. No instruction patch, helper interception, replacement
callback, display/audio/system substitute or forced return is used. Code hooks
only observe and assert. Writes to loaded code are prohibited; loaded bytes are
checked unchanged, and executable/source digests are rechecked after execution.

Synthetic memory models one actor, its stats, two leaders and three vertically
adjacent first-layer cells plus the destination's second and third layer words.
The source logical pose is x=7, y=8, floor=2, direction=slot for the four-owner
cases, otherwise direction/slot=0. Its map reference labels source; initial old
reference labels a distinct cell. Destination is exactly one derived vertical
stride below source and corresponds to floor=1 at unchanged x/y. The source
floor is absent, destination has ordinary type-0 floor, both lower cells have
empty block bits, and all three have no water or auxiliary bits. Neighboring
unsupported geometry is never executed. The executable's byte stride and layer
stride are private derived constants, checked against decoded addressing; a
future public API must validate logical grid correspondence rather than treat
arbitrary opaque labels as proof of adjacency.

The source first word is `0x400080 | ownedHead | ownerVariant`: head bases
32/36/40/44 match slot, direction matches the low head-family offset and block
presence is set. Destination starts `0x400081`, lower cell `0x400080`;
destination second and third words both start `0xa5bcd321`. The opaque bits in
these words are retained except the specifically executed masks. Actor/stats
buffers otherwise use synthetic byte fills. Both dead words are zero, window=0,
control byte=1, gender=0, grunt=99, physique/agility=100, weight=0, fitness=65535,
shield/cheats=0, fire-white=0 and flash=253. Underwater/drowning counts are 23/19,
water-fall delay is 17, redraw initially zero. One leader matches slot+1 and the
other identifies a different actor. Image family, block number and spell fields
needed by actual head insertion are initialized explicitly.

Observed eligibility reads the stats dead word, compares window to 7 and tests
the actor control byte, in that order. Separate nonzero-dead/window-7/control-0
cases preserve actor/map/pending/delay. Crucially their branch shares a final
water-mask reread through **incoming A2**, before the helper has loaded the
actor's current map reference. These probes explicitly initialize incoming A2
to the dry source cell; they do not prove a universal no-op for arbitrary incoming
A2. The prior direct-landing observations never executed these eligibility
tests. The executable-derived control field here is the actual guard byte;
previous continuation fixtures' declared control values were modeled inputs,
not evidence that those fixtures passed eligibility.

For an eligible actor the first call clears water-fall delay as a word, tests
current floor, tests second-below block type 4, then tests immediate-below block
presence. Our geometry takes the empty-block descent branch. It writes these
non-stack targets in exactly this order, with every width/value asserted:

1. Delay word zero; source first long with person bits removed.
2. Old-map long=source; current-map long=destination; floor byte=1.
3. Pending long from the arithmetic below.
4. Real ordinary non-pad release check against source after removal, then real
   non-pad push check against destination before placement.
5. Real mine-test helper unconditionally clears the third-layer no-monster bit:
   `0xa5bcd321 & 0xdfffffff = 0x85bcd321`, even with no auxiliary/mine. Its
   actual no-mine branch returns zero; calling the whole helper a no-op would
   omit this write.
6. Actual head insertion writes block-number word, clears destination person
   bits as a long, then ORs the owned head/variant as a long. Redraw byte=255.

The first helper return retains original actor/stats references; A2 still labels
source although the actor current reference labels destination. x/y/direction
are unchanged; old reference labels source, floor=1 and fitness is unchanged.
The second call reloads A2 from the actor and naturally takes destination's
current-floor support branch. The real damage helper sees the pending value
before the landing clear. Gender 0 and grunt 99 naturally bypass audio. Fatal
cases execute real ordinary-floor death, including its non-pad release,
occupancy removal and corpse writes. Actor/stats/current-cell references return
to the same objects before the caller clears pending. Final reread uses the
actual changed destination word. The first pending clear is after helper return;
zero pending makes no helper request or pending write on this dry slice.

Pending generation follows decoded widths: a nonzero pending long bypasses
seeding. Zero pending uses unsigned weight/agility DIVU, discards remainder,
adds physique with **word wrap**, shifts the zero-extended result left five,
then doubles as a long. Nonzero pending is also doubled modulo 2^32. The cap
comparison is signed: a negative doubled long passes below the positive cap.
The following actual outcomes include the later landing; fatal rows preserve
fitness 65535 because the damage exceeds it.

| Input variation | Pending after descent | Later fitness/result |
| --- | --- | --- |
| Default seed | 6400 | 59135, alive |
| Weight 299, agility 100 | 6528 | 59035, alive |
| Weight 65535, agility 1, physique 1 | 0 | 65535, no request |
| Same weight/agility, physique 2 | 64 | 62335, alive |
| Weight 4294901759, agility 65535 | 6336 | 59235, alive |
| Pending 8388607 | 16777214 | fatal |
| Pending 8388608 or 8388609 | 16777216 | fatal |
| Pending 1073741824 | 2147483648 | fatal |
| Pending 2147483648 | 0 | 65535, no request |
| Pending 4294967295 | 4294967294 | fatal |

Four additional slot/direction cases reproduce the default seed and owned
placement. Five cases execute real death. Guard cases use pending 123 and
retain it. Zero agility and DIVU quotient overflow are excluded; the source has
no overflow handler here. Signed/wrapping pending probes establish CPU behavior,
not reachability from repeated ordinary zero-seeded falls.

All reads must fit initialized synthetic ranges. Every non-stack write must fit
an explicit supported target range; descent additionally asserts the complete
ordered target/width/value list. Full 8 MiB memory preservation is asserted both
after the first return and after the full sequence, except explicit output and
bounded stack ranges. Exact pending, pose, refs, occupancy, corpse, leader,
fitness, flash, fire-white, redraw and third-layer outputs are asserted. No
inventory or other buffers change. CPU hooks collect traces without replacing
instructions. Stack/sentinel setup between invocations is observer scaffolding;
all actor/stats/map/global output is carried forward without repair.

The private TypeScript comparator passes **all 15 naturally produced landing
inputs** to the accepted `composeOrdinaryFloorLanding` slice and compares
fitness, pending, old reference and packed current word against CPU return,
while asserting input immutability. All are accepted: alive dead words zero,
window 0, control 1, gender 0, grunt 99, normal cheats/shield, valid physique,
matching owned head/direction/variant, ordinary floor, empty below block and no
auxiliary bits. Source/destination logical correspondence is established by the
preceding descent, not inferred merely from API acceptance. Third-layer output
belongs to descent and is outside that landing API.

Exactly one smallest implementation is nominated: a disconnected **pure one-cell
dry descent transition** for this validated eligible, owned, empty-block,
ordinary-destination slice. Its concrete inputs should include actor pose,
current/old logical map labels, dead/window/control state, image family and
feedback/shield fields; stats physique/agility, unsigned weight/pending; current,
destination and second-below packed first words; destination third word and redraw.
It should atomically validate complete storage, bounded logical adjacency,
source ownership, dry/no-aux/no-pad geometry, both lower block checks, initialized
head fields, and nonzero divisor/nonoverflow quotient before exposing a candidate.
Outputs are the changed actor refs/floor/block/pending/delay, both occupancy words,
third word and redraw, plus ordered inert write/check records. Invalid inputs
must preserve every input and expose no partial candidate. It should return the
post-descent state with injury pending, leaving the later landing to the existing
composition; it should not invent a scheduler or auto-dispatch damage.

Current-floor support without descent is observed only on the second invocation.
Initial immediate-below block support and second-below type-4 support are source
inspected but excluded from this nomination and CPU matrix, as are pads, mines,
other occupants, stairs, auxiliary objects, wet paths, multi-cell descent and
audio. These branches remain outside the nominated transition. Source inspection
establishes the branch structure (`Main.s` players_fall and per-player body;
`Controls&Movement.s` pad checks/head insertion); actual execution establishes
only the cases above. Synthetic memory and invocation scheduling are modeled
assumptions. Neither two calls nor source scheduler placement establishes
main-loop cadence, interrupt timing, wall-clock parity, complete-map authority,
live activation or safe recovery.

Validation: all private CPU assertions pass; 15/15 composition comparisons pass;
`npm run check` passes lint, TypeScript, 244 tests and production build. No browser
surface changed and no browser repeat was needed. Model: gpt-6.1-sol, medium;
one observer authoring attempt, one evidence-driven fixture repair (the first
max-quotient weight actually overflowed DIVU and was corrected to a valid 65535
quotient), then added assertion coverage without execution failures. Initial
relative junction setup was corrected to an absolute target. Token usage
unavailable. No commit by this worker; independent review and final integration
remain coordinator-owned.
