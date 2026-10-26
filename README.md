# Hired Guns Revival

Browser revival in progress. Target: four local players, one mercenary and viewport each. One complete original level is the birthday fallback; full campaign is a stretch target. No level is playable yet.

Requires Node 22.20+ and npm. Run `npm ci`, `npm run check`, then `npm run dev` and open http://127.0.0.1:5173. `npm run build` produces a static build in dist; `npm run preview` serves it. The game will require WebGL2. Dependencies are bundled at build time; no remote runtime service is intended.

Original game content is not distributed here. Keep local archives and imported content in ignored `.local/` paths. Public CI uses synthetic fixtures only. Local research is outside this checkout and must not be copied wholesale into it. Format observations are source-informed; no claim of clean-room development or permission to redistribute original content is made.

See [STATUS.md](STATUS.md) for evidence, limitations and the next batch. Core contracts live in src/contracts.ts; simulation must remain independent of presentation. A fixed clock and explicit RNG are requirements, not proof of parity with the original.
