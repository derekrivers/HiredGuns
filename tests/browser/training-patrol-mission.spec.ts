import {createTrainingSession,createPatrolMissionSession,advanceGateTrainingSession,commandPatrolEncounter,exportTrainingSession} from '../../src/sim/training-session';
import {createPatrolMissionLevel} from '../../src/world/training-gate';
import {replayTrainingPatrol,appendPatrolEvent} from '../../src/world/training-patrol';
import type {PlayerCommand} from '../../src/contracts';
import {readFile} from 'node:fs/promises';
import {expect,test,type Page} from '@playwright/test';
const enabled=!!process.env.HIRED_GUNS_TRAINING_MAP;
async function state(page:Page){return JSON.parse((await page.locator('#patrol-snapshot').textContent())!);}
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function pulse(page:Page,k:string){await page.locator('h1').click();await page.keyboard.down(k);await page.clock.runFor(40);await page.keyboard.up(k);await page.clock.runFor(160);}
async function save(page:Page){const pending=page.waitForEvent('download');await page.locator('#save-checkpoint').click();return JSON.parse(await readFile((await (await pending).path())!,'utf8'));}
async function restore(page:Page,s:unknown){await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'mission.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');}
async function open(page:Page){await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#author-patrol-mission').click();await expect(page.locator('#patrol-status')).toContainText('LOCKED');}
async function defeat(page:Page){await key(page,'1');await pulse(page,'c');await key(page,'t');const hp=(await state(page)).encounter.fitness;await key(page,'f');expect((await state(page)).encounter.fitness).toBe(hp);await page.clock.runFor(1000);await key(page,'t');for(let i=0;i<6&&(await state(page)).encounter.fitness>0;i++){await key(page,'f');await page.clock.runFor(1000);}expect((await state(page)).encounter.fitness).toBe(0);await expect(page.locator('#patrol-status')).toContainText('UNLOCKED');}
async function extract(page:Page,id:number){await key(page,String(id));const paths=[['d','w','w','w','w'],['a','s','s'],['w','d','w','d','d','d','d'],['w','w','d']];for(const k of paths[id-1]!)await pulse(page,k);expect((await state(page)).world.mission.exited[id-1]).toBe(true);}

async function deadlineSave(partial=false){
 const raw={roster:new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!)),items:new Uint8Array(await readFile(process.env.HIRED_GUNS_ITEMS!))},map=createPatrolMissionLevel();
 const base=await createTrainingSession(map,raw,[11,3,0,5]);let c=await createPatrolMissionSession(raw,base.session);
 if(partial){
  c=advanceGateTrainingSession(map,c.session,c.world,[],0);
  for(let i=0;i<6&&c.session.encounter!.fitness>0;i++){c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};for(let t=0;t<40;t++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);}
  const paths:PlayerCommand['action'][][]=[['strafe-right','forward','forward','forward','forward'],['strafe-left','backward','backward'],['forward','strafe-right','forward','strafe-right','strafe-right','strafe-right','strafe-right'],['forward','forward']];
  for(let id=0;id<4;id++)for(const action of paths[id]!)c=advanceGateTrainingSession(map,c.session,c.world,[{mercenaryId:id,action}],null);
 }
 const targetTick=partial?6009:6000,patrol=appendPatrolEvent(c.session.patrol!,{kind:'wait',ticks:targetTick-c.world.tick});
 const replay=replayTrainingPatrol(map,c.session.team,c.session.items,c.session.encounterGun,patrol.history);
 const session={...c.session,gate:replay.gate,patrol:replay.patrol,encounter:replay.encounter,inventory:replay.inventory};
 return JSON.parse(await exportTrainingSession(map,replay.world,session,raw));
}

