import {replayTrainingPatrol} from '../../src/world/training-patrol';
import {createTrainingSession,createMovingDoorSession,advanceGateTrainingSession,commandPatrolEncounter,exportTrainingSession} from '../../src/sim/training-session';
import {createMovingDoorLevel} from '../../src/world/training-gate';
import type {PlayerCommand} from '../../src/contracts';
import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
async function state(page:Page) {return JSON.parse((await page.locator('#door-snapshot').textContent())!);}
async function key(page:Page,k:string) {await page.locator('h1').click();await page.keyboard.press(k);}
async function pulse(page:Page,k:string) {await page.locator('h1').click();await page.keyboard.down(k);await page.clock.runFor(40);await page.keyboard.up(k);await page.clock.runFor(160);}
async function wait(page:Page,predicate:(s:Awaited<ReturnType<typeof state>>)=>boolean,max=1600) {for(let n=0;n<max;n+=40){if(predicate(await state(page)))return;await page.clock.runFor(40);}expect(predicate(await state(page))).toBe(true);}
async function nextTick(page:Page) {const tick=(await state(page)).world.tick;for(let i=0;i<80;i++){await page.clock.runFor(1);if((await state(page)).world.tick>tick)return;}throw Error('No accepted tick');}
async function open(page:Page) {await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#author-moving-door').click();await expect(page.locator('#door-status')).toContainText('CLOSED');}
async function save(page:Page) {const download=page.waitForEvent('download');await page.locator('#save-checkpoint').click();return JSON.parse(await readFile((await (await download).path())!,'utf8'));}
async function restore(page:Page,value:unknown) {await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'door.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');}
async function control(page:Page,action:number) {const button=page.locator(`[data-door-action="${action}"]`);await button.focus();await page.keyboard.press('Enter');await page.clock.runFor(40);}

test('timed mode is unavailable before verified team Apply',async({page})=>{await page.goto('/');await expect(page.locator('#training-moving-door')).toBeHidden();});

test('production C/wait/blocked/open traversal, reversal, pending lock, unlock, auto-delay, save and Retry',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 const baseline=await state(page);await page.locator('#play').click();await key(page,'c');await page.clock.runFor(200);await expect(page.locator('#door-status')).toContainText('OPENING');
 const mid=await state(page);expect(mid.door.word&2).toBe(2);expect((mid.door.word>>>23)&31).toBeGreaterThan(0);
 await pulse(page,'d');await pulse(page,'w');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:4,y:5});await expect(page.locator('#event-0')).toContainText('BLOCKED');
 await key(page,'Escape');const frozen=await state(page),saved=await save(page);expect(saved.version).toBe(12);await page.clock.runFor(600);expect(await state(page)).toEqual(frozen);
 await page.locator('#reset').click();expect(await state(page)).toEqual(baseline);await restore(page,saved);expect(await state(page)).toEqual(frozen);await expect(page.locator('#run-state')).toHaveText('PAUSED');
 await page.locator('#play').click();await wait(page,s=>!(s.door.word&2));await pulse(page,'w');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:5,y:5});
 await key(page,'2');await key(page,'c');await wait(page,s=>s.door.deferred);const occupied=await state(page);expect(occupied.door.word&2).toBe(0);await page.clock.runFor(200);expect((await state(page)).door).toEqual(occupied.door);
 const deferred=await save(page);await page.locator('#reset').click();await restore(page,deferred);expect((await state(page)).door).toEqual(occupied.door);
 await page.locator('#play').click();await key(page,'1');await pulse(page,'w');await wait(page,s=>!!(s.door.word&2));await expect(page.locator('#door-status')).toContainText('CLOSING');
 await key(page,'2');await control(page,14);await wait(page,s=>s.door.record.direction===1);await control(page,17);await expect(page.locator('#door-status')).toContainText('pending lock');const pending=await save(page);await page.locator('#reset').click();await restore(page,pending);
 await page.locator('#play').click();await wait(page,s=>s.door.record.direction===3);const locked=await save(page);await page.locator('#reset').click();await restore(page,locked);await expect(page.locator('#door-status')).toContainText('LOCKED');
 await page.locator('#play').click();await control(page,18);await wait(page,s=>s.door.record.direction===0);await wait(page,s=>s.door.record.direction===2,14000);await expect(page.locator('#door-status')).toContainText('CLOSING');const closing=await save(page);await page.locator('#reset').click();await restore(page,closing);await page.locator('#play').click();await wait(page,s=>s.door.record.direction===0);await expect(page.locator('#door-status')).toContainText('CLOSED');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/door-narrow.png',fullPage:true});expect(errors).toEqual([]);
});

