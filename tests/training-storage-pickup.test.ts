import {expect,it} from 'vitest';
import {readFile,writeFile} from 'node:fs/promises';
import {STORAGE_LIMITS,STORAGE_PROFILE,STORAGE_SCENARIO,decodeStorageHistory,encodeStorageHistory,hasStoragePickup,reconstructStoragePickup,activateStoragePickup,stepStoragePickup,advanceOwnedStoragePickup,serializeStoragePickup,importStoragePickup,exportStoragePickup} from '../src/sim/training-storage-pickup';
import {TIMEOUT_LIMITS,encodeTimeoutHistory,stepTimeout} from '../src/sim/training-timeout';
import {WET_LIMITS} from '../src/sim/training-wet';
import {createTrainingSession,exportTrainingSession,importTrainingSession,resetTrainingInventory,type TrainingSession,type TrainingCandidate} from '../src/sim/training-session';
import {pickupCorpseStorage} from '../src/items/corpse-storage-pickup';
import {importEditorMap} from '../src/import/editor-map';
import {importItems,ITEM_FILE_BYTES} from '../src/import/items';
import {importCharacters,CHARACTER_FILE_BYTES} from '../src/import/characters';
import {constructInitialTeam} from '../src/import/original-team';
import {initialSelectedLifecycle,damageWetCandidate,wetLifecycleMap} from '../src/sim/training-wet-lifecycle';
import {createDemoLevel} from '../src/demo';
import {computeSourceWeight} from '../src/import/inventory';
import {cellIndex} from '../src/contracts';

