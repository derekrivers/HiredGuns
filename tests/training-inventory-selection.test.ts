import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {INVENTORY_SELECTION_PROFILE,INVENTORY_SELECTION_LIMITS,decodeInventorySelectionHistory,encodeInventorySelectionHistory,hasInventorySelection,stepInventorySelection as publicStepInventorySelection,advanceOwnedInventorySelection,serializeInventorySelection,activateInventorySelection,exportInventorySelection,importInventorySelection,reconstructInventorySelection} from '../src/sim/training-inventory-selection';
import {emptyInventoryTemp} from '../src/items/inventory-window';
import {createTrainingSession,exportTrainingSession,importTrainingSession,resetTrainingInventory,type TrainingSession} from '../src/sim/training-session';
import {importEditorMap} from '../src/import/editor-map';
import {importItems,ITEM_FILE_BYTES} from '../src/import/items';
import {importCharacters,CHARACTER_FILE_BYTES} from '../src/import/characters';
import {constructInitialTeam} from '../src/import/original-team';
import {initialSelectedLifecycle,damageWetCandidate} from '../src/sim/training-wet-lifecycle';
import {createDemoLevel} from '../src/demo';
import {computeSourceWeight} from '../src/import/inventory';
import {TIMEOUT_LIMITS} from '../src/sim/training-timeout';
import type {LevelData,PlayerCommand,WorldState} from '../src/contracts';
import type {InventorySelectionOperation} from '../src/sim/training-inventory-selection';
// Authored domain fixtures enter the internal owned transition. Public source
// APIs require a complete raw3-verified immutable baseline, tested separately.
const stepInventorySelection=(level:LevelData,session:TrainingSession,world:WorldState,commands:PlayerCommand[],op:InventorySelectionOperation|null=null)=>advanceOwnedInventorySelection(level,session,world,commands,op);
async function synthetic(){
 const itemBytes=new Uint8Array(ITEM_FILE_BYTES);itemBytes[261]=140;
 const level=createDemoLevel(),items=await importItems(itemBytes),roster=await importCharacters(new Uint8Array(CHARACTER_FILE_BYTES));
 for(const r of roster.records)Object.assign(r.stats,{physique:100,agility:100,fitness:65535});
 const t=constructInitialTeam(roster,items,[1,3,0,5]),team={profile:'ocs-initial-team-v1',sources:{roster:roster.source,items:items.source},actors:t.actors.map(a=>({...a,weight:{...a.weight,status:'verified'}}))};
 const baseline={team,items,indices:[1,3,0,5],names:['A','B','C','D'],encounter:null,encounterGun:null,patrol:null,inventory:{commands:[],actors:[]},gate:null,ground:null} as unknown as TrainingSession;
 let c=initialSelectedLifecycle(level,baseline,[0,0,3,4],{mode:'navigation',timeLimit:null});
 // Internal unit fixture only, not activation/source admission: exercise the
 // domain controls phase on authored geometry without a forged source hash.
 c.world.mission.rules={mode:'first-exit',timeLimit:99};c.session.wet!.rules={mode:'first-exit',timeLimit:99};
 c.session={...c.session,wetParty:{profile:'four-controlled-timeout-v1'},inventorySelection:{profile:INVENTORY_SELECTION_PROFILE,history:[],outcome:null,lastPositions:[0,0,0,0],tempEntries:Array.from({length:4},emptyInventoryTemp),phase:'waiting',recipient:null,windowOutcomes:[],selectionOutcomes:[],selections:[0,0,0,0]}};
 // Public authored placement: dead teammate's retained body, source helper owns corpse.
 c=damageWetCandidate(level,c,3,65535);const target=c.session.wetLifecycle!.actors[3]!.death!.target!;
 const a=c.session.wet!.actors[2]!,old=a.current,p=c.world.mercenaries[3]!;Object.assign(c.world.mercenaries[2]!,{x:p.x,y:p.y,z:p.z});a.current=target;a.old=target;
 const overlay=c.session.wet!.overlays,depart=overlay.find(x=>x[0]===old)!;depart[1]=(depart[1]&0xf07e07fd)>>>0;
 const at=overlay.find(x=>x[0]===target)!;at[1]=((at[1]&0xf07e07fd)|((40+c.world.mercenaries[2]!.facing)<<11)|2|(2<<23))>>>0;
 const source=c.session.wet!.actors[3]!.body,entry={itemId:1,damage:17,ammo:3,fourthByte:222,rawHex:'011103de'};source.inventory.carried[0]=entry;
 const weight=computeSourceWeight(items,source.inventory,source.physique);if(weight.status!=='computed')throw Error('fixture');const {status:_,...values}=weight;void _;source.weight=values;
 c.session.wet!.actors[2]!.body.inventory.carried[0]=structuredClone(entry);c.session.wet!.actors[2]!.body.weight=structuredClone(values);
 c.session={...c.session,inventory:{commands:[],actors:c.session.wet!.actors.map(a=>({inventory:structuredClone(a.body.inventory),weight:{...a.body.weight,status:'verified'},selection:0}))}};
 return {level,c};
}

