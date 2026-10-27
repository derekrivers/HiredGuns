/** Arithmetic projections only. No supplied field establishes original source/layout authority. */
export interface Mouse0Point { x: number; y: number }
export interface Mouse0Rectangle { left: number; top: number; right: number; bottom: number }
export interface Mouse0Actor {
  control: number; action: number; window: number; dead: number; statsDead: number;
  fitness: number; party: number; current: number; old: number;
  aux: number; usingGrenade: number; behindPushable: number;
  /** Complete remaining bytes, in storage order, with the projected fields omitted. */
  runtimeOpaque: number[]; statsOpaque: number[];
}
export interface Mouse0SelectionInput {
  selected: number; lastImage: number; baseImage: number;
  left: number; right: number; oldLeft: number; oldRight: number;
  mode: number; mouseAction: number; leaders: number[]; redraw: number;
  actors: Mouse0Actor[];
  /** The remaining initialized global bytes; no live memory or renderer reference. */
  globalsOpaque: number[];
  layout: {
    origin: Mouse0Point; pointer: Mouse0Point; views: Mouse0Point[];
    /** Complete window-0/no-aux rectangle projection, including inclusive endpoints. */
    gadgets: Mouse0Rectangle[];
  };
}
export interface Mouse0SelectionWrite {
  kind: 'write'; target: 'selected' | 'lastImage'; width: 2 | 4; before: number; after: number;
}
export interface Mouse0SelectionResult { candidate: Mouse0SelectionInput; records: Mouse0SelectionWrite[] }

const uint = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
const sint = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= -32768 && n <= 32767;
function fail(): never { throw new Error('Unsupported or malformed bounded mouse-0 selection projection.'); }

// Read descriptors, never a caller getter. Reject inherited, hidden, symbol and extra data.
function object(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== fields.length) fail();
  const copy: Record<string, unknown> = {};
  for (const field of fields) {
    const d = Object.getOwnPropertyDescriptor(value, field);
    if (!d || !('value' in d) || !d.enumerable) fail();
    copy[field] = d.value;
  }
  return copy;
}
function array(value: unknown, count: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertyDescriptor(value, 'length')?.value !== count || Reflect.ownKeys(value).length !== count + 1) fail();
  return Array.from({ length: count }, (_, i) => {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d) || !d.enumerable) fail();
    return d.value as unknown;
  });
}
function bytes(value: unknown, count: number): number[] {
  const copy = array(value, count);
  if (!copy.every(n => uint(n, 255))) fail();
  return copy as number[];
}
function point(value: unknown, unsigned = false): Mouse0Point {
  const p = object(value, ['x', 'y']);
  if (!(unsigned ? uint(p.x, 65535) && uint(p.y, 65535) : sint(p.x) && sint(p.y))) fail();
  return p as unknown as Mouse0Point;
}

