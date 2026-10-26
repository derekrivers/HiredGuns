import { describe, expect, it } from 'vitest';
import { cellIndex, type Action, type Facing, type LevelData, type Position, type Spawn } from '../src/contracts';
import { obstruction, resolveTraversal } from '../src/sim/traversal';
import { createWorld, obstruction as sharedObstruction, stepWorld } from '../src/sim/world';
import { exportCheckpoint, importCheckpoint } from '../src/sim/checkpoint';

function fixture(): LevelData {
  const level: LevelData = {
    schemaVersion:1,id:'synthetic-static-traversal',name:'Dry static traversal',
    source:{kind:'synthetic',sha256:null,revision:'synthetic'},
    size:{width:9,depth:9,height:5},layers:[Array<number>(405).fill(0),Array<number>(405).fill(0),Array<number>(405).fill(0)],
    starts:[{x:1,y:7,z:1,facing:0},{x:3,y:7,z:1,facing:0},{x:5,y:7,z:1,facing:0},{x:7,y:7,z:1,facing:0}],
    exit:{x:8,y:8,z:1},unsupportedMechanics:[],
  };
  for (let y=0;y<9;y++) for (let x=0;x<9;x++) put(level,{x,y,z:0},2);
  return level;
}
function put(level: LevelData,p: Position,word: number) { level.layers[0][cellIndex(level,p)] = word >>> 0; }
function upFixture(aux = 8) {
  const level=fixture(); const from: Spawn={x:4,y:4,z:1,facing:0};
  put(level,from,((aux<<28)|32|1)>>>0);
  return {level,from};
}
const directions: {direction:Facing;aux:number;down:number;x:number;y:number;facings:[Facing,Facing,Facing,Facing]}[] = [
  {direction:0,aux:8,down:18,x:4,y:3,facings:[0,2,1,3]},
  {direction:1,aux:9,down:19,x:5,y:4,facings:[1,3,2,0]},
  {direction:2,aux:10,down:16,x:4,y:5,facings:[2,0,3,1]},
  {direction:3,aux:11,down:17,x:3,y:4,facings:[3,1,0,2]},
];
const actions: Action[]=['forward','backward','strafe-left','strafe-right'];

