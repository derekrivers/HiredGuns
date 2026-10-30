import { advanceGateTrainingSession, createGateTrainingSession, equipTrainingSession, exchangeTrainingSession, returnTrainingSession, resetTrainingInventory, activateTrainingGround } from '../src/sim/training-session';
import { createTrainingGateLevel, gateHistory } from '../src/world/training-gate';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { importEditorMap } from '../src/import/editor-map';
import { ITEM_FILE_BYTES } from '../src/import/items';
import { initializeOriginalTeam } from '../src/import/original-team';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';
import { createWorld, stepWorld } from '../src/sim/world';
import { createTrainingSession, exportTrainingSession, importTrainingSession, isTrainingSessionSave, MAX_SESSION_BYTES } from '../src/sim/training-session';
import { characterFixture } from './helpers/character-fixture';
import { createSelectedFallLevel } from '../src/sim/fall';
import { nextFallDamage, damageFitness } from '../src/sim/health';

const sources = () => ({ roster: characterFixture(), items: new Uint8Array(ITEM_FILE_BYTES) });
const order = [11, 3, 0, 5];
const privateInputs = !!(process.env.HIRED_GUNS_TRAINING_MAP && process.env.HIRED_GUNS_CHARACTERS && process.env.HIRED_GUNS_ITEMS);

it.skipIf(!privateInputs)('selected practice binds real stats/current weight, landing, incapacitation and atomic v7 recovery', async () => {
  const {sources,level:original} = await local(), level = createSelectedFallLevel();
  const initial = await createTrainingSession(level,sources,order);
  let world = stepWorld(level,initial.world,[0,1,2,3].map(mercenaryId=>({mercenaryId,action:'forward'}))).world;
  while(world.tick<13) world=stepWorld(level,world,[]).world;
  if(world.physics.mode!=='dry-fall') throw new Error('expected fall');
  for(const [i,actor] of initial.session.team.actors.entries()) {
    expect(world.physics.actors[i]).toMatchObject({physique:actor.stats.physique,agility:actor.stats.agility,weight:initial.session.inventory.actors[i]!.weight.totalWeight});
  }
  const saved = await exportTrainingSession(level,world,initial.session,sources), envelope=JSON.parse(saved);
  expect(envelope.version).toBe(7); expect(envelope.sources.map).toBe('authored:selected-dry-fall-v1');
  expect((await importTrainingSession(level,sources,saved)).world).toEqual(world);
  const { equipTrainingSession, exchangeTrainingSession, returnTrainingSession } = await import('../src/sim/training-session');
  let changed=await equipTrainingSession(level,sources,initial.session,0,0,true,world);
  changed=await exchangeTrainingSession(level,sources,changed.session,0,0,true,changed.world);
  changed=await returnTrainingSession(level,sources,changed.session,0,0,true,changed.world);
  expect(changed.world).toEqual(world);
  expect(changed.session.inventory.actors[0]!.weight.totalWeight).toBe(initial.session.inventory.actors[0]!.weight.totalWeight);
  expect((await importTrainingSession(level,sources,await exportTrainingSession(level,changed.world,changed.session,sources))).session).toEqual(changed.session);
  await expect(importTrainingSession(level,{...sources,items:new Uint8Array(sources.items.length)},saved)).rejects.toThrow();
  await expect(importTrainingSession(original,sources,saved)).rejects.toThrow('scenario mismatch');
  const originalWorld=structuredClone(world);
  const pending=exportTrainingSession(level,world,initial.session,sources); world.rng=123;
  expect((await importTrainingSession(level,sources,await pending)).world).toEqual(originalWorld);
  world=originalWorld;
  while(world.tick<49) world=stepWorld(level,world,[]).world;
  if(world.physics.mode!=='dry-fall') throw new Error('expected fall');
  for(const [i,actor] of world.physics.actors.entries()) {
    const source=initial.world.physics; if(source.mode!=='dry-fall') throw new Error('expected profile');
    let hit=0; for(let n=0;n<level.starts[i]!.z-1;n++) hit=nextFallDamage(hit,source.actors[i]!);
    expect(actor.fitness).toBe(damageFitness(65535,actor.physique,hit).fitness);
  }
  expect(world.physics.actors[3].dead).toBe(true);
  const dead=stepWorld(level,world,[{mercenaryId:3,action:'turn-right'}]).world;
  expect(dead.mercenaries[3]).toEqual(world.mercenaries[3]);
  const snapshot=structuredClone({world,session:initial.session});
  for(const mutate of [
    (e: typeof envelope)=>{e.scenario='unknown';},
    (e: typeof envelope)=>{e.sources.roster.sha256='0'.repeat(64);},
    (e: typeof envelope)=>{const state=JSON.parse(e.checkpoint);state.world.physics.actors[0].weight++;e.checkpoint=JSON.stringify(state);},
    (e: typeof envelope)=>{e.extra=true;},
  ]) { const bad=structuredClone(envelope);mutate(bad);await expect(importTrainingSession(level,sources,JSON.stringify(bad))).rejects.toThrow(); }
  expect({world,session:initial.session}).toEqual(snapshot);
});
async function local() {
  const [map, roster, items] = await Promise.all([process.env.HIRED_GUNS_TRAINING_MAP!, process.env.HIRED_GUNS_CHARACTERS!, process.env.HIRED_GUNS_ITEMS!].map(async p => new Uint8Array(await readFile(p))));
  return { level: (await importEditorMap(map!)).level, sources: { roster: roster!, items: items! } };
}

