import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { characterFixture } from '../helpers/character-fixture';
import { ITEM_FILE_BYTES } from '../../src/import/items';
import { importCharacters } from '../../src/import/characters';
import { exportRosterSelection } from '../../src/import/roster-selection';
import { initializeOriginalTeam } from '../../src/import/original-team';
import { importEditorMap } from '../../src/import/editor-map';
import { createWorld } from '../../src/sim/world';
import { exportCheckpoint } from '../../src/sim/checkpoint';
import { exitRoute } from '../helpers/extraction-route';

const order = [11, 3, 0, 5];
const privateInputs = !!(process.env.HIRED_GUNS_TRAINING_MAP && process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);
const jsonUpload = (data: unknown, name = 'session.json') => ({ name, mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) });
async function save(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function openLocal(page: Page) {
  await page.goto('/'); await page.locator('#session-diagnostics > summary').click();
  await page.getByLabel('Open local editor map').setInputFiles(process.env.HIRED_GUNS_TRAINING_MAP!);
  await expect(page.locator('#level-name')).toHaveText('Training 43');
  await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(process.env.HIRED_GUNS_CHARACTERS!);
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  await expect(page.locator('#items-source')).toContainText('ocs');
}
async function choose(page: Page) {
  for (const [slot, index] of order.entries()) await page.getByLabel(`Character for team slot ${slot + 1}`).selectOption(String(index));
}
async function apply(page: Page) {
  await page.getByRole('button', { name: 'Apply team to Training43' }).click();
  await expect(page.locator('#session-status')).toContainText('Standalone imported Training43 session');
  await expect(page.locator('#pause-overlay')).toBeVisible();
}
async function turn(page: Page) {
  const before = await page.locator('#position-0').textContent();
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  await page.keyboard.press('Digit1');
  await page.keyboard.down('e');
  await expect(page.locator('#position-0')).not.toHaveText(before!);
  await page.keyboard.up('e'); await page.keyboard.press('Escape');
}
// Delay only a chosen local file read, without exposing simulation internals or granting authority.
async function holdRestore(page: Page, data: unknown) {
  await page.evaluate(() => {
    const state = window as unknown as { releaseSessionRead: () => void; sessionReadWaiting: boolean };
    const original = File.prototype.text;
    File.prototype.text = async function () {
      if (this.name !== 'held-session.json') return original.call(this);
      File.prototype.text = original;
      state.sessionReadWaiting = true;
      await new Promise<void>(resolve => { state.releaseSessionRead = resolve; });
      return original.call(this);
    };
  });
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(data, 'held-session.json'));
  await expect.poll(() => page.evaluate(() => (window as unknown as { sessionReadWaiting: boolean }).sessionReadWaiting)).toBe(true);
}
async function releaseRestore(page: Page) {
  await page.evaluate(() => (window as unknown as { releaseSessionRead: () => void }).releaseSessionRead());
}

test('unverified roster/items and synthetic geometry cannot apply a selected team; legacy recovery stays usable', async ({ page }) => {
  await page.goto('/'); await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles({ name: 'synthetic.raw', mimeType: 'application/octet-stream', buffer: Buffer.from(characterFixture()) });
  await page.getByLabel('Open local Items data').setInputFiles({ name: 'synthetic-items.raw', mimeType: 'application/octet-stream', buffer: Buffer.alloc(ITEM_FILE_BYTES) });
  await choose(page);
  await expect(page.getByRole('button', { name: 'Apply team to Training43' })).toBeDisabled();
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  const saved = await save(page); expect(saved.version).toBe(3);
  const before = await page.locator('#position-0').textContent();
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload({ format: 'hired-guns-training-session', version: 1 }));
  await expect(page.locator('#error')).toContainText('Checkpoint not loaded');
  await expect(page.locator('#position-0')).toHaveText(before!);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(saved));
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored at tick 0');
  await expect(page.locator('#pause-overlay')).toBeVisible();
});

