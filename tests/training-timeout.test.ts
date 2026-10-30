import {expect,it} from 'vitest';
import {readFile,writeFile} from 'node:fs/promises';
import {encodeTimeoutHistory,decodeTimeoutHistory,TIMEOUT_LIMITS,activateTimeout,exportTimeout,importTimeout,stepTimeout,replayTimeout,serializeTimeout,hasTimeoutProfile} from '../src/sim/training-timeout';
import {WET_LIMITS,wetSnapshot} from '../src/sim/training-wet';
import {encodePartyHistory,decodePartyHistory,activateWetParty} from '../src/sim/training-wet-party';
import {sourceClockAtTick,sourcePartyDecision,resolveSelectedPartyMission,SOURCE_CLOCK_PERIOD} from '../src/sim/mission';
import {createTrainingSession,exportTrainingSession,importTrainingSession,resetTrainingInventory,isTrainingSessionSave} from '../src/sim/training-session';
import {importEditorMap} from '../src/import/editor-map';
import {importCharacters} from '../src/import/characters';
import {transitionImmersion} from '../src/character/immersion-caller';
import {cellIndex,type MissionRules} from '../src/contracts';
import {createDemoLevel} from '../src/demo';
import {createWorld} from '../src/sim/world';
import {stepTimeoutLifecycle} from '../src/sim/training-wet-lifecycle';