describe('standalone Training43 session refusals without forged source authority', () => {
  it('rejects authored maps without changing inputs or their navigation world', async () => {
    const level = createDemoLevel(), world = createWorld(level), inputs = sources();
    const before = structuredClone({ level, world, inputs, order });
    await expect(createTrainingSession(level, inputs, order)).rejects.toThrow('verified local Training43');
    await expect(createTrainingSession(createSelectedFallLevel(), inputs, order)).rejects.toThrow();
    expect({ level, world, inputs, order }).toEqual(before);
  });
  it('rejects malformed, extended and oversized envelopes before any installation', async () => {
    const level = createDemoLevel(), inputs = sources(), before = structuredClone({ level, inputs });
    for (const json of ['null', '[]', '{}', '{', ' '.repeat(MAX_SESSION_BYTES), JSON.stringify({ format: 'hired-guns-training-session', version: 1, sources: {}, indices: order, checkpoint: '{}', actors: [] })]) {
      await expect(importTrainingSession(level, inputs, json)).rejects.toThrow();
    }
    expect({ level, inputs }).toEqual(before);
  });
  it('retains existing checkpoint flow without a selected-team session', async () => {
    const level = createDemoLevel();
    const world = stepWorld(level, createWorld(level), [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const json = await exportCheckpoint(level, world);
    expect(isTrainingSessionSave(json)).toBe(false);
    expect(isTrainingSessionSave('{')).toBe(false);
    expect(await importCheckpoint(level, json)).toEqual(world);
    expect(isTrainingSessionSave(JSON.stringify({ format: 'hired-guns-training-session' }))).toBe(true);
  });
});

describe.skipIf(!privateInputs)('opt-in exact local Training43 / OCS session (never in public CI)', () => {
  it('owns a detached immutable initial team in explicit order and a static mission world', async () => {
    const { level, sources } = await local();
    const expected = await initializeOriginalTeam(sources.roster, sources.items, order);
    const indices = [...order];
    const pending = createTrainingSession(level, sources, indices);
    indices.reverse(); sources.roster.fill(0); sources.items.fill(0);
    const result = await pending;
    expect(result.session.indices).toEqual(order); expect(result.session.team).toEqual(expected);
    expect(result.world.tick).toBe(0); expect(result.world.physics).toEqual({ mode: 'static' });
    expect(result.world.mission.rules.mode).toBe('cooperative-extraction');
    expect(result.session.names.every(Boolean)).toBe(true);
    expect(Object.isFrozen(result.session.team.actors[0]!.inventory.carried[0])).toBe(true);
    expect(() => { result.session.team.actors[0]!.stats.fitness = 0; }).toThrow();
  });
  it('round trips world pose, mission, tick and RNG using reconstructed initial actors only', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const world = stepWorld(level, initial.world, [{ mercenaryId: 0, action: 'turn-right' }]).world;
    const json = await exportTrainingSession(level, world, initial.session, sources);
    const envelope = JSON.parse(json);
    expect(envelope.version).toBe(5); expect(envelope.commands).toEqual([]);
    expect(Object.keys(envelope).sort()).toEqual(['checkpoint', 'commands', 'format', 'indices', 'sources', 'version']);
    expect(JSON.parse(envelope.checkpoint).version).toBe(3);
    expect(envelope).not.toHaveProperty('team');
    const restored = await importTrainingSession(level, sources, json);
    expect(restored.world).toEqual(world); expect(restored.session).toEqual(initial.session);
    expect(restored.session.team).not.toBe(initial.session.team);
    expect(restored.session.team.actors[0]!.stats.fitness).toBe(65535);
  });
  it('rejects changed/missing sources, invalid choices and tampered wrapper/checkpoint atomically', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const json = await exportTrainingSession(level, initial.world, initial.session, sources);
    const before = structuredClone(initial), envelope = JSON.parse(json);
    const changes = [
      (e: typeof envelope) => { e.indices = [0, 0, 1, 2]; },
      (e: typeof envelope) => { e.indices = [0, 1, 2, 12]; },
      (e: typeof envelope) => { e.indices = [0, 1, 2]; },
      (e: typeof envelope) => { e.indices = [0, 1, 2, '3']; },
      (e: typeof envelope) => { e.sources.roster.sha256 = '0'.repeat(64); },
      (e: typeof envelope) => { e.sources.items.revision = 'unverified'; },
      (e: typeof envelope) => { e.sources.map = '0'.repeat(64); },
      (e: typeof envelope) => { e.sources.items.extra = true; },
      (e: typeof envelope) => { const c = JSON.parse(e.checkpoint); c.world.mercenaries[1] = c.world.mercenaries[0]; e.checkpoint = JSON.stringify(c); },
      (e: typeof envelope) => { const c = JSON.parse(e.checkpoint); c.world.mission.clock.subticks = -1; e.checkpoint = JSON.stringify(c); },
      (e: typeof envelope) => { const c = JSON.parse(e.checkpoint); c.levelHash = '0'.repeat(64); e.checkpoint = JSON.stringify(c); },
    ];
    for (const change of changes) {
      const e = structuredClone(envelope); change(e);
      await expect(importTrainingSession(level, sources, JSON.stringify(e))).rejects.toThrow();
      expect(initial).toEqual(before);
    }
    const changed = { roster: sources.roster.slice(), items: sources.items.slice() }; changed.items[0] = changed.items[0]! ^ 1;
    await expect(importTrainingSession(level, changed, json)).rejects.toThrow('exact verified OCS');
    await expect(importTrainingSession(level, { ...sources, roster: new Uint8Array() }, json)).rejects.toThrow();
    const changedLevel = structuredClone(level); changedLevel.name += ' changed';
    await expect(importTrainingSession(changedLevel, sources, json)).rejects.toThrow('content mismatch');
    await expect(importTrainingSession(createDemoLevel(), sources, json)).rejects.toThrow('verified local Training43');
    expect(initial).toEqual(before);
  });
  it('snapshots restore sources before hashing and never aliases the saved world', async () => {
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const json = await exportTrainingSession(level, initial.world, initial.session, sources);
    const pending = importTrainingSession(level, sources, json);
    sources.roster.fill(0); sources.items.fill(0); level.name += ' changed';
    const restored = await pending;
    expect(restored.session).toEqual(initial.session); expect(restored.world).toEqual(initial.world);
    restored.world.mercenaries[0].facing = ((restored.world.mercenaries[0].facing + 1) % 4) as 0 | 1 | 2 | 3;
    expect(restored.world).not.toEqual(initial.world);
  });
});

