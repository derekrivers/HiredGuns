import {cellIndex, type PlayerCommand, type WorldState} from '../contracts';
import {createExtractionDemo} from '../demo';
import {createWorld, stepWorld} from './world';
import {resolveSelectedPartyMission} from './mission';

export const THREE_PLAYER_PROFILE = 'synthetic-three-assigned-v1';
export const THREE_PLAYER_CONTROLS = [1,1,1,0] as const;
interface Run {count:number; commands:PlayerCommand[]; deaths:number[]}
export interface ThreePlayerSession {
  profile:typeof THREE_PLAYER_PROFILE;
  controls:[1,1,1,0];
  world:WorldState;
  history:Run[];
}
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const refuse=():never=>{throw Error('Three-player profile refused atomically');};

/** Authored exits one step ahead; fourth body retains its position and occupancy.
 * Control zero affects mission bookkeeping only, never biological death. */
export function createThreePlayerLevel() {
  const level=createExtractionDemo();
  level.id='synthetic-three-player-v1';
  level.name='Synthetic three-player mission control';
  for(const p of level.starts)level.layers[0][cellIndex(level,{...p,y:p.y-1})]=(3<<11)|2;
  return level;
}
/** This bounded oracle admits exactly slots 0..2; no other party modes implied. */
export function createThreePlayerSession(controls:readonly number[]=THREE_PLAYER_CONTROLS):ThreePlayerSession {
  if(!equal(controls,THREE_PLAYER_CONTROLS))return refuse();
  const world=createWorld(createThreePlayerLevel(),undefined,{mode:'first-exit',timeLimit:2});
  world.physics={mode:'source-wet',deadWords:[0,0,0,0]};
  return {profile:THREE_PLAYER_PROFILE,controls:[1,1,1,0],world,history:[]};
}
/** Pure transaction: validate the entire command batch before time/history changes.
 * Death injection is a labelled synthetic test operation, without corpse effects. */
export function stepThreePlayerSession(previous:ThreePlayerSession,commands:readonly PlayerCommand[],deaths:readonly number[]=[]) {
  if(previous.profile!==THREE_PLAYER_PROFILE||!equal(previous.controls,THREE_PLAYER_CONTROLS))return refuse();
  if(commands.some(c=>c.mercenaryId===3)||deaths.some(id=>!Number.isInteger(id)||id<0||id>2)||new Set(deaths).size!==deaths.length)return refuse();
  if(previous.world.mission.outcome!=='active')return {session:previous,world:previous.world,events:[]};
  const prospective=structuredClone(previous.world);
  if(prospective.physics.mode!=='source-wet')return refuse();
  for(const id of deaths)prospective.physics.deadWords[id]=0xff00;
  const result=stepWorld(createThreePlayerLevel(),prospective,commands,undefined,false,(w,e)=>resolveSelectedPartyMission(w,e,previous.controls));
  const session=structuredClone(previous);session.world=result.world;
  const last=session.history.at(-1);
  if(last&&equal(last.commands,commands)&&equal(last.deaths,deaths))last.count++;
  else session.history.push({count:1,commands:structuredClone([...commands]),deaths:[...deaths]});
  if(JSON.stringify({format:THREE_PLAYER_PROFILE,session}).length>=24*1024)return refuse();
  return {...result,session};
}
export function serializeThreePlayerSession(session:ThreePlayerSession):string {
  const json=JSON.stringify({format:THREE_PLAYER_PROFILE,session});
  // Export validates the complete replay just as import does.
  importThreePlayerSession(json);
  return json;
}
export function importThreePlayerSession(json:string):ThreePlayerSession {
  if(json.length>=24*1024)return refuse();
  const saved=JSON.parse(json);
  if(saved?.format!==THREE_PLAYER_PROFILE||!Array.isArray(saved.session?.history)||saved.session.history.length>1202)return refuse();
  let session=createThreePlayerSession(saved.session.controls);
  for(const run of saved.session.history){
    if(!run||!Number.isInteger(run.count)||run.count<1||run.count>1202||!Array.isArray(run.commands)||!Array.isArray(run.deaths)||session.world.tick+run.count>1202)return refuse();
    for(let i=0;i<run.count;i++){
      if(session.world.mission.outcome!=='active')return refuse();
      session=stepThreePlayerSession(session,run.commands,run.deaths).session;
    }
  }
  if(!equal(saved,{format:THREE_PLAYER_PROFILE,session}))return refuse();
  return session;
}
