import { describe, expect, it } from 'vitest';
import { transitionButtonBlock, type ButtonBlockInput, type ButtonBlockResult } from '../src/world/button-door-transition';

// Synthetic parameters, deliberately not original map bytes/coordinates.
function input(type = 1): ButtonBlockInput {
  return { panelIndex: 0, panelWord: ((type << 19) | 8 | (3 << 23) | 0x80000001) >>> 0,
    button: { index: 3, fields: { used: 0, actionIn: 4, actionOut: 5, dataIn: 27940, dataOut: 27940 } },
    overlay: { targetIndex: 1, word: 0x80000043, discoveryWord: 0xdead0000, nextPlaneDiscoveryWord: 0 }, targetOccupied: false };
}
function accepted(r: ButtonBlockResult) {
  if (r.status === 'refused') throw new Error(r.reason);
  return r.candidate;
}
function action(i: ButtonBlockInput, value: number, data = 27940): ButtonBlockInput {
  return { ...i, button: { ...i.button, fields: { ...i.button.fields, actionOut: value, dataOut: data } } };
}

describe('source panel dispatch with bounded authored static gate policy', () => {
  it('type 1 uses actionOut even with used=0; type 2 uses actionIn; unknown bits survive', () => {
    const i = input(), before = structuredClone(i);
    const first = transitionButtonBlock(i), c = accepted(first);
    expect(first).toMatchObject({ status: 'applied', action: 5, targetChanged: true });
    expect(c.panelWord).toBe(0x81900009); expect(c.overlay.word).toBe(0x80000001);
    expect(c.overlay.discoveryWord).toBe(0xdead0400);
    const second = transitionButtonBlock({ ...i, ...c });
    expect(second).toMatchObject({ status: 'applied', action: 4 });
    expect(accepted(second).panelWord).toBe(i.panelWord);
    expect(accepted(second).overlay.word).toBe(i.overlay.word);
    expect(i).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(c)).toBe(true); expect(Object.isFrozen(c.overlay)).toBe(true);
  });
  it.each([0, 3])('panel type %i is a no-op even when a stale record has unsupported action', type => {
    const i = action(input(type), 14);
    const r = transitionButtonBlock(i);
    expect(r.status).toBe('panel-noop'); expect(accepted(r)).toEqual({ panelWord: i.panelWord, overlay: i.overlay });
    expect(accepted(r).overlay).not.toBe(i.overlay);
  });
  it('absent panel is noop; used=255 does not activate it', () => {
    const i = input();
    expect(transitionButtonBlock({ ...i, panelWord: 0, button: { ...i.button, fields: { ...i.button.fields, used: 255 } } }).status).toBe('panel-noop');
  });
  it('action zero toggles the panel without dereferencing its arbitrary datum', () => {
    const i = action(input(), 0, 0xffffffff), r = transitionButtonBlock(i);
    expect(r).toMatchObject({ status: 'applied', action: 0, targetChanged: false });
    expect(accepted(r).overlay).toEqual(i.overlay);
  });
  it('repeated block_off on empty target still flips the panel and does not mark discovery', () => {
    const i = input();
    const r = transitionButtonBlock({ ...i, overlay: { ...i.overlay, word: 1 } });
    expect(r).toMatchObject({ status: 'applied', targetChanged: false });
    expect(accepted(r).overlay.discoveryWord).toBe(i.overlay.discoveryWord);
  });
  it('block_on already present still sets opaque/question mark exactly as source does', () => {
    const i = action(input(), 4), r = transitionButtonBlock(i);
    expect(accepted(r).overlay.word).toBe(i.overlay.word);
    expect(accepted(r).overlay.discoveryWord).toBe(0xdead0400);
    const repeated = transitionButtonBlock({ ...i, overlay: accepted(r).overlay });
    expect(repeated).toMatchObject({ status: 'applied', targetChanged: false });
  });
  it('toggle is selected by block presence and deterministically reverses', () => {
    const i = action(input(), 6), open = accepted(transitionButtonBlock(i));
    const close = accepted(transitionButtonBlock(action({ ...i, overlay: open.overlay }, 6)));
    expect(open.overlay.word).toBe(0x80000001); expect(close.overlay.word).toBe(0x80000043);
    expect(transitionButtonBlock(i)).toEqual(transitionButtonBlock(structuredClone(i)));
  });
  it('refuses occupied closure atomically but allows opening while occupied', () => {
    const i = { ...action(input(), 4), targetOccupied: true }, before = structuredClone(i);
    expect(transitionButtonBlock(i)).toEqual({ status: 'refused', reason: 'occupied-target', candidate: null });
    expect(i).toEqual(before);
    expect(transitionButtonBlock({ ...input(), targetOccupied: true }).status).toBe('applied');
  });
  it.each([1, 3, 7, 14, 18, 19, 255])('refuses unsupported action %i without partial panel change', n => {
    const i = action(input(), n), before = structuredClone(i);
    expect(transitionButtonBlock(i)).toEqual({ status: 'refused', reason: 'unsupported-action', candidate: null }); expect(i).toEqual(before);
  });
  it.each([0, 27939, 27941, 70256, 0xffffffff])('refuses mismatched/misaligned/out-of-range datum %i', n => {
    expect(transitionButtonBlock(action(input(), 5, n))).toMatchObject({ status: 'refused', reason: 'target-offset-mismatch', candidate: null });
  });
  it('requires matching variant and separate panel/target cells', () => {
    const i = input();
    expect(transitionButtonBlock({ ...i, button: { ...i.button, index: 4 } })).toMatchObject({ reason: 'button-variant-mismatch' });
    expect(transitionButtonBlock({ ...i, panelIndex: 1 })).toMatchObject({ reason: 'aliased-panel-target-unsupported' });
    expect(transitionButtonBlock({ ...i, panelWord: (i.panelWord | 256) >>> 0 })).toMatchObject({ reason: 'pushable-panel-unsupported' });
  });
  it.each([0x802, 0x1002, 0xa002, 0x102, 0x22, 0x6, 0xa, 0x12])('refuses special block or dynamic target %i', word => {
    const i = input(); expect(transitionButtonBlock({ ...i, overlay: { ...i.overlay, word } })).toMatchObject({ reason: 'nonstatic-target-unsupported', candidate: null });
  });
  it('refuses required next-plane cleanup and top boundary, allows source skip when floor bit set', () => {
    const i = input();
    expect(transitionButtonBlock({ ...i, overlay: { ...i.overlay, nextPlaneDiscoveryWord: 32 } })).toMatchObject({ reason: 'auxiliary-cleanup-required' });
    expect(transitionButtonBlock({ ...i, overlay: { ...i.overlay, nextPlaneDiscoveryWord: 33 } }).status).toBe('applied');
    const top = action(i, 5, 27936 + 10051 * 4);
    expect(transitionButtonBlock({ ...top, overlay: { ...top.overlay, targetIndex: 10051 } })).toMatchObject({ reason: 'next-plane-out-of-bounds' });
  });
  it.each([-1, 10580, 1.5, NaN, Infinity])('refuses invalid cell index %s', panelIndex => {
    expect(transitionButtonBlock({ ...input(), panelIndex })).toMatchObject({ reason: 'invalid-input', candidate: null });
  });
  it('rejects invalid words, extra keys and accessor input without invoking it', () => {
    const i = input(); let reads = 0;
    const bad = { ...i, get panelWord() { reads++; return 8; } };
    expect(transitionButtonBlock(bad)).toMatchObject({ reason: 'invalid-input' }); expect(reads).toBe(0);
    expect(transitionButtonBlock({ ...i, extra: 1 } as ButtonBlockInput)).toMatchObject({ reason: 'invalid-input' });
    expect(transitionButtonBlock({ ...i, overlay: { ...i.overlay, word: 0x100000000 } })).toMatchObject({ reason: 'invalid-input' });
    expect(transitionButtonBlock({ ...i, targetOccupied: undefined } as unknown as ButtonBlockInput)).toMatchObject({ reason: 'invalid-input' });
  });
  it('JSON replay needs no hidden state and retains unselected action parameters', () => {
    const i = input(), serialized = JSON.stringify(i), decoded = JSON.parse(serialized) as ButtonBlockInput;
    expect(transitionButtonBlock(decoded)).toEqual(transitionButtonBlock(i));
    const c = accepted(transitionButtonBlock(decoded));
    expect(transitionButtonBlock(JSON.parse(JSON.stringify({ ...decoded, ...c })) as ButtonBlockInput)).toMatchObject({ action: 4 });
    expect(JSON.stringify(i)).toBe(serialized);
  });
  it('independent bit-by-bit preservation checks cover every unrelated bit on both writes', () => {
    // Expected operated bit positions written explicitly, independent of module masks.
    const erasedOnOff = new Set([1, 6, 11, 12, 13, 14, 15, 16, 19, 20, 3]);
    for (let bit = 0; bit < 32; bit++) {
      if (erasedOnOff.has(bit) || [2, 4, 5, 8].includes(bit)) continue;
      const flag = 2 ** bit, i = input();
      const open = accepted(transitionButtonBlock({ ...i, overlay: { ...i.overlay, word: (67 | flag) >>> 0, discoveryWord: flag } }));
      expect(open.overlay.word).toBe((1 | flag) >>> 0);
      expect(open.overlay.discoveryWord).toBe((flag | 1024) >>> 0);
      const closed = accepted(transitionButtonBlock(action({ ...i, overlay: open.overlay }, 4)));
      expect(closed.overlay.word).toBe((67 | flag) >>> 0);
    }
  });
  it('accepts boundary button variants and target addresses across source planes', () => {
    for (const index of [0, 31]) for (const targetIndex of [1, 528, 529, 10050]) {
      const i = input();
      const next = action({ ...i, panelWord: ((1 << 19) | 8 | (index << 23)) >>> 0,
        button: { ...i.button, index }, overlay: { ...i.overlay, targetIndex } }, 5, 27936 + targetIndex * 4);
      expect(transitionButtonBlock(next).status).toBe('applied');
    }
  });
});
