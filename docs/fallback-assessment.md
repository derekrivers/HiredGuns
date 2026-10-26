# Fallback assessment — 26 October 2026

Dropzone (map 13) establishes imported four-view navigation. It has no exit block or verified complete-mission objective, so it cannot satisfy the birthday fallback alone.

Training map 43 is a low-complexity original extraction-route prototype, rather than a selected birthday release. Inventory inspection finds no items or closed eggs, one valid button (block-off action), one stair auxiliary, a type-18 stair block, block-4 support cells, lift hydraulics and an exit block. Twenty-three water-flag cells still require assessment. Nonzero object slots can be stale; counts alone do not establish active mechanics.

A local, single-character flood check using only the current conservative static navigation rules found 109 reachable cells and a route from a start to a cell beside the exit. This is feasibility evidence only: it ignores simultaneous team occupancy, dynamic mechanics, timer failure and optional areas. No playthrough or complete-level claim follows from it. No original geometry or route data is included here.

The same bounded flood check found no static exit approach in any campaign-related map. Original mechanics are therefore still a concrete blocker for the campaign fallback, rather than presentation work alone. Stopover (development map 22) also has a nearby static exit, but is not selected as a birthday mission on that basis.

Source evidence: OCS `Controls&Movement.s` movement/bump path (around 4720–4870) enters the exit UI when bumping a type-3 block. `Main.s` `check_exit` (around 379–497) uses exit-window/dead/control states, not the map header exit coordinate. In action mode the location's recommended-player field affects success conditions. Training 43 stores four; cooperative all-team completion must therefore be an explicit policy decision, not silently inferred from the campaign rule. `Front.s` `choose_training_map` selects records 43–47. No original executable observation has yet corroborated these paths.

Implemented evidence: the exact Training43 digest enables source type-3 exit retirement, source integer countdown, timeout failure, retry and complete-state checkpoint recovery. Cooperative all-four extraction is explicitly labelled as a variant; the original alive-only first-exit rule is separately selectable. All four mercenaries reached the exit in a local Chromium run through keyboard controls, with active team occupancy respected. This proves the supported static route, not optional original areas, all original mechanics or physical four-player compatibility. Detailed rules and source references are in [mission-rules.md](mission-rules.md).

An initial original-map browser run exposed expensive hidden-block rendering; static exposed-face merging reduced its block triangles from 83,112 to 922 and the route then passed. Source words, coordinates and route logs remain local. Public fixtures are newly authored.

Next mechanics work: verify the original executable's success/failure and wall-clock behavior, then extend dry stair support to the level's wet staircase through explicit fall/health/water state, and cover lift/button behavior where original area coverage requires it. A compact campaign mission remains the stronger birthday target. No inventory/combat is required by this verified training file, but both remain campaign requirements.

The source investigation confirmed that both lower stair cells carry type-2 water. Adding stair direction transforms alone cannot make that original staircase usable under the current hazard guard. Source support also includes block 4 two levels below, while entry immediately above it is refused; `Equates.i` labels this block a tree. Falling and water need cadence, fall accumulation and health/death state, so they require a bounded state/schema extension rather than bypassing unsupported-water checks. Raw lift/door slots have no position-bearing records; this is an inventory observation, not proof of runtime behavior.

Campaign travel remains disabled: editor location CRC `df31` differs from archived runtime header CRC `5c21`. This discrepancy is isolated from local level navigation and checkpoints; neither establishes a matching campaign baseline.

Dry stairs now have a separate synthetic four-lane drill and source-backed directional transforms, with bounded stone/stair/tree support. This does not unlock Training43�s wet staircase. See [static-traversal.md](static-traversal.md) for source mappings, conservative exclusions and validation.
