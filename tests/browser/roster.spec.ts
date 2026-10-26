import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { characterFixture } from '../helpers/character-fixture';

const upload = (bytes = characterFixture()) => ({ name: 'authored-characters.raw', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });

test('local roster preparation selects explicitly, downloads and restores a source-bound plan', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(upload());
  await expect(page.locator('#roster-source')).toContainText('unverified');
  await expect(page.getByRole('button', { name: 'Save team plan' })).toBeDisabled();
  for (let i = 0; i < 4; i++) await expect(page.getByLabel(`Character for team slot ${i + 1}`)).toHaveValue('');
  for (const [i, character] of [11, 3, 0, 5].entries()) await page.getByLabel(`Character for team slot ${i + 1}`).selectOption(String(character));
  await expect(page.locator('#roster-info-1')).toContainText('Physique 303');
  await expect(page.locator('#roster-info-1')).toContainText('1: 4 / 5 / 6 / 7');
  const planDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save team plan' }).click();
  const plan = await readFile((await (await planDownload).path())!, 'utf8');
  expect(JSON.parse(plan).characters).toEqual([11, 3, 0, 5]);
  // Existing game checkpoint remains version3/static and contains no roster fields.
  const checkpointDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  const checkpoint = JSON.parse(await readFile((await (await checkpointDownload).path())!, 'utf8'));
  expect(checkpoint.version).toBe(3); expect(checkpoint.world.physics).toEqual({ mode: 'static' });
  expect(checkpoint.world).not.toHaveProperty('roster');
  await page.reload(); await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(upload());
  await page.getByLabel('Load team plan').setInputFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(plan) });
  await expect(page.locator('#roster-status')).toContainText('restored for this exact source');
  await expect(page.getByLabel('Character for team slot 1')).toHaveValue('11');
  await page.getByLabel('Character for team slot 2').selectOption('11');
  await expect(page.getByRole('button', { name: 'Save team plan' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('wrong-source plans and legacy input preserve the current roster and game', async ({ page }) => {
  await page.goto('/'); await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(upload());
  await page.getByLabel('Character for team slot 1').selectOption('7');
  const initial = await page.locator('#position-0').textContent(), source = await page.locator('#roster-source').textContent();
  await page.getByLabel('Open local Characters data').setInputFiles(upload(new Uint8Array(3072)));
  await expect(page.locator('#roster-status')).toContainText('Roster not loaded');
  await expect(page.locator('#roster-source')).toHaveText(source!);
  await expect(page.getByLabel('Character for team slot 1')).toHaveValue('7');
  const wrongPlan = { format: 'hired-guns-roster-selection', version: 1, source: { sha256: '0'.repeat(64), byteLength: 16320, layout: 'front272-five-banks', revision: 'unverified' }, characters: [0, 1, 2, 3] };
  await page.getByLabel('Load team plan').setInputFiles({ name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wrongPlan)) });
  await expect(page.locator('#roster-status')).toContainText('identity mismatch');
  await expect(page.getByLabel('Character for team slot 1')).toHaveValue('7');
  await expect(page.locator('#position-0')).toHaveText(initial!);
  await expect(page.locator('#pause-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Dry fall drill', exact: true }).click();
  await expect(page.locator('#fitness-0')).toContainText('100%');
});

test('source strings render as text and cannot inject markup', async ({ page }) => {
  const bytes = characterFixture(); bytes.fill(0, 33, 66); bytes.set(new TextEncoder().encode('<img src=x onerror=alert(1)>'), 33);
  await page.goto('/'); await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(upload(bytes));
  await expect(page.getByLabel('Character for team slot 1').locator('option').nth(1)).toHaveText('1: <img src=x onerror=alert(1)>');
  await expect(page.locator('#roster-panel img')).toHaveCount(0);
});

test('opt-in recovered original roster has a verified identity and no automatic team', async ({ page }) => {
  test.skip(!process.env.HIRED_GUNS_CHARACTERS, 'Original data stays local; opt in with a verified raw 16,320-byte Characters file.');
  await page.goto('/'); await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(process.env.HIRED_GUNS_CHARACTERS!);
  await expect(page.locator('#roster-source')).toContainText(/Source (ocs-source-data|cd32-archive)/);
  await expect(page.getByLabel('Character for team slot 1').locator('option')).toHaveCount(13);
  await expect(page.getByRole('button', { name: 'Save team plan' })).toBeDisabled();
});
