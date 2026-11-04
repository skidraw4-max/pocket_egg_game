/**
 * 「포켓 에그: 나만의 반려몬」 게임 상태 관리
 * Cozy Nursery 디자인 철학: 포근하고 생동감 있는 가상 반려 육성
 */

import { type EggColorId, type GachaEggId, getGachaEgg, applyExpPassive } from './eggTypes';
import {
  getSpecialActionDef,
  SPECIAL_ACTION_COOLDOWN_MS,
} from './specialActions';
import type { EvolutionResult } from './speciesRegistry';
import { getLayoutPlacement } from '@/data/roomLayouts';
import {
  applyIntimacyWithPerks,
  getAggregatedRoomPerks,
  getDecayMultiplier,
  getTouchIntimacyBonus,
  type RoomPerkDaily,
  withTouchIntimacyDailyUsed,
} from './decorPerks';
export {
  CHARACTER_IMAGES,
  checkEvolution,
  getActiveSkin,
  getCharacterImage,
  setActiveSkin,
  type CharacterSkin,
  type EvolutionResult,
} from './speciesRegistry';

// ===== 타입 정의 =====

export interface PetStatus {
  hunger: number;    // 배고픔 (0~100, 높을수록 배부름)
  mood: number;      // 기분 (0~100, 높을수록 행복)
  clean: number;     // 청결 (0~100, 높을수록 깨끗)
  fatigue: number;   // 피로 (0~100, 높을수록 피곤)
}

export interface PetProfile {
  name: string;
  stage: 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'mythic';
  species: string;
  level: number;
  exp: number;
  expToNext: number;
  intimacy: number;  // 친밀도 (0~100)
  birthDate: number;
  traits: GrowthTraits;
}

export interface GrowthTraits {
  power: number;     // 힘 성향
  intelligence: number; // 지능 성향
  charm: number;     // 매력 성향
  vitality: number;  // 활력 성향
}

export interface AttendanceState {
  lastLoginDate: string;    // 'YYYY-MM-DD'
  streak: number;           // 연속 출석일
  totalDays: number;        // 누적 출석일
  weeklyMissionsClaimed: boolean; // 이번 주 주간 보상 수령 여부
  lastWeekStr: string;      // 'YYYY-Www' 형식
}

export interface GameState {
  pet: PetProfile;
  status: PetStatus;
  coins: number;
  gems: number;
  iapPurchases: Record<string, IapPurchaseRecord>;
  inventory: InventoryItem[];
  room: RoomState;
  collection: string[];
  lastSaveTime: number;
  totalPlayDays: number;
  missions: MissionState;
  attendance: AttendanceState;
  claimedEvolutionRewards: string[];  // 보상 수령한 진화 종족 목록
  claimedCollectionRewards: string[]; // 보상 수령한 도감 종족 목록
  friendCoins: number;                // 친구 전용 코인 (소셜 가구 구매용)
  nickname: string;                    // 플레이어 닉네임 (반려몬 이름과 별개)
  tutorialSeen: Record<string, boolean>; // 튜토리얼 완료 플래그 (게임 ID → 완료 여부)
  ownedWallpapers: string[];               // 구매한 배경 ID 목록
  eggColor: string | null;                 // 선택형 알 색상 ID (최초 선택)
  gachaEgg: string | null;                 // 가챠형 알 ID (뉴게임+ 뽑기)
  lastSpecialActionAt?: number;            // 특수 액션 마지막 사용 시각 (epoch ms)
  expBoostUntil?: number;                  // 활동 EXP 2배 버프 만료 시각 (epoch ms)
  claimedIntimacyRewards: string[];        // 친밀도 마일스톤 보상 수령 ID
  unlockedEmotions: string[];              // 해금된 특별 말풍선/이모션 ID
  dailyChallenges: DailyChallengeState;    // 미니게임 일일 챌린지
  weeklyGoals: WeeklyGoalState;            // 주간 육성 목표
  fragmentExchangeDaily: Record<string, string>; // 교환소 일일 1회 제한 (exchangeId → 날짜)
  /** 가구 혜택 일일 사용 (터치 친밀 cap 등) */
  roomPerkDaily?: RoomPerkDaily;
  /** 선택형 대화 일일 횟수 */
  chatDaily?: { date: string; count: number };
  /** 별 퍼즐 힌트 일일 횟수 */
  puzzleHintDaily?: { date: string; count: number };
  /** 구매한 퍼즐 힌트 크레딧 (젬 차감 전에 소모) */
  puzzleHintCredits?: number;
  /** 친밀도 획득 ×1.5 버프 만료 시각 (epoch ms) */
  intimacyBoostUntil?: number;
}

export interface IapPurchaseRecord {
  productId: string;
  amount: number;
  grantedAt: number;
  quantity: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'decor' | 'special';
  quantity: number;
  icon: string;
  effect: Partial<PetStatus>;
  traitBonus?: Partial<GrowthTraits>;
  description: string;
}

/** 사용자가 배치·크기 조정한 가구 (0~1 normalized 좌표) */
export interface PlacedDecor {
  id: string;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;
  rotation?: number;
  zIndex?: number;
}

export interface RoomState {
  wallpaper: string;
  furniture: string[];
  /** 사용자 커스텀 배치 (없으면 wallpaper preset 사용) */
  placements?: PlacedDecor[];
  /** 방에서 숨긴 가구 ID (보유는 유지) */
  hiddenDecor?: string[];
}

// ===== 미션 시스템 타입 =====

export type MissionType = 'feed' | 'play' | 'clean' | 'sleep' | 'shop';

export interface DailyMission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  target: number;          // 목표 횟수
  current: number;         // 현재 진행도
  completed: boolean;      // 완료 여부
  claimed: boolean;        // 보상 수령 여부
  reward: { coins: number; exp: number };
  adRewardClaimed?: boolean; // 광고 시청 후 젬 +1 보상 수령 여부
}

export interface MissionState {
  missions: DailyMission[];
  lastResetDate: string;   // 'YYYY-MM-DD' 형식
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  reward: { coins: number; sparkleFragments?: number };
}

export interface DailyChallengeState {
  challenges: DailyChallenge[];
  lastResetDate: string;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  reward: { gems: number; coins?: number };
}

export interface WeeklyGoalState {
  goals: WeeklyGoal[];
  lastResetWeek: string; // 'YYYY-Www'
}

export interface IntimacyMilestoneDef {
  id: string;
  threshold: number;
  label: string;
  reward: { coins?: number; gems?: number };
  unlockEmotion?: string;
  unlockPhrase?: string;
}

export const UNLOCKED_EMOTION_PHRASES: Record<string, string> = {
  milestone_doki: '두근두근! 더 친해지고 싶어~ 💖',
  milestone_soulmate: '영원히 함께하자! ✨💕',
};

// ===== 초기 상태 =====

export const INITIAL_PET_PROFILE: PetProfile = {
  name: '포코',
  stage: 'egg',
  species: '기본몬',
  level: 1,
  exp: 0,
  expToNext: 100,
  intimacy: 10,
  birthDate: Date.now(),
  traits: { power: 0, intelligence: 0, charm: 0, vitality: 0 },
};

export const INITIAL_PET_STATUS: PetStatus = {
  hunger: 80,
  mood: 70,
  clean: 90,
  fatigue: 10,
};

/** 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 일일 미션 목록 생성 */
export function createDailyMissions(): DailyMission[] {
  return [
    {
      id: 'feed_3',
      type: 'feed',
      title: '밥 챙겨주기',
      description: '반려몬에게 먹이를 3번 줘요',
      icon: '🍖',
      target: 3,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 30, exp: 15 },
    },
    {
      id: 'play_2',
      type: 'play',
      title: '같이 놀아주기',
      description: '장난감으로 2번 놀아줘요',
      icon: '🎾',
      target: 2,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 20, exp: 10 },
    },
    {
      id: 'clean_1',
      type: 'clean',
      title: '깨끗이 씻겨주기',
      description: '반려몬을 1번 청소해줘요',
      icon: '🛁',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 15, exp: 8 },
    },
    {
      id: 'sleep_1',
      type: 'sleep',
      title: '재워주기',
      description: '반려몬을 1번 재워줘요',
      icon: '💤',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 15, exp: 8 },
    },
    {
      id: 'shop_1',
      type: 'shop',
      title: '상점 이용하기',
      description: '상점에서 아이템을 1번 구매해요',
      icon: '🛒',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 25, exp: 12 },
    },
  ];
}

export const INITIAL_MISSION_STATE: MissionState = {
  missions: createDailyMissions(),
  lastResetDate: todayStr(),
};

/** 일일 미니게임 챌린지 생성 */
export function createDailyChallenges(): DailyChallenge[] {
  return [
    {
      id: 'daily_puzzle_25',
      title: '별퍼즐 고수',
      description: '오늘 별퍼즐을 25이동 이하로 1회 완성해요',
      icon: '⭐',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 40, sparkleFragments: 1 },
    },
    {
      id: 'daily_ball_150',
      title: '공놀이 챔피언',
      description: '오늘 공놀이에서 150점 이상 1회 달성해요',
      icon: '⚽',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 35, sparkleFragments: 1 },
    },
    {
      id: 'daily_ribbon_90',
      title: '리본 리듬 마스터',
      description: '오늘 리본 리듬에서 정확도 90% 이상 1회 달성해요',
      icon: '🎀',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 40, sparkleFragments: 1 },
    },
    {
      id: 'daily_leaf_80',
      title: '잎사귀 뒤집기 달인',
      description: '오늘 잎사귀 뒤집기에서 우수 등급 이상 1회 달성해요',
      icon: '🌿',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 35, sparkleFragments: 1 },
    },
    {
      id: 'daily_touch_5',
      title: '쓰다듬기 마스터',
      description: '오늘 반려몬을 5번 쓰다듬어요',
      icon: '💕',
      target: 5,
      current: 0,
      completed: false,
      claimed: false,
      reward: { coins: 25 },
    },
  ];
}

export const INITIAL_DAILY_CHALLENGE_STATE: DailyChallengeState = {
  challenges: createDailyChallenges(),
  lastResetDate: todayStr(),
};

