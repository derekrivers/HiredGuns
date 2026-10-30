import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createSelectedFallLevel} from '../src/sim/fall';
import {createConsumableSession,createTrainingSession,equipTrainingSession,exchangeTrainingSession,returnTrainingSession,changeConsumableSession,exportTrainingSession,importTrainingSession,resetTrainingInventory} from '../src/sim/training-session';
import {stepConsumables,consumableHistory,appendConsumableEvent} from '../src/sim/training-consumables';
import {useConsumable} from '../src/items/consumable-use';
import type {TrainingCandidate} from '../src/sim/training-session';
const enabled=!!(process.env.HIRED_GUNS_CHARACTERS&&process.env.HIRED_GUNS_ITEMS);
const level=createSelectedFallLevel();
async function local(){const sources={roster:new Uint8Array(await readFile(process.env.HIRED_GUNS_CHARACTERS!)),items:new Uint8Array(await readFile(process.env.HIRED_GUNS_ITEMS!))};const base=await createTrainingSession(level,sources,[11,3,0,5]);return {sources,c:await createConsumableSession(level,sources,base.session)};}
function tick(c:TrainingCandidate,actor?:number){return stepConsumables(level,c.session,c.world,actor===undefined?[]:[{mercenaryId:actor,action:'forward'}]);}
function landed(c:TrainingCandidate,actor:number){c=tick(c,actor);for(let n=0;n<80;n++)c=tick(c);return c;}
function find(c:TrainingCandidate,actor:number,id:number){return c.session.inventory.actors[actor]!.inventory.carried.findIndex(e=>e.itemId===id);}
it('strict new event union, dense storage, shared event/tick budgets and ordered commands',()=>{
 for(const value of [[{kind:'use',actor:0,slot:0}],[{kind:'use',actor:4}],[{kind:'ticks',count:45001,commands:[]}],[{kind:'ticks',count:45000,commands:[]},{kind:'ticks',count:1,commands:[]}],Array(129).fill({kind:'use',actor:0}),[{kind:'ticks',count:1,commands:[{mercenaryId:0,action:'forward'},{mercenaryId:0,action:'backward'}]}],Array(1)])expect(()=>consumableHistory(value)).toThrow();
 expect(appendConsumableEvent({history:[{kind:'ticks',count:10,commands:[]}],races:[0,1,3,4],lastUse:null},{kind:'ticks',count:1,commands:[]})).toEqual([{kind:'ticks',count:11,commands:[]}]);
});
it.skipIf(!enabled)('actual source food/repair, real injury before use, later movement, v14 restore and retry',async()=>{
 const {sources,c:baseline}=await local();expect(baseline.session.consumables!.races).toEqual([1,0,3,4]);
 let c=baseline;
 for(const [actor,id,boost] of [[0,66,60000],[2,62,30000],[2,60,17000]] as const){
  if(actor!==2||id===62)c=landed(c,actor);
  if(c.world.physics.mode!=='dry-fall')throw Error('fall');const before=c.world.physics.actors[actor]!.fitness;expect(before).toBeLessThan(65535);expect(c.world.physics.actors[actor]!.dead).toBe(false);
  c=await equipTrainingSession(level,sources,c.session,actor,find(c,actor,id),true,c.world);
  const inv=structuredClone(c.session.inventory.actors[actor]!.inventory),weight=c.session.inventory.actors[actor]!.weight.totalWeight;
  c=await changeConsumableSession(level,sources,c.session,c.world,{kind:'use',actor},true);
  if(c.world.physics.mode!=='dry-fall')throw Error('fall');expect(c.world.physics.actors[actor]!.fitness).toBe(Math.min(65535,before+boost));expect(c.world.physics.actors[actor]!.weight).toBeLessThan(weight);expect(c.session.inventory.actors[actor]!.inventory.equipped.rawHex).toBe('00'+inv.equipped.rawHex.slice(2));
  c=tick(c);const saved=await exportTrainingSession(level,c.world,c.session,sources);expect(JSON.parse(saved).version).toBe(14);const restored=await importTrainingSession(level,sources,saved);expect(restored).toEqual({world:c.world,session:c.session});expect(tick(restored,actor).world).toEqual(tick(c,actor).world);
 }
 expect(resetTrainingInventory(c.session,level)).toEqual(baseline.session);
 // Race refusals use actual unchanged raw item records without creating loot.
 for(const [id,race] of [[66,3],[62,1],[62,4]] as const){const a=id===66?0:2,inv=structuredClone(baseline.session.inventory.actors[a]!.inventory);inv.equipped={...inv.carried[find(baseline,a,id)]!};expect(()=>useConsumable(baseline.session.items,inv,race,100,1000)).toThrow('Race');}
 const med=await equipTrainingSession(level,sources,baseline.session,1,find(baseline,1,64),true,baseline.world);await expect(changeConsumableSession(level,sources,med.session,med.world,{kind:'use',actor:1},true)).rejects.toThrow('Medical');
},120000);
it.skipIf(!enabled)('pending, running, dead and double-use refusals; recovery tamper/bounds/source/geometry reject atomically',async()=>{
 const {sources,c:base}=await local();let c=await equipTrainingSession(level,sources,base.session,0,find(base,0,66),true,base.world);
 await expect(changeConsumableSession(level,sources,c.session,c.world,{kind:'use',actor:0},false)).rejects.toThrow('Pause');
 const pending=tick(c,0);await expect(changeConsumableSession(level,sources,pending.session,pending.world,{kind:'use',actor:0},true)).rejects.toThrow('Pending');
 c=landed(c,0);c=await changeConsumableSession(level,sources,c.session,c.world,{kind:'use',actor:0},true);await expect(changeConsumableSession(level,sources,c.session,c.world,{kind:'use',actor:0},true)).rejects.toThrow('Empty');
 c=landed(c,3);await expect(equipTrainingSession(level,sources,c.session,3,find(c,3,66),true,c.world)).rejects.toThrow('Incapacitated');
 const json=await exportTrainingSession(level,c.world,c.session,sources),saved=JSON.parse(json);
 const mutations=[(s:typeof saved)=>{const w=JSON.parse(s.checkpoint);w.world.physics.actors[0].fitness--;s.checkpoint=JSON.stringify(w);},(s:typeof saved)=>{const w=JSON.parse(s.checkpoint);w.world.physics.actors[0].weight++;s.checkpoint=JSON.stringify(w);},(s:typeof saved)=>{s.history.reverse();},(s:typeof saved)=>{s.history.push({kind:'use',actor:0});},(s:typeof saved)=>{s.history=[{kind:'ticks',count:45001,commands:[]}];},(s:typeof saved)=>{s.sources.roster.sha256='0'.repeat(64);},(s:typeof saved)=>{s.indices.reverse();},(s:typeof saved)=>{s.checkpoint=' '.repeat(16384);},(s:typeof saved)=>{s.version=7;}];
 for(const mutate of mutations){const bad=structuredClone(saved);mutate(bad);await expect(importTrainingSession(level,sources,JSON.stringify(bad))).rejects.toThrow();}
 const badMap=structuredClone(level);badMap.layers[0][0]=badMap.layers[0][0]!^1;await expect(importTrainingSession(badMap,sources,json)).rejects.toThrow();await expect(importTrainingSession(level,{...sources,items:new Uint8Array(sources.items.length)},json)).rejects.toThrow();expect(await exportTrainingSession(level,c.world,c.session,sources)).toBe(json);
},120000);
for(const kind of ['setup','save','import','equip','exchange','return','use'] as const)it.skipIf(!enabled)(`${kind} snapshots all caller state and raw bytes before first await`,async()=>{
 const {sources,c:base}=await local();let c=landed(base,0);
 if(['use','exchange','return'].includes(kind))c=await equipTrainingSession(level,sources,c.session,0,find(c,0,66),true,c.world);
 const saved=await exportTrainingSession(level,c.world,c.session,sources),raw=structuredClone(sources),map=structuredClone(level),caller=structuredClone(c);
 const operate=(m:typeof map,r:typeof raw,p:typeof caller)=>kind==='setup'?createConsumableSession(m,r,{...p.session,consumables:undefined}):kind==='save'?exportTrainingSession(m,p.world,p.session,r):kind==='import'?importTrainingSession(m,r,saved):kind==='use'?changeConsumableSession(m,r,p.session,p.world,{kind:'use',actor:0},true):(kind==='equip'?equipTrainingSession:kind==='exchange'?exchangeTrainingSession:returnTrainingSession)(m,r,p.session,0,0,true,p.world);
 const expected=await operate(level,sources,c),promise=operate(map,raw,caller);raw.roster.fill(0);raw.items.fill(0);map.layers[0][0]=map.layers[0][0]!^1;caller.world.tick++;caller.session.consumables!.history.length=0;(caller.session.indices as number[]).reverse();let reads=0;Object.defineProperty(raw,'items',{get(){reads++;throw Error('late bytes');}});Object.defineProperty(caller.session,'indices',{get(){reads++;throw Error('late indices');}});expect(await promise).toEqual(expected);expect(reads).toBe(0);
},120000);

