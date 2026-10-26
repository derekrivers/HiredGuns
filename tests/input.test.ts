import { expect, test } from 'vitest';
import { InputRouter, padAction, type PadSnapshot } from '../src/input/router';
const pad = (index: number, y = -1): PadSnapshot => ({ index, id: `pad-${index}`, connected: true, mapping: 'standard', axes: [0, y], buttons: [] });
test('four distinct pads independently command all four mercenaries', () => {
  const router = new InputRouter();
  for (let i = 0; i < 4; i++) router.assign(i, { kind: 'gamepad', index: i, id: `pad-${i}` });
  expect(router.commands(0, new Set(), [0, 1, 2, 3].map(i => pad(i))).map(c => c.mercenaryId)).toEqual([0, 1, 2, 3]);
});
test('keyboard reassignment gives one person team control without duplicate ownership', () => {
  const router = new InputRouter(); router.assign(3, { kind: 'keyboard', index: 0 });
  expect(router.assignments[0]).toBeNull();
  expect(router.commands(0, new Set(['KeyW']), [])).toEqual([{ mercenaryId: 3, action: 'forward' }]);
});
test('dead zone, repeat interval, disconnect, identity changes and reconnect are explicit', () => {
  const router = new InputRouter(); router.assign(0, { kind: 'gamepad', index: 0, id: 'pad-0' });
  expect(padAction(pad(0, 0.2))).toBeNull();
  expect(router.commands(0, new Set(), [pad(0)])).toHaveLength(1);
  expect(router.commands(7, new Set(), [pad(0)])).toHaveLength(0);
  expect(router.commands(8, new Set(), [pad(0)])).toHaveLength(1);
  expect(router.commands(9, new Set(), [{ ...pad(0), connected: false }])).toHaveLength(0);
  expect(router.commands(10, new Set(), [{ ...pad(0), id: 'other' }])).toHaveLength(0);
  expect(router.commands(11, new Set(), [pad(0)])).toHaveLength(1);
  expect(padAction({ ...pad(0), mapping: '' })).toBeNull();
});
