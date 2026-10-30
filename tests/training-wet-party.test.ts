import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createDemoLevel,createExtractionDemo} from '../src/demo';
import {cellIndex,type PlayerCommand} from '../src/contracts';
import {importItems,ITEM_FILE_BYTES} from '../src/import/items';
import {importCharacters,CHARACTER_FILE_BYTES} from '../src/import/characters';
import {constructInitialTeam} from '../src/import/original-team';
import {importEditorMap} from '../src/import/editor-map';
import {initialWetParty,stepWetParty,serializeWetParty,activateWetParty,exportWetParty,importWetParty,encodePartyHistory,decodePartyHistory,replayWetParty,PARTY_EVENTS} from '../src/sim/training-wet-party';
import {initialWetLifecycle,stepWetLifecycle,damageWetCandidate} from '../src/sim/training-wet-lifecycle';
import {createTrainingSession,exportTrainingSession,importTrainingSession,resetTrainingInventory,type TrainingSession,type TrainingCandidate} from '../src/sim/training-session';
import {sourcePartyDecision,resolveSelectedPartyMission,SOURCE_CLOCK_PERIOD} from '../src/sim/mission';
import {createWorld} from '../src/sim/world';
async function fixture(immune=false){
 const level=createDemoLevel(),items=await importItems(new Uint8Array(ITEM_FILE_BYTES)),roster=await importCharacters(new Uint8Array(CHARACTER_FILE_BYTES));
 for(const r of roster.records)Object.assign(r.stats,{physique:100,agility:100});
 const indices=[1,3,0,5],initial=constructInitialTeam(roster,items,indices),team={profile:'ocs-initial-team-v1',sources:{roster:roster.source,items:items.source},actors:initial.actors.map(a=>({...a,weight:{...a.weight,status:'verified'}}))};
 const baseline={team,items,indices,names:['A','B','C','D'],encounter:null,inventory:{commands:[],actors:[]},gate:null,ground:null} as unknown as TrainingSession;
 for(const p of level.starts)level.layers[0][cellIndex(level,{...p,y:p.y-1})]=4|(2<<17);
 level.layers[1].fill(0x89abcdef);level.layers[2].fill(0xabcdef12);
 return {level,baseline,c:initialWetParty(level,baseline,immune?[1,0,3,4]:[0,0,3,4],{mode:'navigation',timeLimit:null})};
}
const enter=Array.from({length:4},(_,mercenaryId)=>({mercenaryId,action:'forward' as const}));
function step(level:Parameters<typeof stepWetParty>[0],c:TrainingCandidate,n:number,commands:PlayerCommand[]=[]){for(let i=0;i<n;i++)c=stepWetParty(level,c.session,c.world,commands);return c;}
it('four real immersion deaths commit distinct corpses and all-dead failure on the final damage tick, retaining fitness and opaque planes',async()=>{
 const {level,c:initial}=await fixture();let c=step(level,step(level,initial,1,enter),1798);expect(c.world.mission.outcome).toBe('active');expect(c.session.wet!.actors.every(a=>a.runtimeDeadWord===0)).toBe(true);
 c=step(level,c,1);expect(c.world.tick).toBe(1800);expect(c.world.mission).toMatchObject({outcome:'failed',reason:'all-dead',winner:null});
 expect(c.session.wet!.actors.map(a=>[a.runtimeDeadWord,a.body.statsDeadWord,a.body.fitness])).toEqual(Array.from({length:4},()=>[0xff00,0xff00,4535]));expect(new Set(c.session.wet!.corpses).size).toBe(4);
 for(let id=0;id<4;id++){const a=c.session.wet!.actors[id]!,d=c.session.wetLifecycle!.actors[id]!.death!;expect(d.target).toBe(a.current);expect(a.old).toBe(a.current);expect((c.session.wetLifecycle!.second.find(x=>x[0]===d.target)![1]>>>12)&255).toBe(id);}
 const before=serializeWetParty(c);expect(serializeWetParty(step(level,c,1,[{mercenaryId:0,action:'forward'}]))).toBe(before);expect(resetTrainingInventory(c.session,level)).toEqual(initial.session);
 expect(replayWetParty(level,(await fixture()).baseline,[0,0,3,4],c.world.mission.rules,JSON.parse(before).history)).toEqual({session:c.session,world:c.world});
},30000);
it('source race1 prevents all-dead, keeps its inventory visits and explicit selection; old ready-only initializer still refuses other choices',async()=>{
 const {level,c,baseline}=await fixture(true),r=step(level,step(level,c,1,enter),1799);expect(r.world.mission.outcome).toBe('active');expect(r.session.wet!.actors[0]!.body.fitness).toBe(65535);expect(r.session.wet!.actors[0]!.itemPasses).toBe(36);expect(r.session.wetLifecycle!.actors[0]!.requests).toBe(0);
 expect(()=>initialWetLifecycle(level,baseline,[1,0,3,4],r.world.mission.rules)).toThrow('ready team');
},30000);
const alive=()=>Array.from({length:4},()=>({deadWord:0,control:1,window:0}));
it('source check_exit counts dead OR uncontrolled once, window7 separately, all-dead before timeout before exit',()=>{
 const a=alive();a[0]!.window=7;expect(sourcePartyDecision(a,true,false)).toBe('exit');expect(sourcePartyDecision(a,true,true)).toBe('time-expired');expect(sourcePartyDecision(a,false,false)).toBe(null);
 a.forEach(x=>x.deadWord=0xff00);expect(sourcePartyDecision(a,true,true)).toBe('all-dead');a[0]!.deadWord=0;a[0]!.control=0;expect(sourcePartyDecision(a,true,true)).toBe('all-dead');a[0]!.control=1;expect(sourcePartyDecision(a,true,false)).toBe('exit');a[0]!.window=0;expect(sourcePartyDecision(a,true,false)).toBe(null);
});
it('v18 resolves last death and time-zero/exit ties distinctly without changing generic legacy policy',()=>{
 const level=createExtractionDemo(),w=createWorld(level,undefined,{mode:'first-exit',timeLimit:2});w.tick=2*SOURCE_CLOCK_PERIOD;w.physics={mode:'source-wet',deadWords:[0xff00,0xff00,0xff00,0xff00]};w.mission.exited[0]=true;resolveSelectedPartyMission(w,[]);expect(w.mission.reason).toBe('all-dead');
 w.mission.outcome='active';w.physics.deadWords[0]=0;resolveSelectedPartyMission(w,[]);expect(w.mission.reason).toBe('time-expired');
});
it.each(['control','window','deadword','leader','corpse'] as const)('unsupported %s source state refuses without any partial writes',async kind=>{
 const {level,c}=await fixture();if(kind==='control')c.session.wet!.actors[0]!.body.controlMethod=0;if(kind==='window')c.session.wet!.actors[0]!.body.windowType=7;if(kind==='deadword')c.session.wet!.actors[0]!.runtimeDeadWord=0xff00;if(kind==='leader')c.session.wet!.leader=5;if(kind==='corpse')c.session.wet!.corpses.push(3);
 const before=structuredClone(c);expect(()=>step(level,c,1)).toThrow();expect(c).toEqual(before);
});
it('compact tuple boundaries, canonical commands, expansion and total work are bounded before replay',()=>{
 const tuples=Array.from({length:PARTY_EVENTS},(_,i)=>[1,1,i%2?4:5]);expect(decodePartyHistory(tuples)).toHaveLength(PARTY_EVENTS*2);expect(encodePartyHistory(decodePartyHistory(tuples))).toEqual(tuples);
 expect(()=>decodePartyHistory([...tuples,[1,1,4]])).toThrow('budget');expect(decodePartyHistory([[45000,0]])).toEqual([{count:45000,commands:[]}]);
 for(const bad of [[[45001,0]],[[1,0],[1,1,0]],[[0,1,0],[0,1,0]],[[0,1,1,0]],[[0,1,0,1]],[[0,1,24]],[[0,0]],[[0,1.5,0]],[[0,1]],[[0,1,0,6,12,18,23]]])expect(()=>decodePartyHistory(bad)).toThrow();
});
it('strict UTF8 budget admits 24575 bytes including multibyte data and refuses 24576 before exposure',async()=>{
 for(const multibyte of [false,true]){const {level,c}=await fixture();const n=Buffer.byteLength(serializeWetParty(c)),gap=24575-n;c.session.team.sources.roster.sha256+=(multibyte?'é'.repeat(Math.floor(gap/2))+'x'.repeat(gap%2):'x'.repeat(gap));expect(Buffer.byteLength(serializeWetParty(c))).toBe(24575);const before=structuredClone(c);expect(()=>step(level,c,1,[{mercenaryId:0,action:'turn-left'}])).toThrow('byte budget');expect(c).toEqual(before);c.session.team.sources.roster.sha256+='x';expect(()=>serializeWetParty(c)).toThrow('byte budget');}
});
it.each(['accessor','hidden','prototype','inherited'] as const)('public new discriminator %s is checked before getters',async kind=>{
 const {level,c}=await fixture();let reads=0;const hook=()=>{reads++;return c.session.wetParty;};
 if(kind==='accessor')Object.defineProperty(c.session,'wetParty',{get:hook,enumerable:true});if(kind==='hidden')Object.defineProperty(c.session,'wetParty',{value:c.session.wetParty,enumerable:false});if(kind==='prototype'||kind==='inherited')Object.setPrototypeOf(c.session,Object.defineProperty({},'wetParty',{get:hook}));
 await expect(exportTrainingSession(level,c.world,c.session,{roster:new Uint8Array(),items:new Uint8Array()})).rejects.toThrow();expect(reads).toBe(0);
});
it('new history validates tick budget prospectively while legacy lifecycle remains its original policy',async()=>{
 const {level,c}=await fixture();c.world.tick=45000;const before=structuredClone(c);expect(()=>step(level,c,1)).toThrow('tick budget');expect(c).toEqual(before);
 const {baseline}=await fixture();const ready={...baseline,indices:[11,3,0,5]},legacy=initialWetLifecycle(level,ready,[0,0,3,4],{mode:'navigation',timeLimit:null});let old=stepWetLifecycle(level,legacy.session,legacy.world,enter,false);for(let i=0;i<1799;i++)old=stepWetLifecycle(level,old.session,old.world,[],false);expect(old.world.mission.outcome).toBe('active');
});
it.skipIf(!process.env.HIRED_GUNS_T43_CASE_INPUTS)('private source selected initialization and public v18 recovery bind raw bytes, complete team, history and call-time state',async()=>{
 const m=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8')),raw={map:new Uint8Array(await readFile(m.inputs.map)),roster:new Uint8Array(await readFile(m.inputs.roster)),items:new Uint8Array(await readFile(m.inputs.items))};
 const {level}=await importEditorMap(raw.map),roster=await importCharacters(raw.roster),indices=[1,3,0,5],base=await createTrainingSession(level,raw,indices),c=await activateWetParty(level,raw,base.session,base.world,true);
 expect(indices.map(i=>roster.records[i]!.race)).toEqual([0,0,3,4]);expect(c.session.wet!.actors.map(a=>a.body.physique)).toEqual(indices.map(i=>roster.records[i]!.stats.physique));
 const json=await exportTrainingSession(level,c.world,c.session,raw);expect(await importTrainingSession(level,raw,json)).toEqual(c);
 const caller=structuredClone(c),map=structuredClone(level),bytes=structuredClone(raw),pending=exportTrainingSession(map,caller.world,caller.session,bytes);caller.world.tick++;caller.session.wet!.actors[0]!.body.fitness--;map.layers[0].fill(0);bytes.map.fill(0);bytes.roster.fill(0);bytes.items.fill(0);expect(await pending).toBe(json);
 for(const mutate of [(s:ReturnType<typeof JSON.parse>)=>s.indices[0]=2,(s:ReturnType<typeof JSON.parse>)=>s.checkpoint.state.actors[0].body.race=1,(s:ReturnType<typeof JSON.parse>)=>s.checkpoint.state.actors[0].body.fitness--,(s:ReturnType<typeof JSON.parse>)=>s.checkpoint.world.mission.reason='all-dead',(s:ReturnType<typeof JSON.parse>)=>s.history=[[1,0]],(s:ReturnType<typeof JSON.parse>)=>s.sources.map='0'.repeat(64)]){const bad=JSON.parse(json);mutate(bad);await expect(importTrainingSession(level,raw,JSON.stringify(bad))).rejects.toThrow();}
 for(const k of ['map','roster','items'] as const){const bad=structuredClone(raw);bad[k][0]=bad[k][0]!^1;await expect(importTrainingSession(level,bad,json)).rejects.toThrow();}
});