function snapshot(input: Mouse0SelectionInput): Mouse0SelectionInput {
  const s = object(input, ['selected', 'lastImage', 'baseImage', 'left', 'right', 'oldLeft', 'oldRight', 'mode', 'mouseAction', 'leaders', 'redraw', 'actors', 'globalsOpaque', 'layout']);
  for (const key of ['selected', 'left', 'right', 'oldLeft', 'oldRight', 'mode', 'mouseAction']) if (!uint(s[key], 65535)) fail();
  if (!uint(s.lastImage, 0xffffffff) || !uint(s.baseImage, 0xffffffff) || !uint(s.redraw, 255)) fail();
  const leaders = array(s.leaders, 2);
  if (!leaders.every(n => uint(n, 65535) && n === 0)) fail();
  const actors = array(s.actors, 4).map((value, i) => {
    const a = object(value, ['control', 'action', 'window', 'dead', 'statsDead', 'fitness', 'party', 'current', 'old', 'aux', 'usingGrenade', 'behindPushable', 'runtimeOpaque', 'statsOpaque']);
    for (const key of ['window', 'dead', 'statsDead', 'fitness', 'party', 'aux', 'usingGrenade', 'behindPushable']) if (!uint(a[key], 65535)) fail();
    if (!uint(a.control, 255) || !uint(a.action, 255) || !uint(a.current, 0xffffffff) || !uint(a.old, 0xffffffff)) fail();
    const runtimeOpaque = bytes(a.runtimeOpaque, 1484), statsOpaque = bytes(a.statsOpaque, 142);
    if (a.party !== i || a.action !== 0 || a.window !== 0 || a.aux !== 0 || a.usingGrenade !== 0 || a.behindPushable !== 0 ||
        a.dead !== (i === 0 ? 0xff00 : 0) || a.statsDead !== (i === 0 ? 0xff00 : 0) ||
        a.fitness !== (i === 0 ? 654 : 65535) || (i !== 1 && a.control !== 5) ||
        (i === 0 ? a.old !== a.current : a.old !== a.current - 4)) fail();
    return { ...a, runtimeOpaque, statsOpaque } as unknown as Mouse0Actor;
  });
  if (actors.some((a, i) => a.current !== actors[0]!.current + i * 4)) fail();
  const globalsOpaque = bytes(s.globalsOpaque, 2335);
  const l = object(s.layout, ['origin', 'pointer', 'views', 'gadgets']);
  const origin = point(l.origin), pointer = point(l.pointer, true), views = array(l.views, 4).map(v => point(v));
  const gadgets = array(l.gadgets, 11).map(value => {
    const g = object(value, ['left', 'top', 'right', 'bottom']);
    if (![g.left, g.top, g.right, g.bottom].every(sint) || (g.left as number) < 0 ||
        (g.left as number) > (g.right as number) || (g.top as number) > (g.bottom as number)) fail();
    return g as unknown as Mouse0Rectangle;
  });
  // This admits only a top-right view in an initialized regular four-view projection.
  // Reject signed arithmetic wrap instead of inventing behavior beyond the observed point.
  const [a, b, c, d] = views as [Mouse0Point, Mouse0Point, Mouse0Point, Mouse0Point];
  if (a.x !== c.x || b.x !== d.x || a.y !== b.y || c.y !== d.y || a.x >= b.x || a.y >= c.y) fail();
  const x = pointer.x - origin.x, y = pointer.y - origin.y;
  const localX = x - b.x, localY = y - b.y;
  if (![x, y, localX, localY].every(sint) || x < b.x || y >= d.y || localX < 0 || localY < 0) fail();
  if (gadgets.some(g => g.left <= localX && localX <= g.right && g.top <= localY && localY <= g.bottom)) fail();
  if (s.selected !== 1 || s.lastImage !== 0 || s.oldLeft !== 0 || s.oldRight !== 0 || s.mouseAction !== 0 || s.redraw !== 255) fail();
  const left = s.left as number, right = s.right as number, mode = s.mode as number, control = actors[1]!.control;
  const decision = (control === 5 && mode === 1 && ((left === 0 && right === 0) || (left === 1 && right === 0) || (left === 0 && right === 1))) ||
    (left === 1 && right === 0 && ((control === 1 && mode === 1) || (control === 5 && mode === 2)));
  if (!decision) fail();
  return { ...s, leaders, actors, globalsOpaque, layout: { origin, pointer, views, gadgets } } as unknown as Mouse0SelectionInput;
}

/** Exactly five observed decisions; a detached candidate and inert writes, never hardware effects. */
export function transitionMouse0Selection(input: Mouse0SelectionInput): Mouse0SelectionResult {
  const candidate = snapshot(input), records: Mouse0SelectionWrite[] = [];
  if (candidate.actors[1]!.control === 5 && candidate.mode === 1 && (candidate.left === 1 || candidate.right === 1)) {
    records.push({ kind: 'write', target: 'selected', width: 2, before: candidate.selected, after: 2 });
    candidate.selected = 2;
  }
  records.push({ kind: 'write', target: 'lastImage', width: 4, before: candidate.lastImage, after: candidate.baseImage });
  candidate.lastImage = candidate.baseImage;
  return { candidate, records };
}
