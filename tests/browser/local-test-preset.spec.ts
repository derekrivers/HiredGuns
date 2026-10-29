import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const privateProof = process.env.HIRED_GUNS_PRESET_PROOF === '1';
const preset = (page: Page) => page.getByRole('button', { name: 'Load ready-to-play Training43 test', exact: true });
async function state(page: Page) { return JSON.parse((await page.locator('#encounter-snapshot').textContent())!); }
async function inventory(page: Page) { return page.locator('#training-inventory').textContent(); }
async function save(page: Page) {
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function ready(page: Page) {
  await page.goto('/'); await preset(page).click();
  await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
  await expect(page.getByRole('button', { name: 'Start mission', exact: true })).toBeFocused();
}

test('preset unavailable preserves manual flow and current map', async ({ page }) => {
  await page.goto('/'); const before = await page.locator('#level-name').textContent();
  await page.route('**/__local-training43/*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await preset(page).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#local-test-status')).toContainText('Configure the local test provider');
  await expect(page.locator('#level-name')).toHaveText(before!);
  await expect(page.getByLabel('Open local editor map')).toBeAttached();
  await expect(page.locator('#training-encounter')).toBeHidden();
  await page.getByRole('button', { name: 'Extraction drill', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start mission', exact: true })).toBeEnabled();
});

test('wrong source and oversized responses preserve prior state', async ({ page }) => {
  await page.goto('/'); const before = await page.locator('#level-name').textContent();
  for (const extra of [0, 1]) {
    await page.route('**/__local-training43/*', route => {
      const resource = route.request().url().split('/').at(-1)!;
      return route.fulfill({ contentType: 'application/octet-stream', body: Buffer.alloc(({ map: 157738, roster: 16320, items: 32604 } as Record<string, number>)[resource]! + extra) });
    });
    await preset(page).click(); await expect(page.locator('#local-test-status')).toContainText('Test not loaded');
    await expect(page.locator('#level-name')).toHaveText(before!); await expect(page.locator('#training-encounter')).toBeHidden();
    await page.unroute('**/__local-training43/*');
  }
});

test('known-source choices show unavailable provider and retain file picker fallback', async ({ page }) => {
  await page.route('**/__local-training43/catalog', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/');
  await expect(page.locator('#local-source-status')).toContainText('Known local sources unavailable');
  await expect(page.getByLabel('Known local Characters source')).toBeDisabled();
  await expect(page.getByLabel('Known local Items source')).toBeDisabled();
  await expect(page.getByLabel('Open local Characters data')).toBeAttached();
  await expect(page.getByLabel('Open local Items data')).toBeAttached();
});

test('ignored manifest and evidence are inaccessible through ordinary dev/preview file routes', async ({ request }) => {
  for (const path of ['/.local/local-test-preset.json', '/%2elocal/local-test-preset.json?raw', '/@fs/example/.local/local-test-preset.json']) {
    const response = await request.get(path); expect(response.status()).toBe(404); expect(await response.text()).toBe('Not available.');
  }
});

test('dropdown availability never confers verified identity on synthetic source bytes', async ({ page }) => {
  await page.route('**/__local-training43/catalog', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    roster: [{ id: 'roster', label: 'Configured test Characters', available: true }],
    items: [{ id: 'items', label: 'Configured test Items', available: true }],
  }) }));
  await page.route('**/__local-training43/roster', route => route.fulfill({ contentType: 'application/octet-stream', body: Buffer.alloc(16320) }));
  await page.route('**/__local-training43/items', route => route.fulfill({ contentType: 'application/octet-stream', body: Buffer.alloc(32604) }));
  await page.goto('/'); await page.locator('#roster-panel > summary').click();
  await expect(page.getByLabel('Known local Characters source')).toBeEnabled();
  await page.getByLabel('Known local Characters source').selectOption('roster');
  await expect(page.locator('#roster-source')).toContainText('unverified');
  await page.getByLabel('Known local Items source').selectOption('items');
  await expect(page.locator('#items-source')).toContainText('unverified');
  await expect(page.getByRole('button', { name: 'Apply team to Training43', exact: true })).toBeDisabled();
  await expect(page.locator('#training-encounter')).toBeHidden();
});

