# Bounded Restore / Retry test observer

This candidate supplies an isolated local test graph for the first Restore A /
representative Retry B observation. It is engineering instrumentation awaiting
independent implementation review, not QA acceptance or permission to execute a
source-bound diagnostic. No original fixture, expected pair, source payload or
private harness is stored here.

The ordinary application, Vite config, package scripts, timeouts and existing
assertions are unchanged. Only explicit selection of `vite.obs135.config.ts`
registers `window.__OBS135_TEST__`. That config refuses build and preview and
selects a loopback test server without the original-data provider. A later
authorized harness may select it with `vite --config vite.obs135.config.ts`.
This candidate has not started that server or a browser. Production exclusion is
supported by static graph separation here; output/runtime verification remains
an independent preflight obligation.

The port has two frozen capabilities:

- `observer.readInstalled()` returns a synchronous detached, deeply frozen copy
  of the actual session/world pair, actual level and presentation, with document,
  revision, generation, monotonic capture time and journal frontier. It validates
  the entire own data graph before cloning; unsupported descriptors/prototypes
  fail observation instead of silently projecting fields away.
- `observer.readJournal(afterSequence)` returns non-consuming detached records
  and a completeness flag. Operation IDs bind Restore and Retry start, progress,
  genuine importer delivery, actual guards, effects, pair writes and settlement.
- `scheduler.armNextRestore('delivery')` and `scheduler.release(ticket)` can hold
  delivery of the genuine importer fulfillment or rejection. They accept no
  data, digest, candidate, error, install, export or Save command. Wrong, unbound
  and duplicate releases throw in the controller alone.

Restore settlement observes the actual outer handler promise after catch/finally.
Retry is synchronous: its original return or identical thrown exception precedes
its settlement record. Candidate-produced is sticky at importer fulfillment.
Installed revision belongs only to a completed restore commit, never to Retry or
the global latest pair. A pre-write error has no pair-write. A partial write has
an advanced revision and partial-failure record. A commit followed by presentation
or cleanup failure retains its install/revision and records the failure. Nothing
rolls back product state or promises prior-pair preservation after writing begins.

The plugin requires the exact normalized source SHA-256 for main, router and clock;
it refuses unmatched insertion sites. It inventories every installed identifier
assignment in main. Initial declarations are revision zero. Assignment marks and
synchronous pair transactions include equal-value writes; router repeat entries
and clock accumulator are copied inside their class scopes only in this graph.
Nested refresh helpers retain the initiating synchronous owner. Engine callbacks
find their own generation-bound operation across awaits, rather than inheriting
the newest operation. No await is inserted after the install guard and before
the pair assignments. Observer faults release held genuine delivery once, mark
evidence incomplete and never fabricate terminal outcomes. HMR/page teardown
invalidates evidence; each case requires a fresh page and server.

The exposed schedule is delivery only. Optional replay-yield scheduling is not
implemented. Save, other panels and other owning triggers have no complete
lifecycle coverage. A generation-changing residual owner or unowned pair writer
after the bounded race begins invalidates evidence; it cannot silently earn
coverage. Before the bounded race, setup pair writes advance revision but do not
provide owner-lifecycle acceptance. Opaque presentation helper exceptions also
invalidate evidence because partial effect coverage cannot be certified. These
paths cannot pass the diagnostic. Normal independent frame presentation is
recorded under reserved operation zero, outside the admitted Restore/Retry owner
set. Full independent frame lifecycle coverage remains residual.

`tools/obs135/assertions.ts` contains definitions for exact Restore/Retry
settlement and entire independent paused tick-zero pair comparison, plus the
pre-write-error prior-pair predicate. These functions launch nothing and have no
timers, retries or source reads. QA must supply its whole independently sealed
expected pair; the helper does not derive an oracle from Retry or the importer.
Independent per-phase browser download monitoring and native error/control
expectations remain harness requirements. An empty observer download journal is
not proof that the browser downloaded nothing.

Permitted lightweight checks are `npm run typecheck`, `npm run lint`,
`npx tsx tools/obs135/typecheck.ts` (static transformed graph compilation), and
`npx vitest run tests/obs135-observer.test.ts` (synthetic mechanics only). The
standalone compiler check is outside Vitest's unit-test timeout; no timeout was
changed. No build, browser, original-source import/replay or diagnostic is part
of these checks.

QA selected historical v19 only for the future bounded case. Actual-launch byte
binding, exact candidate/CI, access and heavy-slot preflight, and a fresh independent
implementation review must precede it. The separate v23 dry-return failure at
2,891/3,176 advancing ticks, 47 passed properties and the unchanged 30,000 ms
assertion remains open. The static `src/main.ts:774` assignment before presentation
and `:776` "current state retained" discrepancy remains a separate product
atomicity/error-policy gap. This seam changes neither product behavior nor that
wording. Other PR132 gates and issue closure remain with their owners.
