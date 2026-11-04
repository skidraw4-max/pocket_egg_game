/**
 * statusExpressions.ts — 상태바 임계 표정 (청결 > 졸림 > 배고픔 > 심심함)
 */
import type { PetStatus } from './gameState';
import type { PetStage } from './speciesRegistry';
import { publicAssetUrl } from './publicAssets';
import { SPECIES_REGISTRY, type CharacterSkin, getActiveSkin } from './speciesRegistry';

/** UI 노출 우선순위 (높을수록 우선) */
export type StatusStat = 'clean' | 'fatigue' | 'hunger' | 'mood';

export type StatusTier = '60' | '30' | '10';

export const STATUS_PRIORITY: readonly StatusStat[] = ['clean', 'fatigue', 'hunger', 'mood'];

export const STATUS_LABELS: Record<StatusStat, string> = {
  clean: '청결',
  fatigue: '졸림',
  hunger: '배고픔',
  mood: '심심함',
};

const TIER_ORDER: Record<StatusTier, number> = { '10': 3, '30': 2, '60': 1 };

/** 단일 스탯의 현재 표정 티어 (없으면 null) */
export function getStatusTier(stat: StatusStat, status: PetStatus): StatusTier | null {
  switch (stat) {
    case 'clean':
    case 'hunger':
    case 'mood': {
      const value = status[stat];
      if (value <= 10) return '10';
      if (value <= 30) return '30';
      if (value <= 60) return '60';
      return null;
    }
    case 'fatigue': {
      const fatigue = status.fatigue;
      if (fatigue >= 90) return '10';
      if (fatigue >= 70) return '30';
      if (fatigue >= 40) return '60';
      return null;
    }
    default:
      return null;
  }
}

/** 우선순위에 따라 노출할 표정 1개 선택 */
export function resolveActiveStatusExpression(
  status: PetStatus,
): { stat: StatusStat; tier: StatusTier } | null {
  for (const stat of STATUS_PRIORITY) {
    const tier = getStatusTier(stat, status);
    if (tier) return { stat, tier };
  }
  return null;
}

export function getSpeciesFileId(speciesName: string): string {
  return SPECIES_REGISTRY.find(s => s.name === speciesName)?.id ?? 'basicmon';
}

function statusFileName(stat: StatusStat, tier: StatusTier): string {
  return `${stat}_${tier}.png`;
}

function statusStageUrl(
  skinFolder: string,
  fileId: string,
  stage: PetStage,
  file: string,
): string {
  return publicAssetUrl(`characters/status/${skinFolder}/${fileId}/${stage}/${file}`);
}

/** stage → baby → legacy 순 fallback 후보 */
export function getStatusExpressionImageCandidates(
  speciesName: string,
  stat: StatusStat,
  tier: StatusTier,
  stage: PetStage,
  skin?: CharacterSkin,
): string[] {
  const activeSkin = skin ?? getActiveSkin();
  const fileId = getSpeciesFileId(speciesName);
  const skinFolder = activeSkin === 'classic' ? 'classic' : 'modern';
  const file = statusFileName(stat, tier);
  const candidates: string[] = [];

  // 번들에는 baby 스테이지만 포함 (다른 스테이지는 baby와 동일 PNG)
  if (stage !== 'egg') {
    candidates.push(statusStageUrl(skinFolder, fileId, 'baby', file));
  }
  candidates.push(publicAssetUrl(`characters/status/${skinFolder}/${fileId}/${file}`));
  return candidates;
}

export function getStatusExpressionImageUrl(
  speciesName: string,
  stat: StatusStat,
  tier: StatusTier,
  stage: PetStage,
  skin?: CharacterSkin,
): string {
  return getStatusExpressionImageCandidates(speciesName, stat, tier, stage, skin)[0];
}

/** PetDisplay 감정 키와 매핑 */
export function statusStatToEmotion(stat: StatusStat): 'dirty' | 'tired' | 'hungry' | 'bored' {
  switch (stat) {
    case 'clean':
      return 'dirty';
    case 'fatigue':
      return 'tired';
    case 'hunger':
      return 'hungry';
    case 'mood':
      return 'bored';
  }
}

export function compareStatusTier(a: StatusTier, b: StatusTier): number {
  return TIER_ORDER[a] - TIER_ORDER[b];
}
