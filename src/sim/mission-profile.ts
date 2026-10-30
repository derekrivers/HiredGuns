import { pressurePadLevel, PAD_INDEX } from '../world/training-pressure-pad';
import { createPressurePadLevel, createMovingDoorLevel, movingDoorLevel, createPatrolMissionLevel, patrolMissionLevel, PATROL_EXIT } from '../world/training-gate';
import { cellIndex } from '../contracts';
import type { LevelData, MissionMode, MissionRules } from '../contracts';

/** Exact editor file verified locally. Other revisions remain navigation-only. */
export const TRAINING_43_SHA256 = '646ce0f58ca9eca3e81be7e6090cb09a6bad538d397a2d81c78c311ce2fb9f8c';
export function extractionProfile(level: LevelData): { title: string; timeLimit: number } | null {
  if (patrolMissionLevel(level) && canonicalPatrolGeometry(level)) return {title:'Authored patrol extraction',timeLimit:10};
  if (level.source.kind === 'editor-map' && level.source.sha256 === TRAINING_43_SHA256) {
    return { title: 'Training 43', timeLimit: 99 };
  }
  if (level.source.kind === 'synthetic' && level.id === 'synthetic-extraction-v1') {
    return { title: 'Extraction drill', timeLimit: 2 };
  }
  return null;
}
export function missionRulesForLevel(level: LevelData, mode: MissionMode = extractionProfile(level) ? 'cooperative-extraction' : 'navigation'): MissionRules {
  if (patrolMissionLevel(level) && mode !== 'cooperative-extraction') throw new Error('Patrol challenge uses fixed cooperative extraction rules.');
  if (mode === 'navigation') return { mode, timeLimit: null };
  const profile = extractionProfile(level);
  if (!profile || (mode !== 'cooperative-extraction' && mode !== 'first-exit')) throw new Error('Mission mode is not enabled for this level revision');
  return { mode, timeLimit: profile.timeLimit };
}

let canonicalMission: LevelData | undefined;
let canonicalPad: LevelData | undefined;
let canonicalMoving: LevelData | undefined;
function canonicalPatrolGeometry(level: LevelData): boolean {
  const base = pressurePadLevel(level) ? canonicalPad ??= createPressurePadLevel() : movingDoorLevel(level) ? canonicalMoving ??= createMovingDoorLevel() : canonicalMission ??= createPatrolMissionLevel();
  const {layers, ...metadata} = level, {layers: expected, ...identity} = base;
  if (JSON.stringify(metadata) !== JSON.stringify(identity) || !Array.isArray(layers) || layers.length !== 3) return false;
  const panel = (1*23+4)*23+5, gate = (1*23+5)*23+5, exit = cellIndex(base,PATROL_EXIT);
  const p = layers[0]?.[panel], g = layers[0]?.[gate], d = layers[1]?.[gate];
  if (movingDoorLevel(level)) {
    if (p !== 0x8008004b || typeof g !== 'number' || ((g >>> 23)&31) > 10 || (g & ~0x0f800000) >>> 0 !== ((g&2) ? 0x8000a003 : 0x80000001) || d !== 0x80000000) return false;
  } else if (!((p === 0x8008004b && g === 0x80000043 && (d === 0x80000000 || d === 0x80000400)) ||
      (p === 0x8010004b && g === 0x80000001 && d === 0x80000400))) return false;
  if (layers[0]?.[exit] !== 67 && layers[0]?.[exit] !== 6146) return false;
  return expected.every((plane,z) => layers[z]?.length === plane.length && plane.every((word,i) =>
    (z === 0 && (i === panel || i === gate || i === exit)) || (z === 1 && i === gate) || (pressurePadLevel(level) && z === 0 && i === PAD_INDEX && layers[z]![i] === 0x80000001) || word === layers[z]![i]));
}