it('new tuple snapshots reject sparse/hidden/accessor/prototype and deep work before any hook',()=>{
 let reads=0;const row=[0,1,0];Object.defineProperty(row,'0',{enumerable:true,get(){reads++;return 0;}});expect(()=>decodePartyHistory([row])).toThrow('descriptors');expect(reads).toBe(0);
 const sparse=Array(2);sparse[1]=[1,0];expect(()=>decodePartyHistory(sparse)).toThrow('dense');
 const hidden=[1,0];Object.defineProperty(hidden,'1',{value:0,enumerable:false});expect(()=>decodePartyHistory([hidden])).toThrow('descriptors');
 const inherited=Object.setPrototypeOf([[1,0]],{});expect(()=>decodePartyHistory(inherited)).toThrow('prototype');
 let deep:unknown=0;for(let i=0;i<26;i++)deep=[deep];expect(()=>decodePartyHistory(deep)).toThrow('depth');
 expect(()=>encodePartyHistory(Array.from({length:514},()=>({count:1,commands:[]})))).toThrow('expanded event budget');
});

it('indivisible last-death tick beats time-zero and a pending exit command; a surviving exit loses the deadline tie',async()=>{
 for(const immune of [false,true]){const {level,c:initial}=await fixture(immune);let c=step(level,initial,1,enter);
  for(const id of [1,2,3])c=damageWetCandidate(level,c,id,1000000);
  const a=c.session.wet!.actors[0]!;a.body.underwaterCount=35;a.body.fitness=4535;c.session.wet!.drownCounter=49;c.world.tick=1201;
  c.world.mission.rules={mode:'first-exit',timeLimit:2};c.session.wet!.rules={...c.world.mission.rules};
  const p=c.world.mercenaries[0]!;level.layers[0][cellIndex(level,{...p,y:p.y-1})]=(3<<11)|2;
  const before=structuredClone(c),r=step(level,c,1,[{mercenaryId:0,action:'forward'}]);expect(c).toEqual(before);expect(r.world.tick).toBe(1202);
  expect(r.world.mission.outcome).toBe('failed');expect(r.world.mission.reason).toBe(immune?'time-expired':'all-dead');expect(r.world.mission.exited[0]).toBe(immune);
 }
});

