import { cellIndex, inBounds, type Facing, type LevelData, type MissionClock, type MissionRules, type MissionState, type Position, type SimulationEvent, type Spawn, type WorldState } from '../contracts';
import { missionRulesForLevel } from './mission-profile';
import { resolveTraversal } from './traversal';

/** Source resets a counter to 600 after it decrements past zero: 601 steps. */
export const SOURCE_CLOCK_PERIOD = 601;

/** Main.s check_exit: dead_flag2 OR control_method=0 counts in BOTH d0/d1;
 * window7 counts only in d0. Four dead precedes action timeout, then exit.
 * Pure source decision only; the live selected-party adapter admits control1.
 */
export function sourcePartyDecision(actors:readonly {deadWord:number;control:number;window:number}[], action:boolean, timeUp:boolean): 'all-dead'|'time-expired'|'exit'|null {
  if(actors.length!==4)throw Error('Four source slots required');
  let dead=0,inside=0;
  for(const a of actors){if(a.deadWord!==0||a.control===0){dead++;inside++;}else if(a.window===7)inside++;}
  if(dead===4)return 'all-dead';
  if(action&&timeUp)return 'time-expired';
  return (action?inside>dead:inside===4)?'exit':null;
}
/** V18 only. First-exit is the source multi-player action decision; cooperative
 * extraction remains the explicitly labelled all-four-exited adaptation. */
export function resolveSelectedPartyMission(world:WorldState,events:SimulationEvent[]):void {
  if(world.physics.mode!=='source-wet')throw Error('Selected party physics required');
  const m=world.mission,action=m.rules.mode!=='navigation';
  m.clock=action?sourceClockAtTick(m.rules.timeLimit!,world.tick):null;
  const decision=sourcePartyDecision(world.physics.deadWords.map((deadWord,id)=>({deadWord,control:1,window:m.exited[id]?7:0})),action,!!m.clock&&m.clock.tens===0&&m.clock.units===0);
  if(decision==='all-dead'||decision==='time-expired'){
    m.outcome='failed';m.reason=decision;m.winner=null;
    events.push({tick:world.tick,mercenaryId:0,kind:'failed',reason:decision==='all-dead'?'all controlled mercenaries dead':'time expired'});return;
  }
  if(!action||decision!=='exit'||(m.rules.mode==='cooperative-extraction'&&!m.exited.every(Boolean)))return;
  m.outcome='complete';m.winner=m.rules.mode==='first-exit'?m.exited.findIndex(Boolean):null;
  events.push({tick:world.tick,mercenaryId:m.winner??events.filter(e=>e.kind==='exited').at(-1)!.mercenaryId,kind:'complete'});
}

export function validatedMissionRules(level: LevelData, rules: MissionRules): MissionRules {
  if (!rules || Reflect.ownKeys(rules).length !== 2 || !Object.hasOwn(rules,'mode') || !Object.hasOwn(rules,'timeLimit')) throw new Error('Invalid mission rules fields');
  const allowed = missionRulesForLevel(level, rules.mode);
  if (rules.mode !== allowed.mode || rules.timeLimit !== allowed.timeLimit) throw new Error('Mission rules do not match this level revision');
  return { ...allowed };
}

export function sourceClockAtTick(timeLimit: number, tick: number): MissionClock {
  if (!Number.isSafeInteger(timeLimit) || timeLimit < 1 || timeLimit > 99 || !Number.isSafeInteger(tick) || tick < 0 || tick > timeLimit * SOURCE_CLOCK_PERIOD) throw new Error('Invalid source clock range');
  const remaining = timeLimit - Math.floor(tick / SOURCE_CLOCK_PERIOD);
  return { tens: Math.floor(remaining / 10), units: remaining % 10, subticks: 600 - tick % SOURCE_CLOCK_PERIOD };
}

export function initialMission(level: LevelData, rules: MissionRules = missionRulesForLevel(level)): MissionState {
  const validated = validatedMissionRules(level, rules);
  return { rules: validated, outcome: 'active', exited: [false,false,false,false], clock: validated.timeLimit === null ? null : sourceClockAtTick(validated.timeLimit,0), winner: null };
}

/** Exit markers are source block type 3, independently of the header exit triple. */
export function isExitBlock(level: LevelData, p: Position): boolean {
  if (!inBounds(level,p)) return false;
  const word = level.layers[0][cellIndex(level,p)]!;
  return (word & 2) !== 0 && ((word >>> 11) & 63) === 3;
}

/** A retired approach pose must resolve to an exit, including dry stairs.
 * Current occupancy cannot reconstruct other actors' positions at retirement. */
export function besideExitBlock(level: LevelData, p: Spawn): boolean {
  return ([0,1,2,3] as Facing[]).some(direction => {
    const { target, reason } = resolveTraversal(level,p,direction);
    return (reason === null || reason === 'block') && isExitBlock(level,target);
  });
}

/** Resolve once after stable-ID command processing; timeout wins deadline ties. */
export function resolveMission(world: WorldState, events: SimulationEvent[]): void {
  const mission = world.mission;
  if (mission.rules.mode === 'navigation') return;
  mission.clock = sourceClockAtTick(mission.rules.timeLimit!,world.tick);
  if (mission.clock.tens === 0 && mission.clock.units === 0) {
    mission.outcome = 'failed';
    events.push({tick:world.tick,mercenaryId:0,kind:'failed',reason:'time expired'});
    return;
  }
  const complete = mission.rules.mode === 'first-exit' ? mission.exited.some(Boolean) : mission.exited.every(Boolean);
  if (!complete) return;
  mission.outcome = 'complete';
  const exitedNow = events.filter(e => e.kind === 'exited');
  if (mission.rules.mode === 'first-exit') mission.winner = mission.exited.findIndex(Boolean);
  events.push({tick:world.tick,mercenaryId:mission.winner ?? exitedNow.at(-1)!.mercenaryId,kind:'complete'});
}
