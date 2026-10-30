import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {importEditorMap} from '../../src/import/editor-map';
import {cellIndex,type Facing,type Position,type Spawn,type LevelData} from '../../src/contracts';
import {resolveTraversal} from '../../src/sim/traversal';
import {TRAINING_43_SHA256} from '../../src/sim/mission-profile';

const manifestPath=process.env.HIRED_GUNS_T43_CASE_INPUTS;
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function setup(page:Page){
  await page.goto('/');
  await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
  await page.locator('#roster-panel > summary').focus();await page.keyboard.press('Enter');
  for(const [i,index] of [1,3,0,5].entries()){
    const select=page.getByLabel(`Character for team slot ${i+1}`);await select.focus();await page.keyboard.press('Home');
    for(let n=0;n<=index;n++){await select.focus();await page.keyboard.press('ArrowDown');}await expect(select).toHaveValue(String(index));
  }
  await page.locator('#roster-apply').focus();await page.keyboard.press('Enter');await expect(page.locator('#recovery-status')).toContainText('Selected team applied');
  await page.locator('#timeout-enable').focus();await page.keyboard.press('Enter');await expect(page.locator('#timeout-feedback')).toContainText('enabled');
}
let sequence=0;
async function save(page:Page,name:string){
  const download=page.waitForEvent('download');await page.locator('#save-checkpoint').click();
  const text=await readFile((await (await download).path())!,'utf8');await writeFile(test.info().outputPath(`${++sequence}-${name}.json`),text);return text;
}
async function restore(page:Page,text:string){
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'sign.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');await expect(page.locator('#run-state')).toHaveText('PAUSED');
}
async function beginHeldRestore(page:Page,text:string){
  await page.evaluate(()=>{
    const digest=SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){
      SubtleCrypto.prototype.digest=digest;const w=window as unknown as {signHeld:boolean;signRelease:()=>void};
      w.signHeld=true;await new Promise<void>(r=>w.signRelease=r);return digest.apply(this,args);
    };
    (window as unknown as {signHeld:boolean}).signHeld=false;
  });
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'held-sign.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {signHeld:boolean}).signHeld)).toBe(true);
  await page.waitForTimeout(32);await cues(page,null);
}
async function move(page:Page,k:string){
  const actor=await page.locator('[id^="assign-"]').evaluateAll(elements=>elements.findIndex(e=>(e as HTMLSelectElement).value==='key:0'));
  expect(actor).toBeGreaterThanOrEqual(0);const position=page.locator(`#position-${actor}`),before=await position.textContent();
  await page.locator('h1').click();await page.keyboard.down(k);
  // Poll on each native frame, so a successful turn releases before held-key
  // repeat. Coarse assertion polling can accidentally hold through two turns.
  try{await page.waitForFunction(({actor,before})=>document.querySelector(`#position-${actor}`)!.textContent!==before,{actor,before});}finally{await page.keyboard.up(k);}
  await page.waitForTimeout(40);
}
function search(level:LevelData,from:Spawn,others:Position[]){
  const nodes=[{at:from,steps:[] as {key:string;target:Position}[]}],seen=new Set([cellIndex(level,from)]);
  for(const node of nodes){
    for(const d of [0,1,2,3] as Facing[]){
      const r=resolveTraversal(level,node.at,d,p=>others.some(o=>cellIndex(level,o)===cellIndex(level,p)));
      if(!r.reason&&!seen.has(cellIndex(level,r.target))){seen.add(cellIndex(level,r.target));nodes.push({at:{...r.target,facing:0},steps:[...node.steps,{key:['w','d','s','a'][d]!,target:r.target}]});}
    }
  }
  return nodes;
}
function route(level:LevelData,from:Spawn,target:Position,others:Position[]){
  const found=search(level,from,others).find(n=>cellIndex(level,n.at)===cellIndex(level,target));
  if(!found)throw Error('No actual dry source traversal route with all other actors present');return found.steps;
}
async function cues(page:Page,owner:number|null){
  for(let i=0;i<4;i++)if(i===owner)await expect(page.locator(`#sign-${i}`)).toHaveText('Sign ahead (placeholder)');else await expect(page.locator(`#sign-${i}`)).toBeHidden();
}
test('sign cues require an installed verified source team and describe placeholder scope',async({page})=>{
  await page.goto('/');await cues(page,null);await page.locator('#drill').click();await cues(page,null);
  await expect(page.locator('#diagnostics')).toContainText('original lettering remains deferred artwork');
});

