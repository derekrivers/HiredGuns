import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { characterFixture } from '../helpers/character-fixture';

const raw = (bytes: Uint8Array) => ({ name: 'authored.raw', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });

test('item inspection preserves bytes, refuses unverified weight and stays out of persistence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#roster-panel summary').first().click();
  const items = new Uint8Array(32604); items[285] = 0xab;
  items.set(new TextEncoder().encode('<img src=x>'));
  // Loading items first must also work; there may be no character controls yet.
  await page.getByLabel('Open local Items data').setInputFiles(raw(items));
  await expect(page.locator('#items-source')).toContainText('unverified');
  await page.getByLabel('Open local Characters data').setInputFiles(raw(characterFixture()));
  for (let i = 0; i < 4; i++) await page.getByLabel(`Character for team slot ${i + 1}`).selectOption(String(i));
  await expect(page.locator('#items-source')).toContainText('unverified');
  await expect(page.locator('#items-records')).toContainText('ab');
  await page.getByRole('button', { name: 'Show item definitions / raw records' }).click();
  await expect(page.locator('#items-records')).toBeVisible();
  await expect(page.locator('#items-records')).toContainText('<img src=x>');
  await expect(page.locator('#roster-panel img')).toHaveCount(0);
  await expect(page.locator('#roster-info-0')).toContainText('Weight unavailable');
  const source = await page.locator('#items-source').textContent();
  await page.getByLabel('Open local Items data').setInputFiles(raw(new Uint8Array(4)));
  await expect(page.locator('#items-status')).toContainText('Items not loaded');
  await expect(page.locator('#items-source')).toHaveText(source!);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save team plan' }).click();
  const plan = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(Object.keys(plan).sort()).toEqual(['characters', 'format', 'source', 'version']);
  expect(plan.version).toBe(1);
  const checkpointDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  const checkpoint = JSON.parse(await readFile((await (await checkpointDownload).path())!, 'utf8'));
  expect(checkpoint.version).toBe(3); expect(checkpoint.world).not.toHaveProperty('inventory');
  await page.getByRole('button', { name: 'Clear item inspection' }).click();
  await expect(page.locator('#roster-info-0')).toContainText('Weight unavailable');
  await expect(page.locator('#items-records')).toBeEmpty();
  await page.reload(); await page.locator('#roster-panel summary').first().click();
  await expect(page.locator('#items-source')).toContainText('No item table loaded');
  expect(errors).toEqual([]);
});

test('opt-in matching OCS sources show verified preparation weight without changing drill state', async ({ page }) => {
  test.skip(!process.env.HIRED_GUNS_ITEMS || !process.env.HIRED_GUNS_CHARACTERS, 'Local original sources are opt-in only.');
  await page.goto('/'); await page.locator('#roster-panel summary').first().click();
  await page.getByLabel('Open local Characters data').setInputFiles(process.env.HIRED_GUNS_CHARACTERS!);
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  await page.getByLabel('Character for team slot 1').selectOption('0');
  await expect(page.locator('#roster-info-0')).toContainText('Verified OCS weight:');
  await expect(page.locator('#roster-info-0')).toContainText('30 carried slots');
  await page.getByRole('button', { name: 'Dry fall drill', exact: true }).click();
  await expect(page.locator('#fitness-0')).toContainText('100%');
  await page.getByRole('button', { name: 'Clear item inspection' }).click();
  await expect(page.locator('#fitness-0')).toContainText('100%');
});