for (const kind of ['roster', 'items'] as const) {
  test(`opt-in known ${kind} dropdown loads original and pending reload cannot replace newer preset`, async ({ page }) => {
    test.skip(!privateProof, 'Requires explicitly configured loopback local originals.');
    await page.goto('/'); await page.locator('#roster-panel > summary').click();
    const select = page.getByLabel(kind === 'roster' ? 'Known local Characters source' : 'Known local Items source');
    await expect(select).toBeEnabled(); await select.selectOption(kind);
    await expect(page.locator(kind === 'roster' ? '#roster-source' : '#items-source')).toContainText(kind === 'roster' ? 'ocs-source-data' : 'ocs-runtime');
    let release!: () => void, waiting!: () => void;
    const arrived = new Promise<void>(resolve => { waiting = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/__local-training43/${kind}`, async route => {
      const response = await route.fetch(); waiting(); await gate; await route.fulfill({ response });
    }, { times: 1 });
    await select.selectOption(kind); await arrived;
    await preset(page).click(); await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
    const before = await state(page), beforeInventory = await inventory(page);
    release();
    await expect(page.getByLabel('Character for team slot 1')).toHaveValue('11');
    // Drain the delayed source parse before checking that it did not clear choices or the session.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await state(page)).toEqual(before); expect(await inventory(page)).toEqual(beforeInventory);
    await expect(page.getByLabel('Character for team slot 1')).toHaveValue('11');
  });
}

test('opt-in one click verifies original sources, team, inventory, firing and paused recovery after reload', async ({ page }) => {
  test.skip(!privateProof, 'Requires explicitly configured loopback local originals.');
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page.locator('#diagnostics')).toContainText('Source:');
  await expect(page.locator('#roster-source')).toContainText('ocs-source-data');
  await expect(page.locator('#items-source')).toContainText('ocs-runtime');
  for (const [slot, index] of [11, 3, 0, 5].entries()) {
    await expect(page.getByLabel(`Character for team slot ${slot + 1}`)).toHaveValue(String(index));
    await expect(page.locator(`#session-actor-${slot} summary`)).toContainText(`Character ${index + 1}`);
    await expect(page.locator('.player-name').nth(slot)).not.toContainText('MERCENARY');
  }
  await expect(page.locator('#pause-overlay')).toBeVisible();
  const baseline = await state(page), originalInventory = await inventory(page);
  expect(baseline).toMatchObject({ actor: 0, canonicalIndex: 11, fixture: 'full', shots: 0 });
  expect(baseline.equipped.ammo).toBeGreaterThan(0);
  const initial = await save(page); expect(initial.indices).toEqual([11, 3, 0, 5]); expect(initial.sources.map).toMatch(/^[a-f0-9]{64}$/);
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  await page.keyboard.press('f'); await page.keyboard.press('Escape');
  const fired = await state(page); expect(fired.shots).toBe(1); expect(fired.equipped.ammo).toBeLessThan(baseline.equipped.ammo);
  await page.clock.runFor(1000); expect(await state(page)).toEqual(fired);
  await page.keyboard.press('t'); expect((await state(page)).target).toBe('miss');
  const saved = await save(page); expect(saved.encounter.shots).toBe(1);
  await page.keyboard.press('r'); expect((await state(page)).shots).toBe(0);
  expect(await inventory(page)).toEqual(originalInventory);
  await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
  expect((await state(page)).shots).toBe(0);
  await page.clock.resume(); await page.reload(); await preset(page).click();
  await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'session.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  expect(await state(page)).toEqual(saved.encounter); expect(await inventory(page)).toEqual(originalInventory);
  await expect(page.locator('#pause-overlay')).toBeVisible();
  if (process.env.HIRED_GUNS_PRESET_SCREENSHOT) await page.screenshot({ path: process.env.HIRED_GUNS_PRESET_SCREENSHOT, fullPage: true });
  expect(errors).toEqual([]);
});

for (const cancellation of ['retry', 'selection', 'source', 'map', 'newer-preset'] as const) {
  test(`opt-in ${cancellation} supersedes pending preset without mixed installation`, async ({ page }) => {
    test.skip(!privateProof, 'Requires explicitly configured loopback local originals.');
    await ready(page);
    if (cancellation === 'selection' || cancellation === 'source') await page.locator('#roster-panel > summary').click();
    const old = await state(page), oldInventory = await inventory(page);
    let release!: () => void, waiting!: () => void;
    const arrived = new Promise<void>(resolve => { waiting = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/__local-training43/map', async route => {
      const response = await route.fetch(); waiting(); await gate; await route.fulfill({ response });
    }, { times: 1 });
    await preset(page).click(); await arrived;
    if (cancellation === 'retry') await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
    else if (cancellation === 'selection') await page.getByLabel('Character for team slot 1').selectOption('1');
    else if (cancellation === 'source') await page.getByRole('button', { name: 'Clear item inspection', exact: true }).click();
    else if (cancellation === 'map') await page.getByRole('button', { name: 'Synthetic map', exact: true }).click();
    else { await preset(page).click(); await expect(page.locator('#local-test-status')).toContainText('Ready: verified'); }
    release();
    if (cancellation !== 'newer-preset') await expect(page.locator('#local-test-status')).toContainText('cancelled');
    else await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
    if (cancellation === 'source' || cancellation === 'map') await expect(page.locator('#training-encounter')).toBeHidden();
    else { expect(await state(page)).toEqual(old); expect(await inventory(page)).toEqual(oldInventory); }
    if (cancellation === 'selection') await expect(page.getByLabel('Character for team slot 1')).toHaveValue('1');
  });
}

test('opt-in wrong roster/items preserve the complete already loaded test', async ({ page }) => {
  test.skip(!privateProof, 'Requires explicitly configured loopback local originals.');
  await ready(page);
  const before = await save(page), beforeInventory = await inventory(page);
  for (const [resource, length] of [['roster', 16320], ['items', 32604]] as const) {
    await page.route(`**/__local-training43/${resource}`, route => route.fulfill({ contentType: 'application/octet-stream', body: Buffer.alloc(length) }));
    await preset(page).click(); await expect(page.locator('#local-test-status')).toContainText('Test not loaded');
    expect(await save(page)).toEqual(before); expect(await inventory(page)).toEqual(beforeInventory);
    await expect(page.getByLabel('Character for team slot 1')).toHaveValue('11');
    await page.unroute(`**/__local-training43/${resource}`);
  }
});

test('opt-in selection during candidate hashing cancels roster preparation and session together', async ({ page }) => {
  test.skip(!privateProof, 'Requires explicitly configured loopback local originals.');
  await ready(page); await page.locator('#roster-panel > summary').click();
  const before = await state(page), beforeInventory = await inventory(page);
  await page.evaluate(() => {
    const w = window as unknown as { presetWaiting: boolean; presetDone: boolean; releasePreset: () => void };
    const original = SubtleCrypto.prototype.digest;
    let mapHashed = false;
    SubtleCrypto.prototype.digest = async function (...args: Parameters<SubtleCrypto['digest']>) {
      if (args[1].byteLength > 100000) { const result = await original.call(this, ...args); mapHashed = true; return result; }
      if (!mapHashed || args[1].byteLength !== 16320) return original.call(this, ...args);
      SubtleCrypto.prototype.digest = original; w.presetWaiting = true;
      await new Promise<void>(resolve => { w.releasePreset = resolve; });
      const result = await original.call(this, ...args); w.presetDone = true; return result;
    };
  });
  await preset(page).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { presetWaiting: boolean }).presetWaiting)).toBe(true);
  await page.getByLabel('Character for team slot 1').selectOption('1');
  await page.evaluate(() => (window as unknown as { releasePreset: () => void }).releasePreset());
  await expect(page.locator('#local-test-status')).toContainText('cancelled');
  await expect(page.getByLabel('Character for team slot 1')).toHaveValue('1');
  expect(await state(page)).toEqual(before); expect(await inventory(page)).toEqual(beforeInventory);
});
