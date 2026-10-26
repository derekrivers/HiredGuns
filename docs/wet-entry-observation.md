# Wet-entry threshold observation

26 October 2026, pinned implementation base
`bb8908822fd630becffd69be7784f51c4616bed0`. The single next observation in
[Training43 completion](training43-completion.md) is complete: **the selected
eligible actor's drowning threshold is 38; post-increment counts 37 and 38 do
not call damage, and count 39 calls `damage_fitness` with 7800**. The original
damage instructions reduce fitness from 65535 to 60435 without reaching death.
This is an isolated executable observation, not a traversed wet route or a
complete environmental transition. No gameplay, world, inventory, death or save
activation is included.

## Inputs and execution boundary

The recovered OCS executable is the 142,260-byte file with SHA-256
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`.
Its packed identity, recovery and CODE-hunk convention are recorded in
[water executable evidence](water-executable-evidence.md). No CD32 replacement
or instruction patch was used. The helper starts at the established `Main.s`
drowning anchor and executes through the threshold branch and original damage
wrapper when called. Original inventory water processing and weight calculation
also execute; this observation does not expand the existing inventory contract.

The ignored diagnostic reads the exact privately nominated wet cell and approach
from `training43-boundary/.local/training43/coverage.json.nextObservation`, checks
the editor map digest and qualifying water, and supplies the target position and
original cell word to an isolated actor. It copies the first canonical nonimmune
OCS selection's 146-byte stats construction, empty equipment, ten starting
carried entries and twenty cleared carried entries. The OCS item table is loaded
for the original item/weight helpers. The selected record index, record hash,
coordinates, map word and instruction traces remain private.

This setup is **source-derived input construction** following the documented
selection copy, with fitness set to the initialization helper's established
65535 override. Selection, initialization, movement, occupancy and immersion
timing are not executed here. The selected roster fitness happens to equal that
override; the separate copied-roster profile consequently repeats the same
three threshold outcomes. Control is enabled, death/extraction flags and spells
are clear, and the grunt counter is zero to bypass audio. Runtime storage and
supervisor stack are isolated, not an Amiga boot or a real mission state.

Identity checks also pin:

| Input | SHA-256 |
| --- | --- |
| Editor Training43 | `646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c` |
| OCS roster payload | `79a712653bcbef89f4579ef27a036897aa43dd74bbd965dd440deac13c3e5439` |
| OCS English item table | `633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc` |
| Private coverage input | `f27e55434913dd28fed6a54c2397ebf2aaa82a0ce8ea1a4a136153e022d5d3d7` |

## Observed arithmetic

Python 3.13.7, Unicorn 2.1.4 with explicit **M68000** model and Capstone 5.0.7
in big-endian M68000 mode were used. CODE is loaded at zero as in the existing
water/damage harnesses. All **31 cases** reached the return sentinel within the
10,000-instruction cap. Each run asserts seventeen original inventory-helper
visits, the post-increment counter, intermediate division/extension registers,
damage call presence and supplied hit against an independently expressed integer
oracle. Trace records include original instruction, file offset, d0/d1, status
register and counter before each instruction in the drowning slice.

The original instruction sequence establishes the following bounded arithmetic:

1. Increment the underwater word modulo 65536. Multiply unsigned physique and
   fitness words to a 32-bit product.
2. Unsigned divide the product by **655** (the assembled integer `65536/100`).
   A representable quotient occupies the low word, remainder the high word.
   On quotient overflow, the observed register retains the dividend; there is
   no overflow recovery branch in this slice.
3. Sign-extend the resulting low word to a long, then unsigned divide that long
   by **400**. This division can overflow after negative sign extension. Its
   observed overflow also leaves the dividend unchanged.
4. Compare the incremented counter and resulting threshold as **signed words**.
   Skip damage when counter is less than or equal to threshold. Otherwise write
   drowning indicator 150 and pass unsigned counter-word times 200 to damage.

The selected initialized profile gives threshold 38. Counts before invocation
36/37/38 become 37/38/39. The first two leave the initially zero indicator clear;
the third writes 150, supplies hit 7800 and observes effective damage 5100.
No selected-data case enters death.

The remaining profiles deliberately replace only physique/fitness or the
counter with synthetic words. The following table reports executed outcomes;
these values do not describe another original actor or reachable gameplay state.
Each physique/fitness profile tests threshold minus one, equality and plus one
as **stored words modulo 65536**, so adjacency across the sign boundary does
not imply signed ordering.

| Synthetic physique / fitness | First DIVU | Second DIVU | Threshold word (signed) |
| --- | --- | --- | --- |
| 655 / 32767 | Quotient 32767 | Quotient 81 | 81 (81) |
| 655 / 32768 | Quotient 32768 | Overflow after EXT | 32768 (-32768) |
| 655 / 65535 | Quotient 65535 | Overflow after EXT | 65535 (-1) |
| 1024 / 41919 | Quotient 65534 | Overflow after EXT | 65534 (-2) |
| 1024 / 41920 | Overflow, product 42926080 retained | Quotient 0 | 0 (0) |
| 65535 / 32768 | Overflow, product 2147450880 retained | Overflow after EXT | 32768 (-32768) |
| 65535 / 65535 | Overflow, product 4294836225 retained | Quotient 0, remainder 1 | 0 (0) |

For threshold -32768, stored counter 32767 calls damage, 32768 skips it and
32769 calls it. For threshold -1, counters 65534/65535 skip and wrapped zero
calls with hit zero. At the selected threshold 38, explicit post-increment
counter edges 32767/32768/65535/0 produce call/skip/skip/skip, with hit 6553400
on the first case. The final case executes the increment from 65535 to zero.
These observations rule out replacing the slice with a single unbounded
percentage calculation or an unsigned threshold comparison.

## Death interception and limits

The harness follows the existing
[damage evidence](damage-fitness-evidence.md#cpu-observations-and-interception-limit)
interception policy: at `handle_dead` entry it records fitness, pops the return
address and resumes the original caller. **No death instructions execute.**
Any result after an intercepted death is conditional on that modeled immediate
return. The recorded damage-call decision and its supplied hit precede this
interception. Four synthetic cases enter this interception boundary: both
adjacent counter probes around threshold -32768 with physique 655, the above
threshold -2 probe, and the selected-stat counter 32767 probe. Nothing here
establishes real death register preservation,
occupancy removal, pads, corpse writes, all-dead completion or save consistency.
The synthetic DIVU extremes are arithmetic probes, not survivability claims.

The editor cell remains a diagnostic input; runtime43 map layers differ from
the editor layers as already documented. The actor's dry approach, descent,
falling, inventory destruction consequences, full water region and environmental
counter scheduling remain outside this observation.

## Smallest next implementable transition

The disconnected implementation is now documented in
[drowning-decision-contract.md](drowning-decision-contract.md), with authored
synthetic regression tests. It does not compose the original caller or activate
environmental mechanics.

The evidence now supports a **disconnected pure drowning-decision transition**
for an already-qualified nonimmune immersion invocation. Its inputs are
unsigned 16-bit underwater count, physique and fitness, plus the existing
indicator word. Its outputs are the wrapped next counter, unchanged indicator
on skip or 150 on call, threshold word, both division-overflow observations,
and either no hit or the unsigned 32-bit `nextCounter * 200` damage request.
It must preserve the two DIVU operations, intervening EXT and signed CMP
literally. No damage, inventory or world mutation belongs inside that decision.
The table and private traces provide concrete synthetic test vectors.

Prerequisites are explicit word validation, an agreed literal arithmetic policy
for overflow, and separate caller qualification for alive/controlled/unextracted,
water depth and breath immunity. Inventory processing precedes immunity in the
original helper; a future caller must preserve that order when composing the
separate transitions. Later damage composition can use the existing disconnected
damage contract. Live wet activation still requires integrated descent/fall,
ordered inventory effects, real death/control/occupancy and atomic checkpoint
evidence; this arithmetic result does not authorize it.

## Local reproduction and validation

From `wet-entry-observation`, retaining the existing private recovery files:

```powershell
python .local/wet-entry/observe.py > .local/wet-entry/summary.json
Get-FileHash .local/wet-entry/observe.py,.local/wet-entry/results.json -Algorithm SHA256
npm run check
$env:HIRED_GUNS_TRAINING_MAP = (Resolve-Path '../research/original/HiredGunsCD32_DevFiles/Maps/Game/Map43_Training/43.map').Path
npx playwright test tests/browser/extraction.spec.ts
```

The observer verifies executable/map/roster/item identity before running, writes
the original-derived report only to ignored `.local/wet-entry/results.json`, and
asserts each case against the integer oracle. Preserve previous results before
rerunning if needed. It reads sibling evidence files without modifying them.
The diagnostic is private because it contains original-derived instruction
coordinates and loads original content; public CI needs none of those inputs.
The original executable, map, roster and item inputs are read-only; mutations
occur only in the isolated emulator memory. Validation: `npm ci`; `npm run check`
(127 unit tests, lint, TypeScript and production build) passed. All four
extraction browser cases passed: three synthetic cases, then the local
Training43 case run separately with its explicit private map input.

| Local artifact | SHA-256 |
| --- | --- |
| `observe.py` | `e279ac50c1530e24b2d646347f90e7a935e4df19d1050950360fd04bb4be52e0` |
| `results.json` | `53c54ba8aa1ba77322c1ce9314c465055f60994a17b1b1f978ba3e83fbe8e180` |

Model: gpt-6.1-sol, medium implementation. One bounded harness implementation,
successful initial 28-case execution, then explicit target-coordinate setup and
one adjacent first-DIVU boundary profile added for the final 31-case run; no
failed repair cycle, no original instruction changes, no recursive delegation.
Independent reproduction prompted an explicit coverage-input digest assertion;
the subsequent 31-case rerun preserves the exact results digest above.
Token usage unavailable. Independent exact-head review and integration remain
coordinator-owned gates.
