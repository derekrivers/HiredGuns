import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
const upload=(s:unknown)=>({name:'gate.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
async function state(page:Page){return JSON.parse((await page.locator('#gate-snapshot').textContent())!);}
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function pulse(page:Page,k:string){await page.locator('h1').click();await page.keyboard.down(k);await page.clock.runFor(40);await page.keyboard.up(k);}
async function start(page:Page){await page.locator('#play').click();}
async function save(page:Page){const pending=page.waitForEvent('download');await page.locator('#save-checkpoint').click();return JSON.parse(await readFile((await (await pending).path())!,'utf8'));}
async function open(page:Page){
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');
  await page.locator('#author-gate').click();await expect(page.locator('#gate-status')).toContainText('CLOSED');
}
test('gate setup stays unavailable without a selected team',async({page})=>{
  await page.goto('/');await expect(page.locator('#training-gate')).toBeHidden();await key(page,'c');await expect(page.locator('#error')).toBeEmpty();
});
test('production keys block/open/walk through, protect occupancy, vacate/close/block; paused, held edge, selection and v9 item/encounter recovery',async({page})=>{
  test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
  const baseline=await state(page),closed=await save(page);expect(closed.version).toBe(9);
  await key(page,'c');expect((await state(page)).gate).toEqual(baseline.gate);await expect(page.locator('#gate-feedback')).toContainText('PAUSED');
  await start(page);await pulse(page,'d');await pulse(page,'w');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:4,y:5,z:1});await expect(page.locator('#event-0')).toContainText('BLOCKED');
  await pulse(page,'a');await pulse(page,'c');await expect(page.locator('#gate-feedback')).toContainText('CLOSED → OPEN');await expect(page.locator('#event-0')).toContainText('PANEL AHEAD');
  await pulse(page,'d');await pulse(page,'w');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:5,y:5,z:1});
  const occupied=(await state(page)).gate;await key(page,'2');await pulse(page,'c');await expect(page.locator('#gate-feedback')).toContainText('occupied-target');expect((await state(page)).gate.overlay).toEqual(occupied.overlay);expect((await state(page)).gate.panelWord).toBe(occupied.panelWord);
  await key(page,'1');await pulse(page,'w');expect((await state(page)).world.mercenaries[0].x).toBe(6);
  await key(page,'2');await pulse(page,'c');await expect(page.locator('#gate-feedback')).toContainText('OPEN → CLOSED');await key(page,'1');await pulse(page,'s');expect((await state(page)).world.mercenaries[0].x).toBe(6);await expect(page.locator('#event-0')).toContainText('BLOCKED');
  // A held key, repeated down and a pause/start boundary cannot toggle twice.
  await key(page,'2');await page.keyboard.down('c');await page.clock.runFor(40);await expect(page.locator('#gate-status')).toContainText('OPEN');
  await page.keyboard.down('c');await page.clock.runFor(200);await key(page,'Escape');await start(page);await page.keyboard.down('c');await page.clock.runFor(40);await page.keyboard.up('c');await expect(page.locator('#gate-status')).toContainText('OPEN');
  await key(page,'f');await key(page,'Escape');
  await page.locator('#inventory-tools > summary').click();await page.getByLabel('Carried slot for team slot 1').selectOption('0');await page.getByRole('button',{name:'Equip for team slot 1',exact:true}).click();await expect(page.locator('#recovery-status')).toContainText('Equipped');
  const openSave=await save(page),final=await state(page);expect(openSave.encounter.shots).toBe(1);expect(openSave.commands).toHaveLength(1);
  await page.locator('#reset').click();await expect(page.locator('#gate-status')).toContainText('CLOSED');expect((await state(page)).gate.history).toEqual([]);
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(openSave));await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');expect(await state(page)).toEqual(final);expect(await save(page)).toEqual(openSave);
  await start(page);await key(page,'1');await pulse(page,'s');expect((await state(page)).world.mercenaries[0].x).toBe(5);await key(page,'Escape');
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(closed));await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');expect((await state(page)).gate).toEqual(baseline.gate);await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await start(page);await pulse(page,'c');await pulse(page,'d');await pulse(page,'w');expect((await state(page)).world.mercenaries[0].x).toBe(5);await key(page,'Escape');
  await page.screenshot({path:'.local/gate-production.png',fullPage:true});expect(errors).toEqual([]);
});
test('production rejects tampered saves atomically, cancels asynchronous restore/setup, clears on source reset and preserves mode exclusion',async({page})=>{
  test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);await open(page);await start(page);await pulse(page,'c');await key(page,'Escape');
  const saved=await save(page),before=await state(page);
  for(const mutate of [(s:typeof saved)=>{s.gate.fixture='bad';},(s:typeof saved)=>{s.gate.panelWord++;},(s:typeof saved)=>{s.gate.overlay.word++;},(s:typeof saved)=>{s.gate.history[0].actor=2;},(s:typeof saved)=>{s.gate.history=Array(129).fill({kind:'wait',ticks:1});},(s:typeof saved)=>{s.sources.roster.sha256='0'.repeat(64);},(s:typeof saved)=>{s.commands=[{kind:'equip',actor:0,slot:0}];},(s:typeof saved)=>{const w=JSON.parse(s.checkpoint);w.world.mercenaries[0].x=7;s.checkpoint=JSON.stringify(w);}]){
    const bad=structuredClone(saved);mutate(bad);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(bad));await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await state(page)).toEqual(before);
  }
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'huge.json',mimeType:'application/json',buffer:Buffer.alloc(24576,32)});await expect(page.locator('#error')).toContainText('smaller than 24');expect(await state(page)).toEqual(before);
  await expect(page.locator('#author-ground')).toBeDisabled();await expect(page.locator('#selected-fall')).toBeDisabled();
  await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {gateWaiting:boolean;releaseGate:()=>void};w.gateWaiting=true;await new Promise<void>(r=>{w.releaseGate=r;});return digest.call(this,...args);};});
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await expect.poll(()=>page.evaluate(()=>(window as unknown as {gateWaiting:boolean}).gateWaiting)).toBe(true);
  await page.locator('#reset').click();await page.evaluate(()=>(window as unknown as {releaseGate:()=>void}).releaseGate());await page.clock.runFor(40);await expect(page.locator('#gate-status')).toContainText('CLOSED');expect((await state(page)).gate.history).toEqual([]);
  await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');expect((await state(page)).gate).toBeNull();await expect(page.locator('#author-gate')).toBeEnabled();
  // New setup is equally guarded against a later reset.
  await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {setupWaiting:boolean;releaseSetup:()=>void};w.setupWaiting=true;await new Promise<void>(r=>{w.releaseSetup=r;});return digest.call(this,...args);};});
  await page.locator('#author-gate').click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {setupWaiting:boolean}).setupWaiting)).toBe(true);await page.locator('#reset').click();await page.evaluate(()=>(window as unknown as {releaseSetup:()=>void}).releaseSetup());await expect(page.locator('#gate-feedback')).toContainText('Cancelled');expect((await state(page)).gate).toBeNull();
  await page.locator('#author-ground').click();await expect(page.locator('#ground-status')).toContainText('At cache');await expect(page.locator('#author-gate')).toBeDisabled();
});

test('production source clear cancels gate restore and removes the derived collision world; narrow controls fit',async({page})=>{
  test.skip(!enabled,'Explicit private originals required');await open(page);await start(page);await pulse(page,'c');await key(page,'Escape');const saved=await save(page);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'.local/gate-narrow.png',fullPage:true});
  await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {clearWaiting:boolean;releaseClear:()=>void};w.clearWaiting=true;await new Promise<void>(r=>{w.releaseClear=r;});return digest.call(this,...args);};});
  await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await expect.poll(()=>page.evaluate(()=>(window as unknown as {clearWaiting:boolean}).clearWaiting)).toBe(true);
  await page.locator('#roster-panel > summary').click();await page.locator('#items-clear').click();await page.evaluate(()=>(window as unknown as {releaseClear:()=>void}).releaseClear());
  await expect(page.locator('#training-gate')).toBeHidden();await expect(page.locator('#level-name')).toContainText('Navigation proving ground');expect((await save(page)).version).toBe(3);
  await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');expect((await state(page)).gate).toBeNull();
});
