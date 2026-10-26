# Bounded damage-fitness evidence

26 October 2026. This records source inspection, selected archived OCS executable
anchors and **21 isolated M68000 CPU cases**. It supports a disconnected arithmetic
contract; it does not activate live actors or establish complete original parity.
Original source, executable bytes and instruction listings remain local and ignored.

## Identity and evidence levels

The baseline is the recovered executable identified in
[water-executable-evidence.md](water-executable-evidence.md#identity-and-recovery):
142,260 bytes, SHA-256
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`,
matching `research/ocs/Sources/main`. Source identities are those in
[live-character-prerequisites.md](live-character-prerequisites.md#evidence-identity).
No CD32 substitution or complete rebuild was attempted.

File offsets below refer to that unpacked executable; subtract **0x20** for the
zero-based CODE-hunk addresses used by the isolated harness. Capstone 5.0.7 used
big-endian M68000 mode. Inspected anchors agree with the following source paths;
that agreement is bounded to the selected instructions.

| Unpacked file offset | Source anchor | Inspected behavior |
| --- | --- | --- |
| 0x1af74 | `Main.s:1356-1370` | Damage wrapper: shield, unsigned division, overflow fallback, word multiplication, call and return. |
| 0x1aff4 | `Main.s:1400-1421` | Cheat gates, resting modifier, flash increment and grunt guard. |
| 0x1b0d4-0x1b104 | `Main.s:1444-1461` | Unsigned fitness comparison, death call, subtraction, bands and redraw. |
| 0x1ac96 | `Main.s:1146` | Death entry used as an observation/interception boundary. |
| 0x1a6e8 | `Main.s:639` | Drowning damage call. |
| 0x1cda6 / 0x1cdac | `Main.s:4052-4053` | Landing damage call followed by original pending-fall clear. |

## Arithmetic and ordered writes

Source and selected executable inspection establish these operations:

1. `damage_fitness` receives an unsigned 32-bit hit in d0, actor in a0 and stats
   in a1. Shield word **87**, exclusively, logically shifts the hit right three
   before division. Physique is an unsigned 16-bit divisor. A zero divisor raises
   the CPU divide exception; it has no ordinary damage result.
2. DIVU uses the whole unsigned long dividend. A quotient at most 65535 is
   retained in the low word, with the remainder in the high word. Overflow instead
   loads integer **2684354**. The subsequent unsigned **word** multiplication by
   100 discards those high bits: overflow damage is **6291400**, while quotient
   65535 gives **6553500**. This is not a saturating percentage formula.
3. `decr_fitness` skips its writes when cheat-mode 3's byte is nonzero. This gate
   occurs after wrapper division, so it cannot prevent divide-by-zero there.
   Cheat-mode 2 logically shifts damage right two. It then sets the actor's
   white-flash byte to 255. Window type 4 shifts damage left two as a wrapping
   32-bit operation, writes window type 0 and requests redraw.
4. The stats fitness-flash byte adds `((damage >> 9) + 1)` modulo 256; only the
   low byte participates in both increment and accumulation. Zero damage still
   adds one. The grunt branch follows this update. Its count comparison is signed
   word against 100; this audit ran with count zero, bypassing audio. Source
   inspection shows count clearing/audio before the fitness comparison, but those
   audio branches were not CPU-tested.
5. Fitness is zero-extended from its word before an **unsigned long** comparison.
   Damage greater than fitness sets d0 to zero and calls death **without writing
   fitness**. Otherwise it subtracts the low damage word from fitness, then divides
   the resulting word by 655. Quotient zero calls death **after that fitness write**.
   Equality therefore writes zero; a surviving result must be at least 655.
   Even a zero-damage invocation can call death when starting fitness is below 655.
6. On the surviving branch, a change in integer fitness band `floor(fitness/655)`
   requests redraw; unchanged band does not. Death return also requests redraw.
   The compared bands are quotient words; DIVU remainder bits are not compared.

Neither helper itself checks death, extraction or control flags. A browser API
that restricts these states adds a contract boundary; it must not describe that
restriction as an original helper guard. `punch_fitness` (`Main.s:1372-1399`) has
additional RNG/claw work before calling `decr_fitness` and is outside this wrapper
contract. Direct `decr_fitness` callers bypass shield/physique conversion.

## CPU observations and interception limit

The existing ignored water harness setup was reused: Unicorn 2.1.4, explicit
**M68000** model, CODE loaded at zero, separate synthetic actor/stats/map/stack
storage, supervisor stack and a return sentinel. Each invocation was capped at
1,000 instructions. Twenty cases reached the sentinel; the zero-physique case
raised the expected divide exception at the original DIVU instruction.

**Death instructions were not executed in these cases.** At the identified
`handle_dead` entry a hook recorded fitness and pending fall damage, then modeled
an immediate return by popping its return address and moving PC there. Therefore
fitness ordering up to death entry is observed; subsequent results show original
caller continuation **conditional on that modeled return**. These runs do not
establish real death map/pad/corpse behavior, death register preservation, audio,
or a successful full landing/death transition. The separate
[ordinary-floor death contract](death-transition-contract.md) remains bounded as
stated there.

| Synthetic input, unless specified physique 100 | Observed result |
| --- | --- |
| Hit 0, fitness 65535 | Fitness 65535; no death entry; flash adds 1. |
| Hit 99, fitness 1000 | Quantized damage 0; fitness 1000. |
| Hit 199, fitness 1000 | Damage 100; fitness 900; division remainder discarded by MULU. |
| Hit 100, fitness 755 / 754 | Fitness 655 survives / fitness 654 seen at death entry. |
| Hit 1000 / 1100, fitness 1000 | Death entry sees fitness 0 / unchanged 1000. |
| Hit 0, fitness 654 | Death entry sees unchanged 654. |
| Hit 65535 / 65536, physique 1 | Damage 6553500 / overflow fallback 6291400. |
| Hit 4294967295, physique 65535 | Overflow fallback 6291400. |
| Hit 799, shield 87, fitness 1000 | Damage 0; fitness 1000. |
| Hit 100, window 4, fitness 1000 | Damage 400; fitness 600 at death entry; window becomes 0. |
| Hit 100, cheat 2 / cheat 3, fitness 1000 | Fitness 975 / unchanged 1000 with no white/flash writes. |
| Hit 0, flash byte 255 | Flash wraps to 0. |
| Hit 100, physique 0 | Expected CPU exception; no fitness/flash/white write. |
| Landing call, hit 1100 / 100, fitness 1000, pending fall 12345 | Fatal case sees pending fall 12345 at death entry; both continuations execute original CLR and return with pending fall 0. |
| Direct decrement, damage 2147483648, fitness 65535 | Unsigned comparison enters death with unchanged fitness. |
| Direct decrement, damage 1073741824, window 4 | Left shift wraps to 0; fitness 1000 preserved, window 0, redraw set. |

The two landing cases start at the original landing JSR, after its earlier
geometry/water/damage preparation. A synthetic map cell has no water. They verify
the original CLR instruction after return, not fall accumulation, support checks,
water attenuation, occupancy, pads or actual death execution. Pending-fall cleanup
belongs to this caller, not to `damage_fitness` or ordinary-floor death.

## Caller index and cleanup boundaries

The following is a **source caller index**, not a CPU audit of every callsite.
All references are in `research/ocs/Sources/`.

| Source callsite | Input/continuation relevant to this contract |
| --- | --- |
| `Main.s:639` | Drowning count times 200; immediate return after helper. Threshold and immunity are separate gates. |
| `Main.s:2727` | Fire path applies shield 86 attenuation first, saves damage, calls helper, restores damage and damages inventory even after helper return. |
| `Main.s:3259,4127`; `MonsterMovement.s:1264` | Owner lookup then fixed hit 2500; saved registers restored after helper return. |
| `Main.s:3700` | Owner lookup then half of d3; restores actor/address registers. |
| `Main.s:3822` | Nonzero mine result; after helper returns writes fire-flash duration/type, then restores saved registers. |
| `Main.s:4052-4061` | Landing applies water rules before the call; clears pending fall damage after return. Later deep-water check can clear it too. |
| `Main.s:4313` | Owner lookup then d3 hit; restores saved registers after return. |
| `ItemUsage.s:901` | Item damage-byte times animation-duration-byte, shifted left nine; restores saved hit/address registers, then calls inventory damage and writes fire-flash state. |
| `ItemUsage.s:1036` | Blast damage; restores saved registers, then writes fire-flash/redraw state. |

Selected executable call targets were separately inspected at file offsets
0xe272, 0x15b34, 0x15c88, 0x1a6e8, 0x1c000, 0x1c542, 0x1ca24,
0x1cb20, 0x1cda6, 0x1ce84 and 0x1d070. These target the same wrapper.
Only the landing JSR continuation was CPU-tested here. Source inspection also
found the `DECR_FITNESS` macro (`Main.s:1347-1354`), punch continuation (`1397`),
poison path (`1534`, clears accumulated poison after return), and a separate
squash path (`4297`, passes d3 directly) calling `decr_fitness`. These bypass the
wrapper and must not be silently routed through physique division.

## Local reproduction and limits

From the `damage-evidence` worktree, with the existing local water executable
recovery present:

```powershell
python .local/damage-evidence/probe.py
python .local/damage-evidence/callers.py
python .local/damage-evidence/run_cases.py > .local/damage-evidence/results.json
python .local/damage-evidence/verify.py
```

The first two commands emit original-derived listings and must stay local.
`run_cases.py` reads the existing
`../water-evidence/.local/water-evidence/ocs-executable.raw` without modifying it.
`verify.py` checks all 21 finite results against an independently expressed
integer formula, expected death-entry fitness, flash wrap and landing cleanup.
No original payload or derived instruction listing is a public fixture or CI input.

One bounded source/disassembly/harness pass; no repairs to original instructions,
no failed harness repair attempts, no recursive delegation. Model: inherited
gpt-6.1-sol; token usage unavailable. Documentation-only public change: no browser
surface or simulation change to test. Remaining blockers include real ordered death
execution with map/pad effects, audio, full caller guards/continuations, drowning
threshold extremes and complete-map/checkpoint reconciliation. This evidence does
not remove the activation gates in the linked prerequisites.
