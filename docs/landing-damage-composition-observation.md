# Supported landing through actual ordinary-floor damage/death

26 October 2026. This evidence-only observation executes the recovered original
M68000 instructions from the supported `.end_fall` entry, through actual
`damage_fitness`, actual `handle_dead` when fatal, the actual ordinary-floor
`check_pad_released` branch, and the original landing continuation to its return
sentinel. It adds no implementation, live activation, art, schema or checkpoint
change. The accepted base is `951335c1aca904beb2cf8a43022899907174099d`.

Unlike the earlier [landing observation](supported-landing-observation.md) and
[damage evidence](damage-fitness-evidence.md), **no helper entry is intercepted**.
No instruction bytes are patched. No external display, audio or system calls are
intercepted or simulated. Audio is avoided by executed source branches: gender
byte 0 and grunt count 99. Gender is an additional restriction of this observation;
it is absent from the existing [damage API](damage-death-contract.md) and
[death API](death-transition-contract.md). These results therefore support a
narrower composition, not every input those APIs currently accept.

The private diagnostic is `landing-composition/.local/landing-composition/observe.py`.
From that worktree, `python .local/landing-composition/observe.py` reproduces 61
cases, capped at 300 original instructions each. All assertions pass; 14 cases
execute death and the longest takes 112 instructions. Python 3.13.7, Unicorn
2.1.4 with explicit M68000 model, and Capstone 5.0.7 are used. Listings, exact
private addresses, memory accesses and traces stay in ignored private storage.

Pinned SHA-256 identities, asserted before execution:

| Input | SHA-256 |
| --- | --- |
| Recovered OCS executable, 142260 bytes | `46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84` |
| `Main.s` | `cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9` |
| `Controls&Movement.s` | `d8544279d106d531514ecfa2338ab669a4c5bedbbef683eb6d633424a3109c15` |
| `Equates.i` | `ae22603c9c17d4a6c6f6c8064ef69383f23b211fbbd3169839157eb830a1b759` |
| Final diagnostic | `1296dd0ddffdb1819b00dde2ee93243f74373047ae2018909e8fd29d9ca9419d` |
| Final private `results.json` | `3fb876965eb2a2042cedb1705aaaf42255dd2d40014bda3629075f1f84e2b451` |

The executable and all three source files are rehashed after execution. Every
case asserts unchanged loaded instruction bytes, prohibits writes to code,
constrains execution to decoded instructions and explicitly excludes audio and
unsupported support-search branches. All data reads must fit initialized
synthetic actor/stats storage, the current/below/second map words, leader words,
stack, or the two zero cheat bytes. After execution, the entire 8 MiB synthetic
memory image must match its initial image except explicit supported output and
stack ranges. Exact outputs within those ranges are checked. Inventory and
unrelated buffers remain byte-for-byte unchanged.

Each case begins alive, both dead words zero, window type 0, control method 1,
cheats zero, physique 1..65535 and grunt count 99. Actor current-map reference
matches the supplied current cell; old-map reference initially differs. The
floor is present, type 0; below-cell block bits are absent; current auxiliary
bits are absent. Owned head family/direction and owner variant are validated
before execution. One leader matches the actor; the other identifies another
slot and is preserved. Four-owner extensions cover slots/directions 0..3 and
ordinary/shield/white owner variants. These satisfy the ordinary-floor APIs'
local prerequisites, including their conservative requirements for surviving
and zero-hit cases. This is synthetic local correspondence, not proof of a
complete original map or prior support/eligibility traversal.

The 48-case matrix uses all eight water masks `0, 4, 131072, 131076, 262144,
262148, 393216, 393220`, each with pending `0, 1, 3, 4, 65535, 4294967295`.
Default fitness is 1000, physique 100, shield 0, slot/direction/variant 0.
Synthetic first words are `65667 | mask`; second word is 2780615457 and below
word 128. Initial flash duration is 253; underwater and drowning counts are
23 and 19. Other actor/stats bytes use synthetic fill patterns.

Selected complete outcomes follow; every row ends with pending zero:

