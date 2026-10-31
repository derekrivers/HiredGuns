import {emptyInventoryTemp,inventoryEntry} from '../items/inventory-window';
import type {InventorySelectionAction} from '../items/inventory-selection';
import type {InventorySlot} from '../import/characters';
import type {Action,LevelData,MissionRules,PlayerCommand,WorldState} from '../contracts';
import {importEditorMap} from '../import/editor-map';
import {importCharacters} from '../import/characters';
import {createTrainingSession,type TrainingSession,type TrainingSources,type TrainingCandidate} from './training-session';
import {initialTimeout,type TimeoutRecoveryControl} from './training-timeout';
import {stepInventorySelectionLifecycle} from './training-wet-lifecycle';
import {TRAINING_43_SHA256} from './mission-profile';
import {wetSnapshot,rawSnapshot} from './training-wet';
import {createWorld} from './world';
import {equalInventorySelectionData as equal} from './inventory-selection-equality';

/** Raw-evidence SHA256 for internal authored fixtures. Original-source public
 * pairs use the complete raw3 baseline and full replay below. No physics cache. */
function evidenceHash(bytes:Uint8Array){
 const primes:number[]=[];for(let n=2;primes.length<64;n++)if(!primes.some(p=>p*p<=n&&n%p===0))primes.push(n);
 const k=primes.map(p=>(Math.cbrt(p)%1*4294967296)>>>0),h=primes.slice(0,8).map(p=>(Math.sqrt(p)%1*4294967296)>>>0);
 const data=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);data.set(bytes);data[bytes.length]=128;new DataView(data.buffer).setUint32(data.length-4,bytes.length*8);
 const r=(v:number,n:number)=>(v>>>n)|(v<<(32-n)),w=new Uint32Array(64),view=new DataView(data.buffer);
 for(let o=0;o<data.length;o+=64){
  for(let i=0;i<16;i++)w[i]=view.getUint32(o+i*4);
  for(let i=16;i<64;i++){const a=w[i-15]!,b=w[i-2]!;w[i]=(w[i-16]!+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]!+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,j]=h as [number,number,number,number,number,number,number,number];
  for(let i=0;i<64;i++){const t=(j+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]!+w[i]!)>>>0,u=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;j=g;g=f;f=e;e=(d+t)>>>0;d=c;c=b;b=a;a=(t+u)>>>0;}
  for(const [i,v]of [a,b,c,d,e,f,g,j].entries())h[i]=(h[i]!+v)>>>0;
 }
 return h.map(n=>n.toString(16).padStart(8,'0')).join('');
}
/** Authored fixture validation. Original-source profiles compare the complete
 * raw-derived114-record baseline in sourceFields on every prospective tick. */
function catalogAuthority(s:TrainingSession){
 const raw=new Uint8Array(32604),records=s.items.records;
 if(records.length!==114)fail('full catalog');
 for(const [i,v]of records.entries()){
  if(!/^[0-9a-f]{572}$/.test(v.rawHex))fail('catalog raw evidence');
  const b=Uint8Array.from(v.rawHex.match(/../g)!,x=>parseInt(x,16));raw.set(b,i*286);
  const word=(n:number)=>(b[n]!<<8)|b[n+1]!,text=(o:number,n:number)=>{let t='';for(const x of b.subarray(o,o+n)){if(!x)break;t+=x>=32&&x!==127?String.fromCharCode(x):'\uFFFD';}return t;};
  const expected={index:i,itemId:i+1,offset:i*286,rawHex:v.rawHex,text:{header1:text(0,16),header2:text(16,16),footer1:text(32,16),footer2:text(48,16),info:Array.from({length:10},(_,j)=>text(64+j*19,19))},category:b[254],image:b[255],containerType:b[256],waterDamage:b[257],maxDamage:word(258),weight:word(260),animColour:word(262),anim:b[264],animDuration:b[265],flashColour:b[266],sample:b[267],samplePeriod:word(268),exSample:word(270),exSamplePeriod:word(272),extensionHex:v.rawHex.slice(548)};
  if(!equal(v,expected))fail('full raw-derived catalog record');
 }
 if(evidenceHash(raw)!==s.items.source.sha256||!equal(s.items.source,s.team.sources.items))fail('catalog raw hash/source');
}

