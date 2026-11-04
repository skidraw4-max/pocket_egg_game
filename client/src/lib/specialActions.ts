/**
 * 가챠 알 전용 특수 액션 정의
 * specialAction ID → 아이콘·한글명·테마색·연출 매핑
 */

export type SpecialActionId =
  | 'fire_breath'
  | 'magic_reading'
  | 'fairy_dance'
  | 'nature_heal'
  | 'cosmos_drift'
  | 'rainbow_burst';

export interface SpecialActionDef {
  id: SpecialActionId;
  name: string;
  image: string;
  themeColor: string;
  shadowColor: string;
  feedbackMessage: string;
  effectEmoji: string;
  moodBoost: number;
  expBoost: number;
}

export const SPECIAL_ACTION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4시간

export const SPECIAL_ACTIONS: Record<SpecialActionId, SpecialActionDef> = {
  fire_breath: {
    id: 'fire_breath',
    name: '파이어 브레스',
    image: '/images/actions/action-fire-breath.png',
    themeColor: '#F97316',
    shadowColor: 'rgba(249,115,22,0.45)',
    feedbackMessage: '불꽃이 타오른다! 🔥',
    effectEmoji: '🔥',
    moodBoost: 18,
    expBoost: 12,
  },
  magic_reading: {
    id: 'magic_reading',
    name: '마법 독서',
    image: '/images/actions/action-magic-reading.png',
    themeColor: '#6366F1',
    shadowColor: 'rgba(99,102,241,0.45)',
    feedbackMessage: '마법서를 읽고 있어요! 📖',
    effectEmoji: '✨',
    moodBoost: 16,
    expBoost: 14,
  },
  fairy_dance: {
    id: 'fairy_dance',
    name: '요정 댄스',
    image: '/images/actions/action-fairy-dance.png',
    themeColor: '#EC4899',
    shadowColor: 'rgba(236,72,153,0.45)',
    feedbackMessage: '요정처럼 춤춰요! 💃',
    effectEmoji: '🧚',
    moodBoost: 20,
    expBoost: 12,
  },
  nature_heal: {
    id: 'nature_heal',
    name: '자연 치유',
    image: '/images/actions/action-nature-heal.png',
    themeColor: '#16A34A',
    shadowColor: 'rgba(22,163,74,0.45)',
    feedbackMessage: '자연의 기운이 흘러요! 🌿',
    effectEmoji: '🍃',
    moodBoost: 15,
    expBoost: 10,
  },
  cosmos_drift: {
    id: 'cosmos_drift',
    name: '우주 유영',
    image: '/images/actions/action-cosmos-drift.png',
    themeColor: '#7C3AED',
    shadowColor: 'rgba(124,58,237,0.45)',
    feedbackMessage: '우주를 유영해요! 🌌',
    effectEmoji: '🌟',
    moodBoost: 18,
    expBoost: 13,
  },
  rainbow_burst: {
    id: 'rainbow_burst',
    name: '무지개 폭발',
    image: '/images/actions/action-rainbow-burst.png',
    themeColor: '#F59E0B',
    shadowColor: 'rgba(245,158,11,0.45)',
    feedbackMessage: '무지개가 터져요! 🌈',
    effectEmoji: '🌈',
    moodBoost: 22,
    expBoost: 15,
  },
};

export function getSpecialActionDef(id: string | undefined | null): SpecialActionDef | null {
  if (!id) return null;
  return SPECIAL_ACTIONS[id as SpecialActionId] ?? null;
}

/** 남은 쿨다운(ms) → "3h 12m" / "45m" 형식 */
export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return '';
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
