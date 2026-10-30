import { expect, it } from 'vitest';
import { advanceMovingDoor, initialMovingDoor, DOOR_CELL, DOOR_INDEX, type DoorAction } from '../src/world/training-moving-door';
import { createMovingDoorLevel, initialTrainingGate, effectiveGateLevel, stepTrainingGate } from '../src/world/training-gate';
import { createWorld } from '../src/sim/world';
import { initialTrainingPatrol, stepTrainingPatrol, patrolPosition } from '../src/world/training-patrol';
import { createTrainingEncounter } from '../src/combat/training-encounter';

it('literal independent tick/bit oracle: 6 waits, ten variants, EXTRA erase step; close restores LONG and extra stop',()=>{
  let d = initialMovingDoor();
  for(let tick=1;tick<=67;tick++) {
    d = advanceMovingDoor(d,tick===1?14:0,[]);
    // Independent cadence formula, no invocation of source helper as expected oracle.
    const steps = tick<7 ? 0 : Math.floor((tick-7)/6)+1;
    expect(d.counter).toBe(tick-6*steps);
    expect(d.word).toBe(steps<=10 ? (0x8000a003+steps*0x800000)>>>0 : 0x85000001);
    expect(!!(d.word&2)).toBe(tick<67);
    expect(d.record.direction).toBe(steps===0 || steps===11 ? 0 : 1);
  }
  for(let tick=68;tick<=133;tick++) {
    d = advanceMovingDoor(d,tick===68?15:0,[]);
    const steps = Math.max(0,Math.floor((tick-73)/6)+1);
    expect(d.word).toBe(steps===0 ? 0x85000001 : (0x8000a003+Math.max(0,10-steps)*0x800000)>>>0);
    expect(d.record.direction).toBe(steps===0 || steps===11 ? 0 : 2);
  }
  expect(d.record).toEqual({...initialMovingDoor().record,delayCount:1});
});

it('source reversal, pending lock, unlock, signed raw delay and auto-close retain every raw field',()=>{
  let d=initialMovingDoor(); const step=(action:DoorAction=0)=>d=advanceMovingDoor(d,action,[]);
  for(let t=1;t<=25;t++)step(t===1?14:0);
  expect((d.word>>>23)&31).toBe(4);step(15);for(let t=27;t<=31;t++)step();expect((d.word>>>23)&31).toBe(3);
  step(14);for(let t=33;t<=37;t++)step();expect((d.word>>>23)&31).toBe(4);
  step(17);while(d.record.direction!==3)step();
  expect(d.word).toBe(0x85000001); expect(d.record.trigger).toBe(0);
  step(18);while(d.record.direction===3)step();expect(d.record.direction).toBe(0);
  while(!(d.word&2))step();expect(d.record.direction).toBe(2);expect((d.word>>>23)&31).toBe(9);
  expect(d.record).toMatchObject({position:DOOR_INDEX*4,storedType:0x8000a003,delay:100,key:0,buttonOnly:255});
  // Raw 255 disables auto-close. Raw count 255 wraps to zero with enabled delay.
  const open={...initialMovingDoor(),word:0x85000001,counter:6};
  expect(advanceMovingDoor({...open,record:{...open.record,delay:255}},0,[]).record.delayCount).toBe(0);
  expect(advanceMovingDoor({...open,record:{...open.record,delayCount:255}},0,[]).record.delayCount).toBe(0);
});

it('occupied closure freezes complete record/word/counter, retains action, recomputes guard and never catches up',()=>{
  let d={...initialMovingDoor(),word:0x85000001,counter:6};
  const before=structuredClone(d);
  for(let i=0;i<30;i++)d=advanceMovingDoor(d,i===0?15:0,[DOOR_CELL]);
  expect(d).toEqual({...before,pendingAction:15,deferred:true});
  d=advanceMovingDoor(d,0,[]);expect(d).toMatchObject({counter:1,pendingAction:0,deferred:false,word:0x8480a003,record:{direction:2,trigger:0}});
  expect(before).toEqual({...initialMovingDoor(),word:0x85000001,counter:6});
});