test('opt-in exact local session: select, apply, navigate, save, restore paused, refuse bad recovery, retry and clear', async ({ page }) => {
  test.skip(!privateInputs, 'Exact original sources stay private and must be supplied explicitly.');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const roster = new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!));
  const items = new Uint8Array(await readFile(process.env.HIRED_GUNS_ITEMS!));
  const expected = await initializeOriginalTeam(roster, items, order), catalog = await importCharacters(roster);
  await openLocal(page);
  await expect(page.getByRole('button', { name: 'Apply team to Training43' })).toBeDisabled();
  for (let i = 0; i < 4; i++) await expect(page.getByLabel(`Character for team slot ${i + 1}`)).toHaveValue('');
  await choose(page);
  await page.getByLabel('Character for team slot 4').selectOption(String(order[0]));
  await expect(page.getByRole('button', { name: 'Apply team to Training43' })).toBeDisabled();
  await page.getByLabel('Character for team slot 4').selectOption(String(order[3]));
  await apply(page);
  const summaries: string[] = [];
  for (let i = 0; i < 4; i++) {
    const actor = expected.actors[i]!, name = catalog.records[order[i]!]!.text.gameName;
    await expect(page.locator('.player-name').nth(i)).toContainText(name);
    await expect(page.locator(`#session-actor-${i} summary`)).toContainText(`Character ${order[i]! + 1}`);
    await expect(page.locator(`#session-actor-${i} summary`)).toContainText(`Weight ${actor.weight.totalWeight}`);
    await page.locator(`#session-actor-${i} summary`).click();
    await expect(page.locator(`#session-actor-${i} pre`)).toContainText(JSON.stringify(actor.stats));
    await expect(page.locator(`#session-actor-${i} pre`)).toContainText('30: 0 / 0 / 0 / 0');
    summaries.push((await page.locator(`#session-actor-${i} summary`).textContent())!);
    await page.locator(`#session-actor-${i} summary`).click();
  }
  const initialPositions = await page.locator('[id^="position-"]').allTextContents();
  const map = (await importEditorMap(new Uint8Array(await readFile(process.env.HIRED_GUNS_TRAINING_MAP!)))).level;
  const move = exitRoute(map, createWorld(map), 3)[0]!;
  const codes = { forward: 'KeyW', backward: 'KeyS', 'strafe-left': 'KeyA', 'strafe-right': 'KeyD', 'turn-left': 'KeyQ', 'turn-right': 'KeyE' };
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  await page.keyboard.press('Digit4');
  await page.evaluate(({ code }) => {
    const position = document.getElementById('position-3')!, before = position.textContent;
    const observer = new MutationObserver(() => { if (position.textContent !== before) release(); });
    const release = () => { window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); observer.disconnect(); clearTimeout(timer); };
    const timer = window.setTimeout(release, 4000);
    observer.observe(position, { childList: true });
  }, { code: codes[move.action] });
  await page.keyboard.down(codes[move.action].slice(3).toLowerCase());
  await expect(page.locator('#position-3')).toContainText(`X ${String(move.target.x).padStart(2, '0')}  Y ${String(move.target.y).padStart(2, '0')}  Z ${String(move.target.z).padStart(2, '0')}`);
  await page.keyboard.up(codes[move.action].slice(3).toLowerCase());
  await page.keyboard.press('Escape');
  await turn(page);
  const saved = await save(page), savedWorld = JSON.parse(saved.checkpoint).world;
  expect(saved.indices).toEqual(order); expect(savedWorld.tick).toBeGreaterThan(0);
  expect(savedWorld.physics).toEqual({ mode: 'static' });
  const savedPositions = await page.locator('[id^="position-"]').allTextContents();
  await turn(page);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(saved));
  await expect(page.locator('#recovery-status')).toContainText(`Checkpoint restored at tick ${savedWorld.tick}`);
  await expect(page.locator('#pause-overlay')).toBeVisible();
  expect(await page.locator('[id^="position-"]').allTextContents()).toEqual(savedPositions);
  expect((await save(page))).toEqual(saved);
  for (let i = 0; i < 4; i++) await expect(page.locator(`#session-actor-${i} summary`)).toHaveText(summaries[i]!);
  const wrong = structuredClone(saved); wrong.sources.items.sha256 = '0'.repeat(64);
  for (const bad of [wrong, { ...saved, indices: [0, 0, 1, 2] }, { ...saved, checkpoint: '{' }, { ...saved, extra: true }]) {
    await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(bad));
    await expect(page.locator('#error')).toContainText('Checkpoint not loaded');
    expect(await save(page)).toEqual(saved);
  }
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(await exportCheckpoint(map, createWorld(map))));
  await expect(page.locator('#error')).toContainText('active selected team requires');
  expect(await save(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
  await expect(page.locator('#pause-overlay')).toBeVisible();
  await expect(page.locator('[id^="position-"]')).toHaveText(initialPositions);
  expect(JSON.parse((await save(page)).checkpoint).world.tick).toBe(0);
  // Capture only in an explicitly opted-in local directory; never a public test artifact.
  if (process.env.HIRED_GUNS_SESSION_SCREENSHOT) {
    await page.locator('#roster-panel summary').click();
    await page.locator('#session-actor-0 summary').click();
    await page.screenshot({ path: process.env.HIRED_GUNS_SESSION_SCREENSHOT, fullPage: true });
    await page.locator('#session-actor-0 summary').click();
    await page.locator('#roster-panel summary').click();
  }
  await page.getByRole('button', { name: 'Clear item inspection' }).click();
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(saved));
  await expect(page.locator('#error')).toContainText('matching verified OCS roster');
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(saved));
  await expect(page.locator('#session-status')).toContainText('Standalone imported');
  await page.getByRole('button', { name: 'Synthetic map', exact: true }).click();
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(saved));
  await expect(page.locator('#error')).toContainText('verified local Training43');
  expect(errors).toEqual([]);
});

