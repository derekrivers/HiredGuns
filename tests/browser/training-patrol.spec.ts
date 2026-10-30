import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
const upload=(value:unknown)=>({name:'patrol.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
async function state(page:Page){return JSON.parse((await page.locator('#patrol-snapshot').textContent())!);}
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function pulse(page:Page,k:string){await page.locator('h1').click();await page.keyboard.down(k);await page.clock.runFor(40);await page.keyboard.up(k);}
async function save(page:Page){const pending=page.waitForEvent('download');await page.locator('#save-checkpoint').click();return JSON.parse(await readFile((await (await pending).path())!,'utf8'));}
async function restore(page:Page,value:unknown){await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(value));await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');}
async function open(page:Page,patrol=true){
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');
  await page.locator('#author-gate').click();await expect(page.locator('#gate-status')).toContainText('CLOSED');
  if(patrol){await page.locator('#author-patrol').click();await expect(page.locator('#patrol-status')).toContainText('ACTIVE');}
}
async function delayDigest(page:Page){
  await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {patrolWaiting:boolean;releasePatrol:()=>void};w.patrolWaiting=true;await new Promise<void>(r=>{w.releasePatrol=r;});return digest.call(this,...args);};});
}
async function release(page:Page){await expect.poll(()=>page.evaluate(()=>(window as unknown as {patrolWaiting:boolean}).patrolWaiting)).toBe(true);await page.evaluate(()=>(window as unknown as {releasePatrol:()=>void}).releasePatrol());}

