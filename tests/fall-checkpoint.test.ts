import { expect, test } from 'vitest';
import { createDemoLevel, createExtractionDemo, createFallDemo } from '../src/demo';
import { cellIndex, type PlayerCommand, type WorldState } from '../src/contracts';
import { createWorld, stepWorld } from '../src/sim/world';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';
import { createSelectedFallLevel, selectedFallLevel, type FallProfile } from '../src/sim/fall';
import { nextFallDamage } from '../src/sim/health';

test('authored selected geometry requires an explicit profile and binds every saved stat', async () => {
  const level = createSelectedFallLevel();
  const profile = [80,100,120,140].map(physique=>({physique,agility:70,weight:1400,fitness:65535,dead:false,fallDamage:0})) as FallProfile;
  expect(()=>createWorld(level)).toThrow('rebound team');
  let world = stepWorld(level,createWorld(level,undefined,undefined,profile),forward).world;
  while(world.tick<13) world=stepWorld(level,world,[]).world;
  expect(actors(world)[0]!.fallDamage).toBe(nextFallDamage(nextFallDamage(0,profile[0]),profile[0]));
  const saved = await exportCheckpoint(level,world,profile);
  expect(await importCheckpoint(level,saved,profile)).toEqual(world);
  await expect(importCheckpoint(level,saved)).rejects.toThrow('rebound team');
  const changed = structuredClone(profile); changed[0].weight++;
  await expect(importCheckpoint(level,saved,changed)).rejects.toThrow('bound profile');
  const bad = JSON.parse(saved); bad.world.physics.actors[0].fallDamage++;
  await expect(importCheckpoint(level,JSON.stringify(bad),profile)).rejects.toThrow('fall damage');
  const changedMap = structuredClone(level); changedMap.layers[1][0]=1;
  expect(selectedFallLevel(changedMap)).toBe(false);
  await expect(importCheckpoint(changedMap,saved,profile)).rejects.toThrow();
  const legacy = JSON.parse(saved); legacy.version=2;
  await expect(importCheckpoint(level,JSON.stringify(legacy),profile)).rejects.toThrow('cannot supply dry-fall history');
});

type EditableFallEnvelope = { world: { physics: { mode: unknown; profileId: unknown; fallCounter: unknown; actors: Record<string,unknown>[]; [key:string]: unknown }; [key:string]: unknown } };
const forward: PlayerCommand[] = [0,1,2,3].map(mercenaryId => ({mercenaryId,action:'forward'}));
function atTick(tick: number) {
  const level = createFallDemo();
  let world = stepWorld(level,createWorld(level),forward).world;
  while (world.tick < tick) world = stepWorld(level,world,[]).world;
  return {level,world};
}
function actors(world: WorldState) {
  if (world.physics.mode !== 'dry-fall') throw new Error('Expected dry physics');
  return world.physics.actors;
}

test('mid-fall v3 checkpoint preserves cadence/damage and reproduces injury and death', async () => {
  const {level,world} = atTick(13);
  expect(world.mercenaries.map(p=>p.z)).toEqual([1,2,3,5]);
  expect(actors(world).map(a=>a.fallDamage)).toEqual([12800,12800,12800,12800]);
  const json = await exportCheckpoint(level,world);
  expect(JSON.parse(json).version).toBe(3);
  expect(JSON.parse(json).world.schemaVersion).toBe(3);
  let restored = await importCheckpoint(level,json), uninterrupted = world;
  expect(restored).toEqual(world);
  for (let i=0;i<30;i++) {
    const a=stepWorld(level,restored,[]), b=stepWorld(level,uninterrupted,[]);
    expect(a).toEqual(b); restored=a.world; uninterrupted=b.world;
  }
  expect(actors(restored).map(a=>a.fitness)).toEqual([52735,39935,14335,0]);
  expect(actors(restored).map(a=>a.dead)).toEqual([false,false,false,true]);
  expect(await importCheckpoint(level,await exportCheckpoint(level,restored))).toEqual(restored);
  restored=stepWorld(level,restored,[{mercenaryId:2,action:'strafe-right'}]).world;
  restored=stepWorld(level,restored,[{mercenaryId:2,action:'strafe-right'}]).world;
  expect(restored.mercenaries[2].x).toBe(8); // Dead actor 3 no longer occupies this cell.
  expect(await importCheckpoint(level,await exportCheckpoint(level,restored))).toEqual(restored);
});

