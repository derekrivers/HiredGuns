import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createDemoLevel } from '../src/demo';
import { cellIndex, type PlayerCommand } from '../src/contracts';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import { importCharacters, CHARACTER_FILE_BYTES } from '../src/import/characters';
import { importEditorMap } from '../src/import/editor-map';
import { constructInitialTeam } from '../src/import/original-team';
import { transitionImmersion } from '../src/character/immersion-caller';
import { damageOrdinaryFloorFitness } from '../src/character/damage-fitness';
import { initialWetLifecycle, damageWetCandidate, stepWetLifecycle, replayWetLifecycle, activateWetLifecycle, serializeWetLifecycle, wetLifecycleMap, encodeLifecycleHistory, decodeLifecycleHistory } from '../src/sim/training-wet-lifecycle';
import { createTrainingSession, exportTrainingSession, importTrainingSession, resetTrainingInventory, type TrainingSession, type TrainingCandidate } from '../src/sim/training-session';
import { stepWet, WET_LIMITS } from '../src/sim/training-wet';
import { exitRoute } from './helpers/extraction-route';
import { resolveTraversal } from '../src/sim/traversal';
import type { Facing, Position } from '../src/contracts';
async function fixture(){
 const level=createDemoLevel(),items=await importItems(new Uint8Array(ITEM_FILE_BYTES)),roster=await importCharacters(new Uint8Array(CHARACTER_FILE_BYTES));
 for(const r of roster.records)Object.assign(r.stats,{physique:100,agility:100});
 const initial=constructInitialTeam(roster,items,[11,3,0,5]);
 const team={profile:'ocs-initial-team-v1',sources:{roster:roster.source,items:items.source},actors:initial.actors.map(a=>({...a,weight:{...a.weight,status:'verified'}}))};
 const baseline={team,items,indices:[11,3,0,5],names:['A','B','C','D'],encounter:null,inventory:{commands:[],actors:[]},gate:null,ground:null} as unknown as TrainingSession;
 const c=initialWetLifecycle(level,baseline,[1,0,3,4],{mode:'navigation',timeLimit:null});return {level,baseline,c};
}
function step(level:Parameters<typeof stepWetLifecycle>[0],c:TrainingCandidate,n:number,commands:PlayerCommand[]=[]){for(let i=0;i<n;i++)c=stepWetLifecycle(level,c.session,c.world,commands);return c;}
it.each([[654,0,654,true],[655,0,655,false],[755,100,655,false],[754,100,654,true],[100,200,100,true],[100,100,0,true]])('fitness %i / hit %i respects low-band versus overdamage',async(fitness,hit,after,dead)=>{
 const {level,c}=await fixture();c.session.wet!.actors[3]!.body.fitness=fitness;
 const before=structuredClone(c),r=damageWetCandidate(level,c,3,hit),a=r.session.wet!.actors[3]!;
 expect(a.body.fitness).toBe(after);expect(a.runtimeDeadWord).toBe(dead?0xff00:0);expect(a.body.statsDeadWord).toBe(a.runtimeDeadWord);
 expect(r.session.wetLifecycle!.actors[3]!.fireWhite).toBe(255);expect(c).toEqual(before);
 if(dead){expect(a.current).toBe(before.session.wet!.actors[3]!.current);expect(a.old).toBe(a.current);expect(r.session.wetLifecycle!.actors[3]!.death!.target).toBe(a.current);}
});
it.each([0,1,6553500,6553600,0xffffffff])('reuses unsigned numerical core for hit %i, including DIVU fallback',async hit=>{
 const {level,c}=await fixture(),a=c.session.wet!.actors[0]!,p=c.world.mercenaries[0]!,i=a.current;
 // Independent accepted ordinary-floor oracle for identical geometry/numbers.
 level.layers[0][i]=1;level.layers[0][cellIndex(level,{...p,z:0})]=0;
 const input={death:{actor:{partyIndex:0,direction:0,x:p.x,y:p.y,floor:p.z,mapPosition:i,oldMapPosition:i,statsDeadWord:0,runtimeDeadWord:0,controlMethod:1,windowType:0,fitness:65535,fallDamage:0,underwaterCount:0,drowningCount:0,waterFallDelay:0},leaders:[0,0] as [number,number],cell:{mapPosition:i,first:1|(32<<11)|2,second:0,belowFirst:0}},physique:100,spellShield:0,cheatMode2:0,cheatMode3:0,fireWhite:0,fitnessFlashDuration:0,gruntCount:0};
 c.session.wet!.overlays.find(x=>x[0]===i)![1]=input.death.cell.first;
 const oracle=damageOrdinaryFloorFitness(input,hit),r=damageWetCandidate(level,c,0,hit);
 expect(r.session.wet!.actors[0]!.body.fitness).toBe(oracle.candidate.death.actor.fitness);expect(r.session.wetLifecycle!.actors[0]!.lastDamage).toBe(oracle.arithmetic!.damage);expect(r.session.wetLifecycle!.actors[0]!.fitnessFlashDuration).toBe(oracle.candidate.fitnessFlashDuration);
 expect(r.session.wet!.actors[0]!.runtimeDeadWord).toBe(oracle.candidate.death.actor.runtimeDeadWord);
});
it('fatal wet stair preserves full state, redirects corpse, clears both leaders and guards controls; living actor reuses freed pose',async()=>{
 const {level,c}=await fixture(),dead=3,a=c.session.wet!.actors[dead]!,p=c.world.mercenaries[dead]!,i=a.current;
 level.layers[0][i]=(4|(2<<17)|(10<<28)|32)>>>0;const overlay=c.session.wet!.overlays.find(x=>x[0]===i)!;overlay[1]=((overlay[1]!&~(1|0xf0000020))|level.layers[0][i]!)>>>0;
 level.layers[1].fill(0x89abcdef);level.layers[2].fill(0xabcdef12);c.session.wet!.leader=4;c.session.wetLifecycle!.leader2=4;a.body.fitness=654;a.body.underwaterCount=77;a.delay=2;
 const before=structuredClone(c),d=damageWetCandidate(level,c,dead,0),h=d.session.wetLifecycle!.actors[dead]!,target=cellIndex(level,{...p,y:p.y-1});
 expect(h.death!.target).toBe(target);expect(h.death!.trace.map(x=>x.branch)).toEqual(['find-floor','north','find-floor']);
 expect(d.session.wet!.actors[dead]!.body.inventory).toEqual(a.body.inventory);expect(d.session.wet!.actors[dead]!.body.weight).toEqual(a.body.weight);
 expect(d.session.wet!.actors[dead]!.body.underwaterCount).toBe(77);expect(d.session.wet!.actors[dead]!.delay).toBe(2);expect(d.session.wet!.leader).toBe(0);expect(d.session.wetLifecycle!.leader2).toBe(0);
 const map=wetLifecycleMap(level,d.session);expect(map.layers[0][i]!&~0xf07e07fd).toBe(0);expect(map.layers[0][target]!&0xf0000020).toBe(0x70000020);expect(map.layers[1][target]).toBe(((0x89abcdef&0xfff00fff)|(3<<12))>>>0);expect(map.layers[2][target]).toBe(0xabcdef12);
 let next=step(level,d,1,[{mercenaryId:3,action:'forward'}]);expect(next.world.mercenaries[3]).toEqual(p);expect(next.session.wetLifecycle!.actors[3]).toEqual(h);expect(next.session.wet!.actors[3]!.delay).toBe(2);
 // Real steps from slot 3 into the source-freed wet pose (no relocation).
 next=step(level,next,2,[{mercenaryId:2,action:'strafe-right'}]);expect(next.world.mercenaries[2]).toMatchObject({...p,id:2});
 expect(next.session.wetLifecycle!.actors[3]).toEqual(h);expect(wetLifecycleMap(level,next.session).layers[1][target]).toBe(map.layers[1][target]);expect(c).toEqual(before);
});
it('party order, fatal continuation and scheduler gates preserve one candidate; v15 still refuses damage',async()=>{
 const {level,c}=await fixture();
 for(let id=0;id<4;id++){const a=c.session.wet!.actors[id]!,i=a.current;level.layers[0][i]=4|(2<<17);c.session.wet!.overlays.find(x=>x[0]===i)![1]|=4|(2<<17);a.body.fitness=1000;a.body.underwaterCount=30;}
 c.session.wet!.drownCounter=49;c.session.wet!.fallCounter=6;const prior=structuredClone(c),r=stepWetLifecycle(level,c.session,c.world,[{mercenaryId:3,action:'forward'}]);
 expect(r.events.filter(e=>e.kind==='died').map(e=>e.mercenaryId)).toEqual([1,2,3]);expect(r.session.wet!.actors[0]!.body.underwaterCount).toBe(0);expect(r.session.wet!.actors[0]!.delay).toBe(2);
 for(const id of [1,2,3]){expect(r.session.wet!.actors[id]!.delay).toBe(0);expect(r.world.mercenaries[id]).toEqual(c.world.mercenaries[id]);}
 expect(r.session.wet!.fallCounter).toBe(1);expect(c).toEqual(prior);
 const legacy={...c.session};delete (legacy as {wetLifecycle?:unknown}).wetLifecycle;const staticWorld={...c.world,physics:{mode:'static' as const}};
 expect(()=>stepWet(level,legacy,staticWorld,[])).toThrow('damage request');
});
it('refuses unsupported fatal search before inventory, counters, fitness or any actor is exposed',async()=>{
 const {level,c}=await fixture(),i=c.session.wet!.actors[3]!.current;
 level.layers[0][i]=((10<<28)|32|4|(2<<17))>>>0;c.session.wet!.overlays.find(x=>x[0]===i)![1]=((44<<11)|(3<<23)|2|level.layers[0][i]!)>>>0;level.layers[0][i-level.size.width]=((12<<28)|32)>>>0;
 c.session.wet!.actors[3]!.body.fitness=654;const before=structuredClone(c);expect(()=>damageWetCandidate(level,c,3,0)).toThrow('door');expect(c).toEqual(before);
});
it('prospective event/tick budgets and invalid controls refuse complete candidates',async()=>{
 const {level,c}=await fixture();c.world.tick=WET_LIMITS.ticks;const before=structuredClone(c);expect(()=>step(level,c,1)).toThrow('tick budget');expect(c).toEqual(before);
 c.world.tick=0;c.session.wet!.history=Array.from({length:128},(_,i)=>({count:1,commands:[{mercenaryId:0,action:i%2?'turn-left' as const:'turn-right' as const}]}));expect(()=>step(level,c,1)).toThrow('event budget');
});
it.each([false,true])('v16 return50 retains delay2 until scheduled55; reenter=%s',async reenter=>{
 const {level,c:initial,baseline}=await fixture(),target={...level.starts[3]!,y:7};level.layers[0][cellIndex(level,target)]=4|(2<<17);
 let c=step(level,initial,29);c=step(level,c,1,[{mercenaryId:3,action:'forward'}]);c=step(level,c,19);expect(c.world.tick).toBe(49);expect(c.session.wet!.actors[3]!.delay).toBe(2);
 c=step(level,c,1,[{mercenaryId:3,action:'backward'}]);expect(c.session.wet!.drownCounter).toBe(0);expect(c.session.wet!.fallCounter).toBe(2);expect(c.session.wet!.actors[3]!.delay).toBe(2);expect(c.session.wet!.actors[3]!.body.underwaterCount).toBe(1);
 c=step(level,c,1,reenter?[{mercenaryId:3,action:'forward'}]:[]);c=step(level,c,3);expect(c.session.wet!.actors[3]!.delay).toBe(2);c=step(level,c,1);expect(c.session.wet!.actors[3]!.delay).toBe(reenter?1:0);
 expect(replayWetLifecycle(level,baseline,[1,0,3,4],c.session.wet!.rules,c.session.wet!.history)).toEqual({session:c.session,world:c.world});
});
it.each([87,88])('shield %i and wrapped feedback use exact storage; unsupported cheats/grunt refuse',async shield=>{
 const {level,c}=await fixture(),h=c.session.wetLifecycle!.actors[0]!;h.spellShield=shield;h.fitnessFlashDuration=255;
 const r=damageWetCandidate(level,c,0,800);expect(r.session.wetLifecycle!.actors[0]!.lastDamage).toBe(shield===87?100:800);expect(r.session.wetLifecycle!.actors[0]!.fitnessFlashDuration).toBe(shield===87?0:1);
 for(const field of ['cheatMode2','cheatMode3','gruntCount'] as const){const bad=structuredClone(c);bad.session.wetLifecycle!.actors[0]![field]=field==='gruntCount'?100:1;const before=structuredClone(bad);expect(()=>damageWetCandidate(level,bad,0,800)).toThrow();expect(bad).toEqual(before);}
});
it('prospective exact UTF8 byte bound refuses before exposing a tick',async()=>{
 const {level,c}=await fixture(),source=c.session.team.sources.roster;
 const initial=new TextEncoder().encode(serializeWetLifecycle(c)).length;
 source.sha256+='x'.repeat(24575-initial);expect(new TextEncoder().encode(serializeWetLifecycle(c)).length).toBe(24575);
 const before=structuredClone(c);expect(()=>step(level,c,1,[{mercenaryId:0,action:'turn-left'}])).toThrow('save byte budget');expect(c).toEqual(before);source.sha256+='x';expect(()=>serializeWetLifecycle(c)).toThrow('save byte budget');
});
it('blocked search has no corpse; existing owned corpse replacement refuses without losing any state',async()=>{
 const {level,c}=await fixture(),a=c.session.wet!.actors[3]!,i=a.current,p=c.world.mercenaries[3]!;
 level.layers[0][i]=((10<<28)|32|4|(2<<17))>>>0;c.session.wet!.overlays.find(x=>x[0]===i)![1]=((44<<11)|(3<<23)|2|level.layers[0][i]!)>>>0;
 level.layers[0][cellIndex(level,{...p,y:p.y-1})]=2;a.body.fitness=654;
 const r=damageWetCandidate(level,c,3,0);expect(r.session.wet!.corpses).toEqual([]);expect(r.session.wetLifecycle!.actors[3]!.death!.outcome).toBe('blocked-no-skeleton');expect(r.session.wet!.actors[3]!.runtimeDeadWord).toBe(0xff00);
 const base=await fixture();base.c.session.wet!.actors[0]!.body.fitness=654;const d=damageWetCandidate(base.level,base.c,0,0);const next=step(base.level,d,2,[{mercenaryId:1,action:'strafe-left'}]);
 next.session.wet!.actors[1]!.body.fitness=654;const before=structuredClone(next);expect(()=>damageWetCandidate(base.level,next,1,0)).toThrow('replacement');expect(next).toEqual(before);
});
it.each([[3,0],[0,3],[2,1],[1,2]])('lifecycle retirement %i then %i preserves heads before active writes',async(retired,follower)=>{
 const {level,baseline}=await fixture();level.id='synthetic-extraction-v1';level.layers[0][cellIndex(level,level.exit)]=(3<<11)|2;
 for(const x of [5,7])level.layers[0][cellIndex(level,{x,y:1,z:1})]=2;
 let c=initialWetLifecycle(level,baseline,[1,0,3,4],{mode:'cooperative-extraction',timeLimit:2}),reused=false;
 for(const id of [retired,follower])for(const s of exitRoute(level,c.world,id)){
  c=stepWetLifecycle(level,c.session,c.world,[{mercenaryId:id,action:s.action}]);
  if(id===follower&&!c.world.mission.exited[id]&&c.session.wet!.actors[id]!.current===c.session.wet!.actors[retired]!.current)reused=true;
  const map=wetLifecycleMap(level,c.session);
  for(let a=0;a<4;a++){const i=cellIndex(level,c.world.mercenaries[a]!),owner=c.world.mercenaries.findIndex((p,j)=>!c.world.mission.exited[j]&&cellIndex(level,p)===i),w=map.layers[0][i]!;
   expect(w&~0xf07e07fd).toBe(owner<0?0:(((32+owner*4+c.world.mercenaries[owner]!.facing)<<11)|(owner<<23)|2)&~0xf07e07fd);
  }
 }
 expect(reused).toBe(true);expect(replayWetLifecycle(level,baseline,[1,0,3,4],c.session.wet!.rules,c.session.wet!.history)).toEqual({session:c.session,world:c.world});
});
it('cooperative living/dead mix never turns death into extraction and times out with Retry coherent',async()=>{
 const {level,baseline}=await fixture();level.id='synthetic-extraction-v1';level.layers[0][cellIndex(level,level.exit)]=(3<<11)|2;
 let c=initialWetLifecycle(level,baseline,[1,0,3,4],{mode:'cooperative-extraction',timeLimit:2});c.session.wet!.actors[0]!.body.fitness=654;c=damageWetCandidate(level,c,0,0);
 for(const id of [3,2,1])for(const s of exitRoute(level,c.world,id))c=stepWetLifecycle(level,c.session,c.world,[{mercenaryId:id,action:s.action}]);
 expect(c.world.mission.exited).toEqual([false,true,true,true]);expect(c.world.mission.outcome).toBe('active');while(c.world.tick<1202)c=stepWetLifecycle(level,c.session,c.world,[]);
 expect(c.world.mission.outcome).toBe('failed');expect(stepWetLifecycle(level,c.session,c.world,[]).world).toEqual(c.world);expect(resetTrainingInventory(c.session,level)).toEqual(initialWetLifecycle(level,baseline,[1,0,3,4],c.world.mission.rules).session);
});
it.each([0,1,2,3].flatMap(dead=>[0,1,2,3].filter(follower=>follower!==dead).map(follower=>[dead,follower])))('death/follower ID order %i -> %i retains corpse and complete active heads',async(dead,follower)=>{
 const {level,c:initial}=await fixture();initial.session.wet!.actors[dead]!.body.fitness=654;let c=damageWetCandidate(level,initial,dead,0);
 const target=c.session.wet!.actors[dead]!.current,key=(p:Position)=>cellIndex(level,p),queue=[{p:c.world.mercenaries[follower]!,path:[] as Facing[]}],seen=new Set([key(queue[0]!.p)]);let route:Facing[]|null=null;
 for(const n of queue){if(key(n.p)===target){route=n.path;break;}for(const d of [0,1,2,3] as Facing[]){const r=resolveTraversal(level,n.p,d,p=>c.world.mercenaries.some((o,id)=>id!==dead&&id!==follower&&key(o)===key(p)));const p={...r.target,facing:0 as const,id:follower};if(!r.reason&&!seen.has(key(p))){seen.add(key(p));queue.push({p,path:[...n.path,d]});}}}
 expect(route).not.toBeNull();const corpse=structuredClone(c.session.wetLifecycle!.second),deadActor=structuredClone(c.session.wet!.actors[dead]!);
 for(const d of route!){c=stepWetLifecycle(level,c.session,c.world,[{mercenaryId:follower,action:(['forward','strafe-right','backward','strafe-left'] as const)[d]}]);
  const map=wetLifecycleMap(level,c.session);for(let id=0;id<4;id++){const i=key(c.world.mercenaries[id]!),owner=c.world.mercenaries.findIndex((p,j)=>j!==dead&&key(p)===i),w=map.layers[0][i]!;expect(w&~0xf07e07fd).toBe(owner<0?0:(((32+owner*4+c.world.mercenaries[owner]!.facing)<<11)|(owner<<23)|2)&~0xf07e07fd);}
 }
 expect(c.session.wet!.actors[follower]!.current).toBe(target);c=step(level,c,30);expect(c.session.wet!.actors[dead]).toEqual(deadActor);expect(c.session.wetLifecycle!.second).toEqual(corpse);expect(wetLifecycleMap(level,c.session).layers[0][target]!&0xf0000020).toBe(0x70000020);
});
const enabled=!!process.env.HIRED_GUNS_T43_CASE_INPUTS;
it('v16 compact idle/command chronology admits 200 internal segments without relaxing 128 events or tick budgets',()=>{
 const events=Array.from({length:100},(_,i)=>[{count:7,commands:[]},{count:1,commands:[{mercenaryId:i%4,action:'turn-left' as const}]}]).flat();
 const packed=encodeLifecycleHistory(events);expect(packed).toHaveLength(100);expect(packed.every(e=>e.idle===7&&e.count===1)).toBe(true);expect(decodeLifecycleHistory(packed)).toEqual(events);
 const boundary=Array.from({length:128},()=>({idle:0,count:1,commands:[{mercenaryId:0,action:'turn-left' as const}]}));expect(decodeLifecycleHistory(boundary)).toHaveLength(128);expect(()=>decodeLifecycleHistory([...boundary,boundary[0]])).toThrow('event budget');
 expect(decodeLifecycleHistory([{idle:45000,count:0,commands:[]}])).toEqual([{count:45000,commands:[]}]);expect(()=>decodeLifecycleHistory([{idle:45000,count:1,commands:boundary[0]!.commands}])).toThrow('tick budget');
 for(const value of [[{idle:0,count:0,commands:[]}],[{idle:1,count:0,commands:[]},boundary[0]],[{idle:0,count:1,commands:[]}],[{idle:1,count:1,commands:boundary[0]!.commands,extra:0}]])expect(()=>decodeLifecycleHistory(value)).toThrow();
 let reads=0;const getter={...boundary[0]};Object.defineProperty(getter,'idle',{get(){reads++;return 0;},enumerable:true});expect(()=>decodeLifecycleHistory([getter])).toThrow('descriptors');expect(reads).toBe(0);
});
it.skipIf(!enabled)('private original actual route: first injury, fatal north corpse, complete replay/recovery/tamper and Retry',async()=>{
 const m=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8')),w=JSON.parse(await readFile(m.casePath,'utf8'));
 const raw={map:new Uint8Array(await readFile(m.inputs.map)),roster:new Uint8Array(await readFile(m.inputs.roster)),items:new Uint8Array(await readFile(m.inputs.items))};
 const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[11,3,0,5]);let c=await activateWetLifecycle(level,raw,base.session,base.world,true);const initial=c;
 for(const s of w.dryApproach)c=stepWetLifecycle(level,c.session,c.world,[{mercenaryId:3,action:s.action}]);c=stepWetLifecycle(level,c.session,c.world,[{mercenaryId:3,action:w.entry.action}]);
 let oracle=structuredClone(c.session.wet!.actors[3]!.body),requests=0;
 while(c.world.tick<1800){
  if(c.world.tick%50===49){const r=transitionImmersion({actor:oracle,cellLong:w.entry.sourceWord,items:c.session.items});oracle=r.candidate;if(r.damageRequest){requests++;const damage=Math.floor(r.damageRequest.requestedHit/oracle.physique)*100;if(damage>oracle.fitness)oracle.statsDeadWord=0xff00;else {oracle.fitness-=damage;if(oracle.fitness<655)oracle.statsDeadWord=0xff00;}}}
  c=stepWetLifecycle(level,c.session,c.world,[]);
  if(c.world.tick===1250||c.world.tick===1300||c.world.tick===1800){
   const json=await exportTrainingSession(level,c.world,c.session,raw);expect(await importTrainingSession(level,raw,json)).toEqual({session:c.session,world:c.world});
   if(c.world.tick===1300){expect(c.session.wet!.actors[3]!.body.fitness).toBe(60335);expect(c.session.wetLifecycle!.actors[3]!.lastHit).toBe(5200);}
  }
 }
 expect(requests).toBe(11);expect(c.session.wet!.actors[3]!.body.fitness).toBe(4535);expect(c.session.wet!.actors[3]!.body).toEqual(oracle);expect(c.session.wet!.actors[3]!.runtimeDeadWord).toBe(0xff00);
 const search=c.session.wetLifecycle!.actors[3]!.death!;expect(search.trace.map(x=>x.branch)).toEqual(['find-floor','north','find-floor']);expect(search.target).toBe(c.session.wet!.actors[3]!.current-level.size.width);
 const saved=JSON.parse(await exportTrainingSession(level,c.world,c.session,raw));
 // Own all caller state/bytes synchronously before hashing. Later mutation cannot
 // repair invalid evidence or alter a valid restore already in progress.
 const ownedRaw=structuredClone(raw),ownedMap=structuredClone(level),ownedSaved=structuredClone(saved);
 const pending=importTrainingSession(ownedMap,ownedRaw,JSON.stringify(ownedSaved));ownedRaw.map.fill(0);ownedRaw.roster.fill(0);ownedRaw.items.fill(0);ownedMap.layers[0].fill(0);ownedSaved.checkpoint.state.actors[3].body.fitness=0;
 expect(await pending).toEqual({session:c.session,world:c.world});
 let reads=0;const getters={...raw};Object.defineProperty(getters,'roster',{get(){reads++;return raw.roster;},enumerable:true});await expect(importTrainingSession(level,getters,JSON.stringify(saved))).rejects.toThrow('descriptors');expect(reads).toBe(0);
 for(const key of ['map','roster','items'] as const){const bad=structuredClone(raw);bad[key][0]=bad[key][0]!^1;await expect(importTrainingSession(level,bad,JSON.stringify(saved))).rejects.toThrow();}
 const mutations=[(s:typeof saved)=>s.checkpoint.state.actors[3].body.fitness--,(s:typeof saved)=>s.checkpoint.state.actors[3].runtimeDeadWord=0,(s:typeof saved)=>s.checkpoint.state.actors[3].body.statsDeadWord=0xff,(s:typeof saved)=>s.checkpoint.state.overlays[0][1]^=2,(s:typeof saved)=>s.checkpoint.lifecycle.second[0][1]^=4096,(s:typeof saved)=>s.checkpoint.lifecycle.actors[3].death.trace.pop(),(s:typeof saved)=>s.checkpoint.lifecycle.actors[3].death.target++,(s:typeof saved)=>s.checkpoint.state.drownCounter++,(s:typeof saved)=>s.checkpoint.world.mission.exited[3]=true,(s:typeof saved)=>s.sources.map='0'.repeat(64),(s:typeof saved)=>s.history.at(-1).count--];
 for(const mutate of mutations){const bad=structuredClone(saved);mutate(bad);await expect(importTrainingSession(level,raw,JSON.stringify(bad))).rejects.toThrow();}
 const restored=await importTrainingSession(level,raw,JSON.stringify(saved)),continued=step(level,restored,60,[{mercenaryId:3,action:'turn-left'}]);expect(continued.session.wetLifecycle!.actors[3]).toEqual(c.session.wetLifecycle!.actors[3]);expect(continued.session.wet!.actors[3]).toEqual(c.session.wet!.actors[3]);expect(resetTrainingInventory(c.session,level)).toEqual(initial.session);
 expect(replayWetLifecycle(level,base.session,initial.session.wet!.actors.map(a=>a.body.race),c.session.wet!.rules,c.session.wet!.history)).toEqual({session:c.session,world:c.world});
 expect(serializeWetLifecycle(c).length).toBeLessThan(24576);
},120000);

