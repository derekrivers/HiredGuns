import { computeNormalDamage } from '../character/damage-arithmetic';
import { importItems } from '../import/items';
import type { InventorySlot } from '../import/characters';

/** Logical parameters are not source authentication. Bind private bytes separately. */
export interface GunWeapon { readonly itemId: 25; readonly rawHex: string }
export type EncounterTarget = { readonly kind: 'miss' } | {
  readonly kind: 'authored-dummy'; readonly fitness: number;
  readonly physique: number; readonly spellShield: number;
};
export interface GunShotInput {
  readonly weapon: GunWeapon;
  readonly equipped: Readonly<InventorySlot>;
  /** Restricted to the nonnegative signed-byte counter domain. */
  readonly fireDuration: number;
  readonly fireAccuracy: number;
  /** Authored encounter decision, never an original hit/range/accuracy calculation. */
  readonly target: EncounterTarget;
}
export interface GunShotResult {
  readonly status: 'fired' | 'already-firing' | 'no-ammo';
  readonly ammoSpent: number;
  readonly requestedHit: number;
  readonly arithmetic: Readonly<ReturnType<typeof computeNormalDamage>> | null;
  readonly candidate: {
    readonly equipped: Readonly<InventorySlot>;
    readonly fireDuration: number;
    readonly fireAccuracy: number;
    readonly target: EncounterTarget;
  };
}

const uint = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function fail(): never { throw new Error('Malformed or unsupported bounded gun encounter.'); }
function fields(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Reflect.ownKeys(value).length !== keys.length) fail();
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d) || !d.enumerable) fail();
    result[key] = d.value;
  }
  return result;
}
function weaponParameters(value: unknown) {
  const w = fields(value, ['itemId', 'rawHex']);
  if (w.itemId !== 25 || typeof w.rawHex !== 'string' || !/^[0-9a-f]{572}$/.test(w.rawHex)) fail();
  const byte = (offset: number) => parseInt((w.rawHex as string).slice(offset * 2, offset * 2 + 2), 16);
  const duration = byte(265), accuracy = byte(274), capacity = byte(284), damagePerHit = byte(285);
  if (byte(254) !== 0 || duration === 0 || duration > 127 || capacity === 0 || damagePerHit === 0) fail();
  return { duration, accuracy, capacity, damagePerHit };
}

/** Rehash complete original table bytes; editable catalog metadata grants no authority. */
export async function bindVerifiedEncounterGun(rawTable: Uint8Array): Promise<GunWeapon> {
  const catalog = await importItems(rawTable);
  if (catalog.source.revision !== 'ocs-runtime') throw new Error('Encounter gun requires the verified OCS runtime item table.');
  const weapon: GunWeapon = { itemId: 25, rawHex: catalog.records[24]!.rawHex };
  weaponParameters(weapon);
  return Object.freeze(weapon);
}

/**
 * Source-derived use_gun ammo/counter and player-hit arithmetic, composed with
 * explicitly authored hit selection and saturating dummy health. No actor writes,
 * death, inventory damage, world effects, clock advancement, audio or RNG calls.
 * All validation precedes calculation; returned data shares no mutable input.
 */
export function transitionGunShot(input: GunShotInput): GunShotResult {
  const i = fields(input, ['weapon', 'equipped', 'fireDuration', 'fireAccuracy', 'target']);
  const gun = weaponParameters(i.weapon);
  const e = fields(i.equipped, ['itemId', 'damage', 'ammo', 'fourthByte', 'rawHex']);
  if (e.itemId !== 25 || ![e.damage, e.ammo, e.fourthByte].every(n => uint(n, 255)) ||
      typeof e.rawHex !== 'string' || e.rawHex !== [e.itemId, e.damage, e.ammo, e.fourthByte].map(n => (n as number).toString(16).padStart(2, '0')).join('') ||
      !uint(i.fireDuration, 127) || !uint(i.fireAccuracy, 255) || (e.ammo as number) > gun.capacity) fail();
  const kind = Object.getOwnPropertyDescriptor(i.target ?? {}, 'kind');
  if (!kind || !('value' in kind)) fail();
  let target: EncounterTarget;
  if (kind.value === 'miss') { fields(i.target, ['kind']); target = { kind: 'miss' }; }
  else {
    const t = fields(i.target, ['kind', 'fitness', 'physique', 'spellShield']);
    if (t.kind !== 'authored-dummy' || !uint(t.fitness, 0xffffffff) || !uint(t.physique, 65535) ||
        t.physique === 0 || !uint(t.spellShield, 65535)) fail();
    target = { kind: 'authored-dummy', fitness: t.fitness, physique: t.physique, spellShield: t.spellShield };
  }
  let equipped: InventorySlot = { itemId: 25, damage: e.damage as number, ammo: e.ammo as number,
    fourthByte: e.fourthByte as number, rawHex: e.rawHex };
  const status = i.fireDuration > 3 ? 'already-firing' : equipped.ammo === 0 ? 'no-ammo' : 'fired';
  let fireDuration = i.fireDuration, fireAccuracy = i.fireAccuracy, ammoSpent = 0, requestedHit = 0;
  let arithmetic: ReturnType<typeof computeNormalDamage> | null = null;
  if (status === 'fired') {
    ammoSpent = Math.min(gun.duration, equipped.ammo);
    const ammo = equipped.ammo - ammoSpent;
    // Preserve both opaque entry bytes; only byte two changes.
    equipped = { ...equipped, ammo, rawHex: `${equipped.rawHex.slice(0, 4)}${ammo.toString(16).padStart(2, '0')}${equipped.rawHex.slice(6)}` };
    fireDuration = gun.duration;
    fireAccuracy = gun.accuracy;
    if (target.kind === 'authored-dummy') {
      requestedHit = gun.damagePerHit * gun.duration * 512;
      arithmetic = computeNormalDamage(requestedHit, target.physique, target.spellShield);
      target = { ...target, fitness: Math.max(0, target.fitness - arithmetic.damage) };
    }
  }
  return Object.freeze({ status, ammoSpent, requestedHit, arithmetic: arithmetic && Object.freeze(arithmetic),
    candidate: Object.freeze({ equipped: Object.freeze(equipped), fireDuration, fireAccuracy, target: Object.freeze(target) }) });
}