for(const actor of [0,1,2,3])test(`sign keyboard approach, view ownership and paused recovery slot ${actor+1}`,async({page})=>{
  test.skip(!manifestPath,'Private raw source and approach case required');test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const manifest=JSON.parse(await readFile(manifestPath!,'utf8')),raw=await readFile(manifest.inputs.map);
  expect(createHash('sha256').update(raw).digest('hex')).toBe(TRAINING_43_SHA256);
  const {level}=await importEditorMap(raw),sourceCase=JSON.parse(await readFile(manifest.casePath,'utf8'));
  const signs=sourceCase.classification.signs as {position:Position;panelType:number;variant:number;dryAdjacent:Position[]}[];
  expect(signs).toHaveLength(2);
  for(const sign of signs){const word=level.layers[0][cellIndex(level,sign.position)]!;expect(word&8).toBe(8);expect((word>>>19)&3).toBe(0);expect((word>>>23)&31).toBe(sign.variant);expect(sign.panelType).toBe(0);}
  await setup(page);const initial=await save(page,'initial');await cues(page,null);
  const witnesses=[];
  // Slot1 visits both real signs; each other slot independently visits the first.
  for(const sign of actor===0?signs:signs.slice(0,1)){
    const start=JSON.parse(await save(page,'before-route')).checkpoint.world;
    const target=sign.dryAdjacent[0]!,poses=structuredClone(start.mercenaries) as Spawn[];
    const ideal=route(level,poses[actor]!,target,[]),avoid=new Set(ideal.map(s=>cellIndex(level,s.target))),staging=[];
    // Real keyboard staging clears starting occupancy. No level/world writes or
    // product autoroute: every planned step is checked against the live display.
    for(const id of [3,2,1,0].filter(i=>i!==actor)){
      const parking=search(level,poses[id]!,poses.filter((_,i)=>i!==id)).find(n=>n.steps.length>=3&&!avoid.has(cellIndex(level,n.at))&&!level.starts.some(p=>cellIndex(level,p)===cellIndex(level,n.at)));
      if(parking){poses[id]=parking.at;staging.push({actor:id,steps:parking.steps});}
    }
    const steps=route(level,poses[actor]!,target,poses.filter((_,i)=>i!==actor));
    await page.locator('#play').focus();await page.keyboard.press('Enter');
    for(const stage of staging){await key(page,String(stage.actor+1));for(const step of stage.steps){await move(page,step.key);await expect(page.locator(`#position-${stage.actor}`)).toContainText(`X ${String(step.target.x).padStart(2,'0')}  Y ${String(step.target.y).padStart(2,'0')}  Z ${String(step.target.z).padStart(2,'0')}`);}}
    await key(page,String(actor+1));
    for(const step of steps){await move(page,step.key);await expect(page.locator(`#position-${actor}`)).toContainText(`X ${String(step.target.x).padStart(2,'0')}  Y ${String(step.target.y).padStart(2,'0')}  Z ${String(step.target.z).padStart(2,'0')}`);}
    const facing=sign.position.x>target.x?1:sign.position.x<target.x?3:sign.position.y>target.y?2:0;
    for(let n=0;n<4;n++){if((await page.locator(`#position-${actor}`).textContent())!.endsWith(`/ ${['N','E','S','W'][facing]}`))break;await move(page,'e');}
    await expect(page.locator(`#position-${actor}`)).toContainText(`/ ${['N','E','S','W'][facing]}`);await key(page,'Escape');await page.waitForTimeout(32);await cues(page,actor);
    const parked=await save(page,'sign-parked');const value=JSON.parse(parked);expect(value.version).toBe(19);
    expect(value.checkpoint.world.mercenaries[actor]).toMatchObject({...target,facing});
    // At a PAUSED identical tick, repeated real HUD queries preserve the entire
    // serialized world, source actors, counters, inventory, overlays and history.
    await page.waitForTimeout(1000);await cues(page,actor);expect(await save(page,'sign-readback')).toBe(parked);
    await restore(page,parked);await page.waitForTimeout(32);await cues(page,actor);expect(await save(page,'sign-restored')).toBe(parked);
    if(actor===0){
      await beginHeldRestore(page,parked);await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#save-checkpoint')).toBeDisabled();
      await page.evaluate(()=>(window as unknown as {signRelease:()=>void}).signRelease());
      await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored');await page.waitForTimeout(32);await cues(page,actor);expect(await save(page,'held-restored')).toBe(parked);
      await beginHeldRestore(page,parked);await page.locator('#reset').click();await page.waitForTimeout(32);await cues(page,null);
      await page.evaluate(()=>(window as unknown as {signRelease:()=>void}).signRelease());await page.waitForTimeout(100);
      expect(await save(page,'held-cancelled')).toBe(initial);await cues(page,null);await restore(page,parked);await page.waitForTimeout(32);await cues(page,actor);
    }
    // Selected/manual keyboard assignment cannot transfer ownership of a cue.
    await key(page,String((actor+1)%4+1));await page.waitForTimeout(32);await cues(page,actor);
    await page.getByLabel(`Control mercenary ${(actor+2)%4+1}`).selectOption('key:0');await cues(page,actor);await key(page,String(actor+1));
    await page.locator('#play').click();await move(page,'e');await key(page,'Escape');await page.waitForTimeout(32);await cues(page,null);
    await restore(page,parked);await page.waitForTimeout(32);await cues(page,actor);
    for(const width of actor===0?[390,1440]:[1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator(`#sign-${actor}`)).toBeVisible();await page.screenshot({path:test.info().outputPath(`sign-${sign.variant}-slot${actor+1}-${width}.png`),fullPage:true});await page.locator('#live-test').screenshot({path:test.info().outputPath(`live-sign-${sign.variant}-slot${actor+1}-${width}.png`)});}
    witnesses.push({sign,actor,staging,steps,parked:JSON.parse(parked)});
    await page.locator('#reset').click();await page.waitForTimeout(32);await cues(page,null);expect(await save(page,'retry')).toBe(initial);
  }
  if(actor===0){
    const last=JSON.stringify(witnesses.at(-1)!.parked);await restore(page,last);await cues(page,actor);
    await page.getByLabel('Mission rules').selectOption('first-exit');await page.waitForTimeout(32);await cues(page,null);
    const changed=JSON.parse(await save(page,'rules'));expect(changed.rules.mode).toBe('first-exit');expect(changed.checkpoint.world.tick).toBe(0);
    await restore(page,last);await cues(page,actor);await beginHeldRestore(page,last);
    await page.locator('#items-clear').click();await page.waitForTimeout(32);await cues(page,null);await expect(page.locator('#timeout-enable')).toBeDisabled();
    const cleared=await save(page,'cleared');await page.evaluate(()=>(window as unknown as {signRelease:()=>void}).signRelease());await page.waitForTimeout(100);
    expect(await save(page,'clear-after-stale')).toBe(cleared);await cues(page,null);
    await page.locator('#drill').click();await cues(page,null);
  }
  await writeFile(test.info().outputPath('player-cue-witness.json'),JSON.stringify({source:TRAINING_43_SHA256,actor,witnesses,errors},null,2));expect(errors).toEqual([]);
});
