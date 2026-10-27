# Pure initial inert TYPE1 support

27 October 2026. `transitionType1Support` in `src/character/type1-support.ts`
extends the disconnected initial dry support transition on accepted base
`4f68d1ea67302d7ca94adea49c7c053610215e0a` to computed fatal outcomes.
The [initial observation](type1-support-observation.md) and
[fatal observation](type1-fatal-support-observation.md) bound the source/CPU
evidence. No world, scheduler, inventory, save, UI or artwork changes.
Training43 remains incomplete.

Input has exactly `grid`, `actor`, `oldCell`, `stats`, `feedback`, `cells`,
`cheats`, `leaders` and `redrawFlag`; the exported interface enumerates every
nested field. All objects require exact own data descriptors, including hidden
and symbol keys; accessors reject without execution. Exact nonenumerable data
is accepted and copied. Leaders are an exact dense pair of unsigned words 0..4.
All numerical storage must be unsigned integers of its declared width, even if
unchanged. Snapshot, geometry validation and arithmetic eligibility complete
before any candidate or records are exposed. There are no callbacks or input
writes, and all output storage is independent.

Grid dimensions are 1..256; labels are bounded row-major logical indices
`(floor * depth + y) * width + x`, never executable addresses. Actor pose,
current label and current-cell label must agree; floor is at least two. Below
and second-below labels must be exactly one and two vertical strides below.
The bounded incoming old-pose witness must match the old label. This local
correspondence grants no whole-map, actor, roster or source authority.

Actor storage follows the dry-descent actor slice: byte pose/control, word
fitness/dead/window/environment counters/delay/head fields, long pending/weight/
labels, party/direction 0..3. Both dead words initially zero, window=0, control=1,
gender=0, grunt=99 and cheats=0. Physique is 1..65535; agility is any unsigned
word, including zero, and weight any unsigned long. Neither weight nor agility
is a division input. Head family is 32/36/40/44 by owner; blockNumber is family
plus direction and must match packed current occupancy. Owner variant must
match party plus eight for nonzero fireWhite, otherwise four for nonzero shield,
otherwise zero. White has priority. Requiring coherent incoming head and feedback
is intentionally stricter than merely invoking the original helper. Observed
controls 2 and 255 remain excluded by this strict control-1 API.

Current floor mask `0x601` is zero, immediate below block mask `0x1f802` is
exactly `0x802`, and second-below block mask is zero. All three first-layer cells
have zero water `0x60004` and auxiliary `0xf0000020` masks; both lower cells
exclude pressure pads. Current second/third words are unrestricted unsigned
longs. Other supports, wet paths, pads, mines, stairs, teleport/squash, descent,
search traversal and ineligible guards reject atomically.

Pending zero produces null arithmetic and no damage or death call, including
fitness zero. Nonzero pending is the full unchanged requested hit. Shared
`computeNormalDamage` arithmetic applies shield exactly 87 before unsigned DIVU,
retains mathematical quotient/remainder, detects quotient greater than 65535,
then multiplies the low word of either quotient or overflow fallback
`floor(0x0fffffff / 100)` by 100. `multiplierWord` is explicit; mathematical
remainder does not claim packed CPU output on overflow. Only this arithmetic
is reused. The ordinary-floor death validator is unchanged; no floor is fabricated
or supporting block erased.

The candidate first writes delay word zero. Actual damage writes fireWhite byte
255 and wrapped flash byte `(old + (damage >>> 9) + 1) & 255`. If damage is at
most fitness, it writes the subtracted fitness, including unchanged fitness for
actual zero damage. Greater damage skips that write and retains incoming fitness.
Death occurs when damage exceeds fitness or the subtraction leaves less than 655.
Equality therefore writes zero then dies; actual zero damage at fitness 654 dies,
while 655 survives. Pending zero at fitness zero still skips damage and death.

