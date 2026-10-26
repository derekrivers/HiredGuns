# Supported-floor landing continuation observation

26 October 2026. This bounded observation covers only `Main.s:4037-4061`,
the `.end_fall` continuation after support has already been selected. It adds
evidence, not code or live behavior. Original OCS instructions execute from that
entry through return with synthetic actor storage and a synthetic packed cell.
Damage entry is intercepted before any damage/death instruction executes and
modeled as an immediate return preserving actor/cell storage and A0/A2. The
continuation results below are conditional on that return convention; they do
not establish real death register preservation or damage/death composition.

The executable is the recovered OCS build identified in
[water-executable-evidence.md](water-executable-evidence.md), SHA-256
`46a252f1f2d306d280856f24bcf9c2dc502c7c0a988c51f83cdce71e810e2d84`.
The inspected `Main.s` SHA-256 is
`cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9`.
The private diagnostic uses Python 3.13.7, Unicorn 2.1.4 with the M68000 CPU
model, and Capstone 5.0.7. It limits each case to 100 instructions and asserts
return to its sentinel, requested hit, pending writes/order and unchanged
unrelated actor/cell storage. No original map, roster or item table is needed.

For an unsigned pending fall-damage long `p`, the continuation first tests zero.
Zero makes no damage call. Otherwise it masks the cell with `keep_water`
(`0x00060004`) and follows this complete local decision:

| Presence bit 2 | Depth bits 17..18 | Masked value | Request when p is nonzero |
| --- | --- | --- | --- |
| 0 | 0 | 0 | p |
| 1 | 0 | 4 | p logically shifted right twice |
| 0 | 1 | 0x20000 | p logically shifted right twice |
| 1 | 1 | 0x20004 | None |
| 0 | 2 | 0x40000 | None |
| 1 | 2 | 0x40004 | None |
| 0 | 3 | 0x60000 | None |
| 1 | 3 | 0x60004 | None |

The nonzero mask comparison is against `0x20004`; values greater than or equal
skip damage. The remaining nonzero encodings execute two logical shifts.
Although a second equality branch appears between the shifts, the earlier
greater-or-equal branch has already excluded equality. These inspected
instructions therefore provide no half-hit path. A nonzero pending value 1 or
3 can request a hit of **zero**, which still invokes the damage entry. None and
zero must remain distinct. Mask comparisons here use small nonnegative values;
unrelated cell bits cannot affect them.

Every initially nonzero pending value is cleared after the damage call returns,
or immediately on the damage-skip branch. The intercepted call observes the
original pending value, proving clear-after-call ordering under the stated
return convention. The final continuation rereads the cell and compares its
masked value against `0x40004`. At or above that threshold it clears pending
again, including when pending was initially zero. On this unchanged-cell slice
the final pending value is always zero. The second clear is an observed write,
not a second damage request. With initial zero and a smaller mask, no pending
write occurs. The synthetic cases preserve all other actor bytes and the cell.

The 56 cases cover all eight encodings with pending 0, 1, 3, 4, 65535 and
4294967295, plus one unrelated-bit variant for every encoding. All assertions
pass, including four zero-hit calls. Original instruction listings, exact
private addresses and traces remain ignored at
`immersion-caller/.local/landing-observation/`. The report `results.json` has
SHA-256 `1fe39c5f74016bff920d3fcf01f6e681943a68c2655cfc37ad4ee83e01f4f2f3`.
From that worktree, `python .local/landing-observation/observe.py` reproduces the
private assertions against the pinned local executable and source. The first
harness run rejected the original JSR stack write; allowing only its expected
return-address push corrected that diagnostic setup. No original code changed.

This is direct continuation entry, not proof that every supplied pending/water
combination reaches `.end_fall` during gameplay. The earlier player-fall branch
has eligibility guards, water delay/reset, support checks and movement. Some
water combinations can clear pending before this entry. None of those paths,
descent, geometry, pads, mines, occupancy, actual damage/death or recovery are
executed here. No environmental activation or complete-level claim follows.

The smallest next pure boundary is a validated supported-floor landing request
decision for explicit unsigned `fallDamage` and packed `cellLong`: preserve
opaque bits, compute this nullable inert damage request, and describe the
ordered pending-clear continuation separately from request dispatch. A result
must retain a zero request and must not claim damage, survival or completed
post-damage state before the helper returns. A later actual composition with
[ordinary-floor damage/death](damage-death-contract.md) must validate its full
accepted actor/map slice and establish the continuation's preserved references
before committing its post-call clear. This observation did not implement that
caller; the subsequent [pure staged API](supported-landing-contract.md) now
implements only the explicit storage-preserving modeled-return boundary.

Validation is the 56 private CPU assertions; the primary code commit separately
passed `npm run check` with 191 tests. This evidence-only follow-up changes no
code/browser surface. Model: gpt-6.1-sol, medium; one observation attempt and one
evidenced harness setup correction. Token usage unavailable. Independent review
and integration remain coordinator-owned.