it('public UTF8 input size refuses before raw-source getter hooks',async()=>{
 const {level,c}=await fixture();let reads=0;const raw=Object.defineProperty({},'map',{get(){reads++;throw Error('raw hook');}});
 for(const json of ['x'.repeat(24576),'é'.repeat(12288)])await expect(importTrainingSession(level,raw as never,json)).rejects.toThrow('smaller than 24 KiB');expect(reads).toBe(0);
 const row=[0,1,0];Object.defineProperty(row,'extra',{value:1,enumerable:true});expect(()=>decodePartyHistory([row])).toThrow('dense array');
 c.world.tick=45000;const before=structuredClone(c);expect(()=>stepWetParty(level,c.session,c.world,[{mercenaryId:0,action:'turn-left'}])).toThrow('tick budget');expect(c).toEqual(before);
});

it.each(['wetParty','wetRegion'] as const)('selected constructor omits only own data without reading inherited %s',async field=>{
 const {level,baseline,c}=await fixture();const original=Object.getOwnPropertyDescriptor(Object.prototype,field);
 for(const throwing of [false,true]){let reads=0,result:TrainingCandidate|undefined;
  try{Object.defineProperty(Object.prototype,field,{configurable:true,get(){reads++;if(throwing)throw Error('inherited hook');return undefined;}});
   result=initialWetParty(level,baseline,[0,0,3,4],c.world.mission.rules);
  }finally{if(original)Object.defineProperty(Object.prototype,field,original);else Reflect.deleteProperty(Object.prototype,field);}
  expect(reads).toBe(0);expect(result).toEqual(c);
 }
 let reads=0;for(const enumerable of [false,true]){const bad=structuredClone(baseline);Object.defineProperty(bad,field,{enumerable,get(){reads++;throw Error('own hook');}});expect(()=>initialWetParty(level,bad,[0,0,3,4],c.world.mission.rules)).toThrow('descriptors');}expect(reads).toBe(0);
});
it.skipIf(!process.env.HIRED_GUNS_T43_CASE_INPUTS)('private actual v18 all entrypoints preserve canonical state with inherited hooks at call and digest 1/3/7',async()=>{
 const m=JSON.parse(await readFile(process.env.HIRED_GUNS_T43_CASE_INPUTS!,'utf8')),raw={map:new Uint8Array(await readFile(m.inputs.map)),roster:new Uint8Array(await readFile(m.inputs.roster)),items:new Uint8Array(await readFile(m.inputs.items))};
 const {level}=await importEditorMap(raw.map),b=await createTrainingSession(level,raw,[1,3,0,5]),c=await activateWetParty(level,raw,b.session,b.world,true),json=await exportTrainingSession(level,c.world,c.session,raw);
 expect(JSON.parse(json).version).toBe(18);expect(c.session.indices).toEqual([1,3,0,5]);
 const operations=[()=>activateWetParty(level,raw,b.session,b.world,true),()=>exportTrainingSession(level,c.world,c.session,raw),()=>exportWetParty(level,raw,c.session,c.world),()=>importTrainingSession(level,raw,json),()=>importWetParty(level,raw,JSON.parse(json))];
 const original=Object.getOwnPropertyDescriptor(Object.prototype,'wetParty'),digest=SubtleCrypto.prototype.digest;
 for(const throwing of [false,true])for(const phase of [0,1,3,7])for(const operation of operations){let reads=0,calls=0,result:TrainingCandidate|string|undefined;
  const install=()=>Object.defineProperty(Object.prototype,'wetParty',{configurable:true,get(){reads++;if(throwing)throw Error('live inherited hook');return undefined;}});
  try{install();const getter=Object.getOwnPropertyDescriptor(Object.prototype,'wetParty')!.get!;try{getter.call({});}catch{/* positive throwing canary */}expect(reads).toBe(1);reads=0;Reflect.deleteProperty(Object.prototype,'wetParty');
   if(!phase)install();SubtleCrypto.prototype.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(++calls===phase)install();return digest.apply(this,args);};
   result=await operation();
  }finally{SubtleCrypto.prototype.digest=digest;if(original)Object.defineProperty(Object.prototype,'wetParty',original);else Reflect.deleteProperty(Object.prototype,'wetParty');}
  expect(reads).toBe(0);expect(calls).toBe(8);expect(typeof result==='string'?result:serializeWetParty(result!)).toBe(json);expect(typeof result==='string'?JSON.parse(result).checkpoint.world:result!.world).toEqual(c.world);
 }
 let reads=0;for(const kind of ['accessor','hidden','custom','null']){const bad=structuredClone(c),base=structuredClone(b);
  for(const session of [bad.session,base.session]){if(kind==='accessor')Object.defineProperty(session,'wetParty',{enumerable:true,get(){reads++;throw Error('own accessor');}});else if(kind==='hidden')Object.defineProperty(session,'wetParty',{value:{profile:'four-controlled-selected-v1'},enumerable:false});else Object.setPrototypeOf(session,kind==='null'?null:{});}
  await expect(exportTrainingSession(level,bad.world,bad.session,raw)).rejects.toThrow();await expect(exportWetParty(level,raw,bad.session,bad.world)).rejects.toThrow();await expect(activateWetParty(level,raw,base.session,base.world,true)).rejects.toThrow();
 }expect(reads).toBe(0);
},60000);
