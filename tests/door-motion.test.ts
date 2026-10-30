import { describe, expect, it } from 'vitest';
import { transitionDoorMotion, type DoorMotionInput, type DoorRecord } from '../src/world/door-motion';

const doorWord = (type = 20, variant = 0) => type * 2048 + 2 + variant * 8388608;
function fixture(record: Partial<DoorRecord> = {}, rest: Partial<DoorMotionInput> = {}): DoorMotionInput {
  return { record: { position: 4, trigger: 0, direction: 0, storedType: doorWord(), delay: 255, delayCount: 0, key: 23, buttonOnly: 254, ...record },
    target: { position: 4, word: doorWord() }, counter: 7, action: 0, onLift: false, ...rest };
}
function run(input = fixture()) {
  const result = transitionDoorMotion(input);
  if (result.status !== 'candidate') throw new Error(result.reason);
  return result;
}
const at = (word: number) => ({ position: 4, word });

describe('source door scheduler and storage boundaries', () => {
  it.each([[0, 0, 0], [6, 0, 6], [7, 1, 1], [11, 1, 5], [12, 2, 0], [13, 2, 1],
    [32767, 5461, 1], [32768, 5461, 2], [32773, 5462, 1], [32774, 0, 32774], [65535, 0, 65535]])('counter %i produces %i steps, remainder %i', (counter, steps, remainder) => {
    const result = run(fixture({}, { counter }));
    expect(result.steps).toBe(steps); expect(result.candidate.counter).toBe(remainder);
  });
  it('zero position skips the record, including pending triggers and delay', () => {
    const input = fixture({ position: 0, trigger: 1, delay: 0 }, { target: { position: 0, word: 0 } });
    expect(run(input).candidate.record).toEqual(input.record);
    expect(run(input).diagnostics).toEqual(['inactive-position']);
  });
  it.each([128, 129, 254, 255])('negative raw delay %i disables auto-close', delay => {
    expect(run(fixture({ delay, delayCount: 99 }, { target: at(0) })).candidate.record.delayCount).toBe(99);
  });
  it.each([[0, 0, 0, 2], [2, 0, 1, 0], [2, 1, 0, 2], [127, 126, 0, 2],
    [127, 127, 128, 0], [0, 254, 255, 0], [0, 255, 0, 2]])('signed delay/count %i/%i -> %i, direction %i', (delay, delayCount, count, direction) => {
    const result = run(fixture({ delay, delayCount }, { target: at(0) }));
    expect(result.candidate.record.delayCount).toBe(count);
    expect(result.candidate.record.direction).toBe(direction);
  });
  it('blocking bit suppresses delay even on a non-door', () => {
    expect(run(fixture({ delay: 0, delayCount: 255 }, { target: at(2) })).candidate.record.delayCount).toBe(255);
  });
  it('auto-close overwrites an existing trigger before processing it', () => {
    const result = run(fixture({ delay: 1, trigger: 1 }, { target: at(0) }));
    expect(result.candidate.record.direction).toBe(2);
    expect(result.effects.map(e => e.kind)).toEqual(['delay-count', 'auto-close', 'trigger', 'clear-open-variant', 'sound-request', 'variant', 'redraw-request']);
  });
});