// Complete encounter snapshots are authored state, independent of source inventory replay.
describe.skipIf(!privateInputs)('opt-in source-bound encounter session recovery', () => {
  it('round trips encounter with interleaved inventory and resets legacy v1-v5 to inactive', async () => {
    const { createTrainingEncounter, fireTrainingEncounter, targetTrainingEncounter, tickTrainingEncounter } = await import('../src/combat/training-encounter');
    const { equipTrainingSession, resetTrainingInventory } = await import('../src/sim/training-session');
    const { level, sources } = await local();
    const initial = await createTrainingSession(level, sources, order);
    const encounter = tickTrainingEncounter(fireTrainingEncounter(targetTrainingEncounter(createTrainingEncounter(initial.session.encounterGun, order, 2, 'partial')), initial.session.encounterGun));
    const active = { ...initial.session, encounter };
    const equipped = await equipTrainingSession(level, sources, active, 0, 0, true, initial.world);
    expect(equipped.session.encounter).toEqual(encounter);
    const json = await exportTrainingSession(level, initial.world, equipped.session, sources);
    expect(JSON.parse(json).version).toBe(6);
    const restored = await importTrainingSession(level, sources, json);
    expect(restored.session).toEqual(equipped.session); expect(restored.world).toEqual(initial.world);
    const reset = resetTrainingInventory(restored.session);
    expect(reset.encounter).toEqual(createTrainingEncounter(initial.session.encounterGun, order, 2, 'partial', 'miss'));
    expect(reset.inventory).toEqual(initial.session.inventory);
    for (const version of [1, 2, 3, 4, 5]) {
      const legacy = JSON.parse(await exportTrainingSession(level, initial.world, initial.session, sources));
      legacy.version = version; if (version === 1) delete legacy.commands;
      expect((await importTrainingSession(level, sources, JSON.stringify(legacy))).session.encounter).toBeNull();
    }
    const envelope = JSON.parse(json);
    for (const change of [
      (e: typeof envelope) => { delete e.encounter.baseline; },
      (e: typeof envelope) => { e.encounter.canonicalIndex = 5; },
      (e: typeof envelope) => { e.encounter.baseline.equipped.ammo++; },
      (e: typeof envelope) => { e.encounter.equipped.rawHex = '1900ff00'; },
      (e: typeof envelope) => { e.encounter.gun = initial.session.encounterGun; },
    ]) {
      const value = structuredClone(envelope); change(value);
      await expect(importTrainingSession(level, sources, JSON.stringify(value))).rejects.toThrow();
      expect(active.encounter).toEqual(encounter);
    }
  });
});

// v8 ground inventory is rebuilt from verified initial ownership plus one ordered history.
it.skipIf(!privateInputs)('ground v8 interleaves commands, rejects tampering, resets and snapshots complete candidates', async () => {
  const {activateTrainingGround,transferTrainingGround,equipTrainingSession,exchangeTrainingSession,returnTrainingSession,resetTrainingInventory,recordTrainingGroundStep}=await import('../src/sim/training-session');
  const {level,sources}=await local(), initial=await createTrainingSession(level,sources,order);
  let current=await activateTrainingGround(level,sources,initial.session,initial.world,true);
  const baseline=structuredClone(current), slots=current.session.ground!.slots;
  const pickup=(id:string,kind:'pickup-equipment'|'pickup-carried'|'drop-equipment')=>transferTrainingGround(level,sources,current.session,current.world,0,id,0,{version:1,kind},true);
  current=await pickup(slots[0]!.id,'pickup-equipment');current=await pickup(slots[1]!.id,'pickup-equipment');
  current=await exchangeTrainingSession(level,sources,current.session,0,0,true,current.world);
  current=await returnTrainingSession(level,sources,current.session,0,0,true,current.world);
  current=await equipTrainingSession(level,sources,current.session,0,0,true,current.world);
  current=await pickup(slots[0]!.id,'drop-equipment');
  const commands=[{mercenaryId:0,action:'turn-right' as const}], next=stepWorld(level,current.world,commands).world;
  current={session:recordTrainingGroundStep(current.session,current.world,next,commands),world:next};
  const json=await exportTrainingSession(level,current.world,current.session,sources), envelope=JSON.parse(json);
  expect(envelope.version).toBe(8);expect(envelope).not.toHaveProperty('commands');expect(envelope.ground).not.toHaveProperty('slots');
  expect(await importTrainingSession(level,sources,json)).toEqual(current);
  for(const mutate of [
    (e:typeof envelope)=>{e.ground.fixture='unknown';},(e:typeof envelope)=>{e.ground.history[0].actor=1;},
    (e:typeof envelope)=>{e.ground.history[0].groundId='cache-99-99';},(e:typeof envelope)=>{e.ground.history[0].transfer.extra=1;},
    (e:typeof envelope)=>{const c=JSON.parse(e.checkpoint);c.world.mercenaries[0].facing=(c.world.mercenaries[0].facing+1)%4;e.checkpoint=JSON.stringify(c);},
    (e:typeof envelope)=>{e.ground.history=Array(129).fill(e.ground.history[0]);},(e:typeof envelope)=>{e.sources.items.sha256='0'.repeat(64);}
  ]){const bad=structuredClone(envelope);mutate(bad);await expect(importTrainingSession(level,sources,JSON.stringify(bad))).rejects.toThrow();}
  expect(resetTrainingInventory(current.session,level).inventory).toEqual(baseline.session.inventory);
  expect(resetTrainingInventory(current.session,level).ground).toEqual(baseline.session.ground);
  const fall=await createTrainingSession(createSelectedFallLevel(),sources,order);
  await expect(activateTrainingGround(createSelectedFallLevel(),sources,fall.session,fall.world,true)).rejects.toThrow('static');
  const snapshot=structuredClone(current), pending=importTrainingSession(level,sources,json);sources.items.fill(0);level.name+=' changed';
  expect(await pending).toEqual(snapshot);
});

