import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createPressurePadLevel} from '../../src/world/training-gate';
import {createTrainingSession,createPressurePadSession,advanceGateTrainingSession,commandPatrolEncounter,exportTrainingSession} from '../../src/sim/training-session';
import {replayTrainingPatrol} from '../../src/world/training-patrol';
import type {PlayerCommand} from '../../src/contracts';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
async function state(page:Page){return JSON.parse((await page.locator('#door-snapshot').textContent())!);}
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function pulse(page:Page,k:string){await page.locator('h1').click();await page.keyboard.down(k);await page.clock.runFor(40);await page.keyboard.up(k);await page.clock.runFor(160);}
async function waitOpen(page:Page){for(let n=0;n<100;n++){if(!((await state(page)).door.word&2))return;await page.clock.runFor(40);}throw Error('Door did not open');}
async function open(page:Page){await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#author-pressure-pad').focus();await page.keyboard.press('Enter');await expect(page.locator('#pad-status')).toContainText('last: none');}
async function save(page:Page){const download=page.waitForEvent('download');await page.locator('#save-checkpoint').click();return JSON.parse(await readFile((await (await download).path())!,'utf8'));}
async function restore(page:Page,value:unknown){await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'pad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');}

test('pad workflow hidden before verified team',async({page})=>{await page.goto('/');await expect(page.locator('#author-pressure-pad')).toBeHidden();});
test('production pad press/hold/blocked/release/interlock/reentry with exact paused recovery and tamper refusal',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);await open(page);const baseline=await state(page);await page.locator('#play').click();
 for(let i=0;i<6&&(await state(page)).encounter.fitness>0;i++){await key(page,'f');await page.clock.runFor(1000);}expect((await state(page)).encounter.fitness).toBe(0);
 await pulse(page,'d');await expect(page.locator('#pad-status')).toContainText('slot 1 press');const pressed=await state(page);expect(pressed.gate.pad.occupants).toEqual([0]);
 await pulse(page,'w');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:4,y:5});
 await key(page,'Escape');const frozen=await state(page),saved=await save(page);expect(saved.version).toBe(13);await page.clock.runFor(300);expect(await state(page)).toEqual(frozen);
 await page.locator('#reset').click();expect(await state(page)).toEqual(baseline);await restore(page,saved);expect(await state(page)).toEqual(frozen);
 await page.locator('#play').click();await waitOpen(page);await page.clock.runFor(100);expect((await state(page)).door.record.trigger).toBe(0);expect((await state(page)).gate.pad.lastActions).toEqual(pressed.gate.pad.lastActions);
 await pulse(page,'w');expect((await state(page)).world.mercenaries[0].x).toBe(5);await expect(page.locator('#pad-status')).toContainText('release');await page.clock.runFor(300);expect((await state(page)).door.deferred).toBe(true);
 const deferred=await save(page),before=await state(page);await page.locator('#reset').click();await restore(page,deferred);expect(await state(page)).toEqual(before);
 for(const mutate of [(s:typeof saved)=>{s.gate.pad.occupants=[];},(s:typeof saved)=>{s.gate.pad.lastActions[0].action=15;},(s:typeof saved)=>{s.gate.pad.lastActions[0].datum=2592;},(s:typeof saved)=>{s.sources.map='authored:authored-moving-door-extraction-v1';},(s:typeof saved)=>{s.patrol.history.find((e:{kind:string})=>e.kind==='step').commands[0].action='forward';}]){
  const bad=structuredClone(saved);mutate(bad);await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await state(page)).toEqual(before);
 }
 await page.locator('#play').click();await pulse(page,'s');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:4,y:5});await expect(page.locator('#pad-status')).toContainText('press');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/pad-narrow.png',fullPage:true});
});
test('full production keyboard pad-driven challenge win without C and Y Retry',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);await open(page);const baseline=await state(page);await page.locator('#play').click();
 for(let i=0;i<6&&(await state(page)).encounter.fitness>0;i++){await key(page,'f');await page.clock.runFor(1000);}expect((await state(page)).encounter.fitness).toBe(0);
 const paths=[['d','w','w','w','w'],['a','s','s'],['w','d','w','d','d','d','d'],['w','w','d']];
 for(let actor=0;actor<4;actor++){
  await key(page,String(actor+1));for(const k of paths[actor]!){await pulse(page,k);const s=await state(page);if(s.gate.pad.occupants.includes(actor))await waitOpen(page);}
  expect((await state(page)).world.mission.exited[actor]).toBe(true);
  if(actor===0){const saved=await save(page),before=await state(page);await page.locator('#reset').click();await restore(page,saved);expect(await state(page)).toEqual(before);await page.locator('#play').click();}
 }
 await expect(page.locator('#mission-progress')).toContainText('COMPLETE');const terminal=await state(page),won=await save(page);expect(terminal.patrol.history.some((e:{kind:string})=>e.kind==='door')).toBe(false);
 for(const k of ['w','c','f','t'])await pulse(page,k);expect(await state(page)).toEqual(terminal);await key(page,'y');expect(await state(page)).toEqual(baseline);await restore(page,won);expect(await state(page)).toEqual(terminal);
});

