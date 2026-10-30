import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { TrainingEncounter } from '../../src/combat/training-encounter';
const privateInputs = !!(process.env.HIRED_GUNS_TRAINING_MAP && process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);
const upload = (value: unknown) => ({ name: 'encounter-session.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
async function open(page: Page) {
  await page.goto('/'); await page.locator('#inventory-tools > summary').click();
  await page.getByLabel('Open local editor map').setInputFiles(process.env.HIRED_GUNS_TRAINING_MAP!);
  await expect(page.locator('#level-name')).toHaveText('Training 43');
  await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(process.env.HIRED_GUNS_CHARACTERS!);
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  for (const [actor, index] of [11, 3, 0, 5].entries()) await page.getByLabel(`Character for team slot ${actor + 1}`).selectOption(String(index));
  await page.getByRole('button', { name: 'Apply team to Training43' }).click();
  await expect(page.locator('#encounter-status')).toContainText('INACTIVE');
}
async function state(page: Page): Promise<TrainingEncounter> { return JSON.parse((await page.locator('#encounter-snapshot').textContent())!); }
async function inventory(page: Page) { return Promise.all([0, 1, 2, 3].map(async i => JSON.parse((await page.locator(`#training-inventory-${i} pre`).textContent())!))); }
async function arm(page: Page, fixture: string, actor = 0) {
  await page.getByLabel('Encounter actor', { exact: true }).focus(); await page.keyboard.press('Home');
  for (let i = 0; i < actor; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab'); await page.keyboard.press('Home');
  for (let i = 0; i < ['full', 'partial', 'empty'].indexOf(fixture); i++) await page.keyboard.press('ArrowDown');
  const button = page.getByRole('button', { name: 'Arm authored encounter', exact: true });
  await button.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#encounter-status')).toContainText(`Authored ${fixture} loadout`);
}
async function save(page: Page) {
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function start(page: Page) { await page.getByRole('button', { name: 'Start mission', exact: true }).click(); }
async function freeze(page: Page) { await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000)); }
async function holdHash(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { encounterWaiting: boolean; releaseEncounter: () => void; encounterDone: boolean };
    w.encounterWaiting = false; w.encounterDone = false;
    const original = SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest = async function (...args: Parameters<SubtleCrypto['digest']>) {
      if (args[1].byteLength < 100000) return original.call(this, ...args);
      SubtleCrypto.prototype.digest = original; w.encounterWaiting = true;
      await new Promise<void>(resolve => { w.releaseEncounter = resolve; });
      const result = await original.call(this, ...args); w.encounterDone = true; return result;
    };
  });
}
async function waiting(page: Page) { await expect.poll(() => page.evaluate(() => (window as unknown as { encounterWaiting: boolean }).encounterWaiting)).toBe(true); }
async function release(page: Page) {
  await page.evaluate(() => (window as unknown as { releaseEncounter: () => void }).releaseEncounter());
  await expect.poll(() => page.evaluate(() => (window as unknown as { encounterDone: boolean }).encounterDone)).toBe(true);
  // Drain all independent digest continuations and the candidate build.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('authored encounter unavailable outside applied selected-team session', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#training-encounter')).toBeHidden();
  await page.keyboard.press('f'); await page.keyboard.press('t'); await page.keyboard.press('r');
  await expect(page.locator('#error')).toBeEmpty();
});