it('strict sole count1 storage/open/back/forward/close history and immutable legacy limits',()=>{
 expect(INVENTORY_SELECTION_LIMITS).toEqual(TIMEOUT_LIMITS);
 const v=[[0,1,26],[4,1,30],[1,1,34],[32,1,38],[0,1,42]];expect(encodeInventorySelectionHistory(decodeInventorySelectionHistory(v))).toEqual(v);
 for(const x of [[[0,1,34]],[[0,1,26],[0,1,31]],[[0,2,26]],[[0,1,26,0]],[[0,1,26],[0,1,30],[0,1,42]],[[59500,0]],[[0,1,44]],[[0,1,0,1]],[[0,1,5],[0,1,5]]])expect(()=>decodeInventorySelectionHistory(x)).toThrow();
 const h=Array.from({length:256},(_,i)=>({count:1,codes:[i%2?22:23]}));expect(decodeInventorySelectionHistory(encodeInventorySelectionHistory(h))).toEqual(h);expect(()=>encodeInventorySelectionHistory([...h,{count:1,codes:[0]}])).toThrow('packed');
});
it('strict present marker never falls back and never invokes malformed getters',()=>{for(const v of [undefined,null,false,{},Object.create({profile:INVENTORY_SELECTION_PROFILE})]){const s={inventorySelection:v}as unknown as TrainingSession;expect(()=>hasInventorySelection(s)).toThrow();}let n=0;const s={}as TrainingSession;Object.defineProperty(s,'inventorySelection',{enumerable:true,get(){n++;return {};}});expect(()=>hasInventorySelection(s)).toThrow();expect(n).toBe(0);expect(hasInventorySelection({}as TrainingSession)).toBe(false);});
it('complete one-recipient cycle selection preserves inventory and requires forward before native close',async()=>{
 const {level,c}=await synthetic(),b=stepInventorySelection(level,c.session,c.world,[],{kind:'storage',actor:2}),o=stepInventorySelection(level,b.session,b.world,[],{kind:'open',actor:2}),before=structuredClone(o);
 expect(()=>stepInventorySelection(level,o.session,o.world,[],{kind:'close',actor:2})).toThrow();
 const d=stepInventorySelection(level,o.session,o.world,[],{kind:'backward',actor:2});expect(d.session.inventorySelection!.phase).toBe('selected');expect(d.session.inventory.actors[2]!.selection).toBe(1);expect(d.world.mercenaries).toEqual(o.world.mercenaries);expect(d.session.wet!.actors.map(a=>a.body.inventory)).toEqual(o.session.wet!.actors.map(a=>a.body.inventory));expect(o).toEqual(before);
 for(const op of [{kind:'backward',actor:2},{kind:'forward',actor:1},{kind:'close',actor:2}])expect(()=>stepInventorySelection(level,d.session,d.world,[],op as never)).toThrow();
 const u=stepInventorySelection(level,d.session,d.world,[],{kind:'forward',actor:2}),z=stepInventorySelection(level,u.session,u.world,[],{kind:'close',actor:2});expect(z.session.inventorySelection!.phase).toBe('closed');expect(z.session.inventorySelection!.selections).toEqual([0,0,0,0]);expect(z.session.wet!.actors[2]!.body.windowType).toBe(0);expect(z.session.wet!.actors[2]!.body.inventory.carried.every(s=>s.fourthByte===0)).toBe(true);expect(()=>serializeInventorySelection(z)).toThrow('raw3');
 expect(advanceOwnedInventorySelection(level,c.session,c.world,[],{kind:'storage',actor:2})).toEqual(b);
});
it('open movement/co-command and forged mirrors refuse atomically',async()=>{const {level,c}=await synthetic(),b=stepInventorySelection(level,c.session,c.world,[],{kind:'storage',actor:2}),o=stepInventorySelection(level,b.session,b.world,[],{kind:'open',actor:2}),before=structuredClone(o);for(const id of [0,2])for(const action of ['forward','backward','turn-right','strafe-left','pickup','use','info'])expect(()=>stepInventorySelection(level,o.session,o.world,[{mercenaryId:id,action:action as never}])).toThrow();expect(()=>stepInventorySelection(level,o.session,o.world,[{mercenaryId:0,action:'forward'}],{kind:'backward',actor:2})).toThrow();expect(o).toEqual(before);o.session.inventory.actors[2]!.selection=1;expect(()=>serializeInventorySelection(o)).toThrow();expect(()=>stepInventorySelection(level,o.session,o.world,[])).toThrow();});
const provider=process.env.HIRED_GUNS_SELECTION_PROVIDER;
const read=async(name:string)=>JSON.parse(await readFile(provider+'/'+name,'utf8'));
it.skipIf(!provider)('private full35 independent source pairs and events through real water/selection/close',async()=>{
 const level=await read('actual-level.json');await actual();let c=await read('actual-open-pair.json');const p=c.session.inventoryWindow;delete c.session.inventoryWindow;c.session.inventorySelection={...p,profile:INVENTORY_SELECTION_PROFILE,selections:[0,0,0,0],selectionOutcomes:[]};
 for(let tick=2518;tick<=2552;tick++){
  const op=tick===2518?'backward':tick===2551?'forward':tick===2552?'close':null,r=stepInventorySelection(level,c.session,c.world,[],op?{kind:op,actor:2}:null);
  const expected=await read(`vectors/sequence-${tick}-${op??'idle'}-DRAFT.json`),m=expected.session.inventorySelectionDRAFT;delete expected.session.inventorySelectionDRAFT;delete m.symbolicEvents;delete m.selectionPhase;
  m.profile=INVENTORY_SELECTION_PROFILE;m.phase=tick===2552?'closed':tick===2551?'returned':'selected';
  m.history=m.history.map((e:{count:number;codes:(number|string)[]})=>({count:e.count,codes:e.codes.map(code=>{if(typeof code==='number')return code;const parts=code.split('-'),groups:Record<string,number>={STORAGE:24,OPEN:28,BACKWARD:32,FORWARD:36,CLOSE:40};return groups[parts[1]!]!+Number(parts[2]);})}));expected.session.inventorySelection=m;
  expect({session:r.session,world:r.world}).toEqual(expected);expect(r.events).toEqual([]);c=r;
 }
});
async function actual(){const raw={map:new Uint8Array(await readFile(provider+'/raw/map.bin')),roster:new Uint8Array(await readFile(provider+'/raw/roster.bin')),items:new Uint8Array(await readFile(provider+'/raw/items.bin'))},level=(await importEditorMap(raw.map)).level,base=await createTrainingSession(level,raw,[1,3,0,5]);base.world.mission.rules={mode:'first-exit',timeLimit:99};const c=await activateInventorySelection(level,raw,base.session,base.world,true);return {raw,level,base,c};}
it.skipIf(!provider).each(['activate','reconstruct','import','export']as const)('private %s captures full graph/raw3 before BOTH callback getters and every digest; frozen primitive progress',async api=>{
 const {level,raw,base,c}=await actual(),canonical=serializeInventorySelection(c),digest=crypto.subtle.digest;
 const inputs=()=>({map:structuredClone(level),raw:structuredClone(raw),base:structuredClone(base),c:structuredClone(c),wrapper:JSON.parse(canonical),indices:[1,3,0,5],rules:structuredClone(c.session.wet!.rules),history:[]as number[][]});
 const mutate=(s:ReturnType<typeof inputs>)=>{s.map.layers[0].fill(0);for(const k of ['map','roster','items']as const)s.raw[k].fill(0);s.base.world.tick=99999;s.c.world.tick=99999;s.c.session.inventorySelection!.tempEntries[0]!.ammo=255;s.wrapper.checkpoint.inventorySelection.phase='invalid';s.indices[0]=11;s.rules.timeLimit=1;s.history.push([99999,0]);};
 const execute=(s:ReturnType<typeof inputs>,control?:Parameters<typeof importInventorySelection>[3])=>api==='activate'?activateInventorySelection(s.map,s.raw,s.base.session,s.base.world,true,control):api==='reconstruct'?reconstructInventorySelection(s.map,s.raw,s.indices,s.rules,s.history,control):api==='import'?importInventorySelection(s.map,s.raw,s.wrapper,control):exportInventorySelection(s.map,s.raw,s.c.session,s.c.world,control);
 for(const which of ['isCurrent','onProgress']){const s=inputs();let a=0,b=0;const result=await execute(s,{get isCurrent(){a++;if(which==='isCurrent')mutate(s);return ()=>true;},get onProgress(){b++;if(which==='onProgress')mutate(s);return (p:{phase:string;processed:number;total:number})=>{expect(Object.isFrozen(p)).toBe(true);expect(Object.values(p).every(v=>typeof v==='string'||typeof v==='number')).toBe(true);};}});expect(typeof result==='string'?result:serializeInventorySelection(result)).toBe(canonical);expect([a,b]).toEqual([1,1]);}
 let observed=0;for(let phase=1;phase<=32;phase++){const s=inputs();let calls=0,changed=false;crypto.subtle.digest=async function(...args:Parameters<SubtleCrypto['digest']>){if(++calls===phase){changed=true;mutate(s);}return digest.apply(this,args);};try{const r=await execute(s);expect(typeof r==='string'?r:serializeInventorySelection(r)).toBe(canonical);}finally{crypto.subtle.digest=digest;}if(!changed)break;observed++;}expect(observed).toBeGreaterThan(3);
 for(let phase=1;phase<=observed;phase++){let calls=0,current=true;crypto.subtle.digest=async function(...args:Parameters<SubtleCrypto['digest']>){const r=await digest.apply(this,args);if(++calls===phase)current=false;return r;};try{await expect(execute(inputs(),{isCurrent:()=>current,onProgress:()=>{if(!current)throw Error('STALE_PROGRESS');}})).rejects.toThrow('cancelled');}finally{crypto.subtle.digest=digest;}}
 for(const bad of ['raw','rules','indices','accessor']){const s=inputs();let reads=0;if(bad==='raw')Object.defineProperty(s.raw,'items',{enumerable:true,get(){reads++;throw Error('RAW');}});if(bad==='accessor')Object.defineProperty(s.map,'layers',{enumerable:true,get(){reads++;throw Error('GETTER');}});if(bad==='rules'){s.rules.timeLimit=1;s.base.world.mission.rules=s.rules;s.c.session.wet!.rules=s.rules;s.wrapper.rules=s.rules;}if(bad==='indices'){s.indices[1]=s.indices[0]!;Object.assign(s.base.session,{indices:s.indices});Object.assign(s.c.session,{indices:s.indices});s.wrapper.indices=s.indices;}await expect(execute(s,{get isCurrent():()=>boolean{reads++;throw Error('CONTROL');},get onProgress():()=>void{reads++;throw Error('CONTROL');}})).rejects.toThrow();expect(reads).toBe(0);}
},180000);
it.skipIf(!provider)('private empty baseline canonical full public API recovery and Retry both rules',async()=>{const {level,raw,c}=await actual(),json=serializeInventorySelection(c);expect(await exportTrainingSession(level,c.world,c.session,raw)).toBe(json);expect(serializeInventorySelection(await importTrainingSession(level,raw,json))).toBe(json);for(const mode of ['first-exit','cooperative-extraction']as const){const s=resetTrainingInventory(c.session,level,{mode,timeLimit:99});expect(s.inventorySelection!.history).toEqual([]);expect(s.inventorySelection!.tempEntries.map(t=>t.rawHex)).toEqual(['00000000','00000000','00000000','00000000']);expect(s.wet!.actors.every(a=>a.body.windowType===0)).toBe(true);expect(s.wet!.drownCounter).toBe(0);}});

