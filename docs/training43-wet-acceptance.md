# Training43 wet stair acceptance case (T43-04)

30 October 2026. Candidate on accepted PR111 base
`46dec166f0604b6cdcbe75c58f3736dc5fd19da9`, tree
`1e460bd080a8017159f5b8061a0d831a592f657e`. **T43-04 remains partial;
T43-05 and the original level are not passed.** This delivers a runnable,
source-bound case for the mandatory next consumer
`training43-keyboard-wet-traversal`, after the shared gameplay owner releases.
It changes only a new tool, synthetic tests and this document.

## Classification delta

| Interaction | Bounded conclusion | Remaining acceptance |
| --- | --- | --- |
| Water | All 23 flagged cells accounted for: 22 stable source movement candidates, one solid stair/support cell inactive as a standing destination. All have depth type 2 at one elevation; there is no established deeper-water target. | The 22 remain **unknown for live traversal/outcome**. Their graph is explicitly hypothetical source geometry, not a route executed by current physics. |
| Wet stair | One dry-to-wet frontier; paired immediate reverse ascent is source-supported. Selected actor's shortest dry approach is replayed with all four actors present and three stationary teammates. | Current traversal correctly refuses water. Entry/return need the bounded wet support/delay caller, owned heads and scheduling installed together. |
| Signs | Both text-type panels have dry adjacent approaches: reachable optional sign geometry. Neither dispatches a button action. Text content is never exported. | Adjacency does not prove rendering/readability in the current app. Variant is a text index here, not button eligibility; editor `used` cannot enable a caller. |
| Positional messages | All 50 records inactive; the first zero position terminates scanning. | No message trigger gameplay is required by this initial revision. Nonzero stale rows after a terminator would also be inactive; consumed `-1` skips a row without terminating. |
| Dry exit | Existing accepted full-team and original first-exit evidence reused unchanged. | Wet-to-exit gameplay still needs browser proof. Keep original first-exit and label the cooperative adaptation. |

Dry union search ignores actor occupancy and supplies approach evidence only.
The separate selected-actor dry replay checks actual four-actor occupancy; it
does not establish simultaneous wet traversal. No water flag is cleared,
unsupported environment made walkable, or other arena substituted.

## Exact input and reference binding

The 157,738-byte **development editor** Training43 map is SHA-256
`646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c`.
The tool rehashes the exact OCS roster/items and relevant OCS Main, Controls &
Movement and Equates files against its exported `PINS`, matching the delivered
register's older OCS patched baseline. Metadata cannot confer source authority.
The historical coverage input is pinned separately and only its accepted dry
exit routes are reused; its obsolete `nextObservation` is not a new dependency.

This is a standalone editor import adaptation. Editor, OCS runtime and CD32 raw
bodies differ; matching source version strings or selected rows do not establish
whole-runtime equivalence. The campaign Locations CRC mismatch remains a
campaign restriction and does not prevent this explicit import case.

Relevant OCS boundaries are movement/stairs `Controls&Movement.s:4728–4815`,
head writes `4871–4891,8263–8301`, text-panel no-op dispatch `6627–6645`,
positional messages `Main.s:506–568`, immersion `600–645`, wet support/delay
`3972–4061`, and corpse search `1173–1222,1295–1305`.
The independently hashed development-source spans put immersion at 646,
messages at 552 and player fall at 4036. Those bounded caller/arithmetic spans
match lexically after comment/whitespace removal. The broader development move
span differs: it adds a fire-animation guard around footstep playback. The
case chooses OCS behavior; it grants no audio, assembler, executable or whole
build equivalence from that comparison. Raw file/span receipts stay private.

The accepted [immersion](immersion-caller-contract.md),
[inventory](water-inventory-contract.md),
[drowning](drowning-decision-contract.md), and
[threshold observation](wet-entry-observation.md) are reused. Their completed
CPU observations are not rerun. [Dry descent](dry-descent-contract.md),
[landing](landing-damage-contract.md),
[death](death-transition-contract.md) and
[after-death controls](after-death-control-observation.md) retain their limits.

## Immediately usable consumer contract