test('production challenge is opt in and unavailable without a verified selected team',async({page})=>{await page.goto('/');await expect(page.locator('#author-patrol-mission')).toBeDisabled();});
test('fresh keyboard full-team win, locked refusal, retirement, terminal freeze, Y Retry and repeat; v11 paused recovery',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 const baseline=await state(page),locked=await save(page);expect(locked.version).toBe(11);expect(baseline.world.mission).toMatchObject({rules:{mode:'cooperative-extraction',timeLimit:10},clock:{tens:1,units:0,subticks:600}});
 await page.locator('#play').click();await key(page,'4');await pulse(page,'w');await pulse(page,'w');await pulse(page,'d');expect((await state(page)).world.mission.exited).toEqual([false,false,false,false]);await expect(page.locator('#event-3')).toContainText('BLOCKED');
 await restore(page,locked);await page.locator('#play').click();await defeat(page);await key(page,'Escape');const unlocked=await save(page);await page.locator('#reset').click();await restore(page,unlocked);await expect(page.locator('#run-state')).toHaveText('PAUSED');await page.locator('#play').click();
 await extract(page,1);await expect(page.locator('#patrol-status')).toContainText('1/4 extracted');const pose=(await state(page)).world.mercenaries[0];await pulse(page,'s');await pulse(page,'c');expect((await state(page)).world.mercenaries[0]).toEqual(pose);await key(page,'f');await expect(page.locator('#error')).toContainText('retired');
 await key(page,'Escape');const partial=await save(page),part=await state(page);await page.locator('#reset').click();await restore(page,partial);expect(await state(page)).toEqual(part);await page.locator('#play').click();for(const id of [2,3,4])await extract(page,id);
 await expect(page.locator('#patrol-status')).toContainText('WIN');const won=await save(page),win=await state(page);for(const k of ['w','c','f','t'])await pulse(page,k);await page.clock.runFor(1000);expect(await state(page)).toEqual(win);
 await key(page,'y');expect(await state(page)).toEqual(baseline);await restore(page,won);expect(await state(page)).toEqual(win);await key(page,'y');await page.locator('#play').click();await defeat(page);for(const id of [1,2,3,4])await extract(page,id);await expect(page.locator('#mission-progress')).toContainText('COMPLETE');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/patrol-mission-narrow.png',fullPage:true});expect(errors).toEqual([]);
});
test('accepted-clock timeout, failed restore, canonical tamper refusal and held/focused Retry guards',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(180000);const nearDeadline=await deadlineSave();await open(page);await restore(page,nearDeadline);await page.locator('#play').click();await page.clock.runFor(240);await expect(page.locator('#patrol-status')).toContainText('FAILED');const failed=await save(page),end=await state(page);expect(end.world.tick).toBe(6010);expect(end.world.mission.clock).toEqual({tens:0,units:0,subticks:600});
 await page.keyboard.down('y');await page.clock.runFor(100);expect((await state(page)).world.tick).toBe(0);await restore(page,failed);await page.keyboard.down('y');expect(await state(page)).toEqual(end);await page.keyboard.up('y');
 await page.locator('#roster-panel > summary').click();await page.getByLabel('Character for team slot 1').focus();await page.keyboard.press('y');expect(await state(page)).toEqual(end);await key(page,'y');expect((await state(page)).world.tick).toBe(0);await restore(page,failed);expect(await state(page)).toEqual(end);
 for(const mutate of [
  (s:typeof failed)=>{s.scenario='authored-gate-patrol-v1';},(s:typeof failed)=>{s.patrol.fixture='fake';},(s:typeof failed)=>{s.sources.map='fake';},
  (s:typeof failed)=>{s.encounter.fitness=0;},(s:typeof failed)=>{s.patrol.history[0].ticks++;},(s:typeof failed)=>{s.patrol.history.push({kind:'target'});},
  (s:typeof failed)=>{const c=JSON.parse(s.checkpoint);c.world.mission.outcome='complete';s.checkpoint=JSON.stringify(c);},
  (s:typeof failed)=>{const c=JSON.parse(s.checkpoint);c.world.mission.clock.subticks--;s.checkpoint=JSON.stringify(c);},
  (s:typeof failed)=>{const c=JSON.parse(s.checkpoint);c.world.mission.exited[0]=true;s.checkpoint=JSON.stringify(c);}
 ]){const bad=structuredClone(failed);mutate(bad);await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#error')).toContainText('Checkpoint not loaded');expect(await state(page)).toEqual(end);}
});