// Exercise the public save button dispatcher, including its synchronous boundary.
it.each([false,true])('public export rejects an own lifecycle accessor without reads (truthy=%s)',async truthy=>{
 const {level,c}=await fixture();let reads=0,sideEffects=0;
 const session=structuredClone(c.session);
 Object.defineProperty(session,'wetLifecycle',{enumerable:true,get(){reads++;sideEffects++;return truthy?c.session.wetLifecycle:undefined;}});
 await expect(exportTrainingSession(level,c.world,session,{roster:new Uint8Array(),items:new Uint8Array()})).rejects.toThrow('descriptors');
 expect(reads).toBe(0);expect(sideEffects).toBe(0);
});
it('public export rejects unsupported prototypes before own or inherited lifecycle getters',async()=>{
 const {level,c}=await fixture();let reads=0;
 for(const own of [false,true]){
  const session=structuredClone(c.session);delete (session as {wetLifecycle?:unknown}).wetLifecycle;
  const target=own?session:{};Object.defineProperty(target,'wetLifecycle',{enumerable:true,get(){reads++;return c.session.wetLifecycle;}});
  Object.setPrototypeOf(session,own?{}:target);
  await expect(exportTrainingSession(level,c.world,session,{roster:new Uint8Array(),items:new Uint8Array()})).rejects.toThrow('prototype');
 }
 expect(reads).toBe(0);
});
it.skipIf(!enabled)('private public export snapshots valid lifecycle and refuses invalid call-time data before await',async()=>{
 const m=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8'));
 const raw={map:new Uint8Array(await readFile(m.inputs.map)),roster:new Uint8Array(await readFile(m.inputs.roster)),items:new Uint8Array(await readFile(m.inputs.items))};
 const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[11,3,0,5]);
 const c=await activateWetLifecycle(level,raw,base.session,base.world,true);
 const expected=await exportTrainingSession(level,c.world,c.session,raw);
 expect(JSON.parse(expected).version).toBe(16);expect(await importTrainingSession(level,raw,expected)).toEqual(c);
 const supplied=structuredClone(c),map=structuredClone(level),bytes=structuredClone(raw);
 const pending=exportTrainingSession(map,supplied.world,supplied.session,bytes);
 supplied.session.wetLifecycle!.actors[3]!.requests++;supplied.world.tick++;map.layers[0].fill(0);bytes.map.fill(0);bytes.roster.fill(0);bytes.items.fill(0);
 expect(await pending).toBe(expected);
 let reads=0;const getter=structuredClone(c.session);
 Object.defineProperty(getter,'wetLifecycle',{configurable:true,enumerable:true,get(){reads++;throw Error('caller side effect');}});
 const refused=exportTrainingSession(level,c.world,getter,raw);
 Object.defineProperty(getter,'wetLifecycle',{enumerable:true,value:c.session.wetLifecycle});
 await expect(refused).rejects.toThrow('descriptors');expect(reads).toBe(0);
 const bad=structuredClone(c);bad.session.wetLifecycle!.actors[3]!.requests++;
 const invalid=exportTrainingSession(level,bad.world,bad.session,raw);bad.session.wetLifecycle!.actors[3]!.requests--;
 await expect(invalid).rejects.toThrow('mismatch');
 const custom=structuredClone(c.session);Object.setPrototypeOf(custom,{});
 const prototype=exportTrainingSession(level,c.world,custom,raw);Object.setPrototypeOf(custom,Object.prototype);
 await expect(prototype).rejects.toThrow('prototype');
});