export const INVENTORY_SELECTION_PROFILE='one-native-inventory-selection-cycle-v1';
export const INVENTORY_SELECTION_SCENARIO='training43-inventory-selection-cycle-v1';
export const INVENTORY_SELECTION_LIMITS=Object.freeze({ticks:59499,packed:256,expanded:513,bytes:24576});
export interface InventorySelectionEvent {count:number;codes:number[]}
export interface TrainingInventorySelection {profile:typeof INVENTORY_SELECTION_PROFILE;history:InventorySelectionEvent[];outcome:string|null;lastPositions:number[];tempEntries:InventorySlot[];phase:InventorySelectionPhase;recipient:number|null;windowOutcomes:('applied'|'caller-guard')[];selections:number[];selectionOutcomes:('selected'|'boundary'|'caller-guard')[]}
export type InventorySelectionPhase='waiting'|'ready'|'opened'|'selected'|'returned'|'closed';
export interface InventorySelectionOperation {kind:'storage'|'open'|'close'|InventorySelectionAction;actor:number}
const actions:Action[]=['forward','backward','strafe-left','strafe-right','turn-left','turn-right'];
const fail=(why:string):never=>{throw Error(`Inventory selection refused atomically: ${why}`);};
// Private immutable source baselines established by full raw3 import. No
// histories, mutable pairs, replay results or per-tick physics are memoized.
const sourceAuthorities=new Map<string,{level:LevelData;baseline:ReturnType<typeof staticFields>;session:TrainingSession;races:number[]}>();
function sourceKey(s:TrainingSession){return JSON.stringify([s.team.sources.roster.sha256,s.team.sources.items.sha256,s.indices]);}
function staticFields(s:TrainingSession){return {indices:s.indices,names:s.names,team:s.team,items:s.items,encounter:s.encounter,encounterGun:s.encounterGun,gate:s.gate,ground:s.ground,patrol:s.patrol};}
function sourceFields(s:TrainingSession){
 if(s.team.sources.items.sha256!=='633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc')return; // Authored owned fixtures confer no original-source authority.
 const a=sourceAuthorities.get(sourceKey(s));if(!a||!equal(staticFields(s),a.baseline))fail('complete raw-derived static baseline');
}
function publicAuthority(s:TrainingSession){const a=sourceAuthorities.get(sourceKey(s));if(!a||!equal(staticFields(s),a.baseline))fail('public raw3 source authority; activate or reconstruct first');return a!;}
function sourceMap(level:LevelData,s:TrainingSession){if(!equal(level,publicAuthority(s).level))fail('complete raw-derived map baseline');}
/** Absent is the only fallback. Any present malformed marker refuses before v19. */
export function hasInventorySelection(session:TrainingSession|null):boolean{
 if(!session)return false;
 if(Object.getPrototypeOf(session)!==Object.prototype)fail('session prototype');
 if(!('inventorySelection'in session))return false;
 const d=Object.getOwnPropertyDescriptor(session,'inventorySelection');
 if(!d?.enumerable||!Object.hasOwn(d,'value')||!d.value||Object.getPrototypeOf(d.value)!==Object.prototype)fail('profile data owner');
 const p=Object.getOwnPropertyDescriptor(d!.value,'profile');
 if(!p?.enumerable||!Object.hasOwn(p,'value')||p.value!==INVENTORY_SELECTION_PROFILE)fail('profile discriminator');
 return true;
}
function owner(s:TrainingSession){
 if(Object.keys(s).sort().join(',')!=='encounter,encounterGun,gate,ground,indices,inventory,inventorySelection,items,names,patrol,team,wet,wetLifecycle,wetParty')fail('session fields');
 if(!hasInventorySelection(s)||Object.keys(s.inventorySelection!).sort().join(',')!=='history,lastPositions,outcome,phase,profile,recipient,selectionOutcomes,selections,tempEntries,windowOutcomes'||s.wetParty?.profile!=='four-controlled-timeout-v1'||Object.getOwnPropertyDescriptor(s,'wetRegion')||!s.wet||!s.wetLifecycle||s.wet.history.length)fail('profile fields/owner');
 policy(s.wet!.rules);selectionMetadata(s.inventorySelection!,s.wet!.actors);sourceFields(s);
 // Raw3 are reparsed by each public API. Production compares every catalog
 // field/raw byte against that private immutable baseline above, every tick.
 // Authored internal fixtures have no such baseline and validate raw locally.
 if(s.team.sources.items.sha256!=='633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc')catalogAuthority(s);
 if(s.wet!.actors.length!==4||s.inventory.actors.length!==4||s.items.records.length!==114||s.items.records.some((r,i)=>r.itemId!==i+1||!Number.isInteger(r.category)||r.category<0||r.category>255||!Number.isInteger(r.weight)||r.weight<0||r.weight>65535))fail('complete party/catalog');
 for(const [i,a]of s.wet!.actors.entries()){
  if(Object.keys(a.body).sort().join(',')!=='controlMethod,drowningIndicator,fitness,inventory,physique,race,spellWater,spellWings,statsDeadWord,underwaterCount,weight,windowType'||Object.keys(a.body.inventory).sort().join(',')!=='actions,carried,equipped'||a.body.inventory.carried.length!==30||a.body.inventory.actions.length!==10||s.inventory.actors[i]!.selection!==s.inventorySelection!.selections[i])fail('body/inventory owner');
  for(const slot of [a.body.inventory.equipped,...a.body.inventory.carried,...a.body.inventory.actions]){
   const bytes=[slot.itemId,slot.damage,slot.ammo,slot.fourthByte];
   if(Object.keys(slot).sort().join(',')!=='ammo,damage,fourthByte,itemId,rawHex'||!bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||slot.itemId>114||slot.rawHex!==bytes.map(n=>n.toString(16).padStart(2,'0')).join(''))fail('complete raw inventory entry');
  }
 }
}
function selectionMetadata(p:TrainingInventorySelection,actors:NonNullable<TrainingSession['wet']>['actors']){
 if(p.lastPositions.length!==4||p.lastPositions.some(n=>n!==0)||p.tempEntries.length!==4||p.selections.length!==4)fail('native auxiliary widths/adapter last positions');
 encodeInventorySelectionHistory(p.history);
 if(p.history.some((e,i,h)=>i>0&&equal(e.codes,h[i-1]!.codes)))fail('noncanonical expanded history');
 const special=p.history.flatMap(e=>e.codes.filter(n=>n>=24)),attempted=special.length>0;
 if(attempted?!['caller-guard','already-too-heavy','profile-refusal','empty-corpse','transferred'].includes(p.outcome!):p.outcome!==null)fail('derived storage outcome');
 if(p.recipient!==(p.outcome==='transferred'?special[0]!-24:null)||special.length>1&&p.outcome!=='transferred')fail('derived recipient');
 const windows=special.filter(n=>n>=28&&n<32||n>=40),selections=special.filter(n=>n>=32&&n<40);
 if(p.windowOutcomes.length!==windows.length||!p.windowOutcomes.every(n=>['applied','caller-guard'].includes(n))||p.selectionOutcomes.length!==selections.length||!p.selectionOutcomes.every(n=>['selected','boundary','caller-guard'].includes(n)))fail('attempt outcomes');
 // A failed attempt consumes its one operation but never advances success phase.
 const failed=[...p.windowOutcomes.slice(0,1),...p.selectionOutcomes,...p.windowOutcomes.slice(1)].findIndex(n=>n!=='applied'&&n!=='selected');
 if(failed>=0&&special.length!==failed+2)fail('commands after failed attempt');
 const success=(p.windowOutcomes[0]==='applied'?1:0)+(p.selectionOutcomes[0]==='selected'?1:0)+(p.selectionOutcomes[1]==='selected'?1:0)+(p.windowOutcomes[1]==='applied'?1:0);
 const phase:InventorySelectionPhase=p.outcome!=='transferred'?'waiting':(['ready','opened','selected','returned','closed'] as const)[success]!;
 if(p.phase!==phase)fail('derived successful phase');
 const selected=p.selectionOutcomes[0]==='selected'&&p.selectionOutcomes[1]!=='selected';
 if(p.selections.some((n,i)=>n!==(selected&&i===p.recipient?1:0)))fail('derived selections');
 const open=p.windowOutcomes[0]==='applied'&&p.windowOutcomes[1]!=='applied';
 if(actors.some((a,i)=>a.body.windowType!==(open&&i===p.recipient?1:0)))fail('derived physical window');
 for(const t of p.tempEntries){inventoryEntry(t);if(t.rawHex!=='00000000')fail('source variable-clear temp history');}
}
/** A public caller cannot use stepping to repair a forged derived mirror. */
function mirrors(s:TrainingSession){
 owner(s);
 if(Object.keys(s.inventory).sort().join(',')!=='actors,commands'||s.inventory.commands.length)fail('derived inventory fields');
 for(const [i,a]of s.wet!.actors.entries())if(!equal(s.inventory.actors[i],{inventory:a.body.inventory,weight:{...a.body.weight,status:'verified'},selection:s.inventorySelection!.selections[i]!}))fail('derived inventory mirror');
}
function policy(r:MissionRules){if(!r||Object.keys(r).sort().join(',')!=='mode,timeLimit'||r.timeLimit!==99||!['first-exit','cooperative-extraction'].includes(r.mode))fail('original99 rules');}
/** Structural authority checks precede runtime callback-reference reads. Raw
 * equality and complete derived-state comparisons follow source reconstruction. */
