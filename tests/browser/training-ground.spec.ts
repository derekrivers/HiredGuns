import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
const upload=(s:unknown)=>({name:'ground.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
async function state(page:Page){return JSON.parse((await page.locator('#ground-snapshot').textContent())!);}
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function save(page:Page){const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();return JSON.parse(await readFile((await (await pending).path())!,'utf8'));}
async function open(page:Page){await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#author-ground').click();await expect(page.locator('#ground-status')).toContainText('At cache');}
test('ground actions remain unavailable without a selected team',async({page})=>{await page.goto('/');await expect(page.locator('#training-ground')).toBeHidden();await key(page,'g');await expect(page.locator('#error')).toBeEmpty();});
test('opt-in production preset and keyboard ownership, stow, carried, interleaved inventory/encounter, save/retry/restore',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);const baseline=await state(page),slots=baseline.ground.slots;
 const owned=(s:typeof baseline)=>[...s.ground.slots.map((s:{entry:{itemId:number;rawHex:string}})=>s.entry),...s.actors.flatMap((a:{inventory:{equipped:unknown;carried:unknown[]}})=>[a.inventory.equipped,...a.inventory.carried])].filter((s:{itemId:number})=>s.itemId).map((s:{rawHex:string})=>s.rawHex).sort();
 await key(page,'g');await expect(page.locator('#ground-feedback')).toContainText('pickup-equipment complete');let first=await state(page);expect(first.actors[0].inventory.equipped).toEqual(slots[0].entry);expect(owned(first)).toEqual(owned(baseline));
 await key(page,'g');await expect(page.locator('#ground-feedback')).toContainText('Nothing to pick up');expect(await state(page)).toEqual(first);
 await page.getByLabel('Ground slot',{exact:true}).selectOption(slots[1].id);await key(page,'g');await expect(page.locator('#ground-feedback')).toContainText('pickup-equipment complete');first=await state(page);expect(first.actors[0].inventory.carried[0]).toEqual(slots[0].entry);
 await page.getByLabel('Ground slot',{exact:true}).selectOption(slots[2].id);await key(page,'b');await expect(page.locator('#ground-feedback')).toContainText('pickup-carried complete');expect(owned(await state(page))).toEqual(owned(baseline));
 await page.locator('#inventory-tools > summary').click();await page.getByLabel('Carried slot for team slot 1').selectOption('0');await page.getByRole('button',{name:'Exchange equipment for team slot 1',exact:true}).click();await expect(page.locator('#recovery-status')).toContainText('Exchanged');
 await page.getByLabel('Ground slot',{exact:true}).selectOption(slots[0].id);await key(page,'v');await expect(page.locator('#ground-feedback')).toContainText('drop-equipment complete');
 await page.getByRole('button',{name:'Start mission',exact:true}).click();await key(page,'f');await key(page,'Escape');
 const saved=await save(page);expect(saved.version).toBe(8);expect(saved.encounter.shots).toBe(1);const final=await state(page);expect(owned(final)).toEqual(owned(baseline));
 await page.getByRole('button',{name:'Retry mission',exact:true}).click();expect((await state(page)).actors).toEqual(baseline.actors);
 await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');expect(await state(page)).toEqual(final);expect(await save(page)).toEqual(saved);
 for(const mutate of [(s:typeof saved)=>{s.ground.fixture='bad';},(s:typeof saved)=>{s.ground.history[0].actor=1;},(s:typeof saved)=>{s.sources.items.sha256='0'.repeat(64);},(s:typeof saved)=>{s.ground.extra=1;}]){const bad=structuredClone(saved);mutate(bad);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(bad));await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await state(page)).toEqual(final);}
 await key(page,'2');await key(page,'g');await expect(page.locator('#ground-feedback')).toContainText('Move the active actor');expect(owned(await state(page))).toEqual(owned(baseline));
 await page.screenshot({path:'.local/ground-browser.png',fullPage:true});expect(errors).toEqual([]);
});

test('opt-in physical capacity, deterministic movement near/away, cancelled candidate and new Apply reset',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);await open(page);
 const baseline=await state(page),slots=baseline.ground.slots;
 for(const slot of slots.slice(0,30)){await page.getByLabel('Ground slot',{exact:true}).selectOption(slot.id);await key(page,'b');await expect(page.locator('#ground-feedback')).toContainText('pickup-carried complete');}
 expect((await state(page)).actors[0].inventory.carried.filter((s:{itemId:number})=>s.itemId)).toHaveLength(30);
 await page.getByLabel('Ground slot',{exact:true}).selectOption(slots[30].id);const full=await state(page);await key(page,'b');await expect(page.locator('#ground-feedback')).toContainText('Backpack full');expect(await state(page)).toEqual(full);
 await key(page,'g');await expect(page.locator('#ground-feedback')).toContainText('pickup-equipment complete');const equipped=await state(page);
 await page.getByLabel('Ground slot',{exact:true}).selectOption(slots[31].id);await key(page,'g');await expect(page.locator('#ground-feedback')).toContainText('Backpack full');expect(await state(page)).toEqual(equipped);
 const saved=await save(page);await page.getByRole('button',{name:'Retry mission',exact:true}).click();expect((await state(page)).actors).toEqual(baseline.actors);
 // Hold map hashing while the complete replacement is being prepared, then invalidate it.
 await page.evaluate(()=>{const original=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(args[1].byteLength<100000)return original.call(this,...args);SubtleCrypto.prototype.digest=original;const w=window as unknown as {groundWaiting:boolean;releaseGround:()=>void};w.groundWaiting=true;await new Promise<void>(r=>{w.releaseGround=r;});return original.call(this,...args);};});
 await page.getByLabel('Ground slot',{exact:true}).selectOption(slots[0].id);await key(page,'g');await expect.poll(()=>page.evaluate(()=>(window as unknown as {groundWaiting:boolean}).groundWaiting)).toBe(true);
 await page.getByRole('button',{name:'Retry mission',exact:true}).click();await page.evaluate(()=>(window as unknown as {releaseGround:()=>void}).releaseGround());await expect(page.locator('#ground-feedback')).toContainText('Cancelled');expect((await state(page)).actors).toEqual(baseline.actors);
 await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(saved));await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');expect((await state(page)).actors).toEqual(equipped.actors);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 let moved=false;
 for(const movement of ['w','a','d','s']){await page.getByRole('button',{name:'Start mission',exact:true}).click();await page.locator('h1').click();await page.keyboard.down(movement);await page.clock.runFor(40);await page.keyboard.up(movement);await page.keyboard.press('Escape');if((await page.locator('#ground-status').textContent())!.includes('Away:')){moved=true;break;}}
 expect(moved).toBe(true);const away=await state(page);await key(page,'v');await expect(page.locator('#ground-feedback')).toContainText('Move the active actor');expect((await state(page)).actors).toEqual(away.actors);
 const awaySave=await save(page);await page.getByLabel('Load navigation checkpoint').setInputFiles(upload(awaySave));await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
 await page.locator('#roster-panel > summary').click();await page.getByRole('button',{name:'Apply team to Training43',exact:true}).click();await expect(page.locator('#ground-status')).toContainText('No ground overlay');expect((await state(page)).ground).toBeNull();
});