it('synthetic public chronological replay keeps prior injury, item tails and later gravity coherent',async()=>{
 const {importItems,ITEM_FILE_BYTES}=await import('../src/import/items');const {replayConsumables}=await import('../src/sim/training-consumables');const {computeSourceWeight}=await import('../src/import/inventory');
 const raw=new Uint8Array(ITEM_FILE_BYTES),view=new DataView(raw.buffer);raw[65*286+254]=19;view.setUint16(65*286+260,2800);view.setUint16(65*286+274,1000);const items=await importItems(raw);
 const entry=(id:number)=>({itemId:id,damage:7,ammo:9,fourthByte:11,rawHex:[id,7,9,11].map(n=>n.toString(16).padStart(2,'0')).join('')});
 const actors=Array.from({length:4},(_,i)=>{const inventory={equipped:entry(0),carried:Array.from({length:30},(_,j)=>entry(j===0?66:0)),actions:Array.from({length:10},()=>entry(0))};const w=computeSourceWeight(items,inventory,100);if(w.status!=='computed')throw Error('fixture');return {canonicalIndex:i,stats:{physique:100,agility:100,fitness:65535,experience:0,footstep:0,grunt:0},inventory,weight:{...w,status:'verified' as const}};});
 // Pure replay accepts a logical synthetic baseline; application installation separately rehashes originals.
 const session={indices:[0,1,2,3],names:['A','B','C','D'],team:{profile:'ocs-initial-team-v1' as const,sources:{roster:{sha256:'synthetic',byteLength:16320,layout:'front272-five-banks' as const,revision:'unverified' as const},items:items.source},actors},items,inventory:{commands:[],actors:actors.map(a=>({inventory:a.inventory,weight:a.weight,selection:0}))},ground:null,gate:null,patrol:null,encounterGun:{itemId:25 as const,rawHex:'00'.repeat(286)},encounter:null} as unknown as TrainingCandidate['session'];
 const events=[{kind:'ticks' as const,count:1,commands:[{mercenaryId:0,action:'forward' as const}]},{kind:'ticks' as const,count:30,commands:[]},{kind:'equip' as const,actor:0,slot:0}];
 const prior=replayConsumables(level,session,[1,1,1,1],events),used=replayConsumables(level,session,[1,1,1,1],[...events,{kind:'use',actor:0}]);
 if(prior.world.physics.mode!=='dry-fall'||used.world.physics.mode!=='dry-fall')throw Error('fixture');expect(prior.world.physics.actors[0]!.fitness).toBeLessThan(65535);expect(used.world.physics.actors[0]!.fitness).toBe(prior.world.physics.actors[0]!.fitness+1000);expect(used.world.physics.actors[0]!.weight).toBe(0);expect(used.session.inventory.actors[0]!.inventory.equipped.rawHex).toBe('0007090b');
 const live=tick(used,0),replayed=replayConsumables(level,session,[1,1,1,1],live.session.consumables!.history);expect(replayed.world).toEqual(live.world);expect(replayed.session.inventory).toEqual(live.session.inventory);
 expect(()=>replayConsumables(level,session,[1,1,1,1],[...events,{kind:'use',actor:0},{kind:'use',actor:0}])).toThrow('Empty');
 const {serializeConsumables}=await import('../src/sim/training-consumables');
 const oversized=structuredClone(used);oversized.session.consumables!.history=Array.from({length:128},()=>({kind:'ticks',count:1,commands:[0,1,2,3].map(mercenaryId=>({mercenaryId,action:'strafe-right' as const}))}));
 expect(()=>serializeConsumables(oversized)).toThrow('large');
 expect(()=>serializeConsumables({...used,world:{...used.world,levelId:'x'.repeat(16384)}})).toThrow('16 KiB');

});