describe('dry static traversal', () => {
  it('ascends in all four travel directions through forward/backward/strafe commands', () => {
    for (const d of directions) for (const [i,action] of actions.entries()) {
      const {level,from}=upFixture(d.aux);
      put(level,{x:d.x,y:d.y,z:1},(16<<11)|2);
      from.facing=d.facings[i]!;
      const world=createWorld(level); world.mercenaries[0]={...from,id:0};
      const result=stepWorld(level,world,[{mercenaryId:0,action}]);
      expect(result.world.mercenaries[0]).toEqual({id:0,x:d.x,y:d.y,z:2,facing:from.facing});
      expect(result.events[0]!.kind).toBe('moved');
      expect(world.mercenaries[0]).toEqual({...from,id:0});
      expect(resolveTraversal(level,from,d.direction)).toEqual({target:{x:d.x,y:d.y,z:2},kind:'stairs-up',reason:null});
    }
  });

  it('descends in all four travel directions through forward/backward/strafe commands', () => {
    for (const d of directions) for (const [i,action] of actions.entries()) {
      const level=fixture(); const from: Spawn={x:4,y:4,z:2,facing:d.facings[i]!};
      put(level,{...from,z:1},(d.down<<11)|2);
      const world=createWorld(level); world.mercenaries[0]={...from,id:0};
      const result=stepWorld(level,world,[{mercenaryId:0,action}]);
      expect(result.world.mercenaries[0]).toEqual({id:0,x:d.x,y:d.y,z:1,facing:from.facing});
      expect(resolveTraversal(level,from,d.direction)).toEqual({target:{x:d.x,y:d.y,z:1},kind:'stairs-down',reason:null});
    }
  });

  it('checks the current overhead separately from the elevated destination, including occupancy', () => {
    const {level,from}=upFixture(); const destination={x:4,y:3,z:2}; const overhead={x:4,y:4,z:2};
    put(level,{...destination,z:1},(16<<11)|2);
    for (const word of [2,64,1]) {
      put(level,overhead,word);
      expect(resolveTraversal(level,from,0).reason).toContain('overhead');
    }
    put(level,overhead,0); put(level,destination,2);
    expect(resolveTraversal(level,from,0).reason).toBe('block');
    put(level,destination,1); // Landing floor is valid; overhead floor was not.
    expect(resolveTraversal(level,from,0).reason).toBeNull();
    expect(resolveTraversal(level,from,0,p=>p.x===4&&p.y===4&&p.z===2).reason).toBe('occupied overhead');
    expect(resolveTraversal(level,from,0,p=>p.x===4&&p.y===3&&p.z===2).reason).toBe('occupied');
    put(level,overhead,4);
    expect(resolveTraversal(level,from,0).reason).toBe('unsupported overhead environment');
  });

  it('preserves level movement over a destination floor or blocked lower cell; checks lower occupancy after descent', () => {
    const level=fixture(); const from: Spawn={x:4,y:4,z:2,facing:0};
    put(level,{...from,z:1},(18<<11)|2);
    const nominal={x:4,y:3,z:2}; const lower={...nominal,z:1};
    put(level,nominal,1);
    expect(resolveTraversal(level,from,0)).toEqual({target:nominal,kind:'level',reason:null});
    put(level,nominal,513);
    expect(resolveTraversal(level,from,0)).toMatchObject({kind:'level',reason:'unsupported environment'});
    put(level,nominal,0); put(level,lower,2);
    expect(resolveTraversal(level,from,0)).toEqual({target:nominal,kind:'level',reason:null});
    put(level,lower,0);
    expect(resolveTraversal(level,from,0,p=>p.x===4&&p.y===3&&p.z===1)).toEqual({target:lower,kind:'stairs-down',reason:'occupied'});
    put(level,lower,(32<<11)|2);
    expect(resolveTraversal(level,from,0)).toEqual({target:lower,kind:'stairs-down',reason:'block'});
    put(level,lower,4);
    expect(resolveTraversal(level,from,0)).toMatchObject({kind:'stairs-down',reason:'unsupported environment'});
  });

  it('requires exact directional stair presence and guards current/target hazards, unknown auxiliaries and pad/lift floors', () => {
    for (const word of [4,16,256,513,1025,...[0,1,2,3,4,5,6,7,12,13,14,15].map(aux=>((aux<<28)|32|1)>>>0)]) {
      const level=fixture(); const from: Spawn={x:4,y:4,z:1,facing:0};
      put(level,from,word);
      expect(resolveTraversal(level,from,0).reason).toContain('current');
      put(level,from,1); put(level,{x:4,y:3,z:1},word);
      expect(resolveTraversal(level,from,0).reason).toBe('unsupported environment');
    }
    const {level,from}=upFixture(9);
    expect(resolveTraversal(level,from,0)).toEqual({target:{x:4,y:3,z:1},kind:'level',reason:null});
    put(level,from,8<<28); // Auxiliary bits without presence do not cause ascent.
    expect(resolveTraversal(level,from,0).kind).toBe('level');
    put(level,from,(8<<28)|32|4|1); // Training43's wet stair remains unsupported.
    expect(resolveTraversal(level,from,0).reason).toContain('unsupported environment');
  });

  it('keeps the nominal upper descent cell dry without inventing upper block/occupancy restrictions', () => {
    const level=fixture();const from: Spawn={x:4,y:4,z:2,facing:0};
    put(level,{...from,z:1},(18<<11)|2);
    const upper={x:4,y:3,z:2};const lower={...upper,z:1};
    for (const word of [4,16,256,32,(12<<28)|32]) {
      put(level,upper,word);
      expect(resolveTraversal(level,from,0)).toEqual({target:lower,kind:'stairs-down',reason:'unsupported descent environment'});
    }
    put(level,upper,2);
    expect(resolveTraversal(level,from,0,p=>p.x===upper.x&&p.y===upper.y&&p.z===upper.z)).toEqual({target:lower,kind:'stairs-down',reason:null});
  });

  it('bounds current/destination and ascent on every axis without using source safety nets', () => {
    for (const [from,direction] of [
      [{x:0,y:4,z:1,facing:3},3],[{x:8,y:4,z:1,facing:1},1],
      [{x:4,y:0,z:1,facing:0},0],[{x:4,y:8,z:1,facing:2},2],
    ] as const) expect(resolveTraversal(fixture(),from,direction).reason).toBe('boundary');
    const {level,from}=upFixture(); from.z=4; put(level,from,(8<<28)|32|1);
    expect(resolveTraversal(level,from,0)).toMatchObject({target:{x:4,y:3,z:5},reason:'boundary',kind:'stairs-up'});
    expect(resolveTraversal(level,{...from,z:-1},0).reason).toBe('current boundary');
    expect(resolveTraversal(level,{...from,z:5},0).reason).toBe('current boundary');
    const atBottom={...from,z:0};put(level,atBottom,1);put(level,{x:4,y:3,z:0},1);
    expect(resolveTraversal(level,atBottom,0)).toEqual({target:{x:4,y:3,z:0},reason:null,kind:'level'});
  });

  it('supports only static stone/stair types below and block4 two levels below, with entry refusal immediately above4', () => {
    for (let type=0;type<64;type++) {
      const level=fixture(); const p={x:4,y:4,z:2};put(level,{...p,z:1},(type<<11)|2);
      expect(obstruction(level,p)===null).toBe([0,16,17,18,19].includes(type));
    }
    const level=fixture();const from: Spawn={x:3,y:4,z:3,facing:1};const top={x:4,y:4,z:3};
    put(level,from,1);put(level,{...top,z:1},(4<<11)|2);
    expect(obstruction(level,top)).toBeNull();expect(sharedObstruction).toBe(obstruction);
    expect(resolveTraversal(level,from,1)).toEqual({target:top,kind:'level',reason:null});
    const intermediate={...top,z:2}; const lowFrom={...from,z:2};put(level,lowFrom,1);
    expect(obstruction(level,intermediate)).toBe('unsupported drop');
    expect(resolveTraversal(level,lowFrom,1).reason).toBe('block4 entry');
    put(level,intermediate,1);
    expect(resolveTraversal(level,lowFrom,1).reason).toBeNull();
    put(level,intermediate,0);put(level,{...top,z:1},(4<<11)|2|256);
    expect(obstruction(level,top)).toBe('unsupported drop');
    put(level,{...intermediate,z:1},2|256);
    expect(obstruction(level,intermediate)).toBe('unsupported drop');
  });

  it('blocks active transformed destinations and retains occupied-at-start policy while ignoring retired actors', () => {
    const {level,from}=upFixture();level.id='synthetic-extraction-v1';
    put(level,{x:4,y:3,z:1},(16<<11)|2);put(level,{x:4,y:2,z:2},1);
    const world=createWorld(level);world.mercenaries[3]={...from,id:3};world.mercenaries[0]={id:0,x:4,y:3,z:2,facing:0};
    const result=stepWorld(level,world,[{mercenaryId:3,action:'forward'},{mercenaryId:0,action:'forward'}]);
    expect(result.events.map(e=>e.kind)).toEqual(['moved','blocked']);expect(result.events[1]!.reason).toBe('occupied');
    world.mission.exited[0]=true;
    const retired=stepWorld(level,world,[{mercenaryId:3,action:'forward'}]);
    expect(retired.events[0]!.kind).toBe('moved');expect(retired.world.mercenaries[3].z).toBe(2);
    const headOccupied=createWorld(level);headOccupied.mercenaries[0]={...from,id:0};headOccupied.mercenaries[1]={id:1,x:4,y:4,z:2,facing:0};
    expect(stepWorld(level,headOccupied,[{mercenaryId:0,action:'forward'}]).events[0]!.reason).toBe('occupied overhead');
  });

  it('resolves mission exits at the transformed target only after current/overhead/hazard guards', () => {
    const {level,from}=upFixture();level.id='synthetic-extraction-v1';const upperExit={x:4,y:3,z:2};
    put(level,upperExit,(3<<11)|2);
    const world=createWorld(level);world.mercenaries[0]={...from,id:0};
    expect(stepWorld(level,world,[{mercenaryId:0,action:'forward'}]).events[0]!.kind).toBe('exited');
    for (const [p,word] of [[{...from,z:2},2],[upperExit,(3<<11)|2|4],[from,(8<<28)|32|4|1]] as const) {
      const changed=structuredClone(level);put(changed,p,word);
      const result=stepWorld(changed,world,[{mercenaryId:0,action:'forward'}]);
      expect(result.events[0]!.kind).toBe('blocked');expect(result.world.mission.exited[0]).toBe(false);
    }
  });

  it('round trips a standing stair pose through unchanged world2/save2 and continues down identically', async () => {
    const {level,from}=upFixture();put(level,{x:4,y:3,z:1},(16<<11)|2);
    const world=createWorld(level);world.mercenaries[0]={...from,id:0};
    const high=stepWorld(level,world,[{mercenaryId:0,action:'forward'}]).world;
    const json=await exportCheckpoint(level,high);expect(JSON.parse(json).version).toBe(2);
    const loaded=await importCheckpoint(level,json);expect(loaded.schemaVersion).toBe(2);
    expect(loaded).toEqual(high);
    const commands=[{mercenaryId:0,action:'backward'} as const];
    const continued=stepWorld(level,loaded,commands);
    expect(continued).toEqual(stepWorld(level,high,commands));expect(continued.world.mercenaries[0]).toEqual({...from,id:0});
  });
});