function authority(level:LevelData,indices:readonly number[],rules:MissionRules){
 policy(rules);
 if(!Array.isArray(indices)||indices.length!==4||new Set(indices).size!==4||!indices.every(i=>Number.isInteger(i)&&i>=0&&i<12))fail('selected indices');
 if(!level||level.source?.kind!=='editor-map'||level.source.sha256!==TRAINING_43_SHA256||!Array.isArray(level.layers)||level.layers.length!==3)fail('source map');
}
function events(input:unknown):InventorySelectionEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>INVENTORY_SELECTION_LIMITS.expanded)return fail('expanded budget');let total=0;const specials:number[]=[];
 for(const e of data){
  if(!e||Object.keys(e).sort().join(',')!=='codes,count'||!Number.isSafeInteger(e.count)||e.count<1||!Array.isArray(e.codes)||e.codes.length>4)fail('event fields');
  total+=e.count;if(total>INVENTORY_SELECTION_LIMITS.ticks)fail('tick budget');
  for(const [j,n]of e.codes.entries())if(!Number.isInteger(n)||n<0||n>43||(j>0&&n<=e.codes[j-1])||n<24&&e.codes.some((m:number,k:number)=>k!==j&&m<24&&Math.floor(m/6)===Math.floor(n/6)))fail('command codes/order');
  if(e.codes.some((n:number)=>n>=24)){if(e.count!==1||e.codes.length!==1)fail('sole special count1');specials.push(e.codes[0]!);const j=specials.length-1;if(j>4||Math.floor(e.codes[0]!/4)!==6+j||(j>0&&e.codes[0]!%4!==specials[0]!%4))fail('storage/open/close order and recipient');}
 }
 return data as InventorySelectionEvent[];
}
export function encodeInventorySelectionHistory(input:readonly InventorySelectionEvent[]):number[][]{
 const result:number[][]=[];let idle=0;
 for(const e of events(input)){
  if(!e.codes.length){idle+=e.count;continue;}
  const last=result.at(-1);
  if(!idle&&e.codes[0]!<24&&last&&equal(last.slice(2),e.codes))last[1]!+=e.count;
  else result.push([idle,e.count,...e.codes]);idle=0;
 }
 if(idle)result.push([idle,0]);if(result.length>INVENTORY_SELECTION_LIMITS.packed)fail('packed budget');return result;
}
export function decodeInventorySelectionHistory(input:unknown):InventorySelectionEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>INVENTORY_SELECTION_LIMITS.packed)return fail('packed budget');
 const result:InventorySelectionEvent[]=[];let total=0;
 for(const [i,t]of data.entries()){
  if(!Array.isArray(t)||t.length<2||t.length>6||!t.every(n=>Number.isSafeInteger(n)&&n>=0))fail('tuple fields');
  const [idle,count]=t as number[];total+=idle!+count!;if(total>INVENTORY_SELECTION_LIMITS.ticks)fail('tick budget');
  if(!count){if(i!==data.length-1||!idle||t.length!==2)fail('trailing idle');}else if(t.length===2)fail('missing command');
  if(idle)result.push({count:idle!,codes:[]});if(count)result.push({count:count!,codes:t.slice(2)});
 }
 const h=events(result);if(!equal(encodeInventorySelectionHistory(h),data))fail('noncanonical history');return h;
}
function initial(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate{
 const {inventorySelection:_pickup,...clean}=baseline;void _pickup;
 policy(rules);const canonicalRules:MissionRules={mode:rules.mode,timeLimit:99};
 const c=initialTimeout(level,clean,races,canonicalRules);
 c.session={...c.session,inventorySelection:{profile:INVENTORY_SELECTION_PROFILE,history:[],outcome:null,lastPositions:[0,0,0,0],tempEntries:Array.from({length:4},emptyInventoryTemp),phase:'waiting',recipient:null,windowOutcomes:[],selections:[0,0,0,0],selectionOutcomes:[]}};serializeOwned(c);return c;
}
export function resetInventorySelection(level:LevelData,session:TrainingSession,rules?:MissionRules):TrainingSession{
 const saved=wetSnapshot({level,session,...(rules?{rules}:{})});owner(saved.session);
 return initial(saved.level,saved.session,saved.session.wet!.actors.map(a=>a.body.race),saved.rules??saved.session.wet!.rules).session;
}
function serializeOwned(c:TrainingCandidate):string{
 owner(c.session);if(c.session.inventorySelection!.history.reduce((n,e)=>n+e.count,0)!==c.world.tick||!equal(c.session.wet!.rules,c.world.mission.rules))fail('world/history/rules');const {history:_history,...state}=c.session.wet!;void _history;
 const p=c.session.inventorySelection!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:23,scenario:INVENTORY_SELECTION_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodeInventorySelectionHistory(p.history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle,party:c.session.wetParty,inventorySelection:{profile:p.profile,outcome:p.outcome,lastPositions:p.lastPositions,tempEntries:p.tempEntries,phase:p.phase,recipient:p.recipient,windowOutcomes:p.windowOutcomes,selections:p.selections,selectionOutcomes:p.selectionOutcomes}}});
 if(new TextEncoder().encode(json).length>=INVENTORY_SELECTION_LIMITS.bytes)fail('future save byte budget');return json;
}
/** Public untrusted pairs are compared with an entire replay, including all
 * mutable fields and outcomes. Main uses the separate synchronous owned path. */
