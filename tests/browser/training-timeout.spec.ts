import {expect,test,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createDemoLevel} from '../../src/demo';
import {createWorld} from '../../src/sim/world';
const privateInputs=process.env.HIRED_GUNS_T43_CASE_INPUTS;
async function key(page:Page,k:string){await page.locator('h1').click();await page.keyboard.press(k);}
async function selected(page:Page,activate=true){
 await page.goto('/');await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');
 await page.locator('#roster-panel > summary').focus();await page.keyboard.press('Enter');
 for(const [slot,index] of [1,3,0,5].entries()){const s=page.getByLabel(`Character for team slot ${slot+1}`);await s.focus();await page.keyboard.press('Home');for(let n=0;n<=index;n++){await s.focus();await page.keyboard.press('ArrowDown');}await expect(s).toHaveValue(String(index));}
 await page.locator('#roster-apply').focus();await page.keyboard.press('Enter');await expect(page.locator('#recovery-status')).toContainText('Selected team applied');
 if(activate){await page.locator('#timeout-enable').focus();await page.keyboard.press('Enter');await expect(page.locator('#timeout-feedback')).toContainText('enabled');await expect(page.locator('#training-wet-lifecycle')).toBeHidden();}
}
let checkpointNumber=0,recoveryObservationNumber=0;
async function observeFullRecovery(page:Page){
 await page.evaluate(()=>{const w=window as unknown as {fullObserver:{timer:ReturnType<typeof setInterval>;observer:PerformanceObserver;gaps:number[];tasks:number[];start:number}},gaps:number[]=[],tasks:number[]=[];let last=performance.now();const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({entryTypes:['longtask']});w.fullObserver={start:performance.now(),gaps,tasks,observer,timer:setInterval(()=>{const now=performance.now();gaps.push(now-last);last=now;},25)};});
}
async function finishFullRecovery(page:Page,operation:string){
 const observation=await page.evaluate(()=>{const o=(window as unknown as {fullObserver:{timer:ReturnType<typeof setInterval>;observer:PerformanceObserver;gaps:number[];tasks:number[];start:number}}).fullObserver;clearInterval(o.timer);o.observer.disconnect();return {totalMs:performance.now()-o.start,maxGapMs:Math.max(0,...o.gaps),maxNativeLongTaskMs:Math.max(0,...o.tasks),gaps:o.gaps,tasks:o.tasks};});
 await writeFile(test.info().outputPath(`full-${operation}-${++recoveryObservationNumber}.json`),JSON.stringify(observation,null,2));expect(observation.maxGapMs).toBeLessThan(1000);expect(observation.maxNativeLongTaskMs).toBeLessThan(1000);
}
async function save(page:Page,name='checkpoint-'+(++checkpointNumber)){
 const full=/tick 5949[89]/.test(await page.locator('#tick').textContent()??'');if(full)await observeFullRecovery(page);
 const download=page.waitForEvent('download',{timeout:120000});await page.locator('#save-checkpoint').click();const text=await readFile((await (await download).path())!,'utf8');await writeFile(test.info().outputPath(name+'.json'),text);if(full)await finishFullRecovery(page,'save');return text;
}
async function restore(page:Page,text:string){
 const full=JSON.parse(text).checkpoint.world.tick>=59498;if(full)await observeFullRecovery(page);
 await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'timeout.json',mimeType:'application/json',buffer:Buffer.from(text)});await expect(page.locator('#recovery-status')).toContainText('Checkpoint restored',{timeout:120000});await expect(page.locator('#pause-overlay')).toBeVisible();await expect(page.locator('#run-state')).toHaveText(JSON.parse(text).checkpoint.world.mission.outcome==='active'?'PAUSED':'FINISHED');if(full)await finishFullRecovery(page,'load');
}
test('original99 timeout setup explains full chronology and is keyboard accessible',async({page})=>{
 await page.goto('/');await expect(page.locator('#timeout-enable')).toBeDisabled();await expect(page.locator('#training-timeout')).toContainText('59,499 full fixed steps');await expect(page.locator('#training-timeout')).toContainText('original CPU timing is unproven');
});
test('timeout source clear after a real keyboard turn restores the complete fresh static world',async({page})=>{
 test.skip(!privateInputs,'Private original sources required');await selected(page);await key(page,'1');await page.locator('#play').click();await page.locator('h1').click();await page.keyboard.down('e');await expect(page.locator('#event-0')).toHaveText('TURNED');await page.keyboard.up('e');await key(page,'Escape');
 const moved=JSON.parse(await save(page,'source-clear-turned'));expect(moved.checkpoint.world.tick).toBeGreaterThan(0);expect(moved.history.some((t:number[])=>t.slice(2).includes(5))).toBe(true);
 await page.locator('#items-clear').click();const cleared=JSON.parse(await save(page,'source-clear-static'));expect(cleared.world).toEqual(createWorld(createDemoLevel()));await expect(page.locator('#timeout-enable')).toBeDisabled();await expect(page.locator('#timeout-state')).toContainText('Inactive');
});
for(const throwing of [false,true])test('timeout normal activation ignores call and late inherited party getters '+throwing,async({page})=>{
 test.skip(!privateInputs,'Private original sources required');test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await selected(page);const canonical=await save(page,'activation-canonical');
 for(const phase of [0,1,3,7]){
  await selected(page,false);await page.evaluate(({phase,throwing})=>{
   const w=window as unknown as {reads:number;digests:number;restore:()=>void},old=Object.getOwnPropertyDescriptor(Object.prototype,'wetParty'),digest=SubtleCrypto.prototype.digest;w.reads=0;w.digests=0;
   const get=()=>{w.reads++;if(throwing)throw Error('TIMEOUT_ACTIVATION_CANARY');return {sideEffectCanary:true};},install=()=>Object.defineProperty(Object.prototype,'wetParty',{configurable:true,get});
   install();try{Reflect.get({},'wetParty');}catch{/* positive canary */}if(w.reads!==1)throw Error('dead canary');w.reads=0;Reflect.deleteProperty(Object.prototype,'wetParty');if(!phase)install();
   SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(++w.digests===phase)install();return digest.apply(this,args);};w.restore=()=>{SubtleCrypto.prototype.digest=digest;if(old)Object.defineProperty(Object.prototype,'wetParty',old);else Reflect.deleteProperty(Object.prototype,'wetParty');};
  },{phase,throwing});
  let observation;try{await page.locator('#timeout-enable').focus();await page.keyboard.press('Enter');await expect(page.locator('#timeout-feedback')).toContainText('enabled');await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#save-checkpoint')).toBeEnabled();await expect(page.locator('#timeout-enable')).toBeDisabled();}
  finally{observation=await page.evaluate(()=>{const w=window as unknown as {reads:number;digests:number;restore:()=>void},r={reads:w.reads,digests:w.digests};w.restore();return r;});}
  expect(observation.reads).toBe(0);expect(observation.digests).toBe(16);expect(await save(page,'activation-'+throwing+'-'+phase)).toBe(canonical);await writeFile(test.info().outputPath('activation-'+throwing+'-'+phase+'.json'),JSON.stringify(observation));
 }
 expect(errors).toEqual([]);
});
test('source-bound full before-deadline and terminal replay, one normal remaining tick, fresh recovery and rules',async({page})=>{
 test.skip(!privateInputs||!process.env.HIRED_GUNS_TIMEOUT_BEFORE||!process.env.HIRED_GUNS_TIMEOUT_TERMINAL,'Private complete source-replayed checkpoints required');test.setTimeout(900000);
 const before=await readFile(process.env.HIRED_GUNS_TIMEOUT_BEFORE!,'utf8'),terminal=await readFile(process.env.HIRED_GUNS_TIMEOUT_TERMINAL!,'utf8'),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await selected(page);const initial=await save(page,'focused-initial');
 // File import performs full original-source reconstruction. This is replay
 // evidence, separate from the ordinary full-duration run above.
 await restore(page,before);await expect(page.locator('#tick')).toContainText('tick 59498');await expect(page.locator('#play')).toBeEnabled();
 await page.locator('#play').focus();await page.keyboard.press('Enter');await expect(page.locator('#pause-overlay b')).toHaveText('TIME EXPIRED');await expect(page.locator('#play')).toBeDisabled();expect(await save(page,'focused-terminal')).toBe(terminal);
 for(const k of ['1','2','3','4','w','s','a','d','q','e','Escape'])await key(page,k);expect(await save(page,'focused-terminal-keys')).toBe(terminal);
 await selected(page);await restore(page,terminal);expect(await save(page,'focused-fresh-terminal')).toBe(terminal);await expect(page.locator('#play')).toBeDisabled();
 await page.locator('#reset').focus();await page.keyboard.press('Enter');expect(await save(page,'focused-retry')).toBe(initial);
 for(const mode of ['first-exit','cooperative-extraction']){await page.getByLabel('Mission rules').selectOption(mode);const r=JSON.parse(await save(page,'focused-'+mode));expect(r.checkpoint.world.tick).toBe(0);expect(r.rules.mode).toBe(mode);expect(r.checkpoint.state.actors).toEqual(JSON.parse(initial).checkpoint.state.actors);}
 const bad=JSON.parse(terminal);bad.history=[[59500,0]];await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'one-over.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#error')).toContainText('tick budget');expect(await save(page,'focused-refused')).toBe(initial);
 await page.screenshot({path:test.info().outputPath('focused-restored-retry.png'),fullPage:true});expect(errors).toEqual([]);
});
test('ordinary production original99 wait, terminal freeze, complete paused recovery and Retry',async({page})=>{
 test.skip(!privateInputs||!process.env.HIRED_GUNS_TIMEOUT_LIVE,'Private original inputs and explicit full real-time run required');test.setTimeout(3900000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await selected(page);
 const initial=await save(page,'initial'),s=JSON.parse(initial);expect(s.version).toBe(19);expect(s.indices).toEqual([1,3,0,5]);expect(s.checkpoint.state.actors.map((a:{body:{race:number}})=>a.body.race)).toEqual([0,0,3,4]);
 const start=Date.now();await page.locator('#play').focus();await page.keyboard.press('Enter');await expect(page.locator('#run-state')).toHaveText('RUNNING');
 // Real requestAnimationFrame/fixed-step clock. No page.clock, forced tick,
 // state injection or imported chronology is used for this full wait.
 const progress:{at:number;hud:string}[]=[];
 while(await page.locator('#run-state').textContent()==='RUNNING'){
  await page.waitForTimeout(15000);const hud=await page.locator('#tick').innerText();progress.push({at:Date.now(),hud});console.log('ordinary99',Math.round((Date.now()-start)/1000),hud);
  if(Date.now()-start>3600000)throw Error('Ordinary clock did not reach terminal within measured allowance');
 }
 await expect(page.locator('#pause-overlay b')).toHaveText('TIME EXPIRED');await expect(page.locator('#play')).toBeDisabled();
 const terminal=await save(page,'terminal'),t=JSON.parse(terminal);expect(t.checkpoint.world.tick).toBe(59499);expect(t.checkpoint.world.mission).toMatchObject({outcome:'failed',reason:'time-expired',clock:{tens:0,units:0,subticks:600},winner:null,exited:[false,false,false,false]});
 for(const k of ['1','2','3','4','w','s','a','d','q','e','Escape'])await key(page,k);await page.waitForTimeout(200);expect(await save(page,'terminal-after-keys')).toBe(terminal);
 await page.screenshot({path:test.info().outputPath('timeout-terminal.png'),fullPage:true});await restore(page,terminal);expect(await save(page,'terminal-restored')).toBe(terminal);
 await page.locator('#reset').focus();await page.keyboard.press('Enter');expect(await save(page,'retry')).toBe(initial);
 for(const mode of ['first-exit','cooperative-extraction']){await page.getByLabel('Mission rules').selectOption(mode);const r=JSON.parse(await save(page,'rules-'+mode));expect(r.checkpoint.world.tick).toBe(0);expect(r.rules.mode).toBe(mode);expect(r.checkpoint.state.actors).toEqual(s.checkpoint.state.actors);}
 await writeFile(test.info().outputPath('ordinary-clock.json'),JSON.stringify({start,end:Date.now(),progress,errors},null,2));expect(errors).toEqual([]);
});

for(const operation of ['enable','restore'] as const)for(const reject of [false,true])for(const cancel of ['retry','selection','source-clear','new-apply','rules'])test(`timeout generation ${operation}/${reject?'error':'success'} after ${cancel}`,async({page})=>{
 test.skip(!privateInputs,'Private source manifest required');test.setTimeout(60000);await selected(page);const baseline=await save(page);if(operation==='enable'){await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');}
 await page.evaluate(reject=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){SubtleCrypto.prototype.digest=digest;const w=window as unknown as {held:boolean;release:()=>void};w.held=true;await new Promise<void>(r=>w.release=r);if(reject)throw Error('delayed verification error');return digest.call(this,...args);};},reject);
 if(operation==='enable')await page.locator('#timeout-enable').click();else await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'held.json',mimeType:'application/json',buffer:Buffer.from(baseline)});await expect.poll(()=>page.evaluate(()=>(window as unknown as {held:boolean}).held)).toBe(true);
 if(cancel==='retry')await page.locator('#reset').click();else if(cancel==='rules')await page.getByLabel('Mission rules').selectOption('first-exit');else if(cancel==='new-apply'){await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');}else {await page.locator('#roster-panel').evaluate((e:HTMLDetailsElement)=>e.open=true);if(cancel==='selection')await page.getByLabel('Character for team slot 1').selectOption('1');else await page.locator('#items-clear').click();}
 const current=await save(page),feedback=await page.locator('#timeout-feedback').textContent(),error=await page.locator('#error').textContent();await page.evaluate(()=>(window as unknown as {release:()=>void}).release());await page.waitForTimeout(200);expect(await save(page)).toEqual(current);expect(await page.locator('#timeout-feedback').textContent()).toBe(feedback);expect(await page.locator('#error').textContent()).toBe(error);await expect(page.locator('#pause-overlay')).toBeVisible();
});
for(const operation of ['enable','restore'] as const)test(`timeout current ${operation} error releases loading and can retry`,async({page})=>{
 test.skip(!privateInputs,'Private source manifest required');await selected(page);const baseline=await save(page);
 if(operation==='enable'){await page.locator('#local-test-preset').click();await expect(page.locator('#local-test-status')).toContainText('Ready: verified');}
 await page.evaluate(()=>{const digest=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=async function(){SubtleCrypto.prototype.digest=digest;throw Error('current party verification error');};});
 if(operation==='enable'){await page.locator('#timeout-enable').click();await expect(page.locator('#timeout-feedback')).toContainText('current party verification error');await expect(page.locator('#timeout-enable')).toBeEnabled();await page.locator('#timeout-enable').click();await expect(page.locator('#timeout-feedback')).toContainText('enabled');}
 else {await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'current.json',mimeType:'application/json',buffer:Buffer.from(baseline)});await expect(page.locator('#error')).toContainText('current party verification error');expect(await save(page)).toEqual(baseline);await restore(page,baseline);expect(await save(page)).toEqual(baseline);}
});

