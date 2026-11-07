import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createThreePlayerSession,stepThreePlayerSession,serializeThreePlayerSession,type ThreePlayerSession} from '../../src/sim/three-player-mission';

async function state(page:Page):Promise<ThreePlayerSession>{return JSON.parse((await page.locator('#three-player-snapshot').textContent())!);}
async function open(page:Page){
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto('/');
  await page.locator('#three-player').click();
  await expect(page.locator('#prototype-label')).toHaveText('SYNTHETIC THREE-PLAYER / MISSION CONTROL');
}
async function pulse(page:Page,key:string){
  await page.locator('h1').click();await page.keyboard.down(key);await page.clock.runFor(40);await page.keyboard.up(key);await page.clock.runFor(40);
}
async function save(page:Page){
  const pending=page.waitForEvent('download');await page.locator('#save-checkpoint').click();
  return await readFile((await (await pending).path())!,'utf8');
}
async function load(page:Page,json:string){
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'three.json',mimeType:'application/json',buffer:Buffer.from(json)});
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');
}

test('four views, three assignments, inactive input, active movement, Save/Load and Retry',async({page})=>{
  await open(page);await expect(page.locator('.view')).toHaveCount(4);
  for(let id=0;id<3;id++)await expect(page.locator(`#assign-${id}`)).toHaveValue(`key:${id}`);
  await expect(page.locator('#assign-3')).toHaveValue('none');await expect(page.locator('#device-3')).toContainText('INACTIVE / CONTROL 0 / ALIVE');
  const initial=await state(page);
  // Inactive selection/assignment attempts while paused leave the full session unchanged.
  await page.locator('h1').click();await page.keyboard.press('4');await page.keyboard.press('Numpad8');
  expect(await state(page)).toEqual(initial);
  await page.locator('#play').click();await pulse(page,'Numpad8');await pulse(page,'j');await page.keyboard.press('Escape');
  const moved=await state(page);expect(moved.world.mercenaries[1].x).toBe(initial.world.mercenaries[1].x-1);
  for(const id of [0,2,3])expect(moved.world.mercenaries[id]).toEqual(initial.world.mercenaries[id]);
  expect(moved.history.flatMap(r=>r.commands).some(c=>c.mercenaryId===3)).toBe(false);
  const json=await save(page);await page.locator('#reset').click();expect(await state(page)).toEqual(initial);
  await load(page,json);expect(await state(page)).toEqual(moved);
  await expect(page.locator('#assign-3')).toHaveValue('none');
  for(const invalid of ['profile','inactive-command']){
    const bad=JSON.parse(json);
    if(invalid==='profile')bad.session.controls=[1,1,1,1];
    else bad.session.history[0].commands=[{mercenaryId:3,action:'forward'}];
    await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'refused.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await expect(page.locator('#error')).toContainText('Checkpoint not loaded');
    expect(await state(page)).toEqual(moved);await expect(page.locator('#assign-3')).toHaveValue('none');
  }
  await page.locator('#reset').click();expect(await state(page)).toEqual(initial);
});

test('first active exit completes with inactive alive, terminal freeze and terminal recovery',async({page})=>{
  await open(page);await page.locator('#play').click();await pulse(page,'i');
  const terminal=await state(page);expect(terminal.world.mission).toMatchObject({outcome:'complete',winner:1,exited:[false,true,false,false]});
  expect(terminal.world.physics).toEqual({mode:'source-wet',deadWords:[0,0,0,0]});
  await pulse(page,'w');await pulse(page,'Numpad8');expect(await state(page)).toEqual(terminal);
  const json=await save(page);await page.locator('#reset').click();await load(page,json);expect(await state(page)).toEqual(terminal);
  await expect(page.locator('#play')).toBeDisabled();
});

test('all three dead failure, timeout priority over exit, all-dead priority at deadline and Retry',async({page})=>{
  await open(page);await page.locator('#three-player-deaths').click();
  const dead=await state(page);expect(dead.world.mission).toMatchObject({outcome:'failed',reason:'all-dead'});
  expect(dead.world.physics).toEqual({mode:'source-wet',deadWords:[0xff00,0xff00,0xff00,0]});
  await expect(page.locator('#pause-overlay b')).toHaveText('ALL THREE ACTIVE ACTORS DEAD');
  const deadSave=await save(page);await page.locator('#reset').click();await load(page,deadSave);expect(await state(page)).toEqual(dead);
  await pulse(page,'i');expect(await state(page)).toEqual(dead);
  await page.locator('#reset').click();
  let deadline=createThreePlayerSession();for(let i=0;i<1201;i++)deadline=stepThreePlayerSession(deadline,[]).session;
  await load(page,serializeThreePlayerSession(deadline));await page.locator('#play').click();await pulse(page,'w');
  expect((await state(page)).world.mission).toMatchObject({outcome:'failed',reason:'time-expired',exited:[true,false,false,false],winner:null});
  await load(page,serializeThreePlayerSession(deadline));await page.locator('#three-player-deaths').click();
  expect((await state(page)).world.mission).toMatchObject({outcome:'failed',reason:'all-dead'});
  await page.locator('#reset').click();expect(await state(page)).toEqual(createThreePlayerSession());
});
