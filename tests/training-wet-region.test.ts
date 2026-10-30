import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createDemoLevel} from '../src/demo';
import {cellIndex,type PlayerCommand} from '../src/contracts';
import {importItems,ITEM_FILE_BYTES} from '../src/import/items';
import {importCharacters,CHARACTER_FILE_BYTES} from '../src/import/characters';
import {constructInitialTeam} from '../src/import/original-team';
import {importEditorMap} from '../src/import/editor-map';
import {initialWetRegion,stepWetRegion,replayWetRegion,serializeWetRegion,activateWetRegion} from '../src/sim/training-wet-region';
import {stepWetLifecycle,serializeWetLifecycle} from '../src/sim/training-wet-lifecycle';
import {createTrainingSession,exportTrainingSession,importTrainingSession,resetTrainingInventory,type TrainingSession,type TrainingCandidate} from '../src/sim/training-session';
import {WET_LIMITS} from '../src/sim/training-wet';
async function fixture(){
 const level=createDemoLevel(),items=await importItems(new Uint8Array(ITEM_FILE_BYTES)),roster=await importCharacters(new Uint8Array(CHARACTER_FILE_BYTES));
 for(const r of roster.records)Object.assign(r.stats,{physique:100,agility:100});
 const initial=constructInitialTeam(roster,items,[11,3,0,5]);
 const team={profile:'ocs-initial-team-v1',sources:{roster:roster.source,items:items.source},actors:initial.actors.map(a=>({...a,weight:{...a.weight,status:'verified'}}))};
 const baseline={team,items,indices:[11,3,0,5],names:['A','B','C','D'],encounter:null,inventory:{commands:[],actors:[]},gate:null,ground:null} as unknown as TrainingSession;
 const p=level.starts[3]!;for(const y of [p.y-1,p.y-2,p.y-3])level.layers[0][cellIndex(level,{...p,y})]=4|(2<<17);
 level.layers[1].fill(0x89abcdef);level.layers[2].fill(0xabcdef12);
 return {level,baseline,c:initialWetRegion(level,baseline,[1,0,3,4],{mode:'navigation',timeLimit:null})};
}
function step(level:Parameters<typeof stepWetRegion>[0],c:TrainingCandidate,n:number,commands:PlayerCommand[]=[]){for(let i=0;i<n;i++)c=stepWetRegion(level,c.session,c.world,commands);return c;}
it('v17 traverses multiple supported wet cells and returns; visits, old/current, opaque planes and full replay stay coherent',async()=>{
 const {level,baseline,c:initial}=await fixture();level.layers[1].fill(0x89abcdef);level.layers[2].fill(0xabcdef12);
 const before=structuredClone(initial);let c=initial;
 for(let i=0;i<3;i++)c=step(level,c,1,[{mercenaryId:3,action:'forward'}]);
 expect(c.session.wetRegion!.visited.length).toBe(3);expect(c.session.wet!.actors[3]!.old).toBe(cellIndex(level,{...c.world.mercenaries[3]!,y:c.world.mercenaries[3]!.y+1}));
 for(const [,w,t] of c.session.wet!.overlays){expect([0xabcdef12,(0xabcdef12&0xdfffffff)>>>0]).toContain(t);if(w&4)expect(w&(4|(3<<17))).toBe(4|(2<<17));}
 c=step(level,c,52);expect(c.session.wet!.actors[3]!.body.underwaterCount).toBe(1);
 for(let i=0;i<3;i++)c=step(level,c,1,[{mercenaryId:3,action:'backward'}]);
 expect(c.world.mercenaries).toEqual(initial.world.mercenaries);expect(c.session.wetRegion!.visited.length).toBe(3);
 expect(replayWetRegion(level,baseline,[1,0,3,4],c.world.mission.rules,c.session.wet!.history)).toEqual({session:c.session,world:c.world});
 expect(resetTrainingInventory(c.session,level)).toEqual(initial.session);expect(initial).toEqual(before);
});
it.each([0,3])('region retains accepted full source tick for actor %i (immunity is breath-only)',async id=>{
 const {level,c:initial}=await fixture(),p=initial.world.mercenaries[id]!;level.layers[0][cellIndex(level,p)]=4|(2<<17);initial.session.wet!.overlays.find(x=>x[0]===cellIndex(level,p))![1]|=4|(2<<17);
 initial.session.wet!.drownCounter=49;const base=structuredClone(initial);delete (base.session as {wetRegion?:unknown}).wetRegion;
 const legacy=stepWetLifecycle(level,base.session,base.world,[]),actual=stepWetRegion(level,initial.session,initial.world,[]);
 const {wetRegion,...state}=actual.session;expect({world:actual.world,session:state,events:actual.events}).toEqual(legacy);expect(wetRegion!.visited).toEqual([cellIndex(level,p)]);
 expect(actual.session.wet!.actors[id]!.body.underwaterCount).toBe(id===0?0:1);expect(actual.session.wet!.actors[id]!.itemPasses).toBe(1);
 expect(JSON.parse(serializeWetLifecycle(base)).version).toBe(16);expect(JSON.parse(serializeWetRegion(initial)).version).toBe(17);
});
it.each(['pad','door','support','depth','opaque'] as const)('unsupported new %s cell refuses before counters/inventory/visits/body writes',async kind=>{
 const {level,c}=await fixture(),p={...c.world.mercenaries[3]!,y:c.world.mercenaries[3]!.y-1},i=cellIndex(level,p);
 if(kind==='pad')level.layers[0][i]=level.layers[0][i]!|1|(1<<9);
 if(kind==='door')level.layers[0][i]=(level.layers[0][i]!|32|(12<<28))>>>0;
 if(kind==='support')level.layers[0][i-level.size.width*level.size.depth]=(6<<11)|2;
 if(kind==='depth')level.layers[0][i]=4|(1<<17);
 if(kind==='opaque')level.layers[0][i]=level.layers[0][i]!|64;
 const before=structuredClone(c);
 // Traversal may block before admission for opaque/pad/door. It must never enter
 // or consume any partial source effect; unsupported admitted candidates throw.
 try{const r=step(level,c,1,[{mercenaryId:3,action:'forward'}]);expect(r.world.mercenaries[3]).toEqual(c.world.mercenaries[3]);expect(r.session.wetRegion).toEqual(c.session.wetRegion);}catch(e){expect(String(e)).toContain('refused atomically');}
 expect(c).toEqual(before);
});
it('region event/tick/byte budgets preflight without mutating the caller and malformed chronology cannot normalize into validity',async()=>{
 const {level,baseline,c}=await fixture();c.world.tick=WET_LIMITS.ticks;const before=structuredClone(c);expect(()=>step(level,c,1)).toThrow('tick budget');expect(c).toEqual(before);c.world.tick=0;
 for(const input of [[{count:0,commands:[]}],[{count:45001,commands:[]}],Array.from({length:258},()=>({count:1,commands:[]}))])expect(()=>replayWetRegion(level,baseline,[1,0,3,4],c.world.mission.rules,input)).toThrow();
 c.session.wet!.history=Array.from({length:128},(_,i)=>({count:1,commands:[{mercenaryId:0,action:i%2?'turn-left':'turn-right'}]}));expect(()=>step(level,c,1)).toThrow('event budget');c.session.wet!.history=[];
 const n=new TextEncoder().encode(serializeWetRegion(c)).length;c.session.team.sources.roster.sha256+='x'.repeat(24575-n);expect(new TextEncoder().encode(serializeWetRegion(c)).length).toBe(24575);const prior=structuredClone(c);expect(()=>step(level,c,1,[{mercenaryId:0,action:'turn-left'}])).toThrow('save byte budget');expect(c).toEqual(prior);
});
it.each([false,true])('public region dispatcher refuses hidden/accessor discriminator with zero reads, hidden=%s',async hidden=>{
 const {level,c}=await fixture();let reads=0;Object.defineProperty(c.session,'wetRegion',hidden?{value:c.session.wetRegion,enumerable:false}:{get(){reads++;return undefined;},enumerable:true});
 await expect(exportTrainingSession(level,c.world,c.session,{roster:new Uint8Array(),items:new Uint8Array()})).rejects.toThrow('descriptors');expect(reads).toBe(0);
});
const enabled=!!process.env.HIRED_GUNS_T43_CASE_INPUTS;
it.skipIf(!enabled)('private exact sources: full supported corridor and reverse retain full state; public v17 recovery rejects tamper and owns callers before await',async()=>{
 const m=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8')),w=JSON.parse(await readFile(m.casePath,'utf8'));
 const raw={map:new Uint8Array(await readFile(m.inputs.map)),roster:new Uint8Array(await readFile(m.inputs.roster)),items:new Uint8Array(await readFile(m.inputs.items))};
 const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[11,3,0,5]);let c=await activateWetRegion(level,raw,base.session,base.world,true);
 for(const s of [...w.dryApproach,...w.classification.waters.filter((x:{candidateReachable:boolean})=>x.candidateReachable).at(-1).candidateRoute]){c=step(level,c,9);c=step(level,c,1,[{mercenaryId:3,action:s.action}]);}
 expect(c.session.wetRegion!.visited.length).toBe(22);const turn=structuredClone(c),saved=await exportTrainingSession(level,c.world,c.session,raw);expect(await importTrainingSession(level,raw,saved)).toEqual({session:c.session,world:c.world});
 const route=w.classification.waters.filter((x:{candidateReachable:boolean})=>x.candidateReachable).at(-1).candidateRoute;const reverse:Record<string,PlayerCommand['action']>={forward:'backward',backward:'forward','strafe-left':'strafe-right','strafe-right':'strafe-left'};
 for(const s of [...route].reverse()){c=step(level,c,9);c=step(level,c,1,[{mercenaryId:3,action:reverse[s.action]!}]);}
 expect(c.world.mercenaries[3]).toMatchObject(w.entry.from);expect(c.session.wetRegion!.visited.length).toBe(22);
 const json=await exportTrainingSession(level,c.world,c.session,raw);expect(await importTrainingSession(level,raw,json)).toEqual({session:c.session,world:c.world});
 const bytes=structuredClone(raw),map=structuredClone(level),caller=structuredClone(c),pending=exportTrainingSession(map,caller.world,caller.session,bytes);bytes.map.fill(0);bytes.roster.fill(0);bytes.items.fill(0);map.layers[0].fill(0);caller.session.wetRegion!.visited=[];caller.world.tick++;expect(await pending).toBe(json);
 const invalid=structuredClone(c);invalid.session.wetRegion!.visited.pop();const refused=exportTrainingSession(level,invalid.world,invalid.session,raw);invalid.session.wetRegion!.visited=c.session.wetRegion!.visited.slice();await expect(refused).rejects.toThrow('mismatch');
 let reads=0;const getter=structuredClone(c.session);Object.defineProperty(getter,'wetRegion',{configurable:true,enumerable:true,get(){reads++;return c.session.wetRegion;}});const accessor=exportTrainingSession(level,c.world,getter,raw);Object.defineProperty(getter,'wetRegion',{value:c.session.wetRegion,enumerable:true});await expect(accessor).rejects.toThrow('descriptors');expect(reads).toBe(0);
 const wrong=structuredClone(raw);wrong.items[0]=wrong.items[0]!^1;const badSource=exportTrainingSession(level,c.world,c.session,wrong);wrong.items[0]=raw.items[0]!;await expect(badSource).rejects.toThrow();
 for(const mutate of [(s:ReturnType<typeof JSON.parse>)=>s.checkpoint.region.visited.pop(),(s:ReturnType<typeof JSON.parse>)=>s.checkpoint.state.actors[3].body.fitness--,(s:ReturnType<typeof JSON.parse>)=>s.checkpoint.state.overlays[0][1]^=2,(s:ReturnType<typeof JSON.parse>)=>s.history[0].idle++,(s:ReturnType<typeof JSON.parse>)=>s.version=16]){const bad=JSON.parse(saved);mutate(bad);await expect(importTrainingSession(level,raw,JSON.stringify(bad))).rejects.toThrow();}
 for(const key of ['map','roster','items'] as const){const bad=structuredClone(raw);bad[key][0]=bad[key][0]!^1;await expect(importTrainingSession(level,bad,saved)).rejects.toThrow();}
 expect(turn.session.wet!.actors[3]!.itemPasses).toBeGreaterThan(0);
},120000);
