import { advanceGateTrainingSession, type TrainingSession } from '../src/sim/training-session';
import { replayTrainingInventory } from '../src/sim/training-inventory';
import { describe, expect, it } from 'vitest';
import { cellIndex, type PlayerCommand } from '../src/contracts';
import { createWorld, obstruction } from '../src/sim/world';
import { appendGateEvent, createTrainingGateLevel, effectiveGateLevel, gateEnvelope, gateHistory, GATE_TARGET, initialTrainingGate, replayTrainingGate, stepTrainingGate, type GateEvent } from '../src/world/training-gate';
import { importItems, ITEM_FILE_BYTES } from '../src/import/items';
import type { OriginalTeam } from '../src/import/original-team';
import type { InventorySlot } from '../src/import/characters';

const command = (id: number, action: PlayerCommand['action']): PlayerCommand[] => [{mercenaryId:id,action}];
function harness() {
  const base = createTrainingGateLevel(); let gate = initialTrainingGate(), world = createWorld(base);
  const tick = (commands: PlayerCommand[] = [], actor: number | null = null) => {
    const result = stepTrainingGate(base,world,gate,commands,actor);
    world = result.world; gate = appendGateEvent(result.gate, actor === null ? commands.length ? {kind:'step',commands} : {kind:'wait',ticks:1} : {kind:'activate',actor,commands});
    return result;
  };
  return {base,tick,state:()=>({gate,world})};
}
async function fixture() {
  const items=await importItems(new Uint8Array(ITEM_FILE_BYTES));
  const entry=(itemId:number): InventorySlot=>({itemId,damage:0,ammo:0,fourthByte:129,rawHex:`${itemId.toString(16).padStart(2,'0')}000081`});
  const team: OriginalTeam={profile:'ocs-initial-team-v1',sources:{roster:{sha256:'synthetic'} as OriginalTeam['sources']['roster'],items:items.source},actors:Array.from({length:4},(_,canonicalIndex)=>({canonicalIndex,stats:{fitness:65535,physique:1000,agility:1000,experience:0,footstep:0,grunt:0},inventory:{equipped:entry(0),carried:Array.from({length:30},(_,i)=>entry(i<10?1:0)),actions:Array.from({length:10},()=>entry(0))},weight:{status:'verified',totalWeight:0,quotient:0,tooHeavy:false,usingGrenade:0}}))};
  return {team,items};
}
describe('same-snapshot authored static gate',()=>{
  it('blocks, opens, traverses, refuses occupied close, vacates, closes and blocks again without base mutation',()=>{
    const h=harness(), original=structuredClone(h.base);
    h.tick(command(0,'strafe-right')); expect(h.tick(command(0,'forward')).events[0]?.kind).toBe('blocked');
    h.tick(command(0,'strafe-left')); expect(h.tick([],0).feedback).toContain('CLOSED → OPEN');
    h.tick(command(0,'strafe-right')); expect(h.tick(command(0,'forward')).events[0]?.kind).toBe('moved');
    const before=h.state().gate; expect(h.tick([],1).feedback).toContain('occupied-target');
    expect(h.state().gate.panelWord).toBe(before.panelWord); expect(h.state().gate.overlay).toEqual(before.overlay);
    h.tick(command(0,'forward')); expect(h.tick([],1).feedback).toContain('OPEN → CLOSED');
    expect(h.tick(command(0,'backward')).events[0]?.kind).toBe('blocked'); expect(h.base).toEqual(original);
    expect(h.state().gate.overlay.word>>>31).toBe(1);expect(h.state().gate.overlay.discoveryWord>>>31).toBe(1);
  });
  it('reserves same-tick destinations across all actors; also protects a currently occupied target when vacating',()=>{
    const h=harness();h.tick([],0);h.tick(command(0,'strafe-right'));
    const before=h.state().gate;const reserved=h.tick(command(0,'forward'),1);
    expect(reserved.feedback).toContain('occupied-target');expect(reserved.world.mercenaries[0]).toMatchObject(GATE_TARGET);
    expect(reserved.gate.panelWord).toBe(before.panelWord);expect(reserved.gate.overlay).toEqual(before.overlay);
    expect(h.tick(command(0,'forward'),1).feedback).toContain('occupied-target');
    expect(h.tick([],1).feedback).toContain('CLOSED');
  });
  it('requires the selected front-cell panel and applies no candidate for an away actor',()=>{
    const h=harness(), before=h.state().gate;expect(h.tick([],2).feedback).toContain('face the panel');
    expect(h.state().gate.overlay).toEqual(before.overlay);expect(h.state().gate.panelWord).toBe(before.panelWord);
    const effective=effectiveGateLevel(h.base,h.state().gate);expect(obstruction(effective,GATE_TARGET)).toBe('block');
    expect(effective.layers[0][cellIndex(effective,GATE_TARGET)]).toBe(h.state().gate.overlay.word);
  });
  it('replays activation/movement/item chronology and full inventory entries deterministically',async()=>{
    const {team,items}=await fixture(), h=harness();h.tick([],0);h.tick(command(0,'strafe-right'));h.tick(command(0,'forward'));h.tick([],1);h.tick(command(0,'forward'));h.tick([],1);
    const {gate,world}=h.state(), history:GateEvent[]=[{kind:'equip',actor:0,slot:0},...gate.history,{kind:'exchange',actor:0,slot:0},{kind:'return',actor:0,slot:0},{kind:'wait',ticks:3}];
    const replay=replayTrainingGate(h.base,team,items,history);expect(replay.gate.overlay).toEqual(gate.overlay);
    expect(replay.world.mercenaries).toEqual(world.mercenaries);expect(replay.world.tick).toBe(world.tick+3);
    expect(replay.inventory.actors[0]?.inventory.carried[0]?.fourthByte).toBe(129);
    expect(replayTrainingGate(h.base,team,items,replay.gate.history)).toEqual(replay);
  });
  it('bounds history/ticks and rejects malformed/accessor events without evaluating getters',async()=>{
    let reads=0;expect(()=>gateHistory([{get kind(){reads++;return 'wait';},ticks:1}])).toThrow();expect(reads).toBe(0);
    for(const history of [new Array(1),Array(129).fill({kind:'wait',ticks:1}),[{kind:'activate',actor:4,commands:[]}],[{kind:'activate',actor:0,commands:[{mercenaryId:0,action:'forward'},{mercenaryId:0,action:'forward'}]}],[{kind:'wait',ticks:45001}],[{kind:'activate',actor:0,commands:[],extra:1}],[{kind:'ground',actor:0,slot:0,groundId:'cache-0-0',transfer:{version:1,kind:'pickup-carried'}}]]) expect(()=>gateHistory(history)).toThrow();
    for(const input of [{...initialTrainingGate(),fixture:'forged'},{...initialTrainingGate(),overlay:{...initialTrainingGate().overlay,extra:1}},{...initialTrainingGate(),panelWord:-1}])expect(()=>gateEnvelope(input)).toThrow();
    const {team,items}=await fixture();expect(()=>replayTrainingGate(createTrainingGateLevel(),team,items,[{kind:'wait',ticks:45000},{kind:'wait',ticks:1}])).toThrow('tick budget');
  });
});

