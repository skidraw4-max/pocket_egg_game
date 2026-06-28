/**
 * eggTypes.ts — 알 종류 데이터 정의
 *
 * [선택형] 5색 알: 최초 게임 시작 시 플레이어가 직접 선택
 * [가챠형] 6종 알: 뉴게임+ 이후 확률 뽑기로 획득
 */

import type { GrowthTraits, PetStatus } from './gameState';

// ──────────────────────────────────────────────
// 공통 타입
// ──────────────────────────────────────────────

export type EggColorId =
  | 'red'       // 빨강알
  | 'blue'      // 파랑알
  | 'pink'      // 핑크알
  | 'green'     // 초록알
  | 'rainbow';  // 무지개알

export type GachaEggId =
  | 'fire'      // 불꽃알
  | 'wisdom'    // 지혜알
  | 'fairy'     // 요정알
  | 'nature'    // 자연알
  | 'cosmos'    // 우주알
  | 'rainbow_g'; // 무지개알(가챠)

/** 패시브 효과 타입 */
export interface EggPassive {
  /** 피로 감소 배율 (1.0 = 기본, 2.0 = 2배 빠름) */
  fatigueRecoveryMult?: number;
  /** EXP 획득 배율 (1.0 = 기본, 1.3 = 30% 증가) */
  expGainMult?: number;
  /** 친밀도 상승 배율 (1.0 = 기본, 2.0 = 2배) */
  intimacyGainMult?: number;
  /** 상태 감소 완화 배율 (1.0 = 기본, 0.7 = 30% 완화) */
  statusDecayMult?: number;
  /** 초기 성향 보너스 */
  traitBonus?: Partial<GrowthTraits>;
  /** 초기 상태 보너스 */
  statusBonus?: Partial<PetStatus>;
  /** 특수 액션 ID (미래 확장용) */
  specialAction?: string;
}

// ──────────────────────────────────────────────
// [선택형] 5색 알 데이터
// ──────────────────────────────────────────────

export interface SelectEggDef {
  id: EggColorId;
  name: string;
  emoji: string;
  color: string;         // 대표 색상 hex
  gradient: string;      // 카드 배경 그라데이션
  borderColor: string;   // 카드 테두리 색상
  description: string;   // 한 줄 소개
  passive: string;       // 패시브 설명 (UI 표시용)
  passiveDetail: string; // 패시브 상세 설명
  evolutionHint: string; // 진화 계열 힌트
  passiveEffect: EggPassive;
}

export const SELECT_EGGS: SelectEggDef[] = [
  {
    id: 'red',
    name: '빨강알',
    emoji: '🔴',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)',
    borderColor: '#EF4444',
    description: '강인한 에너지가 넘치는 알이에요.',
    passive: '⚡ 피로 회복 2배',
    passiveDetail: '놀이·목욕 후 피로가 2배 빠르게 회복돼요.',
    evolutionHint: '힘(Power) 우세 → 드래곤몬 계열',
    passiveEffect: {
      fatigueRecoveryMult: 2.0,
      traitBonus: { power: 5 },
    },
  },
  {
    id: 'blue',
    name: '파랑알',
    emoji: '🔵',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)',
    borderColor: '#3B82F6',
    description: '지혜의 기운이 감도는 신비로운 알이에요.',
    passive: '📚 EXP 획득 +30%',
    passiveDetail: '모든 행동에서 EXP를 30% 더 많이 얻어요.',
    evolutionHint: '지능(Intelligence) 우세 → 매직몬 계열',
    passiveEffect: {
      expGainMult: 1.3,
      traitBonus: { intelligence: 5 },
    },
  },
  {
    id: 'pink',
    name: '핑크알',
    emoji: '🩷',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #F9A8D4 0%, #EC4899 100%)',
    borderColor: '#EC4899',
    description: '사랑스러운 기운이 가득한 알이에요.',
    passive: '💕 친밀도 상승 2배',
    passiveDetail: '모든 행동에서 친밀도가 2배 빠르게 올라요.',
    evolutionHint: '매력(Charm) 우세 → 엔젤몬 계열',
    passiveEffect: {
      intimacyGainMult: 2.0,
      traitBonus: { charm: 5 },
    },
  },
  {
    id: 'green',
    name: '초록알',
    emoji: '🟢',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #86EFAC 0%, #22C55E 100%)',
    borderColor: '#22C55E',
    description: '자연의 생명력이 깃든 튼튼한 알이에요.',
    passive: '🌿 상태 감소 30% 완화',
    passiveDetail: '배고픔·청결·기분이 30% 느리게 줄어들어요.',
    evolutionHint: '활력(Vitality) 우세 → 포레스몬 계열',
    passiveEffect: {
      statusDecayMult: 0.7,
      traitBonus: { vitality: 5 },
    },
  },
  {
    id: 'rainbow',
    name: '무지개알',
    emoji: '🌈',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #FCA5A5 0%, #FCD34D 25%, #86EFAC 50%, #93C5FD 75%, #C4B5FD 100%)',
    borderColor: '#A855F7',
    description: '모든 색의 기운이 담긴 신비로운 알이에요.',
    passive: '✨ 전 능력 소폭 상승',
    passiveDetail: '모든 성향이 +3 상승하고 EXP도 10% 더 얻어요.',
    evolutionHint: '진화 경로 랜덤 — 어떤 종류로도 진화 가능!',
    passiveEffect: {
      expGainMult: 1.1,
      traitBonus: { power: 3, intelligence: 3, charm: 3, vitality: 3 },
    },
  },
];

