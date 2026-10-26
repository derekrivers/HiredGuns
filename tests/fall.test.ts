import { describe, expect, it } from 'vitest';
import { cellIndex, type LevelData, type Position, type WorldState } from '../src/contracts';
import { dryFallEnabled, fallCounterAtTick, fallObstruction, initialPhysics, isDead, teamDead } from '../src/sim/fall';
import { createWorld, stepWorld } from '../src/sim/world';
import { resolveTraversal } from '../src/sim/traversal';
import { createDemoLevel } from '../src/demo';

function fixture(heights=[3,4,5,7]): LevelData {
  const level: LevelData={schemaVersion:1,id:'synthetic-fall-v1',name:'Authored fall drill',source:{kind:'synthetic',sha256:null,revision:'synthetic'},size:{width:9,depth:9,height:9},layers:[Array<number>(729).fill(0),Array<number>(729).fill(0),Array<number>(729).fill(0)],starts:heights.map((z,id)=>({x:1+id*2,y:7,z,facing:0})) as LevelData['starts'],exit:{x:8,y:8,z:1},unsupportedMechanics:[]};
  for (let y=0;y<9;y++) for (let x=0;x<9;x++) { put(level,{x,y,z:0},2);put(level,{x,y,z:1},1); }
  for (const start of level.starts) put(level,start,1);
  return level;
}
function put(level:LevelData,p:Position,word:number) { level.layers[0][cellIndex(level,p)]=word>>>0; }
function run(level:LevelData,world:WorldState,toTick:number) {
  while(world.tick<toTick) world=stepWorld(level,world,[]).world;
  return world;
}
function leavePlatforms(level:LevelData) {
  return stepWorld(level,createWorld(level),[0,1,2,3].map(mercenaryId=>({mercenaryId,action:'forward'} as const))).world;
}