test('fresh full keyboard v12 team win, partial/won recovery, terminal freeze, Y Retry and canonical tamper refusal',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);await open(page);const baseline=await state(page);await page.locator('#play').click();await key(page,'c');
 for(let i=0;i<6&&(await state(page)).encounter.fitness>0;i++){await key(page,'f');await page.clock.runFor(1000);}expect((await state(page)).encounter.fitness).toBe(0);await wait(page,s=>!(s.door.word&2));
 const paths=[['d','w','w','w','w'],['a','s','s'],['w','d','w','d','d','d','d'],['w','w','d']];
 for(let id=0;id<4;id++) {await key(page,String(id+1));for(const k of paths[id]!)await pulse(page,k);expect((await state(page)).world.mission.exited[id]).toBe(true);
  if(id===0){const partial=await save(page),before=await state(page);await page.locator('#reset').click();await restore(page,partial);expect(await state(page)).toEqual(before);await page.locator('#play').click();}
 }
 await expect(page.locator('#mission-progress')).toContainText('COMPLETE');const won=await save(page),terminal=await state(page);for(const k of ['w','c','f','t'])await pulse(page,k);expect(await state(page)).toEqual(terminal);
 await key(page,'y');expect(await state(page)).toEqual(baseline);await restore(page,won);expect(await state(page)).toEqual(terminal);
 for(const mutate of [(s:typeof won)=>{s.gate.moving.counter++;},(s:typeof won)=>{s.gate.moving.record.storedType^=64;},(s:typeof won)=>{s.gate.moving.deferred=true;},(s:typeof won)=>{s.patrol.history[0].action=15;},(s:typeof won)=>{s.sources.map='original';}]) {
  const bad=structuredClone(won);mutate(bad);await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await state(page)).toEqual(terminal);
 }
});

for(const cancel of ['retry','selection','source-clear','new-mode','new-apply'] as const)test(`v12 pending recovery cancels on ${cancel}`,async({page})=>{
 test.skip(!enabled,'Explicit private originals required');await open(page);const saved=await save(page),baseline=await state(page);
 await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {waiting:boolean;release:()=>void};w.waiting=true;await new Promise<void>(r=>{w.release=r;});return digest.call(this,...args);};});
 await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'door.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {waiting:boolean}).waiting)).toBe(true);
 if(cancel==='retry')await page.locator('#reset').click();
 if(cancel==='selection'){await page.locator('#roster-panel > summary').click();await page.getByLabel('Character for team slot 1').selectOption('1');}
 if(cancel==='source-clear'){await page.locator('#roster-panel > summary').click();await page.locator('#items-clear').click();}
 if(cancel==='new-mode')await page.locator('#mission-mode').evaluate((e:HTMLSelectElement)=>{e.value='navigation';e.dispatchEvent(new Event('change'));});
 if(cancel==='new-apply')await page.locator('#local-test-preset').click();
 await page.evaluate(()=>(window as unknown as {release:()=>void}).release());await page.clock.runFor(100);
 if(cancel==='source-clear')await expect(page.locator('#training-moving-door')).toBeHidden();
 else if(cancel==='new-apply'){await expect(page.locator('#local-test-status')).toContainText('Ready:');expect((await state(page)).door).toBeNull();}
 else {expect(await state(page)).toEqual(baseline);await expect(page.locator('#run-state')).toHaveText('PAUSED');}
});

async function guardSave(kind:'npc'|'current'|'destination'|'vacating'|'timeout') {
 const raw={roster:new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!)),items:new Uint8Array(await readFile(process.env.HIRED_GUNS_ITEMS!))},map=createMovingDoorLevel();
 const base=await createTrainingSession(map,raw,[11,3,0,5]);let c=await createMovingDoorSession(raw,base.session);
 const tick=(actor:number|null=null,action:14|15|16|17|18=16,commands:PlayerCommand[]=[])=>{c=advanceGateTrainingSession(map,c.session,c.world,commands,actor,action);};
 if(kind==='timeout'){const r=replayTrainingPatrol(map,c.session.team,c.session.items,c.session.encounterGun,[{kind:'wait',ticks:6009}]);c={session:{...c.session,gate:r.gate,patrol:r.patrol,encounter:r.encounter,inventory:r.inventory},world:r.world};}
 else {
  tick(0,14);while(c.world.tick<67)tick();
  if(kind==='npc') {
   tick(null,16,[{mercenaryId:0,action:'strafe-right'}]);tick(null,16,[{mercenaryId:0,action:'forward'}]);tick(1,15);
   while(c.world.tick<76)tick();tick(null,16,[{mercenaryId:0,action:'forward'}]);tick();tick(1,14);
   while(c.world.tick<94)tick();tick(1,15);expect(c.session.gate!.moving!.counter).toBe(6);expect(c.session.patrol!.routeIndex).toBe(1);
  } else {
   // Keep NPC out of the actor tests using the established designated combat.
   for(let i=0;i<6&&c.session.encounter!.fitness>0;i++){c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};for(let t=0;t<40;t++)tick();}
   tick(null,16,[{mercenaryId:0,action:'strafe-right'}]);if(kind!=='destination')tick(null,16,[{mercenaryId:0,action:'forward'}]);
   while(c.session.gate!.moving!.counter!==6)tick();
  }
 }
 return JSON.parse(await exportTrainingSession(map,c.world,c.session,raw));
}