function verifyPublicPair(c:TrainingCandidate){
 const a=publicAuthority(c.session);let expected=initial(a.level,a.session,a.races,c.session.wet!.rules);
 for(const e of c.session.inventorySelection!.history)for(let n=0;n<e.count;n++){
  if(expected.world.mission.outcome!=='active')fail('history after terminal');
  sourceMap(a.level,expected.session);const {commands,operation}=decodeCommands(e.codes),r=stepOwned(a.level,expected.session,expected.world,commands,operation);expected={session:r.session,world:r.world};
 }
 if(!equal(expected,c))fail('complete public source/history/pair mismatch');return expected;
}
export function serializeInventorySelection(c:TrainingCandidate){const captured=wetSnapshot(c);mirrors(captured.session);return serializeOwned(verifyPublicPair(captured));}
/** Code/work-shape budget inspection only; no save or pair is returned and no
 * chronology is admitted. Public saves go through full verification above. */
export function inventorySelectionEncodingBudget(c:TrainingCandidate):number{return new TextEncoder().encode(serializeOwned(wetSnapshot(c))).length;}
function codes(commands:readonly PlayerCommand[],operation:InventorySelectionOperation|null){
 if(operation!==null&&(!operation||Object.keys(operation).sort().join(',')!=='actor,kind'||!Number.isInteger(operation.actor)))fail('operation data');
 const actor=operation?.actor??null;
 if(actor!==null){if(!operation||Object.keys(operation).sort().join(',')!=='actor,kind'||!['storage','open','backward','forward','close'].includes(operation.kind)||!Number.isInteger(actor)||actor<0||actor>3||commands.length)fail('sole operation command');return [(24+['storage','open','backward','forward','close'].indexOf(operation!.kind)*4)+actor];}
 const result=commands.map(c=>{if(!c||Object.keys(c).sort().join(',')!=='action,mercenaryId'||!Number.isInteger(c.mercenaryId)||c.mercenaryId<0||c.mercenaryId>3||!actions.includes(c.action))fail('navigation command');return c.mercenaryId*6+actions.indexOf(c.action);}).sort((a,b)=>a-b);
 events([{count:1,codes:result}]);return result;
}
/** Prospective full tick; only the returned pair may be installed by Main. */
export function stepInventorySelection(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],operation:InventorySelectionOperation|null=null){
 const s=wetSnapshot({level,session,world,commands,operation});mirrors(s.session);sourceMap(s.level,s.session);const verified=verifyPublicPair({session:s.session,world:s.world});return stepOwned(s.level,verified.session,verified.world,s.commands,s.operation);
}
/** Internal Main entry: sole-owned committed pair, immutable imported geometry,
 * and router-created commands. No await/runtime callback occurs here. The core
 * still clones mutable candidates and performs every prospective save check. */
