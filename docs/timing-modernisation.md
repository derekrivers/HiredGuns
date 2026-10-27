# Timing observations and bounded interrupt inventory

This batch measures the existing browser clock and inventories interrupt-owned updates. It changes no simulation rules, clock policy or status effects. Reports contain synthetic callback state only. Original assembly, addresses, data and detailed local evidence remain outside this repository.

Run from the repository root:

```sh
npx tsx tools/timing-probe.ts
npx vitest run tests/timing-probe.test.ts
```

The first command writes deterministic JSON to stdout. Each scenario includes cumulative ticks, a synthetic checksum/phase, admitted time inferred from callbacks and interpolation, discarded time, and per-operation observations. No input file or original assets are required. The callback state checks ordering/repeatability; it does not simulate a mercenary.

## Measured browser clock behavior

`src/sim/clock.ts` consumes `TICK_MS` from `src/sim/world.ts` (currently 20 ms). Five integer-millisecond frame patterns representing 125 Hz, approximately 60 Hz, 50 Hz, approximately 30 Hz and jitter each supply exactly 2000 ms. All produce 100 callbacks and identical state with zero remainder. These are synthetic elapsed sequences, not measurements of display refresh rates.

| Scenario | Observed outcome |
| --- | --- |
| 100 ms / 101 ms calls | Both admit 100 ms and emit five ticks; the latter drops 1 ms. |
| Eight 250 ms frames | 2000 ms wall time produces 40 ticks; 1200 ms is dropped. Equal wall time is insufficient when individual calls cross the clamp. |
| 13 ms, 10000 ms, 7 ms | The gap emits five ticks and retains the 13 ms remainder; the final 7 ms emits a sixth tick. 9900 ms is dropped. |
| Reset after 13 ms, then 10000 ms, 7 ms | Reset discards 13 ms; the supplied gap still emits five ticks and leaves 7 ms after the last call. |
| Skip a 10000 ms pause after 13 ms, then supply 7 ms | Without reset, one tick occurs. With reset, zero ticks occur and 7 ms remains. |

The clock's suspension comment describes a catch-up limit, not a complete pause: it still advances up to five ticks and retains fractional time. The harness models pause by skipping calls, and reset separately. The application currently resets the clock in `setPaused` and skips `advance` while paused/loading (`src/main.ts`). The probe does not invoke DOM events or prove that every suspension triggers those application guards. It also does not establish exact floating-point behavior for all real requestAnimationFrame timestamps.

## Source references and dispatch boundary

References below name local read-only files under `research/ocs/Sources`, identified by routine labels rather than reproduced source. This is a bounded inventory of direct interrupt state work and the action-clock callee, not the entire main-loop consumer graph.

`ColdStartup.s:level3` selects copper first, acknowledges and returns; otherwise it selects vblank and returns; optional blitter queue servicing follows only when neither branch is selected. Simultaneously pending copper/vblank are therefore not both dispatched in one invocation. Their eventual hardware delivery relationship and frequency are not proved by this branch order. `level6` calls `ciab_tb_interrupt`; its timer-B guard leads to the module player, classified as audio rather than a gameplay tick.

`copper_interrupt` sets screen bookkeeping and optionally swaps buffers, delegates world-map work in world mode, increments the word help-cursor counter in help mode, and enters gameplay work only in game mode. In game mode the relative order is HUD, field scroll, shake, first input phase, scrolly update, remaining input phases, sky update, then `xcr_counters`. Conditional demo logo flashing follows. Active-controller bits guard the pad/parallel input phases; demo attract playback can suppress digital joystick reads. These delegates are not fully reconstructed in this batch. In particular, their call order is not proof that gameplay consumes inputs on the same cadence.

The bounded callee inspection also found state writes that must not be dismissed as pure rendering:

| Routine | State and guards | Cadence qualification |
| --- | --- | --- |
| `hud`, `fitness_flash` | Selects one player using the low two bits of the vblank-updated general timer. For a living selected player, a nonzero byte fitness-flash duration decrements. Fire animation additionally requires nonzero animation and control method: byte duration decrements and a signed-less-than result clears the word animation; otherwise word fire-frame increments and resets at five. | Once per selected HUD visit, not once for every player per copper call. Timer/copper alignment is unproved. |
| `hud`, `muzzle_hit` | Active fire animation advances the shared word random state twice and writes word fire offsets before muzzle presentation. A guarded splat/audio branch can advance random state again and select a sample. | Shared RNG writes couple presentation cadence to later consumers; sample macros and their possible additional writes are outside this inventory. These routines do not establish damage application. |
| `scroll_field` | Word field position increments and resets at exactly 60 before palette writes. | Game-mode copper presentation phase. |
| `Main.s:shake_screen` | A nonzero byte shake-power guard selects shake displacement and advances byte power. A terminal marker clears word shake/power and clears the redraw byte. | Game-mode copper call; table contents remain local. |
| `scroll_scrolly` | Maintains word scrolly/character-width state and message pointers; its reorganisation subroutine clears and rebuilds the word players-alive count and name pointers. Dead/window/water guards filter players; player four also requires a nonzero control byte. Its flash word decrements and reloads 50 on a signed-negative result. | Reorganisation runs even when pixel scrolling is skipped. The rebuilt count is subsequently read by vblank message logic; it is not simply a count of living actors. Message parsing details remain outside scope. |