it('distinct profile limits retain exact v19 and older caps',()=>{
 expect(STORAGE_LIMITS).toEqual(TIMEOUT_LIMITS);expect(WET_LIMITS.ticks).toBe(45000);
 expect(decodeStorageHistory([[59499,0]])).toEqual([{count:59499,codes:[]}]);expect(()=>decodeStorageHistory([[59500,0]])).toThrow();
 expect(encodeStorageHistory([{count:4,codes:[]},{count:1,codes:[26]},{count:3,codes:[]}])).toEqual([[4,1,26],[3,0]]);
 expect(()=>encodeTimeoutHistory([{count:1,commands:[{mercenaryId:0,action:'pickup' as never}]}])).toThrow();
 const full=Array.from({length:256},(_,i)=>({count:1,codes:[i%2?4:5]}));expect(decodeStorageHistory(encodeStorageHistory(full))).toEqual(full);expect(()=>encodeStorageHistory([...full,{count:1,codes:[0]}])).toThrow('packed');
});
it.each([[[0,0]],[[1,1]],[[0,1,28]],[[0,1,0,1]],[[0,1,5],[0,1,5]],[[1.5,0]],[[Number.MAX_SAFE_INTEGER,1]],[[0,1,5,4]],[[1,0],[1,0]],[[0,2,24]],[[0,1,24,6]],[[0,1,24],[0,1,25]],[[0,1,24],[1,1,24]],[[0,1,24],[0,1,24]],[[0,1,0,0]]].map(tuple=>({tuple})))('strict history rejects $tuple',({tuple})=>expect(()=>decodeStorageHistory(tuple)).toThrow());
it('marker malformed, hidden, inherited and accessor fail before legacy fallback/getters',async()=>{
 for(const value of [null,false,undefined,{profile:'wrong'}]){
  let reads=0;const s={storagePickup:value};Object.defineProperty(s,'wet',{enumerable:true,get(){reads++;throw Error('CANARY');}});
  expect(()=>resetTrainingInventory(s as never)).toThrow();await expect(exportTrainingSession({} as never,{} as never,s as never,{} as never)).rejects.toThrow();expect(reads).toBe(0);
 }
 for(const kind of ['hidden','accessor','inherited']){let reads=0;const s={};const old=Object.getOwnPropertyDescriptor(Object.prototype,'storagePickup');
  try{if(kind==='inherited')Object.defineProperty(Object.prototype,'storagePickup',{configurable:true,get(){reads++;throw Error('CANARY');}});else Object.defineProperty(s,'storagePickup',kind==='hidden'?{value:{profile:STORAGE_PROFILE}}:{enumerable:true,get(){reads++;throw Error('CANARY');}});
   expect(()=>hasStoragePickup(s as never)).toThrow();expect(reads).toBe(0);
  }finally{if(old)Object.defineProperty(Object.prototype,'storagePickup',old);else Reflect.deleteProperty(Object.prototype,'storagePickup');}
 }
 expect(hasStoragePickup({} as never)).toBe(false);
});
it('direct object import enforces strict UTF8 wrapper bytes before callbacks or hashing',async()=>{
 let reads=0;const raw={map:new Uint8Array(157738),roster:new Uint8Array(16320),items:new Uint8Array(32604)},wrapper={format:'hired-guns-training-session',version:21,scenario:STORAGE_SCENARIO,sources:{},indices:[],rules:{mode:'first-exit',timeLimit:99},history:[],checkpoint:{padding:'é'.repeat(12288)}},control={get isCurrent():()=>boolean{reads++;throw Error('CALLBACK');}};
 await expect(importStoragePickup(createDemoLevel(),raw,wrapper,control)).rejects.toThrow('byte budget');expect(reads).toBe(0);
});
async function synthetic(){
 const level=createDemoLevel(),items=await importItems(new Uint8Array(ITEM_FILE_BYTES)),roster=await importCharacters(new Uint8Array(CHARACTER_FILE_BYTES));
 for(const r of roster.records)Object.assign(r.stats,{physique:100,agility:100,fitness:65535});items.records[0]!.weight=140;
 const t=constructInitialTeam(roster,items,[1,3,0,5]),team={profile:'ocs-initial-team-v1',sources:{roster:roster.source,items:items.source},actors:t.actors.map(a=>({...a,weight:{...a.weight,status:'verified'}}))};
 const baseline={team,items,indices:[1,3,0,5],names:['A','B','C','D'],encounter:null,encounterGun:null,patrol:null,inventory:{commands:[],actors:[]},gate:null,ground:null} as unknown as TrainingSession;
 let c=initialSelectedLifecycle(level,baseline,[0,0,3,4],{mode:'navigation',timeLimit:null});
 // Internal unit fixture only, not activation/source admission: exercise the
 // domain controls phase on authored geometry without a forged source hash.
 c.world.mission.rules={mode:'first-exit',timeLimit:99};c.session.wet!.rules={mode:'first-exit',timeLimit:99};
 c.session={...c.session,wetParty:{profile:'four-controlled-timeout-v1'},storagePickup:{profile:STORAGE_PROFILE,history:[],outcome:null,lastPositions:[0,0,0,0]}};
 // Public authored placement: dead teammate's retained body, source helper owns corpse.
 c=damageWetCandidate(level,c,3,65535);const target=c.session.wetLifecycle!.actors[3]!.death!.target!;
 const a=c.session.wet!.actors[2]!,old=a.current,p=c.world.mercenaries[3]!;Object.assign(c.world.mercenaries[2]!,{x:p.x,y:p.y,z:p.z});a.current=target;a.old=target;
 const overlay=c.session.wet!.overlays,depart=overlay.find(x=>x[0]===old)!;depart[1]=(depart[1]&0xf07e07fd)>>>0;
 const at=overlay.find(x=>x[0]===target)!;at[1]=((at[1]&0xf07e07fd)|((40+c.world.mercenaries[2]!.facing)<<11)|2|(2<<23))>>>0;
 const source=c.session.wet!.actors[3]!.body,entry={itemId:1,damage:17,ammo:3,fourthByte:222,rawHex:'011103de'};source.inventory.carried[0]=entry;
 const weight=computeSourceWeight(items,source.inventory,source.physique);if(weight.status!=='computed')throw Error('fixture');const {status:_,...values}=weight;void _;source.weight=values;
 c.session={...c.session,inventory:{commands:[],actors:c.session.wet!.actors.map(a=>({inventory:structuredClone(a.body.inventory),weight:{...a.body.weight,status:'verified'},selection:0}))}};
 return {level,c};
}
it('whole tick controls precede timeout; native equipment outline retained; dead source weight recalculated',async()=>{
 const {level,c}=await synthetic(),before=structuredClone(c);c.world.tick=59498;c.session.storagePickup!.history=[{count:59498,codes:[]}];
 const r=stepStoragePickup(level,c.session,c.world,[],2);
 expect(r.world.tick).toBe(59499);expect(r.world.mission.reason).toBe('time-expired');expect(r.session.storagePickup!.outcome).toBe('transferred');
 expect(r.session.wet!.actors[2]!.body.inventory.carried[0]!.rawHex).toBe('011103ff');expect(r.session.wet!.actors[2]!.body.weight.totalWeight).toBe(140);expect(r.session.wet!.actors[3]!.body.weight.totalWeight).toBe(0);
 expect(r.session.wet!.corpses).toEqual(before.session.wet!.corpses);expect(r.session.wetLifecycle!.second).toEqual(before.session.wetLifecycle!.second);
 expect(stepStoragePickup(level,r.session,r.world,[],2)).toMatchObject({session:r.session,world:r.world,events:[]});expect(before.session.wet!.actors[2]!.body.inventory.equipped.itemId).toBe(0);
});
it('Main owned transition equals public captured transition, including entire pair/events, without input writes',async()=>{
 const {level,c}=await synthetic(),before=structuredClone(c),publicTick=stepStoragePickup(level,c.session,c.world,[],2),owned=advanceOwnedStoragePickup(level,c.session,c.world,[],2);
 expect(owned).toEqual(publicTick);expect(c).toEqual(before);
 const next=advanceOwnedStoragePickup(level,owned.session,owned.world,[],null);expect(next).toEqual(stepStoragePickup(level,owned.session,owned.world,[]));
});
it('equipment pickup uses current cell, never the corpse in the facing cell',async()=>{
 const {level,c}=await synthetic(),a=c.session.wet!.actors[2]!,corpse=a.current,p=c.world.mercenaries[2]!;
 p.y++;p.facing=0;const current=cellIndex(level,p);a.current=current;a.old=current;
 const old=c.session.wet!.overlays.find(x=>x[0]===corpse)!;old[1]=(old[1]&0xf07e07fd)>>>0;
 c.session.wet!.overlays.push([current,((level.layers[0][current]!&0xf07e07fd)|(40<<11)|2|(2<<23))>>>0,level.layers[2][current]!]);c.session.wet!.overlays.sort((a,b)=>a[0]-b[0]);
 const before=structuredClone(c.session.wet!.actors[3]!.body.inventory),r=stepStoragePickup(level,c.session,c.world,[],2);
 expect(r.session.storagePickup!.outcome).toBe('profile-refusal');expect(r.session.wet!.actors[2]!.body.inventory.equipped.itemId).toBe(0);expect(r.session.wet!.actors[3]!.body.inventory).toEqual(before);
});
it('scheduled fatal drowning is committed before queued pickup, not rolled back to preserve equipment',async()=>{
 const {level,c}=await synthetic(),a=c.session.wet!.actors[2]!,i=a.current;
 // Give the candidate a wet source cell with source corpse already below it;
 // omit preexisting corpse so a fatal hazard can install its own skeleton.
 const sourceDeath=c.session.wetLifecycle!.actors[3]!.death!;sourceDeath.target=null;c.session.wet!.corpses=[];c.session.wetLifecycle!.second=[];
 const at=c.session.wet!.overlays.find(x=>x[0]===i)!;at[1]=(at[1]&0x0fffffdf)>>>0;
 level.layers[0][i]=4|(2<<17)|1;at[1]=((at[1]&0xf0000020)|level.layers[0][i]!|((40+c.world.mercenaries[2]!.facing)<<11)|2|(2<<23))>>>0;
 a.body.fitness=654;a.body.underwaterCount=1;c.session.wet!.drownCounter=49;
 const previous=structuredClone(c),r=stepStoragePickup(level,c.session,c.world,[],2);
 expect(r.world.tick).toBe(previous.world.tick+1);expect(r.session.wet!.actors[2]!.runtimeDeadWord).toBe(0xff00);expect(r.session.storagePickup!.outcome).toBe('caller-guard');expect(r.session.wet!.drownCounter).toBe(0);expect(r.session.wet!.actors[2]!.body.inventory.equipped.itemId).toBe(0);expect(c).toEqual(previous);
});
it('single attempt, no co-command, malformed commands and prospective budget refuse whole pair',async()=>{
 const {level,c}=await synthetic(),before=structuredClone(c),r=stepStoragePickup(level,c.session,c.world,[],2);
 expect(()=>stepStoragePickup(level,r.session,r.world,[],2)).toThrow('single attempt');expect(()=>stepStoragePickup(level,c.session,c.world,[{mercenaryId:0,action:'forward'}],2)).toThrow('pickup-only');expect(()=>stepStoragePickup(level,c.session,c.world,[{mercenaryId:5,action:'forward'}])).toThrow();
 const large=structuredClone(c);large.world.tick=256;large.session.storagePickup!.history=Array.from({length:256},(_,i)=>({count:1,codes:[i%2?4:5]}));const saved=structuredClone(large);expect(()=>stepStoragePickup(level,large.session,large.world,[],2)).toThrow('packed');expect(large).toEqual(saved);expect(c).toEqual(before);
});
it('newly equipped inventory participates in subsequent wet damage; dead corpse weight remains retained',async()=>{
 const {level,c}=await synthetic(),picked=stepStoragePickup(level,c.session,c.world,[],2),a=picked.session.wet!.actors[2]!,i=a.current;
 level.layers[0][i]=4|(2<<17)|1;
 // Independently chosen source arithmetic:17+2 damage bytes is19; no replacement.
 picked.session.items.records[0]!.waterDamage=2;picked.session.items.records[0]!.maxDamage=65535;
 picked.session.wet!.drownCounter=49;const before=structuredClone(picked.session.wet!.actors[3]!),r=stepStoragePickup(level,picked.session,picked.world,[]);
 expect(r.session.wet!.actors[2]!.body.inventory.carried[0]!.rawHex).toBe('011303ff');expect(r.session.wet!.actors[2]!.body.underwaterCount).toBe(1);expect(r.session.wet!.actors[2]!.itemPasses).toBe(a.itemPasses+1);expect(r.session.wet!.actors[3]).toEqual(before);expect(r.session.wet!.actors[3]!.body.weight.totalWeight).toBe(0);
});
it.each(['session-extra','body-extra','raw-tail','selection','outcome','co-command','split','tick'])('direct profile refuses malformed %s atomically',async kind=>{
 const {level,c}=await synthetic();if(kind==='session-extra')Object.assign(c.session,{extra:1});if(kind==='body-extra')Object.assign(c.session.wet!.actors[0]!.body,{extra:1});if(kind==='raw-tail')c.session.wet!.actors[0]!.body.inventory.carried[29]!.rawHex='00ffffff';if(kind==='selection')c.session.inventory.actors[0]!.selection=1;if(kind==='outcome')c.session.storagePickup!.outcome='transferred';
 if(kind==='split')c.session.storagePickup!.history=[{count:1,codes:[]},{count:1,codes:[]}];if(kind==='tick')c.world.tick=1;
 const before=structuredClone(c);expect(()=>stepStoragePickup(level,c.session,c.world,kind==='co-command'?[{mercenaryId:0,action:'forward'}]:[],kind==='co-command'?2:null)).toThrow();expect(c).toEqual(before);
});
it.each(['living-owner','full','source-using','gap','heavy','not-current-corpse'])('live admission excludes %s separately from native policy',async kind=>{
 const {level,c}=await synthetic();if(kind==='living-owner'){c.session.wet!.actors[3]!.runtimeDeadWord=0;c.session.wet!.actors[3]!.body.statsDeadWord=0;if(c.world.physics.mode==='source-wet')c.world.physics.deadWords[3]=0;expect(()=>stepStoragePickup(level,c.session,c.world,[],2)).toThrow();return;}
 if(kind==='full')c.session.wet!.actors[2]!.body.inventory.carried=Array.from({length:30},()=>structuredClone(c.session.wet!.actors[3]!.body.inventory.carried[0]!));
 if(kind==='source-using')c.session.wet!.actors[3]!.body.inventory.equipped=c.session.wet!.actors[3]!.body.inventory.carried[0]!;
 if(kind==='gap'){c.session.wet!.actors[3]!.body.inventory.carried[1]=c.session.wet!.actors[3]!.body.inventory.carried[0]!;c.session.wet!.actors[3]!.body.inventory.carried[0]={itemId:0,damage:0,ammo:0,fourthByte:0,rawHex:'00000000'};}
 if(kind==='heavy')c.session.wet!.actors[2]!.body.weight.tooHeavy=true;
 if(kind==='not-current-corpse'){const i=c.session.wet!.actors[2]!.current;c.session.wet!.overlays.find(x=>x[0]===i)![1]&=0x0fffffdf;c.session.wet!.corpses=[];c.session.wetLifecycle!.second=[];c.session.wetLifecycle!.actors[3]!.death!.target=null;}
 c.session.inventory.actors=c.session.wet!.actors.map(a=>({inventory:structuredClone(a.body.inventory),weight:{...a.body.weight,status:'verified'},selection:0}));
 const r=stepStoragePickup(level,c.session,c.world,[],2);expect(r.session.storagePickup!.outcome).toBe('profile-refusal');expect(r.world.tick).toBe(1);
});