// ──────────────────────────────────────────────
// [가챠형] 6종 알 데이터
// ──────────────────────────────────────────────

export interface GachaEggDef {
  id: GachaEggId;
  name: string;
  emoji: string;
  grade: 'rare' | 'epic' | 'legend';
  gradeLabel: string;
  gradeColor: string;
  color: string;
  gradient: string;
  borderColor: string;
  probability: number;   // 0~1 (뽑기 확률)
  description: string;
  passive: string;
  passiveDetail: string;
  specialAction: string; // 전용 액션 이름
  passiveEffect: EggPassive;
  traitFocus: string;    // 주력 성향
}

export const GACHA_EGGS: GachaEggDef[] = [
  {
    id: 'fire',
    name: '불꽃알',
    emoji: '🔥',
    grade: 'rare',
    gradeLabel: 'RARE',
    gradeColor: '#60A5FA',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #FED7AA 0%, #F97316 60%, #DC2626 100%)',
    borderColor: '#F97316',
    probability: 0.25,
    description: '불꽃의 기운이 타오르는 강렬한 알이에요.',
    passive: '🔥 Power +15 · 파이어 브레스',
    passiveDetail: '힘 성향이 +15 상승하고 파이어 브레스 특수 액션을 사용할 수 있어요.',
    specialAction: '파이어 브레스',
    passiveEffect: {
      traitBonus: { power: 15 },
      specialAction: 'fire_breath',
    },
    traitFocus: 'power',
  },
  {
    id: 'wisdom',
    name: '지혜알',
    emoji: '📘',
    grade: 'rare',
    gradeLabel: 'RARE',
    gradeColor: '#60A5FA',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #C7D2FE 0%, #6366F1 60%, #4338CA 100%)',
    borderColor: '#6366F1',
    probability: 0.25,
    description: '고대 지식이 깃든 신비로운 알이에요.',
    passive: '📚 Intelligence +15 · 마법 독서',
    passiveDetail: '지능 성향이 +15 상승하고 마법 독서 특수 액션을 사용할 수 있어요.',
    specialAction: '마법 독서',
    passiveEffect: {
      traitBonus: { intelligence: 15 },
      specialAction: 'magic_reading',
    },
    traitFocus: 'intelligence',
  },
  {
    id: 'fairy',
    name: '요정알',
    emoji: '🧚',
    grade: 'rare',
    gradeLabel: 'RARE',
    gradeColor: '#60A5FA',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #FBCFE8 0%, #EC4899 60%, #BE185D 100%)',
    borderColor: '#EC4899',
    probability: 0.20,
    description: '요정의 축복이 담긴 사랑스러운 알이에요.',
    passive: '💫 Charm +15 · 요정 댄스',
    passiveDetail: '매력 성향이 +15 상승하고 요정 댄스 특수 액션을 사용할 수 있어요.',
    specialAction: '요정 댄스',
    passiveEffect: {
      traitBonus: { charm: 15 },
      specialAction: 'fairy_dance',
    },
    traitFocus: 'charm',
  },
  {
    id: 'nature',
    name: '자연알',
    emoji: '🌿',
    grade: 'rare',
    gradeLabel: 'RARE',
    gradeColor: '#60A5FA',
    color: '#16A34A',
    gradient: 'linear-gradient(135deg, #BBF7D0 0%, #16A34A 60%, #14532D 100%)',
    borderColor: '#16A34A',
    probability: 0.20,
    description: '대자연의 생명력이 응축된 알이에요.',
    passive: '🌱 Vitality +15 · 자연 치유',
    passiveDetail: '활력 성향이 +15 상승하고 자연 치유 특수 액션을 사용할 수 있어요.',
    specialAction: '자연 치유',
    passiveEffect: {
      traitBonus: { vitality: 15 },
      specialAction: 'nature_heal',
    },
    traitFocus: 'vitality',
  },
  {
    id: 'cosmos',
    name: '우주알',
    emoji: '🌌',
    grade: 'epic',
    gradeLabel: 'EPIC',
    gradeColor: '#C084FC',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #DDD6FE 0%, #7C3AED 50%, #1E1B4B 100%)',
    borderColor: '#7C3AED',
    probability: 0.08,
    description: '우주의 신비가 담긴 초희귀 알이에요.',
    passive: '🌟 전 성향 +8 · 우주 유영',
    passiveDetail: '모든 성향이 +8 상승하고 우주 유영 특수 액션을 사용할 수 있어요.',
    specialAction: '우주 유영',
    passiveEffect: {
      traitBonus: { power: 8, intelligence: 8, charm: 8, vitality: 8 },
      specialAction: 'cosmos_drift',
    },
    traitFocus: 'all',
  },
  {
    id: 'rainbow_g',
    name: '무지개알',
    emoji: '🌈',
    grade: 'legend',
    gradeLabel: 'LEGEND',
    gradeColor: '#FBBF24',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #FCA5A5 0%, #FCD34D 20%, #86EFAC 40%, #93C5FD 60%, #C4B5FD 80%, #FCA5A5 100%)',
    borderColor: '#FBBF24',
    probability: 0.02,
    description: '전설에만 존재하는 궁극의 알이에요!',
    passive: '🌈 전 성향 +20 · 무지개 폭발',
    passiveDetail: '모든 성향이 +20 상승하고 무지개 폭발 특수 액션을 사용할 수 있어요!',
    specialAction: '무지개 폭발',
    passiveEffect: {
      traitBonus: { power: 20, intelligence: 20, charm: 20, vitality: 20 },
      specialAction: 'rainbow_burst',
    },
    traitFocus: 'all',
  },
];