/** 주간 육성 목표 생성 */
export function createWeeklyGoals(): WeeklyGoal[] {
  return [
    {
      id: 'weekly_power_evolve',
      title: '파워몬 진화',
      description: '이번 주 파워몬으로 진화해요',
      icon: '💪',
      target: 1,
      current: 0,
      completed: false,
      claimed: false,
      reward: { gems: 3, coins: 50 },
    },
    {
      id: 'weekly_perfect_3',
      title: '미니게임 퍼펙트',
      description: '이번 주 미니게임 퍼펙트 등급 3회 달성',
      icon: '🏆',
      target: 3,
      current: 0,
      completed: false,
      claimed: false,
      reward: { gems: 2, coins: 80 },
    },
    {
      id: 'weekly_visit_5',
      title: '친구 방문',
      description: '이번 주 친구 방을 5번 방문해요',
      icon: '👫',
      target: 5,
      current: 0,
      completed: false,
      claimed: false,
      reward: { gems: 2 },
    },
  ];
}

export const INITIAL_WEEKLY_GOAL_STATE: WeeklyGoalState = {
  goals: createWeeklyGoals(),
  lastResetWeek: getWeekStr(new Date()),
};

export const INTIMACY_MILESTONES: IntimacyMilestoneDef[] = [
  {
    id: 'intimacy_30',
    threshold: 30,
    label: '친해진 사이',
    reward: { coins: 50 },
  },
  {
    id: 'intimacy_60',
    threshold: 60,
    label: '단짝 친구',
    reward: { coins: 30, gems: 1 },
  },
  {
    id: 'intimacy_90',
    threshold: 90,
    label: '마음이 통하는 사이',
    reward: { coins: 100 },
    unlockEmotion: 'milestone_doki',
    unlockPhrase: UNLOCKED_EMOTION_PHRASES.milestone_doki,
  },
  {
    id: 'intimacy_100',
    threshold: 100,
    label: '영원한 단짝',
    reward: { coins: 150, gems: 2 },
    unlockEmotion: 'milestone_soulmate',
    unlockPhrase: UNLOCKED_EMOTION_PHRASES.milestone_soulmate,
  },
];

export const INITIAL_GAME_STATE: GameState = {
  pet: INITIAL_PET_PROFILE,
  status: INITIAL_PET_STATUS,
  coins: 500,
  gems: 10,
  iapPurchases: {},
  inventory: [
    {
      id: 'food_basic',
      name: '포켓 사료',
      type: 'food',
      quantity: 10,
      icon: '🍖',
      effect: { hunger: 15 },
      description: '영양이 가득한 기본 사료예요.',
    },
    {
      id: 'food_cookie',
      name: '꿀방울 쿠키',
      type: 'food',
      quantity: 5,
      icon: '🍪',
      effect: { hunger: 10, mood: 10 },
      traitBonus: { charm: 2 },
      description: '달콤한 쿠키로 기분이 좋아져요!',
    },
    {
      id: 'food_salad',
      name: '잎사귀 샐러드',
      type: 'food',
      quantity: 5,
      icon: '🥗',
      effect: { hunger: 12, clean: 5 },
      traitBonus: { vitality: 2 },
      description: '신선한 채소로 건강을 챙겨요!',
    },
    {
      id: 'toy_ball',
      name: '무지개 공',
      type: 'toy',
      quantity: 1,
      icon: '⚽',
      effect: { mood: 20, fatigue: 15 },
      traitBonus: { power: 3 },
      description: '공놀이로 힘을 길러요!',
    },
    {
      id: 'toy_puzzle',
      name: '별 퍼즐',
      type: 'toy',
      quantity: 1,
      icon: '⭐',
      effect: { mood: 15, fatigue: 10 },
      traitBonus: { intelligence: 3 },
      description: '퍼즐을 풀면 머리가 좋아져요!',
    },
  ],
  room: {
    wallpaper: 'default',
    furniture: [],
  },
  collection: ['기본몬'],
  lastSaveTime: Date.now(),
  totalPlayDays: 1,
  missions: INITIAL_MISSION_STATE,
  attendance: {
    lastLoginDate: '',
    streak: 0,
    totalDays: 0,
    weeklyMissionsClaimed: false,
    lastWeekStr: '',
  },
  claimedEvolutionRewards: [],
  claimedCollectionRewards: [],
    friendCoins: 0,
  nickname: '',
  tutorialSeen: {},
  ownedWallpapers: [],
  eggColor: null,
  gachaEgg: null,
  claimedIntimacyRewards: [],
  unlockedEmotions: [],
  dailyChallenges: INITIAL_DAILY_CHALLENGE_STATE,
  weeklyGoals: INITIAL_WEEKLY_GOAL_STATE,
  fragmentExchangeDaily: {},
};
// ===== 시간 경과 로직 =====

const DECAY_RATES: Record<keyof PetStatus, number> = {
  hunger: -2,    // 시간당 감소
  mood: -1.5,
  clean: -1,
  fatigue: 3,    // 시간당 증가 (피로 누적)
};

export function calculateTimeSkip(state: GameState): GameState {
  const now = Date.now();
  const elapsed = now - state.lastSaveTime;
  const hoursElapsed = elapsed / (1000 * 60 * 60);

  if (hoursElapsed < 0.01) return state; // 36초 미만은 무시

  const perks = getAggregatedRoomPerks(state, now);
  const hungerMult = getDecayMultiplier(perks.hungerDecayReducePct);
  const moodMult = getDecayMultiplier(perks.moodDecayReducePct);
  const cleanMult = getDecayMultiplier(perks.cleanDecayReducePct);
  const fatigueMult = getDecayMultiplier(perks.fatigueDecayReducePct);

  const newStatus: PetStatus = {
    hunger: clamp(state.status.hunger + DECAY_RATES.hunger * hoursElapsed * hungerMult, 0, 100),
    mood: clamp(state.status.mood + DECAY_RATES.mood * hoursElapsed * moodMult, 0, 100),
    clean: clamp(state.status.clean + DECAY_RATES.clean * hoursElapsed * cleanMult, 0, 100),
    fatigue: clamp(state.status.fatigue + DECAY_RATES.fatigue * hoursElapsed * fatigueMult, 0, 100),
  };

  // 상태가 나쁘면 기분 추가 감소
  if (newStatus.hunger < 30) newStatus.mood = clamp(newStatus.mood - 5, 0, 100);
  if (newStatus.clean < 30) newStatus.mood = clamp(newStatus.mood - 3, 0, 100);
  if (newStatus.fatigue > 80) newStatus.mood = clamp(newStatus.mood - 5, 0, 100);

  return {
    ...state,
    status: newStatus,
    lastSaveTime: now,
  };
}

// ===== EXP 2배 버프 (별빛 성장 간식) =====

export const FOOD_STAR_GROWTH_SNACK_ID = 'food_star_growth_snack';
export const FOOD_ENERGY_JELLY_ID = 'food_energy_jelly';
export const FOOD_INTIMACY_BOOSTER_ID = 'food_intimacy_booster';
export const SPECIAL_RIBBON_EASE_ID = 'special_ribbon_ease';
export const GEM_PUZZLE_HINT_PACK_ID = 'gem_puzzle_hint_pack';

export const EXP_BOOST_DURATION_MS = 86_400_000; // 24시간
export const INTIMACY_BOOST_DURATION_MS = 43_200_000; // 12시간
export const INTIMACY_BOOST_MULT = 1.5;
export const RIBBON_EASE_NOTE_SPEED_MULT = 0.85;
export const RIBBON_EASE_SPAWN_INTERVAL_MULT = 1.2;

export function isExpBoostActive(state: GameState, now = Date.now()): boolean {
  return typeof state.expBoostUntil === 'number' && state.expBoostUntil > now;
}

export function getExpBoostRemainingMs(state: GameState, now = Date.now()): number {
  if (!isExpBoostActive(state, now)) return 0;
  return state.expBoostUntil! - now;
}

export function activateExpBoost(state: GameState, now = Date.now()): GameState {
  return {
    ...state,
    expBoostUntil: now + EXP_BOOST_DURATION_MS,
    lastSaveTime: now,
  };
}

/** 알 패시브 적용 후 활동 EXP 2배 버프가 있으면 ×2 */
export function applyExpGain(state: GameState, baseExp: number, now = Date.now()): number {
  const withPassive = applyExpPassive(
    baseExp,
    state.eggColor as EggColorId | null,
    state.gachaEgg as GachaEggId | null,
  );
  return isExpBoostActive(state, now) ? withPassive * 2 : withPassive;
}

// ===== 친밀도 1.5배 버프 (하트 친밀 드링크) =====

export function isIntimacyBoostActive(state: GameState, now = Date.now()): boolean {
  return typeof state.intimacyBoostUntil === 'number' && state.intimacyBoostUntil > now;
}

export function getIntimacyBoostRemainingMs(state: GameState, now = Date.now()): number {
  if (!isIntimacyBoostActive(state, now)) return 0;
  return state.intimacyBoostUntil! - now;
}

export function activateIntimacyBoost(state: GameState, now = Date.now()): GameState {
  return {
    ...state,
    intimacyBoostUntil: now + INTIMACY_BOOST_DURATION_MS,
    lastSaveTime: now,
  };
}

/** 친밀도 버프가 있으면 ×1.5 (소수 1자리) */
export function applyIntimacyGain(base: number, state: GameState, now = Date.now()): number {
  const boosted = isIntimacyBoostActive(state, now) ? base * INTIMACY_BOOST_MULT : base;
  return Math.round(boosted * 10) / 10;
}

export function consumeRibbonEaseTicket(state: GameState, now = Date.now()): GameState | null {
  const itemIndex = state.inventory.findIndex(
    i => i.id === SPECIAL_RIBBON_EASE_ID && i.quantity > 0,
  );
  if (itemIndex === -1) return null;

  const item = state.inventory[itemIndex];
  const newInventory = [...state.inventory];
  if (item.quantity <= 1) {
    newInventory.splice(itemIndex, 1);
  } else {
    newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
  }

  return {
    ...state,
    inventory: newInventory,
    lastSaveTime: now,
  };
}

// ===== 행동 로직 =====

export type FeedPetResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'not_found' | 'exp_boost_active' | 'intimacy_boost_active' };