const provider=process.env.HIRED_GUNS_STORAGE_PROVIDER,packet=process.env.HIRED_GUNS_STORAGE_PACKET;
async function actual(){const m=JSON.parse(await readFile(provider!,'utf8')),raw={map:new Uint8Array(await readFile(m.map)),roster:new Uint8Array(await readFile(m.roster)),items:new Uint8Array(await readFile(m.items))};const {level}=await importEditorMap(raw.map),base=await createTrainingSession(level,raw,[1,3,0,5]),c=await activateStoragePickup(level,raw,base.session,base.world,true);return {raw,level,base,c};}
function as21(s:Record<string,unknown>){const copy=structuredClone(s) as ReturnType<typeof JSON.parse>;copy.version=21;copy.scenario=STORAGE_SCENARIO;delete copy.checkpoint.pickup;copy.checkpoint.storagePickup={profile:STORAGE_PROFILE,outcome:null,lastPositions:[0,0,0,0]};return copy;}
it.skipIf(!provider||!packet)('private primitive agrees with independently sealed entire native pair and110diff leaves',async()=>{
 const before=JSON.parse(await readFile(packet+'/full-before.json','utf8')) as TrainingCandidate,expected=JSON.parse(await readFile(packet+'/reference-actual-after.json','utf8')),map=JSON.parse(await readFile(packet+'/full-level.json','utf8'));
 const id=2,wet=before.session.wet!,i=wet.actors[id]!.current,g=wetLifecycleMap(map,before.session),r=pickupCorpseStorage({actors:wet.actors.map(a=>a.body),deadWords:wet.actors.map(a=>a.runtimeDeadWord),players:wet.actors.map(()=>({selection:0,lastPosition:0,noRoom:0,heavyCount:0})),recipient:id,cell:{first:g.layers[0][i]!,second:g.layers[1][i]!,third:g.layers[2][i]!},redraw:before.session.wetLifecycle!.redraw},before.session.items);
 const pair=structuredClone(before);for(const j of [2,3]){pair.session.wet!.actors[j]!.body=r.state.actors[j]!;pair.session.inventory.actors[j]={inventory:r.state.actors[j]!.inventory,weight:{...r.state.actors[j]!.weight,status:'verified'},selection:0};}
 expect(r.outcome).toBe('transferred');expect(pair).toEqual(expected.pair);expect(pair.session.wet!.actors[2]!.body.weight.totalWeight-before.session.wet!.actors[2]!.body.weight.totalWeight).toBe(750);
});
it.skipIf(!provider||!packet)('private every stage full recovery, actual pre-pickup control tick, continuation and both Retry rules',async()=>{
 const {raw,level,base,c:initial}=await actual(),stages=process.env.HIRED_GUNS_STORAGE_STAGES!;
 let pre:TrainingCandidate=initial;
 for(const stage of ['initial','wet-before-death','death-attempt','pre-pickup']){const v=as21(JSON.parse(await readFile(stages+'/'+stage+'.json','utf8'))),c=await importStoragePickup(level,raw,v);expect(JSON.parse(await exportStoragePickup(level,raw,c.session,c.world))).toEqual(v);pre=c;}
 const legacySession=structuredClone(pre.session);Reflect.deleteProperty(legacySession,'storagePickup');
 const ordinary=stepTimeout(level,legacySession,pre.world,[]),r=stepStoragePickup(level,pre.session,pre.world,[],2);
 expect(r.world).toEqual(ordinary.world);expect(r.session.wet!.drownCounter).toBe(ordinary.session.wet!.drownCounter);expect(r.session.wet!.fallCounter).toBe(ordinary.session.wet!.fallCounter);expect(r.session.storagePickup!.outcome).toBe('transferred');
 const json=await exportTrainingSession(level,r.world,r.session,raw);expect(Buffer.byteLength(json)).toBeLessThan(24576);expect(await importTrainingSession(level,raw,json)).toEqual({session:r.session,world:r.world});
 let continued={session:r.session,world:r.world};for(let i=0;i<50;i++){const n=stepStoragePickup(level,continued.session,continued.world,[]);continued={session:n.session,world:n.world};}const after=await exportStoragePickup(level,raw,continued.session,continued.world);expect(await importStoragePickup(level,raw,JSON.parse(after))).toEqual(continued);
 for(const mode of ['first-exit','cooperative-extraction'] as const){const reset=resetTrainingInventory(continued.session,level,{mode,timeLimit:99});expect(reset.wet!.actors).toEqual(initial.session.wet!.actors);expect(reset.storagePickup).toEqual(initial.session.storagePickup);}
 const oldHooks={get isCurrent():()=>boolean{throw Error('LEGACY_HOOK');}};const old=await exportTrainingSession(level,base.world,base.session,raw,oldHooks);expect(await importTrainingSession(level,raw,old,oldHooks)).toEqual(base);
 if(process.env.HIRED_GUNS_STORAGE_OUTPUT)await writeFile(process.env.HIRED_GUNS_STORAGE_OUTPUT,JSON.stringify({post:JSON.parse(json),continued:JSON.parse(after),bytes:Buffer.byteLength(json),continuedBytes:Buffer.byteLength(after)},null,2));
},180000);
const mutations=[
 {name:'lastPositions',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.storagePickup.lastPositions[2]=1},
 {name:'recipient equipment',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.state.actors[2].body.inventory.carried[0].itemId=0},
 {name:'opaque empty tail',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.state.actors[3].body.inventory.carried[29].fourthByte++},
 {name:'separate actions',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.state.actors[0].body.inventory.actions[0].ammo++},
 {name:'corpse weight',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.state.actors[3].body.weight.totalWeight++},
 {name:'RNG',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.world.rng++},
 {name:'tick',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.world.tick++},
 {name:'opaque plane',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.state.overlays[0][1]^=1},
 {name:'corpse owner',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.lifecycle.second[0][1]^=4096},
 {name:'death search',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.lifecycle.actors[3].death.target++},
 {name:'outcome',mutate:(x:ReturnType<typeof JSON.parse>)=>x.checkpoint.storagePickup.outcome='empty-corpse'},
 {name:'actor history',mutate:(x:ReturnType<typeof JSON.parse>)=>x.history.at(-1)[2]=25},
];
it.skipIf(!provider||!packet).each(mutations)('private complete chronology refuses $name tamper',async({mutate})=>{
 const {level,raw}=await actual(),stages=process.env.HIRED_GUNS_STORAGE_STAGES!,v=as21(JSON.parse(await readFile(stages+'/pre-pickup.json','utf8'))),pre=await importStoragePickup(level,raw,v),post=stepStoragePickup(level,pre.session,pre.world,[],2),json=serializeStoragePickup(post),bad=JSON.parse(json);
 mutate(bad);await expect(importTrainingSession(level,raw,JSON.stringify(bad))).rejects.toThrow();expect(serializeStoragePickup(post)).toBe(json);
},180000);
it.skipIf(!provider)('private call-time snapshots precede control getters/callbacks and real timer cancellation',async()=>{
 const {level,raw,c}=await actual(),r=stepStoragePickup(level,c.session,c.world,[{mercenaryId:0,action:'turn-right'}]),canonical=await exportStoragePickup(level,raw,r.session,r.world);
 const map=structuredClone(level),bytes=structuredClone(raw),caller=structuredClone(r);let reads=0;
 const control={get isCurrent(){reads++;map.layers[0].fill(0);for(const k of ['map','roster','items']as const)bytes[k].fill(0);caller.world.tick=99999;return ()=>true;},onProgress:()=>{caller.session.storagePickup!.history=[];}};
 expect(await exportStoragePickup(map,bytes,caller.session,caller.world,control)).toBe(canonical);expect(reads).toBe(1);
 const long=JSON.parse(serializeStoragePickup(c));long.history=[[59498,0]];let current=true,processed=0,timer=false;
 await expect(importStoragePickup(level,raw,long,{isCurrent:()=>current,onProgress:p=>{processed=p.processed;if(p.processed>0)setTimeout(()=>{timer=true;current=false;},0);}})).rejects.toThrow('cancelled');expect(timer).toBe(true);expect(processed).toBeGreaterThan(0);expect(processed).toBeLessThanOrEqual(16);
},60000);
it.skipIf(!provider)('private raw sources and full inputs are captured before every digest, malformed inputs before runtime getters',async()=>{
 const {level,raw,c}=await actual(),canonical=serializeStoragePickup(c),digest=crypto.subtle.digest;let observed=0;
 for(let phase=1;phase<=32;phase++){
  const map=structuredClone(level),bytes=structuredClone(raw),caller=structuredClone(c);let calls=0,changed=false;
  crypto.subtle.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(++calls===phase){changed=true;map.layers[0].fill(0);caller.world.rng=0;caller.session.wet!.actors[0]!.body.inventory.actions[0]!.ammo=255;for(const k of ['map','roster','items']as const)bytes[k].fill(0);}return digest.apply(this,args);};
  try{expect(await exportStoragePickup(map,bytes,caller.session,caller.world)).toBe(canonical);}finally{crypto.subtle.digest=digest;}
  if(!changed)break;observed++;
 }
 expect(observed).toBeGreaterThan(3);
 let reads=0;const bad=structuredClone(c.session);Object.defineProperty(bad,'wet',{enumerable:true,get(){reads++;throw Error('AUTHORITY_GETTER');}});const controls={get isCurrent():()=>boolean{reads++;throw Error('CONTROL_GETTER');}};
 await expect(exportStoragePickup(level,raw,bad,c.world,controls)).rejects.toThrow();expect(reads).toBe(0);
},60000);
it.skipIf(!provider)('private final serialization cancellation refuses before returning a save',async()=>{
 const {level,raw,c}=await actual(),r=stepStoragePickup(level,c.session,c.world,[{mercenaryId:0,action:'turn-right'}]),canonical=serializeStoragePickup(r),stringify=JSON.stringify;let current=true,replayed=false,flipped=false;
 JSON.stringify=function(this:typeof JSON,...args:Parameters<typeof JSON.stringify>){const text=stringify.apply(this,args);if(replayed&&text===canonical){current=false;flipped=true;}return text;}as typeof JSON.stringify;
 try{await expect(exportStoragePickup(level,raw,r.session,r.world,{isCurrent:()=>current,onProgress:p=>{if(p.phase==='replaying'&&p.processed===1&&p.total===1)replayed=true;}})).rejects.toThrow('cancelled');expect(flipped).toBe(true);}finally{JSON.stringify=stringify;}
},60000);