for(const cancel of ['retry','source-clear'])for(const reject of [false,true])test(`long nonempty timeout restore ${reject?'error':'success'} after ${cancel}`,async({page})=>{
 test.skip(!privateInputs||!process.env.HIRED_GUNS_TIMEOUT_BEFORE,'Private full original chronology required');test.setTimeout(300000);const canonical=await readFile(process.env.HIRED_GUNS_TIMEOUT_BEFORE!,'utf8');expect(JSON.parse(canonical).checkpoint.world.tick).toBe(59498);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await selected(page);
 await page.evaluate(({canonical,reject})=>{
  const w=window as unknown as {held:boolean;release:()=>void;restore:()=>void;matches:number;rejected:boolean;maxGap:number;releasedAt:number;serializedAt:number},digest=SubtleCrypto.prototype.digest,stringify=JSON.stringify;let calls=0,last=performance.now();w.matches=0;w.rejected=false;w.maxGap=0;w.releasedAt=0;w.serializedAt=0;
  const timer=setInterval(()=>{const t=performance.now();w.maxGap=Math.max(w.maxGap,t-last);last=t;},25);
  SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(++calls===7){SubtleCrypto.prototype.digest=digest;w.held=true;await new Promise<void>(r=>w.release=r);w.releasedAt=performance.now();if(reject){w.rejected=true;throw Error('long nonempty delayed source verification');}}return digest.apply(this,args);};
  JSON.stringify=function(this:typeof JSON,...args:Parameters<typeof JSON.stringify>){const text=stringify.apply(this,args);if(text===canonical){w.matches++;w.serializedAt=performance.now();}return text;} as typeof JSON.stringify;
  w.restore=()=>{clearInterval(timer);SubtleCrypto.prototype.digest=digest;JSON.stringify=stringify;};
 },{canonical,reject});
 let observation;try{
  await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'long-before.json',mimeType:'application/json',buffer:Buffer.from(canonical)});await expect.poll(()=>page.evaluate(()=>(window as unknown as {held:boolean}).held)).toBe(true);
  const loading=await page.evaluate(()=>({runState:document.querySelector('#run-state')!.textContent,playDisabled:(document.querySelector('#play') as HTMLButtonElement).disabled,saveDisabled:(document.querySelector('#save-checkpoint') as HTMLButtonElement).disabled,tick:document.querySelector('#tick')!.textContent}));
  expect(loading.playDisabled).toBe(true);expect(loading.saveDisabled).toBe(true);
  let downloads=0;const downloaded=()=>downloads++;page.on('download',downloaded);if(!loading.playDisabled)await page.locator('#play').click();await key(page,'e');if(!loading.saveDisabled)await page.locator('#save-checkpoint').click();await page.waitForTimeout(60);page.off('download',downloaded);expect(downloads).toBe(0);await expect(page.locator('#run-state')).toHaveText('PAUSED');
  if(cancel==='retry')await page.locator('#reset').click();else await page.locator('#items-clear').click();const current=await save(page,'long-current'),status=await page.locator('#recovery-status').textContent(),error=await page.locator('#error').textContent();
  await page.evaluate(()=>(window as unknown as {release:()=>void}).release());if(reject)await expect.poll(()=>page.evaluate(()=>(window as unknown as {rejected:boolean}).rejected)).toBe(true);else {await expect.poll(()=>page.evaluate(()=>(window as unknown as {releasedAt:number}).releasedAt)).toBeGreaterThan(0);expect(await page.evaluate(()=>(window as unknown as {matches:number}).matches)).toBe(0);}await page.waitForTimeout(60);
  expect(await page.locator('#recovery-status').textContent()).toBe(status);expect(await page.locator('#error').textContent()).toBe(error);expect(await save(page,'long-after')).toBe(current);
  observation=await page.evaluate(()=>{const w=window as unknown as {matches:number;rejected:boolean;maxGap:number;releasedAt:number;serializedAt:number};return {matches:w.matches,rejected:w.rejected,maxSynchronousGapMs:w.maxGap,reconstructionAfterReleaseMs:w.serializedAt?w.serializedAt-w.releasedAt:null};});await writeFile(test.info().outputPath('long-reconstruction.json'),JSON.stringify({cancel,reject,loading,observation,errors},null,2));expect(errors).toEqual([]);
 }finally{await page.evaluate(()=>(window as unknown as {restore:()=>void}).restore());}
});