export function feedPet(state: GameState, itemId: string, now = Date.now()): FeedPetResult {
  const itemIndex = state.inventory.findIndex(i => i.id === itemId && i.quantity > 0);
  if (itemIndex === -1) return { ok: false, reason: 'not_found' };

  const item = state.inventory[itemIndex];

  if (itemId === FOOD_STAR_GROWTH_SNACK_ID) {
    if (isExpBoostActive(state, now)) {
      return { ok: false, reason: 'exp_boost_active' };
    }

    const newStatus = applyEffect(state.status, item.effect);
    const newInventory = [...state.inventory];
    newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };

    const fedState: GameState = {
      ...state,
      status: newStatus,
      pet: {
        ...state.pet,
        intimacy: clamp(state.pet.intimacy + 1, 0, 100),
      },
      inventory: newInventory,
      lastSaveTime: now,
    };

    return { ok: true, state: activateExpBoost(fedState, now) };
  }

  if (itemId === FOOD_INTIMACY_BOOSTER_ID) {
    if (isIntimacyBoostActive(state, now)) {
      return { ok: false, reason: 'intimacy_boost_active' };
    }

    const newStatus = applyEffect(state.status, item.effect);
    const newInventory = [...state.inventory];
    newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };

    const fedState: GameState = {
      ...state,
      status: newStatus,
      pet: {
        ...state.pet,
        intimacy: clamp(state.pet.intimacy + applyIntimacyGain(1, state, now), 0, 100),
      },
      inventory: newInventory,
      lastSaveTime: now,
    };

    return { ok: true, state: activateIntimacyBoost(fedState, now) };
  }

  const perks = getAggregatedRoomPerks(state, now);
  let newStatus = applyEffect(state.status, item.effect);
  if (perks.feedMoodBonus > 0) {
    newStatus = { ...newStatus, mood: clamp(newStatus.mood + perks.feedMoodBonus, 0, 100) };
  }
  if (perks.feedHungerBonus > 0) {
    newStatus = { ...newStatus, hunger: clamp(newStatus.hunger + perks.feedHungerBonus, 0, 100) };
  }
  const newTraits = item.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  const newInventory = [...state.inventory];
  newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };

  const intimacyGain = applyIntimacyGain(applyIntimacyWithPerks(1, state, perks), state, now);

  return {
    ok: true,
    state: {
      ...state,
      status: newStatus,
      pet: {
        ...state.pet,
        traits: newTraits,
        exp: state.pet.exp + applyExpGain(state, 8, now),
        intimacy: clamp(state.pet.intimacy + intimacyGain, 0, 100),
      },
      inventory: newInventory,
      lastSaveTime: now,
    },
  };
}

export function playWithPet(state: GameState, itemId: string, now = Date.now()): GameState {
  const itemIndex = state.inventory.findIndex(i => i.id === itemId && i.type === 'toy');
  if (itemIndex === -1) return state;

  const item = state.inventory[itemIndex];
  const perks = getAggregatedRoomPerks(state, now);
  let newStatus = applyEffect(state.status, item.effect);
  if (perks.playMoodBonus > 0) {
    newStatus = { ...newStatus, mood: clamp(newStatus.mood + perks.playMoodBonus, 0, 100) };
  }
  const newTraits = item.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  const playExpBase = 15 * (1 + perks.playExpBonusPct / 100);
  const intimacyGain = applyIntimacyGain(applyIntimacyWithPerks(2, state, perks), state, now);

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + applyExpGain(state, playExpBase, now),
      intimacy: clamp(state.pet.intimacy + intimacyGain, 0, 100),
    },
    coins: state.coins + 5,
    lastSaveTime: now,
  };
}

export function cleanPet(state: GameState, now = Date.now()): GameState {
  const perks = getAggregatedRoomPerks(state, now);
  const cleanBoost = 1 + perks.cleanEffectBonusPct / 100;
  // 방안 B: 청결 수치가 60 이하일 때만 EXP 지급 (진짜 더러울 때만 보상)
  const isDirty = state.status.clean <= 60;
  const intimacyGain = isDirty
    ? applyIntimacyGain(applyIntimacyWithPerks(1, state, perks), state, now)
    : 0;
  return {
    ...state,
    status: {
      ...state.status,
      clean: clamp(state.status.clean + 40 * cleanBoost, 0, 100),
      mood: clamp(state.status.mood + 5, 0, 100),
    },
    pet: {
      ...state.pet,
      exp: isDirty ? state.pet.exp + applyExpGain(state, 5, now) : state.pet.exp,
      intimacy: isDirty ? clamp(state.pet.intimacy + intimacyGain, 0, 100) : state.pet.intimacy,
    },
    lastSaveTime: now,
  };
}

export function sleepPet(state: GameState, now = Date.now()): GameState {
  const perks = getAggregatedRoomPerks(state, now);
  const fatigueRecovery = 50 + Math.round(50 * perks.sleepFatigueBonusPct / 100);
  // 방안 B: 피로 수치가 40 이상일 때만 EXP 지급 (진짜 피곤할 때만 보상)
  const isTired = state.status.fatigue >= 40;
  return {
    ...state,
    status: {
      ...state.status,
      fatigue: clamp(state.status.fatigue - fatigueRecovery, 0, 100),
      mood: clamp(state.status.mood + 10 + perks.sleepMoodBonus, 0, 100),
    },
    pet: {
      ...state.pet,
      exp: isTired ? state.pet.exp + applyExpGain(state, 3, now) : state.pet.exp,
    },
    lastSaveTime: now,
  };
}

export function touchPet(state: GameState, now = Date.now()): GameState {
  const perks = getAggregatedRoomPerks(state, now);
  const { bonus: touchIntimacyBonus, consumeDaily } = getTouchIntimacyBonus(state, perks, now);
  let nextState = state;
  if (consumeDaily) {
    const withDaily = withTouchIntimacyDailyUsed(state, now);
    nextState = { ...state, roomPerkDaily: withDaily.roomPerkDaily };
  }

  const baseIntimacy = applyIntimacyWithPerks(0.5, state, perks) + touchIntimacyBonus;
  const intimacyGain = applyIntimacyGain(baseIntimacy, state, now);
  let expGain = 0;
  if (perks.touchExpBonusPct > 0 && !isExpBoostActive(state, now)) {
    const touchExpBase = 2 * (1 + perks.touchExpBonusPct / 100);
    expGain = applyExpGain(state, touchExpBase, now);
  }

  return {
    ...nextState,
    status: {
      ...nextState.status,
      mood: clamp(nextState.status.mood + 3, 0, 100),
    },
    pet: {
      ...nextState.pet,
      exp: nextState.pet.exp + expGain,
      intimacy: clamp(nextState.pet.intimacy + intimacyGain, 0, 100),
    },
    lastSaveTime: now,
  };
}

// ===== 특수 액션 (가챠 알 전용) =====

/** 현재 가챠 알의 특수 액션 ID 조회 */
export function getActiveSpecialActionId(state: GameState): string | null {
  if (!state.gachaEgg) return null;
  const gachaDef = getGachaEgg(state.gachaEgg as GachaEggId);
  return gachaDef.passiveEffect.specialAction ?? null;
}

/** 특수 액션 쿨다운 남은 시간(ms). 0이면 사용 가능 */
export function getSpecialActionCooldownRemaining(state: GameState, now = Date.now()): number {
  if (!state.lastSpecialActionAt) return 0;
  const elapsed = now - state.lastSpecialActionAt;
  return Math.max(0, SPECIAL_ACTION_COOLDOWN_MS - elapsed);
}

export function canPerformSpecialAction(state: GameState, now = Date.now()): boolean {
  if (!getActiveSpecialActionId(state)) return false;
  return getSpecialActionCooldownRemaining(state, now) === 0;
}

/** 특수 액션 실행 — 쿨다운 중이거나 가챠 알 없으면 null */
export function performSpecialAction(state: GameState, now = Date.now()): GameState | null {
  const actionId = getActiveSpecialActionId(state);
  if (!actionId || getSpecialActionCooldownRemaining(state, now) > 0) return null;

  const def = getSpecialActionDef(actionId);
  if (!def) return null;

  const expGain = applyExpGain(state, def.expBoost, now);

  return {
    ...state,
    status: {
      ...state.status,
      mood: clamp(state.status.mood + def.moodBoost, 0, 100),
    },
    pet: {
      ...state.pet,
      exp: state.pet.exp + expGain,
      intimacy: clamp(state.pet.intimacy + 1, 0, 100),
    },
    lastSpecialActionAt: now,
    lastSaveTime: now,
  };
}

// ===== 진화 로직 (speciesRegistry.checkEvolution 참조) =====

export function evolvePet(state: GameState, result: EvolutionResult): GameState {
  return {
    ...state,
    pet: {
      ...state.pet,
      species: result.newSpecies,
      stage: result.newStage,
      traits: applyTraitBonus(state.pet.traits, result.statBoosts),
    },
    collection: state.collection.includes(result.newSpecies)
      ? state.collection
      : [...state.collection, result.newSpecies],
  };
}

// ===== 레벨업 =====

export function checkLevelUp(state: GameState): GameState {
  let { exp, level, expToNext } = state.pet;
  let leveled = false;

  while (exp >= expToNext) {
    exp -= expToNext;
    level += 1;
    expToNext = Math.floor(expToNext * 1.1);
    leveled = true;
  }

  if (!leveled) return state;

  return {
    ...state,
    pet: { ...state.pet, exp, level, expToNext },
  };
}

// ===== 유틸리티 =====

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyEffect(status: PetStatus, effect: Partial<PetStatus>): PetStatus {
  return {
    hunger: clamp(status.hunger + (effect.hunger || 0), 0, 100),
    mood: clamp(status.mood + (effect.mood || 0), 0, 100),
    clean: clamp(status.clean + (effect.clean || 0), 0, 100),
    fatigue: clamp(status.fatigue - (effect.fatigue || 0), 0, 100), // fatigue는 감소가 긍정적
  };
}

function applyTraitBonus(traits: GrowthTraits, bonus: Partial<GrowthTraits>): GrowthTraits {
  return {
    power: traits.power + (bonus.power || 0),
    intelligence: traits.intelligence + (bonus.intelligence || 0),
    charm: traits.charm + (bonus.charm || 0),
    vitality: traits.vitality + (bonus.vitality || 0),
  };
}

// ===== 이름 변경 =====

/** 플레이어 닉네임 변경 (반려몬 이름과 별개) */
export function setPlayerNickname(state: GameState, nickname: string): GameState {
  const trimmed = nickname.trim();
  if (!trimmed || trimmed.length > 12) return state;
  return {
    ...state,
    nickname: trimmed,
    lastSaveTime: Date.now(),
  };
}

