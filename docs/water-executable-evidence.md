# Water scan executable evidence

26 October 2026. The archived OCS executable confirms the inspected water
routine's register discrepancy. At the inspected drowning caller, equipment
and **sixteen** carried entries are scanned. This resolves that local question
for the identified executable; it does not establish whole-game source parity
or enable live original mechanics.

## Identity and recovery

Archive paths are relative to
`research/original/HiredGunsCD32_DevFiles/`, alongside the repository worktrees.
The input `Test/HiredGuns/Hired Guns` is a 67,813-byte RNC1 container, SHA-256
`93c341c0f26ecf9956bb7b320a508681aba1ade1183eeccf5db4f532027268fa`.
The existing ignored diagnostic
`repo/.local/item-recovery/recover_rnc1_items.py` recovered 142,260 bytes in
twelve chunks. Both header CRC-16 checks passed: packed **7370**, unpacked
**d8d6** (polynomial a001, initial zero). The recovered file matches
`research/ocs/Sources/main` byte for byte, SHA-256
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`.

The CD32 executable and `research/snapshot/Sources/main` instead share SHA-256
`35fcef83f9557ede89e1a9ce72b261b276489afbeff59cc5c2698f78c9020790`
(148,412 bytes). They are a separate revision and do not replace the OCS
baseline. Matching the recovered executable to the OCS build artifact and
selected source anchors is narrower than reproducing a full build from source.
Source hashes remain those in
[live-character-prerequisites.md](live-character-prerequisites.md#evidence-identity).

## Selected disassembly anchors

Capstone 5.0.7, configured for big-endian M68000, decoded the recovered file.
All offsets below are **unpacked executable file offsets**, hexadecimal. The
single CODE hunk begins at file offset **0x20** and contains 129,476 bytes;
subtract 0x20 for its zero-based code addresses. These are not packed-file
offsets or hardware runtime addresses. No original bytes or disassembly
excerpts are published here.

| File offset | Source anchor | Finding |
| --- | --- | --- |
| 0x1a676 | `Main.s:600` | Drowning helper entry and actor guards. |
| 0x1a69e | `Main.s:612` | Loads d1.w with 15 before the water-depth rotate. |
| 0x1a6aa | `Main.s:617` | Calls the water inventory routine before breath immunity tests. |
| 0x146a8 | `Controls&Movement.s:5849-5851` | Spell-water 100 bypasses the complete routine. |
| 0x146b8 | `Controls&Movement.s:5856` | Processes the equipment entry separately. |
| 0x146c0 | `Controls&Movement.s:5859` | Loads 29 into d0.w. |
| 0x146ca | `Controls&Movement.s:5862` | DBF decrements d1.w and repeats the carried-item helper. |
| 0x146d8–0x1473a | `Controls&Movement.s:5870-5914` | Item helper does not write d1. |
| 0x1d8d0 | `Main.s:5309-5351` | Initialization helper with stats/inventory copy and runtime setup. |

The routine saves/restores d1 around the scan. Its DBF therefore starts at 15
on this caller path and visits carried indices 0–15. This is confirmed
executable behavior at these anchors, rather than a proposed correction to the
source. Other callers and revisions require their own register tracing.

## Bounded CPU observations

An ignored local diagnostic loaded the CODE hunk at address zero in Unicorn
2.1.4 with the **M68000** CPU model. Zero is also the relocation base for this
isolated code load. Separate mapped storage held synthetic actor, stats,
inventory, item record, map cell, source record, stack and return sentinel.
Each helper invocation was capped at 10,000 instructions and reached that
sentinel. The original instructions, including weight calculation, executed;
no water-loop patch or replacement item helper was used. This is an isolated
CPU harness observation, not an Amiga boot, playable level or physical playtest.

The immersion cases started at the drowning helper with an eligible controlled
actor, qualifying water, underwater count 7, and 31 synthetic item entries
(equipment plus thirty carried). Every entry began with damage 1; a synthetic
item definition added damage 1 without destruction. Observations were:

| Synthetic condition | Item-helper visits | Resulting entry damage | Underwater count |
| --- | --- | --- | --- |
| Race 1, spell-water 0 | Equipment + carried 0–15 | Visited entries 2; carried 16–29 remain 1 | 0 |
| Race 0, spell-water 97 | Equipment + carried 0–15 | Visited entries 2; carried 16–29 remain 1 | 0 |
| Race 0, spell-water 100 | None | All entries remain 1 | 8 |

Thus breath immunity does not spare inventory, whereas spell-water 100 spares
inventory without supplying the inspected spell-97 breath reset. The spell-100
case remained below its synthetic drowning threshold; damage/death boundaries
were not tested.

The initialization helper separately copied a synthetic 146-byte stats block,
equipment and thirty carried entries. Starting fitness 123 became 65535;
stats dead word 256 was copied to runtime dead; fitness flash cleared; bumping
became 65535; footstep/grunt periods copied; supplied x/y/floor 3/4/5 copied.
Synthetic RNG seed 42 advanced to 46599 and direction 3. These observations
cover that helper, not roster selection, full initialization or map occupancy.

## Local reproduction and remaining limits

In the supplied workspace, ignored diagnostics and reports live under
`water-evidence/.local/water-evidence/`. From that worktree run:

```powershell
python .local/water-evidence/water_probe.py
python .local/water-evidence/run_cases.py
python .local/water-evidence/verify_traces.py
```

The first command rechecks packed/unpacked identity and records selected
disassembly locally; the second reruns the three synthetic immersion cases and
initialization helper; the third asserts visit addresses, unchanged tail,
damage/reset outcomes and initialization results. Original content and derived
instruction listings stay ignored and are not part of public reproduction or
CI fixtures.

No rebuild or full-system emulator audit was attempted. Diagnostic setup first
hit a local Python module-name collision, then exposed Unicorn's default CPU
model and stack-bank selection; correcting those evidenced setup issues
allowed the bounded runs above. No source repair was made. Model: inherited
gpt-6.1-sol; token usage unavailable; no recursive delegation.

Live activation still needs the remaining arithmetic, drowning/death, landing,
extraction, occupancy/pad/corpse and coherent checkpoint evidence described in
[live-character-prerequisites.md](live-character-prerequisites.md#activation-blocker-and-bounded-next-evidence).
The source's scan discrepancy has been resolved for this baseline; choosing
literal behavior versus an explicit adaptation remains an implementation
decision. No mechanics or campaign travel are activated here.
