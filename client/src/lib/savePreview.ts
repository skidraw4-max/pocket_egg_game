/**
 * savePreview.ts — 저장 데이터 비교 UI용 요약
 */
import type { GameState, PetProfile } from './gameState';

export interface SavePreview {
  petName: string;
  species: string;
  stage: string;
  stageKey: PetProfile['stage'];
  level: number;
  coins: number;
  gems: number;
  intimacy: number;
  savedAt: number;
  savedAtLabel: string;
}

const STAGE_LABELS: Record<PetProfile['stage'], string> = {
  egg: '알',
  baby: '아기',
  child: '어린이',
  teen: '청소년',
  adult: '성체',
  mythic: '전설',
};

function formatSavedAt(ms: number): string {
  if (!ms) return '저장 기록 없음';
  try {
    return new Date(ms).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '알 수 없음';
  }
}

export function getSaveTimestamp(state: GameState): number {
  return (state as GameState & { _savedAt?: number })._savedAt ?? state.lastSaveTime ?? 0;
}

export function buildSavePreview(state: GameState): SavePreview {
  const stageKey = state.pet?.stage ?? 'egg';
  return {
    petName: state.pet?.name ?? '포코',
    species: state.pet?.species ?? '기본몬',
    stage: STAGE_LABELS[stageKey] ?? stageKey,
    stageKey,
    level: state.pet?.level ?? 1,
    coins: state.coins ?? 0,
    gems: state.gems ?? 0,
    intimacy: state.pet?.intimacy ?? 0,
    savedAt: getSaveTimestamp(state),
    savedAtLabel: formatSavedAt(getSaveTimestamp(state)),
  };
}

export const STAGE_EMOJI: Record<string, string> = {
  egg: '🥚',
  baby: '🐣',
  child: '🐥',
  teen: '🐦',
  adult: '🦅',
  mythic: '🌟',
};
