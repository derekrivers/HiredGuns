# Status — 30 October 2026

Accepted gameplay baseline: PR116 merge `db5d2930eb07ef98ddda1d09bb1968efed0f57d3`,
reviewed implementation `2c1178d68ad887c218f2bc3975bba7b6024d032f`, tree
`9fc72ab7680fed7105094b79be737b77b0348a34`.

The [Master Mechanics Register](docs/mechanics/index.html) now separates whole-game
evidence coverage, current playable testbed capabilities, and Training43 software
acceptance. The percentage is covered checkpoints / all row × stage checkpoints,
with equal stage weights and zero partial/open credit. It measures neither effort,
playable-testbed completion nor whole-game completion. The earlier roughly 60% was
a subjective estimate of a smaller authored functional testbed. Counts come from
canonical data; narrow milestone records add no whole-game denominator or credit.
This dashboard reconciliation is an **UNREVIEWED candidate** until its own gates pass.

Accepted same-app slices include selected-team startup/movement/extraction,
bounded inventory exchange/equip/return and authored cache pickup/drop,
designated-target gun/patrol/doors/player pad, PR112 nonmedical64 FOOD/REPAIR
use after authored dry-fall injury and v14 history, and PR115 supported original-editor
wet approach/entry/reverse, race4 breath/item/weight/fitness, race1 parking,
four-head ownership, source counter order, v15 paused replay, Retry, original
first exit and single cooperative retirement. [Wet controls and limits](docs/training43-wet-traversal.md).

PR114 CASE classifies 23 water cells (22 graph candidates plus one solid/nonstanding),
both dry type0 signs and 50 inactive positionals; graph candidates are not full
wet playthroughs. Legacy v15 still refuses every non-null requested hit including zero.
PR116 separately accepts [bounded wet lifecycle](docs/training43-wet-lifecycle.md):
actual injury/death, north-search corpse, all-four head ownership, dead-input
guards, explicit manual survivor selection, freed-body/corpse walk, first exit,
v16 paused replay and Retry. Wider water/all-dead/original99-count timeout beyond
45000 replay ticks/general corpse items/door-pad callers and full recovery remain open.
FOOD/REPAIR does not imply medical64 poison cure, immunity or revival.

Training43 (map43) remains the first original-level target: T43-04 partial,
T43-05/06 partial, zero complete original levels accepted. Editor/runtime/source
and Locations CRC df31/5c21 limits remain; campaign expansion stays held.
Physical four-person/controller/TV acceptance is DEFERRED separately and does
not block keyboard software. Graphics/audio stay deferred. Original inputs and
proof payloads remain private. Token usage unavailable.
