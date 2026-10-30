import { cellIndex, type LevelData, type MissionRules, type PlayerCommand, type WorldState } from '../contracts';
import { importEditorMap } from '../import/editor-map';
import { importCharacters } from '../import/characters';
import { TRAINING_43_SHA256 } from './mission-profile';
import { createTrainingSession, type TrainingSession, type TrainingSources, type TrainingCandidate } from './training-session';
import { initialWetLifecycle, stepWetLifecycle, encodeLifecycleHistory, decodeLifecycleHistory, lifecycleHistory } from './training-wet-lifecycle';
import { wetSnapshot, rawSnapshot, WET_LIMITS } from './training-wet';
import { equalConsumableState as equal } from './training-consumables';

export const WET_REGION_SCENARIO='training43-wet-region-v1';
/** V17 adds replay-derived visit evidence; every v16 physics/source restriction and
 * all existing event/tick/byte/work budgets remain. Visits are observations, never
 * permission to move, a route or a percentage of original-level completion. */
export interface TrainingWetRegion { visited:number[] }
const fail=(why:string):never=>{throw Error(`Wet region refused atomically: ${why}`);};
function observe(level:LevelData,c:TrainingCandidate):void {
 const visited=new Set(c.session.wetRegion!.visited);
 for(const p of c.world.mercenaries)if(!c.world.mission.exited[p.id]&&!c.session.wet!.actors[p.id]!.runtimeDeadWord){const i=cellIndex(level,p);if(level.layers[0][i]!&4)visited.add(i);}
 c.session.wetRegion!.visited=[...visited].sort((a,b)=>a-b);
}
export function initialWetRegion(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules):TrainingCandidate {
 const {wetRegion:_region,...fresh}=baseline;void _region;
 const c=initialWetLifecycle(level,fresh,races,rules);c.session={...c.session,wetRegion:{visited:[]}};observe(level,c);return c;
}
export function serializeWetRegion(c:TrainingCandidate):string {
 const {history,...state}=c.session.wet!;
 const json=JSON.stringify({format:'hired-guns-training-session',version:17,scenario:WET_REGION_SCENARIO,sources:{map:TRAINING_43_SHA256,...c.session.team.sources},indices:c.session.indices,rules:state.rules,history:encodeLifecycleHistory(history),checkpoint:{world:c.world,state,lifecycle:c.session.wetLifecycle,region:c.session.wetRegion}});
 if(new TextEncoder().encode(json).length>=WET_LIMITS.bytes)fail('future save byte budget');return json;
}
export function stepWetRegion(level:LevelData,session:TrainingSession,previous:WorldState,commands:readonly PlayerCommand[],record=true){
 if(!session.wetRegion)fail('inactive');
 if(previous.mission.outcome!=='active')return {session,world:previous,events:[]};
 // Reuse the accepted indivisible source tick; only this v17 owner records the
 // history and observes visits. Nothing from an unchecked saved leaf is installed.
 const r=stepWetLifecycle(level,session,previous,commands,false);
 const c={...r,session:{...r.session,wetRegion:structuredClone(session.wetRegion!)}};observe(level,c);
 if(record){const history=c.session.wet!.history,last=history.at(-1);if(last&&equal(last.commands,commands))last.count++;else history.push({count:1,commands:structuredClone([...commands])});decodeLifecycleHistory(encodeLifecycleHistory(history));serializeWetRegion(c);}
 return c;
}
export function replayWetRegion(level:LevelData,baseline:TrainingSession,races:number[],rules:MissionRules,input:unknown):TrainingCandidate {
 // Roundtrip through the strict accepted history parser before any replay work.
 const history=lifecycleHistory(input);
 let c=initialWetRegion(level,baseline,races,rules);
 for(const e of history)for(let n=0;n<e.count;n++){if(c.world.mission.outcome!=='active')fail('history after terminal');const r=stepWetRegion(level,c.session,c.world,e.commands,false);c={session:r.session,world:r.world};}
 c.session.wet!.history=history;serializeWetRegion(c);return c;
}
async function rebuild(level:LevelData,sources:TrainingSources,indices:readonly number[],rules:MissionRules,input:unknown):Promise<TrainingCandidate>{
 const map=wetSnapshot(level),chosen=wetSnapshot(indices),policy=wetSnapshot(rules),history=decodeLifecycleHistory(wetSnapshot(input)),raw=rawSnapshot(sources);
 const imported=await importEditorMap(raw.map);if(imported.level.source.sha256!==TRAINING_43_SHA256||!equal(imported.level,map))fail('raw map identity/geometry');
 const baseline=await createTrainingSession(imported.level,raw,chosen),roster=await importCharacters(raw.roster);
 return replayWetRegion(imported.level,baseline.session,chosen.map(i=>roster.records[i]!.race),policy,history);
}
export async function activateWetRegion(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState,paused:boolean):Promise<TrainingCandidate>{
 const saved=wetSnapshot({session,world});if(!paused||saved.world.tick!==0||saved.session.wet||saved.session.wetRegion||saved.session.gate||saved.session.ground||saved.session.consumables||saved.session.inventory.commands.length)fail('fresh paused ready state required');
 return rebuild(level,sources,saved.session.indices,saved.world.mission.rules,[]);
}
export async function exportWetRegion(level:LevelData,sources:TrainingSources,session:TrainingSession,world:WorldState):Promise<string>{
 const saved=wetSnapshot({session,world}),c=await rebuild(level,sources,saved.session.indices,saved.session.wet!.rules,encodeLifecycleHistory(saved.session.wet!.history));
 if(!equal(c,saved))fail('complete source/history/region mismatch');return serializeWetRegion(c);
}
export async function importWetRegion(level:LevelData,sources:TrainingSources,input:unknown):Promise<TrainingCandidate>{
 const saved=wetSnapshot(input) as ReturnType<typeof JSON.parse>;
 if(!saved||Object.keys(saved).sort().join(',')!=='checkpoint,format,history,indices,rules,scenario,sources,version'||saved.format!=='hired-guns-training-session'||saved.version!==17||saved.scenario!==WET_REGION_SCENARIO)fail('wrapper fields');
 const c=await rebuild(level,sources,saved.indices,saved.rules,saved.history);
 if(!equal(JSON.parse(serializeWetRegion(c)),saved))fail('source/history/full state/visited comparison');return c;
}
