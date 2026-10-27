import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

interface SyntheticPad { index: number; id: string; connected: boolean; mapping: string; axes: number[]; buttons: { pressed: boolean; value: number }[] }
interface Receipt {
  evidenceSource: string; physicalAcceptance: string; targetEvidenceDate: string;
  environment: { viewport: { width: number; height: number }; userAgent: string };
  browserTelemetry: { commandCounts: number[]; assignments: ({ kind: string; index: number; id: string } | null)[]; events: { event: string }[] };
  humanReported: { observer: string; notes: string; attributedPhysicalReport: boolean; checks: Record<string, { result: string }> };
}
type TestWindow = Window & { syntheticPads: SyntheticPad[] };
async function frames(page: Page, count = 20) {
  await page.evaluate(count => new Promise<void>(resolve => {
    const next = () => { if (--count <= 0) resolve(); else requestAnimationFrame(next); }; requestAnimationFrame(next);
  }), count);
}
async function commandCounts(page: Page) {
  return page.locator('.command').allTextContents().then(texts => texts.map(text => Number(text.split('count ')[1])));
}
async function receipt(page: Page): Promise<Receipt> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export local JSON receipt' }).click();
  const result = await download;
  return JSON.parse(await readFile((await result.path())!, 'utf8')) as Receipt;
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const pads = Array.from({ length: 4 }, (_, index) => ({ index, id: `Synthetic pad ${index + 1}`, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) }));
    Object.assign(window, { syntheticPads: pads });
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads });
  });
  await page.goto('/tools/controller-preview.html');
  await page.getByLabel('Evidence source').selectOption('synthetic');
  for (let i = 0; i < 4; i++) await page.getByLabel(`Assign player ${i + 1}`, { exact: true }).selectOption({ label: `Pad ${i + 1}: Synthetic pad ${i + 1} [standard]` });
});

test('four synthetic pads route independently, release stops repeats, calibration and receipt stay explicit', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const mutations: string[] = []; page.on('request', request => { if (request.method() !== 'GET') mutations.push(request.method()); });
  await page.evaluate(() => {
    const pads = (window as unknown as TestWindow).syntheticPads;
    pads[0]!.axes = [0, -1]; pads[1]!.axes = [1, 0]; pads[2]!.buttons[4] = { pressed: true, value: 1 }; pads[3]!.axes = [0, 1];
  });
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  for (const [slot, action] of ['forward', 'turn-right', 'strafe-left', 'backward'].entries()) await expect(page.locator(`#command-${slot}`)).toContainText(`Last routed: ${action}`);
  await expect(page.locator('#raw-2')).toContainText('4:1.00*');
  await page.evaluate(() => { for (const pad of (window as unknown as TestWindow).syntheticPads) { pad.axes = [0, 0]; for (const button of pad.buttons) { button.pressed = false; button.value = 0; } } });
  await frames(page, 2); const released = await commandCounts(page); await frames(page);
  expect(await commandCounts(page)).toEqual(released);
  expect(released.every(count => count > 0)).toBe(true);
  await page.getByLabel('Observer name').fill('Synthetic runner');
  await page.getByLabel('Human observations').fill('Synthetic input only; no event hardware available.');
  const exported = await receipt(page);
  expect(exported.evidenceSource).toBe('synthetic');
  expect(exported.physicalAcceptance).toBe('not-established-by-this-tool');
  expect(exported.targetEvidenceDate).toBe('2026-11-03');
  expect(exported.humanReported.attributedPhysicalReport).toBe(false);
  expect(Object.values(exported.humanReported.checks).every(check => check.result === 'pending')).toBe(true);
  expect(exported.browserTelemetry.commandCounts).toEqual(released);
  expect(exported.browserTelemetry.assignments.map(source => source?.index)).toEqual([0, 1, 2, 3]);
  expect(exported.environment.userAgent).not.toBe('');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: 'Enter TV calibration' }).click();
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(`#view-${i} .number`)).toHaveText(`P${i + 1}`);
    const box = (await page.locator(`#view-${i}`).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(95); expect(box.y).toBeGreaterThanOrEqual(53);
    expect(box.x + box.width).toBeLessThanOrEqual(1825); expect(box.y + box.height).toBeLessThanOrEqual(1027);
  }
  await page.screenshot({ path: 'test-results/synthetic-controller-tv.png' });
  await page.getByRole('button', { name: 'Exit TV calibration' }).click();
  expect(errors).toEqual([]); expect(mutations).toEqual([]);
});