it.skipIf(!provider).each(['activate','reconstruct','import','export'] as const)('private %s captures every authority before both callback getters and each digest',async api=>{
 const {level,raw,base,c}=await actual(),canonical=serializeStoragePickup(c),digest=crypto.subtle.digest;
 function inputs(){return {map:structuredClone(level),bytes:structuredClone(raw),caller:structuredClone(c),baseline:structuredClone(base),wrapper:JSON.parse(canonical),indices:[1,3,0,5],rules:structuredClone(c.session.wet!.rules),history:[] as number[][]};}
 function execute(s:ReturnType<typeof inputs>,control?:Parameters<typeof importStoragePickup>[3]){return api==='activate'?activateStoragePickup(s.map,s.bytes,s.baseline.session,s.baseline.world,true,control):api==='reconstruct'?reconstructStoragePickup(s.map,s.bytes,s.indices,s.rules,s.history,control):api==='import'?importStoragePickup(s.map,s.bytes,s.wrapper,control):exportStoragePickup(s.map,s.bytes,s.caller.session,s.caller.world,control);}
 const mutate=(s:ReturnType<typeof inputs>)=>{s.map.layers[0].fill(0);for(const k of ['map','roster','items']as const)s.bytes[k].fill(0);s.caller.world.tick=99999;s.baseline.world.rng=0;s.wrapper.checkpoint.storagePickup.lastPositions[0]=29;s.indices[0]=11;s.rules.timeLimit=1;s.history.push([99999,0]);};
 for(const which of ['isCurrent','onProgress']){const s=inputs();let currentReads=0,progressReads=0;const control={get isCurrent(){currentReads++;if(which==='isCurrent')mutate(s);return ()=>true;},get onProgress(){progressReads++;if(which==='onProgress')mutate(s);return (p:unknown)=>{expect(Object.isFrozen(p)).toBe(true);};}} satisfies Parameters<typeof importStoragePickup>[3];const result=await execute(s,control);expect(typeof result==='string'?result:serializeStoragePickup(result)).toBe(canonical);expect(currentReads).toBe(1);expect(progressReads).toBe(1);}
 let observed=0;for(let phase=1;phase<=32;phase++){const s=inputs();let calls=0,changed=false;crypto.subtle.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(++calls===phase){changed=true;mutate(s);}return digest.apply(this,args);};try{const result=await execute(s);expect(typeof result==='string'?result:serializeStoragePickup(result)).toBe(canonical);}finally{crypto.subtle.digest=digest;}if(!changed)break;observed++;}expect(observed).toBeGreaterThan(3);
 for(const bad of ['indices','rules','accessor','raw']){const s=inputs();let reads=0;const control={get isCurrent():()=>boolean{reads++;throw Error('CALLBACK');},get onProgress():()=>void{reads++;throw Error('CALLBACK');}};
 if(bad==='indices'){s.indices[1]=s.indices[0]!;Object.assign(s.baseline.session,{indices:s.indices});Object.assign(s.caller.session,{indices:s.indices});s.wrapper.indices=s.indices;}if(bad==='rules'){s.rules.timeLimit=1;s.baseline.world.mission.rules=s.rules;s.caller.session.wet!.rules=s.rules;s.wrapper.rules=s.rules;}if(bad==='accessor')Object.defineProperty(s.map,'layers',{enumerable:true,get(){reads++;throw Error('GETTER');}});if(bad==='raw')Object.defineProperty(s.bytes,'items',{enumerable:true,get(){reads++;throw Error('RAW');}});
 await expect(execute(s,control)).rejects.toThrow();expect(reads).toBe(0);}
},120000);