## Gameplay and status counter inventory

Unless stated otherwise, each row below executes once per game-mode `xcr_counters` call, after sky processing. Word arithmetic is 16-bit modular arithmetic. A signed-negative branch is not an unsigned borrow test: for the intended nonnegative range, decrementing zero produces a negative result, but arbitrary high-bit input can behave differently. No uninspected save field is normalized based on these observations.

| Relative order / source label | Guards and update semantics | Reset / limits |
| --- | --- | --- |
| `xcr_counters`: demo logo | Demo build only; a playtime byte guard controls word logo increment. This guard uses the variables block, while vblank's demo guard uses global variables. | Do not equate these two guards without layout evidence. |
| Shared counters | Drown, water, lift, fall, automove, door, explosion, monster, hatch and message counters increment in that order, unconditionally within this routine. | Word wrap; no saturation or reset here. Consumer-specific resets and rates are outside this bounded inventory. |
| Poison, players 1–4 | Nonzero word strength guards decrement of the word poison count. A negative result reloads the stored word count and adds strength to the word poison total. | Reload is after decrement; an initial nonnegative N reloads after N+1 calls. No direct hitpoint subtraction here. Total wraps; applying accumulated damage is not established here. |
| Active counters, players 1–4 | Nonzero guard, word decrement, negative-result clamp to zero. | For a normal positive value, reaching zero needs no extra call. Arbitrary signed values require separate interpretation. |
| Lock, then monster-attacking, used, no-ammo, no-room groups | Each group visits players 1–4. Nonzero guard; word decrement; reaching exactly zero sets a byte redraw flag. | Zero stays zero. No signed clamp. High-bit values continue modulo 65536. |
| `DECR_ICON_DUR` | For each player, weights, immunity, shield, wings and water durations: nonzero word duration decrements. | No effect-expiration callback, redraw, or signed clamp in this macro. Effect consumers remain uninspected. |
| Heavy, blocked, blocked2, drowning, invalid, claw, big-claw groups | Each group visits players 1–4. Nonzero word decrement; reaching zero sets redraw. | Same zero-stop/modular semantics as lock group. |
| Grunt counters | Word increment for players 1–4, last in the routine. | Wrap; no reset in this routine. |

`Main.s:initialise_variables` clears the variables block and the separate timer range. A conditional demo startup path also clears the timer range. This does not establish every per-player initial duration/strength or the reset behavior of every consuming routine. The timer range includes the general interrupt counters but ends before the demo logo count.

## Vblank and action countdown

`ColdStartup.s:vblank_interrupt` sets top-screen bookkeeping, increments the intro word timer only in intro mode, then increments frame and general word timers in every mode. Demo playtime handling follows: under its byte guard, the word logo count increments and a 4500 comparison can clear playtime and request restart/attract changes, with download-build overrides. The literal threshold suggests an intended 50 Hz assumption; this is not a measured interrupt rate.

Game mode then increments the word mouse timer, processes mouse 0 then mouse 1 (active-control guards, optional attract replay, pointer/sprite work), and calls `move_digits` only when the action flag is nonzero. Demo message selection follows. The message timer is checked with a signed comparison against 2500; once the threshold is met it is cleared before the players-alive test, so one surviving player still loses the accumulated interval. Multiple survivors may trigger a random message. A conditional download host check follows outside the game-mode branch.

`move_digits` combines sprite rendering and action-clock state. It first positions the digit sprite, decrements the low word trip counter, and on a negative result reloads its duration and starts middle-digit rotation. Only on that borrow path does it decrement the middle trip counter; its negative result reloads its duration and starts high-digit rotation. Only then does it decrement the high counter, clamping a negative result to zero. The nested branches preserve this low-to-high order. Rotation words independently advance by four when nonzero, followed by digit pixel composition. This routine alone does not establish mission outcome or the configured duration values. It is called from vblank, not `xcr_counters`.

## Hardware/presentation classification and remaining evidence

Screen swapping, screen flags, HUD/scroll/shake, pointer sprites, digit sprite/pixel composition, sky copper writes and blitter queue servicing are presentation/hardware operations, even where they maintain counters. Sky handling also decrements a nonzero lightning word and updates old-sky flags before `xcr_counters`; this is a presentation countdown with gameplay-visible appearance, not demonstrated damage. Input sampling stays a separate category. `ciab_tb_interrupt` delegates audio timing to `_IntHandler`; its frequency and module-player scheduling are not gameplay cadence evidence.

Unproved: copper interrupt placement/count per display frame, PAL/NTSC/build differences, OS-friendly interrupt installation, delivery under load, main-loop polling/reset cadence, exact status-field initialization, poison damage consumption, icon expiry effects, and original pause behavior. Neither the browser's chosen 50 Hz tick nor matching source constants proves original parity. No poison/status update should be enabled from this inventory alone.

The smallest next implementation packet is a synthetic test harness for the existing action-clock transition, covering low/middle borrow and reset boundaries against accepted local reference observations. Establish configured duration and invocation cadence first; coordinate any simulation change with its owner. Broader status-effect implementation remains deferred.