describe('trigger actions and motion', () => {
  it('exhaustive variant oracle uses arithmetic fields for both normal types', () => {
    for (const type of [20, 21]) for (let variant = 0; variant <= 10; variant++) {
      const opening = run(fixture({ direction: 1 }, { target: at(doorWord(type, variant)) }));
      const closing = run(fixture({ direction: 2, storedType: doorWord(type) }, { target: at(doorWord(type, variant)) }));
      expect(opening.candidate.word).toBe(variant < 10 ? doorWord(type, variant + 1) : 10 * 8388608);
      expect(opening.candidate.record.direction).toBe(variant === 10 ? 0 : 1);
      expect(closing.candidate.word).toBe(doorWord(type, Math.max(variant - 1, 0)));
      expect(closing.candidate.record.direction).toBe(variant === 0 ? 0 : 2);
    }
  });
  it('trigger matrix preserves pending lock/unlock and consumes open/close', () => {
    const expectedDirections = [[0, 1, 2, 3, 0], [1, 1, 2, 1, 1], [2, 1, 2, 2, 2], [3, 3, 3, 3, 0]];
    for (let direction = 0; direction < 4; direction++) for (let trigger = 0; trigger < 5; trigger++) {
      const result = run(fixture({ direction, trigger }, { target: at(doorWord(20, 5)) }));
      const pending = (trigger === 3 && direction !== 0) || (trigger === 4 && direction !== 3);
      expect(result.candidate.record.trigger).toBe(pending ? trigger : 0);
      expect(result.candidate.record.direction).toBe(expectedDirections[direction]?.[trigger]);
    }
  });
  it.each([14, 15, 16, 17, 18])('applies button action %i even before the scheduler is due', action => {
    const direction = action === 18 ? 3 : 0;
    const result = run(fixture({ direction }, { action, counter: 6 }));
    expect(result.candidate.record.trigger).toBe(({ 14: 1, 15: 2, 16: 1, 17: 3, 18: 4 })[action]);
    expect(result.steps).toBe(0);
  });
  it('toggle only tests opening direction; lock/unlock preserve irrelevant pending triggers', () => {
    expect(run(fixture({ direction: 1 }, { action: 16, counter: 0 })).candidate.record.trigger).toBe(2);
    expect(run(fixture({ direction: 3, trigger: 2 }, { action: 17, counter: 0 })).candidate.record.trigger).toBe(2);
    expect(run(fixture({ trigger: 3 }, { action: 18, counter: 0 })).candidate.record.trigger).toBe(3);
  });
  it.each([1, 2])('locked door consumes trigger %i without motion', trigger => {
    const result = run(fixture({ direction: 3, trigger }));
    expect(result.candidate.record).toMatchObject({ trigger: 0, direction: 3 });
    expect(result.candidate.word).toBe(doorWord());
  });
  it('lock remains pending while moving, then locks on the next stopped step', () => {
    const first = run(fixture({ direction: 1, trigger: 3 }, { target: at(doorWord(20, 10)) }));
    expect(first.candidate.record).toMatchObject({ trigger: 3, direction: 0 });
    expect(run(fixture(first.candidate.record, { target: at(first.candidate.word) })).candidate.record).toMatchObject({ trigger: 0, direction: 3 });
  });
  it('unlock remains pending unless locked; locked unlock stops immediately', () => {
    expect(run(fixture({ trigger: 4 })).candidate.record.trigger).toBe(4);
    expect(run(fixture({ trigger: 4, direction: 3 })).candidate.record).toMatchObject({ trigger: 0, direction: 0 });
  });
  it.each([20, 21])('type %i opens through ten variants, then erases only block bits', type => {
    const extra = 0x900800e9;
    const result = run(fixture({ trigger: 1, storedType: doorWord(type) }, { counter: 66, target: at((doorWord(type) | extra) >>> 0) }));
    expect(result.steps).toBe(11);
    expect(result.candidate.word).toBe((extra | 10 * 8388608) >>> 0);
    expect(result.candidate.record).toMatchObject({ direction: 0, trigger: 0, delayCount: 0, key: 23, buttonOnly: 254 });
    expect(result.effects.filter(e => e.kind === 'redraw-request')).toHaveLength(10);
    expect(result.effects.filter(e => e.kind === 'sound-request').map(e => e.sample)).toEqual([5, 4]);
  });
  it('closing from empty starts at variant nine; variant zero stops one step later', () => {
    const first = run(fixture({ trigger: 2 }, { target: at(10 * 8388608) }));
    expect(first.candidate.word).toBe(doorWord(20, 9));
    const last = run(fixture({ direction: 2 }, { counter: 60, target: at(first.candidate.word) }));
    expect(last.candidate.word).toBe(doorWord());
    expect(last.candidate.record.direction).toBe(0);
  });
  it('restores stored opaque and unrelated bits by OR, without forcing opacity', () => {
    for (const stored of [doorWord(), doorWord(21) + 64 + 0x80000000]) {
      const result = run(fixture({ trigger: 2, storedType: stored }, { target: at(0x10080001) }));
      expect(result.candidate.word).toBe((0x10080001 | stored | 9 * 8388608) >>> 0);
    }
  });
  it.each([0, 1, 2, 19, 22, 63])('non-door blocking type %i stops motion', type => {
    const result = run(fixture({ trigger: 1 }, { target: at(doorWord(type, 4)) }));
    expect(result.candidate.record.direction).toBe(0);
    expect(result.candidate.word).toBe(doorWord(type, 4));
    expect(result.diagnostics).toContain('non-door-obstruction');
  });
  it('opening an already absent block retains opening direction', () => {
    expect(run(fixture({ trigger: 1 }, { target: at(0) })).candidate.record.direction).toBe(1);
  });
  it('direction changes request sound; repeated direction does not', () => {
    expect(run(fixture({ direction: 1, trigger: 2 }, { target: at(doorWord(20, 5)) })).candidate.word).toBe(doorWord(20, 4));
    expect(run(fixture({ direction: 1, trigger: 1 })).effects.some(e => e.kind === 'sound-request')).toBe(false);
  });
  it('lift flag skips first variant write, including source pre-clear on closure', () => {
    const opening = run(fixture({ trigger: 1 }, { onLift: true }));
    expect(opening.candidate.word).toBe(doorWord());
    expect(opening.effects.some(e => e.kind === 'sound-request')).toBe(false);
    const closing = run(fixture({ trigger: 2 }, { onLift: true, target: at(10 * 8388608 + 64) }));
    expect(closing.candidate.word).toBe(64);
    expect(closing.candidate.record.direction).toBe(2);
    expect(run(fixture(closing.candidate.record, { onLift: true, target: at(64) })).candidate.word).toBe(doorWord(20, 9) + 64);
  });
  it('independent bit oracle preserves every bit outside block/variant during closure', () => {
    const mutableBits = new Set([1, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27]);
    for (let bit = 0; bit < 32; bit++) {
      if (mutableBits.has(bit)) continue;
      const word = (doorWord(20, 5) + 2 ** bit) >>> 0;
      const result = run(fixture({ direction: 2 }, { target: at(word) }));
      expect(Math.floor(result.candidate.word / 2 ** bit) % 2).toBe(1);
    }
  });
});