test('production NPC destination, current and vacating reservations defer closure; release closes next tick',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);const s=await guardSave('npc');await open(page);await restore(page,s);await page.locator('#play').click();await nextTick(page);
 const reserved=await state(page);expect(reserved.world.tick).toBe(96);expect(reserved.patrol.routeIndex).toBe(2);expect(reserved.door).toMatchObject({deferred:true,pendingAction:0,counter:6,record:{trigger:2}});expect(reserved.door.word&2).toBe(0);
 await key(page,'1');await pulse(page,'d');for(let i=0;i<20&&(await state(page)).patrol.routeIndex!==3;i++)await nextTick(page);expect((await state(page)).door.deferred).toBe(true);await nextTick(page);expect((await state(page)).door.word&2).toBe(2);
});

for(const kind of ['current','destination','vacating'] as const)test(`production player ${kind} closure reservation and paused exact replay`,async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(90000);const s=await guardSave(kind);await open(page);await restore(page,s);
 await key(page,'2');await page.locator('#assign-0').selectOption('key:1');await page.locator('#play').click();await key(page,'c');if(kind!=='current')await page.keyboard.down('i');await nextTick(page);await page.keyboard.up('i');
 const reserved=await state(page);expect(reserved.door.deferred).toBe(true);expect(reserved.door.word&2).toBe(0);expect(reserved.world.mercenaries[0].x).toBe(kind==='vacating'?6:5);
 const saved=await save(page);await page.locator('#reset').click();await restore(page,saved);expect((await state(page)).door).toEqual(reserved.door);
 if(kind==='vacating'){await page.locator('#play').click();await page.clock.runFor(40);expect((await state(page)).door.word&2).toBe(2);}
});

test('v12 failure recovery and full prospective history budget freeze C/F/T/ticks',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);const deadline=await guardSave('timeout');await open(page);await restore(page,deadline);await page.locator('#play').click();await page.clock.runFor(40);await expect(page.locator('#mission-progress')).toContainText('FAILED');const failed=await save(page),terminal=await state(page);await key(page,'y');await restore(page,failed);expect(await state(page)).toEqual(terminal);await key(page,'y');
 for(let i=0;i<128;i++)await key(page,'t');const full=await state(page);expect(full.patrol.history).toHaveLength(128);await key(page,'t');await expect(page.locator('#error')).toContainText('history budget');expect(await state(page)).toEqual(full);
 await page.locator('#play').click();await key(page,'f');await expect(page.locator('#error')).toContainText('history budget');await key(page,'c');await page.clock.runFor(40);await expect(page.locator('#run-state')).toHaveText('PAUSED');expect(await state(page)).toEqual(full);
});


test('v12 held C fires once, pause freezes and clears queued input, actor selection cancels queued action, forms keep shortcuts',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');await open(page);await page.locator('#play').click();await page.locator('h1').click();await page.keyboard.down('c');await page.clock.runFor(400);
 const count=async()=>((await state(page)).patrol.history as {kind:string}[]).filter(e=>e.kind==='door').length;
 expect(await count()).toBe(1);await key(page,'Escape');const paused=await state(page);await page.clock.runFor(400);expect(await state(page)).toEqual(paused);
 await page.locator('#play').click();await page.keyboard.down('c');await page.clock.runFor(40);expect(await count()).toBe(1);await page.keyboard.up('c');
 await key(page,'c');await key(page,'2');await page.clock.runFor(40);expect(await count()).toBe(1);
 await key(page,'c');await key(page,'Escape');await page.locator('#play').click();await page.clock.runFor(40);expect(await count()).toBe(1);
 await page.locator('#roster-panel > summary').click();await page.getByLabel('Character for team slot 1').focus();await page.keyboard.press('c');await page.clock.runFor(40);expect(await count()).toBe(1);
});