it.each(['current','destination','vacating'] as const)('actual player %s footprint guards the whole closing commit',kind=>{
  const level=createMovingDoorLevel(),gate=initialTrainingGate(true),world=createWorld(level);
  gate.moving={...gate.moving!,word:0x85000001,counter:6};gate.overlay={...gate.overlay,word:gate.moving.word};
  world.mercenaries[0]={...world.mercenaries[0]!,x:kind==='destination'?4:5,y:5,facing:1};
  const commands=kind==='current'?[]:[{mercenaryId:0,action:'forward' as const}];
  // Actor1 still faces the front panel to request close.
  const r=stepTrainingGate(level,world,gate,commands,1,[],effectiveGateLevel(level,gate),15);
  expect(r.gate.moving).toEqual({...gate.moving,pendingAction:15,deferred:true});
  expect(r.world.mercenaries[0].x).toBe(kind==='vacating'?6:5);
  const next=stepTrainingGate(level,r.world,r.gate,[],null);
  expect(next.gate.moving!.deferred).toBe(kind!=='vacating');
  expect(!!(next.gate.overlay.word&2)).toBe(kind==='vacating');
});

it('NPC open passage reserves current AND future destinations; vacating defers then closure resumes',()=>{
  const level=createMovingDoorLevel(),world=createWorld(level),gate=initialTrainingGate(true);
  gate.moving={...gate.moving!,word:0x85000001,counter:6};gate.overlay={...gate.overlay,word:gate.moving.word};
  const row=new Uint8Array(286);row[265]=8;row[284]=24;row[285]=255;
  const encounter=createTrainingEncounter({itemId:25,rawHex:Buffer.from(row).toString('hex')},[0,1,2,3],0,'full');
  const patrol={...initialTrainingPatrol(true,true),routeIndex:1,counter:15};
  let r=stepTrainingPatrol(level,world,gate,patrol,encounter,[],0,undefined,15);
  expect(patrolPosition(r.patrol)).toEqual(DOOR_CELL);expect(r.gate.moving!.deferred).toBe(true);
  // Current cell guards all intervening ticks and the vacating tick.
  for(let i=0;i<16;i++)r=stepTrainingPatrol(level,r.world,r.gate,r.patrol,r.encounter,[],null);
  expect(patrolPosition(r.patrol).x).toBe(6);expect(r.gate.moving!.deferred).toBe(true);
  r=stepTrainingPatrol(level,r.world,r.gate,r.patrol,r.encounter,[],null);
  expect(r.gate.moving!.deferred).toBe(false);expect(r.gate.overlay.word).toBe(0x8480a003);
});

it('same snapshot blocks variant10, permits erase-completed traversal; terminal tick freezes door and NPC',()=>{
  const level=createMovingDoorLevel(),world=createWorld(level),gate=initialTrainingGate(true);
  world.mercenaries[0]={...world.mercenaries[0]!,x:4,y:5,facing:1};
  gate.moving={...gate.moving!,word:0x8500a003,counter:6,record:{...gate.moving!.record,direction:1}};gate.overlay={...gate.overlay,word:gate.moving.word};
  const r=stepTrainingGate(level,world,gate,[{mercenaryId:0,action:'forward'}],null);
  expect(r.world.mercenaries[0].x).toBe(4);expect(r.gate.overlay.word).toBe(0x85000001);
  expect(stepTrainingGate(level,r.world,r.gate,[{mercenaryId:0,action:'forward'}],null).world.mercenaries[0].x).toBe(5);
  const stopped={...r.world,mission:{...r.world.mission,outcome:'failed' as const}};
  const frozen=stepTrainingGate(level,stopped,r.gate,[],0);
  expect(frozen.gate).toEqual(r.gate);expect(frozen.world).toEqual(stopped);
});
