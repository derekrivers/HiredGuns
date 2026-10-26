# Disconnected drowning-caller water inventory

26 October 2026. `src/character/water-inventory.ts` exports synchronous pure
`transitionDrowningWaterInventory(input)`. This bounded transition follows the
literal equipment plus carried indices 0..15 scan established for the OCS
drowning caller in [water-executable-evidence.md](water-executable-evidence.md).
It has no live caller, world mutation, damage/death dispatch, rendering, save
change or source-authority result.

The exact input fields are `inventory`, `items`, `physique`, `spellWater` and
`spellWings`. The three numeric inputs are unsigned 16-bit integers, including
zero. Inventory has exactly `equipped`, thirty dense `carried` entries and ten
dense `actions`. Each entry has exactly `itemId`, `damage`, `ammo`, `fourthByte`
and matching lowercase four-byte `rawHex`; numeric fields must be bytes. ID zero
means empty even when its other bytes are nonzero. Every positive ID, including
tail and action entries, must resolve in the supplied table.

`items` uses the existing parsed `ItemCatalog` shape with 114 dense records in
ID order. This arithmetic contract validates each record's ID, byte water damage,
container and category, and word maximum damage and weight. It deliberately uses
those parsed values as authored inputs. Catalog source metadata, text and raw
evidence neither affect this calculation nor verify its source identity. A caller
that needs original-source authority must establish that separately; there is no
verified result or authority bypass here. Missing/malformed records, replacement
definitions and unsupported IDs reject even on a spell-protected invocation.

Spell-water exactly 100 returns `status: "skipped"`, an independently copied
`candidate` inventory and `weight: null`. Null means **no weight update**: a future
caller must retain its existing weight state. The scan and weight arithmetic are
both skipped; a protected valid inventory may therefore have a weight that would
overflow the bounded unprotected calculation. Spell-water 97 does not bypass this
transition. Breath immunity/reset and the subsequent
[drowning decision](drowning-decision-contract.md) belong to separate callers.

Otherwise the transition returns `status: "processed"`. It visits equipment,
then exactly the first sixteen carried entries. Empty ID, zero item water-damage
or zero maximum-damage leaves an entry unchanged. For other entries, both damage
bytes are shifted left eight and added modulo 65536. The resulting zero-extended
word is compared with the unsigned maximum-damage word; equality or greater
destroys. This is byte wrap before comparison, not saturation or an unbounded sum.
Below maximum, only the damage byte receives the resulting high byte. Destruction
writes only the ID: container 6 becomes 52, container 5 becomes 111, all other
container bytes become 22. Damage, ammo and fourth byte survive replacement.
Replacement items are not processed again in the same scan. `rawHex` is regenerated
only for processed entries to match their bytes. Actions and carried indices
16..29 retain all their data; all candidate entries are independent copies.

After the scan, `weight` contains `totalWeight`, `quotient`, `tooHeavy` and
`usingGrenade`, recomputed from equipment plus all thirty carried entries by the
existing [supported weight arithmetic](item-format.md#selection-and-source-arithmetic).
It therefore uses replacement definitions/count bytes and untouched tail entries;
actions never contribute. The wings-24 override and signed word heaviness
comparison remain that helper's contract. A DIVU weight quotient overflow or
other unavailable weight calculation throws before any result is exposed.
Inputs are unchanged even when private candidate updates precede rejection.
Heavy timers and source redraw writes are outside this transition's output;
there are no renderer flags, callbacks or dispatched effects.

Evidence is bounded and separate. Source inspection establishes the item helper's
shifted word addition, maximum comparison, replacement writes and weight call.
Earlier isolated CPU evidence establishes the drowning caller's seventeen visits,
unchanged tail and spell-100 bypass using non-destructive synthetic increments.
Independent review additionally ran thirteen synthetic cases directly through the
original item helper: empty/no-water/zero-maximum, below/equal maximum, all
replacement container branches including unknown, word-wrap zero/low/equality,
and maximum boundaries. Those original instructions executed without replacement
hooks; they did not execute the scan, weight calculation, actor guards or death.
The private report remains ignored at
`repo/.local/drowning-review/item-helper-results.json`, SHA-256
`325c65172513aa39cb10fb87715b5c881af6ed31e53af85ded813fdf5229424d`.
This does not prove full scan-plus-destruction-plus-weight CPU composition or
reachable environmental gameplay. Public tests are authored synthetic data only.

Validation: `npm run check` passes lint, TypeScript, all 159 repository tests and
production build. No browser surface changed. Tests cover the exact scan extent,
preserved bytes, replacement and word-wrap boundaries, spell skip, full supported
weight, atomic malformed/unsupported rejection and independent candidates.
Model: gpt-6.1-sol, medium; one implementation attempt, no repair cycle. Token
usage unavailable. Independent review and integration remain coordinator-owned.
