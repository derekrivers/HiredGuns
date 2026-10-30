import { type LevelData, type MissionRules, type PlayerCommand, type WorldState, type Action } from '../contracts';
import { importEditorMap } from '../import/editor-map';
import { importCharacters } from '../import/characters';
import { TRAINING_43_SHA256 } from './mission-profile';
import { createTrainingSession, type TrainingSession, type TrainingSources, type TrainingCandidate } from './training-session';
import { initialSelectedLifecycle, stepWetLifecycle } from './training-wet-lifecycle';
import { resolveSelectedPartyMission } from './mission';
import { wetSnapshot, rawSnapshot, wetHistory, WET_LIMITS, type WetEvent } from './training-wet';
import { equalConsumableState as equal } from './training-consumables';

export const WET_PARTY_SCENARIO='training43-selected-wet-party-v1';
export interface TrainingWetParty { profile:'four-controlled-selected-v1' }
// Four independent approaches need more command records than one ready actor.
// New tuple encoding bounds bytes and work; v1-v17 retain their exact formats.
export const PARTY_EVENTS=256;
const actions:Action[]=['forward','backward','strafe-left','strafe-right','turn-left','turn-right'];
const fail=(why:string):never=>{throw Error(`Selected wet party refused atomically: ${why}`);};
function validateEvents(input:unknown):WetEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>PARTY_EVENTS*2+1)return fail('expanded event budget');
 let ticks=0;const result=data.map(e=>{const v=wetHistory([e])[0]!;ticks+=v.count;if(ticks>WET_LIMITS.ticks)fail('tick budget');return v;});return result;
}
/** Canonical tuples: preceding idle, command count, sorted id*6+action codes.
 * Adjacent equivalent command runs without an idle must be merged. */
export function encodePartyHistory(input:readonly WetEvent[]):number[][]{
 const events=validateEvents(input),result:number[][]=[];let idle=0;
 for(const e of events){if(!e.commands.length){idle+=e.count;continue;}
  const codes=e.commands.map(c=>c.mercenaryId*6+actions.indexOf(c.action)).sort((a,b)=>a-b),last=result.at(-1);
  if(!idle&&last&&equal(last.slice(2),codes))last[1]!+=e.count;else result.push([idle,e.count,...codes]);idle=0;
 }
 if(idle)result.push([idle,0]);if(result.length>PARTY_EVENTS)fail('packed event budget');return result;
}
export function decodePartyHistory(input:unknown):WetEvent[]{
 const data=wetSnapshot(input);if(!Array.isArray(data)||data.length>PARTY_EVENTS)return fail('packed event budget');
 const events:WetEvent[]=[];let ticks=0;
 for(const [i,t] of data.entries()){
  if(!Array.isArray(t)||t.length<2||t.length>6||!t.every(n=>Number.isInteger(n)&&n>=0))fail('tuple fields');
  const [idle,count]=t as number[];ticks+=idle!+count!;if(ticks>WET_LIMITS.ticks)fail('tick budget');
  if(count===0){if(i!==data.length-1||!idle||t.length!==2)fail('trailing idle');}else if(t.length===2)fail('missing command');
  const codes=t.slice(2) as number[];if(codes.some((n,j)=>n>23||(j>0&&n<=codes[j-1]!)||codes.some((m,k)=>k!==j&&Math.floor(m/6)===Math.floor(n/6))))fail('command codes');
  if(idle)events.push({count:idle!,commands:[]});if(count)events.push({count,commands:codes.map(n=>({mercenaryId:Math.floor(n/6),action:actions[n%6]!}))});
 }
 const history=validateEvents(events);if(!equal(encodePartyHistory(history),data))fail('noncanonical history');return history;
}
export function initialWetParty(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate{
 if(baseline.indices.length!==4||new Set(baseline.indices).size!==4||baseline.indices.some(i=>!Number.isInteger(i)||i<0||i>11)||races.length!==4||races.some(r=>!Number.isInteger(r)||r<0||r>4))fail('four distinct initialized source selections required');
 const {wetParty:_party,wetRegion:_region,...fresh}=baseline;void _party;void _region;
 const c=initialSelectedLifecycle(level,fresh,races,rules);c.session={...c.session,wetParty:{profile:'four-controlled-selected-v1'}};return c;
}
export function serializeWetParty(c:TrainingCandidate):string{
 const {history,...state}=c.session.wet!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:18,scenario:WET_PARTY_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodePartyHistory(history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle,party:c.session.wetParty}});
 if(new TextEncoder().encode(json).length>=WET_LIMITS.bytes)fail('future save byte budget');return json;
}
export function stepWetParty(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],record=true){
 if(!session.wetParty||session.wetRegion)fail('inactive/owner');
 if(previous.mission.outcome!=='active')return {session,world:previous,events:[]};
 const c=stepWetLifecycle(level,session,previous,commands,false,resolveSelectedPartyMission);
 if(record){const ordered=structuredClone([...commands]).sort((a,b)=>a.mercenaryId-b.mercenaryId),h=c.session.wet!.history,last=h.at(-1);if(last&&equal(last.commands,ordered))last.count++;else h.push({count:1,commands:ordered});decodePartyHistory(encodePartyHistory(h));serializeWetParty(c);}return c;
}
export function replayWetParty(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,input:unknown):TrainingCandidate{
 const history=decodePartyHistory(input);let c=initialWetParty(level,baseline,races,rules);
 for(const e of history)for(let n=0;n<e.count;n++){if(c.world.mission.outcome!=='active')fail('history after terminal');const r=stepWetParty(level,c.session,c.world,e.commands,false);c={session:r.session,world:r.world};}
 c.session.wet!.history=history;serializeWetParty(c);return c;
}
async function rebuild(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown):Promise<TrainingCandidate>{
 const map=wetSnapshot(level),chosen=wetSnapshot(indices),policy=wetSnapshot(rules),history=encodePartyHistory(decodePartyHistory(input)),raw=rawSnapshot(sources);
 const imported=await importEditorMap(raw.map);if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,chosen),roster=await importCharacters(raw.roster);
 return replayWetParty(imported.level,baseline.session,chosen.map(i=>roster.records[i]!.race),policy,history);
}
export async function activateWetParty(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean):Promise<TrainingCandidate>{
 const saved=wetSnapshot({session,world});if(!paused||saved.world.tick!==0||saved.session.wet||saved.session.wetParty||saved.session.gate||saved.session.ground||saved.session.consumables||saved.session.inventory.commands.length)fail('fresh paused selected team required');
 return rebuild(level,sources,saved.session.indices,saved.world.mission.rules,[]);
}
export async function exportWetParty(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState):Promise<string>{
 const saved=wetSnapshot({session,world}),c=await rebuild(level,sources,saved.session.indices,saved.session.wet!.rules,encodePartyHistory(saved.session.wet!.history));
 if(!equal(c,saved))fail('complete selected-source/history/outcome mismatch');return serializeWetParty(c);
}
export async function importWetParty(level:LevelData,sources:TrainingSources,input:unknown):Promise<TrainingCandidate>{
 const saved=wetSnapshot(input) as ReturnType<typeof JSON.parse>;
 if(!saved||Object.keys(saved).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||saved.format!=='hired-guns-training-session'||saved.version!==18||saved.scenario!==WET_PARTY_SCENARIO)fail('wrapper fields');
 const c=await rebuild(level,sources,saved.indices,saved.rules,saved.history);if(!equal(JSON.parse(serializeWetParty(c)),saved))fail('source/history/full state/outcome comparison');return c;
}