| Synthetic case | Executed result |
| --- | --- |
| Pending 100, mask 0, fitness 755 | Hit 100, damage 100, fitness 655, alive; pending write sees 100. |
| Pending 100, mask 0, fitness 754 | Damage 100; fitness 654 written before death; both dead words 65280. |
| Pending 1000, mask 0, fitness 1000 | Fitness 0 written before death. |
| Pending 4294967295, mask 0 | Overflow damage 6291400; death preserves fitness 1000. |
| Pending 1, mask 4, fitness 654 | Real request 0, real damage 0, real death with fitness 654 preserved; pending write sees 1. |
| Pending 799, mask 0, shield 87 | Damage 0; fitness 1000 survives. |
| Pending 65536, mask 0, physique 1 | Overflow damage 6291400; death preserves fitness 1000. |
| Pending 4294967295, mask 0, physique 65535 | Overflow damage 6291400; death preserves fitness 1000. |
| Pending 4, mask 131076 | No helper call; one pending write sees 4. |
| Pending 65535, mask 262148 | No helper call; ordered pending writes see 65535 then 0. |
| Pending 0, mask 262148 | No helper call; final reread causes one redundant zero write. |
| Pending 0, mask 0 | No helper call and no pending write. |

For the slot-0 fatal dry case, map first becomes 1879048353 and second becomes
2779775777; the zero-request fatal mask-4 case instead retains that water bit,
producing first 1879048357. Fitness feedback is checked, including modulo-256
flash addition and fire-white 255. Actual redraw-global writes are retained and
checked when the fitness band changes or death returns; this does not execute a
renderer. Redraw is outside the pure damage API's returned slice.

Observed ordering is damage entry with original pending, optional death entry
with original pending, dead-flag/leader/old-position writes, occupancy removal,
actual non-pad release check against that removed occupancy, actual skeleton
and owner writes, helper return, then landing pending clear. No death helper
clears pending. The caller clear always targets the original actor's pending
long. A final actual read targets the original current-cell long, including its
new corpse bits after death, and masks the newly read value. The existing water
bits survive death; at mask 262148 or above the final clear targets the same
pending long even after it is zero. These cases preserve both clear instructions
and their ordering; they do not coalesce redundant writes.

Reference preservation is executed, not assumed. A0 is the original synthetic
actor, A1 its stats and A2 the original current cell at damage/death entry and
again at caller clear/final reread. Death temporarily loads A1 from the actor's
current-map reference, stores it into old-map reference, and addresses the
below word and corresponding second map part from it. Pad release loads A2
from that old-map reference. Its real save/restore returns the references, and
death's real save/restore returns A0/A1/A2 before the wrapper returns. A5 remains
the synthetic global base for both leader words and redraw byte. Data-read
bounds independently validate these dereferences; no hook restores a reference
or changes PC/registers after starting execution. The final sentinel and stack
balance establish the actual return through all nested callers on this branch.

Source deductions agree with these executions: the landing mask decision and
logical quartering come from `Main.s:4037-4061`; damage arithmetic and redraw
from `1356-1371,1407-1459`; death reference saving, map mutation and restoration
from `1146-1222`; non-pad exit from `Controls&Movement.s:6478-6516`. The broader
water decision table remains in the linked landing observation. No path before
`.end_fall`, female death audio, grunt audio, pressure-pad action, stairs/support
search, other occupants, preexisting auxiliaries, repeated death, recovery or
live installation is established here. Direct continuation entry does not prove
these synthetic water/pending combinations are reachable during gameplay.

The smallest next implementable transition is a disconnected, atomically
validated composition restricted to the observed non-audio ordinary-floor
branch: prepare the nullable request, run the accepted damage/death transform,
then clear pending on its returned actor and reread its returned current cell.
It must accept actual death's changed map word rather than requiring the
existing staged API's storage-preserving return. It needs an explicit gender
restriction (or separately evidenced audio boundary) and must account for
redraw separately. Full team/map validation and coherent checkpoint installation
remain prerequisites for any live adapter.

Model: inherited gpt-6.1-sol, medium. One observation implementation attempt;
one evidenced harness-bound correction: the initial audio exclusion began at
the ordinary flash-add instruction and was narrowed using the inspected
instructions to the actual audio branch. Subsequent assertions were strengthened
without original-code changes. Token usage unavailable. No delegation or commit
by this worker. Independent review/integration are coordinator-owned.
