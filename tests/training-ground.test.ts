import { describe, expect, it } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { createSelectedFallLevel } from '../src/sim/fall';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import type { OriginalTeam } from '../src/import/original-team';
import type { InventorySlot } from '../src/import/characters';
import { GROUND_FIXTURE, groundEnvelope, groundHistory, replayTrainingGround, type GroundEvent } from '../src/items/training-ground';
const entry = (id: number, n = 1): InventorySlot => ({itemId:id,damage:n,ammo:2,fourthByte:201,rawHex:[id,n,2,201].map(v=>v.toString(16).padStart(2,'0')).join('')});
async function fixture() {
  const bytes=new Uint8Array(ITEM_FILE_BYTES); for(let i=0;i<114;i++)new DataView(bytes.buffer).setUint16(i*286+260,140);
  const items=await importItems(bytes), level=createDemoLevel();
  const team: OriginalTeam={profile:'ocs-initial-team-v1',sources:{roster:{sha256:'synthetic',byteLength:0,layout:'OCS Characters',revision:'unverified'} as unknown as OriginalTeam['sources']['roster'],items:items.source},actors:Array.from({length:4},(_,i)=>({canonicalIndex:i,stats:{fitness:65535,physique:1000,agility:1000,experience:0,footstep:0,grunt:0},inventory:{equipped:entry(0),carried:Array.from({length:30},(_,j)=>entry(j<10?1:0,i*10+j)),actions:Array.from({length:10},()=>entry(0))},weight:{status:'verified',totalWeight:1400,quotient:10,tooHeavy:false,usingGrenade:0}}))};
  const envelope={version:1,fixture:GROUND_FIXTURE,rules:{mode:'navigation',timeLimit:null},history:[] as GroundEvent[]};
  return {level,team,items,envelope};
}
const owned=(s:ReturnType<typeof replayTrainingGround>)=>[...s.ground.slots.map(s=>s.entry),...s.inventory.actors.flatMap(a=>[a.inventory.equipped,...a.inventory.carried])].filter(s=>s.itemId).map(s=>s.rawHex).sort();
describe('authored source-owned chronological ground replay',()=>{
 it('relocates forty full entries once; interleaves stow, carried pickup, equip/exchange/return and drop without loss',async()=>{
  const {level,team,items,envelope}=await fixture(), original=structuredClone({level,team});
  const baseline=replayTrainingGround(level,team,items,envelope); expect(baseline.ground.slots).toHaveLength(40);
  const events:GroundEvent[]=[{kind:'ground',actor:0,slot:0,groundId:'cache-0-0',transfer:{version:1,kind:'pickup-equipment'}},{kind:'ground',actor:0,slot:0,groundId:'cache-0-1',transfer:{version:1,kind:'pickup-equipment'}},{kind:'ground',actor:0,slot:0,groundId:'cache-0-2',transfer:{version:1,kind:'pickup-carried'}},{kind:'exchange',actor:0,slot:0},{kind:'return',actor:0,slot:0},{kind:'equip',actor:0,slot:0},{kind:'ground',actor:0,slot:0,groundId:'cache-0-0',transfer:{version:1,kind:'drop-equipment'}}];
  const result=replayTrainingGround(level,team,items,{...envelope,history:events}); expect(owned(result)).toEqual(owned(baseline));expect({level,team}).toEqual(original);
  expect(result.ground.slots[0]!.entry).toEqual(baseline.ground.slots[2]!.entry);expect(result.inventory.actors[0]!.weight.totalWeight).toBe(280);
 });
 it('fills physical thirty slots; refuses stowing and carried pickup but permits empty-equipment pickup',async()=>{
  const {level,team,items,envelope}=await fixture(), base=replayTrainingGround(level,team,items,envelope);
  const history:GroundEvent[]=base.ground.slots.slice(0,30).map(s=>({kind:'ground',actor:0,slot:0,groundId:s.id,transfer:{version:1,kind:'pickup-carried'}}));
  const full=replayTrainingGround(level,team,items,{...envelope,history});expect(full.inventory.actors[0]!.inventory.carried.filter(s=>s.itemId)).toHaveLength(30);
  const next:GroundEvent={kind:'ground',actor:0,slot:29,groundId:base.ground.slots[30]!.id,transfer:{version:1,kind:'pickup-carried'}};
  expect(()=>replayTrainingGround(level,team,items,{...envelope,history:[...history,next]})).toThrow('Backpack full');
  next.transfer.kind='pickup-equipment'; const equipped=replayTrainingGround(level,team,items,{...envelope,history:[...history,next]});expect(owned(equipped)).toEqual(owned(base));
  expect(()=>replayTrainingGround(level,team,items,{...envelope,history:[...history,next,{...next,groundId:base.ground.slots[31]!.id}]})).toThrow('Backpack full');
 });
 it('checks actual chronological actor positions and rejects unknown identities, malformed or overbudget history and fall mode',async()=>{
  const {level,team,items,envelope}=await fixture();
  const pickup:GroundEvent={kind:'ground',actor:0,slot:0,groundId:'cache-0-0',transfer:{version:1,kind:'pickup-equipment'}};
  expect(()=>replayTrainingGround(level,team,items,{...envelope,history:[{...pickup,actor:1}]})).toThrow('Move');
  expect(()=>replayTrainingGround(level,team,items,{...envelope,history:[{...pickup,groundId:'cache-9-9'}]})).toThrow('Move');
  for(const value of [{...envelope,fixture:'other'},{...envelope,slots:[]},{...envelope,history:Array(129).fill(pickup)},{...envelope,history:[{...pickup,extra:1}]}])expect(()=>groundEnvelope(value)).toThrow();
  expect(()=>groundHistory([undefined])).toThrow();expect(()=>groundHistory(new Array(1))).toThrow();
  expect(()=>replayTrainingGround(createSelectedFallLevel(),team,items,envelope)).toThrow();
  const events:GroundEvent[]=[{kind:'step',commands:[{mercenaryId:0,action:'turn-right'}]},{kind:'wait',ticks:20},pickup];
  expect(replayTrainingGround(level,team,items,{...envelope,history:events}).world.tick).toBe(21);
 });
});