it('v19 tick boundary is inclusive and distinct; legacy v18 bytes and 45000 limit stay exact',()=>{
 expect(TIMEOUT_LIMITS).toEqual({ticks:59499,packed:256,expanded:513,bytes:24576});expect(WET_LIMITS.ticks).toBe(45000);
 expect(TIMEOUT_LIMITS.ticks).toBe(99*SOURCE_CLOCK_PERIOD);expect(TIMEOUT_LIMITS.bytes).toBe(WET_LIMITS.bytes);
 expect(decodeTimeoutHistory([[59499,0]])).toEqual([{count:59499,commands:[]}]);expect(()=>decodeTimeoutHistory([[59500,0]])).toThrow('tick budget');
 expect(encodeTimeoutHistory([{count:59499,commands:[]}])).toEqual([[59499,0]]);expect(()=>encodeTimeoutHistory([{count:59500,commands:[]}])).toThrow();
 expect(encodePartyHistory([{count:45000,commands:[]}])).toEqual([[45000,0]]);expect(()=>decodePartyHistory([[45001,0]])).toThrow();expect(()=>decodePartyHistory([[59499,0]])).toThrow();
 const alternating=Array.from({length:256},(_,i)=>({count:1,commands:[{mercenaryId:0,action:i%2?'turn-left' as const:'turn-right' as const}]}));
 expect(decodeTimeoutHistory(encodeTimeoutHistory(alternating))).toEqual(alternating);expect(()=>encodeTimeoutHistory([...alternating,alternating[0]!])).toThrow('packed');
});
it.each([[[0,0]],[[1,1]],[[0,1,24]],[[0,1,0,1]],[[0,1,5],[0,1,5]],[[1.5,0]],[[Number.MAX_SAFE_INTEGER,1]],[[0,1,5,4]],[[1,0],[1,0]]].map(tuple=>({tuple})))('rejects malformed/noncanonical tuples $tuple',({tuple})=>{
 expect(()=>decodeTimeoutHistory(tuple)).toThrow();
});
it('source-independent decimal borrow oracle agrees for the entire fixed99 adapter interval',()=>{
 // Literal original operations: Main5290 divides99; ColdStartup1436 subtracts,
 // branches on sign, resets600, borrows decimal units then tens. No adapter call
 // generates the expectation. This verifies integer call count, not CPU cadence.
 let tens=9,units=9,sub=600;
 for(let tick=0;tick<=59499;tick++){
  const clock=sourceClockAtTick(99,tick);if(clock.tens!==tens||clock.units!==units||clock.subticks!==sub)throw Error('borrow mismatch '+tick);
  if(--sub<0){sub=600;if(--units<0){units=9;if(--tens<0)tens=0;}}
 }
 expect(sourceClockAtTick(99,59498)).toEqual({tens:0,units:1,subticks:0});expect(sourceClockAtTick(99,59499)).toEqual({tens:0,units:0,subticks:600});expect(()=>sourceClockAtTick(99,59500)).toThrow();
});
it('original all-dead, timeout, exit priority includes zero-time exit ties and both rules',()=>{
 for(let mask=0;mask<16;mask++)for(let exited=0;exited<16;exited++)for(const timeUp of [false,true]){
  const actors=Array.from({length:4},(_,id)=>({deadWord:mask&(1<<id)?0xff00:0,control:1,window:exited&(1<<id)?7:0}));
  const livingExit=actors.some(a=>!a.deadWord&&a.window===7),expected=mask===15?'all-dead':timeUp?'time-expired':livingExit?'exit':null;
  expect(sourcePartyDecision(actors,true,timeUp)).toBe(expected);
 }
 for(const mode of ['first-exit','cooperative-extraction'] as const)for(const allDead of [false,true]){
  const w=createWorld(createDemoLevel());w.physics={mode:'source-wet',deadWords:allDead?[0xff00,0xff00,0xff00,0xff00]:[0,0,0,0]};w.tick=59499;w.mission.rules={mode,timeLimit:99};w.mission.exited=[true,true,true,true];resolveSelectedPartyMission(w,[]);
  expect(w.mission).toMatchObject({outcome:'failed',reason:allDead?'all-dead':'time-expired',winner:null});
 }
});
it('new discriminator and snapshots refuse getters/prototypes/expansion without reading hooks',()=>{
 for(const key of ['wetParty','wetRegion','profile']){let reads=0;const old=Object.getOwnPropertyDescriptor(Object.prototype,key);
  try{Object.defineProperty(Object.prototype,key,{configurable:true,get(){reads++;throw Error('CANARY');}});expect(hasTimeoutProfile({} as never)).toBe(false);expect(reads).toBe(0);}finally{if(old)Object.defineProperty(Object.prototype,key,old);else Reflect.deleteProperty(Object.prototype,key);}
 }
 let reads=0;const bad={get version(){reads++;throw Error('OWN');}};expect(()=>wetSnapshot(bad)).toThrow();expect(reads).toBe(0);
 let nested:unknown=0;for(let i=0;i<25;i++)nested=[nested];expect(()=>decodeTimeoutHistory(nested)).toThrow();expect(()=>decodeTimeoutHistory(new Array(256))).toThrow();expect(()=>decodeTimeoutHistory(Object.assign([],{extra:1}))).toThrow();
 for(const throwing of [false,true]){let reads=0;const old=Object.getOwnPropertyDescriptor(Object.prototype,'format');try{Object.defineProperty(Object.prototype,'format',{configurable:true,get(){reads++;if(throwing)throw Error('FORMAT');return 'hired-guns-training-session';}});expect(isTrainingSessionSave('{}')).toBe(false);expect(isTrainingSessionSave('[]')).toBe(false);expect(isTrainingSessionSave('{"format":"hired-guns-training-session"}')).toBe(true);expect(reads).toBe(0);}finally{if(old)Object.defineProperty(Object.prototype,'format',old);else Reflect.deleteProperty(Object.prototype,'format');}}
 expect(isTrainingSessionSave(JSON.stringify({format:'hired-guns-training-session',padding:'é'.repeat(12288)}))).toBe(false);
});
const inputs=process.env.HIRED_GUNS_T43_CASE_INPUTS;
it('oversized public marker/import refuse before UTF8 allocation, parsing or source work',async()=>{
 const encode=TextEncoder.prototype.encode;let calls=0;TextEncoder.prototype.encode=function(...args){calls++;return encode.apply(this,args);};
 try{const huge='x'.repeat(24576);expect(isTrainingSessionSave(huge)).toBe(false);await expect(importTrainingSession({} as never,{} as never,huge)).rejects.toThrow('24 KiB');expect(calls).toBe(0);}finally{TextEncoder.prototype.encode=encode;}
});
it('unknown own party markers refuse public Retry/export before legacy fallback or mutable-state reads',async()=>{
 for(const wetParty of [undefined,null,false,{profile:'unknown'}]){
  let reads=0;const s={wetParty};Object.defineProperty(s,'wet',{enumerable:true,get(){reads++;throw Error('LEGACY_FALLBACK_READ');}});const descriptors=Object.getOwnPropertyDescriptors(s);
  expect(()=>resetTrainingInventory(s as never)).toThrow('unsupported party profile');await expect(exportTrainingSession({} as never,{} as never,s as never,{} as never)).rejects.toThrow('unsupported party profile');expect(reads).toBe(0);expect(Object.getOwnPropertyDescriptors(s)).toEqual(descriptors);
 }
});
async function actual(){
 const m=JSON.parse(await readFile(inputs!,'utf8')),raw={map:new Uint8Array(await readFile(m.inputs.map)),roster:new Uint8Array(await readFile(m.inputs.roster)),items:new Uint8Array(await readFile(m.inputs.items))};
 const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[1,3,0,5]),roster=await importCharacters(raw.roster),races=[1,3,0,5].map(i=>roster.records[i]!.race),c=await activateTimeout(level,raw,base.session,base.world,true);
 return {raw,level,base,races,c};
}
it.skipIf(!inputs)('private full original99 chronology, independent dry body/counter expectations, full source-bound recovery, deadline and Retry',async()=>{
 const {raw,level,base,races,c:initial}=await actual();expect(races).toEqual([0,0,3,4]);expect(initial.world.mission.rules.timeLimit).toBe(99);
 for(const p of initial.world.mercenaries)expect(level.layers[0][cellIndex(level,p)]!&4).toBe(0);
 const start=performance.now(),before=replayTimeout(level,base.session,races,initial.world.mission.rules,[[59498,0]]),replayMs=performance.now()-start;
 expect(before.world.mission).toMatchObject({outcome:'active',clock:{tens:0,units:1,subticks:0}});expect(before.session.wet!.drownCounter).toBe(48);expect(before.session.wet!.fallCounter).toBe(2);
 const terminal=stepTimeout(level,before.session,before.world,[]);expect(terminal.world.tick).toBe(59499);expect(terminal.world.mission).toMatchObject({outcome:'failed',reason:'time-expired',clock:{tens:0,units:0,subticks:600}});
 for(let id=0;id<4;id++){
  let body=structuredClone(initial.session.wet!.actors[id]!.body),processed=0;
  for(let n=0;n<1189;n++){const r=transitionImmersion({actor:body,cellLong:level.layers[0][cellIndex(level,initial.world.mercenaries[id]!)]!,items:initial.session.items});body=r.candidate;if(r.inventoryStatus==='processed')processed++;}
  expect(terminal.session.wet!.actors[id]!.body).toEqual(body);expect(terminal.session.wet!.actors[id]!.itemPasses).toBe(processed);expect(processed).toBe(0);
 }
 const frozen=structuredClone(terminal);expect(stepTimeout(level,terminal.session,terminal.world,[{mercenaryId:0,action:'forward'}])).toMatchObject({session:frozen.session,world:frozen.world,events:[]});
 const exportStart=performance.now(),json=await exportTrainingSession(level,terminal.world,terminal.session,raw),exportMs=performance.now()-exportStart;
 expect(Buffer.byteLength(json)).toBeLessThan(24576);const importStart=performance.now();expect(await importTrainingSession(level,raw,json)).toEqual({session:terminal.session,world:terminal.world});const importMs=performance.now()-importStart;
 for(const mode of ['first-exit','cooperative-extraction'] as const){const rules:MissionRules={mode,timeLimit:99},reset=resetTrainingInventory(terminal.session,level,rules);expect(reset).toEqual(replayTimeout(level,base.session,races,rules,[]).session);}
 expect(()=>replayTimeout(level,base.session,races,initial.world.mission.rules,[[59500,0]])).toThrow();
 const tamper=JSON.parse(json);tamper.checkpoint.state.actors[0].body.fitness--;await expect(importTrainingSession(level,raw,JSON.stringify(tamper))).rejects.toThrow();
 if(process.env.HIRED_GUNS_TIMEOUT_EVIDENCE){await writeFile(process.env.HIRED_GUNS_TIMEOUT_EVIDENCE,JSON.stringify({replayMs,exportMs,importMs,bytes:Buffer.byteLength(json),cells:level.layers[0].length,terminal:JSON.parse(json)},null,2));await writeFile(process.env.HIRED_GUNS_TIMEOUT_EVIDENCE+'.before.json',serializeTimeout(before));await writeFile(process.env.HIRED_GUNS_TIMEOUT_EVIDENCE+'.terminal.json',json);}
},600000);
it.skipIf(!inputs)('private baseline/active ownership, call-time source capture, malformed data and complete v18 compatibility',async()=>{
 const {raw,level,base,c}=await actual(),moved=stepTimeout(level,c.session,c.world,[{mercenaryId:0,action:'turn-right'}]),json=await exportTimeout(level,raw,moved.session,moved.world);
 expect(await importTimeout(level,raw,JSON.parse(json))).toEqual({session:moved.session,world:moved.world});
 const caller=structuredClone(moved),map=structuredClone(level),bytes=structuredClone(raw),pending=exportTimeout(map,bytes,caller.session,caller.world);caller.world.tick++;caller.session.wet!.actors[0]!.body.fitness--;map.layers[0].fill(0);for(const k of ['map','items','roster'] as const)bytes[k].fill(0);expect(await pending).toBe(json);
 for(const key of ['map','items','roster'] as const){const bad=structuredClone(raw);bad[key][0]=bad[key][0]!^1;await expect(importTimeout(level,bad,JSON.parse(json))).rejects.toThrow();}
 for(const bad of [null,false,undefined,{profile:'wrong'}]){const session=structuredClone(moved.session);Object.defineProperty(session,'wetParty',{value:bad,enumerable:true});const saved=structuredClone(session);await expect(exportTimeout(level,raw,session,moved.world)).rejects.toThrow();await expect(exportTrainingSession(level,moved.world,session,raw)).rejects.toThrow();expect(()=>resetTrainingInventory(session,level)).toThrow();expect(session).toEqual(saved);}
 for(const key of ['wetParty','wetRegion']){let reads=0;const session=structuredClone(moved.session);Object.defineProperty(session,key,{enumerable:true,get(){reads++;throw Error('OWN');}});await expect(exportTimeout(level,raw,session,moved.world)).rejects.toThrow();expect(reads).toBe(0);}
 for(const key of ['wet','wetLifecycle'])for(const kind of ['missing','accessor','hidden'] as const){let reads=0;const session=structuredClone(moved.session),prior=Object.getOwnPropertyDescriptor(Object.prototype,key);
  if(kind==='missing')Reflect.deleteProperty(session,key);if(kind==='accessor')Object.defineProperty(session,key,{enumerable:true,get(){reads++;throw Error('OWN_REQUIRED');}});if(kind==='hidden')Object.defineProperty(session,key,{value:session[key as 'wet'],enumerable:false});
  const descriptors=Object.getOwnPropertyDescriptors(session);
  try{Object.defineProperty(Object.prototype,key,{configurable:true,get(){reads++;throw Error('INHERITED_REQUIRED');}});expect(()=>stepTimeout(level,session,moved.world,[])).toThrow();expect(()=>stepTimeoutLifecycle(level,session,moved.world,[])).toThrow();await expect(exportTimeout(level,raw,session,moved.world)).rejects.toThrow();expect(reads).toBe(0);expect(Object.getOwnPropertyDescriptors(session)).toEqual(descriptors);}finally{if(prior)Object.defineProperty(Object.prototype,key,prior);else Reflect.deleteProperty(Object.prototype,key);}
 }
 for(const mutate of [(x:typeof moved)=>x.session.wet!.actors[0]!.body.controlMethod=0,(x:typeof moved)=>x.session.wet!.actors[0]!.body.windowType=7,(x:typeof moved)=>x.session.wet!.actors[0]!.body.spellWater=97,(x:typeof moved)=>x.session.wet!.pads.push(0),(x:typeof moved)=>x.session.wet!.actors[0]!.pending=1]){
  const bad=structuredClone(moved);mutate(bad);const saved=structuredClone(bad);expect(()=>stepTimeout(level,bad.session,bad.world,[])).toThrow();expect(bad).toEqual(saved);
 }
 for(const commands of [[{mercenaryId:4,action:'forward' as const}],[{mercenaryId:0,action:'forward' as const},{mercenaryId:0,action:'turn-left' as const}]]){const saved=structuredClone(moved);expect(()=>stepTimeout(level,moved.session,moved.world,commands)).toThrow();expect(moved).toEqual(saved);}
 const legacy=await activateWetParty(level,raw,base.session,base.world,true),legacyJSON=await exportTrainingSession(level,legacy.world,legacy.session,raw);expect(JSON.parse(legacyJSON).version).toBe(18);expect(await importTrainingSession(level,raw,legacyJSON)).toEqual(legacy);
 const prior=structuredClone(c);prior.world.tick=59499;expect(()=>stepTimeout(level,prior.session,prior.world,[])).toThrow('future tick');expect(prior.world.tick).toBe(59499);expect(c.world.tick).toBe(0);
 const custom=Object.create({version:19});await expect(importTimeout(level,raw,custom)).rejects.toThrow();
 expect(resetTrainingInventory(base.session,level).indices).toEqual([1,3,0,5]);
},60000);