it('ordinary fall cadence and pickup compose without dropping counter/delay/clock writes',async()=>{
 const {level,c}=await synthetic();c.session.wet!.fallCounter=6;c.session.wet!.drownCounter=30;c.session.wet!.actors[2]!.delay=1;
 const legacy=structuredClone(c.session);Reflect.deleteProperty(legacy,'storagePickup');const ordinary=stepTimeout(level,legacy,c.world,[]),r=stepStoragePickup(level,c.session,c.world,[],2);
 expect(r.world).toEqual(ordinary.world);expect(r.session.wet!.fallCounter).toBe(1);expect(r.session.wet!.drownCounter).toBe(31);for(let i=0;i<4;i++)expect(r.session.wet!.actors[i]!.delay).toBe(ordinary.session.wet!.actors[i]!.delay);expect(r.session.storagePickup!.outcome).toBe('transferred');
});
it.each(['fall-geometry','corpse-replacement'])('unsupported %s refuses the entire pair',async kind=>{
 const {level,c}=await synthetic(),a=c.session.wet!.actors[2]!,i=a.current;
 if(kind==='fall-geometry')level.layers[0][i]=4;else{a.body.fitness=1;a.body.underwaterCount=1;c.session.wet!.drownCounter=49;level.layers[0][i]=4|(2<<17)|1;}
 const before=structuredClone(c);expect(()=>stepStoragePickup(level,c.session,c.world,[],2)).toThrow();expect(c).toEqual(before);
});
it('pickup-only tick then timeout resolves all-dead priority and terminal freeze',async()=>{
 const {level,c}=await synthetic();c.session.wetLifecycle!.actors[3]!.death!.target=null;c.session.wet!.corpses=[];c.session.wetLifecycle!.second=[];const at=c.session.wet!.overlays.find(x=>x[0]===c.session.wet!.actors[2]!.current)!;at[1]=(at[1]&0x0fffffdf)>>>0;for(const id of [0,1,2]){const damaged=damageWetCandidate(level,c,id,65535);c.session=damaged.session;c.world=damaged.world;}c.world.tick=59498;c.session.storagePickup!.history=[{count:59498,codes:[]}];
 const r=stepStoragePickup(level,c.session,c.world,[],2);expect(r.world.tick).toBe(59499);expect(r.session.storagePickup!.outcome).toBe('caller-guard');expect(r.world.mission.reason).toBe('all-dead');expect(stepStoragePickup(level,r.session,r.world,[],2)).toMatchObject({session:r.session,world:r.world,events:[]});
});

