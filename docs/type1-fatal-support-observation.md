# Fatal initial TYPE1 support: bounded original evidence

26 October 2026, accepted base `c13909a5cd367e0c72bd43069a2a64027e1c0ba7`.
Evidence only. The pinned, unmodified OCS executable now completes **200 natural
returns: 111 fatal and 89 survival/no-call references**, entered at the real
per-player helper before its guards. No helper is intercepted, return forced,
current reference invented, floor normalized or supporting block removed. There
is no implementation or world, actor, inventory, save, renderer or artwork change.
Training43 remains incomplete.

The exact bounded geometry is unchanged from the
[initial support observation](type1-support-observation.md): dry current with no
floor, owned person occupancy and no auxiliary object; immediate lower inert
TYPE1 support; second-lower empty block bits; no pads. All supplying words are
explicitly initialized. The death search needs **no additional cell or column**.
It reads the already initialized immediate lower word, rejects the four stair
identities, and accepts TYPE1 at the small-block support comparison. The search
reference stays on current; there is no vertical advance. The found-floor branch
checks current auxiliary bits and installs the corpse there despite its absent
floor bit. Other supports, auxiliary objects, doors, stairs and search traversal
remain excluded.

This also corrects the historical stopped-prefix description. The previous
observer stopped before the first excluded **stair comparison**. Its immediate
lower-cell read, block mask and nonzero branch had already executed. It did not
stop before the first search read. Its frozen report and stopped status are
unchanged; it supplied no corpse placement or completed fatal return. The new
continuations establish those outcomes separately.

Source deduction from `Main.s` death handling and the executed M68000 instructions
agree. The complete fatal order is:

1. Clear the delay word; write fire-white byte and wrapped fitness-flash byte.
2. When damage is at most fitness, write the subtracted fitness word, including
   unchanged fitness for actual damage zero. Overdamage skips this write and
   retains incoming fitness; death does not normalize it.
3. Set the high byte of stats and runtime dead words, producing word 65280 from
   initialized zero words. Clear each matching leader word independently.
4. Write old-reference long equal to current; remove current person occupancy
   and its owner variant with a long write. The actual non-pad release helper
   returns before the support decision continues.
5. Accept the immediate TYPE1 support without moving the search reference.
   On current first word, clear auxiliary bits with one long write then insert
   the corpse with another. On current second word, clear auxiliary owner data
   then insert this actor's owner with another long write. Redundant writes,
   including owner zero, remain in the exact sequence.
6. Restore the death helper's saved references and return to damage; write redraw
   byte 255, then return from damage. At the caller's actual return point A0/A1/A2 name
   the same actor, stats and current cell. Pending still has its original value.
7. Clear that actor's pending long only after the actual helper return. Reread
   the changed current first word. Its water mask is still zero, so no second
   pending clear occurs. The outer helper returns naturally with current as its
   cell reference and the original return stack balanced.

Current reference, position, floor, direction, head family/block fields, weight,
agility, breath/drowning counters, shield, gender, grunt, control and window
storage remain unchanged. Current third word and both lower first words remain
unchanged. Old reference becomes current even though pose does not move. The
current first/second corpse words, feedback, fitness when subtracted, dead flags,
matching leaders, delay, redraw and pending are the only modeled changes. An
unmatched leader stays intact; no party control transfer is performed on this path.

| Authored boundary | Executed outcome |
| --- | --- |
| Nonzero pending, actual damage 0, fitness 654 / 655 | Death with fitness 654 / survival with fitness 655 |
| Damage equal to fitness | Subtraction writes zero, then death |
| Damage above fitness | Death retains initial fitness, without a fitness write |
| Pending zero and fitness zero | No damage call or death; delay alone is written |
| Unsigned DIVU quotient overflow | Original fallback then low-word multiplication executes; resulting fatal path returns |
| Exact shield 87 and neighboring values | Only 87 shifts the hit before division |

The 80 initial coherent references span all owners/directions across five
white/shield combinations. Sixteen arithmetic references add the boundary cases;
80 further fatal fixtures span those same owner/direction/feedback combinations.
Sixteen leader fixtures cover both leaders matching, only the second matching,
an unrelated first leader and mixed matching/unrelated leaders. Eight fatal
fixtures cover nonzero control values 2 and 255 across all owners; other cases
use control 1. Those controls pass the real eligibility test and remain unchanged.
This is initialized eligible-slice evidence, not evidence for control zero,
ineligible guards, a complete team or every possible lifecycle/control value.

