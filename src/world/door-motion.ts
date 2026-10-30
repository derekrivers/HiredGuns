import { CELL_COUNT } from '../import/editor-map';

/** Raw unsigned storage values. Delay is interpreted as a signed byte. */
export interface DoorRecord {
  readonly position: number;
  readonly trigger: number;
  readonly direction: number;
  readonly storedType: number;
  readonly delay: number;
  readonly delayCount: number;
  readonly key: number;
  readonly buttonOnly: number;
}
export interface DoorMotionInput {
  readonly record: DoorRecord;
  /** Explicit snapshot at map_data1 + position; no selection authority implied. */
  readonly target: Readonly<{ position: number; word: number }>;
  /** Already accumulated source door_count, before move_doors. */
  readonly counter: number;
  /** 0=no action; button action table entries 14..18. Applied before scheduling. */
  readonly action: number;
  readonly onLift: boolean;
}
export interface DoorSnapshot {
  readonly record: DoorRecord;
  readonly word: number;
}
export type DoorEffect = Readonly<{
  step: number;
  kind: 'action' | 'delay-count' | 'auto-close' | 'trigger' | 'opened' | 'closed' | 'obstructed' | 'clear-open-variant' | 'variant' | 'sound-request' | 'redraw-request';
  /** Inert source sample number, only for sound-request. */
  sample: 4 | 5 | null;
  state: DoorSnapshot;
}>;
export type DoorMotionResult = Readonly<{
  status: 'candidate';
  candidate: DoorSnapshot & Readonly<{ counter: number }>;
  steps: number;
  effects: readonly DoorEffect[];
  diagnostics: readonly string[];
}> | Readonly<{ status: 'refused'; reason: string; candidate: null }>;

const BLOCK = 0x1f802, VARIANT = 0x0f800000;
const recordKeys = ['position', 'trigger', 'direction', 'storedType', 'delay', 'delayCount', 'key', 'buttonOnly'] as const;
const uint = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
const signedByte = (v: number) => v < 128 ? v : v - 256;
function plain(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== keys.length) return null;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d) || !d.enumerable) return null;
    result[key] = d.value;
  }
  return result;
}
const refuse = (reason: string): DoorMotionResult => Object.freeze({ status: 'refused', reason, candidate: null });