test('production NPC exclusion and blocked pad entry',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');await open(page);await page.locator('#play').click();for(let n=0;n<40&&(await state(page)).patrol.routeIndex!==1;n++)await page.clock.runFor(20);
 expect((await state(page)).patrol.routeIndex).toBe(1);await pulse(page,'d');expect((await state(page)).world.mercenaries[0]).toMatchObject({x:4,y:4});expect((await state(page)).gate.pad).toEqual({occupants:[],lastActions:[]});
 for(let n=0;n<80&&(await state(page)).patrol.routeIndex!==0;n++)await page.clock.runFor(20);await pulse(page,'d');expect((await state(page)).gate.pad.lastActions[0]).toMatchObject({actor:0,edge:'press',action:14});
});

for(const cancel of ['retry','selection','source-clear','new-mode','new-apply'] as const)test(`v13 recovery cancels on ${cancel}`,async({page})=>{
 test.skip(!enabled,'Explicit private originals required');await open(page);const saved=await save(page),baseline=await state(page);
 await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {waiting:boolean;release:()=>void};w.waiting=true;await new Promise<void>(r=>{w.release=r;});return digest.call(this,...args);};});
 await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'pad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await expect.poll(()=>page.evaluate(()=>(window as unknown as {waiting:boolean}).waiting)).toBe(true);
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

async function seeded(actor:number|'timeout'){
 const raw={roster:new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!)),items:new Uint8Array(await readFile(process.env.HIRED_GUNS_ITEMS!))},map=createPressurePadLevel();
 const base=await createTrainingSession(map,raw,[11,3,0,5]);let c=await createPressurePadSession(raw,base.session);
 const tick=(commands:PlayerCommand[]=[],manual=false)=>{const r=advanceGateTrainingSession(map,c.session,c.world,commands,manual?0:null,14);c={session:r.session,world:r.world};};
 if(actor==='timeout'){const r=replayTrainingPatrol(map,c.session.team,c.session.items,c.session.encounterGun,[{kind:'wait',ticks:6009}]);c={world:r.world,session:{...c.session,gate:r.gate,patrol:r.patrol,encounter:r.encounter,inventory:r.inventory}};}
 else {
  for(let i=0;i<6&&c.session.encounter!.fitness>0;i++){c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};for(let n=0;n<40;n++)tick();}
  if(actor===1||actor===3){tick([],true);for(let n=0;n<67;n++)tick();}
  const paths:PlayerCommand['action'][]=actor===1?['strafe-left','forward']:actor===2?['forward','strafe-right']:actor===3?['forward','forward','strafe-left','strafe-left']:[];
  for(const action of paths)tick([{mercenaryId:actor,action}]);
 }
 return JSON.parse(await exportTrainingSession(map,c.world,c.session,raw));
}
for(const actor of [0,1,2,3])test(`actual keyboard slot ${actor+1} enters P from source-bound replayed approach`,async({page})=>{
 test.skip(!enabled,'Explicit private originals required');const saved=await seeded(actor);await open(page);await restore(page,saved);await key(page,String(actor+1));await page.locator('#play').click();await pulse(page,actor===0?'d':actor===3?'a':'w');
 expect((await state(page)).gate.pad.occupants).toEqual([actor]);expect((await state(page)).gate.pad.lastActions[0]).toMatchObject({actor,edge:'press',action:14,index:3,datum:9616});
});
test('production v13 timeout recovery and prospective pad event budget refusal freeze everything',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);const deadline=await seeded('timeout');await open(page);await restore(page,deadline);await page.locator('#play').click();await page.clock.runFor(40);await expect(page.locator('#mission-progress')).toContainText('FAILED');
 const terminal=await state(page),saved=await save(page);await key(page,'y');await restore(page,saved);expect(await state(page)).toEqual(terminal);await key(page,'y');
 for(let n=0;n<128;n++)await key(page,'t');const full=await state(page);expect(full.patrol.history).toHaveLength(128);await page.locator('#play').click();await page.keyboard.down('d');await page.clock.runFor(40);await page.keyboard.up('d');await expect(page.locator('#run-state')).toHaveText('PAUSED');expect(await state(page)).toEqual(full);await expect(page.locator('#error')).toContainText('history budget');
});