export function renamePet(state: GameState, newName: string): GameState {
  const trimmed = newName.trim();
  if (!trimmed || trimmed.length > 12) return state;
  return {
    ...state,
    pet: { ...state.pet, name: trimmed },
    lastSaveTime: Date.now(),
  };
}

// ===== 상점 구매 =====

export interface ShopItemDef {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'decor' | 'wallpaper';
  icon: string;
  price: number;
  currency: 'coins' | 'gems' | 'friendCoins';
  description: string;
  /** 인벤토리에 추가할 아이템 정의 (food/toy) */
  inventoryItem?: Omit<InventoryItem, 'quantity'>;
  /** 구매 즉시 적용 (인벤토리 없음) */
  purchaseEffect?: { kind: 'puzzle_hint_credits'; amount: number };
  /** 배경 이미지 URL (wallpaper 전용) */
  wallpaperUrl?: string;
}

export type FragmentExchangeReward =
  | { type: 'inventory'; item: Omit<InventoryItem, 'quantity'>; quantity: number }
  | { type: 'decor'; decorId: string }
  | { type: 'gachaEgg'; eggId: 'rainbow_g'; traitBonus: GrowthTraits }
  | { type: 'coins'; amount: number }
  | { type: 'gems'; amount: number }
  | { type: 'exp'; amount: number };

export interface FragmentExchangeDef {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
  rewardLabel: string;
  reward: FragmentExchangeReward;
  /** true면 하루 1회만 교환 가능 */
  dailyLimit?: boolean;
}

export const RAINBOW_FRAGMENT_ID = 'fragment_rainbow';

export const RAINBOW_FRAGMENT_EXCHANGES: FragmentExchangeDef[] = [
  {
    id: 'rainbow_snack',
    name: '무지개 간식',
    icon: '🍰',
    cost: 5,
    description: '배고픔과 기분을 함께 채워주는 특별 간식이에요.',
    rewardLabel: '무지개 간식 ×1',
    reward: {
      type: 'inventory',
      quantity: 1,
      item: {
        id: 'food_rainbow_snack',
        name: '무지개 간식',
        type: 'food',
        icon: '🍰',
        effect: { hunger: 18, mood: 12 },
        traitBonus: { charm: 2, vitality: 2 },
        description: '무지개 조각으로 만든 달콤한 간식이에요.',
      },
    },
  },
  {
    id: 'rainbow_ribbon_toy',
    name: '리본 장난감',
    icon: '🎀',
    cost: 10,
    description: '매력을 길러주는 상점 인기 장난감이에요.',
    rewardLabel: '리본 장난감 ×1',
    reward: {
      type: 'inventory',
      quantity: 1,
      item: {
        id: 'toy_ribbon',
        name: '리본 장난감',
        type: 'toy',
        icon: '🎀',
        effect: { mood: 25, fatigue: 10 },
        traitBonus: { charm: 5 },
        description: '리본 장난감으로 매력이 올라가요!',
      },
    },
  },
  {
    id: 'rainbow_window',
    name: '무지개 창문',
    icon: '🌈',
    cost: 20,
    description: '방에 무지개빛을 더하는 특별 가구예요.',
    rewardLabel: '무지개 창문 가구',
    reward: { type: 'decor', decorId: 'decor_rainbow' },
  },
  {
    id: 'rainbow_egg_blessing',
    name: '무지개알의 축복',
    icon: '🥚',
    cost: 30,
    description: '현재 모험에 전설 무지개알의 성향 보너스를 부여해요.',
    rewardLabel: '무지개알 효과 적용',
    reward: {
      type: 'gachaEgg',
      eggId: 'rainbow_g',
      traitBonus: { power: 20, intelligence: 20, charm: 20, vitality: 20 },
    },
  },
];

export const SPARKLE_FRAGMENT_ID = 'fragment_sparkle';

export const SPARKLE_FRAGMENT_EXCHANGES: FragmentExchangeDef[] = [
  {
    id: 'sparkle_salad',
    name: '잎사귀 샐러드',
    icon: '🥗',
    cost: 2,
    description: '신선한 채소 간식으로 배고픔을 채워요. (상점 40코인 상당)',
    rewardLabel: '잎사귀 샐러드 ×1',
    reward: {
      type: 'inventory',
      quantity: 1,
      item: {
        id: 'food_salad',
        name: '잎사귀 샐러드',
        type: 'food',
        icon: '🥗',
        effect: { hunger: 12, clean: 5 },
        traitBonus: { vitality: 2 },
        description: '신선한 채소로 건강을 챙겨요!',
      },
    },
  },
  {
    id: 'sparkle_cookie',
    name: '꿀방울 쿠키',
    icon: '🍪',
    cost: 3,
    description: '달콤한 쿠키로 기분을 올려요. (상점 50코인 상당)',
    rewardLabel: '꿀방울 쿠키 ×1',
    reward: {
      type: 'inventory',
      quantity: 1,
      item: {
        id: 'food_cookie',
        name: '꿀방울 쿠키',
        type: 'food',
        icon: '🍪',
        effect: { hunger: 10, mood: 10 },
        traitBonus: { charm: 2 },
        description: '달콤한 쿠키로 기분이 좋아져요!',
      },
    },
  },
  {
    id: 'sparkle_exp_boost',
    name: 'EXP 부스터',
    icon: '✨',
    cost: 4,
    description: '반려몬에게 즉시 경험치를 부여해요.',
    rewardLabel: 'EXP +40',
    reward: { type: 'exp', amount: 40 },
  },
  {
    id: 'sparkle_lucky_draw',
    name: '행운 뽑기권',
    icon: '🎰',
    cost: 6,
    description: '오늘 하루 1회! 행운의 젬을 뽑아요.',
    rewardLabel: '젬 +1 (행운 뽑기)',
    dailyLimit: true,
    reward: { type: 'gems', amount: 1 },
  },
];

export type PurchaseResult =
  | { success: true; newState: GameState }
  | { success: false; reason: 'insufficient_funds' | 'already_owned' };

export type GrantPurchasedGemsResult =
  | { success: true; newState: GameState }
  | { success: false; reason: 'duplicate_purchase' | 'invalid_amount' };

export type FragmentExchangeResult =
  | { success: true; newState: GameState; exchange: FragmentExchangeDef }
  | { success: false; reason: 'not_found' | 'insufficient_fragments' | 'already_owned' | 'daily_limit'; exchange?: FragmentExchangeDef };

function applyFragmentExchangeReward(
  state: GameState,
  inventoryAfterCost: InventoryItem[],
  reward: FragmentExchangeReward
): GameState {
  if (reward.type === 'inventory') {
    return {
      ...state,
      inventory: addInventoryItem(inventoryAfterCost, reward.item, reward.quantity),
      lastSaveTime: Date.now(),
    };
  }

  if (reward.type === 'decor') {
    return {
      ...state,
      inventory: inventoryAfterCost,
      room: {
        ...state.room,
        furniture: [...(state.room?.furniture ?? []), reward.decorId],
      },
      lastSaveTime: Date.now(),
    };
  }

  if (reward.type === 'gachaEgg') {
    return {
      ...state,
      inventory: inventoryAfterCost,
      gachaEgg: reward.eggId,
      pet: {
        ...state.pet,
        traits: {
          power: state.pet.traits.power + reward.traitBonus.power,
          intelligence: state.pet.traits.intelligence + reward.traitBonus.intelligence,
          charm: state.pet.traits.charm + reward.traitBonus.charm,
          vitality: state.pet.traits.vitality + reward.traitBonus.vitality,
        },
      },
      lastSaveTime: Date.now(),
    };
  }

  if (reward.type === 'coins') {
    return {
      ...state,
      inventory: inventoryAfterCost,
      coins: state.coins + reward.amount,
      lastSaveTime: Date.now(),
    };
  }

  if (reward.type === 'gems') {
    return {
      ...state,
      inventory: inventoryAfterCost,
      gems: state.gems + reward.amount,
      lastSaveTime: Date.now(),
    };
  }

  return {
    ...state,
    inventory: inventoryAfterCost,
    pet: {
      ...state.pet,
      exp: state.pet.exp + reward.amount,
    },
    lastSaveTime: Date.now(),
  };
}

function exchangeFragmentsByCatalog(
  state: GameState,
  exchangeId: string,
  fragmentId: string,
  catalog: FragmentExchangeDef[]
): FragmentExchangeResult {
  const exchange = catalog.find(item => item.id === exchangeId);
  if (!exchange) return { success: false, reason: 'not_found' };

  if (exchange.dailyLimit) {
    const today = todayStr();
    if (state.fragmentExchangeDaily?.[exchangeId] === today) {
      return { success: false, reason: 'daily_limit', exchange };
    }
  }

  const fragmentQty = getInventoryQuantity(state, fragmentId);
  if (fragmentQty < exchange.cost) {
    return { success: false, reason: 'insufficient_fragments', exchange };
  }

  const inventoryAfterCost = removeInventoryQuantity(state.inventory, fragmentId, exchange.cost);
  const reward = exchange.reward;

  if (reward.type === 'decor') {
    if ((state.room?.furniture ?? []).includes(reward.decorId)) {
      return { success: false, reason: 'already_owned', exchange };
    }
  } else if (reward.type === 'gachaEgg') {
    if (state.gachaEgg === reward.eggId) {
      return { success: false, reason: 'already_owned', exchange };
    }
  }

  let newState = applyFragmentExchangeReward(state, inventoryAfterCost, reward);

  if (exchange.dailyLimit) {
    newState = {
      ...newState,
      fragmentExchangeDaily: {
        ...(newState.fragmentExchangeDaily ?? {}),
        [exchangeId]: todayStr(),
      },
    };
  }

  return { success: true, exchange, newState };
}

