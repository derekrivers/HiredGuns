import type { Action, PlayerCommand } from '../contracts';

export interface PadSnapshot { index: number; id: string; connected: boolean; mapping: string; axes: readonly number[]; buttons: readonly { pressed: boolean }[] }
export type InputSource = { kind: 'keyboard'; index: number } | { kind: 'gamepad'; index: number; id: string } | null;
export const KEY_GROUPS: ReadonlyArray<ReadonlyArray<[string, Action]>> = [
  [['KeyW', 'forward'], ['KeyS', 'backward'], ['KeyA', 'strafe-left'], ['KeyD', 'strafe-right'], ['KeyQ', 'turn-left'], ['KeyE', 'turn-right']],
  [['KeyI', 'forward'], ['KeyK', 'backward'], ['KeyJ', 'strafe-left'], ['KeyL', 'strafe-right'], ['KeyU', 'turn-left'], ['KeyO', 'turn-right']],
  [['ArrowUp', 'forward'], ['ArrowDown', 'backward'], ['ArrowLeft', 'strafe-left'], ['ArrowRight', 'strafe-right'], ['Comma', 'turn-left'], ['Period', 'turn-right']],
  [['Numpad8', 'forward'], ['Numpad5', 'backward'], ['Numpad4', 'strafe-left'], ['Numpad6', 'strafe-right'], ['Numpad7', 'turn-left'], ['Numpad9', 'turn-right']],
];
const sameSource = (a: InputSource, b: InputSource) => a !== null && b !== null && a.kind === b.kind && a.index === b.index;

export function padAction(pad: PadSnapshot): Action | null {
  if (!pad.connected || pad.mapping !== 'standard') return null;
  const pressed = (n: number) => pad.buttons[n]?.pressed === true;
  if (pressed(4)) return 'strafe-left';
  if (pressed(5)) return 'strafe-right';
  if (pressed(12)) return 'forward';
  if (pressed(13)) return 'backward';
  if (pressed(14)) return 'turn-left';
  if (pressed(15)) return 'turn-right';
  const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
  if (Math.abs(y) >= Math.abs(x) && Math.abs(y) > 0.55) return y < 0 ? 'forward' : 'backward';
  if (Math.abs(x) > 0.55) return x < 0 ? 'turn-left' : 'turn-right';
  return null;
}

export class InputRouter {
  readonly assignments: InputSource[] = [0, 1, 2, 3].map(index => ({ kind: 'keyboard', index }));
  private last = new Map<number, { action: Action; tick: number }>();
  assign(mercenaryId: number, source: InputSource): void {
    if (!Number.isInteger(mercenaryId) || mercenaryId < 0 || mercenaryId > 3) throw new Error('Invalid assignment');
    if (source && (!Number.isInteger(source.index) || source.index < 0 || (source.kind === 'keyboard' && source.index > 3))) throw new Error('Invalid input source');
    this.assignments.forEach((old, i) => { if (sameSource(old, source)) { this.assignments[i] = null; this.last.delete(i); } });
    this.assignments[mercenaryId] = source;
    this.last.delete(mercenaryId);
  }
  reset(): void { this.last.clear(); }
  commands(tick: number, keys: ReadonlySet<string>, pads: readonly PadSnapshot[]): PlayerCommand[] {
    const result: PlayerCommand[] = [];
    this.assignments.forEach((source, mercenaryId) => {
      let action: Action | null = null;
      if (source?.kind === 'keyboard') action = KEY_GROUPS[source.index]!.find(([key]) => keys.has(key))?.[1] ?? null;
      if (source?.kind === 'gamepad') {
        const pad = pads.find(p => p.index === source.index && p.id === source.id);
        if (pad) action = padAction(pad);
      }
      if (!action) { this.last.delete(mercenaryId); return; }
      const last = this.last.get(mercenaryId);
      if (!last || last.action !== action || tick - last.tick >= 8) {
        result.push({ mercenaryId, action }); this.last.set(mercenaryId, { action, tick });
      }
    });
    return result;
  }
}