async function delayDigest(page:Page){await page.evaluate(()=>{(window as unknown as {missionWaiting:boolean}).missionWaiting=false;const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {missionWaiting:boolean;releaseMission:()=>void};w.missionWaiting=true;await new Promise<void>(r=>{w.releaseMission=r;});return digest.call(this,...args);};});}
async function release(page:Page){await expect.poll(()=>page.evaluate(()=>(window as unknown as {missionWaiting:boolean}).missionWaiting)).toBe(true);await page.evaluate(()=>(window as unknown as {releaseMission:()=>void}).releaseMission());await page.clock.runFor(100);}
for(const cancel of ['retry','selection','rules','source-clear'] as const)test(`challenge pending work cancels on ${cancel}`,async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(30000);await open(page);const saved=await save(page),baseline=await state(page);
 await delayDigest(page);
 if(cancel==='retry'||cancel==='selection')await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'mission.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 else await page.locator('#author-patrol-mission').click();
 if(cancel==='retry')await page.locator('#reset').click();
 if(cancel==='selection'){await page.locator('#roster-panel > summary').click();await page.getByLabel('Character for team slot 1').selectOption('1');}
 if(cancel==='rules')await page.locator('#mission-mode').evaluate((element:HTMLSelectElement)=>{element.value='navigation';element.dispatchEvent(new Event('change'));});
 if(cancel==='source-clear'){await page.locator('#roster-panel > summary').click();await page.locator('#items-clear').click();}
 await release(page);
 if(cancel==='source-clear')await expect(page.locator('#training-patrol')).toBeHidden();
 else {expect(await state(page)).toEqual(baseline);await expect(page.locator('#run-state')).toHaveText('PAUSED');await expect(page.locator('#author-patrol-mission')).toBeEnabled();}
});
test('prior v10 clears challenge and a newer ready preset clears challenge setup',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(30000);await open(page);await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready:');await page.locator('#author-gate').click();await page.locator('#author-patrol').click();const v10=await save(page);expect(v10.version).toBe(10);
 await page.locator('#author-patrol-mission').click();await restore(page,v10);await expect(page.locator('#prototype-label')).toHaveText('AUTHORED GATE PATROL / VERIFIED TEAM');expect((await state(page)).world.mission.rules.mode).toBe('navigation');
 await delayDigest(page);await page.locator('#author-patrol-mission').click();await page.locator('#local-test-preset').click();await release(page);await expect(page.locator('#local-test-status')).toContainText('Ready:');await expect(page.locator('#training-patrol')).toBeHidden();
});

test('browser fourth exit at tick 6010 loses the deadline tie after canonical event replay',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');test.setTimeout(120000);const save=await deadlineSave(true);await open(page);await restore(page,save);const before=await state(page);expect(before.world.tick).toBe(6009);expect(before.world.mission.exited).toEqual([true,true,true,false]);await key(page,'4');await page.locator('#play').click();await pulse(page,'d');const after=await state(page);expect(after.world.tick).toBe(6010);expect(after.world.mission.exited.every(Boolean)).toBe(true);expect(after.world.mission.outcome).toBe('failed');await expect(page.locator('#patrol-status')).toContainText('FAILED');
});

test('v11 prospective event, fire and tick budgets refuse the full state atomically',async({page})=>{
 test.skip(!enabled,'Explicit private originals required');await open(page);await page.locator('h1').click();for(let i=0;i<128;i++)await page.keyboard.press('t');const full=await state(page);expect(full.patrol.history).toHaveLength(128);
 await page.keyboard.press('t');await expect(page.locator('#error')).toContainText('history budget');expect(await state(page)).toEqual(full);
 await page.locator('#play').click();await key(page,'f');await expect(page.locator('#error')).toContainText('history budget');expect(await state(page)).toEqual(full);
 await page.clock.runFor(40);await expect(page.locator('#run-state')).toHaveText('PAUSED');expect(await state(page)).toEqual(full);await page.locator('#reset').click();expect((await state(page)).patrol.history).toEqual([]);
});