test('opt-in pending session restore is cancelled by retry, source clearing/replacement and new map', async ({ page }) => {
  test.skip(!privateInputs, 'Exact original sources stay private and must be supplied explicitly.');
  await openLocal(page); await choose(page); await apply(page); await turn(page);
  const saved = await save(page);
  await holdRestore(page, saved);
  await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
  await releaseRestore(page);
  expect(JSON.parse((await save(page)).checkpoint).world.tick).toBe(0);
  await holdRestore(page, saved);
  await page.getByRole('button', { name: 'Clear item inspection' }).click();
  await releaseRestore(page);
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  expect((await save(page)).version).toBe(3);
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  await apply(page); await holdRestore(page, saved);
  await page.getByLabel('Open local Characters data').setInputFiles({ name: 'changed.raw', mimeType: 'application/octet-stream', buffer: Buffer.from(characterFixture()) });
  await releaseRestore(page);
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  await expect(page.getByRole('button', { name: 'Apply team to Training43' })).toBeDisabled();
  await holdRestore(page, saved);
  await page.getByRole('button', { name: 'Synthetic map', exact: true }).click();
  await releaseRestore(page);
  expect((await save(page)).version).toBe(3);
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  await expect(page.locator('#pause-overlay')).toBeVisible();
});

// Delay a real digest result; no hash or decoded data is substituted.
async function holdHash(page: Page) {
  await page.evaluate(() => {
    const state = window as unknown as { releaseSessionHash: () => void; sessionHashWaiting: boolean };
    state.sessionHashWaiting = false;
    const original = SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest = async function (...args: Parameters<SubtleCrypto['digest']>) {
      // Inventory previews hash only small raw files. Gate the complete level fingerprint.
      if (args[1].byteLength < 100000) return original.call(this, ...args);
      SubtleCrypto.prototype.digest = original; state.sessionHashWaiting = true;
      await new Promise<void>(resolve => { state.releaseSessionHash = resolve; });
      return original.call(this, ...args);
    };
  });
}
async function waitHash(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as unknown as { sessionHashWaiting: boolean }).sessionHashWaiting)).toBe(true);
}
async function releaseHash(page: Page) {
  await page.evaluate(() => (window as unknown as { releaseSessionHash: () => void }).releaseSessionHash());
}