it('prospective history/tick/size budget failures leave the entire current candidate untouched',async()=>{
  const {team,items}=await fixture(), base=createTrainingGateLevel(), world=createWorld(base), gate=initialTrainingGate();
  gate.history=Array.from({length:128},()=>({kind:'step',commands:[{mercenaryId:0,action:'turn-right'}]}));
  const session:TrainingSession={team,items,indices:[0,1,2,3],names:['A','B','C','D'],inventory:replayTrainingInventory(team,items,[]),gate,ground:null,encounter:null,encounterGun:{} as never};
  const before=structuredClone({session,world,base});expect(()=>advanceGateTrainingSession(base,session,world,[],0)).toThrow('history budget');expect({session,world,base}).toEqual(before);
  const exhausted=structuredClone(world);exhausted.tick=45000;expect(()=>advanceGateTrainingSession(base,{...session,gate:initialTrainingGate()},exhausted,[],null)).toThrow('tick budget');expect(exhausted.tick).toBe(45000);
  // Valid individual commands can still exceed the outer UTF-8 budget together.
  const large={...session,names:Array(4).fill('x'.repeat(8000))};
  // Names are not serialized authority. Histories themselves are checked instead.
  expect(()=>advanceGateTrainingSession(base,{...large,gate:{...initialTrainingGate(),history:Array.from({length:127},()=>({kind:'step',commands:[0,1,2,3].map(mercenaryId=>({mercenaryId,action:'turn-right' as const}))}))}},world,[],null)).toThrow('too large');
  expect({session,world,base}).toEqual(before);
});
