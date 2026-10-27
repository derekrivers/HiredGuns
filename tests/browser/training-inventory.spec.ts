import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { importEditorMap } from '../../src/import/editor-map';
import { createTrainingSession, importTrainingSession } from '../../src/sim/training-session';

const privateInputs = !!(process.env.HIRED_GUNS_TRAINING_MAP && process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);
const order = [11, 3, 0, 5];
const upload = (data: unknown) => ({ name: 'inventory-session.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
async function local() {
  const [map, roster, items] = await Promise.all([process.env.HIRED_GUNS_TRAINING_MAP!, process.env.HIRED_GUNS_CHARACTERS!, process.env.HIRED_GUNS_ITEMS!].map(async p => new Uint8Array(await readFile(p))));
  return { level: (await importEditorMap(map!)).level, sources: { roster: roster!, items: items! } };
}
async function open(page: Page) {
  await page.goto('/');
  await page.getByLabel('Open local editor map').setInputFiles(process.env.HIRED_GUNS_TRAINING_MAP!);
  await expect(page.locator('#level-name')).toHaveText('Training 43');
  await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles(process.env.HIRED_GUNS_CHARACTERS!);
  await page.getByLabel('Open local Items data').setInputFiles(process.env.HIRED_GUNS_ITEMS!);
  for (const [actor, index] of order.entries()) await page.getByLabel(`Character for team slot ${actor + 1}`).selectOption(String(index));
  await page.getByRole('button', { name: 'Apply team to Training43' }).click();
  await expect(page.locator('#session-status')).toContainText('Standalone imported');
  await expect(page.locator('#pause-overlay')).toBeVisible();
}
async function save(page: Page) {
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function overlay(page: Page) {
  return Promise.all([0, 1, 2, 3].map(async i => JSON.parse((await page.locator(`#training-inventory-${i} pre`).textContent())!)));
}
async function equip(page: Page, actor: number, slot: number) {
  await page.getByLabel(`Carried slot for team slot ${actor + 1}`).selectOption(String(slot));
  await page.getByRole('button', { name: `Equip for team slot ${actor + 1}`, exact: true }).click();
  await expect(page.locator('#recovery-status')).toContainText(`Equipped carried slot ${slot + 1} for team slot ${actor + 1}`);
}
async function returnItem(page: Page, actor: number, slot: number) {
  await page.getByLabel(`Return position for team slot ${actor + 1}`).selectOption(String(slot));
  await page.getByRole('button', { name: `Return to backpack for team slot ${actor + 1}`, exact: true }).click();
  await expect(page.locator('#recovery-status')).toContainText(`Returned equipment to backpack position ${slot + 1} for team slot ${actor + 1}`);
}
async function holdHash(page: Page) {
  await page.evaluate(() => {
    const state = window as unknown as { inventoryWaiting: boolean; releaseInventoryHash: () => void; inventoryHashDone: boolean };
    state.inventoryWaiting = false; state.inventoryHashDone = false;
    const original = SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest = async function (...args: Parameters<SubtleCrypto['digest']>) {
      if (args[1].byteLength < 100000) return original.call(this, ...args);
      SubtleCrypto.prototype.digest = original; state.inventoryWaiting = true;
      await new Promise<void>(resolve => { state.releaseInventoryHash = resolve; });
      const result = await original.call(this, ...args); state.inventoryHashDone = true; return result;
    };
  });
}
async function waiting(page: Page) { await expect.poll(() => page.evaluate(() => (window as unknown as { inventoryWaiting: boolean }).inventoryWaiting)).toBe(true); }
async function release(page: Page) {
  await page.evaluate(() => (window as unknown as { releaseInventoryHash: () => void }).releaseInventoryHash());
  await expect.poll(() => page.evaluate(() => (window as unknown as { inventoryHashDone: boolean }).inventoryHashDone)).toBe(true);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('inventory commands are absent without an applied verified Training43 session', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#training-inventory')).toBeEmpty();
});

test('opt-in paused return: all four complete byte insertions, bounded cycles, v2 migration and full recovery', async ({ page }) => {
  test.skip(!privateInputs, 'Requires explicit private originals.');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const { level, sources } = await local(), initial = await createTrainingSession(level, sources, order);
  await open(page);
  await expect(page.getByRole('button', { name: 'Return to backpack for team slot 1', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Return to backpack for team slot 1', exact: true }).dispatchEvent('click');
  await expect(page.locator('#training-inventory-0 [role=status]')).toContainText('Equipment not returned');
  expect(await overlay(page)).toEqual(initial.session.inventory.actors);
  for (let actor = 0; actor < 4; actor++) {
    await equip(page, actor, actor === 1 ? 9 : 0);
    const before = await overlay(page), current = before[actor]!, end = current.inventory.carried.findIndex((s: { itemId: number }) => !s.itemId), position = actor % 2 ? Math.max(0, end - 1) : 0;
    if (actor === 0) {
      const v2 = await save(page); v2.version = 2; v2.commands = v2.commands.map(({ actor, slot }: { actor: number; slot: number }) => ({ actor, slot }));
      await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(v2));
      await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored'); expect(await overlay(page)).toEqual(before);
      await page.getByRole('button', { name: 'Start mission', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Return to backpack for team slot 1', exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
    }
    await returnItem(page, actor, position);
    const after = await overlay(page), expected = structuredClone(current);
    expected.inventory.carried = [...current.inventory.carried.slice(0, position), current.inventory.equipped, ...current.inventory.carried.slice(position, 29)];
    expected.inventory.equipped = { ...current.inventory.equipped, itemId: 0, rawHex: `00${current.inventory.equipped.rawHex.slice(2)}` }; expected.selection = position; expected.weight.usingGrenade = 0;
    expect(after[actor]).toEqual(expected);
    for (let j = 0; j < 4; j++) if (j !== actor) expect(after[j]).toEqual(before[j]);
    for (const name of [`Equip for team slot ${actor + 1}`, `Return to backpack for team slot ${actor + 1}`]) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
    await page.getByRole('button', { name: `Return to backpack for team slot ${actor + 1}`, exact: true }).dispatchEvent('click');
    await expect(page.locator(`#training-inventory-${actor} [role=status]`)).toContainText('Equipment not returned'); expect(await overlay(page)).toEqual(after);
  }
  const beforeTurn = await page.locator('#position-0').textContent();
  await page.getByRole('button', { name: 'Start mission', exact: true }).click(); await page.keyboard.press('Digit1'); await page.keyboard.down('e');
  await expect(page.locator('#position-0')).not.toHaveText(beforeTurn!); await page.keyboard.up('e'); await page.keyboard.press('Escape');
  const completed = await overlay(page), saved = await save(page), world = JSON.parse(saved.checkpoint).world;
  expect(saved.commands).toHaveLength(8); expect(world.tick).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Retry mission', exact: true }).click(); expect(await overlay(page)).toEqual(initial.session.inventory.actors);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
  await expect(page.locator('#recovery-status')).toContainText(`Checkpoint restored at tick ${world.tick}`); await expect(page.locator('#pause-overlay')).toBeVisible();
  expect(await overlay(page)).toEqual(completed); expect(await save(page)).toEqual(saved);
  const wrong = structuredClone(saved); wrong.sources.roster.sha256 = '0'.repeat(64);
  const e = { kind: 'equip', actor: 0, slot: 0 }, r = { kind: 'return', actor: 0, slot: 0 };
  for (const bad of [wrong, ...[[r], [e, e], [e, r, e], [e, r, r], [{ ...e, kind: 'drop' }], [e, { ...r, slot: 29 }], [{ ...e, actor: 4 }], [e, { ...r, slot: 9 }], [{ ...e, extra: true }]].map(commands => ({ ...saved, commands }))]) {
    await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(bad)); await expect(page.locator('#error')).toContainText('Checkpoint not loaded');
    expect(await overlay(page)).toEqual(completed); expect(await save(page)).toEqual(saved);
  }
  if (process.env.HIRED_GUNS_INVENTORY_SCREENSHOT) {
    await page.locator('#training-inventory-0 summary').click(); await page.locator('#training-inventory').screenshot({ path: process.env.HIRED_GUNS_INVENTORY_SCREENSHOT });
  }
  await page.getByLabel('Mission rules').selectOption('navigation'); expect(await overlay(page)).toEqual(initial.session.inventory.actors);
  expect(errors).toEqual([]);
});

test('opt-in actual paused equip: full entries, compaction, tails/actions, independent actors, navigation and atomic recovery', async ({ page }) => {
  test.skip(!privateInputs, 'Requires explicit private originals.');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const { level, sources } = await local(), initial = await createTrainingSession(level, sources, order);
  await open(page);
  expect(await overlay(page)).toEqual(initial.session.inventory.actors);
  for (const [actor, slot] of [[0, 1], [1, 9], [2, 0], [3, 8]]) {
    const original = initial.session.inventory.actors[actor!]!, before = await overlay(page);
    await page.getByLabel(`Carried slot for team slot ${actor! + 1}`).selectOption(String(slot));
    const item = initial.session.items.records[original.inventory.carried[slot!]!.itemId - 1]!;
    await expect(page.locator(`#inventory-selection-${actor}`)).toContainText(item.text.header1.trim());
    await expect(page.locator(`#inventory-selection-${actor}`)).toContainText(original.inventory.carried[slot!]!.rawHex);
    // Running navigation disables Equip; pause retains the explicit selection.
    if (actor === 0) {
      await page.getByRole('button', { name: 'Start mission', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Equip for team slot 1', exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
    }
    await equip(page, actor!, slot!);
    const after = await overlay(page), actual = after[actor!]!;
    const expected = structuredClone(original), end = original.inventory.carried.findIndex(s => !s.itemId);
    expected.inventory.equipped = structuredClone(original.inventory.carried[slot!]!);
    for (let i = slot!; i < end - 1; i++) expected.inventory.carried[i] = structuredClone(original.inventory.carried[i + 1]!);
    expected.inventory.carried[end - 1] = { ...original.inventory.carried[end - 1]!, itemId: 0, rawHex: `00${original.inventory.carried[end - 1]!.rawHex.slice(2)}` };
    expected.selection = slot === end - 1 && slot > 0 ? slot - 1 : slot!;
    expect(actual).toEqual(expected);
    for (let j = 0; j < 4; j++) if (j !== actor) expect(after[j]).toEqual(before[j]);
    await expect(page.getByRole('button', { name: `Equip for team slot ${actor! + 1}`, exact: true })).toBeDisabled();
    // A dispatched click also cannot bypass the handler guard / command replay.
    await page.getByRole('button', { name: `Equip for team slot ${actor! + 1}`, exact: true }).dispatchEvent('click');
    await expect(page.locator(`#training-inventory-${actor} [role=status]`)).toContainText('Item not equipped');
    expect(await overlay(page)).toEqual(after);
  }
  if (process.env.HIRED_GUNS_INVENTORY_SCREENSHOT) {
    await page.locator('#training-inventory-0 summary').click();
    await page.locator('#training-inventory').screenshot({ path: process.env.HIRED_GUNS_INVENTORY_SCREENSHOT });
  }
  const beforeTurn = await page.locator('#position-0').textContent();
  await page.getByRole('button', { name: 'Start mission', exact: true }).click(); await page.keyboard.press('Digit1'); await page.keyboard.down('e');
  await expect(page.locator('#position-0')).not.toHaveText(beforeTurn!); await page.keyboard.up('e'); await page.keyboard.press('Escape');
  const equipped = await overlay(page), saved = await save(page), world = JSON.parse(saved.checkpoint).world;
  expect(saved.version).toBe(3); expect(saved.commands).toHaveLength(4); expect(world.tick).toBeGreaterThan(0);
  expect((await importTrainingSession(level, sources, JSON.stringify(saved))).session.inventory.actors).toEqual(equipped);
  await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
  expect(await overlay(page)).toEqual(initial.session.inventory.actors);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
  await expect(page.locator('#recovery-status')).toContainText(`Checkpoint restored at tick ${world.tick}`);
  await expect(page.locator('#pause-overlay')).toBeVisible(); expect(await overlay(page)).toEqual(equipped); expect(await save(page)).toEqual(saved);
  const wrong = structuredClone(saved); wrong.sources.items.sha256 = '0'.repeat(64);
  for (const bad of [wrong, { ...saved, commands: [...saved.commands, saved.commands[0]] }, { ...saved, commands: [{ actor: 0, slot: 29 }] }, { ...saved, commands: [{ actor: 0, slot: 0, extra: true }] }]) {
    await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(bad)); await expect(page.locator('#error')).toContainText('Checkpoint not loaded');
    expect(await overlay(page)).toEqual(equipped); expect(await save(page)).toEqual(saved);
  }
  const v1 = { ...saved, version: 1 }; delete v1.commands;
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(v1)); await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  expect(await overlay(page)).toEqual(initial.session.inventory.actors); expect(JSON.parse((await save(page)).checkpoint).world).toEqual(world);
  await equip(page, 0, 0); await page.getByLabel('Mission rules').selectOption('navigation');
  expect(await overlay(page)).toEqual(initial.session.inventory.actors); await expect(page.locator('#pause-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const operation of ['equip', 'return', 'restore'] as const) for (const cancel of ['selection', 'retry', 'rules', 'source', 'map', 'apply'] as const) {
  test(`opt-in ${cancel} cancels delayed ${operation} without stale inventory installation`, async ({ page }) => {
    test.skip(!privateInputs, 'Requires explicit private originals.');
    await open(page);
    let saved;
    if (operation !== 'equip') await equip(page, 0, 1);
    if (operation === 'restore') { await returnItem(page, 0, 0); saved = await save(page); await page.getByRole('button', { name: 'Retry mission', exact: true }).click(); }
    await holdHash(page);
    if (operation === 'equip') {
      await page.getByLabel('Carried slot for team slot 1').selectOption('1');
      await page.getByRole('button', { name: 'Equip for team slot 1', exact: true }).click();
    } else if (operation === 'return') await page.getByRole('button', { name: 'Return to backpack for team slot 1', exact: true }).click();
    else await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));
    await waiting(page);
    if (cancel === 'selection') await page.getByLabel('Character for team slot 1').selectOption('10');
    else if (cancel === 'retry') await page.getByRole('button', { name: 'Retry mission', exact: true }).click();
    else if (cancel === 'rules') await page.getByLabel('Mission rules').selectOption('navigation');
    else if (cancel === 'apply') {
      await page.getByLabel('Character for team slot 1').selectOption('10');
      await page.getByRole('button', { name: 'Apply team to Training43' }).click();
      await expect.poll(async () => (await save(page)).indices[0]).toBe(10);
    }
    else if (cancel === 'source') await page.getByRole('button', { name: 'Clear item inspection', exact: true }).click();
    else await page.getByRole('button', { name: 'Synthetic map', exact: true }).click();
    const expected = await save(page); const expectedOverlay = cancel === 'source' || cancel === 'map' ? [] : await overlay(page);
    await release(page); await expect(page.locator('#pause-overlay')).toBeVisible();
    expect(await save(page)).toEqual(expected); if (expectedOverlay.length) expect(await overlay(page)).toEqual(expectedOverlay);
    if (cancel === 'source' || cancel === 'map') { await expect(page.locator('#training-inventory')).toBeEmpty(); expect((await save(page)).version).toBe(3); }
    else if (cancel !== 'selection' || operation !== 'return') { expect((await save(page)).commands).toEqual([]); expect((await overlay(page)).every(a => a.inventory.equipped.itemId === 0)).toBe(true); }
  });
}
