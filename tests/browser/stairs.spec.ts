import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Expected coordinates are hand-authored for the four dry lanes, not derived
// from the traversal resolver. Observe the HUD to release before key repeat.
async function move(page: Page, id: number, key: 'w' | 's', y: number, z: number): Promise<void> {
  const x = 2 + id * 2;
  const target = `X ${String(x).padStart(2, '0')}  Y ${String(y).padStart(2, '0')}  Z ${String(z).padStart(2, '0')} / N`;
  await page.keyboard.press(`Digit${id + 1}`);
  await page.evaluate(({ id, target, code }) => {
    const position = document.getElementById(`position-${id}`)!;
    const record = { armedAt: performance.now(), downAt: null as number | null, upAt: null as number | null, releasedAt: null as number | null, releaseReason: '', playAtDown: '', targetAtDown: '' };
    const save = () => { position.dataset.stairInput = JSON.stringify(record); };
    let timer: number | undefined;
    const onUp = (event: KeyboardEvent) => { if (event.code === code) { record.upAt = performance.now(); save(); } };
    const onDown = (event: KeyboardEvent) => {
      if (event.code !== code || record.downAt !== null) return;
      record.downAt = performance.now(); record.playAtDown = document.getElementById('play')!.textContent!;
      record.targetAtDown = (event.target as Element)?.tagName ?? 'window'; save();
      timer = window.setTimeout(() => release('timeout'), 6000);
    };
    const release = (reason: string) => {
      record.releasedAt = performance.now(); record.releaseReason = reason;
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      observer.disconnect(); clearTimeout(timer);
      window.removeEventListener('keydown',onDown); window.removeEventListener('keyup',onUp); save();
    };
    const observer = new MutationObserver(() => { if (position.textContent === target) release('target'); });
    window.addEventListener('keydown',onDown); window.addEventListener('keyup',onUp); save();
    observer.observe(position, { childList: true, subtree: true });
  }, { id, target, code: `Key${key.toUpperCase()}` });
  await page.keyboard.down(key);
  try {
    await expect(page.locator(`#position-${id}`)).toHaveText(target, { timeout: 5000 });
  } catch (error) {
    const state = await page.evaluate(id => ({
      position: document.getElementById(`position-${id}`)!.textContent,
      event: document.getElementById(`event-${id}`)!.textContent,
      assignment: (document.getElementById(`assign-${id}`) as HTMLSelectElement).value,
      play: document.getElementById('play')!.textContent,
      tick: document.getElementById('tick')!.textContent,
      error: document.getElementById('error')!.textContent,
      visibility: document.visibilityState, focused: document.hasFocus(),
      activeElement: document.activeElement?.tagName,
      paused: !document.getElementById('pause-overlay')!.hidden,
      keyboard: document.getElementById(`position-${id}`)!.dataset.stairInput,
    }),id);
    throw new Error(`${String(error)}\nStair input diagnostics: ${JSON.stringify(state)}`);
  } finally { await page.keyboard.up(key); }
}

test('all four dry stair lanes climb, restore at elevation, and descend through normal controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Dry stair drill', exact: true }).click();
  await expect(page.locator('#level-name')).toHaveText('Dry stair drill');
  await page.getByRole('button', { name: 'Start navigation' }).click();
  for (let id = 0; id < 4; id++) {
    await move(page, id, 'w', 7, 2);
    await move(page, id, 'w', 6, 2);
    await move(page, id, 's', 7, 2);
  }
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save checkpoint' }).click();
  const download = await downloadPromise;
  const saved = await readFile((await download.path())!, 'utf8');
  await page.screenshot({ path: 'test-results/dry-stairs-elevated.png' });
  await page.getByRole('button', { name: 'Reset positions' }).click();
  for (let id = 0; id < 4; id++) await expect(page.locator(`#position-${id}`)).toContainText('Z 01');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'elevated.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
  await expect(page.locator('#recovery-status')).toContainText('restored');
  for (let id = 0; id < 4; id++) await expect(page.locator(`#position-${id}`)).toContainText('Z 02');
  await page.getByRole('button', { name: 'Start navigation' }).click();
  for (let id = 0; id < 4; id++) await move(page, id, 's', 8, 1);
  await expect(page.locator('#error')).toBeEmpty();
  expect(errors).toEqual([]);
});
