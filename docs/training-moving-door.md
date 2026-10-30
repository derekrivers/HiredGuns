# Authored timed door / patrol extraction

Load the ready-to-play local Training43 test and choose **Start timed door /
patrol extraction challenge** beside the views. This resets the verified selected
team, inventory, gun and the same existing authored gate/patrol/extraction arena
to a canonical start, paused. It is an optional v12 mode; v9–v11 stay static.

Start mission. Slot 1 faces the panel at (5,4,1). C requests opening; wait for
**WALK THROUGH**. D then W enters the door cell (5,5,1); another W vacates it.
1–4 select the WASD actor; Q/E turn. Slot 2 initially faces the panel from the
opposite side and can close or reverse using C. C chooses source action14/15
from the blocking/motion state. Tab/Enter on the labelled Open, Close, Toggle /
reverse, Lock and Unlock buttons invokes actions14–18 at the same front panel.
No new movement shortcuts are intercepted. Toggle uses the source's direction1
test exactly, including its repeated-open behavior on a stopped absent door.
Lock waits for motion to stop; unlock waits for locked. Read phase, block state,
variant, trigger/pending lock, delay count, counter and deferred action beside
the views. The existing F/T encounter and target-defeat exit unlock apply. Extract
all four at E (8,5). Esc pauses. Retry resets everything; terminal Y also retries.

## Source and adaptation boundary

The accepted [door transition](door-motion.md) is unchanged. One explicitly
synthetic 12-byte-equivalent record binds one target cell: position2596,
trigger0, direction0, stored LONG type `0x8000a003` (normal type20, floor,
non-opaque, retained high bit), delay100, count0, key0, buttonOnly255. Initial
word equals stored type and counter0. This is an authored start, not a selected
original runtime door. Original Training43's zero-position machinery stays
inactive. Source key/buttonOnly actor eligibility is not inferred from these bytes.

An **authored** adapter adds one unsigned WORD count per accepted world tick,
then consumes the single-record helper once. This does not establish original
CPU/clock parity. From canonical start, action14 waits six ticks; variants1–10
appear at ticks7,13,…61, still blocking. Tick67 performs erase-block completion.
Movement uses the tick's starting collision snapshot, so entry succeeds on the
next accepted tick. Closure restores variant9 and the complete stored LONG in
one scheduled step, counts down to0, then takes an extra stop step. The source's
byte delay/wrap/signed compare, pending triggers and reversal remain authoritative.
Delay100 enables auto-close after100 scheduled open steps, subject to occupancy.
All sound/redraw effect records remain inert; rendering consumes the final word.
Existing placeholder geometry plus the visible phase provides progress feedback.

Before any closing candidate, the adapter conservatively checks **all** player
current footprints and prospective same-tick movement results, plus the active
NPC's current footprint and reserved destination. Even a vacating actor reserves
its starting cell. Movement is first probed against the current map with NPC
reservations; that same accepted result commits with the complete door candidate.
Opening becomes traversable next tick. No intermediate helper word/effect commits.

If any reservation touches the door cell, freeze the entire previous raw record,
target word and counter, retain the requested action, and set `deferred:true`.
The world/NPC may still take their accepted tick to vacate. On subsequent ticks
recompute occupancy; do not trust the deferred receipt as occupancy authority.
The latest explicit action replaces a retained action, allowing reversal/cancel.
When clear, retry from the frozen count plus one; no missed-tick catch-up accrues.
Automatic closure has no queued action and retries from the frozen delay state.
This deterministic interlock is an authored no-crush policy, not original source
obstruction/crush behavior. Paused, terminal and budget-refused ticks advance none
of world, counter, record, action history, NPC or encounter state.

## Recovery

V12 uses scenario/map binding `authored-moving-door-extraction-v1`. The gate adds
`moving:{fixture,adapter,interlock,record,word,counter,pendingAction,deferred}`;
the mirrored gate overlay word must match. Raw record fields are all preserved.
The existing ordered patrol/gate histories add exact events
`{kind:'door',actor,action,commands}` for actions14–18. Waits, movement, F/T and
inventory operations retain chronology, with one counter consumption per tick.

Rehash/reparse both exact raw roster/item sources, reconstruct canonical fixture,
initial record/word, world, NPC, gun and inventory, and replay all accepted events.
Compare the entire session and nested world checkpoint before exposing a result.
Serialized words, counters, interlock flags, source labels and rules confer no
authority. Caller map/raw/indices/session/history/world are detached before the
first await and reused throughout rebuilding. Generation changes cancel stale
setup/recovery after Retry, selection, source clear, new Apply or mode switch.
Restore installs the full validated candidate atomically and pauses. All phases,
partial extraction and terminal outcomes use this path. Legacy versions retain
their exact field sets and require matching modes; v9/v10 can still leave a
challenge for their static navigation arena. V12 requires this matching fixture.

Limits remain128 events,45000 ticks, UTF-8 outer <24KiB and nested checkpoint
<16KiB. Prospective events/ticks/items/F/T check budgets before installation;
there is no truncated/lossy history or increased size allowance. Failed import
retains working state apart from pausing. Private originals and evidence stay ignored.

This adds a runnable authored interaction and challenge, not full Training43,
original AI/hit/range/LOS, player attacks/death/wet, audio or full-test-bed parity.
