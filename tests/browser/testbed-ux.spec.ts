import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('guided headings, keyboard scenario selection and collapsed tools', async ({ page }) => {
  await page.goto('/');
  for (const name of ['1. Setup', '2. Choose and start a test', '3. Live test display']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('#inventory-tools')).not.toHaveAttribute('open');
  await expect(page.locator('#session-diagnostics')).not.toHaveAttribute('open');
  await expect(page.locator('#roster-panel')).not.toHaveAttribute('open');
  await page.keyboard.press('Tab'); await expect(page.locator('#local-test-preset')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#manual-setup > summary')).toBeFocused();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
  await expect(page.getByLabel('Open local editor map')).toBeFocused();
  await page.getByRole('button', { name: 'Extraction drill', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#play')).toBeFocused();
  await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await page.keyboard.press('Enter'); await expect(page.locator('#run-state')).toHaveText('RUNNING');
  await page.keyboard.press('Escape'); await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await page.locator('#inventory-tools > summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#inventory-tools')).toHaveAttribute('open');
});

for (const width of [320, 375, 1440]) test(`guided layout fits ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.HIRED_GUNS_UX_SCREENSHOTS) await page.screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/public-${width}.png`, fullPage: true });
});

test('opt-in guided combat shows effects without diagnostics and clears transient history on restore', async ({ page }) => {
  test.skip(process.env.HIRED_GUNS_PRESET_PROOF !== '1', 'Requires configured local originals.');
  await page.goto('/'); await page.locator('#local-test-preset').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
  await expect(page.locator('#play')).toBeFocused();
  await expect(page.locator('#level-name')).toHaveText('Training 43');
  await expect(page.locator('#training-encounter details')).not.toHaveAttribute('open');
  await expect(page.locator('#encounter-status')).toContainText('Team slot 1:');
  await expect(page.locator('#encounter-readiness')).toContainText('Fire blocked');
  const before = await page.locator('#encounter-status').textContent();
  await page.keyboard.press('f'); expect(await page.locator('#encounter-status').textContent()).toBe(before);
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.keyboard.press('Enter'); await page.keyboard.press('f');
  await expect(page.locator('#run-state')).toHaveText('RUNNING');
  await expect(page.locator('#local-test-status')).not.toContainText('PAUSED');
  await expect(page.locator('#encounter-feedback')).toContainText('Shot fired. Ammo');
  await expect(page.locator('#encounter-feedback')).toContainText('→');
  await expect(page.locator('#encounter-status')).toContainText('Shots 1');
  await expect(page.locator('#encounter-readiness')).toContainText('Cooling down');
  if (process.env.HIRED_GUNS_UX_SCREENSHOTS) for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/shot-${width}.png`, fullPage: true });
  }
  await page.keyboard.press('f'); await expect(page.locator('#encounter-feedback')).toContainText('Shot blocked: cooling down');
  await page.clock.runFor(1000); await page.keyboard.press('t'); await page.keyboard.press('f');
  await expect(page.locator('#encounter-feedback')).toContainText('damage 0');
  await expect(page.locator('#encounter-status')).toContainText('Target miss');
  await page.keyboard.press('Escape');
  const download = page.waitForEvent('download'); await page.locator('#save-checkpoint').click();
  const json = await readFile((await (await download).path())!, 'utf8');
  await page.keyboard.press('r'); await expect(page.locator('#encounter-feedback')).toContainText('loadout reset');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  await expect(page.locator('#encounter-feedback')).toContainText('No action observed');
  await expect(page.locator('#encounter-status')).toContainText('Shots 2');
  await page.getByLabel('Authored ammo fixture').selectOption('empty');
  await page.getByRole('button', { name: 'Arm authored encounter', exact: true }).click();
  await page.locator('#play').click(); await page.keyboard.press('f');
  await expect(page.locator('#encounter-feedback')).toContainText('Shot blocked: empty magazine');
  await page.keyboard.press('Escape');
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#encounter-feedback')).toBeVisible();
    if (process.env.HIRED_GUNS_UX_SCREENSHOTS) await page.screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/combat-${width}.png`, fullPage: true });
  }
  await page.locator('#inventory-tools > summary').click();
  await expect(page.getByLabel('Carried slot for team slot 1')).toBeVisible();
  await page.locator('#roster-panel > summary').click();
  await expect(page.getByLabel('Known local Characters source')).toBeEnabled();
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