test('opt-in hashing races cannot install a cancelled candidate or restore a cleared source', async ({ page }) => {
  test.skip(!privateInputs, 'Exact original sources stay private and must be supplied explicitly.');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openLocal(page); await choose(page); await holdHash(page);
  await page.getByRole('button', { name: 'Apply team to Training43' }).click(); await waitHash(page);
  await page.getByLabel('Character for team slot 1').selectOption('10');
  await releaseHash(page);
  await expect(page.getByRole('button', { name: 'Apply team to Training43' })).toBeEnabled();
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  await choose(page); await apply(page); const saved = await save(page);
  await holdHash(page);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(jsonUpload(saved)); await waitHash(page);
  await page.getByRole('button', { name: 'Clear item inspection' }).click(); await releaseHash(page);
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  expect((await save(page)).version).toBe(3);
  await expect(page.locator('#pause-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});


async function holdMapRead(page: Page) {
  await page.evaluate(() => {
    const state = window as unknown as { mapReadWaiting: boolean; mapHashDone: boolean; releaseMapRead: () => void };
    const originalRead = File.prototype.arrayBuffer, originalDigest = SubtleCrypto.prototype.digest;
    // Observe completion of a genuine original map digest; never substitute its result.
    SubtleCrypto.prototype.digest = async function (...args: Parameters<SubtleCrypto['digest']>) {
      const result = await originalDigest.call(this, ...args);
      if (args[1].byteLength === 157738) { state.mapHashDone = true; SubtleCrypto.prototype.digest = originalDigest; }
      return result;
    };
    File.prototype.arrayBuffer = async function () {
      if (this.name !== 'held-training-map.map') return originalRead.call(this);
      File.prototype.arrayBuffer = originalRead; state.mapReadWaiting = true;
      await new Promise<void>(resolve => { state.releaseMapRead = resolve; });
      return originalRead.call(this);
    };
  });
  await page.getByLabel('Open local editor map').setInputFiles({
    name: 'held-training-map.map', mimeType: 'application/octet-stream',
    buffer: await readFile(process.env.HIRED_GUNS_TRAINING_MAP!),
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { mapReadWaiting: boolean }).mapReadWaiting)).toBe(true);
  await expect(page.getByRole('button', { name: 'Apply team to Training43' })).toBeDisabled();
}
async function releaseMapRead(page: Page) {
  await page.evaluate(() => (window as unknown as { releaseMapRead: () => void }).releaseMapRead());
  await expect.poll(() => page.evaluate(() => (window as unknown as { mapHashDone: boolean }).mapHashDone)).toBe(true);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

for (const cancel of ['retry', 'rules'] as const) {
  test(`opt-in cancelling a pending map read by ${cancel} immediately restores Apply on the retained map`, async ({ page }) => {
    test.skip(!privateInputs, 'Exact original sources stay private and must be supplied explicitly.');
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await openLocal(page); await choose(page);
    const button = page.getByRole('button', { name: 'Apply team to Training43' });
    await expect(button).toBeEnabled(); await holdMapRead(page);
    if (cancel === 'retry') await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
    else await page.getByLabel('Mission rules').selectOption('navigation');
    // No unrelated selection/source refresh: cancellation itself must make Apply usable.
    await expect(button).toBeEnabled(); await apply(page); await releaseMapRead(page);
    // The old map result cannot clear the team just applied after cancellation.
    await expect(page.locator('#session-status')).toContainText('Standalone imported Training43 session');
    await expect(page.locator('#pause-overlay')).toBeVisible(); await expect(button).toBeEnabled();
    expect((await save(page)).indices).toEqual(order); expect(errors).toEqual([]);
  });
}

for (const failure of ['malformed', 'oversized', 'wrong-source'] as const) {
  test(`opt-in ${failure} plan cancellation restores Apply despite a pending map import`, async ({ page }) => {
    test.skip(!privateInputs, 'Exact original sources stay private and must be supplied explicitly.');
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await openLocal(page); await choose(page); await holdMapRead(page);
    let plan = failure === 'oversized' ? ' '.repeat(2048) : '{';
    if (failure === 'wrong-source') {
      const catalog = await importCharacters(new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!)));
      const wrong = JSON.parse(exportRosterSelection(catalog, order));
      wrong.source.sha256 = '0'.repeat(64); plan = JSON.stringify(wrong);
    }
    await page.getByLabel('Load team plan').setInputFiles(jsonUpload(plan, 'invalid-plan.json'));
    await expect(page.locator('#roster-status')).toContainText('Plan not loaded:');
    if (failure === 'oversized') await expect(page.locator('#roster-status')).toContainText('smaller than 2 KiB');
    if (failure === 'wrong-source') await expect(page.locator('#roster-status')).toContainText('identity mismatch');
    const button = page.getByRole('button', { name: 'Apply team to Training43' });
    // Refusal must retain the explicit choices and usable matching sources without a workaround.
    for (const [slot, index] of order.entries()) await expect(page.getByLabel(`Character for team slot ${slot + 1}`)).toHaveValue(String(index));
    await expect(button).toBeEnabled(); await expect(page.locator('#pause-overlay')).toBeVisible();
    await apply(page); await releaseMapRead(page);
    await expect(page.locator('#session-status')).toContainText('Standalone imported Training43 session');
    expect((await save(page)).indices).toEqual(order); expect(errors).toEqual([]);
  });
}
