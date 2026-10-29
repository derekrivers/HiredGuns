# Local Training43 test setup

The header action **Load ready-to-play Training43 test** loads the original local
Training43 editor map, verified recovered OCS Characters and Items, and canonical
actors `[11, 3, 0, 5]`. It prepares the source-bound team and an isolated authored
full-ammo encounter for team slot 1. It stays **paused** and focuses **Start mission**.
Start, then use **F** to fire, **T** to change dummy/miss, **Esc** to pause and **R**
while paused to refill the authored fixture. Source inventory and authored ammo
remain separate. This is the existing standalone test bed, with its existing
placeholder graphics and unsupported world mechanics.

Under **Local character roster / team preparation**, **Known local Characters
source** and **Known local Items source** offer the configured recovered files.
Choosing one loads it without a file manager. Each currently has one explicit
known source; no additional variants or directories are inferred. Availability is
shown separately from identity: raw importers compute the hashes, and unrecognized
data remains unverified inspection data. The file pickers remain optional fallbacks.
Individual source replacement clears an active team just like the manual flow;
use the header action for complete setup in one click.

## Opt-in server configuration

The browser cannot read arbitrary local files. Vite dev and Vite production preview
support a server-only provider when `HIRED_GUNS_LOCAL_TEST_MANIFEST` names an absolute
path to an ignored `.local/local-test-preset.json`. Create that local JSON object
with exactly three keys: `map`, `roster`, `items`. Their values are absolute local
paths to the raw editor map, recovered OCS roster and recovered OCS item table.
Expected sizes are 157738, 16320 and 32604 bytes respectively. Original bytes and
machine paths must never be committed or copied into `public` or `dist`.

PowerShell, from the worktree containing the ignored manifest:

```powershell
$env:HIRED_GUNS_LOCAL_TEST_MANIFEST = (Resolve-Path .local/local-test-preset.json).Path
npm run dev -- --port 5217 --strictPort
# Alternatively, after npm run build:
npm run preview -- --port 5217 --strictPort
```

An independent reviewer can use port **5219** with the same commands. Retain other
existing previews. The application must be opened through the same loopback origin
as the server. Unconfigured or unavailable providers show generic setup guidance;
packaged static builds retain manual imports. Source catalogue availability refreshes
on page reload after configuration/file changes.

## Boundaries and verification

The provider exposes only fixed raw resource IDs and a small metadata catalogue.
It accepts GET from loopback clients, validates loopback Host and same-origin
Origin/Fetch Metadata when supplied, emits no CORS allowance, and disables caching.
Queries, arbitrary paths and directory traversal are rejected. File reads and client
responses are bounded. Errors and metadata contain no filesystem paths. Vite's
ordinary file routes are blocked for `.local`, preserving its existing secret-file
deny rules. The provider never embeds originals into the client build.

One-click setup passes raw bytes through `importEditorMap`, `createTrainingSession`
and the existing raw source verification / gun binding. Roster preparation produces
a synchronous UI commit only after parsing; the current load generation must still
match before installing map, world, sources, team and encounter. Failure keeps the
previous complete test paused. Newer map/source/selection/retry operations cancel
stale candidates. Dropdowns share manual source import logic and generation guards.
Session saves and restores retain the existing validated v6 format and exact local
source requirement; reloading the page and clicking the preset supplies those sources.

Public tests use synthetic bytes and unavailable providers. Opt-in browser proof
uses `HIRED_GUNS_PRESET_PROOF=1` against an explicitly configured local server.
Screenshots and logs containing original source-derived state belong in `.local`.
