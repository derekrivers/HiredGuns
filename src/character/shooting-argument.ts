/** Opaque full-pointer identity; a private source-bound codec supplies its numeric allocation. */
export interface ShootingReference { anchor: string; byteOffset: number }
export interface ShootingRegisters { d: readonly number[]; a: readonly ShootingReference[] }
export interface ShootingArgumentInput {
  profile: 'ocs-item-argument-before-fitness';
  invocation: 'diagnostic-player-hit-prefix';
  targetIndex: 0;
  /** Identity witness only: neither hashes nor metadata authenticate supplied parameters. */
  parameterOrigin: {
    revision: 'ocs-runtime'; tableSha256: string; rowSha256: string;
    rowIndex: 24; itemId: 25; category: 0; damage: 20; duration: 5;
  };
  registers: ShootingRegisters;
  /** Source-bound reference to target zero's statistics; no actor/statistics read occurs. */
  statisticsReference: ShootingReference;
  /** Four complete prior longs in ascending final-frame order; not CPU reads. */
  stackPrior: readonly number[];
}
type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
export type ShootingSavedLong = number | ShootingReference;
export type ShootingArgumentRecord =
  | { readonly kind: 'read'; readonly step: 4 | 6; readonly field: 'damage' | 'duration';
      readonly width: 1; readonly value: number }
  | { readonly kind: 'write'; readonly step: 10; readonly slot: number; readonly width: 4;
      readonly register: 'a2' | 'a1' | 'a0' | 'd0'; readonly before: number;
      readonly after: Immutable<ShootingSavedLong> };
export interface ShootingArgumentResult {
  readonly candidate: {
    readonly registers: Immutable<ShootingRegisters>;
    readonly savedFrame: readonly Immutable<ShootingSavedLong>[];
    readonly boundary: 'before-fitness-call';
  };
  /** Complete logical non-SR snapshots before steps 0..17 and at stop 18 (logical PC). */
  readonly snapshots: readonly { readonly step: number; readonly registers: Immutable<ShootingRegisters> }[];
  readonly records: readonly ShootingArgumentRecord[];
  readonly definedStatus: { readonly x: 0 };
}
function fail(): never { throw new Error('Unsupported or malformed bounded shooting argument projection.'); }
function data(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== keys.length) fail();
  const copy: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail();
    copy[key] = descriptor.value;
  }
  return copy;
}
function array(value: unknown, length: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertyDescriptor(value, 'length')?.value !== length || Reflect.ownKeys(value).length !== length + 1) fail();
  return Array.from({ length }, (_, i) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail();
    return descriptor.value as unknown;
  });
}
const uint = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
function reference(value: unknown): ShootingReference {
  const r = data(value, ['anchor', 'byteOffset']);
  if (typeof r.anchor !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(r.anchor) ||
      typeof r.byteOffset !== 'number' || !Number.isInteger(r.byteOffset) ||
      r.byteOffset < -0x80000000 || r.byteOffset > 0x7fffffff) fail();
  return { anchor: r.anchor, byteOffset: r.byteOffset };
}
const copyReference = (r: ShootingReference): ShootingReference => ({ ...r });
const copyRegisters = (r: ShootingRegisters): { d: number[]; a: ShootingReference[] } =>
  ({ d: [...r.d], a: r.a.map(copyReference) });
function freeze<T>(value: T): Immutable<T> {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value as Immutable<T>;
}

/** Pure disconnected projection of the one accepted parameter/target/invocation profile. */
export function prepareShootingArgument(input: ShootingArgumentInput): ShootingArgumentResult {
  // Validate every descriptor and retained width before calculation. Proxies are not a trust boundary.
  const s = data(input, ['profile', 'invocation', 'targetIndex', 'parameterOrigin', 'registers', 'statisticsReference', 'stackPrior']);
  if (s.profile !== 'ocs-item-argument-before-fitness' || s.invocation !== 'diagnostic-player-hit-prefix' || s.targetIndex !== 0) fail();
  const p = data(s.parameterOrigin, ['revision', 'tableSha256', 'rowSha256', 'rowIndex', 'itemId', 'category', 'damage', 'duration']);
  if (p.revision !== 'ocs-runtime' || p.tableSha256 !== '633249c73e99c9019e653a0054ab0a613b3a2c313f60d93f7d0075e8bc94e6bc' ||
      p.rowSha256 !== '7dc1eba2a060d7fded68734c0498a86dab78e21e9245990ea618d526ac430411' ||
      p.rowIndex !== 24 || p.itemId !== 25 || p.category !== 0 || p.damage !== 20 || p.duration !== 5) fail();
  const r = data(s.registers, ['d', 'a']), d = array(r.d, 8), a = array(r.a, 8).map(reference);
  const prior = array(s.stackPrior, 4), statistics = reference(s.statisticsReference);
  if (!d.every(uint) || !prior.every(uint) || (d[0]! & 65535) !== 0 || a[7]!.byteOffset < -0x80000000 + 16) fail();
  const registers = { d, a }, savedFrame: ShootingSavedLong[] = [...prior];
  const records: ShootingArgumentRecord[] = [], snapshots: { step: number; registers: ShootingRegisters }[] = [];
  const snapshot = (step: number): void => { snapshots.push({ step, registers: copyRegisters(registers) }); };
  for (let step = 0; step < 18; step++) {
    snapshot(step);
    switch (step) {
      case 0: d[1] = ((d[1]! & 0xffff0000) >>> 0); break; // MOVE.W target zero, preserving upper word
      case 1: d[0] = 0; break; // unsigned low-word target * actor stride
      case 2: a[2] = copyReference(a[5]!); break;
      case 3: d[0] = 0; break; // whole-register clear
      case 4: d[0] = p.damage as number; records.push({ kind: 'read', step, field: 'damage', width: 1, value: d[0] }); break;
      case 5: d[2] = 0; break;
      case 6: d[2] = p.duration as number; records.push({ kind: 'read', step, field: 'duration', width: 1, value: d[2] }); break;
      case 7: d[0] = (d[0]! & 65535) * (d[2]! & 65535); break;
      case 8: d[0] = (d[0]! << 8) >>> 0; break;
      case 9: d[0] = (d[0]! << 1) >>> 0; break;
      case 10:
        // Predecrement MOVEM writes reverse register order; ascending frame is D0/A0/A1/A2.
        for (const [slot, name, value] of [
          [3, 'a2', a[2]!], [2, 'a1', a[1]!], [1, 'a0', a[0]!], [0, 'd0', d[0]!],
        ] as const) {
          a[7] = { ...a[7]!, byteOffset: a[7]!.byteOffset - 4 };
          const after = typeof value === 'number' ? value : copyReference(value);
          records.push({ kind: 'write', step, slot, register: name, width: 4, before: prior[slot]!, after });
          savedFrame[slot] = typeof value === 'number' ? value : copyReference(value);
        }
        break;
      case 11: d[2] = d[1]! & 65535; break;
      case 12: d[1] = 0; break; // target zero * statistics stride
      case 13: a[1] = copyReference(statistics); break;
      case 14: break; // ADDA.W target zero
      case 15: d[2] = 0; break; // target zero * actor stride
      case 16: a[0] = copyReference(a[5]!); break;
      case 17: break; // ADDA.W target zero
    }
  }
  snapshot(18);
  return freeze({ candidate: { registers: copyRegisters(registers), savedFrame, boundary: 'before-fitness-call' },
    snapshots, records, definedStatus: { x: 0 } });
}