it.skipIf(!privateInputs)('gate v9 authenticates canonical fixture, current words, chronological movement/items and complete checkpoint; legacy wrappers stay isolated',async()=>{
  const {sources,level}=await local(), original=await createTrainingSession(level,sources,order), map=createTrainingGateLevel();
  let candidate=await createGateTrainingSession(sources,original.session,level);
  const closed=await exportTrainingSession(map,candidate.world,candidate.session,sources);
  expect(JSON.parse(closed).version).toBe(9);
  candidate=advanceGateTrainingSession(map,candidate.session,candidate.world,[],0);
  candidate=advanceGateTrainingSession(map,candidate.session,candidate.world,[{mercenaryId:0,action:'strafe-right'}],null);
  candidate=advanceGateTrainingSession(map,candidate.session,candidate.world,[{mercenaryId:0,action:'forward'}],null);
  candidate=await equipTrainingSession(map,sources,candidate.session,0,0,true,candidate.world);
  candidate=await exchangeTrainingSession(map,sources,candidate.session,0,0,true,candidate.world);
  candidate=await returnTrainingSession(map,sources,candidate.session,0,0,true,candidate.world);
  const saved=await exportTrainingSession(map,candidate.world,candidate.session,sources), e=JSON.parse(saved), before=structuredClone(candidate);
  expect((await importTrainingSession(map,sources,saved))).toEqual(candidate);
  expect((await importTrainingSession(map,sources,closed)).session.gate?.overlay.word).toBe(0x80000043);
  expect(resetTrainingInventory(candidate.session,map).gate?.history).toEqual([]);
  type SavedGateEnvelope = typeof e;
  for(const mutate of [
    (e:SavedGateEnvelope)=>{e.gate.fixture='forged';},
    (e:SavedGateEnvelope)=>{e.gate.panelWord++;},
    (e:SavedGateEnvelope)=>{e.gate.overlay.word++;},
    (e:SavedGateEnvelope)=>{e.gate.overlay.nextPlaneDiscoveryWord=32;},
    (e:SavedGateEnvelope)=>{e.gate.overlay.targetIndex++;},
    (e:SavedGateEnvelope)=>{e.gate.history[0].actor=2;},
    (e:SavedGateEnvelope)=>{e.gate.history=Array(129).fill({kind:'wait',ticks:1});},
    (e:SavedGateEnvelope)=>{e.gate.history=[{kind:'wait',ticks:45000},{kind:'wait',ticks:1}];},
    (e:SavedGateEnvelope)=>{e.commands=[];},
    (e:SavedGateEnvelope)=>{e.sources.items.sha256='0'.repeat(64);},
    (e:SavedGateEnvelope)=>{e.scenario='bad';},
    (e:SavedGateEnvelope)=>{const c=JSON.parse(e.checkpoint);c.world.mercenaries[0].x=7;e.checkpoint=JSON.stringify(c);},
    (e:SavedGateEnvelope)=>{e.checkpoint=' '.repeat(16384);},
    (e:SavedGateEnvelope)=>{e.gate.extra=0;},
  ]) {const bad=structuredClone(e);mutate(bad);await expect(importTrainingSession(map,sources,JSON.stringify(bad))).rejects.toThrow();}
  expect(candidate).toEqual(before);
  const altered=structuredClone(map);altered.layers[0][1]=0;
  await expect(importTrainingSession(altered,sources,saved)).rejects.toThrow('geometry mismatch');
  await expect(importTrainingSession(level,sources,saved)).rejects.toThrow('scenario mismatch');
  await expect(importTrainingSession(map,sources,await exportTrainingSession(level,original.world,original.session,sources))).rejects.toThrow('scenario mismatch');
  await expect(activateTrainingGround(map,sources,original.session,createWorld(map),true)).rejects.toThrow();
  await expect(createGateTrainingSession(sources,{...original.session,ground:{} as never},level)).rejects.toThrow('fresh Apply');
  await expect(createGateTrainingSession(sources,original.session,createSelectedFallLevel())).rejects.toThrow('fresh Apply');
  expect(()=>gateHistory([{kind:'activate',actor:0,commands:[],bogus:0}])).toThrow();
});
it.skipIf(!privateInputs)('gate snapshots sources/world/envelope before asynchronous verification and rejects forged source bytes',async()=>{
  const {sources,level}=await local(), initial=await createTrainingSession(level,sources,order), map=createTrainingGateLevel();
  const gate=await createGateTrainingSession(sources,initial.session,level), original=structuredClone(gate.world);
  const raw={roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)};
  const pending=exportTrainingSession(map,gate.world,gate.session,raw);raw.roster.fill(0);gate.world.rng=123;
  const saved=await pending;expect((await importTrainingSession(map,sources,saved)).world).toEqual(original);
  await expect(importTrainingSession(map,raw,saved)).rejects.toThrow();
  const saving=JSON.parse(saved);saving.gate.history=Array(129).fill({kind:'wait',ticks:1});
  await expect(importTrainingSession(map,sources,JSON.stringify(saving))).rejects.toThrow();
});

