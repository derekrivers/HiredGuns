import type { LevelData, MissionMode, MissionRules } from '../contracts';

/** Exact editor file verified locally. Other revisions remain navigation-only. */
export const TRAINING_43_SHA256 = '646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c';
export function extractionProfile(level: LevelData): { title: string; timeLimit: number } | null {
  if (level.source.kind === 'editor-map' && level.source.sha256 === TRAINING_43_SHA256) {
    return { title: 'Training 43', timeLimit: 99 };
  }
  if (level.source.kind === 'synthetic' && level.id === 'synthetic-extraction-v1') {
    return { title: 'Extraction drill', timeLimit: 2 };
  }
  return null;
}
export function missionRulesForLevel(level: LevelData, mode: MissionMode = extractionProfile(level) ? 'cooperative-extraction' : 'navigation'): MissionRules {
  if (mode === 'navigation') return { mode, timeLimit: null };
  const profile = extractionProfile(level);
  if (!profile || (mode !== 'cooperative-extraction' && mode !== 'first-exit')) throw new Error('Mission mode is not enabled for this level revision');
  return { mode, timeLimit: profile.timeLimit };
}