describe('atomic validation and ownership', () => {
  it.each([-1, 65536, NaN, 1.5, '7'])('rejects counter %s without candidate', counter => {
    expect(transitionDoorMotion(fixture({}, { counter: counter as number }))).toMatchObject({ status: 'refused', candidate: null });
  });
  it.each([1, 13, 19, -1, '14'])('rejects action %s', action => {
    expect(transitionDoorMotion(fixture({}, { action: action as number })).status).toBe('refused');
  });
  it.each([{ position: 2 }, { position: 42320 }, { trigger: 5 }, { direction: 4 }, { delay: -1 },
    { delayCount: 256 }, { key: '0' }, { buttonOnly: undefined }, { storedType: doorWord(19) }, { storedType: doorWord(20, 1) }])('refuses unsupported record %j', record => {
    expect(transitionDoorMotion(fixture(record as Partial<DoorRecord>)).status).toBe('refused');
  });
  it('rejects target mismatch, unknown variant, arrays, extra fields and nonplain records', () => {
    const cases = [fixture({}, { target: { position: 8, word: 0 } }), fixture({}, { target: at(doorWord(20, 11)) }),
      { ...fixture(), extra: 0 }, { ...fixture(), record: [] }, { ...fixture(), record: new Date() },
      { ...fixture(), target: { ...at(0), [Symbol('extra')]: 1 } }];
    for (const input of cases) expect(transitionDoorMotion(input as DoorMotionInput)).toMatchObject({ status: 'refused', candidate: null });
  });
  it('does not invoke accessor fields at any input level', () => {
    for (const level of ['root', 'record', 'target']) {
      let calls = 0;
      const input = fixture();
      const object = level === 'root' ? input : input[level as 'record' | 'target'];
      Object.defineProperty(object, level === 'root' ? 'counter' : 'position', { enumerable: true, get() { calls++; throw new Error('getter'); } });
      expect(transitionDoorMotion(input).status).toBe('refused'); expect(calls).toBe(0);
    }
  });
  it('accepts null prototypes; returns detached deeply frozen candidates and dense effects', () => {
    const input = fixture({ trigger: 1 });
    const before = structuredClone(input);
    Object.setPrototypeOf(input.record, null);
    const result = run(input);
    expect({ ...input.record }).toEqual(before.record);
    expect(result.candidate.record).not.toBe(input.record);
    expect(Object.isFrozen(result.candidate.record)).toBe(true);
    expect(Object.isFrozen(result.candidate)).toBe(true);
    expect(Object.isFrozen(result.effects)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    for (const effect of result.effects) {
      expect(Object.isFrozen(effect)).toBe(true); expect(Object.isFrozen(effect.state.record)).toBe(true);
    }
    expect(result.effects.map((_, index) => Object.hasOwn(result.effects, index))).not.toContain(false);
  });
  it('refusal leaves the input unchanged', () => {
    const input = fixture({ trigger: 7 }); const before = structuredClone(input);
    expect(transitionDoorMotion(input).candidate).toBeNull(); expect(input).toEqual(before);
  });
});
