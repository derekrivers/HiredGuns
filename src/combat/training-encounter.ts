import { transitionGunShot, type GunWeapon } from './weapon-transition';
import type { InventorySlot } from '../import/characters';

export type AmmoFixture = 'full' | 'partial' | 'empty';
export interface TrainingEncounter {
  readonly version: 1;
  readonly profile: 'isolated-authored-gun';
  readonly actor: number;
  readonly canonicalIndex: number;
  readonly fixture: AmmoFixture;
  readonly baseline: { readonly equipped: Readonly<InventorySlot>; readonly fitness: number; readonly physique: number; readonly spellShield: number };
  readonly equipped: Readonly<InventorySlot>;
  readonly fireDuration: number;
  readonly fireAccuracy: number;
  readonly target: 'authored-dummy' | 'miss';
  readonly fitness: number;
  readonly lastDamage: number;
  readonly shots: number;
  readonly status: 'ready' | 'fired' | 'already-firing' | 'no-ammo';
}
function fail(): never { throw new Error('Malformed authored encounter state or actor association.'); }
const uint = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
function fields(v: unknown, keys: string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(v)) || Reflect.ownKeys(v).length !== keys.length) fail();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const d = Object.getOwnPropertyDescriptor(v, k);
    if (!d || !('value' in d) || !d.enumerable) fail();
    out[k] = d.value;
  }
  return out;
}
function freeze(state: TrainingEncounter): TrainingEncounter {
  Object.freeze(state.baseline.equipped); Object.freeze(state.baseline); Object.freeze(state.equipped);
  return Object.freeze(state);
}
/** Logical row for tests; live callers must use bindVerifiedEncounterGun on local bytes. */
export function encounterParameters(weapon: GunWeapon) {
  const byte = (n: number) => parseInt(weapon.rawHex.slice(n * 2, n * 2 + 2), 16);
  return { duration: byte(265), accuracy: byte(274), capacity: byte(284), damagePerHit: byte(285) };
}
export function createTrainingEncounter(weapon: GunWeapon, indices: readonly number[], actor: number, fixture: AmmoFixture, target: TrainingEncounter['target'] = 'authored-dummy'): TrainingEncounter {
  if (!uint(actor, 3) || !uint(indices[actor], 11) || !['full', 'partial', 'empty'].includes(fixture) || !['authored-dummy', 'miss'].includes(target)) fail();
  const { capacity, duration } = encounterParameters(weapon);
  if (fixture === 'partial' && duration <= 1) throw new Error('This gun has no partial-burst fixture.');
  const ammo = fixture === 'full' ? capacity : fixture === 'partial' ? Math.min(capacity, duration - 1) : 0;
  const equipped: InventorySlot = { itemId: 25, damage: 0, ammo, fourthByte: 0, rawHex: `1900${ammo.toString(16).padStart(2, '0')}00` };
  // Validate the logical weapon and entry without spending anything.
  transitionGunShot({ weapon, equipped, fireDuration: 127, fireAccuracy: 0, target: { kind: 'miss' } });
  return freeze({ version: 1, profile: 'isolated-authored-gun', actor, canonicalIndex: indices[actor]!, fixture,
    baseline: { equipped: { ...equipped }, fitness: 100000, physique: 100, spellShield: 0 }, equipped,
    fireDuration: 0, fireAccuracy: 0, target, fitness: 100000, lastDamage: 0, shots: 0, status: 'ready' });
}
/** Exact authored snapshot; never installs source inventory or accepts serialized gun rows. */
export function validateTrainingEncounter(value: unknown, weapon: GunWeapon, indices: readonly number[]): TrainingEncounter {
  const s = fields(value, ['version', 'profile', 'actor', 'canonicalIndex', 'fixture', 'baseline', 'equipped', 'fireDuration', 'fireAccuracy', 'target', 'fitness', 'lastDamage', 'shots', 'status']);
  if (s.version !== 1 || s.profile !== 'isolated-authored-gun' || !uint(s.actor, 3) || s.canonicalIndex !== indices[s.actor] ||
      !['full', 'partial', 'empty'].includes(s.fixture as string) || !['authored-dummy', 'miss'].includes(s.target as string) ||
      !uint(s.fitness, 100000) || !uint(s.lastDamage, 0xffffffff) || !uint(s.shots, 0xffffffff) ||
      !['ready', 'fired', 'already-firing', 'no-ammo'].includes(s.status as string)) fail();
  const initial = createTrainingEncounter(weapon, indices, s.actor, s.fixture as AmmoFixture, s.target as TrainingEncounter['target']);
  const b = fields(s.baseline, ['equipped', 'fitness', 'physique', 'spellShield']);
  const entry = fields(b.equipped, ['itemId', 'damage', 'ammo', 'fourthByte', 'rawHex']);
  for (const key of ['fitness', 'physique', 'spellShield'] as const) if (b[key] !== initial.baseline[key]) fail();
  for (const key of ['itemId', 'damage', 'ammo', 'fourthByte', 'rawHex'] as const) if (entry[key] !== initial.baseline.equipped[key]) fail();
  if (!uint(s.fireDuration, 127) || !uint(s.fireAccuracy, 255)) fail();
  const checked = transitionGunShot({ weapon, equipped: s.equipped as InventorySlot, fireDuration: 127,
    fireAccuracy: s.fireAccuracy as number, target: { kind: 'miss' } });
  if (checked.candidate.equipped.damage !== 0 || checked.candidate.equipped.fourthByte !== 0 ||
      checked.candidate.equipped.ammo > initial.baseline.equipped.ammo ||
      (s.fireDuration as number) > encounterParameters(weapon).duration) fail();
  return freeze({ ...s, baseline: initial.baseline, equipped: { ...(s.equipped as InventorySlot) } } as unknown as TrainingEncounter);
}
export function fireTrainingEncounter(state: TrainingEncounter, weapon: GunWeapon): TrainingEncounter {
  if (state.shots === 0xffffffff) throw new Error('Encounter shot counter exhausted. Reset the authored encounter.');
  const shot = transitionGunShot({ weapon, equipped: state.equipped, fireDuration: state.fireDuration, fireAccuracy: state.fireAccuracy,
    target: state.target === 'miss' ? { kind: 'miss' } : { kind: 'authored-dummy', fitness: state.fitness, physique: state.baseline.physique, spellShield: state.baseline.spellShield } });
  return freeze({ ...state, equipped: { ...shot.candidate.equipped }, fireDuration: shot.candidate.fireDuration, fireAccuracy: shot.candidate.fireAccuracy,
    fitness: shot.candidate.target.kind === 'miss' ? state.fitness : shot.candidate.target.fitness,
    lastDamage: shot.arithmetic?.damage ?? 0, shots: state.shots + (shot.status === 'fired' ? 1 : 0), status: shot.status });
}
/** Authored one-counter-unit per accepted simulation tick; call only while running. */
export function tickTrainingEncounter(state: TrainingEncounter): TrainingEncounter {
  return state.fireDuration === 0 ? state : freeze({ ...state, fireDuration: state.fireDuration - 1 });
}
export function resetTrainingEncounter(state: TrainingEncounter, weapon: GunWeapon, indices: readonly number[]): TrainingEncounter {
  return createTrainingEncounter(weapon, indices, state.actor, state.fixture, state.target);
}
export function targetTrainingEncounter(state: TrainingEncounter): TrainingEncounter {
  return freeze({ ...state, target: state.target === 'miss' ? 'authored-dummy' : 'miss' });
}
