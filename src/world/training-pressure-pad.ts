import { cellIndex, type LevelData, type WorldState } from '../contracts';
import type { DoorAction } from './training-moving-door';

export const PRESSURE_PAD_FIXTURE = 'authored-pressure-pad-extraction-v1';
export const PAD_CELL = Object.freeze({x:4,y:5,z:1});
export const PAD_INDEX = 648;
// Map-relative door table offset (Equates / editor-map), NOT map_data1+cell.
const DOOR_DATUM = 9616;
export interface PadReceipt {actor:number; edge:'release'|'press'; index:number; action:DoorAction; datum:number}
export interface TrainingPressurePad {occupants:number[]; lastActions:PadReceipt[]}
export const pressurePadLevel = (level:LevelData) => level.id === PRESSURE_PAD_FIXTURE;
/** Authored raw 28-byte button rows; unused bytes are retained, not eligibility. */
export function padButtons(): Uint8Array {
  const bytes = new Uint8Array(32*28), row = 3*28;
  bytes[row] = 0x81; bytes[row+1] = 14; bytes[row+2] = 15; bytes[row+3] = 0xa5;
  const view = new DataView(bytes.buffer); view.setUint32(row+4,DOOR_DATUM); view.setUint32(row+8,DOOR_DATUM);
  return bytes;
}
export function padBinding(level:LevelData, index:number, edge:'press'|'release', buttons = padButtons()) {
  if ((level.layers[0][index]! & 0x601) !== 0x201) return null;
  const descriptor = level.layers[0][index-529];
  if (descriptor === undefined) throw new Error('Pad upper descriptor missing.');
  const button = (descriptor >>> 23)&31, offset = button*28;
  if (buttons.length !== 32*28) throw new Error('Pad button table invalid.');
  const action = buttons[offset+(edge === 'press' ? 1 : 2)]!;
  const datum = new DataView(buttons.buffer,buttons.byteOffset,buttons.byteLength).getUint32(offset+(edge === 'press' ? 4 : 8));
  if (action !== (edge === 'press' ? 14 : 15) || datum !== DOOR_DATUM) throw new Error('Unsupported pad door binding.');
  return {index:button,action:action as DoorAction,datum};
}
/** Successful cell transitions only. Stable actor ID, old release then new press.
 * NPCs, turns, waits, blocked moves and extracted actors never enter this path. */
export function transitionPressurePad(level:LevelData, before:WorldState, after:WorldState, previous:TrainingPressurePad): TrainingPressurePad {
  const actions:PadReceipt[] = [];
  for (let actor=0;actor<4;actor++) {
    const old = before.mercenaries[actor]!, next = after.mercenaries[actor]!;
    if (before.mission.exited[actor] || (old.x === next.x && old.y === next.y && old.z === next.z)) continue;
    for (const [edge,pose] of [['release',old],['press',next]] as const) {
      const binding = padBinding(level,cellIndex(level,pose),edge);
      if (binding) actions.push({actor,edge,...binding});
    }
  }
  const occupants = after.mercenaries.filter(m=>!after.mission.exited[m.id] && padBinding(level,cellIndex(level,m),'press')).map(m=>m.id);
  return {occupants,lastActions:actions.length ? actions : previous.lastActions};
}