Use the existing four-view app, exact original editor geometry and verified
ready team `[11,3,0,5]`. Select slot 4 (zero-based slot 3): the raw roster
supplies **race 4**, which is nonimmune in the OCS caller. Only race 1 gets that
race-immunity branch; spell 97 is separate. Compare slot 1's actual race 1.
Neither immunity branch bypasses preceding inventory processing. Do not infer
immunity from the roster label or the existence of race 4.

The private case contains the deterministic north-facing dry approach, source
word, directional branch, immediate reverse key, logical body/current/old
references, exact expected packed-head/plane preservation and complete helper
input/output snapshots. Raw positions, cells and routes are intentionally absent
here. The shortest bounded sequence is: select the actor, follow the case's dry
approach, enter once and immediately reverse the stair. No wait to a damage
request is part of this minimal sequence.

First and second accepted immersion calls on the selected source inventory
produce counts 1 and 2, process inventory/weight, preserve fitness and request no
damage; dry return resets the breath count to zero without undoing item changes.
Conditional isolated arithmetic probes at counts 24/25/26 establish threshold
25: only 26 requests hit 5200 and indicator 150. These probes are not waited
gameplay and do not apply damage. Actual item entry bytes, scan extent,
replacements, weight and preserved tail/actions are bound by the helper outputs,
not copied from a synthetic item table. The race-1 comparison processes its
actual inventory before clearing breath count.

The same consumer must deliver and prove:

1. **Keyboard/browser:** real approach, wet entry, immediate return, visible
   actor/scenario and paused/running state, before/after breath, item, weight,
   fitness and no-damage outcome. Test real occupancy and overhead reservations,
   actor selection and refusal, not only direct helper calls. Original exit and
   labelled cooperative mode remain available; fresh Retry reconstructs all state.
2. **One state owner:** preserve four body/head occupancies, current/old logical
   references, separate stats/runtime dead words, control/window, leaders,
   counters, spells, full inventory/actions, weight, feedback and mission state.
   Head replacement preserves water/auxiliary flags; arrival's source mine check
   clears only its specified third-plane marker. Do not overload normalized
   authored dry-fall incapacity as original death.
3. **Bounded scheduling:** declare the fixed-step adaptation. OCS runs drowning
   before falling/controls, admits its signed count at 50 and resets it; falling
   runs only when its unsigned count is **greater than 6**, subtracting 6 once.
   Supported wet player-fall calls set delay 0→2, then 2→1→0, clear pending fall
   damage and retain the pose on this inert support. These are source deductions,
   not an implemented wet helper or measured wall-clock cadence.
4. **Damage/lifecycle refusal:** until supported composition exists, reject any
   transaction that produces a non-null damage request, including zero, before
   installing any partial inventory/counter/fitness result. The accepted normal
   damage/death helper requires an ordinary floor, no auxiliary and empty block
   below; this wet stair has inert block support and auxiliary stairs. Its fatal
   caller reaches `handle_dead.find_floor`, then `found_floor`, then `stairss`
   and a neighboring search. The private case names the exact redirect operands.
   Prove that caller's search/corpse owner/return references, both dead words,
   leader changes, occupancy removal, subsequent controls and all-dead/exit ties
   before lethal or continuing-damage activation. Existing after-death evidence
   does not select a survivor automatically. Explicit keyboard selection must
   remain a labelled adapter policy. Never strip water, fabricate a floor or
   substitute a dry slice to force an existing helper to accept.
5. **Atomic paused recovery:** save before entry, after an item/breath pass and
   after return; restore paused and continue with identical ordered effects.
   Bind exact sources and chronological commands/counters, complete inventory,
   weights, heads/body references and every lifecycle mutation. Altered history,
   mismatched source, stale/interrupted async load or unsupported corpse state
   refuses without changing the working session. No duplicated item damage or
   pad/corpse effects. Test Retry and recovery through actual browser controls.

There is no deeper unsupported water column hidden by this classification.
The precise remaining boundary is installation of the supported wet delay,
head/body and scheduled immersion caller, followed by the supported wet
damage/death/search/control composition for continued exposure. It belongs in
this immediate consumer, with actual browser proof, rather than another sequence
of detached APIs. Controllers/TV remain separately deferred.

## Reproduce and review

