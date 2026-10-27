/** Browser-only output state. Never serialize this service into gameplay saves. */
export class AudioDecodeError extends Error {
  constructor(cause: unknown) { super('Could not decode this audio file. Choose a complete supported audio file.', { cause }); }
}

interface MusicPlayback { buffer: AudioBuffer; offset: number; startedAt: number; source: AudioBufferSourceNode | null }

export class AudioService {
  private context: AudioContext | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private effects = new Set<AudioBufferSourceNode>();
  private music: MusicPlayback | null = null;
  private active = false;
  private disposed = false;
  private revision = 0;
  private effectsLevel = 0.7;
  private musicLevel = 0.5;
  private muted = false;

  constructor(private readonly options: { maxEffectVoices?: number; contextFactory?: () => AudioContext } = {}) {
    const limit = options.maxEffectVoices ?? 8;
    if (!Number.isInteger(limit) || limit < 1 || limit > 64) throw new RangeError('Effect voice limit must be 1–64.');
  }

  get status() {
    return { context: this.context?.state ?? 'uninitialized', active: this.active,
      effectVoices: this.effects.size, music: this.music ? (this.music.source ? 'playing' : 'paused') : 'stopped',
      effectsGain: this.effectsLevel, musicGain: this.musicLevel, muted: this.muted, disposed: this.disposed };
  }

  /** Call directly from a user gesture. No effect requests are queued while suspended. */
  async activate(): Promise<boolean> {
    const context = this.getContext();
    // A statechange event may still be queued when the user presses resume.
    if (context.state !== 'running') this.holdPlayback();
    const revision = ++this.revision;
    this.active = false;
    await context.resume();
    if (this.disposed || revision !== this.revision || context.state !== 'running') return false;
    this.active = true;
    if (this.music && !this.music.source) this.startMusic(this.music);
    return true;
  }

  /** Decode only: completion never starts playback. The caller owns the returned buffer. */
  async decode(file: Blob): Promise<AudioBuffer> {
    const context = this.getContext();
    let buffer: AudioBuffer;
    try { buffer = await context.decodeAudioData(await file.arrayBuffer()); }
    catch (cause) { throw new AudioDecodeError(cause); }
    if (this.disposed) throw new Error('Audio service is disposed.');
    return buffer;
  }

  setEffectsGain(value: number): void {
    this.effectsLevel = this.validGain(value);
    if (this.effectsGain) this.effectsGain.gain.value = value;
  }
  setMusicGain(value: number): void {
    this.musicLevel = this.validGain(value);
    if (this.musicGain) this.musicGain.gain.value = value;
  }
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  /** Newest effect wins at capacity; the oldest voice is stopped and disconnected. */
  playEffect(buffer: AudioBuffer): boolean {
    if (!this.canPlay()) return false;
    if (this.effects.size >= (this.options.maxEffectVoices ?? 8)) this.removeEffect(this.effects.values().next().value!);
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.effectsGain!);
    source.onended = () => { this.effects.delete(source); source.disconnect(); };
    this.effects.add(source);
    source.start();
    return true;
  }

  /** One traversal, no inferred loops. A successful call replaces the previous cue. */
  playMusic(buffer: AudioBuffer): boolean {
    if (!this.canPlay()) return false;
    this.clearMusic();
    this.music = { buffer, offset: 0, startedAt: 0, source: null };
    this.startMusic(this.music);
    return true;
  }

  /** Effects are discarded; music keeps its current position for explicit activation. */
  async pause(): Promise<void> {
    this.holdPlayback();
    if (this.context && this.context.state !== 'closed') await this.context.suspend();
  }

  /** Invalidates a pending activation and all retained playback, but retains decoded buffers held by callers. */
  stop(): void {
    ++this.revision;
    this.active = false;
    for (const source of this.effects) this.removeEffect(source);
    this.clearMusic();
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    if (!this.context) return;
    this.context.removeEventListener('statechange', this.onStateChange);
    this.effectsGain!.disconnect(); this.musicGain!.disconnect(); this.masterGain!.disconnect();
    if (this.context.state !== 'closed') await this.context.close();
  }

  private getContext(): AudioContext {
    if (this.disposed) throw new Error('Audio service is disposed.');
    if (!this.context) {
      const context = this.options.contextFactory?.() ?? new AudioContext();
      this.context = context;
      this.effectsGain = context.createGain(); this.musicGain = context.createGain(); this.masterGain = context.createGain();
      this.effectsGain.gain.value = this.effectsLevel; this.musicGain.gain.value = this.musicLevel;
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.effectsGain.connect(this.masterGain); this.musicGain.connect(this.masterGain); this.masterGain.connect(context.destination);
      context.addEventListener('statechange', this.onStateChange);
    }
    return this.context;
  }

  private onStateChange = (): void => {
    if (this.context?.state !== 'running' && this.active) this.holdPlayback();
  };
  private canPlay(): boolean { return !this.disposed && this.active && this.context?.state === 'running'; }
  private validGain(value: number): number {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Gain must be between 0 and 1.');
    return value;
  }
  private removeEffect(source: AudioBufferSourceNode): void {
    source.onended = null; source.stop(); source.disconnect(); this.effects.delete(source);
  }
  private clearMusic(): void {
    if (this.music?.source) { this.music.source.onended = null; this.music.source.stop(); this.music.source.disconnect(); }
    this.music = null;
  }
  private holdPlayback(): void {
    ++this.revision;
    this.active = false;
    for (const source of this.effects) this.removeEffect(source);
    if (this.music?.source) {
      this.music.offset += Math.max(0, this.context!.currentTime - this.music.startedAt);
      this.music.source.onended = null; this.music.source.stop(); this.music.source.disconnect(); this.music.source = null;
      if (this.music.offset >= this.music.buffer.duration) this.music = null;
    }
  }
  private startMusic(music: MusicPlayback): void {
    const source = this.context!.createBufferSource();
    source.buffer = music.buffer; source.connect(this.musicGain!);
    music.source = source; music.startedAt = this.context!.currentTime;
    source.onended = () => { source.disconnect(); if (this.music?.source === source) this.music = null; };
    source.start(0, music.offset);
  }
}
