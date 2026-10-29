import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { nextFallDamage, damageFitness } from '../../src/sim/health';
import { characterFixture } from '../helpers/character-fixture';

const privateProof = process.env.HIRED_GUNS_PRESET_PROOF === '1';
const upload = (value: unknown, name='practice.json') => ({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
async function save(page: Page) {
  const pending=page.waitForEvent('download'); await page.locator('#save-checkpoint').click();
  return JSON.parse(await readFile((await (await pending).path())!,'utf8'));
}
async function openPractice(page: Page) {
  await page.goto('/'); await page.locator('#local-test-preset').click();
  await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
  await page.locator('#selected-fall').click();
  await expect(page.locator('#level-name')).toHaveText('Selected-team dry-fall practice (authored)');
  await expect(page.locator('#pause-overlay')).toBeVisible();
}
async function leave(page: Page,id: number) {
  await page.keyboard.press(`Digit${id+1}`);
  await page.evaluate(id=>{
    const position=document.getElementById(`position-${id}`)!;
    const observer=new MutationObserver(()=>{if(position.textContent!.includes('Y 07')) {window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));observer.disconnect();}});
    observer.observe(position,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),4000);
  },id);
  await page.keyboard.down('w'); await expect(page.locator(`#position-${id}`)).toContainText('Y 07'); await page.keyboard.up('w');
}

test('selected practice requires a verified team; authored empty drill remains separate',async({page})=>{
  await page.goto('/'); await expect(page.locator('#selected-fall')).toBeDisabled();
  await page.locator('#fall').click(); await expect(page.locator('#selected-fall')).toBeDisabled();
  const saved=await save(page);expect(saved.version).toBe(3);expect(saved.world.physics.profileId).toBe('synthetic-empty-v1');
});

test('verified team falls on authored geometry with real weight, landing injury and paused v7 recovery',async({page})=>{
  test.skip(!privateProof,'Opt-in original sources remain ignored and outside public CI.');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await openPractice(page);
  const initial=await save(page), start=JSON.parse(initial.checkpoint);
  expect(initial.version).toBe(7);expect(initial.scenario).toBe('selected-dry-fall-v1');
  expect(initial.sources.map).toBe('authored:selected-dry-fall-v1');expect(initial.encounter.profile).toBe('isolated-authored-gun');
  expect(start.world.physics.profileId).toBe('selected-team-v1');
  expect(start.world.physics.actors.some((a:{weight:number;physique:number;agility:number})=>nextFallDamage(0,a)>nextFallDamage(0,{...a,weight:0}))).toBe(true);
  // Save through the production button at the first real descent, before the short fall ends.
  await page.evaluate(()=>{
    const position=document.getElementById('position-3')!;
    const observer=new MutationObserver(()=>{if(position.textContent!.includes('Y 07')&&position.textContent!.includes('Z 06')) {observer.disconnect();document.getElementById('save-checkpoint')!.click();}});
    observer.observe(position,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),5000);
  });
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Start drill',exact:true}).click();await leave(page,3);
  const mid=JSON.parse(await readFile((await (await pending).path())!,'utf8')), midWorld=JSON.parse(mid.checkpoint).world;
  expect(midWorld.mercenaries[3].z).toBe(6);
  expect(midWorld.physics.actors[3].fallDamage).toBe(nextFallDamage(0,start.world.physics.actors[3]));
  expect(midWorld.physics.actors[3].fitness).toBe(65535);
  await page.locator('#reset').click();await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(mid));
  await expect(page.locator('#recovery-status')).toContainText('restored');await expect(page.locator('#pause-overlay')).toBeVisible();
  expect(await save(page)).toEqual(mid);
  await page.getByRole('button',{name:'Start drill',exact:true}).click();await expect(page.locator('#dead-3')).toBeVisible();
  const pose=await page.locator('#position-3').textContent();await page.keyboard.press('Digit4');await page.keyboard.press('e');await expect(page.locator('#position-3')).toHaveText(pose!);
  for(let id=0;id<3;id++) await leave(page,id);
  for(let id=0;id<4;id++) {
    const actor=start.world.physics.actors[id];let hit=0;
    for(let n=0;n<start.world.mercenaries[id].z-1;n++)hit=nextFallDamage(hit,actor);
    const fitness=damageFitness(65535,actor.physique,hit).fitness;
    await expect(page.locator(`#fitness-${id}`)).toContainText(` · ${fitness} · FALL 0 · WT ${actor.weight}`);
  }
  await page.keyboard.press('Escape');const landed=await save(page);
  expect(landed.commands).toEqual(initial.commands);expect(landed.encounter.equipped).toEqual(initial.encounter.equipped);
  await page.screenshot({path:'test-results/selected-fall-private.png'});
  const invalid=structuredClone(landed), state=JSON.parse(invalid.checkpoint);state.world.physics.actors[0].weight++;invalid.checkpoint=JSON.stringify(state);
  for(const bad of [invalid,{...landed,sources:{...landed.sources,roster:{...landed.sources.roster,sha256:'0'.repeat(64)}}},' '.repeat(24576)]) {
    await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(bad));await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await save(page)).toEqual(landed);
  }
  await page.locator('#reset').click();expect(await save(page)).toEqual(initial);
  expect(errors).toEqual([]);
});

