import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('export, reset and restore recover navigation, then reject a mismatched checkpoint', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await page.keyboard.down('w');
  await expect(page.locator('#position-0')).not.toContainText('Y 08');
  await page.keyboard.up('w');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint' }).click();
  const download = await downloadPromise;
  const checkpoint = await readFile((await download.path())!, 'utf8');
  const savedPosition = await page.locator('#position-0').textContent();
  await expect(page.locator('#recovery-status')).toContainText('exported');
  await expect(page.locator('#pause-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Reset positions' }).click();
  await expect(page.locator('#position-0')).toContainText('Y 08');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'checkpoint.json', mimeType: 'application/json', buffer: Buffer.from(checkpoint) });
  await expect(page.locator('#recovery-status')).toContainText('restored');
  await expect(page.locator('#position-0')).toHaveText(savedPosition!);
  await expect(page.locator('#event-0')).toHaveText('RESTORED');
  await expect(page.locator('#pause-overlay')).toBeVisible();
  const invalid = JSON.parse(checkpoint); invalid.levelHash = '0'.repeat(64);
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'wrong-map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.getByRole('alert')).toContainText('content mismatch');
  await expect(page.locator('#position-0')).toHaveText(savedPosition!);
  await page.getByRole('button', { name: 'Start navigation' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('oversized checkpoint is rejected before replacing the current state', async ({ page }) => {
  await page.goto('/');
  const initial = await page.locator('#position-0').textContent();
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.alloc(16384, ' ') });
  await expect(page.getByRole('alert')).toContainText('smaller than 16 KiB');
  await expect(page.locator('#position-0')).toHaveText(initial!);
});