it.skipIf(!provider).each(['activate','reconstruct','import','export']as const)('private %s cancels at every digest without returning or progressing into replay',async api=>{
 const {level,raw,base,c}=await actual(),saved=JSON.parse(serializeStoragePickup(c)),digest=crypto.subtle.digest;
 const run=(control:Parameters<typeof importStoragePickup>[3])=>api==='activate'?activateStoragePickup(level,raw,base.session,base.world,true,control):api==='reconstruct'?reconstructStoragePickup(level,raw,base.session.indices,c.session.wet!.rules,[],control):api==='import'?importStoragePickup(level,raw,saved,control):exportStoragePickup(level,raw,c.session,c.world,control);
 let count=0;crypto.subtle.digest=async function(...args:Parameters<SubtleCrypto['digest']>){count++;return digest.apply(this,args);};try{await run({isCurrent:()=>true});}finally{crypto.subtle.digest=digest;}expect(count).toBeGreaterThan(3);
 for(let phase=1;phase<=count;phase++){let current=true,calls=0;crypto.subtle.digest=async function(...args:Parameters<SubtleCrypto['digest']>){const result=await digest.apply(this,args);if(++calls===phase)current=false;return result;};try{await expect(run({isCurrent:()=>current,onProgress:p=>{if(!current)throw Error('STALE_PROGRESS');expect(Object.isFrozen(p)).toBe(true);}})).rejects.toThrow('cancelled');}finally{crypto.subtle.digest=digest;}}
},180000);

it('public stepping and serialization refuse a forged mirror without repairing or mutating it',async()=>{const {level,c}=await synthetic();c.session.inventory.actors[0]!.inventory.actions[9]!.ammo=254;const before=structuredClone(c);expect(()=>stepStoragePickup(level,c.session,c.world,[])).toThrow('mirror');expect(()=>serializeStoragePickup(c)).toThrow('mirror');expect(c).toEqual(before);});
