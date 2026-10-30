# Training43 selected-team wet lifecycle (v18)

Candidate implementation; independent review and integration remain pending.

This optional mode runs in the existing four-view application on the verified
Training43 editor geometry. Load the local test, open **Local character roster /
team preparation**, choose four different characters, and **Apply team**. At
fresh PAUSED tick zero choose **Enable selected-team wet lifecycle**, then Start
mission. Use 1–4 to select, W/S to move, A/D to strafe, Q/E to turn, and Esc to
pause. Save and load checkpoints while paused; Retry reconstructs the same
selected team and fresh static source world.

Selection is the existing canonical bank-zero workflow. All three original
inputs are snapshotted, hashed and reparsed. Race comes from the selected raw
record; initialized physique, fitness, inventory, actions and source weight come
from the existing verified initializer. No ready-team indices are temporarily
substituted. This is a selected-team adaptation, not original ready-preset or
whole-runtime parity. Race 1 remains breath immune after inventory processing;
race 4 is nonimmune. Spell 97 grants breath immunity, whereas spell 100 only
skips inventory; the live profile admits the initialized clear spell state.

The accepted indivisible wet lifecycle still owns drowning, inventory, damage,
fall scheduling, both dead words, head removal, source corpse search and control
checks. A corpse is placed only at its source-derived unoccupied target. Its body
can retain a different wet pose. Occupied targets, corpse replacement, unsupported
pads, doors, vertical branches and search cases refuse the whole candidate.
There are no injury buttons, routes, teleports or authored replacement geometry.
General corpse loot and item transfers are outside this mode.

The new mission policy follows the bounded Main.s `check_exit` ordering:

1. Count a dead runtime word or uncontrolled slot once in both source counters;
   count a living exit window only in the inside counter.
2. Four dead slots cause all-dead failure before timeout or exit.
3. In action mode, a zero clock causes timeout before exit completion.
4. A living exit completes the first-exit rule. Cooperative extraction retains
   the explicitly labelled requirement that all four actors actually exit.

The live profile admits exactly four controlled actors (control 1, view window
0); uncontrolled and other window branches refuse before partial writes. Exit
retirement is represented by the existing mission state. Dead words, not zero
fitness, govern death: overdamage can retain positive fitness. Dead actors keep
their view and keyboard assignment until explicit selection. The all-dead outcome
is visibly distinct from timeout, remains paused on recovery and freezes future
simulation. Navigation retains its existing exploratory objective; four deaths
also terminate this new profile.

V18 uses scenario `training43-selected-wet-party-v1`. Its canonical command tuple
is `[precedingIdle, commandCount, ...codes]`, with code `actorId * 6 + action`
(forward, backward, strafe-left, strafe-right, turn-left, turn-right). Codes are
sorted with one per actor. Adjacent equivalent command runs without idle merge;
one positive trailing idle tuple is permitted. Malformed, noncanonical,
accessor, prototype, sparse and excessive histories refuse before replay.

V18 bounds packed tuples to 256, internal history to 513 entries, total ticks to
45000, and the complete UTF8 wrapper to **strictly less than 24576 bytes**. The
four independent source approaches require over 128 command records; compact
encoding supports that actual workflow without raising the old formats' limits
or removing full source-bound state. Existing snapshot depth, collection, string
and aggregate-work limits remain. Every prospective live command checks its
future serialized size before exposing any effects. This is not an unlimited
session or a promise to reach the original 99-count deadline.

Recovery reconstructs the canonical baseline and entire chronology, derives the
outcome again, and compares all saved leaves: source/team identity, all four
inventories and weights, health, body/current-old, both dead words, heads and all
three map planes, corpse ownership/search, leaders, controls, schedulers and
mission. Caller objects and intrinsic raw bytes are owned before the first await.
No saved health, corpse, reason or source claim becomes authority. Restore is
paused; continuation cannot repeat inventory, damage or death effects.

The new public discriminator is checked through its own data descriptor and an
ordinary prototype before reading it. Existing v1–v17 formats, factory outputs,
validators, ready-only wet admission and mission policies remain. V15 still
refuses every non-null damage request, including zero. Character arithmetic/search and import helpers, old tests,
existing training documentation and the canonical mechanics register are unchanged.

Public tests use synthetic fixtures. Private original inputs, route planning,
checkpoints, source spans, real character names and browser screenshots remain
ignored. The new production evidence and exact commands are recorded privately
in the worker handoff; acceptance requires separate current-head review and CI.

Uncomposed source branches, broader level mechanics, general corpse inventory,
original CPU/audio/interrupt cadence, physical controllers/TV and whole Training43
completion remain outside this bounded profile. Existing grunt 0 and
ExpandedAudioMemory 0 declarations and the fixed 50 Hz adapter remain explicit.

As with earlier formats, ordinary reflection is not a Proxy sandbox.

Local production verification selected four genuine nonimmune records using the
existing keyboard roster controls, traversed the original geometry and produced
four distinct source-derived corpses. All-dead failure occurred at tick 10550
with a positive clock and retained positive fitness. The complete terminal save
was 18498 UTF8 bytes with 206 command tuples. Paused checkpoints before deaths
and after terminal recovery, explicit selection/dead input guards, tamper
rejection, frozen terminal input and a fresh selected-team Retry passed.

Fresh verification includes 1065 public tests (54 optional skips), 119 opt-in
targeted cases, 25 final new browser definitions covered across documented runs,
30 legacy browser definitions in one clean run, and 17 legacy API version
comparisons. Only one new browser definition is the original four-death keyboard
playthrough; setup, generation, resource, API and synthetic cases are separate
evidence categories. The private handoff preserves exact runs and diagnostics.
