import type { Position } from '../contracts';
import { transitionDoorMotion, type DoorRecord } from './door-motion';

export const MOVING_DOOR_FIXTURE = 'authored-moving-door-extraction-v1';
export const DOOR_CELL = Object.freeze({x:5,y:5,z:1});
export const DOOR_INDEX = (23 + 5) * 23 + 5;
export type DoorAction = 0 | 14 | 15 | 16 | 17 | 18;
export interface TrainingMovingDoor {
  fixture: typeof MOVING_DOOR_FIXTURE;
  adapter: 'accepted-tick-word-plus-one-v1';
  interlock: 'freeze-complete-door-while-reserved-v1';
  record: DoorRecord; word: number; counter: number;
  pendingAction: DoorAction; deferred: boolean;
}
export function initialMovingDoor(): TrainingMovingDoor {
  return {fixture:MOVING_DOOR_FIXTURE,adapter:'accepted-tick-word-plus-one-v1',interlock:'freeze-complete-door-while-reserved-v1',
    record:{position:DOOR_INDEX*4,trigger:0,direction:0,storedType:0x8000a003,delay:100,delayCount:0,key:0,buttonOnly:255},
    word:0x8000a003,counter:0,pendingAction:0,deferred:false};
}
/** AUTHORED adapter: one WORD increment per accepted tick. A closing attempt
 * freezes ALL source fields/counter; retain the action for retry, latest explicit
 * action wins. No accumulated catch-up, intermediate effects or audio commits.
 * Reservations are recomputed from current + prospective world/NPC footprints. */
export function advanceMovingDoor(previous: TrainingMovingDoor, action: DoorAction | readonly DoorAction[], reservations: readonly Position[]): TrainingMovingDoor {
  const actions = typeof action === 'number' ? action ? [action] : [] : action;
  const pendingAction = actions.at(-1) || previous.pendingAction;
  let record = previous.record;
  for (const requested of actions.length ? actions : previous.pendingAction ? [previous.pendingAction] : []) {
    const applied = transitionDoorMotion({record,target:{position:record.position,word:previous.word},counter:0,action:requested,onLift:false});
    if (applied.status === 'refused') throw new Error('Door action refused.');
    record = applied.candidate.record;
  }
  const result = transitionDoorMotion({record,target:{position:previous.record.position,word:previous.word},
    counter:(previous.counter+1)&65535,action:0,onLift:false});
  if (result.status === 'refused') throw new Error(`Moving door refused: ${result.reason}`);
  const c = result.candidate;
  const closing = c.record.direction === 2 || result.effects.some(e => e.kind === 'closed');
  if (closing && reservations.some(p => p.x === 5 && p.y === 5 && p.z === 1)) return {...previous,pendingAction,deferred:true};
  return {...previous,record:c.record,word:c.word,counter:c.counter,pendingAction:0,deferred:false};
}
export function doorStatus(door: TrainingMovingDoor): string {
  const variant = (door.word >>> 23)&31, r = door.record;
  return `${door.deferred ? 'OCCUPIED · closure deferred · ' : ''}${r.direction === 3 ? 'LOCKED' : r.direction === 1 ? 'OPENING' : r.direction === 2 ? 'CLOSING' : door.word&2 ? 'CLOSED' : 'OPEN'} · ${door.word&2 ? 'BLOCKED' : 'WALK THROUGH'} · variant ${variant}/10 · counter ${door.counter} · delay ${r.delayCount}/${r.delay} · trigger ${r.trigger}${r.trigger === 3 ? ' (pending lock)' : ''} · queued ${door.pendingAction}`;
}