export function advanceOwnedInventorySelection(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],operation:InventorySelectionOperation|null){
 return stepOwned(level,session,world,commands,operation);
}
/** Only call-time-owned or reconstructed inputs reach this internal entry. It
 * still performs every ordinary tick, admission and full prospective budget. */
function stepOwned(level:LevelData,session:TrainingSession,world:WorldState,commands:readonly PlayerCommand[],operation:InventorySelectionOperation|null){
 const s={level,session,world,commands,operation};owner(s.session);
 if(!equal(s.session.wet!.rules,s.world.mission.rules))fail('world/body rules');
 if(s.session.inventorySelection!.history.reduce((n,e)=>n+e.count,0)!==s.world.tick)fail('world/history tick');
 const encoded=codes(s.commands,s.operation);
 if(s.world.mission.outcome!=='active')return {session:s.session,world:s.world,events:[]};
 const p=s.session.inventorySelection!;
 if(['opened','selected','returned'].includes(p.phase)&&commands.length)fail('unsupported open-window controls');
 if(operation){
  const expected={storage:'waiting',open:'ready',backward:'opened',forward:'selected',close:'returned'}[operation.kind];
  const special=p.history.flatMap(e=>e.codes.filter(n=>n>=24));
  if(p.phase!==expected||operation.kind!=='storage'&&p.recipient!==operation.actor||special.length!==['storage','open','backward','forward','close'].indexOf(operation.kind))fail('single same-recipient cycle/order/attempt consumed');
 }
 const r=stepInventorySelectionLifecycle(s.level,s.session,s.world,s.commands,s.operation);
 const history=wetSnapshot(s.session.inventorySelection!.history),last=history.at(-1);
 if(encoded.every(n=>n<24)&&last&&equal(last.codes,encoded))last.count++;else history.push({count:1,codes:encoded});
 const outcome='pickup'in r?r.pickup as string:p.outcome;
 const m=r.session.inventorySelection!,phase:InventorySelectionPhase=operation?.kind==='close'&&m.windowOutcomes[1]==='applied'?'closed':operation?.kind==='forward'&&m.selectionOutcomes[1]==='selected'?'returned':operation?.kind==='backward'&&m.selectionOutcomes[0]==='selected'?'selected':operation?.kind==='open'&&m.windowOutcomes[0]==='applied'?'opened':outcome==='transferred'&&p.phase==='waiting'?'ready':p.phase;
 const next:TrainingCandidate={world:r.world,session:{...r.session,inventorySelection:{...m,history,outcome,recipient:outcome==='transferred'?(p.recipient??operation!.actor):null,phase}}};
 serializeOwned(next);return {...next,events:r.events};
}
function runtime(control?:TimeoutRecoveryControl){
 const current=control?.isCurrent,progress=control?.onProgress;
 const check=()=>{if(current&&!current())fail('reconstruction cancelled');};
 return {check,report(phase:'verifying'|'replaying',processed:number,total:number){check();progress?.(Object.freeze({phase,processed,total}));check();}};
}
function decodeCommands(codes:number[]):{commands:PlayerCommand[];operation:InventorySelectionOperation|null}{
 const code=codes[0]!,operation:InventorySelectionOperation|null=code>=24?{kind:(['storage','open','backward','forward','close'] as const)[Math.floor((code-24)/4)]!,actor:code%4}:null;
 return {operation,commands:operation===null?codes.map(code=>({mercenaryId:Math.floor(code/6),action:actions[code%6]!})):[]};
}
async function rebuild(map:LevelData,raw:Required<TrainingSources>,indices:readonly number[],rules:MissionRules,history:InventorySelectionEvent[],run:ReturnType<typeof runtime>,expectedSources?:unknown){
 policy(rules);run.report('verifying',0,history.reduce((n,e)=>n+e.count,0));
 const imported=await importEditorMap(raw.map);run.check();if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,indices);run.check();
 if(expectedSources!==undefined&&!equal(expectedSources,{map:TRAINING_43_SHA256,...baseline.session.team.sources}))fail('declared source identities');
 const roster=await importCharacters(raw.roster);run.check();
 const races=indices.map(i=>roster.records[i]!.race),owned=wetSnapshot({level:imported.level,baseline:staticFields(baseline.session)});
 sourceAuthorities.set(sourceKey(baseline.session),{...owned,session:wetSnapshot(baseline.session),races:races.slice()});
 let c=initial(imported.level,baseline.session,indices.map(i=>roster.records[i]!.race),rules),processed=0,chunk=0,start=performance.now();
 const total=history.reduce((n,e)=>n+e.count,0);run.report('replaying',0,total);
 for(const e of history)for(let n=0;n<e.count;n++){
  run.check();if(c.world.mission.outcome!=='active')fail('history after terminal');
  sourceMap(imported.level,c.session);
  const {commands,operation}=decodeCommands(e.codes);
  const r=stepOwned(imported.level,c.session,c.world,commands,operation);
  c={session:r.session,world:r.world};processed++;chunk++;
  if(chunk>=16||performance.now()-start>=8){run.report('replaying',processed,total);await new Promise<void>(resolve=>setTimeout(resolve,0));run.check();chunk=0;start=performance.now();}
 }
 run.check();if(!equal(encodeInventorySelectionHistory(c.session.inventorySelection!.history),encodeInventorySelectionHistory(history)))fail('derived history');serializeOwned(c);run.report('replaying',processed,total);run.check();return c;
}
/** Source-only reconstruction: no saved inventory/body/result is an input. This
 * is also the bounded chronology authority used by import/export below. */
