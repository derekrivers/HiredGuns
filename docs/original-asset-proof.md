# Original asset proof

26 October 2026. Standalone local evidence at base `68e689b525b4c949c8f1ac587f1d47d02064c262`; no world, simulation, scene, save or timing integration. The public tool is a generic indexed-image validator/viewer. Original bytes, private recovery adapters, JSON, screenshots and HTML remain ignored under `.local/asset-proof/`.

## Portrait result and provenance

The local comparison displays Adele's recovered runtime portrait block, **48 × 26**, at native 1× and exact integer 6× (288 × 156). The optional comparison changes only its surrounding frame/background lighting. All three images embed the identical PNG. There is no interpolation, cropping, pixel recoloring, animation or new artwork. Pixel proportions are square data pixels; this does not reproduce a particular PAL monitor's aspect ratio or color response.

Identities checked against actual files by the adapter and again by the viewer:

| Source | SHA-256 |
| --- | --- |
| Packed `Test/HiredGuns/CharactersGfx/Adele.gfx` | `4d68547c20670929ece2c4bfa70eea2e1ff7fbfce117e13f7a61a7728f8cad5f` |
| Recovered `Test_HiredGuns_CharactersGfx_Adele.gfx.bin` | `692ba6ad9dc3fde70d818d3dac0695765dfb5b36f9ec5c354708ba5b77da714d` |
| Reference `Test/HiredGuns/Characters/Adele` | `a04fe75629a3cfb47944af290d3ba269427162fa3a929a99d341149d2ffd1d89` |
| OCS `Sources/Main.s` | `cb52786738b11783e5736abb4153b1a2ad25b49fa8ffa769f08ca1907d17e3f9` |
| OCS `Sources/Macros.i` | `550ae1cf9728b8e7f920bd283c60145669a984a93095f8f8bc6fa0f315f0cffa` |
| OCS `Sources/Drawviews.s` | `1a56a8ac2d3dc503ff9668b0d6bedec70fbd2a9558c0b44889084527ded94277` |
| OCS `Sources/Miscroutines.s` | `146778adaa4c8047d608c9b209074efe3508908ae8f14b5f75215b74fa7e29b9` |

The private adapter reuses `research/tools/audit.py` to recover the packed bytes and confirms equality with the persisted decoded file. It reuses `make_evidence_images.py` / `inspect_formats.py` for the independent IFF comparison. The face BOB starts at 14224; its first block descriptor begins at +18, reports 48 × 26 and data offset +46. Four plane-major color planes begin at 14270. `Main.s:6315-6323` preserves the figure/face boundaries; `Macros.i:26-33` defines the BOB fields; `Drawviews.s:3397-3420,3512-3540` resolves the descriptor into the BOB. Frame identity is explicitly first portrait block, still; direction is a fixed portrait, with no world-facing identity.

**The 12/12 historical comparison is low-four-plane equality only.** The reference IFF is 320 × 256, five planes, ByteRun1, BMHD mask mode 0 and a 32-entry CMAP. Its crop `(0,165)-(48,191)` has one index 19 at zero-based portrait pixel 161 (x17,y3), where the recovered four color planes have index 3. The remaining crop indices are below 16. Full five-plane IFF equality is false. The viewer uses the runtime package and runtime source palette/mask; it does not silently truncate the IFF and claim full reference equality.

Palette provenance is OCS `Main.s:7439-7440`, the first sixteen `game_palette` RGB4 words, loaded into `views_palette` by `gs_part3` at line 6665. The face BOB copies four color planes and clears the fifth. Each RGB nibble is expanded by multiplication by 17 to canonical RGB8. The IFF's editing palette is different and is not substituted. This is a verified source-derived palette interpretation, not an emulator capture or measured display colorimetry claim.

Alpha provenance is the BOB's mask field **4**, with the fifth stored plane immediately after four color planes. `Miscroutines.s:356-385` calculates the mask address and uses source A with `D=AB+~AC`: mask 1 copies the color, mask 0 preserves the destination. This yields **872 opaque and 376 transparent pixels**. Index zero is never assumed transparent. Transparent areas are shown against the same neutral gray in both comparisons. This preserves the isolated sprite's mask; it does not reconstruct a live game's backdrop or clipping windows.

## Generic interface and trust boundary

`tools/preview_original_assets.py` accepts one explicitly supplied JSON object:

- `schemaVersion`: integer 1; `sources`: 1–16 unique `{id, sha256}` records, lowercase SHA-256.
- `image`: `sourceId`, `width`, `height`, `paletteSourceId`, `paletteEvidence`, `layoutEvidence`, `frame`, `direction`, `palette`, `indices`, `alpha`.
- Dimensions: integers 1–1024, at most 262,144 pixels. Palette: 1–256 RGB byte triples. Indices: exactly width × height integers in palette bounds, row-major.
- Alpha: exactly `{mode, sourceId, evidence, values}`. Mode `opaque` requires null values and documented opacity; mode `mask` requires exactly one explicit 0/255 integer per pixel. Unknown alpha is rejected. Evidence/identity strings must be nonempty, bounded and free of controls. Frame/direction identities are mandatory even for stills.