test('patrol requires the current gate scenario and a verified selected team',async({page})=>{
  await page.goto('/');await expect(page.locator('#training-patrol')).toBeHidden();
});
test('production keyboard gate/patrol occupancy, miss/ammo/defeat, pause/selection and complete v10 recovery',async({page})=>{
  test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
  const baseline=await state(page), closed=await save(page);expect(closed.version).toBe(10);
  await key(page,'f');await page.clock.runFor(1000);expect(await state(page)).toEqual(baseline);
  await page.locator('#play').click();await pulse(page,'d');await pulse(page,'w');await expect(page.locator('#event-0')).toContainText('BLOCKED');
  await page.clock.runFor(240);await expect(page.locator('#patrol-status')).toContainText('player');
  await restore(page,closed);await page.locator('#play').click();await page.clock.runFor(640);await key(page,'Escape');await expect(page.locator('#patrol-status')).toContainText('gate-or-wall');
  const closedMoving=await save(page), movingState=await state(page);await page.locator('#reset').click();expect(await state(page)).toEqual(baseline);await restore(page,closedMoving);expect(await state(page)).toEqual(movingState);
  await restore(page,closed);await page.locator('#play').click();await pulse(page,'c');await expect(page.locator('#gate-feedback')).toContainText('CLOSED → OPEN');
  await page.clock.runFor(320);expect((await state(page)).patrol.routeIndex).toBe(1);
  await pulse(page,'d');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:4,y:4});await expect(page.locator('#event-0')).toContainText('BLOCKED');
  await page.clock.runFor(240);expect((await state(page)).patrol.routeIndex).toBe(2);
  await key(page,'2');await pulse(page,'c');await expect(page.locator('#gate-feedback')).toContainText('occupied-target');
  await key(page,'Escape');const openPatrol=await save(page),openState=await state(page);await page.clock.runFor(1000);expect(await state(page)).toEqual(openState);
  await page.locator('#reset').click();await restore(page,openPatrol);expect(await state(page)).toEqual(openState);await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await expect(page.locator('[data-command="arm"]')).toBeDisabled();await expect(page.locator('[data-command="reset"]')).toBeDisabled();
  for(let i=0;i<2;i++){await page.locator('[data-command="target"]').click();await expect(page.locator('[data-command="arm"]')).toBeDisabled();await expect(page.locator('[data-command="reset"]')).toBeDisabled();}
  await key(page,'t');await page.locator('#play').click();const beforeMiss=await state(page);await key(page,'f');
  let shot=await state(page);expect(shot.encounter.fitness).toBe(beforeMiss.encounter.fitness);expect(shot.encounter.equipped.ammo).toBeLessThan(beforeMiss.encounter.equipped.ammo);
  await page.clock.runFor(1000);await key(page,'t');
  for(let i=0;i<4&&(await state(page)).encounter.fitness>0;i++){await key(page,'f');await page.clock.runFor(1000);}
  shot=await state(page);expect(shot.encounter.fitness).toBe(0);await expect(page.locator('#patrol-status')).toContainText('DEFEATED');
  const stopped=shot.patrol;await page.clock.runFor(1000);expect((await state(page)).patrol.routeIndex).toBe(stopped.routeIndex);expect((await state(page)).patrol.counter).toBe(stopped.counter);
  // The designated NPC is defeated; the same gate lane is now traversable.
  await key(page,'1');await pulse(page,'d');await pulse(page,'w');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:5,y:5});
  await key(page,'2');await pulse(page,'c');await expect(page.locator('#gate-feedback')).toContainText('occupied-target');await key(page,'Escape');
  await page.locator('#inventory-tools > summary').click();await page.getByLabel('Carried slot for team slot 1').selectOption('0');await page.getByRole('button',{name:'Equip for team slot 1',exact:true}).click();await expect(page.locator('#recovery-status')).toContainText('Equipped');
  const defeated=await save(page),final=await state(page);expect(defeated.commands).toHaveLength(1);await page.locator('#reset').click();expect(await state(page)).toEqual(baseline);await restore(page,defeated);expect(await state(page)).toEqual(final);expect(await save(page)).toEqual(defeated);
  await page.screenshot({path:'.local/patrol-production.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/patrol-narrow.png',fullPage:true});expect(errors).toEqual([]);
});
test('production v10 malformed/source/receipt/budget refusal is atomic and restores cancel on retry, source clear and mode switch',async({page})=>{
  test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);await open(page);await page.locator('#play').click();await pulse(page,'c');await page.clock.runFor(400);await key(page,'f');await key(page,'Escape');
  const saved=await save(page),before=await state(page);
  for(const mutate of [
    (s:typeof saved)=>{s.patrol.routeIndex++;},(s:typeof saved)=>{s.patrol.counter++;},(s:typeof saved)=>{s.patrol.direction=0;},
    (s:typeof saved)=>{s.patrol.route=[{x:5,y:5,z:1}];},(s:typeof saved)=>{s.patrol.position={x:2,y:2,z:1};},
    (s:typeof saved)=>{s.encounter.fitness++;},(s:typeof saved)=>{s.encounter.equipped.ammo++;},(s:typeof saved)=>{s.encounter.fireDuration++;},
    (s:typeof saved)=>{s.patrol.history=Array(129).fill({kind:'fire'});},(s:typeof saved)=>{s.patrol.history=[{kind:'wait',ticks:45000},{kind:'wait',ticks:1}];},
    (s:typeof saved)=>{s.patrol.history=s.patrol.history.filter((e:{kind:string})=>e.kind!=='fire');},(s:typeof saved)=>{s.gate.overlay.word++;},
    (s:typeof saved)=>{s.sources.roster.sha256='0'.repeat(64);},(s:typeof saved)=>{s.checkpoint=' '.repeat(16384);},
    (s:typeof saved)=>{const w=JSON.parse(s.checkpoint);w.world.mercenaries[0].x++;s.checkpoint=JSON.stringify(w);}
  ]){const bad=structuredClone(saved);mutate(bad);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(bad));await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await state(page)).toEqual(before);}
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'huge.json',mimeType:'application/json',buffer:Buffer.alloc(24576,32)});await expect(page.locator('#error')).toContainText('24');expect(await state(page)).toEqual(before);
  await page.locator('h1').click();for(let i=before.patrol.history.length;i<128;i++)await page.keyboard.press('t');const full=await state(page);await page.keyboard.press('t');await expect(page.locator('#error')).toContainText('Patrol history budget');expect(await state(page)).toEqual(full);
  await delayDigest(page);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await page.locator('#reset').click();await release(page);await expect(page.locator('#patrol-status')).toContainText('Health 100000');expect((await state(page)).patrol.history).toEqual([]);
  const retry=await state(page);await delayDigest(page);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await page.locator('#roster-panel > summary').click();await page.getByLabel('Character for team slot 1').selectOption('1');await release(page);expect(await state(page)).toEqual(retry);
  await delayDigest(page);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await page.locator('#items-clear').click();await release(page);await expect(page.locator('#training-patrol')).toBeHidden();await expect(page.locator('#level-name')).toContainText('Navigation proving ground');
  await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await expect(page.locator('#training-patrol')).toBeHidden();
  await page.locator('#author-gate').click();await page.locator('#author-patrol').click();await expect(page.locator('#patrol-status')).toContainText('ACTIVE');await page.locator('#demo').click();await expect(page.locator('#training-patrol')).toBeHidden();
});
test('production patrol setup cancels after newer retry; v9 gate restores remove patrol and new Apply clears it',async({page})=>{
  test.skip(!enabled,'Explicit private originals required');await open(page,false);const v9=await save(page);
  await delayDigest(page);await page.locator('#author-patrol').click();await page.locator('#reset').click();await release(page);await expect(page.locator('#patrol-feedback')).toContainText('Cancelled');expect(await state(page)).toBeNull();
  await page.locator('#author-patrol').click();await expect(page.locator('#patrol-status')).toContainText('ACTIVE');await restore(page,v9);expect(await state(page)).toBeNull();
  await page.locator('#author-patrol').click();await expect(page.locator('#patrol-status')).toContainText('ACTIVE');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await expect(page.locator('#training-patrol')).toBeHidden();
});