// ──────────────────────────────────────────────
// 유틸 함수
// ──────────────────────────────────────────────

/** 선택형 알 ID로 데이터 조회 */
export function getSelectEgg(id: EggColorId): SelectEggDef {
  return SELECT_EGGS.find(e => e.id === id) ?? SELECT_EGGS[0];
}

/** 가챠형 알 ID로 데이터 조회 */
export function getGachaEgg(id: GachaEggId): GachaEggDef {
  return GACHA_EGGS.find(e => e.id === id) ?? GACHA_EGGS[0];
}

/**
 * 가챠 뽑기 실행 — 확률 테이블에 따라 알 ID 반환
 * 확률 합계: 25+25+20+20+8+2 = 100%
 */
export function rollGachaEgg(): GachaEggId {
  const rand = Math.random();
  let cumulative = 0;
  for (const egg of GACHA_EGGS) {
    cumulative += egg.probability;
    if (rand < cumulative) return egg.id;
  }
  return GACHA_EGGS[0].id; // fallback
}

/** 패시브 효과를 EXP에 적용 */
export function applyExpPassive(baseExp: number, eggColor?: EggColorId | null, gachaEgg?: GachaEggId | null): number {
  let mult = 1.0;
  if (eggColor) {
    const egg = getSelectEgg(eggColor);
    if (egg.passiveEffect.expGainMult) mult *= egg.passiveEffect.expGainMult;
  }
  if (gachaEgg) {
    // 가챠 알은 현재 EXP 배율 없음 (성향 보너스만)
  }
  return Math.round(baseExp * mult);
}

/** 패시브 효과를 친밀도에 적용 */
export function applyIntimacyPassive(baseIntimacy: number, eggColor?: EggColorId | null): number {
  if (!eggColor) return baseIntimacy;
  const egg = getSelectEgg(eggColor);
  const mult = egg.passiveEffect.intimacyGainMult ?? 1.0;
  return Math.round(baseIntimacy * mult);
}

/** 패시브 효과를 상태 감소율에 적용 (DECAY_RATES 배율) */
export function getStatusDecayMult(eggColor?: EggColorId | null): number {
  if (!eggColor) return 1.0;
  const egg = getSelectEgg(eggColor);
  return egg.passiveEffect.statusDecayMult ?? 1.0;
}

/** 패시브 효과를 피로 회복에 적용 */
export function getFatigueRecoveryMult(eggColor?: EggColorId | null): number {
  if (!eggColor) return 1.0;
  const egg = getSelectEgg(eggColor);
  return egg.passiveEffect.fatigueRecoveryMult ?? 1.0;
}