Fatal writes set the high byte of each initialized dead word to 255 (word
`0xff00`); their records retain byte width and byte before/after values. Each
leader equal to partyIndex+1 is cleared independently. Old reference becomes
current; the candidate oldCell witness becomes the current label and unchanged
current pose. Current person occupancy and owner variant are removed with a
long write. The non-pad release returns before support evaluation. Immediate
TYPE1 accepts the same current cell without advancing or adding a cell. A
separate long write clears current auxiliary bits, another inserts the corpse;
two current-second long writes clear auxiliary owner data then insert party
owner, including redundant owner-zero insertion. Current reference, pose, head,
control, window, weight, agility, breath/drowning, shield/gender/grunt, current
third and both lower first words remain unchanged. All other opaque bits survive
the literal masks. No party control transfer occurs.

The death return precedes a redraw byte write of 255. Survival writes redraw only
when `floor(fitness / 655)` changes. Actual damage returns before pending long
zero is written. The final current first-word reread sees the changed corpse on
death and has water mask zero; no second pending clear occurs. The outer helper
returns current. Status is `damage-skipped`, `survived` or `died`.

`records` retain exact ordered writes with target, width and before/after,
including redundant clears/inserts. Return records now distinguish
`release-return` and `death-return` (logical current cell), `damage-return`
(actor/stats/current after restoration), and final `helper-return`
(actor/stats/current). This evolves the earlier schema: its actual-damage
`helper-return` is now `damage-return`; an explicit outer `helper-return` follows
the reread on every path. No-call records contain only delay write, reread and
outer return. `helperReturn` retains its existing actor/stats/current shape.
These records are inert audit data, not a complete instruction/read/stack trace.

Validation: 77 public synthetic tests cover all 48 owner/direction/variant
combinations on survival and death, feedback priority, leader none/either/both/
unrelated, literal equality/overdamage/zero-damage fitness, exact ordered fatal
writes and returns, redundant owner zero, preserved storage/output independence,
DIVU overflow fallback, unsigned widths, exact descriptors and excluded geometry/
lifecycle/audio/control. Relevant unit tests and typecheck pass. Coordinator owns
full check/browser, independent current-commit review and CI gates.

Private comparisons account for every frozen fatal-observer input without
rewriting it. Worker 200: 192 accepted (103 fatal), complete modeled candidates,
2,018 ordered writes and 2,799 records match; eight controls 2/255 reject.
Independent 154: 114 accepted (107 fatal), complete modeled candidates, 1,711
writes and 2,266 records match; forty controls 2/255 reject. The worker comparison
also decodes every modeled final actor/stats/feedback field and all supplied cell
words, leaders and redraw directly from final CPU memory. Independent candidates
are reconstructed from its exact writes and full-memory replay assertions.
Return ordering comes from executed instructions; address-to-label translation
uses only the fixture's explicitly initialized logical correspondence. Coordinator
fresh reproductions retain original `__file__`/BASE, redirect only OUT into new
ignored directories, and match both frozen authoritative report hashes.

Historical completed eligible fixtures retain the stricter coherent-head gate:
23 worker candidates match 108 writes/175 records, with 34 intentional incoming
head/feedback rejections; 16 independent candidates match 80 writes/128 records,
with 39 such rejections. Six original guards remain outside this API. The one
coherent worker stopped-prefix input is now supported by the new fatal evidence;
four independent stopped-prefix inputs still reject incoming head/feedback.
The separate coherent 96-case report retains 89 completed candidate comparisons,
526 writes/792 records; its seven stopped-prefix inputs are now supported by the
new evidence. All historical prefixes remain stopped reports: no completed
candidate or return is attributed to them. Originals are untouched and private
source bytes, addresses, coordinates, scripts and results remain ignored.

Model: gpt-6.1-sol medium; one implementation attempt, no failed implementation
repair cycle or recursive delegation. One private comparison path setup was
corrected. Token usage unavailable. No worker commit.

The smallest next nomination is a separately reviewed disconnected eligibility
extension for observed controls 2 and 255 under the same exact storage/geometry,
using the existing evidence; it remains unstarted.
Integrated falling, full team/control/occupancy/pads/corpses, wet traversal and
source-bound atomic paused checkpoint recovery still gate live activation.
Shooting, live backpack and full original recovery remain undemonstrated.
Physical controller/TV/full-level evidence is separate. World/checkpoint 3 and
roster-plan 1 remain unchanged; Locations revision mismatch still gates campaign.
