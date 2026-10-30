import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function open(page:Page){await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');await page.locator('#selected-fall').click();await expect(page.locator('#level-name')).toContainText('Selected-team');await page.locator('#consumable-setup').focus();await page.keyboard.press('Enter');await expect(page.locator('#consumable-feedback')).toContainText('installed');}
async function save(page:Page){const download=page.waitForEvent('download');await page.locator('#save-checkpoint').click();return JSON.parse(await readFile((await (await download).path())!,'utf8'));}
async function restore(page:Page,value:unknown){await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'consumable.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');}
async function land(page:Page,actor:number){await key(page,String(actor+1));await page.locator('#play').click();await page.keyboard.down('w');await page.clock.runFor(40);await page.keyboard.up('w');await page.clock.runFor(1800);await key(page,'Escape');}
async function equip(page:Page,actor:number,id:number){await page.locator('#inventory-tools').evaluate((e:HTMLDetailsElement)=>{e.open=true;});const select=page.getByLabel(`Carried slot for team slot ${actor+1}`,{exact:true});const value=await select.locator('option').evaluateAll((es,id)=>{const e=es.find(e=>e.textContent!.match(new RegExp(`^\\d+: ${id}:`))) as HTMLOptionElement|undefined;if(!e)throw Error('Missing source item '+id);return e.value;},id);await select.selectOption(value);await page.getByRole('button',{name:`Equip for team slot ${actor+1}`,exact:true}).click();await expect(page.locator(`#inventory-status-${actor}`)).toContainText(`Equipped: ${id}:`);}

