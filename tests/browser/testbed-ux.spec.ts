import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('guided headings, keyboard scenario selection and collapsed tools', async ({ page }) => {
  await page.goto('/');
  for (const name of ['1. Setup', '2. Choose and start a test', '3. Live test display']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('#inventory-tools')).not.toHaveAttribute('open');
  await expect(page.locator('#session-diagnostics')).not.toHaveAttribute('open');
  await expect(page.locator('#roster-panel')).not.toHaveAttribute('open');
  await page.keyboard.press('Tab'); await expect(page.locator('#local-test-preset')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#manual-setup > summary')).toBeFocused();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
  await expect(page.getByLabel('Open local editor map')).toBeFocused();
  await page.getByRole('button', { name: 'Extraction drill', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#play')).toBeFocused();
  await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await page.keyboard.press('Enter'); await expect(page.locator('#run-state')).toHaveText('RUNNING');
  await page.keyboard.press('Escape'); await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await page.locator('#inventory-tools > summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#inventory-tools')).toHaveAttribute('open');
});

for (const width of [320, 375, 1440]) test(`guided layout fits ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await page.goto('/');
  await expect(page.locator('#play')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.HIRED_GUNS_UX_SCREENSHOTS) await page.screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/public-${width}.png`, fullPage: true });
});

