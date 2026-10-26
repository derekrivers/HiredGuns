# Hired Guns Revival

Browser revival in progress. Four synchronized 3D views now support independent local navigation. One complete original level is the birthday fallback; full campaign is a stretch target. This is a static navigation prototype; no complete mission is playable yet.

Requires Node 22.20+ and npm. Run `npm ci`, `npm run check`, then `npm run dev` and open http://127.0.0.1:5173. `npm run build` produces a static build in dist; `npm run preview` serves it. WebGL2 is required; dependencies are bundled at build time with no remote runtime service.

The initial map is newly authored synthetic geometry. Click **Start navigation**. Four keyboard groups are shown below the views; numbers 1–4 assign WASD to a selected mercenary for fewer-player team control. Each view also allows explicit standard gamepad assignment. Press a controller button if the browser has not exposed it. D-pad/left stick moves and turns; shoulder buttons strafe. Disconnect stops that controller; matching device ID/index reconnects, otherwise reassign it. Esc, tab hiding and window focus loss pause navigation. Reset positions restarts the current map. Four physical controllers still require testing on the event PC/TV.

**Local original map:** use **Open local .map** to choose an extracted development editor file. Dropzone (`Maps/Game/Map13_Dropzone/13.map`) is the verified navigation candidate. Files stay in browser memory. Other maps can import but may fail the conservative start checks or encounter unsupported mechanics. The importer accepts only 157,738-byte raw editor files, not packed `.rnc` or runtime formats. The UI reports source hash, unknown/unsupported mechanics and current controls. No campaign travel or exit is enabled.

For a reproducible conversion/report, run `npm run import:map -- "<absolute-source.map>" --out .local/map13.json`. Existing files are never replaced. See [format details](docs/map-format.md). Do not put original data in public/; Vite's public directory is disabled.

Run `npx playwright install chromium` once, then `npm run test:browser` for synthetic browser tests. To additionally smoke-test the locally held Dropzone in PowerShell, set `$env:HIRED_GUNS_MAP` to its absolute file path before running the browser tests. Simulated pads verify browser routing only, not physical controller compatibility.

Original game content is not distributed here. Keep local archives and imported content in ignored `.local/` paths. Public CI uses synthetic fixtures only. Local research is outside this checkout and must not be copied wholesale into it. Format observations are source-informed; no claim of clean-room development or permission to redistribute original content is made.

See [STATUS.md](STATUS.md) for evidence, limitations and the next batch. Core contracts live in src/contracts.ts. Prototype navigation blocks opaque/solid cells, hazard cells and unsupported drops; it supports explicit floors or type-0 solid blocks below. Special block shapes, gravity/stairs, enemies, doors, combat/inventory, sound, saves, mission completion and original timing parity remain unimplemented. Stable ID order resolves contested cells; swaps into occupied-at-start cells are blocked. This is an explicit prototype policy pending reference validation.
