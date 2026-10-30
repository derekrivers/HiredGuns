import type { LevelData } from '../contracts';
import { importEditorMap } from '../import/editor-map';
import { TRAINING_43_SHA256 } from './mission-profile';

/** Presentation evidence only; never simulation/save state. */
export interface SignSource { readonly sha256: string }
const admissions = new WeakMap<SignSource, {level: LevelData; words: readonly number[]}>();
/** The raw importer snapshots before hashing; parsed labels cannot mint admission. */
export async function importSignMap(bytes: Uint8Array) {
  const result = await importEditorMap(bytes);
  let signSource: SignSource | null = null;
  if (result.report.sha256 === TRAINING_43_SHA256) {
    signSource = Object.freeze({sha256: result.report.sha256});
    admissions.set(signSource, {level: result.level, words: Object.freeze([...result.level.layers[0]])});
  }
  return {...result, signSource};
}
/** Own enumerable data only; no ordinary getter/inherited extension reads.
 * Reflection is not a sandbox for JavaScript proxies. */
export function signData(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const d = Object.getOwnPropertyDescriptor(value, key);
  return d?.enumerable && Object.hasOwn(d, 'value') ? d.value : undefined;
}
const integer = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
export interface SignCue { readonly variant: number; readonly index: number }
/** Pure projected predicate. Admission here is a caller assertion, not provenance.
 * Production uses readTrainingSignCue and its raw-import token. */
export function deriveSignCue(input: unknown): SignCue | null {
  const get = (key: string) => signData(input, key);
  if (get('admitted') !== true || get('sourceHash') !== TRAINING_43_SHA256 ||
      typeof get('levelId') !== 'string' || !get('levelId') || get('worldLevelId') !== get('levelId') ||
      get('loading') !== false || get('exited') !== false || get('runtimeDeadWord') !== 0 ||
      get('statsDeadWord') !== 0 || get('windowType') !== 0 || get('controlMethod') !== 1) return null;
  const size = get('size'), position = get('position');
  const width = signData(size,'width'), depth = signData(size,'depth'), height = signData(size,'height');
  if (width !== 23 || depth !== 23 || height !== 20) return null;
  const x = signData(position,'x'), y = signData(position,'y'), z = signData(position,'z'), facing = signData(position,'facing');
  if (!integer(x,22) || !integer(y,22) || !integer(z,19) || !integer(facing,3) || !integer(get('actor'),3)) return null;
  const nx = x + (facing === 1 ? 1 : facing === 3 ? -1 : 0);
  const ny = y + (facing === 2 ? 1 : facing === 0 ? -1 : 0);
  if (nx < 0 || nx >= width || ny < 0 || ny >= depth) return null;
  const index = (z * depth + ny) * width + nx, word = get('word');
  if (get('index') !== index || !integer(word,0xffffffff) || !(word & 8) || (word & 0x180000) || (word & (128 | 256))) return null;
  // Five encoded variant bits fit within all 36 native 480-byte slots.
  return Object.freeze({variant:(word >>> 23) & 31, index});
}
/** Reads the actual bound map, never a prospective pose or saved cue. */
export function readTrainingSignCue(source: SignSource | null, level: LevelData, input: unknown): SignCue | null {
  const evidence = source && admissions.get(source);
  const identity = signData(level,'source');
  if (!evidence || evidence.level !== level || signData(identity,'kind') !== 'editor-map' || signData(identity,'sha256') !== TRAINING_43_SHA256) return null;
  const position = signData(input,'position');
  const x = signData(position,'x'), y = signData(position,'y'), z = signData(position,'z'), facing = signData(position,'facing');
  if (!integer(x,22) || !integer(y,22) || !integer(z,19) || !integer(facing,3)) return null;
  const nx = x + (facing === 1 ? 1 : facing === 3 ? -1 : 0), ny = y + (facing === 2 ? 1 : facing === 0 ? -1 : 0);
  if (!integer(nx,22) || !integer(ny,22)) return null;
  const layers = signData(level,'layers'), plane = signData(layers,'0');
  if (!Array.isArray(layers) || layers.length !== 3 || !Array.isArray(plane) || plane.length !== 10580) return null;
  const index = (z * 23 + ny) * 23 + nx, word = signData(plane,String(index));
  if (word !== evidence.words[index]) return null;
  const projection: Record<string, unknown> = {};
  for (const key of ['position','actor','worldLevelId','loading','exited','runtimeDeadWord','statsDeadWord','windowType','controlMethod']) projection[key] = signData(input,key);
  return deriveSignCue({...projection, admitted:true, sourceHash:source!.sha256, levelId:signData(level,'id'), size:signData(level,'size'), index, word});
}
