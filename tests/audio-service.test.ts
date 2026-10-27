import { expect, test, vi } from 'vitest';
import { AudioDecodeError, AudioService } from '../src/platform/audio-service';

function fixture(maxEffectVoices = 2) {
  const sources: { buffer: AudioBuffer | null; onended: (() => void) | null; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const gains: { gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const listeners = new Set<() => void>();
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    createGain: () => { const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(gain); return gain; },
    createBufferSource: () => {
      const source = { buffer: null, onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      sources.push(source); return source;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
    decodeAudioData: vi.fn(async () => buffer),
  };
  const buffer = { duration: 10 } as AudioBuffer;
  const service = new AudioService({ maxEffectVoices, contextFactory: () => context as unknown as AudioContext });
  return { service, context, buffer, sources, gains, listeners };
}

test('playback is synchronous and never queued before activation or while paused', async () => {
  const f = fixture();
  expect(f.service.status.context).toBe('uninitialized');
  expect(f.service.playEffect(f.buffer)).toBe(false);
  await f.service.activate();
  expect(f.sources).toHaveLength(0);
  f.service.playEffect(f.buffer);
  await f.service.pause();
  expect(f.sources[0]!.stop).toHaveBeenCalledOnce();
  expect(f.service.playEffect(f.buffer)).toBe(false);
  await f.service.activate();
  expect(f.sources).toHaveLength(1);
});

test('voice stealing stops oldest; natural completion disconnects and frees capacity', async () => {
  const f = fixture(); await f.service.activate();
  for (let i = 0; i < 3; i++) f.service.playEffect(f.buffer);
  expect(f.service.status.effectVoices).toBe(2);
  expect(f.sources[0]!.stop).toHaveBeenCalledOnce();
  expect(f.sources[0]!.disconnect).toHaveBeenCalledOnce();
  expect(f.sources[0]!.onended).toBeNull();
  f.sources[1]!.onended!();
  expect(f.sources[1]!.disconnect).toHaveBeenCalledOnce();
  expect(f.service.status.effectVoices).toBe(1);
});

test('music replacement, pause offset and natural end retain only the current source', async () => {
  const f = fixture(); await f.service.activate();
  f.service.playMusic(f.buffer); f.context.currentTime = 2;
  f.service.playMusic(f.buffer);
  expect(f.sources[0]!.stop).toHaveBeenCalledOnce();
  f.context.currentTime = 5;
  await f.service.pause();
  expect(f.service.status.music).toBe('paused');
  await f.service.activate();
  expect(f.sources[2]!.start).toHaveBeenCalledWith(0, 3);
  f.sources[2]!.onended!();
  expect(f.service.status.music).toBe('stopped');
});

test('external suspend drops effects and holds music until explicit activation', async () => {
  const f = fixture(); await f.service.activate();
  f.service.playEffect(f.buffer); f.service.playMusic(f.buffer);
  f.context.currentTime = 1; f.context.state = 'suspended';
  for (const listener of f.listeners) listener();
  expect(f.service.status).toMatchObject({ active: false, effectVoices: 0, music: 'paused' });
  f.context.state = 'running'; for (const listener of f.listeners) listener();
  expect(f.service.playEffect(f.buffer)).toBe(false);
  await f.service.activate();
  expect(f.sources[2]!.start).toHaveBeenCalledWith(0, 1);
});

test('activation catches suspension before its statechange event is delivered', async () => {
  const f = fixture(); await f.service.activate();
  f.service.playEffect(f.buffer); f.service.playMusic(f.buffer);
  f.context.currentTime = 2; f.context.state = 'suspended';
  await f.service.activate();
  expect(f.service.status.effectVoices).toBe(0);
  expect(f.sources[0]!.stop).toHaveBeenCalledOnce();
  expect(f.sources[2]!.start).toHaveBeenCalledWith(0, 2);
});

test.each([false, true])('suspension during running activation holds sources (statechange first: %s)', async eventFirst => {
  const f = fixture(); await f.service.activate();
  f.service.playEffect(f.buffer); f.service.playMusic(f.buffer); f.context.currentTime = 2;
  const activation = f.service.activate();
  f.context.state = 'suspended';
  if (eventFirst) for (const listener of f.listeners) listener();
  expect(await activation).toBe(false);
  expect(f.service.status).toMatchObject({ active: false, effectVoices: 0, music: 'paused' });
  expect(f.sources.every(source => source.stop.mock.calls.length === 1 && source.disconnect.mock.calls.length === 1)).toBe(true);
  await f.context.resume(); for (const listener of f.listeners) listener();
  expect(f.service.status).toMatchObject({ active: false, effectVoices: 0, music: 'paused' });
  expect(f.sources).toHaveLength(2);
  await f.service.activate();
  expect(f.sources).toHaveLength(3);
  expect(f.sources[2]!.start).toHaveBeenCalledWith(0, 2);
});

test.each(['stop', 'pause', 'dispose'] as const)('%s cancels a pending activation without delayed music', async action => {
  const f = fixture(); await f.service.activate(); f.service.playMusic(f.buffer); await f.service.pause();
  let finish!: () => void;
  f.context.resume.mockImplementation(() => new Promise<void>(resolve => { finish = () => { f.context.state = 'running'; resolve(); }; }));
  const activation = f.service.activate();
  await f.service[action](); finish();
  expect(await activation).toBe(false);
  expect(f.sources).toHaveLength(1);
  expect(f.service.status.active).toBe(false);
});

test('failed decode is recoverable; successful decode alone does not play', async () => {
  const f = fixture();
  f.context.decodeAudioData.mockRejectedValueOnce(new Error('bad data'));
  await expect(f.service.decode(new Blob(['bad']))).rejects.toBeInstanceOf(AudioDecodeError);
  expect(await f.service.decode(new Blob(['good']))).toBe(f.buffer);
  expect(f.sources).toHaveLength(0);
  await f.service.activate(); expect(f.service.playEffect(f.buffer)).toBe(true);
});

test('mix values work before graph creation, mute preserves them, and cleanup closes once', async () => {
  const f = fixture();
  f.service.setEffectsGain(0.2); f.service.setMusicGain(0.3); f.service.setMuted(true);
  await f.service.activate();
  expect(f.gains.map(gain => gain.gain.value)).toEqual([0.2, 0.3, 0]);
  f.service.setMuted(false); expect(f.gains[2]!.gain.value).toBe(1);
  for (const value of [NaN, Infinity, -0.1, 1.1]) expect(() => f.service.setMusicGain(value)).toThrow(RangeError);
  f.service.playEffect(f.buffer); f.service.playMusic(f.buffer);
  await f.service.dispose(); await f.service.dispose();
  expect(f.context.close).toHaveBeenCalledOnce();
  expect(f.listeners.size).toBe(0);
  expect(f.gains.every(gain => gain.disconnect.mock.calls.length === 1)).toBe(true);
  expect(f.service.status).toMatchObject({ disposed: true, effectVoices: 0, music: 'stopped' });
  expect(f.service.playEffect(f.buffer)).toBe(false);
  await expect(f.service.activate()).rejects.toThrow('disposed');
});

test('dispose rejects late decoding and activation failure can be retried', async () => {
  const f = fixture();
  f.context.resume.mockRejectedValueOnce(new Error('activation denied'));
  await expect(f.service.activate()).rejects.toThrow('activation denied');
  expect(await f.service.activate()).toBe(true);
  let finish!: (value: AudioBuffer) => void;
  f.context.decodeAudioData.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const decode = f.service.decode(new Blob(['pending']));
  await Promise.resolve();
  await f.service.dispose(); finish(f.buffer);
  await expect(decode).rejects.toThrow('disposed');
});

test('voice count configuration is bounded', () => {
  for (const maxEffectVoices of [0, 65, NaN, 1.5]) expect(() => new AudioService({ maxEffectVoices })).toThrow(RangeError);
});
