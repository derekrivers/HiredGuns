# Controller / TV acceptance diagnostic

Target evidence date: **3 November 2026**. Status: **awaiting real hardware and human observations**.
Synthetic automation verifies this diagnostic's browser behavior only. It does not establish four physical
controllers, a TV connection, seating-distance legibility, audio or playable-level acceptance.

## Run the separate preview

From this checkout run `npm ci`, then `npm run dev -- --port 5192 --strictPort`, and open
<http://127.0.0.1:5192/tools/controller-preview.html>. It is a development entrypoint; the normal game and
production build do not import it. No packages, gameplay input rules, simulation or global styles changed.

Press a button on each controller so the browser exposes it. Select each controller in a player slot, then
click **Start / resume observations**. Raw axes and every button's analogue value/pressed state appear
alongside connection/mapping, last routed action and cumulative command count. Device strings are browser
reports, not verified model identities. Nonstandard mappings are visible but emit no routed commands.
Assignments use the existing read-only `InputRouter`; assigning a source to another slot clears its old slot.
The preview deliberately captures no gameplay keyboard events; typing in observation fields is form input only.

This diagnostic polls on animation frames and uses a diagnostic frame counter for router repeat gating.
It does not measure gameplay timing, input latency, simulation parity, controller calibration or dead-zone
quality. Commands are observations; the large four views are calibration panels, not game rendering.
Counters are cumulative per slot during this page session. Last action is historical and remains visible after
release; a stable counter confirms no further command. Pause clears the displayed last action, not counters.

Assigned-device disconnect or index reuse with a different ID pauses all observations. A matching
`gamepaddisconnected` event pauses immediately and records the pause even when the same index/ID reconnects
before the next animation-frame poll. Events for unrelated indices/IDs do not pause assigned input; polling
still catches missing or identity-changed snapshots when no event is received. Reconnection does
not resume automatically. Reassign if the browser changed device index/ID, release controls, then resume
explicitly. Focus loss / hidden page also pauses and clears router repeat state. **Pause observations** is
always available. A device read failure reports its error and pauses; fix access and resume explicitly.

## Event hardware procedure (human observation)

Use the actual event PC, browser, connection mode, four controllers and TV. Record model names, wired or
wireless links, OS/browser versions, TV resolution/refresh and picture mode, scaling/zoom and seating distance
in the receipt setup/notes. Keep the target date if the session is postponed; report an actual date separately.

1. Select **Human-reported physical hardware session** and enter the observer's name. Confirm four distinct
   physical controllers appear and assign P1–P4. Move all four at once; each action/counter must belong to the
   correct person/view. Try D-pad, left stick and shoulder actions supported by the router.
2. Release controls; counts must stop increasing. Disconnect an assigned controller while holding movement;
   all observations must pause. Reconnect, release to neutral, and confirm nothing resumes until requested.
   Resume and verify movement/release again. Repeat for each controller; record reindexing or identity changes.
3. Switch to another application/tab while a control is held. Return and confirm the preview stays paused.
   Release controls and resume. Report any unintended repeat or lost assignment.
4. Use **Toggle fullscreen**, then **Enter TV calibration**. Confirm P1 top-left, P2 top-right, P3 bottom-left,
   P4 bottom-right. The panels use a 5% inset and show a border/outer-edge labels, five grey steps and RGB strips.
   Check legibility and clipping from each actual seat; record picture-mode/overscan/scaling adjustments.
   This is a visual check, not automatic display calibration or input-lag measurement.
5. Listen to approved audio on the event output path using its separate local audio preview/game build.
   This controller diagnostic produces no sound. Record audibility, routing, mute/mix behavior and dropouts;
   do not mark audio passed from browser device/controller telemetry.
6. Set each human checklist item to pass/fail/not-run (defaults pending), add actual observations, and
   **Export local JSON receipt**. Save privately under ignored `.local/` if retaining device/setup details.
   A failed or untested item remains actionable; no overall physical pass is inferred by this tool.

## Receipt and evidence boundaries

The download records provenance selection, browser UA, viewport/screen/DPR/fullscreen/focus, current device
snapshots, assignments, command totals, recent session events (bounded to 100), and separately attributed
human notes/checks. It records no raw keyboard stream and makes no network upload or persistence. Exports
can include device names and freely entered setup information; keep private as appropriate. Reload starts a
new observation session. Browsers may conceal devices until interaction or deny access through policy.

Source defaults to **Browser telemetry — source unverified**. Automated tests must choose **Synthetic injected
pads / automated test**. Human attribution requires the physical-session selection and a nonempty observer;
that attribution is a user statement the tool cannot verify. `physicalAcceptance` always remains
`not-established-by-this-tool`, including when a human marks every item passed. Review receipts and actual
observations before accepting the physical setup. No default, automatic or synthetic physical passes exist.

## Automated checks

Run `npm run check`. Browser checks are `tests/browser/controller-preview.spec.ts`, using four explicitly
injected synthetic pads. They cover distinct actions, release, assignment uniqueness, disconnect/reconnect,
identity replacement, synthetic disconnect/reconnect events within one task between polls (including receipt
retention and unrelated-device filtering), an explicitly injected blur event, nonstandard raw-only input, form typing, receipt provenance
and calibration panel bounds at 1920 × 1080. Public screenshots contain only synthetic data.
Headless tab activation did not reliably change document focus; actual app/tab switching remains a human check.

For a concurrent isolated run, create an ignored `.local/controller-playwright.config.ts` importing
`defineConfig` from `@playwright/test`, set `testDir: '../tests/browser'`, `testMatch: 'controller-preview.spec.ts'`,
`use.baseURL: 'http://127.0.0.1:5192'` and `webServer` command `npm run dev -- --port 5192 --strictPort`, URL
`http://127.0.0.1:5192`, `reuseExistingServer: false`. Run
`npx playwright test --config .local/controller-playwright.config.ts`. No shared config edits are required.

Browser API reference: [W3C Gamepad specification](https://www.w3.org/TR/gamepad/) for polling,
device exposure, index/ID and standard mapping semantics. Actual device/browser support requires observation.
