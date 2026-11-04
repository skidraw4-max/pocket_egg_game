/**
 * Firebase RTDB 클라우드 저장용 슬림 payload 변환
 * - tutorialSeen: localStorage 전용
 * - friendCoins: players/{uid}/friendCoins 전용
 * - missions/inventory: id + progress/quantity만 저장
 */
import {
  type DailyMission,
  type DailyChallenge,
  type WeeklyGoal,
  type GameState,
  type InventoryItem,
  type MissionState,
  createDailyMissions,
  createDailyChallenges,
  createWeeklyGoals,
  INITIAL_MISSION_STATE,
  INITIAL_DAILY_CHALLENGE_STATE,
  INITIAL_WEEKLY_GOAL_STATE,
  RAINBOW_FRAGMENT_EXCHANGES,
  SPARKLE_FRAGMENT_EXCHANGES,
  RAINBOW_FRAGMENT_ID,
  todayStr,
  getWeekStr,
} from './gameState';

/** 클라우드에 저장하는 미션 진행 데이터 */
export interface CloudMissionProgress {
  id: string;
  current: number;
  completed: boolean;
  claimed: boolean;
  adRewardClaimed?: boolean;
}

/** 클라우드에 저장하는 인벤토리 슬롯 */
export interface CloudInventorySlot {
  id: string;
  quantity: number;
}

export type CloudGameStatePayload = Omit<
  GameState,
  'tutorialSeen' | 'friendCoins' | 'missions' | 'inventory' | 'dailyChallenges' | 'weeklyGoals'
> & {
  missions: {
    lastResetDate: string;
    missions: CloudMissionProgress[];
  };
  dailyChallenges: {
    lastResetDate: string;
    challenges: CloudChallengeProgress[];
  };
  weeklyGoals: {
    lastResetWeek: string;
    goals: CloudWeeklyGoalProgress[];
  };
  inventory: CloudInventorySlot[];
  _savedAt?: number;
};

