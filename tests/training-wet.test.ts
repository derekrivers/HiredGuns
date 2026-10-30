import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initialWet, stepWet, replayWet, wetSnapshot, wetHistory, WET_LIMITS, activateWet } from '../src/sim/training-wet';
import { createTrainingSession, exportTrainingSession, importTrainingSession, resetTrainingInventory, type TrainingSession, type TrainingCandidate } from '../src/sim/training-session';
import { importEditorMap } from '../src/import/editor-map';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import { importCharacters, CHARACTER_FILE_BYTES } from '../src/import/characters';
import { constructInitialTeam } from '../src/import/original-team';
import { createDemoLevel } from '../src/demo';
import { cellIndex, type PlayerCommand } from '../src/contracts';
import { transitionImmersion } from '../src/character/immersion-caller';
import { exitRoute } from './helpers/extraction-route';
async function fixture(){
 const level=createDemoLevel(),items=await importItems(new Uint8Array(ITEM_FILE_BYTES)),roster=await importCharacters(new Uint8Array(CHARACTER_FILE_BYTES));
 for(const r of roster.records)Object.assign(r.stats,{physique:100,agility:100});
 Object.assign(items.records[0]!,{waterDamage:1,maxDamage:65535,weight:100});
 const initial=constructInitialTeam(roster,items,[11,3,0,5]);
 const team={profile:'ocs-initial-team-v1',sources:{roster:roster.source,items:items.source},actors:initial.actors.map(a=>({...a,weight:{...a.weight,status:'verified'}}))};
 // Authored synthetic initial state; this never calls the raw-source activation/save authority boundary.
 const baseline={team,items,indices:[11,3,0,5],names:['A','B','C','D'],encounter:null,inventory:{commands:[],actors:[]},gate:null,ground:null} as unknown as TrainingSession;
 const target={...level.starts[3]!,y:7};level.layers[0][cellIndex(level,target)]=(4|(2<<17))>>>0;
 const c=initialWet(level,baseline,[1,0,3,4],{mode:'navigation',timeLimit:null});return {level,baseline,c,target};
}
function advance(level:Parameters<typeof stepWet>[0],c:TrainingCandidate,n:number,commands:PlayerCommand[]=[]){for(let i=0;i<n;i++)c=stepWet(level,c.session,c.world,commands);return c;}
function expectHeads(level:Parameters<typeof stepWet>[0],c:TrainingCandidate){
 const wet=c.session.wet!,mask=0xf07e07fd;
 for(let id=0;id<4;id++){
  const p=c.world.mercenaries[id]!,a=wet.actors[id]!,i=cellIndex(level,p);expect(a.current).toBe(i);
  const owner=c.world.mercenaries.findIndex((p,j)=>!c.world.mission.exited[j]&&cellIndex(level,p)===i);
  const head=wet.overlays.find(x=>x[0]===i)![1];
  if(owner<0)expect(head&~mask).toBe(0);
  else{const p=c.world.mercenaries[owner]!;expect(head&~mask).toBe((((32+owner*4+p.facing)<<11)|(owner<<23)|2)&~mask);}
 }
}
it.each([[3,0],[0,3],[2,1],[1,2]])('retirement order %j preserves all four heads on movement, turning and later ticks',async(retired,active)=>{
 const {level,baseline}=await fixture();level.id='synthetic-extraction-v1';level.layers[0][cellIndex(level,level.exit)]=(3<<11)|2;
 for(const x of [5,7])level.layers[0][cellIndex(level,{x,y:1,z:1})]=2;
 level.layers[0]=level.layers[0].map(w=>(w|0x80000000)>>>0);level.layers[1].fill(0x12345678);level.layers[2].fill(0xffffffff);const immutable=structuredClone(level.layers);let reused=false;
 let c=initialWet(level,baseline,[1,0,3,4],{mode:'cooperative-extraction',timeLimit:2});
 for(const id of [retired,active])for(const s of exitRoute(level,c.world,id)){
  const before=c;c=stepWet(level,c.session,c.world,[{mercenaryId:id,action:s.action}]);expectHeads(level,c);
  if(id===active&&!c.world.mission.exited[active]&&c.session.wet!.actors[active]!.current===c.session.wet!.actors[retired]!.current)reused=true;
  for(let a=0;a<4;a++)expect(c.session.wet!.actors[a]!.old).toBe(before.session.wet!.actors[a]!.current);
  if(!s.exits){c=advance(level,c,1);expectHeads(level,c);c=stepWet(level,c.session,c.world,[{mercenaryId:id,action:'turn-right'}]);expectHeads(level,c);c=stepWet(level,c.session,c.world,[{mercenaryId:id,action:'turn-left'}]);expectHeads(level,c);}
 }
 expect(c.world.mission.exited[retired]).toBe(true);expect(c.world.mission.exited[active]).toBe(true);
 expect(reused).toBe(true);expect(level.layers).toEqual(immutable);
 expect(replayWet(level,baseline,[1,0,3,4],c.session.wet!.rules,c.session.wet!.history)).toEqual({world:c.world,session:c.session});
 for(const [i,w] of c.session.wet!.overlays)expect((w&0xf07e07fd)>>>0).toBe((level.layers[0][i]!&0xf07e07fd)>>>0);
});
it.each([false,true])('scheduled dry delay survives return between pulses; reentry=%s',async(reenter)=>{
 const {level,c:base}=await fixture();let c=advance(level,base,29);c=stepWet(level,c.session,c.world,[{mercenaryId:3,action:'forward'}]);c=advance(level,c,19);
 expect(c.session.wet!.actors[3]!.delay).toBe(2);expect(c.session.wet!.fallCounter).toBe(1);
 c=stepWet(level,c.session,c.world,[{mercenaryId:3,action:'backward'}]);expect(c.session.wet!.fallCounter).toBe(2);expect(c.session.wet!.actors[3]!.delay).toBe(2);expect(c.session.wet!.actors[3]!.itemPasses).toBe(1);
 c=stepWet(level,c.session,c.world,reenter?[{mercenaryId:3,action:'forward'}]:[]);expect(c.session.wet!.actors[3]!.delay).toBe(2);
 c=advance(level,c,3);expect(c.world.tick).toBe(54);expect(c.session.wet!.actors[3]!.delay).toBe(2);
 c=advance(level,c,1);expect(c.session.wet!.actors[3]!.delay).toBe(reenter?1:0);
});
it('snapshot collection boundary is inclusive for objects and arrays without reading getters',()=>{
 const object=Object.fromEntries(Array.from({length:32000},(_,i)=>['k'+i,0]));expect(Object.keys(wetSnapshot(object))).toHaveLength(32000);
 expect(()=>wetSnapshot({...object,extra:0})).toThrow('collection budget');expect(wetSnapshot(Array(32000).fill(0))).toHaveLength(32000);expect(()=>wetSnapshot(Array(32001).fill(0))).toThrow('collection budget');
 let reads=0;Object.defineProperty(object,'k0',{get(){reads++;return 0;},enumerable:true});expect(()=>wetSnapshot(object)).toThrow('descriptors');expect(reads).toBe(0);
});
it('live synthetic tick owns four heads, water flags, old/current refs, arrival markers, counters and no descent',async()=>{
 const {level,c:base,target}=await fixture();const i=cellIndex(level,target);level.layers[0][i]=((10<<28)|32|4|(2<<17))>>>0;level.layers[2][i]=0xffffffff;
 let c:TrainingCandidate=stepWet(level,base.session,base.world,[{mercenaryId:3,action:'forward'}]);expect(c.world.mercenaries[3]).toEqual({...target,id:3});expect(c.session.wet!.actors[3]!.entries).toBe(1);
 const head=c.session.wet!.overlays.find(x=>x[0]===i)!;expect(head[1]&4).toBe(4);expect(head[1]>>>28).toBe(10);expect(head[2]).toBe(0xdfffffff);
 c=advance(level,c,6);expect(c.session.wet!.actors[3]!.delay).toBe(2);c=advance(level,c,6);expect(c.session.wet!.actors[3]!.delay).toBe(1);c=advance(level,c,6);expect(c.session.wet!.actors[3]!.delay).toBe(0);expect(c.world.mercenaries[3]).toEqual({...target,id:3});expect(base.world.tick).toBe(0);expect(base.session.wet!.overlays).toHaveLength(4);
});
it('drowning BEFORE controls, source party/race gate and replay equality; wait/turn/blocked never create entries',async()=>{
 const {level,c:base,baseline,target}=await fixture();const c=stepWet(level,base.session,base.world,[{mercenaryId:3,action:'forward'}]);
 let waiting=advance(level,c,48);expect(waiting.session.wet!.actors[3]!.body.underwaterCount).toBe(0);
 const returned=stepWet(level,waiting.session,waiting.world,[{mercenaryId:3,action:'backward'}]);expect(returned.session.wet!.actors[3]!.body.underwaterCount).toBe(1);expect(returned.world.mercenaries[3]).toEqual({...level.starts[3]!,id:3});
 const dry=advance(level,returned,50);expect(dry.session.wet!.actors[3]!.body.underwaterCount).toBe(0);expect(replayWet(level,baseline,[1,0,3,4],dry.session.wet!.rules,dry.session.wet!.history)).toEqual({world:dry.world,session:dry.session});
 waiting=stepWet(level,c.session,c.world,[{mercenaryId:3,action:'turn-left'}]);level.layers[0][cellIndex(level,{...target,x:target.x-1})]=2;
 const blocked=stepWet(level,waiting.session,waiting.world,[{mercenaryId:3,action:'forward'}]);expect(blocked.events[0]!.kind).toBe('blocked');expect(waiting.session.wet!.actors[3]!.entries).toBe(1);
});
it.each(['runtimeDeadWord','control','corpse','pad','pending','support','damage','zero damage'] as const)('unsupported %s refuses the complete prospective state atomically',async(kind)=>{
 const {level,c:base,target}=await fixture();const c=stepWet(level,base.session,base.world,[{mercenaryId:3,action:'forward'}]),a=c.session.wet!.actors[3]!;
 if(kind==='runtimeDeadWord')a.runtimeDeadWord=1;if(kind==='control')a.body.controlMethod=0;if(kind==='corpse')c.session.wet!.corpses.push(1);if(kind==='pad')c.session.wet!.pads.push(1);if(kind==='pending')a.pending=1;
 if(kind==='support')level.layers[0][cellIndex(level,{...target,z:target.z-1})]=0;
 if(kind==='damage'||kind==='zero damage'){c.session.wet!.drownCounter=49;a.body.underwaterCount=25;if(kind==='zero damage'){a.body.physique=655;a.body.underwaterCount=65535;expect(transitionImmersion({actor:a.body,cellLong:level.layers[0][cellIndex(level,target)]!,items:c.session.items}).damageRequest).toEqual({requestedHit:0});}}
 const saved=structuredClone(c);expect(()=>stepWet(level,c.session,c.world,[{mercenaryId:3,action:'backward'}])).toThrow('refused atomically');expect(c).toEqual(saved);
});
it('inventory BEFORE immunity; race4 nonimmune, race1/97 immune, 100 only skips inventory, tail/actions intact',async()=>{
 const {c,level,target}=await fixture(),body=c.session.wet!.actors[3]!.body;
 const slot={itemId:1,damage:1,ammo:7,fourthByte:199,rawHex:'010107c7'};body.inventory.carried.fill(slot);body.inventory.actions.fill(slot);
 for(const [race,spell,count,status] of [[4,0,1,'processed'],[1,0,0,'processed'],[4,97,0,'processed'],[4,100,1,'skipped']] as const){const result=transitionImmersion({actor:{...body,race,spellWater:spell},cellLong:level.layers[0][cellIndex(level,target)]!,items:c.session.items});expect(result.candidate.underwaterCount).toBe(count);expect(result.inventoryStatus).toBe(status);expect(result.candidate.inventory.carried[0]!.damage).toBe(status==='processed'?2:1);expect(result.candidate.inventory.carried[16]).toEqual(slot);expect(result.candidate.inventory.actions).toEqual(body.inventory.actions);}
});
it('snapshot rejects accessors without reads, swapped prototypes, sparse arrays, cycles, over-depth and exponential work',()=>{
 let reads=0;const getter={get history(){reads++;return [];}};expect(()=>wetSnapshot(getter)).toThrow();expect(reads).toBe(0);
 for(const bad of [Object.setPrototypeOf({a:1},Array.prototype),Object.setPrototypeOf([],Object.prototype),Array(2)])expect(()=>wetSnapshot(bad)).toThrow();
 let dag:unknown=0;for(let i=0;i<20;i++)dag={a:dag,b:dag};expect(()=>wetSnapshot(dag)).toThrow('budget');const cycle:unknown[]=[];cycle.push(cycle);expect(()=>wetSnapshot(cycle)).toThrow();
 expect(()=>wetHistory([{count:WET_LIMITS.ticks+1,commands:[]}])).toThrow('budget');expect(()=>wetHistory(Array(129).fill({count:1,commands:[]}))).toThrow('budget');
});
const enabled=!!process.env.HIRED_GUNS_T43_CASE_INPUTS;
it.skipIf(!enabled)('private original retirement ownership and scheduled return/reentry persist through v15 recovery',async()=>{
 const manifest=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8')),w=JSON.parse(await readFile(manifest.casePath,'utf8'));
 const raw={map:new Uint8Array(await readFile(manifest.inputs.map)),roster:new Uint8Array(await readFile(manifest.inputs.roster)),items:new Uint8Array(await readFile(manifest.inputs.items))};
 const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[11,3,0,5]);
 for(const order of [[3,0,1,2]]){
  const start=structuredClone(base);start.world.mission.rules={mode:'cooperative-extraction',timeLimit:99};let c=await activateWet(level,raw,start.session,start.world,true);
  for(const id of order)for(const s of exitRoute(level,c.world,id)){
   c=stepWet(level,c.session,c.world,[{mercenaryId:id,action:s.action}]);expectHeads(level,c);
   const json=await exportTrainingSession(level,c.world,c.session,raw);const restored=await importTrainingSession(level,raw,json);expect(restored).toEqual({world:c.world,session:c.session});
   c=advance(level,restored,1);expectHeads(level,c);
  }
 }
 let entered=await activateWet(level,raw,base.session,base.world,true);
 for(const s of w.dryApproach)entered=stepWet(level,entered.session,entered.world,[{mercenaryId:3,action:s.action}]);
 entered=stepWet(level,entered.session,entered.world,[{mercenaryId:3,action:w.entry.action}]);entered=advance(level,entered,19);
 for(const reenter of [false,true]){
  let c:TrainingCandidate=stepWet(level,entered.session,entered.world,[{mercenaryId:3,action:w.return.action}]);expect(c.world.tick).toBe(50);expect(c.session.wet!.actors[3]!.delay).toBe(2);expect(c.session.wet!.actors[3]!.body).toEqual(w.helperInvocations.first.candidate);
  const json=await exportTrainingSession(level,c.world,c.session,raw);expect(JSON.parse(json).checkpoint.state.actors[3].delay).toBe(2);const restored=await importTrainingSession(level,raw,json);expect(restored).toEqual({world:c.world,session:c.session});
  const commands:PlayerCommand[]=reenter?[{mercenaryId:3,action:w.entry.action}]:[];c=stepWet(level,restored.session,restored.world,commands);c=advance(level,c,4);expect(c.session.wet!.actors[3]!.delay).toBe(reenter?1:0);
  const bad=JSON.parse(json);bad.checkpoint.state.actors[3].delay=0;await expect(importTrainingSession(level,raw,JSON.stringify(bad))).rejects.toThrow();
 }
},120000);
it.skipIf(!enabled)('private pinned case helper oracle, chronological v15 recovery, tamper/source/late snapshot, Retry and boundary',async()=>{
 const manifest=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8'));
 const witness=JSON.parse(await readFile(manifest.casePath,'utf8'));
 const raw={map:new Uint8Array(await readFile(manifest.inputs.map)),roster:new Uint8Array(await readFile(manifest.inputs.roster)),items:new Uint8Array(await readFile(manifest.inputs.items))};
 const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[11,3,0,5]);let c=await activateWet(level,raw,base.session,base.world,true);const initial=c;
 for(const s of witness.dryApproach)c=stepWet(level,c.session,c.world,[{mercenaryId:3,action:s.action}]);
 const before=await exportTrainingSession(level,c.world,c.session,raw);expect(await importTrainingSession(level,raw,before)).toEqual({world:c.world,session:c.session});
 c=stepWet(level,c.session,c.world,[{mercenaryId:3,action:witness.entry.action}]);while(c.world.tick%50)c=stepWet(level,c.session,c.world,[]);
 expect(c.session.wet!.actors[3]!.body).toEqual(witness.helperInvocations.first.candidate);const saved=await exportTrainingSession(level,c.world,c.session,raw);
 expect(await importTrainingSession(level,raw,saved)).toEqual({world:c.world,session:c.session});
 const value=JSON.parse(saved);
 for(const mutate of [(s:typeof value)=>s.checkpoint.state.actors[3].body.underwaterCount++,(s:typeof value)=>s.checkpoint.state.overlays[0][1]^=4,(s:typeof value)=>s.checkpoint.state.actors[3].body.inventory.carried[0].damage++,(s:typeof value)=>s.checkpoint.world.mission.winner=0,(s:typeof value)=>s.sources.map='0'.repeat(64),(s:typeof value)=>s.history.reverse(),(s:typeof value)=>s.checkpoint.state.fallCounter++]){const bad=structuredClone(value);mutate(bad);await expect(importTrainingSession(level,raw,JSON.stringify(bad))).rejects.toThrow();}
 const ownedRaw=structuredClone(raw),ownedLevel=structuredClone(level),pending=importTrainingSession(ownedLevel,ownedRaw,saved);ownedRaw.map.fill(0);ownedRaw.roster.fill(0);ownedRaw.items.fill(0);ownedLevel.layers[0].fill(0);expect(await pending).toEqual({world:c.world,session:c.session});
 let reads=0;const accessors={...raw};Object.defineProperty(accessors,'map',{get(){reads++;return raw.map;},enumerable:true});await expect(importTrainingSession(level,accessors,saved)).rejects.toThrow('descriptors');expect(reads).toBe(0);
 const shadowed=structuredClone(raw);Object.defineProperty(shadowed.map,'byteLength',{get(){reads++;throw Error('must not read');}});expect(await importTrainingSession(level,shadowed,saved)).toEqual({world:c.world,session:c.session});expect(reads).toBe(0);
 const badRaw=structuredClone(raw);badRaw.map[0]=badRaw.map[0]!^1;await expect(importTrainingSession(level,badRaw,saved)).rejects.toThrow();
 c=stepWet(level,c.session,c.world,[{mercenaryId:3,action:witness.return.action}]);while(c.world.tick%50)c=stepWet(level,c.session,c.world,[]);expect(c.session.wet!.actors[3]!.body.underwaterCount).toBe(0);const returned=await exportTrainingSession(level,c.world,c.session,raw);expect(await importTrainingSession(level,raw,returned)).toEqual({world:c.world,session:c.session});expect(resetTrainingInventory(c.session,level)).toEqual(initial.session);
},120000);

it('seeded scheduler tests signed drowning gate, unsigned fall gate and one subtract, independent of controls',async()=>{
 const {level,c}=await fixture();c.world.rng=0x81234567;c.session.wet!.drownCounter=32767;c.session.wet!.fallCounter=65535;
 const result=stepWet(level,c.session,c.world,[{mercenaryId:0,action:'turn-right'}]);expect(result.session.wet!.drownCounter).toBe(32768);expect(result.session.wet!.fallCounter).toBe(0);expect(result.world.rng).toBe(0x81234567);
 c.session.wet!.fallCounter=100;c.session.wet!.drownCounter=49;const gate=stepWet(level,c.session,c.world,[]);expect(gate.session.wet!.drownCounter).toBe(0);expect(gate.session.wet!.fallCounter).toBe(95);
 c.world.tick=WET_LIMITS.ticks;expect(()=>stepWet(level,c.session,c.world,[])).toThrow('future tick budget');
});
