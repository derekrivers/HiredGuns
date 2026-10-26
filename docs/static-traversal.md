# Dry static traversal

`src/sim/traversal.ts` exports pure `obstruction(level, position)` and
`resolveTraversal(level, from, travelDirection, occupied?)`. The resolver returns
`{target, reason, kind}`, where kind is `level`, `stairs-up` or `stairs-down`.
Travel directions are north0/east1/south2/west3; `from.facing` remains unchanged.
World movement derives travel direction from facing and forward/backward/strafe.
The occupancy callback reports other active actors at tick start or currently.

| Travel | Up auxiliary in current cell | Down block immediately below |
|---|---:|---:|
| North | 8 | 18 |
| East | 9 | 19 |
| South | 10 | 16 |
| West | 11 | 17 |

These mappings follow executable constants in `Controls&Movement.s` callers
around 4901 onward, including backward and sidestep cases. Image/map direction
labels in `Equates.i` do not describe the same travel directions.

## Ascent, descent and support

`Controls&Movement.s` `move` around 4720–4895 checks ascent clearance immediately
above the **current** cell, then raises the horizontal destination by one level.
Both that overhead cell and the elevated destination are checked here. Floor,
block, opaque geometry or an active actor overhead prevents ascent; destination
occupancy/obstruction is checked separately. A floor at the elevated landing is
valid; a floor above the current cell is a ceiling.

For descent, a floor at the nominal horizontal destination keeps movement level.
Otherwise a matching stair block below the actor lowers the target when the
lower destination is clear, or contains the source's player-block range32–47;
the final target must still pass collision and active occupancy checks. Other
lower block/opaque geometry keeps the target level. The source does not impose
a generic block/actor ceiling check at the nominal upper descent cell; neither
does this resolver. As an explicit dry-subset restriction beyond the source's
final-feet-cell checks, water, explosion, pushable or unsupported auxiliary data
at that nominal upper cell prevents descent too.

Standing is allowed on an explicit floor (types0/3), stone block0 or stair
blocks16–19 immediately below, or block4 two levels below with a clear dry
intermediate cell. Source block4 is labelled **tree** in `Equates.i`; its
two-level support behavior should not be mistaken for a new bridge object.
Entry immediately above block4 without an explicit floor is refused. The source
fall routine can support an existing actor immediately above4, but this subset
does not simulate falling and conservatively rejects that pose in both standing
validation and checkpoints. Unsupported lower block types do not become support.
Pushable-flagged blocks cannot provide static support.

Every accessed position is bounded explicitly; original safety nets do not
extend the legal grid. Unsupported drops remain blocked. Water, explosions,
pushables, auxiliary types outside8–11, button-floor type1 and lift-floor type2
remain unsupported. Stair presence flags are required. Training43's actual
stair pair contains water and remains blocked; synthetic dry traversal does not
claim that original environmental mechanic is implemented.

## Integration and compatibility

`world.ts` re-exports the exact same standing predicate consumed by checkpoints.
Stable ID ordering and occupied-at-start policy remain: actors retiring or
moving this tick release their starting cell for entry on the next tick.
Already-retired actors do not block destinations or ascent overhead clearance.
Turns, retirement and terminal freeze retain their existing behavior.

Mission exit checks use the **transformed** target, after current support,
clearance and environmental guards. Only a clear result or final target block
collision can activate an exit. Coordinator integration extends retired-pose
exit validation for transformed approaches; a stair exit can retire an actor
at a different z from its target, without moving into that block.

No mutable environment or new persistent fields are introduced. World schema2
and checkpoint version2 remain unchanged. Existing saves keep exact full-level
fingerprints; newly legal dry supported poses round-trip through the shared
predicate. Full falling/water, health damage, pushables, teleport/boost, doors,
lifts and dynamic cell mutation need separate rules and save-state review.

## Verification

Synthetic tests independently specify ascent/descent coordinates for all four
travel directions through four movement actions, plus ceiling/landing floors,
vertical occupancy, blockers, boundaries, hazards, source flags, support types,
block4 entry, retirement, transformed exits and checkpoint continuation.
`npm ci` and `npm run check` passed: 54 tests total, including11 traversal tests.
Implementation: gpt-6.1-sol, one bounded attempt, no failed repair cycle; one
source-review refinement added the nominal descent environment guard. Aggregate
token usage unavailable. Browser/original-level evidence is coordinated separately.