Gender 0 and grunt count 99 bypass audio naturally. Both dead words initially
zero, window 0, cheats zero and nonzero physique are explicit prerequisites.
No scheduler, wet path, descent, general fall, mine, pad action, teleport, squash,
other block type or multi-cell traversal executes. These synthetic initialized
invocations do not establish gameplay reachability, main-loop cadence, source/map
authority or physical acceptance.

Every case asserts exact ordered non-stack writes, including target, width,
before and after values. Every write, including bounded stack writes, replays
against the entire initial 8 MiB image; replay must equal actual final memory.
Code is read/execute protected and rechecked byte-for-byte. Reads are restricted
to explicitly initialized actor/stats/cell/global storage or the bounded,
initialized stack; maximum stack use is 112 bytes within a 256-byte bound.
Decoded instruction and branch exclusions independently guard execution.
Maximum execution is 145 instructions within a 350-instruction limit. Actual
helper-return snapshots, changed-cell reread and final reference/stack assertions
pass for all 200 cases: 2,138 ordered non-stack writes and 2,537 inert audit records.
There is no newly stopped continuation in this report.

Only explicit arithmetic fields are compared with `computeNormalDamage`: requested
and shielded hit, mathematical quotient/remainder, overflow classification,
multiplier low word and damage. All 199 real calls match; the CPU decrement-entry
operand independently matches damage. Mathematical remainder is not presented as
packed CPU DIVU output on overflow. No ordinary-floor death validator is invoked,
no whole fatal candidate API comparison is claimed, and no geometry is fabricated.

Executable/source pins remain those in the linked initial observation. The new
observer SHA-256 is `54e7de1b3a4dc7ccbc90d78a81b04f5ae7f11edcb3cb4db964773af5d7fc4140`;
report `61507db91c1d9e87ae7bae5fcd475396f04f75456a528ab3d7b2e1dbd7c2f958`.
Python 3.13.7, Unicorn 2.1.4, explicit M68000 and Capstone 5.0.7 are used. Private
sources, coordinates, addresses, decoded listings, scripts, traces and results
remain ignored; reproduction details are in the private handoff. Frozen prior
observers/results are untouched. Coordinator owns final check/browser, independent
review and CI gates; this evidence adds no public executable behavior or tests.

Exactly one **next implementation**, unstarted, is nominated: extend the existing
disconnected pure initial TYPE1 support transition to computed fatal outcomes in
this same bounded geometry. Retain its complete exact-own unsigned input snapshot,
logical grid/old/current/vertical correspondence, owned coherent head/feedback,
current first/second/third and two lower first words, all actor/stats/feedback/dead/
control/window/audio/cheat storage, two initialized leaders and redraw. Initially
keep control 1 and the existing lifecycle/audio prerequisites; broader observed
nonzero controls need not widen the implementation. No omitted storage may be
invented. Reuse arithmetic only; do not weaken ordinary-floor death validation.

Its candidate must expose the actual changed corpse/owner words, old=current,
preserved current/pose/head/control and lower storage, literal fatal fitness,
dead words, matching leader clears, feedback/redraw/delay/pending, actual current
helper-return label and changed-cell reread. Preserve exact ordered before/after
writes and separate death/damage/helper-return records, including redundant corpse
owner-zero writes. Validate the entire storage/geometry atomically before any
candidate, and reject excluded branches without mutation. The now-observed search
requires only the existing bounded column and initialized current second word;
no larger map, traversal, team adapter or synthetic return receipt is justified.
This task supplies evidence only and does not start that implementation.

Full team/control/occupancy, pad/corpse installation, wet traversal and source-bound
atomic paused checkpoint recovery still gate live activation. Shooting, live
backpack and full original recovery remain undemonstrated. World/checkpoint 3,
roster-plan 1, Locations campaign mismatch and physical controller/TV/full-level
acceptance gates remain unchanged.

Model: gpt-6.1-sol medium; one observer authoring attempt. Strengthening the search
read assertion exposed the precise historical stop boundary; disassembly supplied
new evidence for one correction. Added explicit initialized stack, return snapshots,
leaders and eligible controls. No failed implementation repairs, delegation or
worker commit. Token usage unavailable.
