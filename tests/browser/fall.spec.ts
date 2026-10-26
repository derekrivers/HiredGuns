import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createFallDemo } from '../../src/demo';
import { createWorld, stepWorld } from '../../src/sim/world';
import { exportCheckpoint } from '../../src/sim/checkpoint';

async function leaveLedge(page: Page,id: number): Promise<void> {
  await page.keyboard.press(`Digit${id+1}`);
  await page.evaluate(id => {
    const position=document.getElementById(`position-${id}`)!;
    const release=()=>{window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));observer.disconnect();clearTimeout(timer);};
    const observer=new MutationObserver(()=>{if(position.textContent!.includes('Y 07')) release();});
    const timer=window.setTimeout(release,4000);
    observer.observe(position,{childList:true,subtree:true});
  },id);
  await page.keyboard.down('w');
  await expect(page.locator(`#position-${id}`)).toContainText('Y 07');
  await page.keyboard.up('w');
}

test('four falls show height-dependent fitness, incapacitation and retry', async ({page})=>{
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button',{name:'Dry fall drill',exact:true}).click();
  await page.getByRole('button',{name:'Start drill',exact:true}).click();
  for(let id=0;id<4;id++) await leaveLedge(page,id);
  for(const [id,fitness] of [80,60,21,0].entries()) {
    await expect(page.locator(`#position-${id}`)).toContainText('Z 01');
    await expect(page.locator(`#fitness-${id}`)).toHaveText(`FIT ${fitness}%`);
  }
  await expect(page.locator('#dead-3')).toBeVisible();
  const deadPosition=await page.locator('#position-3').textContent();
  const tick=Number((await page.locator('#tick').textContent())!.match(/tick (\d+)/)![1]);
  await page.keyboard.down('w');
  await page.waitForFunction(tick=>Number(document.getElementById('tick')!.textContent!.match(/tick (\d+)/)![1])>=tick+2,tick);
  await page.keyboard.up('w');
  await expect(page.locator('#position-3')).toHaveText(deadPosition!);
  await page.screenshot({path:'test-results/dry-fall-injury.png'});
  await page.getByRole('button',{name:'Retry drill',exact:true}).click();
  for(let id=0;id<4;id++) {
    await expect(page.locator(`#fitness-${id}`)).toHaveText('FIT 100%');
    await expect(page.locator(`#dead-${id}`)).toBeHidden();
    await expect(page.locator(`#position-${id}`)).toContainText('Y 08');
  }
  await expect(page.locator('#error')).toBeEmpty();expect(errors).toEqual([]);
});

test('an actual mid-fall download restores damage/cadence and continues to the same landing', async ({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Dry fall drill',exact:true}).click();
  // Click the production Save button on the first falling HUD update. Releasing
  // and saving in-page avoids protocol latency racing through the short fall.
  await page.evaluate(()=>{
    const position=document.getElementById('position-3')!;
    const observer=new MutationObserver(()=>{
      if(position.textContent!.includes('Y 07') && position.textContent!.includes('Z 06')) {
        observer.disconnect();clearTimeout(timer);document.getElementById('save-checkpoint')!.click();
      }
    });
    const timer=window.setTimeout(()=>observer.disconnect(),5000);
    observer.observe(position,{childList:true,subtree:true});
  });
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Start drill',exact:true}).click();
  await leaveLedge(page,3);
  const download=await downloadPromise;
  const saved=await readFile((await download.path())!,'utf8'), state=JSON.parse(saved);
  expect(state.version).toBe(3);
  expect(state.world.mercenaries[3].z).toBe(6);
  expect(state.world.physics.actors[3].fallDamage).toBe(6400);
  expect(state.world.physics.actors[3].fitness).toBe(65535);
  await page.getByRole('button',{name:'Retry drill',exact:true}).click();
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'mid-fall.json',mimeType:'application/json',buffer:Buffer.from(saved)});
  await expect(page.locator('#recovery-status')).toContainText('restored');
  await expect(page.locator('#position-3')).toContainText('Z 06');
  await page.getByRole('button',{name:'Start drill',exact:true}).click();
  await expect(page.locator('#dead-3')).toBeVisible();
  await expect(page.locator('#fitness-3')).toHaveText('FIT 0%');
  await expect(page.locator('#error')).toBeEmpty();
});

test('a low-fitness checkpoint reaches recoverable all-dead failure', async ({page})=>{
  const level=createFallDemo();
  let world=stepWorld(level,createWorld(level),[0,1,2,3].map(mercenaryId=>({mercenaryId,action:'forward'}))).world;
  while(world.tick<13) world=stepWorld(level,world,[]).world;
  if(world.physics.mode!=='dry-fall') throw new Error('Expected dry profile');
  // Authored low-fitness boundary fixture, not an original-character playthrough.
  for(const actor of world.physics.actors) actor.fitness=735;
  const saved=await exportCheckpoint(level,world);
  await page.goto('/');
  await page.getByRole('button',{name:'Dry fall drill',exact:true}).click();
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'injured.json',mimeType:'application/json',buffer:Buffer.from(saved)});
  await expect(page.locator('#recovery-status')).toContainText('restored');
  await page.getByRole('button',{name:'Start drill',exact:true}).click();
  await expect(page.locator('#pause-overlay')).toContainText('TEAM INCAPACITATED');
  await expect(page.getByRole('button',{name:'Drill finished',exact:true})).toBeDisabled();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save checkpoint'}).click();
  const download=await downloadPromise;
  const failed=await readFile((await download.path())!,'utf8');
  await page.getByRole('button',{name:'Retry drill',exact:true}).click();
  await expect(page.locator('#fitness-0')).toHaveText('FIT 100%');
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'failed.json',mimeType:'application/json',buffer:Buffer.from(failed)});
  await expect(page.getByRole('button',{name:'Drill finished',exact:true})).toBeDisabled();
  await expect(page.locator('#pause-overlay')).toContainText('TEAM INCAPACITATED');
});