export function purchaseItem(
  state: GameState,
  item: ShopItemDef,
  options?: { friendCoinsBalance?: number },
): PurchaseResult {
  // 재화 확인
  const balance =
    item.currency === 'coins' ? state.coins
    : item.currency === 'gems' ? state.gems
    : (options?.friendCoinsBalance ?? state.friendCoins ?? 0);
  if (balance < item.price) {
    return { success: false, reason: 'insufficient_funds' };
  }

  // 재화 차감 (friendCoins는 RTDB 트랜잭션으로 별도 처리)
  const newCoins       = item.currency === 'coins'       ? state.coins - item.price : state.coins;
  const newGems        = item.currency === 'gems'        ? state.gems  - item.price : state.gems;
  const newFriendCoins = item.currency === 'friendCoins' ? (state.friendCoins ?? 0) : (state.friendCoins ?? 0);

  // 배경(wallpaper) 처리: ownedWallpapers 배열에 추가 후 즉시 적용
  if (item.type === 'wallpaper') {
    const owned = state.ownedWallpapers ?? [];
    if (owned.includes(item.id)) {
      return { success: false, reason: 'already_owned' };
    }
    return {
      success: true,
      newState: {
        ...state,
        coins: newCoins,
        gems: newGems,
        friendCoins: newFriendCoins,
        ownedWallpapers: [...owned, item.id],
        room: {
          ...state.room,
          wallpaper: item.id,
        },
        lastSaveTime: Date.now(),
      },
    };
  }

  // 가구(decor) 처리: room.furniture 배열에 추가 (중복 허용 안 함)
  if (item.type === 'decor') {
    if (state.room.furniture.includes(item.id)) {
      return { success: false, reason: 'already_owned' };
    }
    const preset = getLayoutPlacement(state.room.wallpaper, item.id);
    const newPlacement: PlacedDecor | null = preset
      ? {
          id: item.id,
          x: preset.x,
          y: preset.y,
          scale: preset.scale,
          zIndex: preset.zIndex,
        }
      : null;
    const existingPlacements = state.room.placements ?? [];
    return {
      success: true,
      newState: {
        ...state,
        coins: newCoins,
        gems: newGems,
        friendCoins: newFriendCoins,
        room: {
          ...state.room,
          furniture: [...state.room.furniture, item.id],
          placements: newPlacement
            ? [...existingPlacements.filter(p => p.id !== item.id), newPlacement]
            : existingPlacements,
        },
        lastSaveTime: Date.now(),
      },
    };
  }

  if (item.purchaseEffect?.kind === 'puzzle_hint_credits') {
    return {
      success: true,
      newState: {
        ...state,
        coins: newCoins,
        gems: newGems,
        friendCoins: newFriendCoins,
        puzzleHintCredits: (state.puzzleHintCredits ?? 0) + item.purchaseEffect.amount,
        lastSaveTime: Date.now(),
      },
    };
  }

  // 음식/장난감 처리: 인벤토리에 수량 추가
  if (item.inventoryItem) {
    const existingIdx = state.inventory.findIndex(i => i.id === item.id);
    let newInventory: InventoryItem[];

    if (existingIdx >= 0) {
      // 이미 보유 중 → 수량 +1
      newInventory = state.inventory.map((inv, idx) =>
        idx === existingIdx ? { ...inv, quantity: inv.quantity + 1 } : inv
      );
    } else {
      // 신규 아이템 → 인벤토리에 추가
      newInventory = [...state.inventory, { ...item.inventoryItem, quantity: 1 }];
    }

    return {
      success: true,
      newState: {
        ...state,
        coins: newCoins,
        gems: newGems,
        friendCoins: newFriendCoins,
        inventory: newInventory,
        lastSaveTime: Date.now(),
      },
    };
  }

  // inventoryItem 정의 없는 경우 재화만 차감
  return {
    success: true,
    newState: {
      ...state,
      coins: newCoins,
      gems: newGems,
      friendCoins: newFriendCoins,
      lastSaveTime: Date.now(),
    },
  };
}

/** 보유한 배경 재적용 (재화 차감 없음) */
export function applyWallpaper(state: GameState, wallpaperId: string): GameState {
  const owned = state.ownedWallpapers ?? [];
  if (wallpaperId !== 'default' && !owned.includes(wallpaperId)) {
    return state;
  }
  return {
    ...state,
    room: {
      ...state.room,
      wallpaper: wallpaperId,
    },
    lastSaveTime: Date.now(),
  };
}

/** 사용자 커스텀 가구 배치 저장 */
export function updateRoomPlacements(state: GameState, placements: PlacedDecor[]): GameState {
  return {
    ...state,
    room: {
      ...state.room,
      placements,
    },
    lastSaveTime: Date.now(),
  };
}

/** 단일 가구 배치 갱신 */
export function updateSinglePlacement(
  state: GameState,
  decorId: string,
  patch: Partial<Omit<PlacedDecor, 'id'>>,
): GameState {
  const existing = state.room.placements ?? [];
  const idx = existing.findIndex(p => p.id === decorId);
  const preset = getLayoutPlacement(state.room.wallpaper, decorId);
  const base: PlacedDecor = idx >= 0
    ? existing[idx]
    : preset
      ? { id: decorId, x: preset.x, y: preset.y, scale: preset.scale, zIndex: preset.zIndex }
      : { id: decorId, x: 0.5, y: 0.5, scale: 1 };

  const updated: PlacedDecor = { ...base, ...patch, id: decorId };
  const next = idx >= 0
    ? existing.map((p, i) => (i === idx ? updated : p))
    : [...existing, updated];

  return updateRoomPlacements(state, next);
}

/** preset 좌표로 초기화 (커스텀 placement 제거) */
export function resetDecorPlacement(state: GameState, decorId: string): GameState {
  const preset = getLayoutPlacement(state.room.wallpaper, decorId);
  if (!preset) {
    const next = (state.room.placements ?? []).filter(p => p.id !== decorId);
    return updateRoomPlacements(state, next);
  }
  const placed: PlacedDecor = {
    id: decorId,
    x: preset.x,
    y: preset.y,
    scale: preset.scale,
    rotation: preset.rotation ?? 0,
    flipX: preset.flipX ?? false,
    zIndex: preset.zIndex ?? 2,
  };
  const without = (state.room.placements ?? []).filter(p => p.id !== decorId);
  return updateRoomPlacements(state, [...without, placed]);
}

/** 방에서 가구 숨기기 (보유 유지) */
export function hideDecorInRoom(state: GameState, decorId: string): GameState {
  const hidden = state.room.hiddenDecor ?? [];
  if (hidden.includes(decorId)) return state;
  return {
    ...state,
    room: { ...state.room, hiddenDecor: [...hidden, decorId] },
    lastSaveTime: Date.now(),
  };
}

/** 숨긴 가구 다시 표시 */
export function showDecorInRoom(state: GameState, decorId: string): GameState {
  const hidden = (state.room.hiddenDecor ?? []).filter(id => id !== decorId);
  return {
    ...state,
    room: { ...state.room, hiddenDecor: hidden },
    lastSaveTime: Date.now(),
  };
}

/** 90° 회전 */
export function rotateRoomDecor(state: GameState, decorId: string, deltaDeg = 90): GameState {
  const existing = state.room.placements?.find(p => p.id === decorId);
  const preset = getLayoutPlacement(state.room.wallpaper, decorId);
  const current = existing?.rotation ?? preset?.rotation ?? 0;
  return updateSinglePlacement(state, decorId, { rotation: (current + deltaDeg + 360) % 360 });
}

/** z-index 조정 (1~5) */
export function adjustDecorZIndex(state: GameState, decorId: string, delta: number): GameState {
  const existing = state.room.placements?.find(p => p.id === decorId);
  const preset = getLayoutPlacement(state.room.wallpaper, decorId);
  const current = existing?.zIndex ?? preset?.zIndex ?? 2;
  return updateSinglePlacement(state, decorId, { zIndex: Math.max(1, Math.min(5, current + delta)) });
}

export function grantPurchasedGems(
  state: GameState,
  purchaseKey: string,
  productId: string,
  amount: number,
  quantity = 1
): GrantPurchasedGemsResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, reason: 'invalid_amount' };
  }

  const purchases = state.iapPurchases ?? {};
  if (purchases[purchaseKey]) {
    return { success: false, reason: 'duplicate_purchase' };
  }

  return {
    success: true,
    newState: {
      ...state,
      gems: state.gems + amount,
      iapPurchases: {
        ...purchases,
        [purchaseKey]: {
          productId,
          amount,
          quantity,
          grantedAt: Date.now(),
        },
      },
      lastSaveTime: Date.now(),
    },
  };
}

function addInventoryItem(
  inventory: InventoryItem[],
  item: Omit<InventoryItem, 'quantity'>,
  quantity: number
): InventoryItem[] {
  const existingIdx = inventory.findIndex(i => i.id === item.id);
  if (existingIdx >= 0) {
    return inventory.map((inv, idx) =>
      idx === existingIdx ? { ...inv, quantity: inv.quantity + quantity } : inv
    );
  }
  return [...inventory, { ...item, quantity }];
}

function removeInventoryQuantity(inventory: InventoryItem[], itemId: string, quantity: number): InventoryItem[] {
  return inventory
    .map(item => item.id === itemId ? { ...item, quantity: item.quantity - quantity } : item)
    .filter(item => item.quantity > 0);
}

export function getInventoryQuantity(state: GameState, itemId: string): number {
  return state.inventory.find(item => item.id === itemId)?.quantity ?? 0;
}

export function exchangeRainbowFragments(state: GameState, exchangeId: string): FragmentExchangeResult {
  return exchangeFragmentsByCatalog(state, exchangeId, RAINBOW_FRAGMENT_ID, RAINBOW_FRAGMENT_EXCHANGES);
}

export function exchangeSparkleFragments(state: GameState, exchangeId: string): FragmentExchangeResult {
  return exchangeFragmentsByCatalog(state, exchangeId, SPARKLE_FRAGMENT_ID, SPARKLE_FRAGMENT_EXCHANGES);
}

// ===== 미션 시스템 =====

/** 미션 진행도 업데이트 (feed/play/clean/sleep/shop) */
export function advanceMission(state: GameState, type: MissionType): GameState {
  // 날짜가 바뀌면 미션 리셋
  const today = todayStr();
  const missionsToUse =
    state.missions.lastResetDate !== today
      ? createDailyMissions()
      : state.missions.missions;

  const updatedMissions = missionsToUse.map(m => {
    if (m.type !== type || m.completed) return m;
    const newCurrent = m.current + 1;
    const completed = newCurrent >= m.target;
    return { ...m, current: newCurrent, completed };
  });

  return {
    ...state,
    missions: {
      missions: updatedMissions,
      lastResetDate: today,
    },
  };
}