it.skipIf(!provider)('private full114catalog/static/map and derived mirror tampering refuse public step and serialization',async()=>{
 const {level,c}=await actual();
 for(let i=0;i<114;i++){const bad=structuredClone(c);bad.session.items.records[i]!.category^=1;const before=structuredClone(bad);expect(()=>publicStepInventorySelection(level,bad.session,bad.world,[])).toThrow();expect(()=>serializeInventorySelection(bad)).toThrow();expect(bad).toEqual(before);}
 for(const field of ['text','opaque','raw','team','names','selection','phase','temp','window']){const bad=structuredClone(c);if(field==='text')bad.session.items.records[0]!.text.header1+='x';if(field==='opaque')bad.session.items.records[0]!.extensionHex='00'.repeat(12);if(field==='raw')bad.session.items.records[0]!.rawHex='00'.repeat(286);if(field==='team')bad.session.team.actors[0]!.stats.agility^=1;if(field==='names')Object.assign(bad.session,{names:['bad',...bad.session.names.slice(1)]});if(field==='selection')bad.session.inventory.actors[0]!.selection=1;if(field==='phase')bad.session.inventorySelection!.phase='selected';if(field==='temp')bad.session.inventorySelection!.tempEntries[0]!.ammo=1;if(field==='window')bad.session.wet!.actors[0]!.body.windowType=1;expect(()=>publicStepInventorySelection(level,bad.session,bad.world,[])).toThrow();expect(()=>serializeInventorySelection(bad)).toThrow();}
 const map=structuredClone(level);map.layers[0][0]=map.layers[0][0]!^1;expect(()=>publicStepInventorySelection(map,c.session,c.world,[])).toThrow('map baseline');
 expect(publicStepInventorySelection(level,c.session,c.world,[])).toEqual(advanceOwnedInventorySelection(level,c.session,c.world,[],null));
 const forged=structuredClone(c);forged.session.wet!.actors[0]!.body.fitness=1;const before=structuredClone(forged);expect(()=>publicStepInventorySelection(level,forged.session,forged.world,[])).toThrow('source/history/pair');expect(()=>serializeInventorySelection(forged)).toThrow('source/history/pair');expect(forged).toEqual(before);
 const reverse=(v:unknown):unknown=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
 const permuted=reverse(c) as typeof c;expect(serializeInventorySelection(permuted)).toBe(serializeInventorySelection(c));expect(publicStepInventorySelection(level,permuted.session,permuted.world,[])).toEqual(publicStepInventorySelection(level,c.session,c.world,[]));
},180000);
it.skipIf(!provider).each(['activate','reconstruct','import','export']as const)('private %s cancellation at final serialization returns no candidate',async api=>{
 const {level,raw,base,c}=await actual(),wrapper=JSON.parse(serializeInventorySelection(c)),stringify=JSON.stringify;let current=true,calls=0;
 const execute=()=>api==='activate'?activateInventorySelection(level,raw,base.session,base.world,true,{isCurrent:()=>current}):api==='reconstruct'?reconstructInventorySelection(level,raw,[1,3,0,5],c.session.wet!.rules,[],{isCurrent:()=>current}):api==='import'?importInventorySelection(level,raw,wrapper,{isCurrent:()=>current}):exportInventorySelection(level,raw,c.session,c.world,{isCurrent:()=>current});
 JSON.stringify=function(this:typeof JSON,...args:Parameters<typeof JSON.stringify>){if(args[0]?.version===23&&args[0]?.format==='hired-guns-training-session')calls++;return stringify.apply(this,args);}as typeof JSON.stringify;
 try{await execute();}finally{JSON.stringify=stringify;}const final=calls;expect(final).toBeGreaterThan(1);calls=0;
 JSON.stringify=function(this:typeof JSON,...args:Parameters<typeof JSON.stringify>){const result=stringify.apply(this,args);if(args[0]?.version===23&&args[0]?.format==='hired-guns-training-session'&&++calls===final)current=false;return result;}as typeof JSON.stringify;
 try{await expect(execute()).rejects.toThrow('cancelled');}finally{JSON.stringify=stringify;}expect(calls).toBe(final);
});