export async function reconstructInventorySelection(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot({level,indices,rules,input}),history=decodeInventorySelectionHistory(s.input),raw=rawSnapshot(sources);authority(s.level,s.indices,s.rules);const run=runtime(control);
 const c=await rebuild(s.level,raw,s.indices,s.rules,history,run);run.check();return c;
}
export async function activateInventorySelection(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const s=wetSnapshot({level,session,world,paused}),raw=rawSnapshot(sources);
 if(!s.paused||s.world.tick!==0||s.session.wet||'inventorySelection'in s.session||'inventoryWindow'in s.session||'storagePickup'in s.session||'corpsePickup'in s.session||'wetParty'in s.session||'wetRegion'in s.session||s.session.gate||s.session.ground||s.session.consumables||s.session.inventory.commands.length)fail('fresh paused selected team required');
 authority(s.level,s.session.indices,s.world.mission.rules);
 const run=runtime(control);const c=await rebuild(s.level,raw,s.session.indices,s.world.mission.rules,[],run);run.check();
 // The initial source-derived pair must match all supplied immutable baseline fields.
 const baseline=await createTrainingSession(s.level,raw,s.session.indices);run.check();
 if(!equal(baseline.session,s.session)||!equal(createWorld(s.level,undefined,s.world.mission.rules),s.world))fail('unmodified source baseline required');run.check();return c;
}
export async function exportInventorySelection(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,control?:TimeoutRecoveryControl):Promise<string>{
 const s=wetSnapshot({level,session,world}),raw=rawSnapshot(sources);mirrors(s.session);const history=decodeInventorySelectionHistory(encodeInventorySelectionHistory(s.session.inventorySelection!.history));
 authority(s.level,s.session.indices,s.session.wet!.rules);
 const run=runtime(control),c=await rebuild(s.level,raw,s.session.indices,s.session.wet!.rules,history,run);run.check();if(!equal(c,{session:s.session,world:s.world}))fail('complete source/history/pair mismatch');run.check();const json=serializeOwned(c);run.check();return json;
}
export async function importInventorySelection(level:LevelData,sources:TrainingSources,input:unknown,control?:TimeoutRecoveryControl):Promise<TrainingCandidate>{
 const captured=wetSnapshot({input,level}),s=captured.input as ReturnType<typeof JSON.parse>,map=captured.level,raw=rawSnapshot(sources);
 if(!s||Object.keys(s).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||s.format!=='hired-guns-training-session'||s.version!==23||s.scenario!==INVENTORY_SELECTION_SCENARIO)fail('wrapper fields');
 if(new TextEncoder().encode(JSON.stringify(s)).length>=INVENTORY_SELECTION_LIMITS.bytes)fail('wrapper byte budget');
 const history=decodeInventorySelectionHistory(s.history);authority(map,s.indices,s.rules);
 const cp=s.checkpoint,p=cp?.inventorySelection;
 if(!cp||Object.keys(cp).sort().join(',')!=='inventorySelection,lifecycle,party,state,world'||!p||Object.keys(p).sort().join(',')!=='lastPositions,outcome,phase,profile,recipient,selectionOutcomes,selections,tempEntries,windowOutcomes'||p.profile!==INVENTORY_SELECTION_PROFILE||!cp.state||!Array.isArray(cp.state.actors)||cp.state.actors.length!==4||!cp.world||cp.world.tick!==history.reduce((n,e)=>n+e.count,0)||!equal(cp.state.rules,s.rules))fail('checkpoint metadata/history');
 selectionMetadata({...p,history},cp.state.actors);
 if(!s.sources||Object.keys(s.sources).sort().join(',')!=='items,map,roster'||s.sources.map!==TRAINING_43_SHA256)fail('source identities');
 for(const [name,size,layout,revision]of [['roster',16320,'front272-five-banks','ocs-source-data'],['items',32604,'items286-114','ocs-runtime']]as const){const v=s.sources[name];if(!v||Object.keys(v).sort().join(',')!=='byteLength,layout,revision,sha256'||v.byteLength!==size||v.layout!==layout||v.revision!==revision||typeof v.sha256!=='string'||!/^[0-9a-f]{64}$/.test(v.sha256))fail('source identity fields');}const run=runtime(control),c=await rebuild(map,raw,s.indices,s.rules,history,run,s.sources);run.check();if(!equal(JSON.parse(serializeOwned(c)),s))fail('complete source/history/checkpoint mismatch');run.check();return c;
}
