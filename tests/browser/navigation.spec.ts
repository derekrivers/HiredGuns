import { expect, test } from '@playwright/test';

test('four views render, keyboard movement works, reassignment and pause recover', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'HIRED GUNS' })).toBeVisible();
  await expect(page.locator('.view')).toHaveCount(4);
  await expect(page.locator('#error')).toBeEmpty();
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await page.keyboard.down('w');
  await expect(page.locator('#position-0')).not.toContainText('Y 08');
  await page.keyboard.up('w');
  await expect(page.locator('#position-1')).toContainText('Y 08');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Reset positions' }).click();
  await page.keyboard.press('Digit4');
  await expect(page.getByLabel('Control mercenary 1')).toHaveValue('none');
  await expect(page.getByLabel('Control mercenary 4')).toHaveValue('key:0');
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await page.keyboard.down('w');
  await expect(page.locator('#position-3')).not.toContainText('Y 08');
  await page.keyboard.up('w');
  await expect(page.locator('#position-0')).toContainText('Y 08');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.locator('#error')).toBeEmpty();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/synthetic-four-views.png' });
});

test('four simulated standard pads move independently and disconnect stops input', async ({ page }) => {
  await page.addInitScript(() => {
    const pads = Array.from({ length: 4 }, (_, index) => ({ index, id: `Synthetic test pad ${index}`, mapping: 'standard', connected: true, axes: [0, 0], buttons: [] }));
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads });
    Object.assign(window, { testPads: pads });
  });
  await page.goto('/');
  for (let i = 0; i < 4; i++) await page.getByLabel(`Control mercenary ${i + 1}`).selectOption({ label: `Pad ${i + 1}: Synthetic test pad ${i}` });
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await page.evaluate(() => {
    const pads = (window as unknown as { testPads: { axes: number[] }[] }).testPads;
    pads.forEach(p => { p.axes = [0, -1]; });
  });
  for (let i = 0; i < 4; i++) await expect(page.locator(`#position-${i}`)).not.toContainText('Y 08');
  await page.evaluate(() => { (window as unknown as { testPads: { connected: boolean }[] }).testPads.forEach(p => { p.connected = false; }); });
  await expect(page.locator('#device-0')).toContainText('DISCONNECTED');
  const position = await page.locator('#position-0').textContent();
  await page.waitForTimeout(200);
  await expect(page.locator('#position-0')).toHaveText(position!);
  await page.evaluate(() => { (window as unknown as { testPads: { connected: boolean }[] }).testPads.forEach(p => { p.connected = true; }); });
  await expect(page.locator('#device-0')).toContainText('CONNECTED');
  await expect(page.locator('#position-0')).not.toHaveText(position!);
});

test('invalid local map keeps working synthetic level and displays an error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Open local editor map').setInputFiles({ name: 'invalid.map', mimeType: 'application/octet-stream', buffer: Buffer.alloc(12) });
  await expect(page.getByRole('alert')).toContainText('157,738-byte');
  await expect(page.locator('#level-name')).toHaveText('Navigation proving ground');
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('local original Dropzone import renders four source starts and navigates', async ({ page }) => {
  test.skip(!process.env.HIRED_GUNS_MAP, 'Original data stays local; opt in with HIRED_GUNS_MAP pointing to Map13 Dropzone.');
  await page.goto('/');
  await page.getByLabel('Open local editor map').setInputFiles(process.env.HIRED_GUNS_MAP!);
  await expect(page.locator('#source-label')).toContainText('local editor revision');
  await expect(page.locator('#error')).toBeEmpty();
  for (let i = 0; i < 4; i++) await expect(page.locator(`#position-${i}`)).toContainText('Z 11');
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await page.keyboard.down('w');
  await expect(page.locator('#event-0')).toHaveText('MOVED');
  await page.keyboard.up('w');
  await page.keyboard.press('Escape');
});
