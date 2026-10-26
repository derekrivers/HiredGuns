# Fallback assessment — 26 October 2026

Dropzone (map 13) establishes imported four-view navigation. It has no exit block or verified complete-mission objective, so it cannot satisfy the birthday fallback alone.

Training map 43 is the next low-complexity original candidate, rather than a selected birthday release. Inventory inspection finds no items or closed eggs, one valid button (block-off action), one stair auxiliary, a type-18 stair block, bridge blocks, lift hydraulics and an exit block. Twenty-three water-flag cells and the source timer still require assessment. Nonzero object slots can be stale; counts alone do not establish active mechanics.

A local, single-character flood check using only the current conservative static navigation rules found 109 reachable cells and a route from a start to a cell beside the exit. This is feasibility evidence only: it ignores simultaneous team occupancy, dynamic mechanics, timer failure and optional areas. No playthrough or complete-level claim follows from it. No original geometry or route data is included here.

The same bounded flood check found no static exit approach in any campaign-related map. Original mechanics are therefore still a concrete blocker for the campaign fallback, rather than presentation work alone. Stopover (development map 22) also has a nearby static exit, but is not selected as a birthday mission on that basis.

Source evidence: OCS `Controls&Movement.s` movement/bump path (around 4720–4870) enters the exit UI when bumping a type-3 block. `Main.s` `check_exit` (around 379–497) uses exit-window/dead/control states, not the map header exit coordinate. In action mode the location's recommended-player field affects success conditions. Training 43 stores four; cooperative all-team completion must therefore be an explicit policy decision, not silently inferred from the campaign rule. `Front.s` `choose_training_map` selects records 43–47. No original executable observation has yet corroborated these paths.

Next bounded mechanics work: confirm original training success/failure and timer units, record the matching data baseline, then implement a source-backed exit/retirement state and failure/retry using synthetic fixtures. Evaluate the actual four-character route. Add only route-required stairs/lifts/buttons/water after evidence establishes which are necessary. A noncombat training slice may prove full-level completion sooner, but a compact campaign mission remains the stronger birthday target.

Campaign travel remains disabled: editor location CRC `df31` differs from archived runtime header CRC `5c21`. This discrepancy is isolated from local level navigation and checkpoints; neither establishes a matching campaign baseline.
