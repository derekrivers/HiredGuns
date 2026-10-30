import {describe,it,expect} from 'vitest';
import {createPressurePadLevel,effectiveGateLevel,initialTrainingGate,stepTrainingGate} from '../src/world/training-gate';
import {padBinding,padButtons,transitionPressurePad} from '../src/world/training-pressure-pad';
import {createWorld} from '../src/sim/world';
import type {PlayerCommand} from '../src/contracts';
import {extractionProfile} from '../src/sim/mission-profile';
import {createTrainingEncounter} from '../src/combat/training-encounter';
import {initialTrainingPatrol,stepTrainingPatrol} from '../src/world/training-patrol';

describe('source pad floor / upper descriptor / direct actions',()=>{
 it('uses exact masked floor and the preceding plane, ignoring used and local variant',()=>{
  const map=createPressurePadLevel();
  expect(map.layers[0][648]).toBe(0x80000201);
  expect(map.layers[0][119]).toBe(0x81800042);
  expect(padBinding(map,648,'press')).toEqual({index:3,action:14,datum:9616});
  expect(padBinding(map,648,'release')).toEqual({index:3,action:15,datum:9616});
  for(const floor of [0x200,1,0x401,0x601]) {map.layers[0][648]=floor;expect(padBinding(map,648,'press')).toBeNull();}
  map.layers[0][648]=0x85800201;expect(padBinding(map,648,'press')?.index).toBe(3);
  map.layers[0][119]=0x81000042;expect(()=>padBinding(map,648,'press')).toThrow('binding');
  map.layers[0][119]=0x81800042;const rows=padButtons();rows[3*28]=0;expect(padBinding(map,648,'press',rows)?.action).toBe(14);
  new DataView(rows.buffer).setUint32(3*28+4,648*4);expect(()=>padBinding(map,648,'press',rows)).toThrow('binding');
 });
 it('steps on, holds without retrigger, blocks, releases into door with no crush, vacates and reenters',()=>{
  const map=createPressurePadLevel();let world=createWorld(map),gate=initialTrainingGate(true,true);
  const tick=(commands:PlayerCommand[]=[])=>{const r=stepTrainingGate(map,world,gate,commands,null);world=r.world;gate=r.gate;return r;};
  tick([{mercenaryId:0,action:'strafe-right'}]);expect(world.mercenaries[0]).toMatchObject({x:4,y:5});
  expect(gate.pad).toEqual({occupants:[0],lastActions:[{actor:0,edge:'press',index:3,action:14,datum:9616}]});
  tick([{mercenaryId:0,action:'forward'}]);expect(world.mercenaries[0].x).toBe(4);
  while(world.tick<67)tick();expect(gate.moving!.word&2).toBe(0);expect(gate.moving!.record.direction).toBe(0);
  tick();expect(gate.moving!.record.trigger).toBe(0);expect(gate.pad!.lastActions).toHaveLength(1);
  tick([{mercenaryId:0,action:'forward'}]);expect(gate.pad!.lastActions[0]).toMatchObject({edge:'release',action:15});
  for(let n=0;n<12;n++)tick();expect(gate.moving!.deferred).toBe(true);expect(gate.moving!.word&2).toBe(0);
  tick([{mercenaryId:0,action:'forward'}]);expect(gate.moving!.deferred).toBe(true);tick();expect(gate.moving!.word&2).toBe(2);
  expect(extractionProfile(effectiveGateLevel(map,gate))?.timeLimit).toBe(10);
 });
 it('orders actors and release/press branches without aggregate occupancy rules',()=>{
  const map=createPressurePadLevel(),before=createWorld(map),after=structuredClone(before);
  before.mercenaries[0]={...before.mercenaries[0]!,x:4,y:5};after.mercenaries[0]={...after.mercenaries[0]!,x:4,y:6};
  after.mercenaries[1]={...after.mercenaries[1]!,x:4,y:5};
  const receipt=transitionPressurePad(map,before,after,{occupants:[0],lastActions:[]});
  expect(receipt.lastActions.map(a=>[a.actor,a.edge,a.action])).toEqual([[0,'release',15],[1,'press',14]]);
  expect(receipt.occupants).toEqual([1]);
  for(let actor=0;actor<4;actor++) {const a=createWorld(map),b=structuredClone(a);b.mercenaries[actor]={...b.mercenaries[actor]!,x:4,y:5};expect(transitionPressurePad(map,a,b,{occupants:[],lastActions:[]}).lastActions[0]?.actor).toBe(actor);}
 });
 it('rejects altered authored floor and descriptor as mission authority',()=>{
  for(const index of [648,119]){const map=createPressurePadLevel();map.layers[0][index]!^=0x80;expect(extractionProfile(map)).toBeNull();}
 });
 it('NPC physically occupies P and blocks player entry without pressing; turn and wait do not activate',()=>{
  const map=createPressurePadLevel(),row=new Uint8Array(286);row[265]=8;row[284]=24;row[285]=3;
  let world=createWorld(map),gate=initialTrainingGate(true,true),patrol=initialTrainingPatrol(true,true,true),encounter=createTrainingEncounter({itemId:25,rawHex:Buffer.from(row).toString('hex')},[0,1,2,3],0,'full');
  const tick=(commands:PlayerCommand[]=[])=>{const r=stepTrainingPatrol(map,world,gate,patrol,encounter,commands,null);({world,gate,patrol,encounter}=r);return r;};
  for(let n=0;n<16;n++)tick();expect(patrol.routeIndex).toBe(1);expect(gate.pad).toEqual({occupants:[],lastActions:[]});expect(gate.moving!.record.trigger).toBe(0);
  tick([{mercenaryId:0,action:'strafe-right'}]);expect(world.mercenaries[0]).toMatchObject({x:4,y:4});expect(gate.pad!.lastActions).toEqual([]);
  tick([{mercenaryId:0,action:'turn-left'}]);tick();expect(gate.pad!.lastActions).toEqual([]);
 });
 it('manual action precedes movement press and consumes only one scheduler count',()=>{
  const map=createPressurePadLevel(),world=createWorld(map),gate=initialTrainingGate(true,true);
  const result=stepTrainingGate(map,world,gate,[{mercenaryId:0,action:'strafe-right'}],0,[],undefined,15);
  expect(result.gate.moving!.record.trigger).toBe(1);expect(result.gate.moving!.counter).toBe(1);expect(result.gate.pad!.lastActions[0]!.action).toBe(14);
 });
});