it.skipIf(!privateInputs)('patrol export retains caller geometry, sources, history and world through canonical restore',async()=>{
  const {createPatrolTrainingSession}=await import('../src/sim/training-session');
  const {sources}=await local(), map=createTrainingGateLevel();
  const base=await createTrainingSession(map,sources,order);
  const c=await createPatrolTrainingSession(map,sources,base.session,base.world,true);
  const caller=structuredClone(c), raw=structuredClone(sources);
  const pending=exportTrainingSession(map,caller.world,caller.session,raw);
  map.name+=' changed after call';map.layers[0][0] = 0;
  raw.roster.fill(0);raw.items.fill(0);caller.world.rng++;
  (caller.session.indices as number[])[0]=1;caller.session.patrol!.history.push({kind:'target'});
  const saved=await pending;
  expect(await importTrainingSession(createTrainingGateLevel(),sources,saved)).toEqual(c);
  await expect(importTrainingSession(createTrainingGateLevel(),raw,saved)).rejects.toThrow();
});

it.skipIf(!privateInputs).each([
  ['equip',equipTrainingSession],['exchange',exchangeTrainingSession],['return',returnTrainingSession]
] as const)('patrol %s owns sources, geometry, indices, history and world before awaiting',async(kind,change)=>{
  const {createPatrolTrainingSession}=await import('../src/sim/training-session');
  const {sources}=await local(), map=createTrainingGateLevel();
  const base=await createTrainingSession(map,sources,order);
  let c=await createPatrolTrainingSession(map,sources,base.session,base.world,true);
  if(kind!=='equip')c=await equipTrainingSession(map,sources,c.session,0,0,true,c.world);
  const expected=await change(map,sources,c.session,0,0,true,c.world);
  const caller=structuredClone(c), raw=structuredClone(sources);
  const pending=change(map,raw,caller.session,0,0,true,caller.world);
  raw.items.fill(0);raw.roster.fill(0);map.name+=' changed after call';map.layers[0][0] = 0;
  (caller.session.indices as number[]).reverse();caller.session.patrol!.history.push({kind:'target'});
  caller.world.rng++;caller.session.inventory.commands.length=0;
  // Any late read of the caller's source/indices would execute these accessors.
  let reads=0;
  Object.defineProperty(raw,'items',{get(){reads++;throw new Error('late source read');}});
  Object.defineProperty(caller.session,'indices',{get(){reads++;throw new Error('late indices read');}});
  const result=await pending;
  expect(reads).toBe(0);expect(result).toEqual(expected);
  expect(await importTrainingSession(createTrainingGateLevel(),sources,await exportTrainingSession(createTrainingGateLevel(),result.world,result.session,sources))).toEqual(expected);
  const wrong={...sources,items:new Uint8Array(sources.items.length)};
  await expect(change(createTrainingGateLevel(),wrong,c.session,0,0,true,c.world)).rejects.toThrow();
});

