# Authored consumable dry-fall extension

This candidate extends the existing selected-team dry-fall practice in the same
four-view app. It is authored practice, not original Training43 completion.
Load the ready local Training43 test, open **Selected-team dry-fall practice**,
then **Start consumable extension**. Starting resets the practice to its verified
source baseline. Start drill, select with 1–4, step forward, wait to land and Esc
pause. In **Inventory & equipment**, equip an appropriate carried item. **H** or
**Use equipped item** consumes it. U/O retain the second keyboard group's turns.
Text inputs and selectors keep their keys. Retry resets the complete practice.

The panel shows actor/race, running/paused state, integer fitness, equipped item,
current weight, and the last successful before/after receipt. Source-owned ready
team food 62/60 and repair 66 are usable; no loot is created. Equipment changes
must also wait for a living, settled, unextracted actor in this extension.

`Controls&Movement.s` use_item dispatches equipped ID minus one through the raw
category table. `ItemUsage.s` .use_food rejects races 1/4; .use_repair accepts
only 1/4. The unsigned first WORD at record offset 274 increases current fitness,
capped at 65535 (`Main.s` incr_fitness). Success clears only the equipment ID,
preserving its other three bytes, even at zero boost or full fitness. Carried
entries, empty tails and separate actions remain intact. Weight is recalculated
with the existing source helper. Category-dependent physique/intelligence/duration
fields are not used by these source branches. Other categories refuse explicitly.
Medical pack 64 also clears poison state in the source; this adapter refuses it
because poison/cure state is absent. It never silently performs a partial cure.

## Recovery boundary

Version 14 is a separate wrapper for the exact selected dry-fall geometry. It
rehashes raw roster/item inputs and rebuilds selection, initial full fitness,
source race, inventory, weight and world, then replays bounded ticks/movements,
equip/exchange/return and successful uses in chronological order. Prior falls see
their historical weight. Live stepping uses the existing world/fall/health code.
The saved world is a comparison receipt, never health/equipment authority.
Every inventory operation and export verifies the whole replay before returning
a prospective candidate. Import installs the complete world/session together,
paused, only for the current UI generation. Input snapshots precede the first
await. Retry, source clear, selection changes, new Apply and new modes cancel
older work. Older setup feedback cannot overwrite a newer setup result.

The shared bounds remain 128 events, 45000 ticks, outer save below 24 KiB and
nested checkpoint below 16 KiB. Adjacent identical tick runs compress without
reordering actions. Legacy v1–v13 formats and validators are unchanged. A v14
checkpoint is validated by complete replay rather than the legacy fixed-weight
v7 validator. Consumption cannot be grafted onto v7 inventory phase commands.

Use requires PAUSED, navigation mode, a living settled actor, no pending fall
and no extraction. No resurrection, original death/control/corpse, poison,
wetness, CPU timing or general world-item-use behavior is claimed. Ground caches,
guns, doors and patrols remain separate scenarios. Original Training43 remains
incomplete; Training44–47 remain register cases.

## Validation

Public synthetic raw records cover race branches, zero/full/saturating gain,
entry/tail/action preservation, source weight, malformed raw/derived fields,
immutability, strict event budgets and chronological injury/use/continuation.
Ignored opt-in private tests rehash original inputs and exercise actual ready
items, medical refusal, dead/pending/running/double-use refusal, replay tampering,
legacy sessions and pre-await mutation attempts across setup/export/import and
all item operations. Browser tests exercise the real app with keyboard injury,
food/repair use, visible before/after, restore/retry/continuation, refusal,
390px layout and cancellation. Independent exact-final HIGH, CI and completed
automatic review remain coordinator gates; this implementation is not self-approved.
