import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('synthetic four-view preview validates assets, measures both modes and disposes repeated loads', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/render-preview.html');
  await expect(page.getByRole('status')).toContainText('Ready:');
  await expect(page.locator('.pane')).toHaveCount(4);
  const assets = JSON.parse(await page.locator('#asset-report').innerText());
  expect(assets.liveBitmaps).toBe(1);
  expect(assets.checks.boundsValid).toBe(true);
  expect(assets.checks.nonOverlapping).toBe(true);
  expect(assets.checks.gutterAlphaValid).toBe(true);
  expect(assets.checks.registrationValid).toBe(true);
  expect(assets.checks.interiorAlpha).toBeGreaterThan(0);
  expect(assets.checks.interiorAlpha).toBeLessThan(255);
  for (const frame of assets.checks.frames) {
    expect(frame.transparent).toBeGreaterThan(0);
    expect(frame.translucent).toBeGreaterThan(0);
    expect(frame.opaque).toBeGreaterThan(0);
  }

  await page.getByRole('button', { name: 'Run 3 load/dispose cycles' }).click();
  await expect(page.getByRole('status')).toContainText('Completed 3');
  await page.getByLabel('Warm-up ms').fill('200');
  await page.getByLabel('Sample ms per mode').fill('1000');
  await page.getByRole('button', { name: 'Compare both modes' }).click();
  await expect(page.getByRole('status')).toContainText('Comparison complete', { timeout: 40000 });
  const report = JSON.parse(await page.locator('#report').innerText());
  for (const measurement of [report.comparison.baseline, report.comparison.overlay]) {
    expect(measurement.valid).toBe(true);
    expect(measurement.warmupMs).toBe(200);
    expect(measurement.requestedSampleMs).toBe(1000);
    expect(measurement.frames).toBeGreaterThan(1);
    expect(measurement.rawSamples.length).toBe(measurement.frames);
    expect(measurement.frameIntervalsMs.p95).toBeGreaterThan(0);
    expect(measurement.cpuSubmissionMs.min).toBeGreaterThanOrEqual(0);
    expect(measurement.drawCallsPerFrame.min).toBeGreaterThan(0);
    expect(measurement.submittedTrianglesPerFrame.min).toBeGreaterThan(0);
    expect(measurement.endOverrunMs).toBeGreaterThanOrEqual(0);
    expect(measurement.finishedTimestampMs).toBeGreaterThanOrEqual(measurement.sampleEndTimestampMs);
    expect(measurement.endOverrunMs).toBe(measurement.finishedTimestampMs - measurement.sampleEndTimestampMs);
    expect(measurement.environment.viewport).toEqual({ width: 1440, height: 1000 });
  }
  expect(report.worldUnchanged).toBe(true);
  expect(report.assets.frameChanges).toBeGreaterThan(1);
  expect(report.assets.liveBitmaps).toBe(1);
  expect(report.lifecycle).toHaveLength(3);
  for (const cycle of report.lifecycle) expect(cycle.liveBitmapsAfterDispose).toBe(0);
  expect(report.lifecycleAssessment.bitmapClosurePassed).toBe(true);
  // A renderer resource finding must be exposed, not silently labeled successful disposal.
  const growthObserved = Object.keys(report.lifecycle[2].afterDispose).some(name => report.lifecycle[2].afterDispose[name] > report.lifecycle[1].afterDispose[name]);
  expect(report.lifecycleAssessment.resourceCheck).toBe(growthObserved ? 'retained-handle-growth-observed' : 'no-growth-observed');
  expect(report.lifecycleAssessment.retainedHandleGrowth.length > 0).toBe(growthObserved);
  expect(report.webgl.threeInfo).toBeNull();
  expect(report.webgl.gpuTimeMs).toBeNull();
  await expect(page.getByRole('alert')).toBeEmpty();
  await page.screenshot({ path: 'test-results/synthetic-render-preview.png', fullPage: true });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  await download.saveAs('test-results/synthetic-render-measurement.json');
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.comparison).toEqual(report.comparison);
  expect(exported.scope).toContain('Synthetic');
  await page.getByRole('button', { name: 'Dispose atlas', exact: true }).click();
  expect(JSON.parse(await page.locator('#asset-report').innerText()).liveBitmaps).toBe(0);
  await page.getByRole('button', { name: 'Compare both modes' }).click();
  await expect(page.getByRole('alert')).toContainText('Load the synthetic atlas');
  await page.getByRole('button', { name: 'Load synthetic atlas', exact: true }).click();
  await expect(page.getByRole('alert')).toBeEmpty();
  expect(JSON.parse(await page.locator('#asset-report').innerText()).liveBitmaps).toBe(1);
  await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('#scene')!.getContext('webgl2')!;
    gl.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.getByRole('alert')).toContainText('WebGL context lost');
  await page.getByRole('button', { name: 'Compare both modes' }).click();
  await expect(page.getByRole('alert')).toContainText('reload preview');
  expect(errors).toEqual([]);
});

test('fractional deadline arithmetic preserves exact-boundary zero and genuinely shortened windows', async ({ page }) => {
  await page.goto('/tools/render-preview.html');
  await expect(page.getByRole('status')).toContainText('Ready:');
  const result = await page.evaluate(async () => {
    const modulePath = '/tools/render-preview.ts';
    const { measurementTiming } = await import(modulePath);
    // The old differently grouped subtraction gives a negative artifact for this deadline.
    const start = 848.2, warmup = 200, duration = 1000, deadline = start + warmup + duration;
    return { oldOverrun: deadline - start - warmup - duration,
      exact: measurementTiming(start, warmup, duration, deadline),
      short: measurementTiming(start, warmup, duration, deadline - 0.25),
      late: measurementTiming(start, warmup, duration, deadline + 0.25) };
  });
  expect(result.oldOverrun).toBeLessThan(0);
  expect(result.exact.endOverrunMs).toBe(0);
  expect(result.short.endOverrunMs).toBe(-0.25);
  expect(result.late.endOverrunMs).toBe(0.25);
});

test('native context loss during baseline interrupts the comparison without starting the overlay', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/render-preview.html');
  await expect(page.getByRole('status')).toContainText('Ready:');
  await page.getByLabel('Warm-up ms').fill('500');
  await page.getByLabel('Sample ms per mode').fill('1000');
  await page.getByRole('button', { name: 'Compare both modes' }).click();
  await expect(page.getByRole('status')).toContainText('baseline');
  await page.evaluate(() => {
    document.querySelector<HTMLCanvasElement>('#scene')!.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.getByRole('status')).toContainText('overlay not started');
  // Native loss notification may arrive after the RAF state check and refresh this alert.
  await expect(page.getByRole('alert')).toContainText('reload preview');
  const report = JSON.parse(await page.locator('#report').innerText());
  expect(report.contextLost).toBe(true);
  expect(report.comparison.baseline.valid).toBe(false);
  expect(report.comparison.baseline.invalidReasons).toContain('WebGL context lost.');
  expect(report.comparison.baseline.endOverrunMs).toBeLessThan(0);
  expect(report.comparison.baseline.invalidReasons).toContain('Measurement interrupted before requested sample boundary.');
  expect(report.comparison.overlay).toBeNull();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  await (await downloadPromise).saveAs('test-results/synthetic-render-interrupted.json');
  await page.getByRole('button', { name: 'Compare both modes' }).click();
  await expect(page.getByRole('alert')).toContainText('reload preview');
  expect(JSON.parse(await page.locator('#report').innerText()).comparison).toEqual(report.comparison);
  expect(errors).toEqual([]);
});