/** 클라우드에 저장하는 일일 챌린지 진행 데이터 */
export interface CloudChallengeProgress {
  id: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

/** 클라우드에 저장하는 주간 목표 진행 데이터 */
export interface CloudWeeklyGoalProgress {
  id: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

const CHALLENGE_TEMPLATES: DailyChallenge[] = createDailyChallenges();
const WEEKLY_GOAL_TEMPLATES: WeeklyGoal[] = createWeeklyGoals();

const MISSION_TEMPLATES: DailyMission[] = createDailyMissions();

const INVENTORY_CATALOG: Record<string, Omit<InventoryItem, 'quantity'>> = (() => {
  const catalog: Record<string, Omit<InventoryItem, 'quantity'>> = {};

  const register = (item: Omit<InventoryItem, 'quantity'>) => {
    catalog[item.id] = item;
  };

  for (const exchange of RAINBOW_FRAGMENT_EXCHANGES) {
    if (exchange.reward.type === 'inventory') {
      register(exchange.reward.item);
    }
  }

  for (const exchange of SPARKLE_FRAGMENT_EXCHANGES) {
    if (exchange.reward.type === 'inventory') {
      register(exchange.reward.item);
    }
  }

  register({
    id: RAINBOW_FRAGMENT_ID,
    name: '무지개 조각',
    type: 'special',
    icon: '🌈',
    effect: {},
    description: '상위 미니게임 보상으로 얻은 희귀 조각이에요. 교환소에서 특별한 보상으로 바꿀 수 있어요!',
  });
  register({
    id: 'fragment_sparkle',
    name: '반짝 조각',
    type: 'special',
    icon: '✨',
    effect: {},
    description: '우수한 미니게임 결과로 얻은 반짝이는 조각이에요.',
  });

  for (const item of [
    {
      id: 'food_basic',
      name: '포켓 사료',
      type: 'food' as const,
      icon: '🍖',
      effect: { hunger: 15 },
      description: '영양이 가득한 기본 사료예요.',
    },
    {
      id: 'food_cookie',
      name: '꿀방울 쿠키',
      type: 'food' as const,
      icon: '🍪',
      effect: { hunger: 10, mood: 10 },
      traitBonus: { charm: 2 },
      description: '달콤한 쿠키로 기분이 좋아져요!',
    },
    {
      id: 'food_salad',
      name: '잎사귀 샐러드',
      type: 'food' as const,
      icon: '🥗',
      effect: { hunger: 12, clean: 5 },
      traitBonus: { vitality: 2 },
      description: '신선한 채소로 건강을 챙겨요!',
    },
    {
      id: 'food_cake',
      name: '무지개 케이크',
      type: 'food' as const,
      icon: '🎂',
      effect: { hunger: 25, mood: 20 },
      traitBonus: { charm: 3, vitality: 1 },
      description: '특별한 날의 케이크! 기분이 최고예요!',
    },
    {
      id: 'toy_ball',
      name: '무지개 공',
      type: 'toy' as const,
      icon: '⚽',
      effect: { mood: 20, fatigue: 15 },
      traitBonus: { power: 3 },
      description: '공놀이로 힘을 길러요!',
    },
    {
      id: 'toy_puzzle',
      name: '별 퍼즐',
      type: 'toy' as const,
      icon: '⭐',
      effect: { mood: 15, fatigue: 10 },
      traitBonus: { intelligence: 3 },
      description: '퍼즐을 풀면 머리가 좋아져요!',
    },
    {
      id: 'toy_ribbon',
      name: '리본 장난감',
      type: 'toy' as const,
      icon: '🎀',
      effect: { mood: 25, fatigue: 10 },
      traitBonus: { charm: 5 },
      description: '리본 장난감으로 매력이 올라가요!',
    },
    {
      id: 'toy_leaf',
      name: '잎사귀 장난감',
      type: 'toy' as const,
      icon: '🌿',
      effect: { mood: 18 },
      traitBonus: { vitality: 4 },
      description: '잎사귀 뒤집기로 활력이 올라가요!',
    },
    {
      id: 'toy_disc',
      name: '원반',
      type: 'toy' as const,
      icon: '🥏',
      effect: { mood: 22, fatigue: 18 },
      traitBonus: { power: 4 },
      description: '원반 캐치로 힘을 길러요!',
    },
    {
      id: 'food_rainbow_snack',
      name: '무지개 간식',
      type: 'food' as const,
      icon: '🍰',
      effect: { hunger: 18, mood: 12 },
      traitBonus: { charm: 2, vitality: 2 },
      description: '무지개 조각으로 만든 달콤한 간식이에요.',
    },
    {
      id: 'food_star_growth_snack',
      name: '별빛 성장 간식',
      type: 'food' as const,
      icon: '🌟',
      effect: { hunger: 8, mood: 5 },
      description: '먹으면 24시간 동안 모든 활동에서 경험치를 두 배로 받아요. 성장이 빛나는 특별한 간식이에요!',
    },
  ]) {
    register(item);
  }

  return catalog;
})();

/** PlayMenu에 표시할 미니게임 장난감 ID (고정 순서) */
export const PLAY_TOY_IDS = ['toy_puzzle', 'toy_ball', 'toy_ribbon', 'toy_leaf', 'toy_disc'] as const;

export function getInventoryCatalogItem(id: string): Omit<InventoryItem, 'quantity'> | undefined {
  return INVENTORY_CATALOG[id];
}

function isCloudMissionProgress(value: unknown): value is CloudMissionProgress {
  if (!value || typeof value !== 'object') return false;
  const mission = value as Record<string, unknown>;
  return typeof mission.id === 'string'
    && typeof mission.current === 'number'
    && typeof mission.completed === 'boolean'
    && typeof mission.claimed === 'boolean'
    && !('title' in mission);
}

function isCloudInventorySlot(value: unknown): value is CloudInventorySlot {
  if (!value || typeof value !== 'object') return false;
  const slot = value as Record<string, unknown>;
  return typeof slot.id === 'string'
    && typeof slot.quantity === 'number'
    && !('name' in slot);
}

function mergeMissionState(raw: unknown): MissionState {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_MISSION_STATE };
  }