it.skipIf(!privateInputs)('patrol v10 replays source-bound chronological gate, NPC, full encounter, inventory and checkpoint receipts atomically',async()=>{
  const {createPatrolTrainingSession,commandPatrolEncounter}=await import('../src/sim/training-session');
  const {patrolPosition}=await import('../src/world/training-patrol');
  const {sources,level}=await local(), map=createTrainingGateLevel();
  const original=await createTrainingSession(level,sources,order), gate=await createGateTrainingSession(sources,original.session,level);
  let c=await createPatrolTrainingSession(map,sources,gate.session,gate.world,true);
  const baseline=structuredClone(c), closed=await exportTrainingSession(map,c.world,c.session,sources);
  expect(JSON.parse(closed).version).toBe(10);expect(await importTrainingSession(map,sources,closed)).toEqual(c);
  for(let i=0;i<32;i++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);
  expect(c.session.patrol).toMatchObject({routeIndex:1,direction:-1,blocked:'gate-or-wall'});
  c=advanceGateTrainingSession(map,c.session,c.world,[],0);
  for(let i=0;i<66;i++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);
  c={...c,session:commandPatrolEncounter(map,c.session,c.world,'target',true)};
  const health=c.session.encounter!.fitness;
  c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};
  expect(c.session.encounter!.fitness).toBe(health);expect(c.session.encounter!.equipped.ammo).toBeLessThan(baseline.session.encounter!.equipped.ammo);
  for(let i=0;i<20;i++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);
  c={...c,session:commandPatrolEncounter(map,c.session,c.world,'target',true)};
  c=await equipTrainingSession(map,sources,c.session,0,0,true,c.world);
  c=await exchangeTrainingSession(map,sources,c.session,0,0,true,c.world);
  c=await returnTrainingSession(map,sources,c.session,0,0,true,c.world);
  const patrolling=await exportTrainingSession(map,c.world,c.session,sources);expect(await importTrainingSession(map,sources,patrolling)).toEqual({session:c.session,world:c.world});
  const beforeShot=c.session.encounter!, {fireTrainingEncounter}=await import('../src/combat/training-encounter');
  c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};
  expect(c.session.encounter).toEqual(fireTrainingEncounter(beforeShot,c.session.encounterGun));
  for(let attempt=0;c.session.encounter!.fitness>0 && attempt<8;attempt++) {
    for(let i=0;i<40;i++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);
    c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};
  }
  expect(c.session.encounter!.fitness).toBe(0);
  const position=patrolPosition(c.session.patrol!), counter=c.session.patrol!.counter;
  for(let i=0;i<20;i++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);
  expect(patrolPosition(c.session.patrol!)).toEqual(position);expect(c.session.patrol!.counter).toBe(counter);
  const saved=await exportTrainingSession(map,c.world,c.session,sources), e=JSON.parse(saved), snapshot=structuredClone({session:c.session,world:c.world});
  type PatrolEnvelope = typeof e;
  expect(await importTrainingSession(map,sources,saved)).toEqual(snapshot);
  expect(resetTrainingInventory(c.session,map)).toEqual(baseline.session);
  for(const mutate of [
    (e:PatrolEnvelope)=>{e.patrol.routeIndex++;},(e:PatrolEnvelope)=>{e.patrol.direction=0;},(e:PatrolEnvelope)=>{e.patrol.counter++;},
    (e:PatrolEnvelope)=>{e.patrol.fixture='bad';},(e:PatrolEnvelope)=>{e.patrol.position={x:3,y:5,z:1};},(e:PatrolEnvelope)=>{e.patrol.route=[1,2];},
    (e:PatrolEnvelope)=>{e.patrol.history=e.patrol.history.filter((v:{kind:string})=>v.kind!=='fire');},
    (e:PatrolEnvelope)=>{e.encounter.fitness++;},(e:PatrolEnvelope)=>{e.encounter.equipped.ammo++;},(e:PatrolEnvelope)=>{e.encounter.fireDuration++;},
    (e:PatrolEnvelope)=>{e.gate.overlay.word++;},(e:PatrolEnvelope)=>{e.commands=[];},(e:PatrolEnvelope)=>{e.sources.items.sha256='0'.repeat(64);},
    (e:PatrolEnvelope)=>{e.patrol.history=Array(129).fill({kind:'target'});},(e:PatrolEnvelope)=>{e.patrol.history=[{kind:'wait',ticks:45000},{kind:'wait',ticks:1}];},
    (e:PatrolEnvelope)=>{const w=JSON.parse(e.checkpoint);w.world.mercenaries[0].x++;e.checkpoint=JSON.stringify(w);},
    (e:PatrolEnvelope)=>{e.checkpoint=' '.repeat(16384);},(e:PatrolEnvelope)=>{e.version=9;},(e:PatrolEnvelope)=>{e.scenario='authored-static-gate-v1';}
  ]) {const bad=structuredClone(e);mutate(bad);await expect(importTrainingSession(map,sources,JSON.stringify(bad))).rejects.toThrow();expect({session:c.session,world:c.world}).toEqual(snapshot);}
  await expect(importTrainingSession(map,sources,' '.repeat(24576))).rejects.toThrow('24 KiB');
  const raw={roster:new Uint8Array(sources.roster),items:new Uint8Array(sources.items)}, worldSnapshot=structuredClone(c.world);
  const pending=exportTrainingSession(map,c.world,c.session,raw);raw.items.fill(0);c.world.rng=123;
  expect((await importTrainingSession(map,sources,await pending)).world).toEqual(worldSnapshot);
  await expect(importTrainingSession(map,raw,saved)).rejects.toThrow();
  await expect(createPatrolTrainingSession(map,sources,c.session,c.world,true)).rejects.toThrow('tick zero');
  await expect(createPatrolTrainingSession(map,sources,gate.session,gate.world,false)).rejects.toThrow();
});

