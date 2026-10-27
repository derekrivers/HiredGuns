# Disconnected mouse-0 selection candidate

`transitionMouse0Selection` is one bounded arithmetic candidate derived from the
five selection invocations in [after-death-control-observation.md](after-death-control-observation.md).
It is disconnected from input, TYPE1, death, routing, world, UI and rendering.
Training43 remains incomplete; world/checkpoint 3 and roster-plan 1 are unchanged.

The input is a complete own-data projection of the initialized post-death
four-record fixture. Selection is one-based 1, naming dead slot 0. That actor has
both dead words `0xff00`, fitness 654 and old equal to current. Three survivors
retain fitness 65535, dead words zero and old equal to current minus four. Party
numbers are 0–3; current references are consecutive four-byte values. Windows,
actions, auxiliary/grenade/pushable values and both leaders are zero. Controls
are 5 except the explicit target-control-1 case. Redraw is 255, prior image zero,
old buttons and mouse action zero. These restrictions describe the observed
fixture; they are not an alive validator or a general roster-selection policy.

Only these exact `(left,right,target control,mode)` tuples are admitted:

| Inputs | Candidate selected value | Ordered non-stack write records |
| --- | --- | --- |
| `(0,0,5,1)` | 1 | Last-image long |
| `(1,0,5,1)` | 2 | Selection word, last-image long |
| `(0,1,5,1)` | 2 | Selection word, last-image long |
| `(1,0,1,1)` | 1 | Last-image long |
| `(1,0,5,2)` | 1 | Last-image long |

The pointer write is an inert record carrying `baseImage`; no sprite bytes or
hardware are read or written. Both buttons together, other nonzero levels and
other combinations are unsupported. The source has separate left/right writes;
the unexecuted double-button case is not inferred. Button levels suffice in the
observed calls; no edge-triggered selection or generated action 22 is claimed.

The layout supplies signed-word origin and four signed-word view offsets,
unsigned-word pointer coordinates, and all eleven inclusive window-0/no-aux
gadget rectangles. The function checks a regular two-by-two view topology,
derives the top-right target (zero-based slot 1) by the inspected comparisons,
subtracts its offsets and checks every rectangle. An intersection, missing data,
other target, negative local point or signed arithmetic wrap is rejected before
exposing a candidate. There is no caller target index or boolean no-gadget
witness. Even wrong-mode/device calls require the complete initialized gap
projection, retaining the same bounded input prerequisite on every case.

**Arithmetic projection validation does not establish original identity.** The
layout, complete static-table projection, base-image reference and storage codec
must be source-bound externally before any activation. In particular, eleven
caller-authored rectangles are not proof of the actual original table. Public
tests use authored synthetic geometry and bytes. The ignored comparator pins
the retained executable, observer, report and source identities, reconstructs
the actual table and supplies its proven gap. No original coordinates, table
bytes or addresses are published. This API does not claim arbitrary-layout or
arbitrary-roster original parity.

Every input object and array must contain exactly the enumerated own enumerable
data properties, with validated byte/word/long widths and array lengths. Record
prototypes must be plain or null; arrays must have the standard array prototype.
Accessors, holes, inherited properties, symbols and hidden/extra fields fail.
All data is copied before deciding, including 1,484 remaining runtime bytes and
142 remaining stats bytes per actor, and 2,335 remaining global bytes. These
opaque bytes are storage-order projections with the separately supplied scalar
fields and view/pointer offsets omitted; their contents are preserved, never
interpreted. The external codec must establish that decomposition. The candidate
and records share no mutable input references. Rejection never mutates input.

All other actor, leader, device, dead/window, layout and opaque storage remains
unchanged. Private comparison covers all five complete candidates and exact
write widths/order, with full raw-memory reconstruction and unchanged-storage
checks. The other 24 original helper invocations remain evidence only; routing,
dead dispatch, following, leader election and TYPE1 control 5 are not API coverage.

Hardware/input/layout/source binding and live actor/occupancy adapters remain
activation prerequisites. This change installs no live behavior, automatic
fallback, campaign travel, save/schema changes or hardware/controller support.