  const cloud = raw as Partial<MissionState> & { missions?: unknown[] };
  const lastResetDate = typeof cloud.lastResetDate === 'string' ? cloud.lastResetDate : todayStr();
  const cloudMissions = Array.isArray(cloud.missions) ? cloud.missions : [];

  if (cloudMissions.length === 0) {
    return { missions: createDailyMissions(), lastResetDate };
  }

  if (!isCloudMissionProgress(cloudMissions[0])) {
    return {
      lastResetDate,
      missions: cloudMissions as DailyMission[],
    };
  }

  const progressMap = new Map(
    (cloudMissions as CloudMissionProgress[]).map((mission) => [mission.id, mission])
  );

  const missions = MISSION_TEMPLATES.map((template) => {
    const progress = progressMap.get(template.id);
    if (!progress) return { ...template };
    return {
      ...template,
      current: progress.current,
      completed: progress.completed,
      claimed: progress.claimed,
      adRewardClaimed: progress.adRewardClaimed ?? template.adRewardClaimed,
    };
  });

  for (const progress of cloudMissions as CloudMissionProgress[]) {
    if (!missions.some((mission) => mission.id === progress.id)) {
      missions.push({
        id: progress.id,
        type: 'feed',
        title: progress.id,
        description: '',
        icon: '📋',
        target: progress.current,
        current: progress.current,
        completed: progress.completed,
        claimed: progress.claimed,
        reward: { coins: 0, exp: 0 },
        adRewardClaimed: progress.adRewardClaimed,
      });
    }
  }

  return { lastResetDate, missions };
}

function isCloudChallengeProgress(value: unknown): value is CloudChallengeProgress {
  if (!value || typeof value !== 'object') return false;
  const challenge = value as Record<string, unknown>;
  return typeof challenge.id === 'string'
    && typeof challenge.current === 'number'
    && typeof challenge.completed === 'boolean'
    && typeof challenge.claimed === 'boolean'
    && !('title' in challenge);
}

function mergeDailyChallengeState(raw: unknown): GameState['dailyChallenges'] {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_DAILY_CHALLENGE_STATE };
  }

  const cloud = raw as Partial<GameState['dailyChallenges']> & { challenges?: unknown[] };
  const lastResetDate = typeof cloud.lastResetDate === 'string' ? cloud.lastResetDate : todayStr();
  const cloudChallenges = Array.isArray(cloud.challenges) ? cloud.challenges : [];

  if (cloudChallenges.length === 0) {
    return { challenges: createDailyChallenges(), lastResetDate };
  }

  if (!isCloudChallengeProgress(cloudChallenges[0])) {
    return {
      lastResetDate,
      challenges: cloudChallenges as DailyChallenge[],
    };
  }

  const progressMap = new Map(
    (cloudChallenges as CloudChallengeProgress[]).map((challenge) => [challenge.id, challenge])
  );

  const challenges = CHALLENGE_TEMPLATES.map((template) => {
    const progress = progressMap.get(template.id);
    if (!progress) return { ...template };
    return {
      ...template,
      current: progress.current,
      completed: progress.completed,
      claimed: progress.claimed,
    };
  });

  return { lastResetDate, challenges };
}

function isCloudWeeklyGoalProgress(value: unknown): value is CloudWeeklyGoalProgress {
  if (!value || typeof value !== 'object') return false;
  const goal = value as Record<string, unknown>;
  return typeof goal.id === 'string'
    && typeof goal.current === 'number'
    && typeof goal.completed === 'boolean'
    && typeof goal.claimed === 'boolean'
    && !('title' in goal);
}

