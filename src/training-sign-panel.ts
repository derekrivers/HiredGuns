import type { LevelData, WorldState } from './contracts';
import type { TrainingSession } from './sim/training-session';
import { readTrainingSignCue, signData, type SignSource } from './sim/training-sign';

/** Four existing view headers own independent ephemeral readbacks. */
export function installTrainingSignPanel(panes: HTMLElement[]) {
  const labels = panes.map((pane,i) => {
    const label = document.createElement('span'); label.id = `sign-${i}`; label.className = 'player-sub';
    // Reuse the view header so the central PAUSED overlay cannot cover a cue.
    label.style.fontSize = '12px'; label.style.letterSpacing = '0'; label.style.display = 'none';
    label.hidden = true; pane.querySelector('.view-head > div')!.append(label); return label;
  });
  function refresh(state: {source:SignSource|null;level:LevelData;world:WorldState;session:TrainingSession|null;loading:boolean}) {
    const {source,level,world,session,loading} = state;
    const wet = signData(session,'wet'), actors = signData(wet,'actors');
    // Main owns verified team lifecycle. No party/region/profile extension reads.
    const admitted = signData(signData(session,'team'),'profile') === 'ocs-initial-team-v1';
    labels.forEach((label,i) => {
      const actor = signData(actors,String(i)), body = signData(actor,'body');
      const cue = readTrainingSignCue(admitted ? source : null,level,{
        position:world.mercenaries[i],actor:i,worldLevelId:world.levelId,loading,
        exited:world.mission.exited[i],
        runtimeDeadWord:wet ? signData(actor,'runtimeDeadWord') : world.physics.mode === 'static' ? 0 : undefined,
        statsDeadWord:wet ? signData(body,'statsDeadWord') : 0,
        windowType:wet ? signData(body,'windowType') : 0,
        controlMethod:wet ? signData(body,'controlMethod') : 1,
      });
      const text = cue ? 'Sign ahead (placeholder)' : '';
      if (label.hidden !== (cue === null)) { label.hidden = cue === null; label.style.display = cue ? 'block' : 'none'; }
      if (label.textContent !== text) label.textContent = text;
    });
  }
  return {refresh};
}