test('opt-in keyboard full/partial/empty, dummy/miss, cooldown/pause, reset/retry and complete recovery', async ({ page }) => {
  test.setTimeout(90000);
  test.skip(!privateInputs, 'Requires explicit local originals.');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  // Install before navigation so animation frames share the same clock from startup.
  await freeze(page); await open(page); const initialInventory = await inventory(page);
  await arm(page, 'full', 2); const baseline = await state(page);
  expect(baseline.canonicalIndex).toBe(0);
  await start(page); await page.keyboard.down('f');
  const fired = await state(page); expect(fired.shots).toBe(1); expect(fired.equipped.ammo).toBeLessThan(baseline.equipped.ammo);
  expect(fired.lastDamage).toBeGreaterThan(0); expect(fired.fitness).toBeLessThan(baseline.fitness); expect(fired.fireAccuracy).toBeGreaterThanOrEqual(0);
  await page.keyboard.down('f'); expect(await state(page)).toEqual(fired); // Repeat is ignored.
  await page.keyboard.up('f'); await page.keyboard.press('f');
  expect((await state(page)).status).toBe('already-firing');
  await page.keyboard.press('Escape'); const paused = await state(page);
  await page.clock.runFor(1000); expect(await state(page)).toEqual(paused);
  await page.keyboard.press('f'); expect(await state(page)).toEqual(paused); // Paused shot is blocked.
  await start(page); await page.clock.runFor(1000);
  expect((await state(page)).fireDuration).toBe(0);
  await page.keyboard.press('t'); await page.keyboard.press('f'); await page.keyboard.press('Escape');
  const missed = await state(page); expect(missed.target).toBe('miss'); expect(missed.lastDamage).toBe(0); expect(missed.fitness).toBe(fired.fitness); expect(missed.shots).toBe(2);
  // Equip while an encounter exists; its spent authored ammo must survive reconstruction.
  await page.getByLabel('Carried slot for team slot 1').selectOption('0');
  await page.getByRole('button', { name: 'Equip for team slot 1', exact: true }).click();
  await expect(page.locator('#recovery-status')).toContainText('Equipped carried slot');
  expect(await state(page)).toEqual(missed); const equippedInventory = await inventory(page);
  const saved = await save(page); expect(saved.version).toBe(6); expect(saved.encounter).toEqual(missed);
  await page.keyboard.press('r'); expect(await state(page)).toMatchObject({ shots: 0, target: 'miss', fireDuration: 0, fireAccuracy: 0, fitness: 100000 });
  expect(await inventory(page)).toEqual(equippedInventory);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  expect(await save(page)).toEqual(saved); expect(await inventory(page)).toEqual(equippedInventory);
  if (process.env.HIRED_GUNS_ENCOUNTER_SCREENSHOT) await page.locator('#training-encounter').screenshot({ path: process.env.HIRED_GUNS_ENCOUNTER_SCREENSHOT, animations: 'disabled' });
  for (const edit of [
    (s: typeof saved) => { delete s.encounter.fireAccuracy; },
    (s: typeof saved) => { s.encounter.canonicalIndex = 11; },
    (s: typeof saved) => { s.encounter.baseline.equipped.ammo++; },
    (s: typeof saved) => { s.sources.items.sha256 = '0'.repeat(64); },
    (s: typeof saved) => { s.sources.map = '0'.repeat(64); },
  ]) {
    const invalid = structuredClone(saved); edit(invalid);
    await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(invalid));
    await expect(page.locator('#error')).toContainText('Checkpoint not loaded');
    expect(await state(page)).toEqual(missed); expect(await inventory(page)).toEqual(equippedInventory);
  }
  await arm(page, 'partial'); const partial = await state(page);
  await start(page); await page.keyboard.press('f'); await page.keyboard.press('Escape');
  expect((await state(page)).equipped.ammo).toBe(0); expect((await state(page)).lastDamage).toBe(fired.lastDamage);
  await start(page); await page.clock.runFor(1000); await page.keyboard.press('f'); await page.keyboard.press('Escape');
  expect((await state(page)).status).toBe('no-ammo');
  await page.keyboard.press('r'); expect(await state(page)).toEqual(partial); expect(await inventory(page)).toEqual(equippedInventory);
  await arm(page, 'empty'); await start(page); await page.keyboard.press('f'); await page.keyboard.press('Escape');
  expect(await state(page)).toMatchObject({ shots: 0, status: 'no-ammo', fitness: 100000, fireDuration: 0 });
  await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
  expect(await state(page)).toMatchObject({ fixture: 'empty', shots: 0, status: 'ready' });
  expect(await inventory(page)).toEqual(initialInventory);
  // A new Apply is explicitly inactive rather than retaining another team's association.
  await page.getByRole('button', { name: 'Apply team to Training43' }).click();
  await expect(page.locator('#encounter-status')).toContainText('INACTIVE');
  expect(await inventory(page)).toEqual(initialInventory); expect(errors).toEqual([]);
});

test('opt-in pending encounter recovery cancels on selection change, source clear and rejected source replacement', async ({ page }) => {
  test.setTimeout(90000);
  test.skip(!privateInputs, 'Requires explicit local originals.');
  await open(page); await arm(page, 'partial');
  const saved = await save(page), old = await state(page), oldInventory = await inventory(page);
  await holdHash(page);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved)); await waiting(page);
  await page.getByLabel('Character for team slot 1').selectOption('1'); await release(page);
  expect(await state(page)).toEqual(old); expect(await inventory(page)).toEqual(oldInventory);
  await holdHash(page);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved)); await waiting(page);
  await page.getByRole('button', { name: 'Clear item inspection', exact: true }).click(); await release(page);
  await expect(page.locator('#session-status')).toContainText('No active'); await expect(page.locator('#training-encounter')).toBeHidden();
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored'); expect(await state(page)).toEqual(old);
  await holdHash(page);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved)); await waiting(page);
  await page.getByLabel('Open local Items data').setInputFiles({ name: 'bad.raw', mimeType: 'application/octet-stream', buffer: Buffer.alloc(3) });
  await expect(page.locator('#items-status')).toContainText('Items not loaded'); await release(page);
  await expect(page.locator('#session-status')).toContainText('No active'); await expect(page.locator('#training-encounter')).toBeHidden();
});