function mergeWeeklyGoalState(raw: unknown): GameState['weeklyGoals'] {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_WEEKLY_GOAL_STATE };
  }

  const cloud = raw as Partial<GameState['weeklyGoals']> & { goals?: unknown[] };
  const lastResetWeek = typeof cloud.lastResetWeek === 'string'
    ? cloud.lastResetWeek
    : getWeekStr(new Date());
  const cloudGoals = Array.isArray(cloud.goals) ? cloud.goals : [];

  if (cloudGoals.length === 0) {
    return { goals: createWeeklyGoals(), lastResetWeek };
  }

  if (!isCloudWeeklyGoalProgress(cloudGoals[0])) {
    return {
      lastResetWeek,
      goals: cloudGoals as WeeklyGoal[],
    };
  }

  const progressMap = new Map(
    (cloudGoals as CloudWeeklyGoalProgress[]).map((goal) => [goal.id, goal])
  );

  const goals = WEEKLY_GOAL_TEMPLATES.map((template) => {
    const progress = progressMap.get(template.id);
    if (!progress) return { ...template };
    return {
      ...template,
      current: progress.current,
      completed: progress.completed,
      claimed: progress.claimed,
    };
  });

  return { lastResetWeek, goals };
}

function hydrateInventory(raw: unknown, fallback: InventoryItem[] = []): InventoryItem[] {
  if (!Array.isArray(raw)) return fallback;

  if (raw.length === 0) return [];

  if (!isCloudInventorySlot(raw[0])) {
    return raw as InventoryItem[];
  }

  const fallbackMap = new Map(fallback.map((item) => [item.id, item]));

  return (raw as CloudInventorySlot[])
    .filter((slot) => slot.quantity > 0)
    .map((slot) => {
      const template = INVENTORY_CATALOG[slot.id] ?? fallbackMap.get(slot.id);
      if (template) {
        return { ...template, quantity: slot.quantity };
      }
      return {
        id: slot.id,
        name: slot.id,
        type: 'special' as const,
        quantity: slot.quantity,
        icon: '📦',
        effect: {},
        description: '',
      };
    });
}

/** 로컬 GameState → RTDB 저장 payload */
export function toCloudState(state: GameState): CloudGameStatePayload {
  const {
    tutorialSeen: _tutorialSeen,
    friendCoins: _friendCoins,
    missions,
    dailyChallenges,
    weeklyGoals,
    inventory,
    ...rest
  } = state;

  return {
    ...rest,
    missions: {
      lastResetDate: missions.lastResetDate,
      missions: missions.missions.map((mission) => ({
        id: mission.id,
        current: mission.current,
        completed: mission.completed,
        claimed: mission.claimed,
        ...(mission.adRewardClaimed !== undefined ? { adRewardClaimed: mission.adRewardClaimed } : {}),
      })),
    },
    dailyChallenges: {
      lastResetDate: dailyChallenges.lastResetDate,
      challenges: dailyChallenges.challenges.map((challenge) => ({
        id: challenge.id,
        current: challenge.current,
        completed: challenge.completed,
        claimed: challenge.claimed,
      })),
    },
    weeklyGoals: {
      lastResetWeek: weeklyGoals.lastResetWeek,
      goals: weeklyGoals.goals.map((goal) => ({
        id: goal.id,
        current: goal.current,
        completed: goal.completed,
        claimed: goal.claimed,
      })),
    },
    inventory: inventory
      .filter((item) => item.quantity > 0)
      .map((item) => ({ id: item.id, quantity: item.quantity })),
  };
}

export interface FromCloudStateOptions {
  /** localStorage tutorialSeen — 클라우드에 저장하지 않음 */
  tutorialSeen?: Record<string, boolean>;
  /** 레거시 gameState.friendCoins 마이그레이션용 (로컬 복원 시만) */
  legacyFriendCoins?: number;
}

