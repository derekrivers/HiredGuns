import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { LevelData, WorldState } from '../../src/contracts';
import { createExtractionDemo } from '../../src/demo';
import { importEditorMap } from '../../src/import/editor-map';
import { createWorld, stepWorld } from '../../src/sim/world';
import { exportCheckpoint } from '../../src/sim/checkpoint';
import { exitRoute } from '../helpers/extraction-route';

const actionKeys = { forward: 'w', backward: 's', 'strafe-left': 'a', 'strafe-right': 'd', 'turn-left': 'q', 'turn-right': 'e' };
async function driveMercenary(page: Page, level: LevelData, world: WorldState, id: number): Promise<WorldState> {
  await page.keyboard.press(`Digit${id + 1}`);
  for (const move of exitRoute(level, world, id)) {
    // Release inside the page at the observed target: protocol latency must not
    // turn a single planned command into held-key repeats on a busy renderer.
    await page.evaluate(({ id, target, exits, code }) => {
      const position = document.getElementById(`position-${id}`)!;
      const retired = document.getElementById(`extracted-${id}`)!;
      const observer = new MutationObserver(() => {
        const text = position.textContent!;
        const reached = exits ? !retired.hidden : text.includes(`X ${String(target.x).padStart(2, '0')}`) && text.includes(`Y ${String(target.y).padStart(2, '0')}`) && text.includes(`Z ${String(target.z).padStart(2, '0')}`);
        if (reached) release();
      });
      const release = () => { window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); observer.disconnect(); clearTimeout(timer); };
      const timer = window.setTimeout(release, 4000);
      observer.observe(position, { childList: true, subtree: true });
      observer.observe(retired, { attributes: true, attributeFilter: ['hidden'] });
    }, { id, target: move.target, exits: move.exits, code: `Key${actionKeys[move.action].toUpperCase()}` });
    await page.keyboard.down(actionKeys[move.action]);
    if (move.exits) await expect(page.locator(`#extracted-${id}`)).toBeVisible();
    else await page.waitForFunction(({ id, x, y, z }) => {
      const text = document.getElementById(`position-${id}`)!.textContent!;
      return text.includes(`X ${String(x).padStart(2, '0')}`) && text.includes(`Y ${String(y).padStart(2, '0')}`) && text.includes(`Z ${String(z).padStart(2, '0')}`);
    }, { id, ...move.target }, { timeout: 3000 });
    await page.keyboard.up(actionKeys[move.action]);
    world = stepWorld(level, world, [{ mercenaryId: id, action: move.action }]).world;
  }
  return world;
}
async function extractTeam(page: Page, level: LevelData): Promise<void> {
  let planned = createWorld(level);
  for (const id of [3, 2, 1, 0]) planned = await driveMercenary(page, level, planned, id);
  expect(planned.mission.outcome).toBe('complete');
  await expect(page.locator('#mission-progress')).toHaveText('4 / 4 extracted · COMPLETE');
  await expect(page.locator('#pause-overlay')).toContainText('TEAM EXTRACTED');
  await expect(page.getByRole('button', { name: 'Mission finished' })).toBeDisabled();
}

test('four mercenaries extract, completion restores, and retry starts a fresh mission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Extraction drill', exact: true }).click();
  await expect(page.getByLabel('Mission rules')).toHaveValue('cooperative-extraction');
  await page.getByRole('button', { name: 'Start mission' }).click();
  await extractTeam(page, createExtractionDemo());
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint' }).click();
  const download = await downloadPromise;
  const saved = await readFile((await download.path())!, 'utf8');
  await page.getByRole('button', { name: 'Retry mission' }).click();
  await expect(page.locator('#mission-progress')).toHaveText('0 / 4 extracted');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'completed.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
  await expect(page.locator('#mission-progress')).toHaveText('4 / 4 extracted · COMPLETE');
  await expect(page.getByRole('button', { name: 'Mission finished' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/extraction-complete.png' });
});

test('source countdown expiry preserves a recoverable failure and retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Extraction drill', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint' }).click();
  const download = await downloadPromise;
  const state = JSON.parse(await readFile((await download.path())!, 'utf8'));
  // Two source units: 1202 ticks to expiry. Tick1201 has one interrupt remaining.
  state.world.tick = 1201; state.world.mission.clock = { tens: 0, units: 1, subticks: 0 };
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'deadline.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)) });
  await expect(page.locator('#recovery-status')).toContainText('restored');
  await page.getByRole('button', { name: 'Start mission' }).click();
  await expect(page.locator('#mission-progress')).toHaveText('0 / 4 extracted · FAILED');
  await expect(page.locator('#pause-overlay')).toContainText('TIME EXPIRED');
  await page.getByRole('button', { name: 'Retry mission' }).click();
  await expect(page.locator('#mission-progress')).toHaveText('0 / 4 extracted');
  await expect(page.locator('#mission-time')).toHaveText('TIME 00:25');
  await expect(page.getByRole('button', { name: 'Start mission' })).toBeEnabled();
});

test('partial retirement restores and selecting the original race restarts with first-exit success', async ({ page }) => {
  const level = createExtractionDemo(); let partial = createWorld(level);
  for (const move of exitRoute(level, partial, 3)) partial = stepWorld(level, partial, [{ mercenaryId: 3, action: move.action }]).world;
  const json = await exportCheckpoint(level, partial);
  await page.goto('/');
  await page.getByRole('button', { name: 'Extraction drill', exact: true }).click();
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'partial.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('#mission-progress')).toHaveText('1 / 4 extracted');
  await expect(page.locator('#extracted-3')).toBeVisible();
  await page.getByLabel('Mission rules').selectOption('first-exit');
  await expect(page.locator('#mission-progress')).toHaveText('0 / 4 extracted');
  await expect(page.locator('#extracted-3')).toBeHidden();
  await page.getByRole('button', { name: 'Start mission' }).click();
  await driveMercenary(page, level, createWorld(level, undefined, { mode: 'first-exit', timeLimit: 2 }), 3);
  await expect(page.locator('#mission-progress')).toHaveText('1 / 4 extracted · COMPLETE');
  await expect(page.locator('#pause-overlay')).toContainText('MERCENARY 4 WINS');
});

test('Training43 local source supports an all-four cooperative extraction route', async ({ page }) => {
  test.skip(!process.env.HIRED_GUNS_TRAINING_MAP, 'Original data stays local; set HIRED_GUNS_TRAINING_MAP to the verified Training43 editor file.');
  const path = process.env.HIRED_GUNS_TRAINING_MAP!;
  const { level } = await importEditorMap(await readFile(path));
  await page.goto('/');
  await page.getByLabel('Open local editor map').setInputFiles(path);
  await expect(page.locator('#level-name')).toHaveText('Training 43');
  await expect(page.getByLabel('Mission rules')).toHaveValue('cooperative-extraction');
  await page.getByRole('button', { name: 'Start mission' }).click();
  await extractTeam(page, level);
  await expect(page.locator('#error')).toBeEmpty();
});