/** 미션 보상 수령 */
export function claimMissionReward(
  state: GameState,
  missionId: string
): GameState {
  const mission = state.missions.missions.find(m => m.id === missionId);
  if (!mission || !mission.completed || mission.claimed) return state;

  const updatedMissions = state.missions.missions.map(m =>
    m.id === missionId ? { ...m, claimed: true } : m
  );

  return {
    ...state,
    coins: state.coins + mission.reward.coins,
    pet: {
      ...state.pet,
      exp: state.pet.exp + mission.reward.exp,
    },
    missions: { ...state.missions, missions: updatedMissions },
    lastSaveTime: Date.now(),
  };
}

/** 광고 시청 후 미션 젬 +1 보상 지급 */
export function claimMissionAdReward(
  state: GameState,
  missionId: string
): GameState {
  const mission = state.missions.missions.find(m => m.id === missionId);
  // 미션이 완료되고 기본 보상은 수령했으나 광고 보상은 아직 수령 안 한 경우만 허용
  if (!mission || !mission.claimed || mission.adRewardClaimed) return state;

  const updatedMissions = state.missions.missions.map(m =>
    m.id === missionId ? { ...m, adRewardClaimed: true } : m
  );

  return {
    ...state,
    gems: state.gems + 1,
    missions: { ...state.missions, missions: updatedMissions },
    lastSaveTime: Date.now(),
  };
}

/** 미션 리셋 필요 여부 확인 */
export function needsMissionReset(state: GameState): boolean {
  return state.missions.lastResetDate !== todayStr();
}

