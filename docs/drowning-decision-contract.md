# Disconnected drowning decision

26 October 2026. `src/character/drowning-decision.ts` exports synchronous pure
`decideDrowning(input)`. This is the smallest arithmetic transition nominated by
[wet-entry-observation.md](wet-entry-observation.md). It has no caller in live
simulation, damage, inventory, UI or checkpoint code.

The input has exactly four own fields: `underwaterCount`, `physique`, `fitness`
and `drowningIndicator`. Each must be an integer number in 0..65535. Missing,
extra (including symbol/nonenumerable), inherited-only and malformed values
reject before producing output. Zero stats are accepted: the divisors are fixed,
so zero physique does not cause the damage contract's divide-by-zero concern.
The input is never mutated; output contains numbers, booleans and null only.

`nextCounter` increments the input counter modulo 65536. The unsigned product
of physique and fitness is divided by 655 with a 16-bit quotient. Success packs
remainder in the high word and quotient in the low word; overflow retains the
32-bit dividend. The resulting low word is sign-extended to 32 bits, interpreted
as unsigned, then divided by 400 with the same packing/overflow policy.
`firstDivisionOverflow` and `secondDivisionOverflow` report those decisions.
`thresholdWord` is the low word after the second division, including overflow.
All products and packed registers fit exactly in JavaScript's integer range.

The comparison interprets both `nextCounter` and `thresholdWord` as signed
16-bit words. Less than or equal returns the unchanged `drowningIndicator` and
`requestedHit: null`. Greater returns indicator 150 and unsigned
`requestedHit: nextCounter * 200`. A request of zero is distinct from null.
The request is an inert damage-helper input, not a fitness decrement or a
damage/death dispatch. The output does not imply survival.

The literal arithmetic/overflow policy follows the isolated original CPU slice
reported in the linked observation. Its selected input construction is separately
source-derived. Synthetic CPU cases that reach death intercept that entry before
any death instructions execute; their continuation does not prove death register
preservation or world behavior. Public tests here are authored synthetic
regressions, not executable runs or original roster fixtures. They cover both
division boundaries, all observed overflow combinations, EXT sign boundaries,
threshold adjacency, signed counter edges, counter wrap, zero stats, skip
indicator preservation, zero-hit requests, immutable input and malformed fields.

Caller qualification remains separate: alive/controlled/unextracted, qualifying
water/depth and breath immunity. Original inventory processing precedes breath
immunity, so a future composition must preserve that ordering. Scheduling,
descent/fall, inventory consequences, damage/death, occupancy and atomic saves
remain outside this API. Existing schemas are unchanged; this contract grants
no live wet activation or full-game parity.

Validation: `npm ci` and `npm run check` (lint, TypeScript, unit tests and
production build). No browser surface changed. Model: gpt-6.1-sol, medium;
one implementation attempt, no implementation repair cycle. Initial check
required dependency installation before lint could run. Token usage unavailable.
Independent review and integration remain coordinator-owned gates.
