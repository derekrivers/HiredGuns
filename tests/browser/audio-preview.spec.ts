import { expect, test, type Page } from '@playwright/test';

// Public synthetic PCM only: complete mono WAV, no recovered assets or downloads.
function tone(seconds = 8): Buffer {
  const rate = 24000, samples = Math.round(seconds * rate), wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(8192 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  return wav;
}

interface Probe { context: AudioContext; analyser: AnalyserNode; starts: number[]; stops: number; disconnects: number }
async function peak(page: Page): Promise<number> {
  return page.evaluate(() => {
    const probe = (window as unknown as { audioProbe: Probe }).audioProbe;
    const data = new Float32Array(probe.analyser.fftSize); probe.analyser.getFloatTimeDomainData(data);
    return Math.max(...data.map(Math.abs));
  });
}
test.beforeEach(async ({ page }) => {
  // Observe a real graph after master gain. Native decoding/rendering/source methods remain in use.
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      private gains = 0;
      private probe: Probe;
      constructor() {
        super(); this.probe = { context: this, analyser: this.createAnalyser(), starts: [], stops: 0, disconnects: 0 };
        Object.assign(window, { audioProbe: this.probe });
      }
      override createGain() {
        const gain = super.createGain();
        if (++this.gains === 3) gain.connect(this.probe.analyser);
        return gain;
      }
      override createBufferSource() {
        const source = super.createBufferSource(), start = source.start.bind(source), stop = source.stop.bind(source), disconnect = source.disconnect.bind(source);
        source.start = (when = 0, offset = 0) => { this.probe.starts.push(offset); start(when, offset); };
        source.stop = () => { this.probe.stops++; stop(); };
        source.disconnect = () => { this.probe.disconnects++; disconnect(); };
        return source;
      }
    };
  });
  await page.goto('/tools/audio-preview.html');
});

test('explicit local decode, real rendered signal, overlap limit, mix, replacement and cleanup', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByLabel('Local effect file').setInputFiles({ name: 'synthetic-effect.wav', mimeType: 'audio/wav', buffer: tone() });
  await page.getByLabel('Local music file').setInputFiles({ name: 'synthetic-music.wav', mimeType: 'audio/wav', buffer: tone() });
  await expect(page.locator('#effect-info')).toContainText('8.00 s');
  await expect(page.locator('#music-info')).toContainText('8.00 s');
  expect(await page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.starts.length)).toBe(0);
  await page.getByRole('button', { name: 'Play effect', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enable / resume');
  await page.getByRole('button', { name: 'Enable / resume audio' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Play 3 overlapping effects' }).click();
  await expect(page.getByLabel('Audio state')).toContainText('Effects: 8 / 8');
  await expect.poll(() => peak(page)).toBeGreaterThan(0.05);
  expect(await page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.stops)).toBe(4);
  await page.getByLabel('Master mute').check();
  await expect.poll(() => peak(page)).toBeLessThan(0.00001);
  await page.getByLabel('Master mute').uncheck();
  await expect.poll(() => peak(page)).toBeGreaterThan(0.05);
  await page.getByRole('button', { name: 'Stop all' }).click();
  await page.getByRole('button', { name: 'Enable / resume audio' }).click();
  await page.getByRole('button', { name: 'Play / replace music' }).click();
  await expect.poll(() => peak(page)).toBeGreaterThan(0.1);
  await page.getByLabel('Music volume').fill('0.1');
  await expect.poll(() => peak(page)).toBeLessThan(0.03);
  await page.getByLabel('Music volume').fill('0.5');
  await expect.poll(() => peak(page)).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Play / replace music' }).click();
  await expect(page.getByLabel('Audio state')).toContainText('Music: playing');
  const clock = await page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.context.currentTime);
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.context.currentTime)).toBeGreaterThan(clock + 0.05);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByLabel('Audio state')).toContainText('Context: suspended');
  await expect(page.getByLabel('Audio state')).toContainText('Music: paused');
  await page.getByRole('button', { name: 'Enable / resume audio' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.starts.at(-1))).toBeGreaterThan(0);
  await expect.poll(() => peak(page)).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Stop all' }).click();
  await expect.poll(() => peak(page)).toBeLessThan(0.00001);
  await expect(page.getByLabel('Audio state')).toContainText('Effects: 0 / 8 | Music: stopped');
  const counts = await page.evaluate(() => { const p = (window as unknown as { audioProbe: Probe }).audioProbe; return { starts: p.starts.length, stops: p.stops, disconnects: p.disconnects }; });
  expect(counts.stops).toBe(counts.starts); expect(counts.disconnects).toBe(counts.starts);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/synthetic-audio-preview.png' });
});

test('invalid local audio recovers; natural completion frees voices and music', async ({ page }) => {
  await page.getByLabel('Local effect file').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('not a wave') });
  await expect(page.getByRole('alert')).toContainText('Could not decode');
  await page.getByLabel('Local effect file').setInputFiles({ name: 'short.wav', mimeType: 'audio/wav', buffer: tone(0.2) });
  await page.getByLabel('Local music file').setInputFiles({ name: 'short.wav', mimeType: 'audio/wav', buffer: tone(0.2) });
  await expect(page.locator('#music-info')).toContainText('0.20 s');
  await expect(page.locator('#effect-info')).toContainText('0.20 s');
  await page.getByRole('button', { name: 'Enable / resume audio' }).click();
  await page.getByRole('button', { name: 'Play effect', exact: true }).click();
  await page.getByRole('button', { name: 'Play / replace music' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.disconnects)).toBe(2);
  await expect(page.getByLabel('Audio state')).toContainText('Effects: 0 / 8 | Music: stopped');
});

test('native context suspension drops effects and page hide closes the owned context', async ({ page }) => {
  await page.getByLabel('Local effect file').setInputFiles({ name: 'long.wav', mimeType: 'audio/wav', buffer: tone() });
  await expect(page.locator('#effect-info')).toContainText('8.00 s');
  await page.getByRole('button', { name: 'Enable / resume audio' }).click();
  await page.getByRole('button', { name: 'Play effect', exact: true }).click();
  await expect.poll(() => peak(page)).toBeGreaterThan(0.1);
  await page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.context.suspend());
  await expect(page.getByLabel('Audio state')).toContainText('Effects: 0 / 8');
  await page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.context.resume());
  await page.getByRole('button', { name: 'Play effect', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enable / resume');
  await page.getByRole('button', { name: 'Enable / resume audio' }).click();
  await page.getByRole('button', { name: 'Play effect', exact: true }).click();
  await expect.poll(() => peak(page)).toBeGreaterThan(0.1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.context.state)).toBe('closed');
  expect(await page.evaluate(() => (window as unknown as { audioProbe: Probe }).audioProbe.stops)).toBe(2);
});