test('practice exhaustion, retry, delayed restore cancellation and source replacement remain atomic',async({page})=>{
  test.skip(!privateProof,'Opt-in private sources required.');
  await openPractice(page);const initial=await save(page);
  await page.getByRole('button',{name:'Start drill',exact:true}).click();
  for(let id=0;id<4;id++)await leave(page,id);
  await expect(page.locator('#dead-3')).toBeVisible();await page.keyboard.press('Escape');const landed=await save(page);
  // An explicitly authored injured boundary fixture exercises all-team exhaustion.
  const injured=structuredClone(initial), state=JSON.parse(injured.checkpoint), actual=JSON.parse(landed.checkpoint);
  state.world.tick=actual.world.tick;state.world.physics.fallCounter=actual.world.physics.fallCounter;
  for(const actor of state.world.physics.actors)actor.fitness=735;
  injured.checkpoint=JSON.stringify(state);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(injured));await expect(page.locator('#recovery-status')).toContainText('restored');
  await page.getByRole('button',{name:'Start drill',exact:true}).click();for(let id=0;id<4;id++)await leave(page,id);
  await expect(page.locator('#pause-overlay')).toContainText('TEAM INCAPACITATED');await expect(page.locator('#play')).toBeDisabled();
  const exhausted=await save(page);await page.locator('#reset').click();expect(await save(page)).toEqual(initial);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(exhausted));await expect(page.locator('#pause-overlay')).toContainText('TEAM INCAPACITATED');
  await page.evaluate(()=>{
    const original=File.prototype.text;
    File.prototype.text=async function(){if(this.name!=='held.json')return original.call(this);File.prototype.text=original;
      (window as unknown as {waiting:boolean}).waiting=true;await new Promise<void>(resolve=>{(window as unknown as {release:()=>void}).release=resolve;});return original.call(this);};
  });
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(landed,'held.json'));
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {waiting:boolean}).waiting)).toBe(true);
  await page.locator('#reset').click();await page.evaluate(()=>(window as unknown as {release:()=>void}).release());
  expect(await save(page)).toEqual(initial);
  await page.locator('#roster-panel summary').click();
  await page.getByLabel('Open local Characters data').setInputFiles({name:'unverified.raw',mimeType:'application/octet-stream',buffer:Buffer.from(characterFixture())});
  await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
  await expect(page.locator('#selected-fall')).toBeDisabled();await expect(page.locator('#level-name')).toHaveText('Navigation proving ground');
});