/** 주간 문자열 (ISO week) */
export function getWeekStr(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ===== 친밀도 마일스톤 =====

export interface IntimacyMilestoneClaim {
  id: string;
  label: string;
  message: string;
}

export function applyIntimacyMilestones(state: GameState): {
  newState: GameState;
  newlyClaimed: IntimacyMilestoneClaim[];
} {
  const intimacy = state.pet.intimacy;
  const claimed = state.claimedIntimacyRewards ?? [];
  const unlocked = state.unlockedEmotions ?? [];
  const newlyClaimed: IntimacyMilestoneClaim[] = [];

  let coins = state.coins;
  let gems = state.gems;
  const newClaimed = [...claimed];
  const newUnlocked = [...unlocked];

  for (const milestone of INTIMACY_MILESTONES) {
    if (intimacy < milestone.threshold || newClaimed.includes(milestone.id)) continue;

    newClaimed.push(milestone.id);
    coins += milestone.reward.coins ?? 0;
    gems += milestone.reward.gems ?? 0;

    if (milestone.unlockEmotion && !newUnlocked.includes(milestone.unlockEmotion)) {
      newUnlocked.push(milestone.unlockEmotion);
    }

    const parts: string[] = [];
    if (milestone.reward.coins) parts.push(`코인 ${milestone.reward.coins}`);
    if (milestone.reward.gems) parts.push(`젬 ${milestone.reward.gems}`);
    if (milestone.unlockPhrase) parts.push('특별 말풍선 해금');

    newlyClaimed.push({
      id: milestone.id,
      label: milestone.label,
      message: `친밀도 ${milestone.threshold} 달성! ${parts.join(' · ')}`,
    });
  }

  if (newlyClaimed.length === 0) {
    return { newState: state, newlyClaimed: [] };
  }

  return {
    newState: {
      ...state,
      coins,
      gems,
      claimedIntimacyRewards: newClaimed,
      unlockedEmotions: newUnlocked,
      lastSaveTime: Date.now(),
    },
    newlyClaimed,
  };
}

// ===== 일일 챌린지 =====

function ensureDailyChallenges(state: GameState): DailyChallenge[] {
  const today = todayStr();
  if (state.dailyChallenges?.lastResetDate !== today) {
    return createDailyChallenges();
  }
  return state.dailyChallenges.challenges;
}

export function needsDailyChallengeReset(state: GameState): boolean {
  return (state.dailyChallenges?.lastResetDate ?? '') !== todayStr();
}

export function advanceDailyChallengeOnTouch(state: GameState): GameState {
  const today = todayStr();
  const challenges = ensureDailyChallenges(state).map(ch => {
    if (ch.id !== 'daily_touch_5' || ch.completed) return ch;
    const newCurrent = ch.current + 1;
    return {
      ...ch,
      current: newCurrent,
      completed: newCurrent >= ch.target,
    };
  });

  return {
    ...state,
    dailyChallenges: { challenges, lastResetDate: today },
  };
}

export function advanceDailyChallengeOnPuzzle(
  state: GameState,
  moves: number
): GameState {
  const today = todayStr();
  const challenges = ensureDailyChallenges(state).map(ch => {
    if (ch.id !== 'daily_puzzle_25' || ch.completed) return ch;
    if (moves > 25) return ch;
    return { ...ch, current: 1, completed: true };
  });

  return {
    ...state,
    dailyChallenges: { challenges, lastResetDate: today },
  };
}

export function advanceDailyChallengeOnBall(
  state: GameState,
  score: number
): GameState {
  const today = todayStr();
  const challenges = ensureDailyChallenges(state).map(ch => {
    if (ch.id !== 'daily_ball_150' || ch.completed) return ch;
    if (score < 150) return ch;
    return { ...ch, current: 1, completed: true };
  });

  return {
    ...state,
    dailyChallenges: { challenges, lastResetDate: today },
  };
}

export function advanceDailyChallengeOnRibbon(
  state: GameState,
  accuracy: number
): GameState {
  const today = todayStr();
  const challenges = ensureDailyChallenges(state).map(ch => {
    if (ch.id !== 'daily_ribbon_90' || ch.completed) return ch;
    if (accuracy < 90) return ch;
    return { ...ch, current: 1, completed: true };
  });

  return {
    ...state,
    dailyChallenges: { challenges, lastResetDate: today },
  };
}

export function advanceDailyChallengeOnLeafFlip(
  state: GameState,
  grade: 'perfect' | 'great' | 'normal' | 'complete'
): GameState {
  const today = todayStr();
  const challenges = ensureDailyChallenges(state).map(ch => {
    if (ch.id !== 'daily_leaf_80' || ch.completed) return ch;
    if (grade !== 'perfect' && grade !== 'great') return ch;
    return { ...ch, current: 1, completed: true };
  });

  return {
    ...state,
    dailyChallenges: { challenges, lastResetDate: today },
  };
}

export function claimDailyChallengeReward(
  state: GameState,
  challengeId: string
): GameState {
  const challenge = state.dailyChallenges.challenges.find(c => c.id === challengeId);
  if (!challenge || !challenge.completed || challenge.claimed) return state;

  let inventory = state.inventory;
  if (challenge.reward.sparkleFragments) {
    inventory = addInventoryItem(inventory, {
      id: SPARKLE_FRAGMENT_ID,
      name: '반짝 조각',
      type: 'special',
      icon: '✨',
      effect: {},
      description: '우수한 미니게임 결과로 얻은 반짝이는 조각이에요.',
    }, challenge.reward.sparkleFragments);
  }

  const updatedChallenges = state.dailyChallenges.challenges.map(c =>
    c.id === challengeId ? { ...c, claimed: true } : c
  );

  return {
    ...state,
    coins: state.coins + challenge.reward.coins,
    inventory,
    dailyChallenges: { ...state.dailyChallenges, challenges: updatedChallenges },
    lastSaveTime: Date.now(),
  };
}

// ===== 주간 육성 목표 =====

function ensureWeeklyGoals(state: GameState): WeeklyGoal[] {
  const currentWeek = getWeekStr(new Date());
  if (state.weeklyGoals?.lastResetWeek !== currentWeek) {
    return createWeeklyGoals();
  }
  return state.weeklyGoals.goals;
}

export function needsWeeklyGoalsReset(state: GameState): boolean {
  return (state.weeklyGoals?.lastResetWeek ?? '') !== getWeekStr(new Date());
}

export function advanceWeeklyGoalOnVisit(state: GameState): GameState {
  const currentWeek = getWeekStr(new Date());
  const goals = ensureWeeklyGoals(state).map(goal => {
    if (goal.id !== 'weekly_visit_5' || goal.completed) return goal;
    const newCurrent = goal.current + 1;
    return { ...goal, current: newCurrent, completed: newCurrent >= goal.target };
  });

  return {
    ...state,
    weeklyGoals: { goals, lastResetWeek: currentWeek },
  };
}

export function advanceWeeklyGoalOnMinigamePerfect(state: GameState): GameState {
  const currentWeek = getWeekStr(new Date());
  const goals = ensureWeeklyGoals(state).map(goal => {
    if (goal.id !== 'weekly_perfect_3' || goal.completed) return goal;
    const newCurrent = goal.current + 1;
    return { ...goal, current: newCurrent, completed: newCurrent >= goal.target };
  });

  return {
    ...state,
    weeklyGoals: { goals, lastResetWeek: currentWeek },
  };
}

export function advanceWeeklyGoalOnPowerEvolve(state: GameState): GameState {
  const currentWeek = getWeekStr(new Date());
  const goals = ensureWeeklyGoals(state).map(goal => {
    if (goal.id !== 'weekly_power_evolve' || goal.completed) return goal;
    return { ...goal, current: 1, completed: true };
  });

  return {
    ...state,
    weeklyGoals: { goals, lastResetWeek: currentWeek },
  };
}

export function claimWeeklyGoalReward(
  state: GameState,
  goalId: string
): GameState {
  const goal = state.weeklyGoals.goals.find(g => g.id === goalId);
  if (!goal || !goal.completed || goal.claimed) return state;

  const updatedGoals = state.weeklyGoals.goals.map(g =>
    g.id === goalId ? { ...g, claimed: true } : g
  );

  return {
    ...state,
    coins: state.coins + (goal.reward.coins ?? 0),
    gems: state.gems + goal.reward.gems,
    weeklyGoals: { ...state.weeklyGoals, goals: updatedGoals },
    lastSaveTime: Date.now(),
  };
}

// ===== 재화 보상 함수 =====

/** 출석 체크 및 보상 지급 */
export interface AttendanceResult {
  isNewDay: boolean;
  streak: number;
  coinsEarned: number;
  gemsEarned: number;
}

export function processAttendance(state: GameState): { newState: GameState; result: AttendanceResult } {
  const today = todayStr();
  const att = state.attendance;

  // 오늘 이미 출석 처리한 경우
  if (att.lastLoginDate === today) {
    return { newState: state, result: { isNewDay: false, streak: att.streak, coinsEarned: 0, gemsEarned: 0 } };
  }

  // 연속 출석 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const newStreak = att.lastLoginDate === yesterdayStr ? att.streak + 1 : 1;

  // 코인 보상: 연속일수에 따라 점진적 증가
  const baseCoins = 50;
  const bonusCoins = Math.min((newStreak - 1) * 10, 150); // 최대 +150
  const coinsEarned = baseCoins + bonusCoins;

  // 젠 보상: 7일 단위로 1점
  const gemsEarned = newStreak % 7 === 0 ? 1 : 0;

  // 주간 미션 완료 여부 확인 (모든 미션 수령 완료되면 주간 보상)
  const currentWeek = getWeekStr(new Date());
  const allClaimed = (state.missions.missions ?? []).every(m => m.claimed);
  const weeklyGems = allClaimed && att.lastWeekStr !== currentWeek ? 3 : 0;

  return {
    newState: {
      ...state,
      coins: state.coins + coinsEarned,
      gems: state.gems + gemsEarned + weeklyGems,
      attendance: {
        lastLoginDate: today,
        streak: newStreak,
        totalDays: att.totalDays + 1,
        weeklyMissionsClaimed: weeklyGems > 0 ? true : att.weeklyMissionsClaimed,
        lastWeekStr: weeklyGems > 0 ? currentWeek : att.lastWeekStr,
      },
      lastSaveTime: Date.now(),
    },
    result: { isNewDay: true, streak: newStreak, coinsEarned, gemsEarned: gemsEarned + weeklyGems },
  };
}

/** 레벨업 코인 보상 */
export function applyLevelUpReward(state: GameState, newLevel: number): GameState {
  const coins = newLevel * 10;
  return { ...state, coins: state.coins + coins };
}

/** 진화 달성 보상 (1회성) */
const EVOLUTION_REWARDS: Record<string, { coins: number; gems: number }> = {
  '아기':   { coins: 0,   gems: 0 },
  '어린이': { coins: 200, gems: 1 },
  '청소년': { coins: 300, gems: 2 },
  '성체':   { coins: 500, gems: 3 },
  '전설':   { coins: 1000, gems: 5 },
};

export function applyEvolutionReward(state: GameState, newStage: string): GameState {
  const stageLabel: Record<string, string> = {
    baby: '아기', child: '어린이', teen: '청소년', adult: '성체', mythic: '전설',
  };
  const label = stageLabel[newStage];
  const rewardKey = `${state.pet.species}_${newStage}`;
  if (!label || state.claimedEvolutionRewards.includes(rewardKey)) return state;

  const reward = EVOLUTION_REWARDS[label] || { coins: 0, gems: 0 };
  return {
    ...state,
    coins: state.coins + reward.coins,
    gems: state.gems + reward.gems,
    claimedEvolutionRewards: [...state.claimedEvolutionRewards, rewardKey],
  };
}

/** 도감 등록 보상 (1회성) */
export function applyCollectionReward(state: GameState, species: string): GameState {
  if (state.claimedCollectionRewards.includes(species)) return state;
  return {
    ...state,
    coins: state.coins + 100,
    claimedCollectionRewards: [...state.claimedCollectionRewards, species],
  };
}

// ===== 저장/불러오기 =====

const SAVE_KEY = 'pocket_egg_save';

export function saveGame(state: GameState): void {
  const now = Date.now();
  const savedAt = (state as GameState & { _savedAt?: number })._savedAt;
  const saveData = {
    ...state,
    lastSaveTime: now,
    ...(savedAt !== undefined ? { _savedAt: savedAt } : {}),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as GameState;
    // 구버전 저장 데이터 마이그레이션
    if (!data.missions) {
      data.missions = INITIAL_MISSION_STATE;
    }
    if (!Array.isArray(data.missions.missions)) {
      data.missions = INITIAL_MISSION_STATE;
    }
    if (!data.pet.stage) {
      data.pet.stage = 'baby';
    }
    if (!['egg', 'baby', 'child', 'teen', 'adult', 'mythic'].includes(data.pet.stage)) {
      data.pet.stage = 'baby';
    }
    // 구버전 데이터 마이그레이션
    if (!data.attendance) {
      data.attendance = { lastLoginDate: '', streak: 0, totalDays: 0, weeklyMissionsClaimed: false, lastWeekStr: '' };
    }
    if (!data.claimedEvolutionRewards) data.claimedEvolutionRewards = [];
    if (!data.claimedCollectionRewards) data.claimedCollectionRewards = [];
    // room 필드 마이그레이션 (구버전 저장 데이터 대응)
    if (!data.room) {
      data.room = { wallpaper: 'default', furniture: [] };
    }
    if (!data.room.furniture) {
      data.room.furniture = [];
    }
    if (!Array.isArray(data.room.furniture)) {
      data.room.furniture = [];
    }
    if (data.room.placements && !Array.isArray(data.room.placements)) {
      data.room.placements = [];
    }
    if (data.room.hiddenDecor && !Array.isArray(data.room.hiddenDecor)) {
      data.room.hiddenDecor = [];
    }
    // friendCoins 필드 마이그레이션
    if (typeof data.friendCoins !== 'number') {
      data.friendCoins = 0;
    }
    // nickname 필드 마이그레이션
    if (typeof data.nickname !== 'string') {
      data.nickname = '';
    }
    // totalPlayDays 필드 마이그레이션
    if (typeof data.totalPlayDays !== 'number') {
      data.totalPlayDays = 0;
    }
    // tutorialSeen 필드 마이그레이션
    if (!data.tutorialSeen || typeof data.tutorialSeen !== 'object' || Array.isArray(data.tutorialSeen)) {
      data.tutorialSeen = {};
    }
    // ownedWallpapers 필드 마이그레이션
    if (!Array.isArray(data.ownedWallpapers)) {
      data.ownedWallpapers = [];
    }
    // Google Play 결제 지급 기록 마이그레이션
    if (!data.iapPurchases || typeof data.iapPurchases !== 'object' || Array.isArray(data.iapPurchases)) {
      data.iapPurchases = {};
    }
    // eggColor/gachaEgg 필드 마이그레이션 (구버전 저장 데이터 대응)
    if (!('eggColor' in data)) {
      (data as GameState).eggColor = null;
    }
    if (!('gachaEgg' in data)) {
      (data as GameState).gachaEgg = null;
    }
    if (typeof (data as GameState).lastSpecialActionAt !== 'number') {
      (data as GameState).lastSpecialActionAt = undefined;
    }
    if (!Array.isArray(data.claimedIntimacyRewards)) data.claimedIntimacyRewards = [];
    if (!Array.isArray(data.unlockedEmotions)) data.unlockedEmotions = [];
    if (!data.dailyChallenges) {
      data.dailyChallenges = INITIAL_DAILY_CHALLENGE_STATE;
    }
    if (!data.weeklyGoals) {
      data.weeklyGoals = INITIAL_WEEKLY_GOAL_STATE;
    }
    if (!data.fragmentExchangeDaily || typeof data.fragmentExchangeDaily !== 'object') {
      data.fragmentExchangeDaily = {};
    }
    if (data.roomPerkDaily && typeof data.roomPerkDaily !== 'object') {
      delete data.roomPerkDaily;
    }
    if (data.chatDaily && typeof data.chatDaily !== 'object') {
      delete data.chatDaily;
    }
    if (data.puzzleHintDaily && typeof data.puzzleHintDaily !== 'object') {
      delete data.puzzleHintDaily;
    }
    if (typeof data.puzzleHintCredits !== 'number' || data.puzzleHintCredits <= 0) {
      delete data.puzzleHintCredits;
    }
    if (typeof data.intimacyBoostUntil === 'number' && data.intimacyBoostUntil <= Date.now()) {
      delete data.intimacyBoostUntil;
    } else if (typeof data.intimacyBoostUntil !== 'number') {
      delete data.intimacyBoostUntil;
    }
    return data;
  } catch {
    return null;
  }
}

export function resetGame(): void {
  localStorage.removeItem(SAVE_KEY);
}

// ===== 미니게임 조각 드롭 =====

export const FRAGMENT_DROP_RATES = {
  rainbow: 0.40,
  sparkle: 0.25,
} as const;

export interface MiniGameDropItem {
  id: string;
  name: string;
  icon: string;
  dropped: boolean; // 실제 드롭 여부 (확률 결과)
}

function rollFragmentDrop(kind: keyof typeof FRAGMENT_DROP_RATES): MiniGameDropItem {
  const isRainbow = kind === 'rainbow';
  return {
    id: isRainbow ? RAINBOW_FRAGMENT_ID : 'fragment_sparkle',
    name: isRainbow ? '무지개 조각' : '반짝 조각',
    icon: isRainbow ? '🌈' : '✨',
    dropped: Math.random() < FRAGMENT_DROP_RATES[kind],
  };
}

function addDroppedItemToInventory(inventory: InventoryItem[], dropItem: MiniGameDropItem | null): InventoryItem[] {
  if (!dropItem?.dropped) return inventory;

  const newInventory = [...inventory];
  const existingIdx = newInventory.findIndex(i => i.id === dropItem.id);
  if (existingIdx >= 0) {
    newInventory[existingIdx] = {
      ...newInventory[existingIdx],
      quantity: newInventory[existingIdx].quantity + 1,
    };
    return newInventory;
  }

  const isRainbow = dropItem.id === RAINBOW_FRAGMENT_ID;
  newInventory.push({
    id: dropItem.id,
    name: dropItem.name,
    type: 'special',
    quantity: 1,
    icon: dropItem.icon,
    effect: {},
    description: isRainbow
      ? '상위 미니게임 보상으로 얻은 희귀 조각이에요. 교환소에서 특별한 보상으로 바꿀 수 있어요!'
      : '우수한 미니게임 결과로 얻은 반짝이는 조각이에요.',
  });

  return newInventory;
}

// ===== 별퍼즐 보상 시스템 =====

export type PuzzleGameGrade = 'perfect' | 'great' | 'normal' | 'complete';

export interface PuzzleGameRewardResult {
  grade: PuzzleGameGrade;
  coins: number;
  exp: number;
  moves: number;
  hintsUsed: number;
  dropItem: MiniGameDropItem | null;
}

const PUZZLE_GRADE_REWARDS: Record<PuzzleGameGrade, { coins: number; exp: number; drop: 'rainbow' | 'sparkle' | null }> = {
  perfect: { coins: 30, exp: 20, drop: 'rainbow' },
  great: { coins: 20, exp: 17, drop: 'sparkle' },
  normal: { coins: 10, exp: 15, drop: null },
  complete: { coins: 5, exp: 12, drop: null },
};

function gradeFromMoves(moves: number): PuzzleGameGrade {
  if (moves <= 20) return 'perfect';
  if (moves <= 30) return 'great';
  if (moves <= 50) return 'normal';
  return 'complete';
}

/** 퍼즐 점수 보상 (이동 수·힌트 사용에 따라 차등) */
export function calcPuzzleReward(moves: number, hintsUsed = 0): PuzzleGameRewardResult {
  let grade = gradeFromMoves(moves);
  if (hintsUsed >= 3 && (grade === 'perfect' || grade === 'great')) {
    grade = 'normal';
  }
  const table = PUZZLE_GRADE_REWARDS[grade];
  return {
    grade,
    coins: table.coins,
    exp: table.exp,
    moves,
    hintsUsed,
    dropItem: table.drop ? rollFragmentDrop(table.drop) : null,
  };
}

/**
 * 별퍼즐 보상을 게임 상태에 적용
 * - 별퍼즐 장난감 효과를 반영하고, 이동 수 등급 보상을 실제 지급
 * - 드롭 아이템은 인벤토리에 추가 (quantity +1)
 */
export function applyPuzzleReward(state: GameState, reward: PuzzleGameRewardResult, now = Date.now()): GameState {
  const item = state.inventory.find(i => i.id === 'toy_puzzle' && i.type === 'toy');
  const newStatus = item ? applyEffect(state.status, item.effect) : state.status;
  const newTraits = item?.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + applyExpGain(state, reward.exp, now),
      intimacy: clamp(state.pet.intimacy + 2, 0, 100),
    },
    coins: state.coins + reward.coins,
    inventory: addDroppedItemToInventory(state.inventory, reward.dropItem),
    lastSaveTime: now,
  };
}