test('disconnect and reused index pause without reassignment; reconnect needs explicit resume', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.axes = [0, -1]; });
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await expect(page.locator('#command-0')).toContainText('forward');
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.connected = false; });
  await expect(page.getByLabel('Observation state')).toContainText('PAUSED — assigned device disconnected');
  await expect(page.locator('#connection-0')).toContainText('DISCONNECTED');
  const stopped = await commandCounts(page);
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.connected = true; });
  await expect(page.locator('#connection-0')).toContainText('Connected');
  await frames(page); expect(await commandCounts(page)).toEqual(stopped);
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await expect(page.locator('#command-0')).toContainText('forward');
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.id = 'Different synthetic pad'; });
  await expect(page.getByLabel('Observation state')).toContainText('PAUSED — assigned device disconnected');
  await expect(page.getByLabel('Assign player 1', { exact: true })).toHaveValue('pad:0:Synthetic pad 1');
  await page.getByLabel('Assign player 1', { exact: true }).selectOption({ label: 'Pad 1: Different synthetic pad [standard]' });
  await expect(page.getByLabel('Assign player 1', { exact: true })).toHaveValue('pad:0:Different synthetic pad');
});

test('synthetic same-identity disconnect and reconnect between polls latches pause into the receipt', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.axes = [0, -1]; });
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await expect(page.locator('#command-0')).toContainText('forward');
  const before = await page.evaluate(() => {
    const count = Number(document.getElementById('command-0')!.textContent!.split('count ')[1]);
    const pad = (window as unknown as TestWindow).syntheticPads[0]!;
    // Both synthetic API notifications occur in one task, with no animation-frame poll between them.
    pad.connected = false;
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { ...pad } }));
    pad.connected = true;
    window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: { ...pad } }));
    return count;
  });
  await frames(page);
  await expect(page.getByLabel('Observation state')).toContainText('PAUSED — assigned device disconnected');
  expect((await commandCounts(page))[0]).toBe(before);
  const exported = await receipt(page);
  expect(exported.evidenceSource).toBe('synthetic');
  expect(exported.physicalAcceptance).toBe('not-established-by-this-tool');
  expect(exported.browserTelemetry.events.some(item => item.event.includes('assigned device disconnected (event)'))).toBe(true);
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await expect.poll(async () => (await commandCounts(page))[0]).toBeGreaterThan(before);
});

test('synthetic disconnect events for unassigned or different-identity pads do not pause assigned input', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.axes = [0, -1]; });
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await expect(page.locator('#command-0')).toContainText('forward');
  const before = await page.evaluate(() => {
    const pad = (window as unknown as TestWindow).syntheticPads[0]!;
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { ...pad, index: 4, connected: false } }));
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { ...pad, id: 'Unassigned old identity', connected: false } }));
    return Number(document.getElementById('command-0')!.textContent!.split('count ')[1]);
  });
  await frames(page);
  await expect(page.getByLabel('Observation state')).toContainText('RUNNING');
  expect((await commandCounts(page))[0]).toBeGreaterThan(before);
  const exported = await receipt(page);
  expect(exported.browserTelemetry.events.some(item => item.event.includes('assigned device disconnected (event)'))).toBe(false);
});

test('injected blur pauses until resume, form typing emits nothing, and nonstandard mappings stay raw only', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as TestWindow).syntheticPads[0]!.axes = [0, -1]; });
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await expect(page.locator('#command-0')).toContainText('forward');
  // Headless bringToFront does not reliably change document focus. Exercise the actual blur handler
  // with an explicit synthetic event; physical tab/app switching remains on the human checklist.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByLabel('Observation state')).toContainText('PAUSED');
  const stopped = await commandCounts(page); await frames(page); expect(await commandCounts(page)).toEqual(stopped);
  await page.evaluate(() => { const pad = (window as unknown as TestWindow).syntheticPads[0]!; pad.mapping = ''; pad.axes = [0, -1]; });
  await expect(page.locator('#connection-0')).toContainText('nonstandard');
  await page.getByRole('button', { name: 'Start / resume observations' }).click();
  await page.getByLabel('Human observations').fill('wasd q e — these are observations, not gameplay input');
  await frames(page); expect(await commandCounts(page)).toEqual(stopped);
  await expect(page.locator('#raw-0')).toContainText('0.000, -1.000');
});

test('assignment uniqueness clears the old slot and reports remain human-attributed', async ({ page }) => {
  await page.getByLabel('Assign player 4', { exact: true }).selectOption({ label: 'Pad 1: Synthetic pad 1 [standard]' });
  await expect(page.getByLabel('Assign player 1', { exact: true })).toHaveValue('none');
  await page.getByLabel('Evidence source').selectOption('human-physical');
  await page.getByLabel('Observer name').fill('Example reporter');
  await page.getByLabel('TV text, edges, grey steps and colours readable at the actual seating distance').selectOption('fail');
  const exported = await receipt(page);
  expect(exported.humanReported.attributedPhysicalReport).toBe(true);
  expect(exported.humanReported.checks.legibility!.result).toBe('fail');
  expect(exported.physicalAcceptance).toBe('not-established-by-this-tool');
  // This exercises report attribution UI with synthetic pads; it makes no physical test claim.
});