it.skipIf(!privateInputs)('v11 source snapshots and replay bind unlocked exit, partial and terminal retirement, fixed clock, inventory and prior v10',async()=>{
 const {createPatrolMissionLevel}=await import('../src/world/training-gate');const {createPatrolMissionSession,createPatrolTrainingSession,commandPatrolEncounter}=await import('../src/sim/training-session');
 const {sources}=await local(),map=createPatrolMissionLevel(),base=await createTrainingSession(createTrainingGateLevel(),sources,order);
 const expected=await createPatrolMissionSession(sources,base.session),caller=structuredClone(base.session),raw=structuredClone(sources);
 const pending=createPatrolMissionSession(raw,caller);raw.roster.fill(0);raw.items.fill(0);(caller.indices as number[]).reverse();expect(await pending).toEqual(expected);
 let c=expected;
 const roundtrip=async()=>{const saved=await exportTrainingSession(map,c.world,c.session,sources);expect(JSON.parse(saved).version).toBe(11);expect(await importTrainingSession(map,sources,saved)).toEqual({session:c.session,world:c.world});return saved;};
 await roundtrip();c=advanceGateTrainingSession(map,c.session,c.world,[],0);await roundtrip();
 c=await equipTrainingSession(map,sources,c.session,0,0,true,c.world);
 for(let i=0;i<6&&c.session.encounter!.fitness>0;i++){c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};for(let t=0;t<40;t++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);}
 expect(c.session.encounter!.fitness).toBe(0);await roundtrip();
 const paths=[['strafe-right','forward','forward','forward','forward'],['strafe-left','backward','backward'],['forward','strafe-right','forward','strafe-right','strafe-right','strafe-right','strafe-right'],['forward','forward','strafe-right']] as const;
 for(let id=0;id<4;id++){
  for(const action of paths[id]!)c=advanceGateTrainingSession(map,c.session,c.world,[{mercenaryId:id,action}],null);
  expect(c.world.mission.exited[id]).toBe(true);await roundtrip();
 }
 expect(c.world.mission.outcome).toBe('complete');expect(resetTrainingInventory(c.session,map)).toEqual(expected.session);
 const saved=await roundtrip(),call=structuredClone(c),r=structuredClone(sources),m=structuredClone(map),snapshot=structuredClone({session:c.session,world:c.world});
 const saving=exportTrainingSession(m,call.world,call.session,r);r.items.fill(0);r.roster.fill(0);m.layers[0][0]=0;call.world.mission.exited[0]=false;call.world.mission.outcome='failed';call.world.tick++;(call.session.indices as number[]).reverse();call.session.patrol!.history.length=0;
 expect(await importTrainingSession(map,sources,await saving)).toEqual(snapshot);
 const bad=JSON.parse(saved);for(const mutate of [(s:typeof bad)=>{s.version=10;},(s:typeof bad)=>{s.scenario='fake';},(s:typeof bad)=>{s.sources.map='fake';},(s:typeof bad)=>{s.encounter.fitness=1;},(s:typeof bad)=>{s.patrol.history.push({kind:'target'});},(s:typeof bad)=>{const w=JSON.parse(s.checkpoint);w.world.mission.clock.subticks--;s.checkpoint=JSON.stringify(w);}]){const b=structuredClone(bad);mutate(b);await expect(importTrainingSession(map,sources,JSON.stringify(b))).rejects.toThrow();}
 c=expected;for(let t=0;t<6010;t++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);expect(c.world.mission.outcome).toBe('failed');expect(c.world.mission.clock).toEqual({tens:0,units:0,subticks:600});await roundtrip();
 const practice=await createPatrolTrainingSession(createTrainingGateLevel(),sources,base.session,base.world,true),v10=await exportTrainingSession(createTrainingGateLevel(),practice.world,practice.session,sources);
 expect(await importTrainingSession(map,sources,v10)).toEqual(practice);
},120000);

it.skipIf(!privateInputs).each([['equip',equipTrainingSession],['exchange',exchangeTrainingSession],['return',returnTrainingSession]] as const)('v11 %s snapshots all canonical caller inputs before awaiting',async(kind,change)=>{
 const {createPatrolMissionLevel}=await import('../src/world/training-gate');const {createPatrolMissionSession}=await import('../src/sim/training-session');const {sources}=await local(),map=createPatrolMissionLevel();const b=await createTrainingSession(map,sources,order);let c=await createPatrolMissionSession(sources,b.session);if(kind!=='equip')c=await equipTrainingSession(map,sources,c.session,0,0,true,c.world);
 const expected=await change(map,sources,c.session,0,0,true,c.world),call=structuredClone(c),raw=structuredClone(sources),m=structuredClone(map);const pending=change(m,raw,call.session,0,0,true,call.world);
 raw.roster.fill(0);raw.items.fill(0);m.layers[0][0]=0;call.world.tick++;call.world.mission.outcome='failed';call.session.patrol!.history.push({kind:'target'});(call.session.indices as number[]).reverse();let reads=0;Object.defineProperty(raw,'items',{get(){reads++;throw Error('late read');}});Object.defineProperty(call.session,'indices',{get(){reads++;throw Error('late indices');}});expect(await pending).toEqual(expected);expect(reads).toBe(0);
});