// ===== 무지개공놀이 보상 시스템 (방안 B + C 조합) =====

export type BallGameGrade = 'perfect' | 'great' | 'normal' | 'complete';

export interface BallGameRewardResult {
  grade: BallGameGrade;
  exp: number;
  coins: number;
  score: number;
  powerBonus: number;   // 힘 성향 보너스
  comboExpBonus: number; // 콤보 보너스 EXP (방안 C)
  totalExp: number;      // exp + comboExpBonus
  dropItem: MiniGameDropItem | null;
}

/**
 * 무지개공놀이 등급·콤보 기반 보상 계산 (방안 B + C)
 * @param score  최종 점수
 * @param maxCombo 최대 콤보 수
 */
export function calcBallGameReward(score: number, maxCombo: number): BallGameRewardResult {
  // ── 방안 B: 등급별 기본 보상 ──────────────────────────────
  let grade: BallGameGrade;
  let exp: number;
  let coins: number;
  let powerBonus: number;
  let dropItem: MiniGameDropItem | null = null;

  if (score >= 200) {
    grade = 'perfect';
    exp = 30; coins = 20; powerBonus = 5;
    // 무지개 조각 40% 확률 드롭
    dropItem = rollFragmentDrop('rainbow');
  } else if (score >= 120) {
    grade = 'great';
    exp = 22; coins = 12; powerBonus = 4;
    // 반짝 조각 25% 확률 드롭
    dropItem = rollFragmentDrop('sparkle');
  } else if (score >= 60) {
    grade = 'normal';
    exp = 15; coins = 6; powerBonus = 3;
  } else {
    grade = 'complete';
    exp = 10; coins = 2; powerBonus = 2;
  }

  // ── 방안 C: 최대 콤보 보너스 EXP ─────────────────────────
  let comboExpBonus = 0;
  if (maxCombo >= 10)     comboExpBonus = 15;
  else if (maxCombo >= 7) comboExpBonus = 10;
  else if (maxCombo >= 4) comboExpBonus = 5;

  return {
    grade,
    exp,
    coins,
    score,
    powerBonus,
    comboExpBonus,
    totalExp: exp + comboExpBonus,
    dropItem,
  };
}

/**
 * 무지개공놀이 보상을 게임 상태에 적용
 * - 기분 +20, 피로 +15 (고정 — 놀기 자체의 효과)
 * - EXP, 코인, 힘 성향은 등급/콤보에 따라 차등
 * - 드롭 아이템은 인벤토리에 추가 (quantity +1)
 */
export function applyBallGameReward(state: GameState, reward: BallGameRewardResult, now = Date.now()): GameState {
  // 기분 +20, 피로 +15 (고정)
  const newStatus: PetStatus = {
    ...state.status,
    mood:    clamp(state.status.mood + 20, 0, 100),
    fatigue: clamp(state.status.fatigue + 15, 0, 100),
  };

  // 힘 성향 차등 적용
  const newTraits: GrowthTraits = {
    ...state.pet.traits,
    power: state.pet.traits.power + reward.powerBonus,
  };

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + applyExpGain(state, reward.totalExp, now),
      intimacy: clamp(state.pet.intimacy + 2, 0, 100),
    },
    coins: state.coins + reward.coins,
    inventory: addDroppedItemToInventory(state.inventory, reward.dropItem),
    lastSaveTime: now,
  };
}

// ===== 리본 리듬 보상 시스템 =====

export type RibbonGameGrade = 'perfect' | 'great' | 'normal' | 'complete';

export interface RibbonGameRewardResult {
  grade: RibbonGameGrade;
  exp: number;
  coins: number;
  accuracy: number;
  hits: number;
  perfects: number;
  charmBonus: number;
  dropItem: MiniGameDropItem | null;
}

/** 리본 리듬 정확도 기반 보상 계산 */
export function calcRibbonReward(
  accuracy: number,
  hits: number,
  perfects: number
): RibbonGameRewardResult {
  let grade: RibbonGameGrade;
  let exp: number;
  let coins: number;
  let charmBonus: number;
  let dropItem: MiniGameDropItem | null = null;

  if (accuracy >= 95) {
    grade = 'perfect';
    exp = 25; coins = 18; charmBonus = 5;
    dropItem = rollFragmentDrop('rainbow');
  } else if (accuracy >= 85) {
    grade = 'great';
    exp = 20; coins = 12; charmBonus = 4;
    dropItem = rollFragmentDrop('sparkle');
  } else if (accuracy >= 70) {
    grade = 'normal';
    exp = 15; coins = 8; charmBonus = 3;
  } else {
    grade = 'complete';
    exp = 10; coins = 4; charmBonus = 2;
  }

  const perfectBonus = Math.min(perfects, 5);
  exp += perfectBonus;

  return { grade, exp, coins, accuracy, hits, perfects, charmBonus, dropItem };
}

/** 리본 리듬 보상을 게임 상태에 적용 — 아이템 효과 mood +25, fatigue -10 */
export function applyRibbonReward(state: GameState, reward: RibbonGameRewardResult, now = Date.now()): GameState {
  const item = state.inventory.find(i => i.id === 'toy_ribbon' && i.type === 'toy');
  const newStatus = item
    ? applyEffect(state.status, item.effect)
    : {
        ...state.status,
        mood: clamp(state.status.mood + 25, 0, 100),
        fatigue: clamp(state.status.fatigue - 10, 0, 100),
      };

  const baseTraits = item?.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  const newTraits: GrowthTraits = {
    ...baseTraits,
    charm: baseTraits.charm + reward.charmBonus,
  };

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + applyExpGain(state, reward.exp, now),
      intimacy: clamp(state.pet.intimacy + 2, 0, 100),
    },
    coins: state.coins + reward.coins,
    inventory: addDroppedItemToInventory(state.inventory, reward.dropItem),
    lastSaveTime: now,
  };
}

// ===== 잎사귀 뒤집기 보상 시스템 =====

export type LeafFlipGrade = 'perfect' | 'great' | 'normal' | 'complete';

export interface LeafFlipRewardResult {
  grade: LeafFlipGrade;
  exp: number;
  coins: number;
  turns: number;
  vitalityBonus: number;
  dropItem: MiniGameDropItem | null;
}

/** 잎사귀 뒤집기 턴 수 기반 보상 계산 (10쌍) */
export function calcLeafFlipReward(turns: number): LeafFlipRewardResult {
  let grade: LeafFlipGrade;
  let exp: number;
  let coins: number;
  let vitalityBonus: number;
  let dropItem: MiniGameDropItem | null = null;

  if (turns <= 12) {
    grade = 'perfect';
    exp = 26; coins = 18; vitalityBonus = 5;
    dropItem = rollFragmentDrop('rainbow');
  } else if (turns <= 17) {
    grade = 'great';
    exp = 20; coins = 12; vitalityBonus = 4;
    dropItem = rollFragmentDrop('sparkle');
  } else if (turns <= 24) {
    grade = 'normal';
    exp = 15; coins = 8; vitalityBonus = 3;
  } else {
    grade = 'complete';
    exp = 10; coins = 3; vitalityBonus = 2;
  }

  return { grade, exp, coins, turns, vitalityBonus, dropItem };
}

/** 잎사귀 뒤집기 보상을 게임 상태에 적용 — 기분 +18, 피로 +8 */
export function applyLeafFlipReward(state: GameState, reward: LeafFlipRewardResult, now = Date.now()): GameState {
  const item = state.inventory.find(i => i.id === 'toy_leaf' && i.type === 'toy');

  const newStatus: PetStatus = {
    ...state.status,
    mood: clamp(state.status.mood + (item?.effect.mood ?? 18), 0, 100),
    fatigue: clamp(state.status.fatigue + 8, 0, 100),
  };

  const baseTraits = item?.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  const newTraits: GrowthTraits = {
    ...baseTraits,
    vitality: baseTraits.vitality + reward.vitalityBonus,
  };

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + applyExpGain(state, reward.exp, now),
      intimacy: clamp(state.pet.intimacy + 2, 0, 100),
    },
    coins: state.coins + reward.coins,
    inventory: addDroppedItemToInventory(state.inventory, reward.dropItem),
    lastSaveTime: now,
  };
}