test('opt-in complete encounter survives page reload with reimported raw sources', async ({ page }) => {
  test.skip(!privateInputs, 'Requires explicit local originals.');
  await open(page); await arm(page, 'full', 3); await start(page);
  await page.keyboard.press('f'); await page.keyboard.press('Escape'); await page.keyboard.press('t');
  const saved = await save(page), beforeInventory = await inventory(page);
  await open(page); // Fresh page and fresh verified local source imports.
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  expect(await save(page)).toEqual(saved); expect(await state(page)).toEqual(saved.encounter);
  expect(await inventory(page)).toEqual(beforeInventory); await expect(page.locator('#pause-overlay')).toBeVisible();
});

for (const cancellation of ['retry', 'rules', 'apply', 'map'] as const) {
  test(`opt-in ${cancellation} cancels pending v6 recovery with encounter and inventory together`, async ({ page }) => {
    test.skip(!privateInputs, 'Requires explicit local originals.');
    await open(page); await arm(page, 'partial', 1); await start(page);
    await page.keyboard.press('f'); await page.keyboard.press('Escape');
    const saved = await save(page); await page.keyboard.press('r');
    await holdHash(page);
    await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved)); await waiting(page);
    // Pending recovery blocks authored commands, even via keyboard.
    const pendingState = await state(page); await page.keyboard.press('t'); await page.keyboard.press('r');
    expect(await state(page)).toEqual(pendingState);
    if (cancellation === 'retry') await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
    else if (cancellation === 'rules') await page.getByLabel('Mission rules').selectOption('navigation');
    else if (cancellation === 'apply') {
      await page.getByLabel('Character for team slot 1').selectOption('1');
      await page.getByRole('button', { name: 'Apply team to Training43' }).click();
      await expect(page.locator('#encounter-status')).toContainText('INACTIVE');
    } else await page.getByRole('button', { name: 'Synthetic map', exact: true }).click();
    const expected = await save(page);
    await release(page); expect(await save(page)).toEqual(expected);
    if (cancellation === 'map') await expect(page.locator('#training-encounter')).toBeHidden();
    else if (cancellation === 'apply') await expect(page.locator('#encounter-status')).toContainText('INACTIVE');
    else expect(await state(page)).toMatchObject({ shots: 0, fireDuration: 0, status: 'ready' });
  });
}

test('opt-in terminal catch-up frame advances cooldown only for the final accepted world tick', async ({ page }) => {
  test.skip(!privateInputs, 'Requires explicit local originals.');
  await freeze(page); await open(page); await arm(page, 'full'); await start(page);
  await page.keyboard.press('f'); await page.keyboard.press('Escape');
  const saved = await save(page), checkpoint = JSON.parse(saved.checkpoint);
  checkpoint.world.tick = checkpoint.world.mission.rules.timeLimit * 601 - 1;
  checkpoint.world.mission.clock = { tens: 0, units: 1, subticks: 0 };
  saved.checkpoint = JSON.stringify(checkpoint);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  const before = await state(page); expect(before.fireDuration).toBeGreaterThan(0);
  await start(page); await page.clock.fastForward(100);
  await expect(page.locator('#mission-progress')).toContainText('FAILED');
  const after = await state(page); expect(after.fireDuration).toBe(before.fireDuration - 1);
  await page.keyboard.press('f'); expect(await state(page)).toEqual(after);
  const terminal = await save(page); expect(JSON.parse(terminal.checkpoint).world.tick).toBe(checkpoint.world.tick + 1);
});

test('opt-in holding Enter on Fire does not generate repeated button shots', async ({ page }) => {
  test.skip(!privateInputs, 'Requires explicit local originals.');
  await freeze(page); await open(page); await arm(page, 'full'); await start(page);
  await page.getByRole('button', { name: 'Fire authored gun (F)', exact: true }).focus();
  await page.keyboard.down('Enter'); expect((await state(page)).shots).toBe(1);
  await page.clock.runFor(1000); await page.keyboard.down('Enter'); await page.keyboard.up('Enter');
  expect((await state(page)).shots).toBe(1);
  await page.keyboard.press('Enter'); expect((await state(page)).shots).toBe(2);
});
