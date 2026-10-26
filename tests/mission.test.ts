import { describe, expect, it } from 'vitest';
import { cellIndex, type LevelData, type MissionRules, type PlayerCommand, type WorldState } from '../src/contracts';
import { createDemoLevel, createExtractionDemo } from '../src/demo';
import { createWorld, stepWorld } from '../src/sim/world';
import { isExitBlock, sourceClockAtTick } from '../src/sim/mission';
import { TRAINING_43_SHA256 } from '../src/sim/mission-profile';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';

function exitFixture(): LevelData {
  const level = createExtractionDemo();
  for (const p of level.starts) level.layers[0][cellIndex(level,{...p,y:p.y-1})] = (3<<11)|2;
  return level;
}
const forward = (mercenaryId: number): PlayerCommand => ({mercenaryId,action:'forward'});
function run(level: LevelData, world: WorldState, ticks: number): WorldState {
  for (let i = 0; i < ticks; i++) world = stepWorld(level,world,[]).world;
  return world;
}

describe('bounded extraction missions', () => {
  it('enables only revision-profile rules and retains explicit navigation mode', () => {
    const navigation = createWorld(createDemoLevel());
    expect(navigation.schemaVersion).toBe(3);
    expect(navigation.mission).toEqual({rules:{mode:'navigation',timeLimit:null},outcome:'active',exited:[false,false,false,false],clock:null,winner:null});
    const synthetic = createExtractionDemo();
    expect(createWorld(synthetic).mission.clock).toEqual({tens:0,units:2,subticks:600});
    expect(createWorld(synthetic,1,{mode:'navigation',timeLimit:null}).mission.rules.mode).toBe('navigation');
    for (const rules of [{mode:'cooperative-extraction',timeLimit:99},{mode:'navigation',timeLimit:2},{mode:'unknown',timeLimit:2}]) expect(() => createWorld(synthetic,1,rules as MissionRules)).toThrow();
    expect(() => createWorld(createDemoLevel(),1,{mode:'first-exit',timeLimit:2})).toThrow();
    const annotated = createDemoLevel(); annotated.source = {kind:'editor-map',revision:'unverified-editor',sha256:TRAINING_43_SHA256};
    expect(createWorld(annotated).mission.clock).toEqual({tens:9,units:9,subticks:600});
    annotated.source.sha256 = '0'.repeat(64);
    expect(() => createWorld(annotated,1,{mode:'first-exit',timeLimit:99})).toThrow();
  });

  it('preserves source 601-counter period and decimal borrow with independent boundary expectations', () => {
    expect(sourceClockAtTick(2,0)).toEqual({tens:0,units:2,subticks:600});
    expect(sourceClockAtTick(2,1)).toEqual({tens:0,units:2,subticks:599});
    expect(sourceClockAtTick(2,600)).toEqual({tens:0,units:2,subticks:0});
    expect(sourceClockAtTick(2,601)).toEqual({tens:0,units:1,subticks:600});
    expect(sourceClockAtTick(2,1201)).toEqual({tens:0,units:1,subticks:0});
    expect(sourceClockAtTick(2,1202)).toEqual({tens:0,units:0,subticks:600});
    expect(sourceClockAtTick(99,6010)).toEqual({tens:8,units:9,subticks:600});
    expect(sourceClockAtTick(99,59498)).toEqual({tens:0,units:1,subticks:0});
    expect(sourceClockAtTick(99,59499)).toEqual({tens:0,units:0,subticks:600});
    const level = createExtractionDemo();
    expect(run(level,createWorld(level),601).mission.clock).toEqual({tens:0,units:1,subticks:600});
  });

  it('exits through block type 3 independent of header coordinates without entering the block', () => {
    const level = exitFixture(); const world = createWorld(level);
    level.exit = {...level.starts[3]}; // Header is not the bump destination.
    expect(isExitBlock(level,{...level.starts[0],y:7})).toBe(true);
    const result = stepWorld(level,world,[forward(0)]);
    expect(result.world.mercenaries[0]).toEqual(world.mercenaries[0]);
    expect(result.world.mission.exited).toEqual([true,false,false,false]);
    expect(result.events).toEqual([{tick:1,mercenaryId:0,kind:'exited'}]);
    const again = stepWorld(level,result.world,[{mercenaryId:0,action:'turn-right'},forward(1)]);
    expect(again.world.mercenaries[0]).toEqual(world.mercenaries[0]);
    expect(again.events.map(e=>e.mercenaryId)).toEqual([1]);
    const nav = createWorld(level,1,{mode:'navigation',timeLimit:null});
    expect(stepWorld(level,nav,[forward(0)]).events[0]).toMatchObject({kind:'blocked',reason:'block'});
    level.layers[0][cellIndex(level,{...level.starts[2],y:7})] = 3<<11; // no block_here
    expect(isExitBlock(level,{...level.starts[2],y:7})).toBe(false);
    expect(stepWorld(level,world,[forward(2)]).world.mission.exited[2]).toBe(false);
  });

  it('releases a retired approach cell on the following tick and ignores retired occupancy', () => {
    const level = exitFixture(); const world = createWorld(level);
    world.mercenaries[1] = {...world.mercenaries[0],id:1,y:9};
    const sameTick = stepWorld(level,world,[forward(1),forward(0)]);
    expect(sameTick.events.map(e=>e.kind)).toEqual(['exited','blocked']);
    expect(sameTick.events[1]!.reason).toBe('occupied');
    const nextTick = stepWorld(level,sameTick.world,[forward(1)]);
    expect(nextTick.events[0]!.kind).toBe('moved');
    expect(nextTick.world.mercenaries[1].y).toBe(8);
    const secondExit = stepWorld(level,nextTick.world,[forward(1)]);
    expect(secondExit.world.mission.exited.slice(0,2)).toEqual([true,true]);
    expect(secondExit.world.mercenaries[0].y).toBe(secondExit.world.mercenaries[1].y);
  });

  it('requires all four cooperative exits, freezes terminal state and retries from fresh state', () => {
    const level = exitFixture(); const original = createWorld(level);
    const partial = stepWorld(level,original,[forward(0),forward(1),forward(2)]);
    expect(partial.world.mission.outcome).toBe('active');
    const complete = stepWorld(level,partial.world,[forward(3)]);
    expect(complete.world.mission.outcome).toBe('complete'); expect(complete.world.mission.winner).toBeNull();
    expect(complete.events).toEqual([{tick:2,mercenaryId:3,kind:'exited'},{tick:2,mercenaryId:3,kind:'complete'}]);
    expect(stepWorld(level,complete.world,[forward(0)])).toEqual({world:complete.world,events:[]});
    expect(createWorld(level)).toEqual(original);
    expect(original.mission.exited).toEqual([false,false,false,false]);
  });

  it('processes simultaneous first-exit commands in stable ID order and chooses the lowest exited ID', () => {
    const level = exitFixture(); const world = createWorld(level,1,{mode:'first-exit',timeLimit:2});
    const commands = [forward(3),forward(1),{mercenaryId:2,action:'turn-right'} as PlayerCommand];
    const a = stepWorld(level,world,commands); const b = stepWorld(level,world,[...commands].reverse());
    expect(a).toEqual(b); expect(a.world.mission.exited).toEqual([false,true,false,true]);
    expect(a.world.mission.winner).toBe(1); expect(a.world.mercenaries[2].facing).toBe(1);
    expect(a.events.at(-1)).toEqual({tick:1,mercenaryId:1,kind:'complete'});
  });

  it('gives timer expiry priority over last-moment cooperative or first exits and freezes failure', () => {
    const level = exitFixture();
    for (const mode of ['cooperative-extraction','first-exit'] as const) {
      const deadline = run(level,createWorld(level,1,{mode,timeLimit:2}),1201);
      const result = stepWorld(level,deadline,[forward(0),forward(1),forward(2),forward(3)]);
      expect(result.world.tick).toBe(1202); expect(result.world.mission.outcome).toBe('failed');
      expect(result.world.mission.exited).toEqual([true,true,true,true]); expect(result.world.mission.winner).toBeNull();
      expect(result.events.at(-1)).toEqual({tick:1202,mercenaryId:0,kind:'failed',reason:'time expired'});
      expect(result.events.some(e=>e.kind==='complete')).toBe(false);
      expect(stepWorld(level,result.world,[])).toEqual({world:result.world,events:[]});
    }
    const before = run(level,createWorld(level),1200);
    expect(stepWorld(level,before,[forward(0),forward(1),forward(2),forward(3)]).world.mission.outcome).toBe('complete');
  });

  it('preserves mission state, retired overlaps and deterministic continuation in v3 saves', async () => {
    const level = exitFixture(); let world = createWorld(level);
    world.mercenaries[1] = {...world.mercenaries[0],id:1,y:9};
    world = stepWorld(level,world,[forward(0)]).world;
    world = stepWorld(level,world,[forward(1)]).world;
    const loaded = await importCheckpoint(level,await exportCheckpoint(level,world));
    expect(loaded).toEqual(world);
    expect(stepWorld(level,loaded,[forward(1)])).toEqual(stepWorld(level,world,[forward(1)]));
    const terminal = stepWorld(level,loaded,[forward(1),forward(2),forward(3)]).world;
    expect(terminal.mission.outcome).toBe('complete');
    const saved = await importCheckpoint(level,await exportCheckpoint(level,terminal));
    expect(stepWorld(level,saved,[forward(2)])).toEqual({world:terminal,events:[]});
    const failed = run(level,createWorld(level),1202);
    expect(await importCheckpoint(level,await exportCheckpoint(level,failed))).toEqual(failed);
  });
});