/** RTDB payload → 로컬 GameState (구버전 full payload 호환) */
export function fromCloudState(data: unknown, options?: FromCloudStateOptions): GameState {
  const raw = (data && typeof data === 'object' ? data : {}) as Partial<GameState> & {
    missions?: unknown;
    inventory?: unknown;
    _savedAt?: number;
  };

  const {
    tutorialSeen: _ignoredTutorial,
    friendCoins: legacyCloudFriendCoins,
    missions: rawMissions,
    dailyChallenges: rawDailyChallenges,
    weeklyGoals: rawWeeklyGoals,
    inventory: rawInventory,
    _savedAt,
    ...rest
  } = raw;

  const missions = mergeMissionState(rawMissions);
  const dailyChallenges = mergeDailyChallengeState(rawDailyChallenges);
  const weeklyGoals = mergeWeeklyGoalState(rawWeeklyGoals);
  const inventory = hydrateInventory(rawInventory);

  const normalized: GameState = {
    ...(rest as Omit<GameState, 'missions' | 'dailyChallenges' | 'weeklyGoals' | 'inventory' | 'tutorialSeen' | 'friendCoins'>),
    missions,
    dailyChallenges,
    weeklyGoals,
    inventory,
    tutorialSeen: options?.tutorialSeen ?? {},
    friendCoins: options?.legacyFriendCoins ?? legacyCloudFriendCoins ?? 0,
  };

  if (!normalized.room) normalized.room = { wallpaper: 'default', furniture: [] };
  if (!normalized.room.furniture || !Array.isArray(normalized.room.furniture)) {
    normalized.room.furniture = [];
  }
  if (normalized.room.placements && !Array.isArray(normalized.room.placements)) {
    normalized.room.placements = [];
  }
  if (normalized.room.hiddenDecor && !Array.isArray(normalized.room.hiddenDecor)) {
    normalized.room.hiddenDecor = [];
  }
  if (typeof normalized.nickname !== 'string') normalized.nickname = '';
  if (typeof normalized.totalPlayDays !== 'number') normalized.totalPlayDays = 0;
  if (!normalized.attendance) {
    normalized.attendance = {
      lastLoginDate: '',
      streak: 0,
      totalDays: 0,
      weeklyMissionsClaimed: false,
      lastWeekStr: '',
    };
  }
  if (!normalized.claimedEvolutionRewards) normalized.claimedEvolutionRewards = [];
  if (!normalized.claimedCollectionRewards) normalized.claimedCollectionRewards = [];
  if (!Array.isArray(normalized.collection)) normalized.collection = [];
  if (!normalized.iapPurchases || typeof normalized.iapPurchases !== 'object' || Array.isArray(normalized.iapPurchases)) {
    normalized.iapPurchases = {};
  }
  if (!Array.isArray(normalized.ownedWallpapers)) normalized.ownedWallpapers = [];
  if (!('eggColor' in raw)) normalized.eggColor = null;
  if (!('gachaEgg' in raw)) normalized.gachaEgg = null;
  if (typeof normalized.lastSpecialActionAt !== 'number') {
    normalized.lastSpecialActionAt = undefined;
  }
  if (typeof normalized.expBoostUntil === 'number') {
    if (normalized.expBoostUntil <= Date.now()) {
      normalized.expBoostUntil = undefined;
    }
  } else {
    normalized.expBoostUntil = undefined;
  }
  if (typeof normalized.intimacyBoostUntil === 'number') {
    if (normalized.intimacyBoostUntil <= Date.now()) {
      normalized.intimacyBoostUntil = undefined;
    }
  } else {
    normalized.intimacyBoostUntil = undefined;
  }
  if (typeof normalized.puzzleHintCredits !== 'number' || normalized.puzzleHintCredits <= 0) {
    normalized.puzzleHintCredits = undefined;
  }
  if (!Array.isArray(normalized.claimedIntimacyRewards)) normalized.claimedIntimacyRewards = [];
  if (!Array.isArray(normalized.unlockedEmotions)) normalized.unlockedEmotions = [];
  if (!normalized.fragmentExchangeDaily || typeof normalized.fragmentExchangeDaily !== 'object') {
    normalized.fragmentExchangeDaily = {};
  }

  if (_savedAt !== undefined) {
    (normalized as GameState & { _savedAt?: number })._savedAt = _savedAt;
  }

  return normalized;
}

/** 레거시 gameState 내부 friendCoins 존재 여부 */
export function extractLegacyFriendCoins(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const coins = (data as { friendCoins?: unknown }).friendCoins;
  return typeof coins === 'number' ? coins : null;
}