test('v3 rejects invented profiles, stats, cadence, fitness, accumulator and extra fields', async () => {
  const {level,world} = atTick(13), json = await exportCheckpoint(level,world);
  const edits: ((e: EditableFallEnvelope) => void)[] = [ // Unknown JSON is intentionally mutated at this boundary.
    e=>{e.world.physics.mode='water';}, e=>{e.world.physics.profileId='original';},
    e=>{e.world.physics.fallCounter=6;}, e=>{e.world.physics.fallCounter='1';},
    e=>{e.world.physics.actors.pop();}, e=>{e.world.physics.extra=0;},
    e=>{e.world.physics.actors[0]!.physique=99;}, e=>{e.world.physics.actors[0]!.agility=0;},
    e=>{e.world.physics.actors[0]!.weight=1;}, e=>{e.world.physics.actors[0]!.fitness=654;},
    e=>{e.world.physics.actors[0]!.fitness=65536;}, e=>{e.world.physics.actors[0]!.dead=1;},
    e=>{e.world.physics.actors[0]!.dead=true;}, e=>{e.world.physics.actors[0]!.fallDamage=3;},
    e=>{e.world.physics.actors[0]!.fallDamage=0x1000001;}, e=>{e.world.physics.actors[0]!.water=0;},
    e=>{delete e.world.physics.actors[0]!.fallDamage;}, e=>{Reflect.deleteProperty(e.world,'physics');},
  ];
  for (const edit of edits) {
    const bad=JSON.parse(json); edit(bad);
    await expect(importCheckpoint(level,JSON.stringify(bad))).rejects.toThrow();
  }
  const unsafe=structuredClone(level);
  unsafe.layers[0][cellIndex(unsafe,{...world.mercenaries[3],z:2})]=4;
  await expect(exportCheckpoint(unsafe,world)).rejects.toThrow('obstructed');
});

test('v1/v2 static migration preserves bounded mission state and cannot invent fall history', async () => {
  for (const version of [1,2]) for (const mission of [false,true]) {
    const level=mission?createExtractionDemo():createDemoLevel();
    const world=createWorld(level,1,{mode:'navigation',timeLimit:null});
    const legacy=JSON.parse(await exportCheckpoint(level,world));
    legacy.version=version; legacy.world.schemaVersion=version; delete legacy.world.physics;
    if (version===1) delete legacy.world.mission;
    expect(await importCheckpoint(level,JSON.stringify(legacy))).toEqual(world);
  }
  const level=createExtractionDemo();
  for (const p of level.starts) level.layers[0][cellIndex(level,{...p,y:p.y-1})]=(3<<11)|2;
  const complete=stepWorld(level,createWorld(level),forward).world;
  const legacy=JSON.parse(await exportCheckpoint(level,complete));
  legacy.version=2; legacy.world.schemaVersion=2; delete legacy.world.physics;
  expect(await importCheckpoint(level,JSON.stringify(legacy))).toEqual(complete);
  const fall=atTick(13);
  for (const version of [1,2]) {
    const legacy=JSON.parse(await exportCheckpoint(fall.level,fall.world));
    legacy.version=version; legacy.world.schemaVersion=version; delete legacy.world.physics;
    if (version===1) delete legacy.world.mission;
    await expect(importCheckpoint(fall.level,JSON.stringify(legacy))).rejects.toThrow('cannot supply dry-fall history');
  }
});

test('original editor maps never inherit the authored drill profile from an id', async () => {
  const level=createFallDemo(); level.source={kind:'editor-map',sha256:'a'.repeat(64),revision:'unverified-editor'};
  const world=createWorld(level);
  expect(world.physics).toEqual({mode:'static'});
  expect(stepWorld(level,world,forward).events.every(e=>e.kind==='blocked')).toBe(true);
  expect(await importCheckpoint(level,await exportCheckpoint(level,world))).toEqual(world);
});
