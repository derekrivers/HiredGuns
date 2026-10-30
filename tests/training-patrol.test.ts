import { expect, it } from 'vitest';
import type { PlayerCommand } from '../src/contracts';
import { createWorld } from '../src/sim/world';
import { createTrainingEncounter, fireTrainingEncounter } from '../src/combat/training-encounter';
import { createTrainingGateLevel, effectiveGateLevel, initialTrainingGate } from '../src/world/training-gate';
import { initialTrainingPatrol, patrolHistory, patrolPosition, stepTrainingPatrol } from '../src/world/training-patrol';
import { advanceGateTrainingSession, commandPatrolEncounter, type TrainingSession } from '../src/sim/training-session';

function harness(damage=3) {
  const row = new Uint8Array(286); row[265]=8;row[274]=17;row[284]=24;row[285]=damage;
  const gun = {itemId:25 as const,rawHex:Buffer.from(row).toString('hex')};
  const level = createTrainingGateLevel(); let world = createWorld(level), gate = initialTrainingGate(), patrol = initialTrainingPatrol(), encounter = createTrainingEncounter(gun,[0,1,2,3],0,'full');
  let effective = effectiveGateLevel(level,gate);
  const tick = (commands: PlayerCommand[]=[],actor: number|null=null) => {
    const result=stepTrainingPatrol(level,world,gate,patrol,encounter,commands,actor,effective);
    ({world,gate,patrol,encounter}=result); effective=result.effective; return result;
  };
  return {level,gun,tick,state:()=>({world,gate,patrol,encounter}),set:(next:{world?:typeof world;gate?:typeof gate;patrol?:typeof patrol;encounter?:typeof encounter}) => {world=next.world??world;gate=next.gate??gate;patrol=next.patrol??patrol;encounter=next.encounter??encounter;}};
}
it('matches an independent integer route oracle for closed and open gates; no wall crossing or input mutation',()=>{
  for (const open of [false,true]) {
    const h=harness(), before=structuredClone(h.level);if(open)h.tick([],0);
    let index=0,direction=1,counter=0;
    // First open tick is an accepted cadence unit.
    if(open)counter=1;
    for(let i=0;i<220;i++) {
      if(++counter===16) {counter=0;const next=index+direction;if(next<0||next>4||(!open&&next===2))direction=-direction;else index=next;}
      h.tick();expect(h.state().patrol).toMatchObject({routeIndex:index,direction,counter});
      expect(h.state().world.mercenaries.some(p=>p.x===patrolPosition(h.state().patrol).x&&p.y===5)).toBe(false);
    }
    expect(h.level).toEqual(before);
  }
});
it('reserves current and next NPC cells against players and refuses closing onto either',()=>{
  const h=harness();h.tick([],0);for(let i=1;i<31;i++)h.tick();
  expect(h.state().patrol).toMatchObject({routeIndex:1,counter:15});
  const reservation=h.tick([{mercenaryId:0,action:'strafe-right'}],1);
  expect(reservation.feedback).toContain('occupied-target');expect(reservation.events[0]?.kind).toBe('blocked');
  expect(h.state().patrol.routeIndex).toBe(2);expect(h.state().world.mercenaries[0]).toMatchObject({x:4,y:4});
  expect(h.tick([],1).feedback).toContain('occupied-target');
  // Vacating NPC current cell is still reserved on that tick.
  for(let i=0;i<14;i++)h.tick();
  const current=structuredClone(h.state().world);current.mercenaries[0]={...current.mercenaries[0]!,x:4,y:5,facing:1};h.set({world:current});
  expect(h.tick([{mercenaryId:0,action:'forward'}]).events[0]?.kind).toBe('blocked');expect(h.state().patrol.routeIndex).toBe(3);
});
it('reverses for player occupancy, refuses swaps, and defeated target stops/releases cells using existing health arithmetic',()=>{
  const h=harness(255), world=structuredClone(h.state().world);world.mercenaries[0]={...world.mercenaries[0]!,x:4,y:5};h.set({world});
  for(let i=0;i<15;i++)h.tick();
  h.tick([{mercenaryId:0,action:'backward'}]);
  expect(h.state().patrol).toMatchObject({routeIndex:0,direction:-1,blocked:'player'});expect(h.state().world.mercenaries[0].x).toBe(4);
  const defeated=fireTrainingEncounter(h.state().encounter,h.gun);expect(defeated.fitness).toBe(0);h.set({encounter:defeated});
  const stopped=structuredClone(h.state().patrol);h.tick([{mercenaryId:0,action:'backward'}]);
  expect(h.state().world.mercenaries[0].x).toBe(3);for(let i=0;i<40;i++)h.tick();expect(h.state().patrol).toEqual(stopped);
});
it('terminal and prospective invalid command/history/size/tick/fire budgets leave full state untouched',()=>{
  const h=harness(), state=h.state();
  const session:TrainingSession={indices:[0,1,2,3],names:[],team:{} as never,items:{} as never,inventory:{commands:[],actors:[]},ground:null,gate:state.gate,patrol:state.patrol,encounter:state.encounter,encounterGun:h.gun};
  const before=structuredClone({session,world:state.world});
  expect(()=>advanceGateTrainingSession(h.level,session,state.world,[{mercenaryId:4,action:'forward'}],null)).toThrow();
  const full={...session,patrol:{...state.patrol,history:Array.from({length:128},()=>({kind:'target' as const}))}};
  expect(()=>commandPatrolEncounter(h.level,full,state.world,'fire',false)).toThrow('history');
  expect(()=>advanceGateTrainingSession(h.level,{...session,patrol:{...state.patrol,history:Array.from({length:127},()=>({kind:'step' as const,commands:[0,1,2,3].map(mercenaryId=>({mercenaryId,action:'turn-right' as const}))}))}},state.world,[],null)).toThrow('too large');
  expect(()=>advanceGateTrainingSession(h.level,session,{...state.world,tick:45000},[],null)).toThrow('tick budget');
  expect(()=>commandPatrolEncounter(h.level,session,state.world,'fire',true)).toThrow();
  expect({session,world:state.world}).toEqual(before);
  const terminal=structuredClone(state.world);terminal.mission.outcome='failed';h.set({world:terminal});
  expect(h.tick().patrol).toEqual(state.patrol);expect(h.state().world.tick).toBe(0);
});
it('rejects sparse, accessor, extra-field, unbounded and unknown histories without invoking accessors',()=>{
  let reads=0;expect(()=>patrolHistory([{get kind(){reads++;return 'fire';}}])).toThrow();expect(reads).toBe(0);
  for(const history of [new Array(1),Array(129).fill({kind:'fire'}),[{kind:'fire',extra:1}],[{kind:'arm'}],[{kind:'wait',ticks:45001}],[{kind:'step',commands:[{mercenaryId:4,action:'forward'}]}]])expect(()=>patrolHistory(history)).toThrow();
});