test('opt-in guided combat shows effects without diagnostics and clears transient history on restore', async ({ page }) => {
  test.skip(process.env.HIRED_GUNS_PRESET_PROOF !== '1', 'Requires configured local originals.');
  await page.goto('/'); await page.locator('#local-test-preset').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
  await expect(page.locator('#play')).toBeFocused();
  await expect(page.locator('#level-name')).toHaveText('Training 43');
  await expect(page.locator('#training-encounter details')).not.toHaveAttribute('open');
  await expect(page.locator('#encounter-status')).toContainText('Team slot 1:');
  await expect(page.locator('#encounter-readiness')).toContainText('Fire blocked');
  const before = await page.locator('#encounter-status').textContent();
  await page.keyboard.press('f'); expect(await page.locator('#encounter-status').textContent()).toBe(before);
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.keyboard.press('Enter'); await page.keyboard.press('f');
  await expect(page.locator('#run-state')).toHaveText('RUNNING');
  await expect(page.locator('#local-test-status')).not.toContainText('PAUSED');
  await expect(page.locator('#encounter-feedback')).toContainText('Shot fired. Ammo');
  await expect(page.locator('#encounter-feedback')).toContainText('→');
  await expect(page.locator('#encounter-status')).toContainText('Shots 1');
  await expect(page.locator('#encounter-readiness')).toContainText('Cooling down');
  if (process.env.HIRED_GUNS_UX_SCREENSHOTS) for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/shot-${width}.png`, fullPage: true });
  }
  await page.keyboard.press('f'); await expect(page.locator('#encounter-feedback')).toContainText('Shot blocked: cooling down');
  await page.clock.runFor(1000); await page.keyboard.press('t'); await page.keyboard.press('f');
  await expect(page.locator('#encounter-feedback')).toContainText('damage 0');
  await expect(page.locator('#encounter-status')).toContainText('Target miss');
  await page.keyboard.press('Escape');
  const download = page.waitForEvent('download'); await page.locator('#save-checkpoint').click();
  const json = await readFile((await (await download).path())!, 'utf8');
  await page.keyboard.press('r'); await expect(page.locator('#encounter-feedback')).toContainText('loadout reset');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
  await expect(page.locator('#encounter-feedback')).toContainText('No action observed');
  await expect(page.locator('#encounter-status')).toContainText('Shots 2');
  await page.getByLabel('Authored ammo fixture').selectOption('empty');
  await page.getByRole('button', { name: 'Arm authored encounter', exact: true }).click();
  await page.locator('#play').click(); await page.keyboard.press('f');
  await expect(page.locator('#encounter-feedback')).toContainText('Shot blocked: empty magazine');
  await page.keyboard.press('Escape');
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#encounter-feedback')).toBeVisible();
    if (process.env.HIRED_GUNS_UX_SCREENSHOTS) await page.screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/combat-${width}.png`, fullPage: true });
  }
  await page.locator('#inventory-tools > summary').click();
  await expect(page.getByLabel('Carried slot for team slot 1')).toBeVisible();
  await page.locator('#roster-panel > summary').click();
  await expect(page.getByLabel('Known local Characters source')).toBeEnabled();
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const width of [1440, 375]) test.describe(`incapacitated encounter readiness ${width}px`, () => {
  test.use({ viewport: { width, height: 1000 }, isMobile: width === 375, hasTouch: width === 375 });
  test('live actor fall blocks guidance and buttons before F; reset, living actor and restore remain valid', async ({ page }) => {
    test.skip(process.env.HIRED_GUNS_PRESET_PROOF !== '1', 'Requires configured local originals.');
    const encounter = async () => JSON.parse((await page.locator('#encounter-snapshot').textContent())!);
    const save = async () => {
      const pending = page.waitForEvent('download'); await page.locator('#save-checkpoint').click();
      return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    };
    const fire = page.locator('[data-command=fire]'), arm = page.locator('[data-command=arm]');
    const readiness = page.locator('#encounter-readiness');
    await page.goto('/'); await page.locator('#local-test-preset').click();
    await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
    await page.locator('#selected-fall').click();
    await expect(page.locator('#level-name')).toContainText('Selected-team dry-fall');
    await page.getByLabel('Encounter actor', { exact: true }).selectOption('3'); await arm.click();
    await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
    const baseline = await save();
    await page.locator('#play').click();
    await expect(readiness).toContainText('RUNNING · Ready to fire'); await expect(fire).toBeEnabled();
    await page.keyboard.press('Digit4');
    // Release at the observed ledge exit even if a catch-up frame accepts another movement tick.
    await page.locator('#position-3').evaluate(position => {
      const observer = new MutationObserver(() => {
        if (position.textContent!.includes('Y 07')) {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true })); observer.disconnect();
        }
      });
      observer.observe(position, { childList: true, subtree: true });
    });
    await page.keyboard.down('w'); await page.clock.runFor(100); await page.keyboard.up('w');
    await expect(page.locator('#position-3')).toContainText('Y 07'); await page.clock.runFor(1800);
    await expect(page.locator('#dead-3')).toBeVisible();
    for (let i = 0; i < 3; i++) await expect(page.locator(`#dead-${i}`)).toBeHidden();
    await expect(page.locator('#run-state')).toHaveText('RUNNING');
    await expect(readiness).toContainText('RUNNING · Fire blocked: team slot 4 is incapacitated');
    await expect(readiness).not.toContainText('Ready to fire'); await expect(fire).toBeDisabled();
    await expect(fire).toHaveAttribute('aria-describedby', 'encounter-readiness');
    await expect(page.locator('#encounter-status')).toContainText('Outcome Actor incapacitated');
    await expect(page.getByText('Last observed action (history):', { exact: true })).toBeVisible();
    const before = await save(); await page.locator('#play').click(); await page.keyboard.press('f');
    await expect(page.locator('#error')).toContainText('Incapacitated actors cannot fire');
    expect(await save()).toEqual(before); // Includes actual actor health and unchanged ammo/dummy/shots.
    await page.keyboard.press('Escape'); await expect(readiness).toContainText('PAUSED · Fire blocked: team slot 4 is incapacitated');
    await expect(arm).toBeDisabled(); await expect(page.locator('#encounter-arm-readiness')).toContainText('team slot 4 is incapacitated', { ignoreCase: true });
    // Dispatch only the button event to verify the existing command guard behind the disabled UI.
    await arm.dispatchEvent('click'); expect(await encounter()).toEqual(before.encounter);
    await expect(page.locator('#error')).toContainText('Incapacitated actors cannot fire');
    await expect(page.locator('[data-command=reset]')).toBeEnabled(); await page.keyboard.press('r');
    await expect(page.locator('#encounter-feedback')).toContainText('loadout reset');
    await expect(readiness).toContainText('it does not revive the actor'); await expect(fire).toBeDisabled();
    expect((await save()).checkpoint).toEqual(before.checkpoint);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.HIRED_GUNS_UX_SCREENSHOTS) await page.locator('#training-encounter').screenshot({ path: `${process.env.HIRED_GUNS_UX_SCREENSHOTS}/incapacitated-${width}.png` });
    await page.getByLabel('Encounter actor', { exact: true }).selectOption('0'); await expect(arm).toBeEnabled(); await arm.click();
    await expect(readiness).toContainText('PAUSED · Fire blocked. Start');
    await page.locator('#play').click(); await expect(readiness).toContainText('RUNNING · Ready to fire'); await expect(fire).toBeEnabled();
    await page.keyboard.press('f'); await expect(readiness).toContainText('Cooling down'); await expect(fire).toBeEnabled();
    await page.clock.runFor(1000); await expect(fire).toBeEnabled();
    await page.keyboard.press('Escape');
    await page.getByLabel('Authored ammo fixture').selectOption('empty'); await arm.click();
    await expect(readiness).toContainText('PAUSED · Fire blocked');
    await page.locator('#play').click(); await expect(readiness).toContainText('Empty magazine'); await expect(fire).toBeEnabled();
    await page.keyboard.press('Escape');
    await page.getByLabel('Load navigation checkpoint').setInputFiles({ name: 'before-fall.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(baseline)) });
    await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
    await expect(page.locator('#dead-3')).toBeHidden(); await expect(readiness).toContainText('PAUSED · Fire blocked. Start');
    await page.locator('#play').click(); await expect(readiness).toContainText('RUNNING · Ready to fire'); await expect(fire).toBeEnabled();
    await page.locator('canvas').evaluate(c => c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await expect(readiness).toContainText('Controls unavailable'); await expect(fire).toBeDisabled();
  });
});
