# Adele portrait proposal

26 October 2026. One local visual proposal against accepted base
`bb8908822fd630becffd69be7784f51c4616bed0`. This is new artwork awaiting Derek's
assessment, not recovered historical evidence or a scene integration.

The unchanged runtime portrait and historical character sheet were inspected
before one built-in imagegen invocation. The proposal retains short dark hair,
warm skin tones, the bright green costume, dark inset areas and ivory industrial
forms. It develops those cues into defined facial features, fabric seams,
fasteners, worn materials and deliberate warm key/cool fill lighting. Exact
facial anatomy, garment construction and surface wear are artistic choices;
the original pixels do not establish those details.

The generated PNG is **1706 × 922**. It is a newly painted interpretation,
not an interpolated enlargement. The final prompt is saved in ignored
`.local/adele-enhanced/prompt.txt`; no CLI/API fallback was used. Only one
portrait was generated. There was no environment asset generation, runtime
change, engine migration or modification to the faithful asset-proof viewer.

## Local comparison and provenance

From the coordinator `repo` worktree, open
`.local/adele-enhanced/index.html`. It is a standalone offline document with
embedded images, restrictive CSP and no script or external resources. Labels
are **Original** and **Proposed enhanced artwork**. At the validated desktop
size, the original displays at exact 12×, **576 × 312**, beside the proposed
image at **576 × 311.28** without cropping or distortion. The same new image is
also displayed below at **1176 × 635.56**. Narrow displays stack the comparison.

The original PNG is byte-identical to the prior proof, with its original
48 × 26 color pixels and explicit mask intact. Its neutral backdrop is a
display surface, not a change to the PNG. Neither image is a measured Amiga
display reproduction; see [original asset proof](original-asset-proof.md).

| Artifact | SHA-256 |
| --- | --- |
| `adele-original.png` | `b49121077ba861d0d55bb09bdcf34639b6e7f23a16790329c255a9e6d1b7ed2f` |
| `adele-proposed.png` | `31010fd0bbf12478a063631839f5b80c52a05d3873efdaa58572bdf857fb30cf` |
| Existing faithful `index.html`, unchanged | `df741aa514c89883561119ceb5bfdcadf9199ca9e3c0a0d425565484618763b5` |
| Saved generation prompt | `3a58a0026e6eec206d5b9096b8b5e7fb8d6782170f62df370e5f7dfed199a820` |

All reference images, generated artwork, prompts, comparison HTML, adapters and
screenshots remain local under ignored directories. The comparison can be
rebuilt from the persisted PNGs; image generation itself is not deterministic.

```powershell
node .local/adele-enhanced/build-comparison.mjs
node .local/adele-enhanced/smoke.mjs
```

Two Chromium loads reproduce the same RGBA hashes. Original RGBA is checked
against the prior indexed input, not merely against its copied PNG. The
enhanced comparison/enlarged views have identical pixel hashes. There are zero
HTTP requests or browser errors, and no overflow at 390-pixel viewport width.
`browser-smoke.json`, `comparison.png` and `full-comparison.png` retain the
checks locally. Both the generated artwork and full comparison were visually
inspected. Local comparison validation corrected a relative-path error and
replaced an unnecessarily large browser pixel transfer with in-browser hashing;
neither correction altered either image. No second image generation was needed.

## Fit with the existing renderer

The existing renderer in `src/render/four-views.ts` uses Three.js, four scissored
camera views, simple lit geometry and cylinder avatars. A portrait can be added
later as a roster-bound HUD image without changing the simulation or engine.
That requires an approved crop and display size, local asset loading, a fallback
image, and four-pane/TV readability and memory checks. If displayed on a 3D
surface instead, its already painted lighting needs an unlit presentation and
explicit color-space handling to avoid lighting it twice.

Extending this style to the world would require approved material, palette and
lighting rules, verified source frame/direction identities, and deliberately
authored textures or character views. A portrait cannot supply unseen angles,
animation or wall textures. Environment geometry would also need UVs/material
bindings and four-view performance validation. The unresolved Style00 identity,
palette and mask evidence gate remains in the original asset-proof document.
These are future prerequisites only; this batch stops at one portrait.

Tokens unavailable. Public changes are documentation only; independent review
and passing relevant CI precede coordinator integration.
