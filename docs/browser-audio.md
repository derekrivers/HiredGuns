# Browser audio preview

Run `npm ci`, `npm run dev`, then open <http://127.0.0.1:5173/tools/audio-preview.html>.
This is a separate development entrypoint; the normal game entry and production build do not load it.
Choose local effect/music files, click **Enable / resume audio**, then use the playback and mix controls.
Selection decodes without playing. Inputs are read with `Blob.arrayBuffer()` into memory; there is no upload,
asset fetch, persistence, pack discovery or bundled audio. A later successful selection replaces that input's
decoded buffer. A failed selection retains the previous successful buffer and reports the error.

The already approved 61 Enhanced effects and 12 Enhanced music cues remain in the ignored local
audio-programme directory. Select those existing files explicitly for private listening; do not copy them
into public assets or commits. The approval manifest pins their hashes. Screen/briefing mappings in that
directory do not establish continuous gameplay music, authored loops or original playback parity.

## Reusable service

`src/platform/audio-service.ts` is browser output infrastructure with no simulation, save, DOM or game
event dependencies. The caller retains decoded `AudioBuffer`s and decides which explicit events play them.
Create one `AudioService`, call `activate()` directly in a user gesture, then `decode(blob)` and call
`playEffect(buffer)` / `playMusic(buffer)` when ready. Both play methods return `false` unless enabled and
the context is running; they never wait for activation or decode and never enqueue stale events.

- Context creation is lazy. `activate()` resumes it and returns whether that attempt is still current.
  Browser rejection propagates to the caller; retry from another gesture. The service does not bypass autoplay policy.
- Decoding uses the complete selected file. Unsupported/corrupt files reject with `AudioDecodeError`, without
  destroying the graph or playing anything. Buffers are resampled to the context rate by the browser.
  Disposal during decode rejects its eventual result. Stop/pause do not cancel independent decoding.
- Effects overlap, with a default maximum of eight voices (configurable integer 1–64). At capacity the
  oldest is stopped/disconnected before the newest starts. Natural completion disconnects and frees the voice.
- Music has one source, plays once, and replaces its previous source synchronously. There are no loop,
  positional, trigger, crossfade or delayed scheduling rules. New sources are created for each playback.
- Effects/music gains accept finite values in `[0, 1]`; master mute preserves both values. These are linear
  gains, without loudness normalization, a limiter or any hardware volume guarantee. Overlapping loud inputs
  may clip; use restrained levels for listening.
- Pause immediately discards effects and holds music's offset using the audio context clock, then suspends
  the context. Explicit activation recreates music at that offset. Music requests while paused return false
  and leave the held cue unchanged. Unexpected context suspension/interruption holds music and drops effects;
  even if the browser later resumes itself, explicit activation is needed before further service playback.
- Stop removes all voices and held music and invalidates pending activation. Enable again before playing.
  Stop does not suspend/close the context. Disposal stops sources, disconnects gains, removes the listener
  and closes the owned context; it is terminal and idempotent. Do not inject a shared context.

Stop, pause, disposal and newer activation attempts invalidate earlier pending activation continuations.
No deferred continuation may recreate music after stop or disposal. Keep `pause()` / `activate()` calls in
user intent order; do not use this service to schedule simulation actions. Preview page hiding disposes it;
reload after navigating away and back if a browser retains the page in its back-forward cache.

## Verification and limits

`npm run check` checks lint/types/unit tests/build. `npx playwright test tests/browser/audio-preview.spec.ts`
uses synthetic PCM WAVs generated in memory. The real Chromium graph is observed with an analyser after
master gain: tests check nonzero rendered signal, mute silence, music gain change, source replacement,
voice limits, pause/resume offsets, stop silence, natural cleanup and invalid-file recovery. Unit tests
exercise pending-activation invalidation, external suspension, decode failures and terminal disposal.

These checks establish browser decode/render/control behavior, not subjective listening quality, audible
speaker output, seamless loops, original hardware/emulator timing, other-browser compatibility or event
PC/TV acceptance. No synthetic recording or test artifact contains recovered content.

Technical references consulted: [W3C Web Audio API](https://www.w3.org/TR/webaudio/) (source lifetimes,
context state, decode and rendering semantics) and [Chrome's Web Audio autoplay guidance](https://developer.chrome.com/blog/web-audio-autoplay).