// Delay the actual application's first digest, then observe its completion refresh.
// The clock is installed before navigation; production scheduling is unchanged.
async function delaySetupDigest(page:Page) {
 return page.evaluateHandle(()=>{
  const original=SubtleCrypto.prototype.digest;
  const gate={waiting:false,release:(fail:boolean):void=>{throw Error(`Digest not waiting (${fail})`);}};
  SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){
   SubtleCrypto.prototype.digest=original;gate.waiting=true;
   await new Promise<void>((resolve,reject)=>{gate.release=fail=>fail?reject(Error('Delayed setup digest failed')):resolve();});
   return original.call(this,...args);
  };
  return gate;
 });
}
async function readyTeam(page:Page) {
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto('/');
 await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');
}
async function finishDelayedSetup(gate:Awaited<ReturnType<typeof delaySetupDigest>>,fail=false) {
 await gate.evaluate(async(g,reject)=>{
  const refreshed=new Promise<void>(resolve=>{
   const observer=new MutationObserver(()=>{observer.disconnect();resolve();});
   observer.observe(document.querySelector('#door-snapshot')!,{childList:true});
  });
  g.release(reject);await refreshed;
 },fail);
}
for(const scenario of ['pressure-pad','moving-door'] as const) {
 for(const cancel of ['retry','selection','source-clear','new-mode','new-apply'] as const)test(`${scenario} delayed setup cancels accurately on ${cancel}`,async({page})=>{
  test.skip(!enabled,'Explicit private originals required');await readyTeam(page);const gate=await delaySetupDigest(page);
  await page.locator(`#author-${scenario}`).focus();await page.keyboard.press('Enter');
  await expect.poll(()=>gate.evaluate(g=>g.waiting)).toBe(true);
  await expect(page.locator('#author-pressure-pad')).toBeDisabled();await expect(page.locator('#author-moving-door')).toBeDisabled();
  if(cancel==='retry')await page.locator('#reset').click();
  if(cancel==='selection'){await page.locator('#roster-panel > summary').click();await page.getByLabel('Character for team slot 1').selectOption('1');}
  if(cancel==='source-clear'){await page.locator('#roster-panel > summary').click();await page.locator('#items-clear').click();}
  if(cancel==='new-mode')await page.locator('#mission-mode').evaluate((e:HTMLSelectElement)=>{e.value='navigation';e.dispatchEvent(new Event('change'));});
  if(cancel==='new-apply'){await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');}
  const retained=await state(page),feedback=await page.locator('#door-feedback').textContent();
  await finishDelayedSetup(gate);expect(await state(page)).toEqual(retained);
  expect((await state(page)).door).toBeNull();await expect(page.locator('#pad-status')).toBeEmpty();
  await expect(page.locator('#door-feedback')).toHaveText(feedback!);await expect(page.locator('#door-feedback')).not.toContainText('ready');
  await expect(page.locator('#run-state')).toHaveText('PAUSED');
  if(cancel==='source-clear')await expect(page.locator('#training-moving-door')).toBeHidden();
  else {await expect(page.locator('#author-pressure-pad')).toBeEnabled();await expect(page.locator('#author-moving-door')).toBeEnabled();}
 });
 for(const fail of [false,true])test(`${scenario} older ${fail?'failed':'cancelled'} setup cannot overwrite newer other challenge`,async({page})=>{
  test.skip(!enabled,'Explicit private originals required');await readyTeam(page);const gate=await delaySetupDigest(page);
  await page.locator(`#author-${scenario}`).click();await expect.poll(()=>gate.evaluate(g=>g.waiting)).toBe(true);
  await page.locator('#reset').click();const next=scenario==='pressure-pad'?'moving-door':'pressure-pad';
  await page.locator(`#author-${next}`).focus();await page.keyboard.press('Enter');
  const label=next==='pressure-pad'?'Pressure pad':'Timed door';
  await expect(page.locator('#door-feedback')).toContainText(`${label} ready, PAUSED.`);
  await expect(page.locator('#play')).toBeFocused();await expect(page.locator('#author-pressure-pad')).toBeEnabled();await expect(page.locator('#author-moving-door')).toBeEnabled();
  const installed=await state(page),feedback=await page.locator('#door-feedback').textContent();
  expect(!!installed.gate.pad).toBe(next==='pressure-pad');expect(installed.door).not.toBeNull();
  await finishDelayedSetup(gate,fail);expect(await state(page)).toEqual(installed);
  await expect(page.locator('#door-feedback')).toHaveText(feedback!);await expect(page.locator('#play')).toBeFocused();await expect(page.locator('#run-state')).toHaveText('PAUSED');
  await page.keyboard.press('Enter');await expect(page.locator('#run-state')).toHaveText('RUNNING');
 });
 test(`${scenario} current setup error retains state and permits successful keyboard retry`,async({page})=>{
  test.skip(!enabled,'Explicit private originals required');await readyTeam(page);const baseline=await state(page),gate=await delaySetupDigest(page);
  await page.locator(`#author-${scenario}`).focus();await page.keyboard.press('Enter');await expect.poll(()=>gate.evaluate(g=>g.waiting)).toBe(true);
  await finishDelayedSetup(gate,true);await expect(page.locator('#door-feedback')).toHaveText('Delayed setup digest failed');expect(await state(page)).toEqual(baseline);
  await expect(page.locator('#run-state')).toHaveText('PAUSED');await expect(page.locator(`#author-${scenario}`)).toBeEnabled();
  await page.locator(`#author-${scenario}`).focus();await page.keyboard.press('Enter');
  await expect(page.locator('#door-feedback')).toContainText(`${scenario==='pressure-pad'?'Pressure pad':'Timed door'} ready, PAUSED.`);
  await expect(page.locator('#play')).toBeFocused();expect((await state(page)).door).not.toBeNull();
 });
}