Unknown/missing fields, duplicate JSON keys, nonfinite numbers, booleans masquerading as integers, malformed bounds/palette/indices/alpha and duplicate/missing/extra source bindings reject. The CLI limits JSON to 8 MiB, hashes every actual `--source ID=PATH`, and rejects mismatches before writing. It refuses overwrite and output outside the current worktree's resolved `.local/asset-proof/` subtree.

Source hashes establish file identity, not the truth of an arbitrary extraction claim. The private adapter and its independently reviewed source interpretation establish correspondence between those files and the supplied image arrays. The generic viewer cannot infer a proprietary binary format from an evidence string. JSON evidence and source labels are inert, escaped text. The HTML contains no JavaScript, fetch, command channel or external resources; a restrictive CSP denies network connections and allows only embedded PNGs and the exact inline stylesheet.

Generic invocation from the worktree:

```powershell
python tools/preview_original_assets.py .local/asset-proof/input.json --source 'synthetic=C:\private\source.bin' --out .local/asset-proof/example.html
```

Supply one binding for every declared source. Source files may live outside the worktree; generated output stays local. The example source ID is illustrative, not an extraction adapter.

## Local reproduction and validation

In the supplied workspace, from `original-asset-proof/`, the private reproduction is:

```powershell
& 'C:\Users\derek\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .local/asset-proof/extract_adele.py
node .local/asset-proof/smoke.mjs
python -m unittest discover -s tools -p 'test_*.py'
npm run check
```

The adapter writes `adele-indexed.json`, `portrait-proof.json` and `index.html`; the viewer deliberately refuses to overwrite an existing HTML file, so preserve/rename an earlier `index.html` before reproducing. The adapter binds all seven pinned source files and uses the sibling `research/` directory. Bundled Python supplies Pillow for independent IFF parsing; the public viewer/tests use only Python's standard library. `npm ci` installed the worktree's existing lockfile dependencies without changing package files.

Open `.local/asset-proof/index.html` directly in a browser. The private smoke runs Chromium against that file and saves `browser-proof.png` and `browser-smoke.json` locally. Two loads had equal canvas RGBA SHA-256 `d4d798278b5c03ed018718597da96e96f187a21fb49906ac152aeb1bb384eeea`, matching the adapter/viewer output; all three embedded images match, with native 48 × 26 and display 48 × 26 / 288 × 156. No HTTP requests or browser errors occurred. The native PNG and full browser screenshot were visually inspected. All 25 Python tests pass (12 viewer tests and 13 existing audit tests). Public synthetic tests cover the input contract, source mismatch, opacity, PNG byte preservation, deterministic escaped HTML, private output confinement and overwrite rejection. No original screenshot/data enters CI. `npm run check` passes lint, typecheck, 120 tests and build; the existing large-bundle advisory remains.

## Environment boundary

The bounded probe reused the private diagnostic decoder from `repo/.local/item-recovery/recover_rnc1_items.py`, SHA-256 `dff422b4f60eaf27927cf07ad4f070b45bbb618e7ec3796904c053c17c18765e`. OCS `Test/HiredGuns/Styles/Style00.gfx` is 85,959 bytes with SHA-256 `32889a8692cc5da8266e99e35348102159ce968690bed39f84b91a3b1db7c112`. Both packed and unpacked RNC1 CRC checks pass; 20 chunks recover **234,604 bytes**, SHA-256 `3d1f2a7dce22b31fca4ecd3fd53abdcb349f631de4217489252e86811e4ad874`. Local reproduction: `python .local/asset-proof/probe_style.py`; output `.local/asset-proof/style00.raw`.

**No environment image is claimed.** The remaining blocker is a verified Style00 block/frame identity, descriptor and image bounds, palette choice, mask polarity and direction mapping tied to a source routine or independent reference. CRC recovery establishes bytes only. No guessed offset, mask, palette, frame or PC/CD32 replacement is displayed. The next smallest observation is to trace one named OCS Style00 block descriptor through `Drawviews.s` / `Equates.i` and compare its rendered sample with a matching runtime/reference view before binding it to this interface. The probe stopped after one successful decoder invocation and source inspection, well below 45 minutes.

Model: gpt-6.1-sol, medium reasoning. One source-driven implementation pass; first focused synthetic run passed, then two CLI acceptance checks were added and passed. No implementation repair cycle, escalation or recursive delegation. Token usage unavailable. Independent review and integration belong to the coordinator; this proof alone authorizes no wider enhancement work.