describe('authored dry fall physics',()=>{
  it('activates only the exact authored synthetic profile and gives all actors independent empty-inventory state',()=>{
    const level=fixture();expect(dryFallEnabled(level)).toBe(true);
    const physics=initialPhysics(level);expect(physics.mode).toBe('dry-fall');
    if(physics.mode!=='dry-fall') throw new Error('fixture');
    expect(physics.actors).toEqual(Array.from({length:4},()=>({physique:100,agility:100,weight:0,fitness:65535,dead:false,fallDamage:0})));
    physics.actors[0].fitness=1000;expect(physics.actors[1].fitness).toBe(65535);
    expect(initialPhysics({...level,id:'other'})).toEqual({mode:'static'});
    expect(initialPhysics({...level,source:{kind:'editor-map',sha256:null,revision:'unverified-editor'}})).toEqual({mode:'static'});
    const mismatched={...level,source:{kind:'editor-map' as const,sha256:null,revision:'unverified-editor' as const}};
    expect(()=>stepWorld(mismatched,createWorld(level),[])).toThrow('not enabled');
    expect(createWorld(createDemoLevel()).physics).toEqual({mode:'static'});
    expect(createWorld(level).schemaVersion).toBe(3);
    const bad=fixture();put(bad,bad.starts[0],0);expect(()=>createWorld(bad)).toThrow('Start cannot navigate');
  });

  it('has its first pulse at7 then every6 ticks, matching the persisted counter formula',()=>{
    expect(Array.from({length:15},(_,tick)=>fallCounterAtTick(tick))).toEqual([0,1,2,3,4,5,6,1,2,3,4,5,6,1,2]);
    expect(()=>fallCounterAtTick(-1)).toThrow();expect(()=>fallCounterAtTick(1.5)).toThrow();
    const level=fixture();let world=leavePlatforms(level);
    const initialZ=world.mercenaries.map(p=>p.z);
    for(let tick=2;tick<=6;tick++) { world=stepWorld(level,world,[]).world;expect(world.mercenaries.map(p=>p.z)).toEqual(initialZ); }
    const pulse=stepWorld(level,world,[]);expect(pulse.world.tick).toBe(7);
    expect(pulse.events.map(e=>e.kind)).toEqual(['fell','fell','fell','fell']);
    expect(pulse.world.mercenaries.map(p=>p.z)).toEqual([2,3,4,6]);
    if(pulse.world.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(pulse.world.physics.actors.map(a=>a.fallDamage)).toEqual([6400,6400,6400,6400]);
    expect(pulse.world.physics.fallCounter).toBe(1);
  });

  it('applies hand-computed landing injury on the next pulse, not the landing step',()=>{
    const level=fixture();const start=leavePlatforms(level);
    const landed=run(level,start,13);expect(landed.mercenaries[0].z).toBe(1);
    if(landed.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(landed.physics.actors[0]).toMatchObject({fitness:65535,fallDamage:12800,dead:false});
    const injured=run(level,landed,19);
    if(injured.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(injured.physics.actors[0]).toMatchObject({fitness:52735,fallDamage:0,dead:false});
    const all=run(level,injured,43);
    if(all.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(all.physics.actors.map(a=>a.fitness)).toEqual([52735,39935,14335,0]);
    expect(all.physics.actors.map(a=>a.dead)).toEqual([false,false,false,true]);
    expect(all.physics.actors.map(a=>a.fallDamage)).toEqual([0,0,0,0]);
    expect(all.mercenaries.map(p=>p.z)).toEqual([1,1,1,1]);
  });

  it('runs gravity before controls, removes newly dead occupancy and ignores dead commands without mutating inputs',()=>{
    const level=fixture();const world=createWorld(level);world.tick=12;
    if(world.physics.mode!=='dry-fall')throw new Error('fixture');
    world.physics.fallCounter=6;
    world.mercenaries[0]={id:0,x:1,y:6,z:1,facing:0};world.physics.actors[0].fitness=700;world.physics.actors[0].fallDamage=6400;
    world.mercenaries[1]={id:1,x:1,y:7,z:1,facing:0};
    const snapshot=structuredClone(world);const layers=structuredClone(level.layers);
    const result=stepWorld(level,world,[{mercenaryId:0,action:'turn-right'},{mercenaryId:1,action:'forward'}]);
    expect(result.events.slice(0,2).map(e=>e.kind)).toEqual(['damaged','died']);
    expect(result.events.at(-1)).toMatchObject({mercenaryId:1,kind:'moved'});
    expect(result.world.mercenaries[0].facing).toBe(0);expect(result.world.mercenaries[1].y).toBe(6);
    expect(isDead(result.world,0)).toBe(true);expect(teamDead(result.world)).toBe(false);
    expect(world).toEqual(snapshot);expect(level.layers).toEqual(layers);
  });

  it('suspends a fall above an active actor without squash or clearing accumulated damage',()=>{
    const level=fixture();const world=createWorld(level);world.tick=12;
    if(world.physics.mode!=='dry-fall')throw new Error('fixture');
    world.physics.fallCounter=6;world.physics.actors[0].fallDamage=6400;
    world.mercenaries[0]={id:0,x:1,y:6,z:3,facing:0};world.mercenaries[1]={id:1,x:1,y:6,z:2,facing:0};
    const result=stepWorld(level,world,[]);
    expect(result.events[0]).toMatchObject({mercenaryId:0,kind:'blocked',reason:'occupied below'});
    expect(result.world.mercenaries[0].z).toBe(3);expect(result.world.mercenaries[1].z).toBe(1);
    if(result.world.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(result.world.physics.actors[0]).toMatchObject({fitness:65535,fallDamage:6400});
    expect(result.world.physics.actors[1].fitness).toBe(65535);
    const resumed=run(level,result.world,19);
    expect(resumed.mercenaries[0].z).toBe(2);
    if(resumed.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(resumed.physics.actors[0].fallDamage).toBe(12800);
  });

  it('freezes a four-death world without changing navigation mission state and permits a fresh retry',()=>{
    const level=fixture([7,7,7,7]);const world=run(level,leavePlatforms(level),42);
    const death=stepWorld(level,world,[{mercenaryId:0,action:'turn-right'}]);
    expect(teamDead(death.world)).toBe(true);expect(death.world.tick).toBe(43);
    expect(death.events.filter(e=>e.kind==='died')).toHaveLength(4);
    expect(death.world.mission).toEqual(createWorld(level).mission);
    expect(stepWorld(level,death.world,[{mercenaryId:0,action:'forward'}])).toEqual({world:death.world,events:[]});
    expect(teamDead(createWorld(level))).toBe(false);
  });

  it('rejects every unsafe eventual vertical path, unsupported support type and unbounded void before stepping off',()=>{
    for(const word of [4,16,256,32,513,1025,(12<<28)|32,(7<<11)|2,64]) {
      const level=fixture();const world=createWorld(level);put(level,{x:1,y:6,z:2},word);
      expect(fallObstruction(level,{x:1,y:6,z:3})).not.toBeNull();
      const result=stepWorld(level,world,[{mercenaryId:0,action:'forward'}]);
      expect(result.events[0]!.kind).toBe('blocked');expect(result.world.mercenaries[0]).toEqual(world.mercenaries[0]);
    }
    const voidLevel=fixture();put(voidLevel,{x:1,y:6,z:1},0);put(voidLevel,{x:1,y:6,z:0},0);
    expect(fallObstruction(voidLevel,{x:1,y:6,z:3})).toBe('boundary');
    expect(stepWorld(voidLevel,createWorld(voidLevel),[{mercenaryId:0,action:'forward'}]).events[0]!.kind).toBe('blocked');
  });

  it('retains stair/tree guards and static drop behavior while allowing only dry-profile airborne continuation',()=>{
    const level=fixture();const from={x:1,y:6,z:3,facing:0 as const};
    expect(resolveTraversal(level,from,0).reason).toBe('current unsupported drop');
    expect(resolveTraversal(level,from,0,()=>false,true).reason).toBeNull();
    expect(fallObstruction(level,from)).toBeNull();
    put(level,{x:1,y:5,z:2},(4<<11)|2);
    expect(resolveTraversal(level,from,0,()=>false,true).reason).toBe('block4 entry');
    const staticLevel={...fixture(),id:'static-fixture'};
    expect(stepWorld(staticLevel,createWorld(staticLevel),[{mercenaryId:0,action:'forward'}]).events[0]).toMatchObject({kind:'blocked',reason:'unsupported drop'});
    const dry=fixture();let midair=leavePlatforms(dry);midair=stepWorld(dry,midair,[{mercenaryId:0,action:'strafe-right'}]).world;
    expect(midair.mercenaries[0]).toMatchObject({x:2,y:6,z:3});
  });

  it('ignores extracted actors for gravity, controls and occupancy while preserving atomic command validation',()=>{
    const level=fixture();const world=createWorld(level);world.tick=12;
    if(world.physics.mode!=='dry-fall')throw new Error('fixture');
    world.physics.fallCounter=6;
    world.mission.exited[0]=true;world.mercenaries[0]={id:0,x:1,y:6,z:2,facing:0};
    world.mercenaries[1]={id:1,x:1,y:6,z:3,facing:0};
    const before=structuredClone(world);
    expect(()=>stepWorld(level,world,[{mercenaryId:1,action:'forward'},{mercenaryId:1,action:'backward'}])).toThrow('Duplicate');
    expect(world).toEqual(before);
    const result=stepWorld(level,world,[{mercenaryId:0,action:'turn-right'}]);
    expect(result.world.mercenaries[0]).toEqual(world.mercenaries[0]);
    expect(result.world.mercenaries[1].z).toBe(2);
    expect(result.events.some(e=>e.mercenaryId===0)).toBe(false);
    if(result.world.physics.mode!=='dry-fall')throw new Error('fixture');
    expect(result.world.physics.fallCounter).toBe(fallCounterAtTick(result.world.tick));
  });
});
