import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('register search, evidence navigation, level relationships and export work', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/docs/mechanics/index.html');
  await expect(page.getByRole('heading', { name: 'Master Mechanics Register' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('overview.png') });
  await page.getByRole('link', { name: '02 · Mechanics register' }).click();
  await page.getByRole('searchbox', { name: 'Find a mechanic' }).fill('drowning');
  await expect(page.locator('#LIFE-03')).toBeVisible();
  await expect(page.locator('#ENV-05')).toBeHidden();
  await page.locator('#LIFE-03 > summary').click();
  await expect(page.locator('#LIFE-03 .original')).toContainText('threshold damage');
  await expect(page.locator('#LIFE-03 a[href="../../tests/drowning-decision.test.ts"]')).toBeVisible();
  await page.locator('#LIFE-03 a[href="#map-43"]').click();
  await expect(page.locator('#map-43')).toBeVisible();
  await expect(page.locator('#map-43')).toHaveAttribute('open', '');
  await expect(page.locator('#map-43 .card-body')).toContainText('wider water-region');
  await page.locator('#map-43 .interaction-list a[href="#MOV-03"]').click();
  await expect(page.locator('#MOV-03')).toBeVisible();
  await expect(page.locator('#MOV-03')).toHaveAttribute('open', '');
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await page.getByLabel('Family', { exact: true }).selectOption('Psi');
  await page.getByLabel('Mapping status').selectOption('open');
  await expect(page.locator('#PSI-12')).toBeVisible();
  await expect(page.locator('#MOV-03')).toBeHidden();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('#MOV-03')).toBeVisible();
  await page.getByRole('searchbox').fill('no-such-mechanic-999');
  await expect(page.locator('#no-results')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export register JSON' }).click();
  const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(exported.levels.filter((l: { firstAcceptance: boolean }) => l.firstAcceptance).map((l: { id: string }) => l.id)).toEqual(['map-43']);
  expect(exported.mechanics).toHaveLength(86);
  expect(errors).toEqual([]);
});

test('deep links and training group retain explicit unverified classifications', async ({ page }) => {
  await page.goto('/docs/mechanics/index.html#map-45');
  await expect(page.locator('#map-45')).toBeVisible();
  await expect(page.locator('#map-45')).toHaveAttribute('open', '');
  await expect(page.locator('#map-45 .card-body')).toContainText('present unverified');
  await expect(page.locator('#map-45 .classification.required')).toHaveCount(0);
  await page.getByRole('link', { name: '03 · Training43 acceptance' }).click();
  await expect(page.locator('#acceptance .check')).toHaveCount(10);
  await expect(page.locator('#T43-05')).toContainText('Open');
  await expect(page.locator('#acceptance input[type="checkbox"]')).toHaveCount(0);
});

for (const width of [390, 1440]) test(`register fits ${width}px and remains keyboard operable`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/docs/mechanics/index.html#register');
  await page.locator('#COMBAT-01 > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#COMBAT-01')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`mechanic-${width}.png`) });
  await page.goto('/docs/mechanics/index.html#map-47');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('standalone HTML works offline as a local file', async ({ page }) => {
  const remoteRequests: string[] = [];
  await page.context().setOffline(true);
  page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  const file = fileURLToPath(new URL('../../docs/mechanics/index.html', import.meta.url));
  await page.goto(`${pathToFileURL(file).href}#LIFE-03`);
  await expect(page.locator('#LIFE-03')).toBeVisible();
  await expect(page.locator('#LIFE-03')).toHaveAttribute('open', '');
  await page.getByRole('searchbox').focus();
  await page.keyboard.insertText('MOV-03');
  await expect(page.locator('#MOV-03')).toBeVisible();
  await expect(page.locator('#LIFE-03')).toBeHidden();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export register JSON' }).focus();
  await page.keyboard.press('Enter');
  const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(exported).toEqual(JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')));
  expect(remoteRequests).toEqual([]);
});