interface NativeRecoveryObservation {gaps:number[];tasks:{start:number;duration:number}[];progress:{at:number;processed:number;total:number}[];transitions:{at:number;status:string}[];scheduledAt:number;firedAt:number;processedAtSchedule:number;processedAtCancel:number;completed:boolean;timer:ReturnType<typeof setInterval>;observer:PerformanceObserver;mutation:MutationObserver;controls?:{play:boolean;save:boolean;load:boolean};}
// Native task observers are deliberately independent of digest holds: cancellation
// is delivered by a browser timer while the real per-tick CPU replay is running.
for(const tick of [59498,59499])for(const cancel of ['retry','source-clear'] as const)for(const operation of ['load','save'] as const)test(`cooperative native ${operation} ${tick} during replay / ${cancel}`,async({page})=>{
 test.skip(!privateInputs||!process.env.HIRED_GUNS_TIMEOUT_BEFORE||!process.env.HIRED_GUNS_TIMEOUT_TERMINAL,'Private full native-derived chronology required');test.setTimeout(240000);
 const canonical=await readFile(tick===59498?process.env.HIRED_GUNS_TIMEOUT_BEFORE!:process.env.HIRED_GUNS_TIMEOUT_TERMINAL!,'utf8');expect(JSON.parse(canonical).checkpoint.world.tick).toBe(tick);
 await selected(page);const initial=await save(page,'native-initial');if(operation==='save')await restore(page,canonical);
 let downloads=0;page.on('download',()=>downloads++);
 await page.evaluate(({cancel})=>{
  const w=window as unknown as {native:NativeRecoveryObservation};const o=w.native={gaps:[],tasks:[],progress:[],transitions:[],scheduledAt:0,firedAt:0,processedAtSchedule:0,processedAtCancel:0,completed:false} as unknown as NativeRecoveryObservation;let last=performance.now();
  o.timer=setInterval(()=>{const now=performance.now();o.gaps.push(now-last);last=now;},25);
  o.observer=new PerformanceObserver(list=>o.tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));o.observer.observe({entryTypes:['longtask']});
  o.mutation=new MutationObserver(()=>{
   const status=document.querySelector('#recovery-status')!.textContent!;o.transitions.push({at:performance.now(),status});
   const match=/Reconstructing checkpoint: (\d+) \/ (\d+) ticks/.exec(status);
   if(match){const processed=Number(match[1]),total=Number(match[2]);o.progress.push({at:performance.now(),processed,total});if(processed===total)o.completed=true;
    if(processed>=128&&!o.scheduledAt){o.scheduledAt=performance.now();o.processedAtSchedule=processed;setTimeout(()=>{
     o.firedAt=performance.now();o.processedAtCancel=o.progress.at(-1)!.processed;
     o.controls={play:(document.querySelector('#play')as HTMLButtonElement).disabled,save:(document.querySelector('#save-checkpoint')as HTMLButtonElement).disabled,load:(document.querySelector('#checkpoint-file')as HTMLInputElement).disabled};
     (document.querySelector(cancel==='retry'?'#reset':'#items-clear')as HTMLButtonElement).click();
    },250);}
   }
  });o.mutation.observe(document.querySelector('#recovery-status')!,{childList:true,subtree:true,characterData:true});
 },{cancel});
 if(operation==='load')await page.getByLabel('Load navigation checkpoint').setInputFiles({name:'native-full.json',mimeType:'application/json',buffer:Buffer.from(canonical)});else await page.locator('#save-checkpoint').click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {native:NativeRecoveryObservation}).native.firedAt),{timeout:30000}).toBeGreaterThan(0);
 await expect(page.locator('#tick')).toContainText('tick 0');await page.waitForTimeout(200);
 const status=await page.locator('#recovery-status').textContent(),error=await page.locator('#error').textContent();
 const observed=await page.evaluate(()=>{const o=(window as unknown as {native:NativeRecoveryObservation}).native;clearInterval(o.timer);o.observer.disconnect();o.mutation.disconnect();const {timer:_,observer:__,mutation:___,...result}=o;void _;void __;void ___;return result;});
 expect(observed.completed).toBe(false);expect(observed.processedAtCancel).toBeGreaterThanOrEqual(128);expect(observed.processedAtCancel).toBeLessThan(tick);expect(observed.controls).toEqual({play:true,save:true,load:true});
 expect(observed.firedAt-observed.scheduledAt).toBeLessThan(1000);expect(Math.max(...observed.gaps)).toBeLessThan(1000);
 expect(observed.tasks.every((x:{duration:number})=>x.duration<1000)).toBe(true);expect(downloads).toBe(0);expect(error).toBe('');expect(observed.transitions.some((x:{status:string})=>x.status.includes('Checkpoint restored')||x.status.includes('Checkpoint exported'))).toBe(false);
 for(let i=1;i<observed.progress.length;i++)expect(observed.progress[i]!.processed-observed.progress[i-1]!.processed).toBeLessThanOrEqual(16);
 // No further obsolete progress, installation, error or finally/control writes.
 await page.waitForTimeout(150);expect(await page.locator('#recovery-status').textContent()).toBe(status);expect(await page.locator('#error').textContent()).toBe(error);
 const current=await save(page,'native-current');if(cancel==='retry')expect(current).toBe(initial);else expect(JSON.parse(current).world).toEqual(createWorld(createDemoLevel()));
 await expect(page.locator('#play')).toBeEnabled();await expect(page.locator('#save-checkpoint')).toBeEnabled();await expect(page.getByLabel('Load navigation checkpoint')).toBeEnabled();
 await writeFile(test.info().outputPath('native-cooperative.json'),JSON.stringify({tick,cancel,operation,...observed,maxGap:Math.max(...observed.gaps),timerDelay:observed.firedAt-observed.scheduledAt},null,2));
});
