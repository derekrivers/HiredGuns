import { AudioService } from '../src/platform/audio-service';

const audio = new AudioService();
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const error = element('error');
const buffers: Partial<Record<'effect' | 'music', AudioBuffer>> = {};
const revisions = { effect: 0, music: 0 };
const render = () => {
  const state = audio.status;
  element('state').textContent = `Context: ${state.context} | ${state.active ? 'enabled' : 'paused / activation needed'}\nEffects: ${state.effectVoices} / 8 | Music: ${state.music}\nEffects gain: ${state.effectsGain} | Music gain: ${state.musicGain} | Muted: ${state.muted}`;
};
const run = async (action: () => void | Promise<unknown>) => {
  error.textContent = '';
  try { await action(); } catch (cause) { error.textContent = cause instanceof Error ? cause.message : String(cause); }
  render();
};
for (const kind of ['effect', 'music'] as const) {
  element<HTMLInputElement>(`${kind}-file`).addEventListener('change', () => {
    const file = element<HTMLInputElement>(`${kind}-file`).files?.[0];
    const revision = ++revisions[kind];
    if (!file) return;
    element(`${kind}-info`).textContent = `Loading ${file.name}…`;
    void run(async () => {
      try {
        const buffer = await audio.decode(file);
        if (revision !== revisions[kind]) return;
        buffers[kind] = buffer;
        element(`${kind}-info`).textContent = `${file.name} — ${buffer.duration.toFixed(2)} s, ${buffer.numberOfChannels} channels, ${buffer.sampleRate} Hz`;
        element<HTMLButtonElement>(`${kind}-play`).disabled = false;
        if (kind === 'effect') element<HTMLButtonElement>('effect-overlap').disabled = false;
      } catch (cause) {
        if (revision !== revisions[kind]) return;
        element(`${kind}-info`).textContent = buffers[kind] ? 'Load failed; previous decoded file retained' : 'No file loaded';
        throw cause;
      }
    });
  });
}
element('activate').onclick = () => void run(async () => {
  if (!await audio.activate()) error.textContent = 'Audio activation was cancelled or blocked. Press Enable / resume audio again.';
});
element('pause').onclick = () => void run(() => audio.pause());
element('stop').onclick = () => void run(() => audio.stop());
const play = (kind: 'effect' | 'music') => {
  const buffer = buffers[kind];
  if (!buffer || !(kind === 'effect' ? audio.playEffect(buffer) : audio.playMusic(buffer))) {
    error.textContent = 'Enable / resume audio before playing.';
  }
};
element('effect-play').onclick = () => void run(() => play('effect'));
element('effect-overlap').onclick = () => void run(() => { for (let i = 0; i < 3; i++) play('effect'); });
element('music-play').onclick = () => void run(() => play('music'));
element<HTMLInputElement>('effects-gain').oninput = event => { audio.setEffectsGain(Number((event.target as HTMLInputElement).value)); render(); };
element<HTMLInputElement>('music-gain').oninput = event => { audio.setMusicGain(Number((event.target as HTMLInputElement).value)); render(); };
element<HTMLInputElement>('mute').onchange = event => { audio.setMuted((event.target as HTMLInputElement).checked); render(); };
const timer = window.setInterval(render, 100);
window.addEventListener('pagehide', () => { window.clearInterval(timer); void audio.dispose(); });
render();