`tools/training43-acceptance-case.ts` exports a typed generator and strict
validator. Validation regenerates from raw pinned bytes and rejects any changed
claim, route, actor, inventory, counter or consumer requirement. Witnesses must
be plain dense JSON data; hidden, accessor, symbolic and cyclic fields reject.
Generation exclusively creates ignored `.local/t43-04/*.json`; it cannot
overwrite previous evidence or write outside that directory.

```powershell
npx tsx tools/training43-acceptance-case.ts $env:HIRED_GUNS_TRAINING_MAP $env:HIRED_GUNS_ROSTER $env:HIRED_GUNS_ITEMS $env:HIRED_GUNS_OCS_SOURCES $env:HIRED_GUNS_T43_COVERAGE .local/t43-04/new-case.json generate
npx tsx tools/training43-acceptance-case.ts $env:HIRED_GUNS_TRAINING_MAP $env:HIRED_GUNS_ROSTER $env:HIRED_GUNS_ITEMS $env:HIRED_GUNS_OCS_SOURCES $env:HIRED_GUNS_T43_COVERAGE .local/t43-04/new-case.json validate
npx vitest run tests/training43-acceptance-case.test.ts
npm run check
```

For private opt-in, set `HIRED_GUNS_T43_CASE_INPUTS` to a private JSON manifest
with `inputs` mapping each exported `PINS` key to its raw local filename, and
`casePath` pointing to the generated case. Public CI uses synthetic fixtures;
it never discovers or embeds original files.

Private receipts, relative to this isolated worktree:

| Artifact | SHA-256 |
| --- | --- |
| `.local/t43-04/review-case.json` | `fc48fe373e1303074f0c414e25e86fbae24a1fd2d9af25ae7ca18fdc7ae24ed0` |
| `.local/t43-04/source-variants.json` | `5673deb45f3a383b58cdfb563f48002e7fd0aa1c1604a33369b9fbcc2bd37f5b` |

The private handoff records exact head/tree, full command/log hashes, manifest,
failed attempts and current verification. Independent exact-head HIGH review,
current CI, completed automatic review and coordinator acceptance remain open.
No browser is needed for this tool-only change; browser execution is mandatory
in the named next consumer. Model: gpt-6.1-sol medium; no delegation or new CPU
observation. Token usage unavailable. Test counts are not completion percentages.


## Witness ownership and resource budgets

Exported pins, consumer policy and limits are deeply frozen at runtime. Each
returned case owns separate policy arrays and pins. Validation synchronously
captures a descriptor-only private copy before its first await; later caller
edits cannot repair invalid call-time evidence or introduce getter reads.
Raw source buffers retain their existing synchronous snapshot/hash boundary.

The pinned witness measures 226,892 pretty-printed UTF-8 bytes, 7,782 value
visits, depth 9 (root depth 0), maximum collection 50, longest string/key 274
UTF-16 units, and 55,311 total string/key units (including array-index keys). Explicit headroom limits are
1,048,576 file bytes, depth 32, 32,768 value visits, 256 entries per collection,
4,096 units per string/key and 262,144 total string/key units. Shared subtrees
are copied per occurrence and charged each time; active cycles reject. Thus a
small shared DAG cannot multiply work beyond the visit budget. Dense-array
length is checked before output allocation; unknown/hidden/symbol/accessor and
malformed fields still reject. Limits grant no authority: full pinned canonical
regeneration and equality remain required.

CLI validation opens and stats the witness before a fixed capped read, detects
growth beyond the byte limit, then checks UTF-8 bytes and lexical JSON nesting
before parsing. The parsed value passes the same collection/string/work limits.
Reflection necessarily obtains an object's own-key list before checking its size;
JavaScript proxies can run traps during reflection and cannot be sandboxed by
this API. Ordinary property getters are never evaluated, including after await.
These limits bound traversal/copy work for ordinary in-process data and file
parsing bytes/nesting; they do not promise isolation from hostile proxy code.

PR114 is now accepted as a bounded CASE. Its validator also accepts swapped built-in Object/Array prototypes before normalizing its returned canonical tree; consumers here use parsed JSON and ordinary data, with no prototype authority or sandbox claim. The case generator remains read-only. The new [keyboard consumer](training43-wet-traversal.md) remains UNREVIEWED; T43-04 partial and T43-05 open are unchanged.