test('consumable extension requires selected verified team',async({page})=>{await page.clock.install();await page.goto('/');await expect(page.locator('#consumable-setup')).toBeDisabled();await expect(page.locator('#consumable-use')).toBeDisabled();});
for(const [actor,id] of [[0,66],[2,62]] as const)test(`keyboard injured live slot ${actor+1} uses source item ${id}, weight/health/recovery/continuation/retry`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);const baseline=await save(page);expect(baseline.version).toBe(14);
 await land(page,actor);let before=await save(page),world=JSON.parse(before.checkpoint).world;expect(world.physics.actors[actor].fitness).toBeLessThan(65535);expect(world.physics.actors[actor].dead).toBe(false);expect(world.physics.actors[actor].fallDamage).toBe(0);
 await expect(page.locator('#inventory-budget')).toContainText('Shared chronological');await equip(page,actor,id);before=await save(page);world=JSON.parse(before.checkpoint).world;await key(page,'h');await expect(page.locator('#consumable-receipt')).toContainText(`item ${id} consumed`);const used=await save(page),after=JSON.parse(used.checkpoint).world;
 expect(after.physics.actors[actor].fitness).toBeGreaterThan(world.physics.actors[actor].fitness);expect(after.physics.actors[actor].weight).toBeLessThan(world.physics.actors[actor].weight);await expect(page.locator(`#inventory-status-${actor}`)).toContainText('Equipped: Empty');await expect(page.locator('#pause-overlay')).toBeVisible();await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Empty');expect(await save(page)).toEqual(used);
 await page.locator('#reset').click();expect(await save(page)).toEqual(baseline);await restore(page,used);expect(await save(page)).toEqual(used);await expect(page.locator('#pause-overlay')).toBeVisible();await page.locator('#play').click();await page.keyboard.down('a');await page.clock.runFor(40);await page.keyboard.up('a');await page.clock.runFor(200);await key(page,'Escape');const continued=await save(page);expect(JSON.parse(continued.checkpoint).world.tick).toBeGreaterThan(after.tick);await restore(page,continued);expect(await save(page)).toEqual(continued);
 const bad=structuredClone(continued),w=JSON.parse(bad.checkpoint);w.world.physics.actors[actor].fitness--;bad.checkpoint=JSON.stringify(w);await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await save(page)).toEqual(continued);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.local/repair112/consumable-slot${actor+1}-narrow.png`,fullPage:true});expect(errors).toEqual([]);
});
test('medical, unsupported category, running, pending and dead refusal without consumption',async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);await equip(page,1,64);await key(page,'2');await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Medical');
 await key(page,'1');await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Empty');await equip(page,0,5);await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Unsupported category');await page.locator('#play').click();await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('PAUSED');
 await page.keyboard.down('w');await page.clock.runFor(40);await page.keyboard.up('w');await key(page,'Escape');await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Pending');await page.locator('#play').click();await page.clock.runFor(1800);await key(page,'Escape');
 await land(page,3);await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Incapacitated');await expect(page.locator('#dead-3')).toBeVisible();
 // Text inputs/selects keep H and the original U/O keyboard group.
 await page.getByLabel('Consumable actor').focus();await page.keyboard.press('h');await expect(page.locator('#consumable-feedback')).toContainText('Incapacitated');
});
for(const operation of ['setup','use','restore'] as const)for(const cancel of ['retry','selection','source-clear','new-apply','mode'] as const)test(`${operation} cancels atomically on ${cancel}`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);if(operation==='setup'){await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#selected-fall').click();}if(operation==='use')await equip(page,0,66);const saved=await save(page),priorFeedback=await page.locator('#consumable-feedback').textContent();
 await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {waiting:boolean;release:()=>void};w.waiting=true;await new Promise<void>(r=>{w.release=r;});return digest.call(this,...args);};});
 if(operation==='setup')await page.locator('#consumable-setup').click();else if(operation==='use')await key(page,'h');else await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {waiting:boolean}).waiting)).toBe(true);
 if(cancel==='retry')await page.locator('#reset').click();
 if(cancel==='mode')await page.locator('#demo').click();
 if(cancel==='selection'||cancel==='source-clear'){await page.locator('#roster-panel > summary').click();if(cancel==='selection')await page.getByLabel('Character for team slot 1').selectOption('1');else await page.locator('#items-clear').click();}
 if(cancel==='new-apply')await page.locator('#local-test-preset').click();
 await page.evaluate(()=>(window as unknown as {release:()=>void}).release());
 // A superseded completion must not publish a cancellation over current guidance.
 if(operation==='setup')expect(await page.locator('#consumable-feedback').textContent()).toBe(priorFeedback);
 if(cancel==='retry'){await expect(page.locator('#pause-overlay')).toBeVisible();const now=await save(page);expect(JSON.parse(now.checkpoint).world.tick).toBe(0);if(operation==='use')expect(now.history).toEqual([]);}
 else if(cancel==='mode')await expect(page.locator('#level-name')).toHaveText('Navigation proving ground');
 else if(cancel==='new-apply')await expect(page.locator('#local-test-status')).toContainText('Ready:');
 else if(cancel==='source-clear')await expect(page.locator('#session-status')).toHaveText('No active selected-team session.');
 else {await expect(page.locator('#pause-overlay')).toBeVisible();expect(await save(page)).toEqual(saved);}
});

test('older delayed setup cannot overwrite newer consumable setup feedback',async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#selected-fall').click();
 await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {waiting:boolean;release:()=>void};w.waiting=true;await new Promise<void>(r=>{w.release=r;});return digest.call(this,...args);};});
 await page.locator('#consumable-setup').click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {waiting:boolean}).waiting)).toBe(true);await page.locator('#reset').click();await page.locator('#consumable-setup').click();await expect(page.locator('#consumable-feedback')).toContainText('installed');const saved=await save(page);await page.evaluate(()=>(window as unknown as {release:()=>void}).release());await page.clock.runFor(100);expect(await save(page)).toEqual(saved);await expect(page.locator('#consumable-feedback')).toContainText('installed');
});

async function presentedState(page:Page){return page.locator('#door-snapshot, #training-inventory pre, #session-status, #consumable-receipt').allTextContents();}
// Hold a real digest result at a chosen verification boundary, without changing source data.
async function holdDigest(page:Page,phase:number,reject:boolean){
 await page.evaluate(({phase,reject})=>{
  (window as unknown as {held:boolean}).held=false;const original=SubtleCrypto.prototype.digest;let count=0;
  SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){
   const result=await original.call(this,...args);
   if(++count===phase){SubtleCrypto.prototype.digest=original;const w=window as unknown as {held:boolean;release:()=>void};w.held=true;await new Promise<void>(r=>{w.release=r;});if(reject)throw Error('REPAIR_DIGEST_FAILURE');}
   return result;
  };
 },{phase,reject});
}
async function held(page:Page){await expect.poll(()=>page.evaluate(()=>(window as unknown as {held:boolean}).held)).toBe(true);}
async function releaseCompletion(page:Page){
 // refresh writes this node even when its text is unchanged. Observe the actual
 // panel continuation, rather than guessing how long verification will take.
 await page.evaluate(()=>{const w=window as unknown as {release:()=>void;presented:boolean};w.presented=false;const observer=new MutationObserver(()=>{w.presented=true;observer.disconnect();});observer.observe(document.querySelector('#consumable-status')!,{childList:true});w.release();});
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {presented:boolean}).presented)).toBe(true);
}
async function cancelConsumable(page:Page,cancel:string){
 if(cancel==='retry')await page.locator('#reset').click();
 else if(cancel==='mode')await page.locator('#demo').click();
 else if(cancel==='selection'||cancel==='source-clear'){await page.locator('#roster-panel').evaluate((e:HTMLDetailsElement)=>{e.open=true;});if(cancel==='selection')await page.getByLabel('Character for team slot 1').selectOption('1');else await page.locator('#items-clear').click();}
 else {await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');}
}
for(const operation of ['setup','use'] as const)for(const phase of [1,7])for(const reject of [false,true])for(const cancel of ['retry','selection','source-clear','new-apply','mode'])test(`presentation generation ${operation} phase ${phase} ${reject?'reject':'resolve'} after ${cancel}`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);
 if(operation==='setup'){await cancelConsumable(page,'new-apply');await page.locator('#selected-fall').click();}else await equip(page,0,66);
 await holdDigest(page,phase,reject);if(operation==='setup')await page.locator('#consumable-setup').click();else await key(page,'h');await held(page);
 await cancelConsumable(page,cancel);const feedback=await page.locator('#consumable-feedback').textContent(),status=await page.locator('#consumable-status').textContent(),ready=await page.locator('#local-test-status').textContent();
 const snapshot=await presentedState(page);
 await releaseCompletion(page);
 expect(await page.locator('#consumable-feedback').textContent()).toBe(feedback);expect(await page.locator('#consumable-status').textContent()).toBe(status);expect(await page.locator('#local-test-status').textContent()).toBe(ready);
 await expect(page.locator('#pause-overlay')).toBeVisible();expect(await presentedState(page)).toEqual(snapshot);
 if(cancel==='new-apply')await expect(page.locator('#play')).toBeFocused();
});
for(const reject of [false,true])test(`natural empty use ${reject?'digest rejection':'ordinary refusal'} after newer ready`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);await holdDigest(page,1,reject);await key(page,'h');await held(page);await cancelConsumable(page,'new-apply');const before=await presentedState(page),feedback=await page.locator('#consumable-feedback').textContent();await releaseCompletion(page);expect(await page.locator('#consumable-feedback').textContent()).toBe(feedback);expect(await presentedState(page)).toEqual(before);await expect(page.locator('#consumable-status')).toContainText('Inactive');await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
});
for(const operation of ['setup','use'] as const)for(const reject of [false,true])for(const next of ['consumable','door','pending'])test(`older ${operation} ${reject?'reject':'resolve'} preserves newer ${next}`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);if(operation==='setup'){await cancelConsumable(page,'new-apply');await page.locator('#selected-fall').click();}else await equip(page,0,66);
 await holdDigest(page,1,reject);if(operation==='setup')await page.locator('#consumable-setup').click();else await key(page,'h');await held(page);
 // Save the old release before installing a second independent digest gate.
 await page.evaluate(()=>{const w=window as unknown as {release:()=>void;oldRelease:()=>void};w.oldRelease=w.release;});
 await cancelConsumable(page,'new-apply');
 if(next==='door'){await page.locator('#author-moving-door').click();await expect(page.locator('#door-feedback')).toContainText('ready');}
 else {await page.locator('#selected-fall').click();if(next==='pending')await holdDigest(page,1,false);await page.locator('#consumable-setup').click();if(next==='pending')await held(page);else await expect(page.locator('#consumable-feedback')).toContainText('installed');}
 const feedback=await page.locator('#consumable-feedback').textContent(),door=await page.locator('#door-feedback').textContent();const snapshot=await presentedState(page);
 await page.evaluate(()=>{const w=window as unknown as {release:()=>void;oldRelease:()=>void;newRelease:()=>void};w.newRelease=w.release;w.release=w.oldRelease;});await releaseCompletion(page);
 expect(await page.locator('#consumable-feedback').textContent()).toBe(feedback);expect(await page.locator('#door-feedback').textContent()).toBe(door);
 if(next==='pending'){await expect(page.locator('#consumable-setup')).toBeDisabled();await expect(page.locator('#consumable-use')).toBeDisabled();await page.evaluate(()=>(window as unknown as {newRelease:()=>void}).newRelease());await expect(page.locator('#consumable-feedback')).toContainText('installed');await expect(page.locator('#consumable-use')).toBeEnabled();}
 else expect(await presentedState(page)).toEqual(snapshot);await expect(page.locator('#pause-overlay')).toBeVisible();
});
for(const operation of ['setup','use'] as const)test(`current ${operation} digest error is visible, atomic and retryable`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);if(operation==='setup'){await cancelConsumable(page,'new-apply');await page.locator('#selected-fall').click();}const baseline=await save(page);await holdDigest(page,1,true);if(operation==='setup')await page.locator('#consumable-setup').click();else await key(page,'h');await held(page);await releaseCompletion(page);await expect(page.locator('#consumable-feedback')).toContainText('REPAIR_DIGEST_FAILURE');expect(await save(page)).toEqual(baseline);
 if(operation==='setup'){await page.locator('#consumable-setup').focus();await page.keyboard.press('Enter');await expect(page.locator('#consumable-feedback')).toContainText('installed');}else{await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Empty equipment');expect(await save(page)).toEqual(baseline);await equip(page,0,66);await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Item used');}await expect(page.locator('#pause-overlay')).toBeVisible();
});

for(const operation of ['setup','use'] as const)test(`cancel ${operation} between installation and presentation microtasks`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);if(operation==='setup'){await cancelConsumable(page,'new-apply');await page.locator('#selected-fall').click();await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Start the consumable extension first');}else await equip(page,0,66);
 const feedback=await page.locator('#consumable-feedback').textContent();await page.evaluate(operation=>{
  const observer=new MutationObserver(()=>{
   const installed=operation==='setup'?document.querySelector('#recovery-status')!.textContent!.includes('Consumable extension installed'):document.querySelector('#consumable-receipt')!.textContent!.includes('consumed');
   if(installed){observer.disconnect();(document.querySelector('#demo') as HTMLButtonElement).click();}
  });observer.observe(document.querySelector(operation==='setup'?'#recovery-status':'#consumable-receipt')!,{childList:true});
 },operation);
 if(operation==='setup')await page.locator('#consumable-setup').click();else await key(page,'h');
 await expect(page.locator('#level-name')).toHaveText('Navigation proving ground');await expect(page.locator('#consumable-status')).toContainText('Inactive');expect(await page.locator('#consumable-feedback').textContent()).toBe(feedback);await expect(page.locator('#pause-overlay')).toBeVisible();
});
for(const phase of [14])for(const reject of [false,true])test(`last use verification phase ${phase} ${reject?'reject':'resolve'} after ready`,async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);await equip(page,0,66);await holdDigest(page,phase,reject);await key(page,'h');await held(page);await cancelConsumable(page,'new-apply');const baseline=await presentedState(page),feedback=await page.locator('#consumable-feedback').textContent();await releaseCompletion(page);expect(await page.locator('#consumable-feedback').textContent()).toBe(feedback);expect(await presentedState(page)).toEqual(baseline);
});
test('early use guard cannot unlock a pending newer setup',async({page})=>{
 test.skip(!enabled,'Private source inputs required');await open(page);await cancelConsumable(page,'new-apply');await page.locator('#selected-fall').click();await holdDigest(page,1,false);await page.locator('#consumable-setup').click();await held(page);await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('not ready');await expect(page.locator('#consumable-use')).toBeDisabled();await expect(page.locator('#consumable-setup')).toBeDisabled();await releaseCompletion(page);await expect(page.locator('#consumable-status')).toContainText('PAUSED');await expect(page.locator('#consumable-use')).toBeEnabled();await key(page,'h');await expect(page.locator('#consumable-feedback')).toContainText('Empty equipment');
});