it.skipIf(!privateInputs)('v12 complete door phases, raw records, ordered history, interlock and canonical retry roundtrip; tampering is atomic',async()=>{
 const {createMovingDoorLevel}=await import('../src/world/training-gate');const {createMovingDoorSession,commandPatrolEncounter}=await import('../src/sim/training-session');
 const {sources}=await local(),map=createMovingDoorLevel();const base=await createTrainingSession(map,sources,order);let c=await createMovingDoorSession(sources,base.session);const baseline=structuredClone(c);
 const roundtrip=async()=>{const save=await exportTrainingSession(map,c.world,c.session,sources);expect(JSON.parse(save).version).toBe(12);expect(await importTrainingSession(map,sources,save)).toEqual({world:c.world,session:c.session});return save;};
 let attempts=0;
 const tick=(actor:number|null=null,action:14|15|16|17|18=16,commands:Parameters<typeof advanceGateTrainingSession>[3]=[])=>{if(++attempts>3000)throw Error('Loop stalled '+JSON.stringify({door:c.session.gate!.moving,patrol:c.session.patrol,world:c.world}));c=advanceGateTrainingSession(map,c.session,c.world,commands,actor,action);};
 await roundtrip();tick(0,14);for(let i=0;i<24;i++)tick();expect(c.session.gate!.moving!.record.direction).toBe(1);await roundtrip();
 tick(0,17);expect(c.session.gate!.moving!.record.trigger).toBe(3);await roundtrip();
 while(c.session.gate!.moving!.record.direction!==3)tick();await roundtrip();tick(0,18);while(c.session.gate!.moving!.record.direction===3)tick();await roundtrip();
 tick(0,15);while(c.session.gate!.moving!.record.direction!==2)tick();await roundtrip();
 while(c.session.gate!.moving!.record.direction!==0)tick();tick(0,14);while(c.session.gate!.overlay.word&2)tick();
 // Release the NPC using the existing designated encounter, then put player in doorway.
 for(let i=0;i<6&&c.session.encounter!.fitness>0;i++){c={...c,session:commandPatrolEncounter(map,c.session,c.world,'fire',false)};for(let t=0;t<40;t++)tick();}
 tick(null,16,[{mercenaryId:0,action:'strafe-right'}]);tick(null,16,[{mercenaryId:0,action:'forward'}]);
 expect(c.world.mercenaries[0]).toMatchObject({x:5,y:5});tick(1,15);while(!c.session.gate!.moving!.deferred)tick();await roundtrip();
 tick(null,16,[{mercenaryId:0,action:'forward'}]);expect(c.session.gate!.moving!.deferred).toBe(true);tick();expect(c.session.gate!.moving!.deferred).toBe(false);const saved=await roundtrip();
 expect(resetTrainingInventory(c.session,map)).toEqual(baseline.session);
 const envelope=JSON.parse(saved),snapshot=structuredClone(c);
 for(const mutate of [
  (e:typeof envelope)=>{e.gate.moving.record.storedType^=64;},(e:typeof envelope)=>{e.gate.moving.record.delay++;},(e:typeof envelope)=>{e.gate.moving.record.key++;},
  (e:typeof envelope)=>{e.gate.moving.record.buttonOnly=0;},(e:typeof envelope)=>{e.gate.moving.record.position+=4;},(e:typeof envelope)=>{e.gate.moving.counter++;},
  (e:typeof envelope)=>{e.gate.moving.word^=2;},(e:typeof envelope)=>{e.gate.moving.deferred=true;},(e:typeof envelope)=>{e.gate.moving.pendingAction=15;},
  (e:typeof envelope)=>{e.gate.moving.adapter='original';},(e:typeof envelope)=>{e.patrol.history[0].action=15;},(e:typeof envelope)=>{e.patrol.history=Array(129).fill({kind:'target'});},
  (e:typeof envelope)=>{e.patrol.history=[{kind:'wait',ticks:45001}];},(e:typeof envelope)=>{e.sources.map='fake';},(e:typeof envelope)=>{e.version=11;},
  (e:typeof envelope)=>{e.checkpoint=' '.repeat(16384);},(e:typeof envelope)=>{e.gate.extra=true;}
 ]){const bad=structuredClone(envelope);mutate(bad);await expect(importTrainingSession(map,sources,JSON.stringify(bad))).rejects.toThrow();expect(c).toEqual(snapshot);}
 await expect(importTrainingSession(map,{...sources,items:new Uint8Array(sources.items.length)},saved)).rejects.toThrow();
 const wrong=structuredClone(map);wrong.layers[0][0]=1;await expect(importTrainingSession(wrong,sources,saved)).rejects.toThrow('geometry');
 // Exact history budget refuses entire prospective ticks, C/actions, F and T.
 const full={...baseline.session,patrol:{...baseline.session.patrol!,history:Array.from({length:128},()=>({kind:'target' as const}))}};
 for(const action of [14,15,16,17,18] as const)expect(()=>advanceGateTrainingSession(map,full,baseline.world,[],0,action)).toThrow('history budget');
 for(const kind of ['fire','target'] as const)expect(()=>commandPatrolEncounter(map,full,baseline.world,kind,false)).toThrow('history budget');
 expect(()=>advanceGateTrainingSession(map,full,baseline.world,[],null)).toThrow('history budget');
},120000);

it.skipIf(!privateInputs).each(['save','import','setup','equip','exchange','return'] as const)('v12 %s owns every caller input before first await throughout rebuild',async(kind)=>{
 const {createMovingDoorLevel}=await import('../src/world/training-gate');const {createMovingDoorSession}=await import('../src/sim/training-session');
 const {sources}=await local(),map=createMovingDoorLevel();const base=await createTrainingSession(map,sources,order);let c=await createMovingDoorSession(sources,base.session);
 c=advanceGateTrainingSession(map,c.session,c.world,[],0,14);for(let i=0;i<14;i++)c=advanceGateTrainingSession(map,c.session,c.world,[],null);
 if(kind==='exchange'||kind==='return')c=await equipTrainingSession(map,sources,c.session,0,0,true,c.world);
 const save=await exportTrainingSession(map,c.world,c.session,sources),caller=structuredClone(c),raw=structuredClone(sources),m=structuredClone(map);
 const change=kind==='equip'?equipTrainingSession:kind==='exchange'?exchangeTrainingSession:returnTrainingSession;
 const expected=kind==='setup'?await createMovingDoorSession(sources,c.session):kind==='save'||kind==='import'?{world:c.world,session:c.session}:await change(map,sources,c.session,0,0,true,c.world);
 const pending=kind==='save'?exportTrainingSession(m,caller.world,caller.session,raw):kind==='import'?importTrainingSession(m,raw,save):kind==='setup'?createMovingDoorSession(raw,caller.session):change(m,raw,caller.session,0,0,true,caller.world);
 raw.items.fill(0);raw.roster.fill(0);m.layers[0][0]=1;caller.world.tick++;caller.world.rng++;caller.session.gate!.moving!.counter++;caller.session.patrol!.history.length=0;(caller.session.indices as number[]).reverse();
 let reads=0;Object.defineProperty(raw,'items',{get(){reads++;throw Error('late source');}});Object.defineProperty(caller.session,'indices',{get(){reads++;throw Error('late indices');}});
 const result=await pending;expect(reads).toBe(0);expect(typeof result==='string'?await importTrainingSession(map,sources,result):result).toEqual(expected);
},120000);