/** Detached deduction from move_doors; caller commits the whole candidate atomically. */
export function transitionDoorMotion(input: DoorMotionInput): DoorMotionResult {
  const i = plain(input, ['record', 'target', 'counter', 'action', 'onLift']);
  const r = plain(i?.record, recordKeys);
  const t = plain(i?.target, ['position', 'word']);
  if (!i || !r || !t || i.record === i.target || !uint(i.counter, 65535) ||
      !uint(i.action, 18) || (i.action !== 0 && i.action < 14) || typeof i.onLift !== 'boolean' ||
      !uint(r.position, CELL_COUNT * 4 - 4) || r.position % 4 !== 0 ||
      !uint(t.position, CELL_COUNT * 4 - 4) || t.position !== r.position || !uint(t.word, 0xffffffff) ||
      !uint(r.trigger, 4) || !uint(r.direction, 3) || !uint(r.storedType, 0xffffffff) ||
      !uint(r.delay, 255) || !uint(r.delayCount, 255) || !uint(r.key, 255) || !uint(r.buttonOnly, 255)) return refuse('invalid-input');
  // Narrow normal-door domain; opaque and every other stored bit are retained.
  const storedBlock = (r.storedType & BLOCK) >>> 11;
  if ((r.storedType & 2) === 0 || ![20, 21].includes(storedBlock) || (r.storedType & VARIANT) !== 0) return refuse('unsupported-stored-type');
  if (((t.word & VARIANT) >>> 23) > 10) return refuse('unsupported-variant');
  const record: { -readonly [K in keyof DoorRecord]: DoorRecord[K] } = {
    position: r.position, trigger: r.trigger, direction: r.direction, storedType: r.storedType,
    delay: r.delay, delayCount: r.delayCount, key: r.key, buttonOnly: r.buttonOnly,
  };
  let word = t.word, counter = i.counter, steps = 0;
  const effects: DoorEffect[] = [];
  const diagnostics = new Set<string>();
  const snapshot = (): DoorSnapshot => Object.freeze({ record: Object.freeze({ ...record }), word });
  const emit = (kind: DoorEffect['kind'], sample: DoorEffect['sample'] = null) => effects.push(Object.freeze({ step: steps, kind, sample, state: snapshot() }));
  if (i.action !== 0) {
    if (i.action === 14) record.trigger = 1;
    if (i.action === 15) record.trigger = 2;
    if (i.action === 16) record.trigger = record.direction === 1 ? 2 : 1;
    if (i.action === 17 && record.direction !== 3) record.trigger = 3;
    if (i.action === 18 && record.direction === 3) record.trigger = 4;
    emit('action');
  }
  if (counter > 6) {
    for (;;) {
      counter = (counter - 6) & 65535;
      if (counter >= 32768) { counter = (counter + 6) & 65535; break; }
      steps++;
      if (record.position === 0) { diagnostics.add('inactive-position'); continue; }
      if (record.delay < 128 && (word & 2) === 0) {
        record.delayCount = (record.delayCount + 1) & 255;
        emit('delay-count');
        if (signedByte(record.delay) <= signedByte(record.delayCount)) {
          record.delayCount = 0;
          record.trigger = 2;
          emit('auto-close');
        }
      }
      let changed = false;
      if (record.trigger === 1 || record.trigger === 2) {
        const direction = record.trigger;
        record.trigger = 0;
        if (record.direction !== 3 && record.direction !== direction) { record.direction = direction; changed = true; }
        emit('trigger');
      } else if (record.trigger === 3 && record.direction === 0) {
        record.direction = 3; record.trigger = 0; emit('trigger');
      } else if (record.trigger === 4 && record.direction === 3) {
        record.direction = 0; record.trigger = 0; emit('trigger');
      }
      if (record.direction !== 1 && record.direction !== 2) continue;
      const blocking = (word & 2) !== 0;
      const type = (word & BLOCK) >>> 11;
      const variant = (word & VARIANT) >>> 23;
      if (blocking && type !== 20 && type !== 21) {
        record.direction = 0; diagnostics.add('non-door-obstruction'); emit('obstructed'); continue;
      }
      if (record.direction === 1) {
        // Source leaves opening direction set if the block was already absent.
        if (!blocking) continue;
        if (variant === 10) {
          record.delayCount = 0; record.direction = 0; word = (word & ~BLOCK) >>> 0;
          emit('opened'); if (!i.onLift) emit('sound-request', 4);
          continue;
        }
      } else if (blocking && variant === 0) {
        record.direction = 0; emit('closed'); if (!i.onLift) emit('sound-request', 4);
        continue;
      }
      if (record.direction === 2 && !blocking) {
        word = (word & ~VARIANT) >>> 0;
        emit('clear-open-variant');
      }
      // These source branches skip the first variant write while on a lift.
      if (changed) {
        if (i.onLift) { diagnostics.add('lift-skipped-variant'); continue; }
        emit('sound-request', 5);
      }
      if (record.direction === 1) word = ((word & ~VARIANT) | ((variant + 1) << 23)) >>> 0;
      else word = ((word & ~(VARIANT | BLOCK)) | ((blocking ? variant - 1 : 9) << 23) | record.storedType) >>> 0;
      emit('variant'); emit('redraw-request');
    }
  }
  return Object.freeze({ status: 'candidate', candidate: Object.freeze({ ...snapshot(), counter }), steps,
    effects: Object.freeze(effects), diagnostics: Object.freeze([...diagnostics]) });
}
