import { describe, expect, it } from 'vitest';
import { transitionMouse0Selection, type Mouse0SelectionInput } from '../src/character/mouse0-selection';

function fixture(): Mouse0SelectionInput {
  // Authored coordinates, rectangles, references and byte storage. No original table/coordinates.
  return {
    selected: 1, lastImage: 0, baseImage: 900, left: 0, right: 0, oldLeft: 0, oldRight: 0,
    mode: 1, mouseAction: 0, leaders: [0, 0], redraw: 255,
    actors: Array.from({ length: 4 }, (_, i) => ({ control: 5, action: 0, window: 0,
      dead: i === 0 ? 0xff00 : 0, statsDead: i === 0 ? 0xff00 : 0,
      fitness: i === 0 ? 654 : 65535, party: i, current: 100 + i * 4, old: i === 0 ? 100 : 96 + i * 4,
      aux: 0, usingGrenade: 0, behindPushable: 0,
      runtimeOpaque: Array.from({ length: 1484 }, (_, j) => (i + j) % 256),
      statsOpaque: Array.from({ length: 142 }, (_, j) => (i * 2 + j) % 256) })),
    globalsOpaque: Array.from({ length: 2335 }, (_, j) => j % 256),
    layout: { origin: { x: 20, y: 30 }, pointer: { x: 150, y: 45 },
      views: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 80 }, { x: 100, y: 80 }],
      gadgets: Array.from({ length: 11 }, (_, i) => ({ left: i * 2, right: i * 2 + 1, top: 30, bottom: 40 })) },
  };
}
function freeze(value: object): void {
  for (const v of Object.values(value)) if (v && typeof v === 'object') freeze(v);
  Object.freeze(value);
}
describe('disconnected fixed post-death mouse-0 selection', () => {
  it.each([
    ['no buttons', 0, 0, 5, 1, 1], ['left', 1, 0, 5, 1, 2], ['right', 0, 1, 5, 1, 2],
    ['wrong device', 1, 0, 1, 1, 1], ['wrong mode', 1, 0, 5, 2, 1],
  ])('preserves the entire supplied snapshot for %s except exact ordered writes', (_, left, right, control, mode, selected) => {
    const input = fixture();
    Object.assign(input, { left, right, mode }); input.actors[1]!.control = control as number;
    const before = structuredClone(input), expected = structuredClone(input);
    expected.selected = selected as number; expected.lastImage = input.baseImage;
    freeze(input);
    const result = transitionMouse0Selection(input);
    expect(result.candidate).toEqual(expected);
    expect(input).toEqual(before);
    expect(result.records).toEqual([
      ...(selected === 2 ? [{ kind: 'write', target: 'selected', width: 2, before: 1, after: 2 }] : []),
      { kind: 'write', target: 'lastImage', width: 4, before: 0, after: 900 },
    ]);
  });
  it('returns no aliases to any input storage, layout or roster object', () => {
    const input = fixture(), before = structuredClone(input), result = transitionMouse0Selection(input);
    result.candidate.actors[0]!.runtimeOpaque[0] = 255;
    result.candidate.actors[1]!.statsOpaque[0] = 255;
    result.candidate.globalsOpaque[0] = 255;
    result.candidate.layout.views[1]!.x++;
    result.candidate.layout.pointer.x++;
    result.candidate.layout.origin.x++;
    result.candidate.layout.gadgets[0]!.left++;
    result.candidate.leaders[0] = 2;
    result.candidate.actors[2]!.control = 1;
    expect(input).toEqual(before);
  });
  const unsupported: [string, (s: Mouse0SelectionInput) => void][] = [
    ['both buttons', s => { s.left = s.right = 1; }],
    ['other nonzero level', s => { s.left = 2; }],
    ['right wrong device', s => { s.right = 1; s.actors[1]!.control = 1; }],
    ['no buttons wrong mode', s => { s.mode = 2; }],
    ['combined wrong mode/device', s => { s.left = 1; s.mode = 2; s.actors[1]!.control = 1; }],
    ['already selected target', s => { s.selected = 2; }],
    ['alive first actor', s => { s.actors[0]!.dead = 0; }],
    ['dead target', s => { s.actors[1]!.statsDead = 0xff00; }],
    ['leader', s => { s.leaders[0] = 2; }],
    ['window', s => { s.actors[1]!.window = 1; }],
    ['aux table', s => { s.actors[1]!.aux = 1; }],
    ['grenade table', s => { s.actors[1]!.usingGrenade = 1; }],
    ['pushable table', s => { s.actors[1]!.behindPushable = 1; }],
    ['old edge', s => { s.oldLeft = 1; }],
    ['pending action', s => { s.mouseAction = 22; }],
    ['nonfixed current relation', s => { s.actors[2]!.current++; }],
    ['nonfixed old relation', s => { s.actors[0]!.old--; }],
    ['other target view', s => { s.layout.pointer.x = 25; }],
    ['bottom view', s => { s.layout.pointer.y = 150; }],
    ['uninitialized layout', s => { s.layout.views[3]!.y++; }],
    ['wrapped arithmetic', s => { s.layout.pointer.x = 65535; }],
    ['negative local point', s => { s.layout.pointer.y = 29; }],
    ['missing rectangle', s => { s.layout.gadgets.pop(); }],
    ['inverted rectangle', s => { s.layout.gadgets[0]!.right = -1; }],
    ['rectangle sentinel mistaken for data', s => { s.layout.gadgets[0]!.left = -1; }],
    ['gadget interior', s => { Object.assign(s.layout.gadgets[0]!, { left: 29, right: 31, top: 14, bottom: 16 }); }],
    ['inclusive gadget endpoint', s => { Object.assign(s.layout.gadgets[0]!, { left: 30, right: 40, top: 15, bottom: 20 }); }],
    ['uninitialized opaque', s => { s.actors[3]!.runtimeOpaque.pop(); }],
    ['byte overflow', s => { s.actors[3]!.statsOpaque[141] = 256; }],
    ['word overflow', s => { s.mode = 65536; }],
    ['long overflow', s => { s.baseImage = 0x100000000; }],
    ['fraction', s => { s.layout.pointer.y += 0.5; }],
    ['NaN', s => { s.lastImage = NaN; }],
  ];
  it.each(unsupported)('rejects %s atomically', (_, mutate) => {
    const input = fixture(); mutate(input); const before = structuredClone(input);
    expect(() => transitionMouse0Selection(input)).toThrow();
    expect(input).toEqual(before);
  });
  it.each(['accessor', 'inherited', 'symbol', 'hidden', 'extra', 'array accessor', 'array inherited', 'array symbol', 'array hidden'])('rejects %s own-data attacks without calling getters', attack => {
    const input = fixture(); let called = 0;
    if (attack === 'accessor') Object.defineProperty(input.layout.pointer, 'x', { enumerable: true, get: () => { called++; return 150; } });
    if (attack === 'inherited') Object.setPrototypeOf(input.actors[1]!, { trusted: true });
    if (attack === 'symbol') Object.defineProperty(input, Symbol('target'), { value: 1 });
    if (attack === 'hidden') Object.defineProperty(input, 'selected', { enumerable: false });
    if (attack === 'extra') Object.assign(input.layout, { target: 1, noGadget: true });
    if (attack === 'array accessor') Object.defineProperty(input.globalsOpaque, '0', { enumerable: true, get: () => { called++; return 0; } });
    if (attack === 'array inherited') { delete input.actors[0]!.runtimeOpaque[0]; Object.setPrototypeOf(input.actors[0]!.runtimeOpaque, { 0: 1 }); }
    if (attack === 'array symbol') Object.defineProperty(input.leaders, Symbol('leader'), { value: 0 });
    if (attack === 'array hidden') Object.defineProperty(input.layout.views, '0', { enumerable: false });
    expect(() => transitionMouse0Selection(input)).toThrow();
    expect(called).toBe(0);
  });
  it('preserves caller null-prototype own data without trusting it as source identity', () => {
    const input = fixture(); Object.setPrototypeOf(input.layout.origin, null);
    expect(transitionMouse0Selection(input).candidate.layout.origin).toEqual({ x: 20, y: 30 });
  });
});
