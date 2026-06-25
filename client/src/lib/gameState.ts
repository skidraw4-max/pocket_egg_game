/**
 * 「포켓 에그: 나만의 반려몬」 게임 상태 관리
 * Cozy Nursery 디자인 철학: 포근하고 생동감 있는 가상 반려 육성
 */

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
  inventory: InventoryItem[];
  room: RoomState;
  collection: string[];
  lastSaveTime: number;
  totalPlayDays: number;
  missions: MissionState;
  attendance: AttendanceState;
  claimedEvolutionRewards: string[];  // 보상 수령한 진화 종족 목록
  claimedCollectionRewards: string[]; // 보상 수령한 도감 종족 목록
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

export interface RoomState {
  wallpaper: string;
  furniture: string[];
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
}

export interface MissionState {
  missions: DailyMission[];
  lastResetDate: string;   // 'YYYY-MM-DD' 형식
}

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

export const INITIAL_GAME_STATE: GameState = {
  pet: INITIAL_PET_PROFILE,
  status: INITIAL_PET_STATUS,
  coins: 500,
  gems: 10,
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

  const newStatus: PetStatus = {
    hunger: clamp(state.status.hunger + DECAY_RATES.hunger * hoursElapsed, 0, 100),
    mood: clamp(state.status.mood + DECAY_RATES.mood * hoursElapsed, 0, 100),
    clean: clamp(state.status.clean + DECAY_RATES.clean * hoursElapsed, 0, 100),
    fatigue: clamp(state.status.fatigue + DECAY_RATES.fatigue * hoursElapsed, 0, 100),
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

// ===== 행동 로직 =====

export function feedPet(state: GameState, itemId: string): GameState {
  const itemIndex = state.inventory.findIndex(i => i.id === itemId && i.quantity > 0);
  if (itemIndex === -1) return state;

  const item = state.inventory[itemIndex];
  const newStatus = applyEffect(state.status, item.effect);
  const newTraits = item.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  const newInventory = [...state.inventory];
  newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + 8,
      intimacy: clamp(state.pet.intimacy + 1, 0, 100),
    },
    inventory: newInventory,
    lastSaveTime: Date.now(),
  };
}

export function playWithPet(state: GameState, itemId: string): GameState {
  const itemIndex = state.inventory.findIndex(i => i.id === itemId && i.type === 'toy');
  if (itemIndex === -1) return state;

  const item = state.inventory[itemIndex];
  const newStatus = applyEffect(state.status, item.effect);
  const newTraits = item.traitBonus
    ? applyTraitBonus(state.pet.traits, item.traitBonus)
    : state.pet.traits;

  return {
    ...state,
    status: newStatus,
    pet: {
      ...state.pet,
      traits: newTraits,
      exp: state.pet.exp + 15,
      intimacy: clamp(state.pet.intimacy + 2, 0, 100),
    },
    coins: state.coins + 5,
    lastSaveTime: Date.now(),
  };
}

export function cleanPet(state: GameState): GameState {
  return {
    ...state,
    status: {
      ...state.status,
      clean: clamp(state.status.clean + 40, 0, 100),
      mood: clamp(state.status.mood + 5, 0, 100),
    },
    pet: {
      ...state.pet,
      exp: state.pet.exp + 5,
      intimacy: clamp(state.pet.intimacy + 1, 0, 100),
    },
    lastSaveTime: Date.now(),
  };
}

export function sleepPet(state: GameState): GameState {
  return {
    ...state,
    status: {
      ...state.status,
      fatigue: clamp(state.status.fatigue - 50, 0, 100),
      mood: clamp(state.status.mood + 10, 0, 100),
    },
    pet: {
      ...state.pet,
      exp: state.pet.exp + 3,
    },
    lastSaveTime: Date.now(),
  };
}

export function touchPet(state: GameState): GameState {
  return {
    ...state,
    status: {
      ...state.status,
      mood: clamp(state.status.mood + 3, 0, 100),
    },
    pet: {
      ...state.pet,
      intimacy: clamp(state.pet.intimacy + 0.5, 0, 100),
    },
  };
}

// ===== 진화 로직 =====

// 이미지 URL 상수 (CDN 경로)
const IMG = {
  egg:        'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/pdFNNVTkCmtraUYV.png',
  basicmon:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/FEDWfUnGrASzcQTX.png',
  powermon:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/STjbGnGJYNoLIjDj.png',
  wizmon:     'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/WfadPKybAKTJlkVV.png',
  lovelemon:  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/fWFhBofXQtCVQTOA.png',
  greenmon:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/nXxFqVTYJtdiDiLY.png',
  dragonmon:  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/IuOreVpGMVXbbMFn.png',
  angelmon:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/UTLHzTDYCXbfbNkF.png',
  magicmon:   'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/rvDmQaIFngZjhGkY.png',
  forestmon:  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/xHnZoPRmRcFgeYof.png',
  legendmon:  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/xwthZTeGQpJacnab.png',
  infernoMon: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/psrDEOXPxMgEYxtQ.png',
  oracleMon:  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/ZoesjxkHeLizQpnU.png',
  seraphiMon: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/fNFDRbQLBvSUvpML.png',
  gaiaMon:    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/lRQUHXUZfwdFaQnH.png',
} as const;

/** 캐릭터 이미지 URL 매핑 (종족별 진화 단계) */
export const CHARACTER_IMAGES: Record<string, Record<PetProfile['stage'], string>> = {
  '기본몬': { egg: IMG.egg, baby: IMG.basicmon, child: IMG.basicmon, teen: IMG.basicmon, adult: IMG.basicmon, mythic: IMG.basicmon },
  '파워몬': { egg: IMG.powermon, baby: IMG.powermon, child: IMG.powermon, teen: IMG.powermon, adult: IMG.powermon, mythic: IMG.powermon },
  '위즈몬': { egg: IMG.wizmon,   baby: IMG.wizmon,   child: IMG.wizmon,   teen: IMG.wizmon,   adult: IMG.wizmon,   mythic: IMG.wizmon   },
  '레전드몬': { egg: IMG.legendmon, baby: IMG.legendmon, child: IMG.legendmon, teen: IMG.legendmon, adult: IMG.legendmon, mythic: IMG.legendmon },
  '러블리몬': { egg: IMG.lovelemon, baby: IMG.lovelemon, child: IMG.lovelemon, teen: IMG.lovelemon, adult: IMG.lovelemon, mythic: IMG.lovelemon },
  '그린몬': { egg: IMG.greenmon,  baby: IMG.greenmon,  child: IMG.greenmon,  teen: IMG.greenmon,  adult: IMG.greenmon,  mythic: IMG.greenmon  },
  '드래곤몬': { egg: IMG.dragonmon, baby: IMG.dragonmon, child: IMG.dragonmon, teen: IMG.dragonmon, adult: IMG.dragonmon, mythic: IMG.dragonmon },
  '엔젤몬': { egg: IMG.angelmon, baby: IMG.angelmon, child: IMG.angelmon, teen: IMG.angelmon, adult: IMG.angelmon, mythic: IMG.angelmon },
  '매직몬': { egg: IMG.magicmon,  baby: IMG.magicmon,  child: IMG.magicmon,  teen: IMG.magicmon,  adult: IMG.magicmon,  mythic: IMG.magicmon  },
  '포레스몬': { egg: IMG.forestmon, baby: IMG.forestmon, child: IMG.forestmon, teen: IMG.forestmon, adult: IMG.forestmon, mythic: IMG.forestmon },
  // Mythic 진화 4종
  '인페르노몬': { egg: IMG.infernoMon, baby: IMG.infernoMon, child: IMG.infernoMon, teen: IMG.infernoMon, adult: IMG.infernoMon, mythic: IMG.infernoMon },
  '오라클몬':   { egg: IMG.oracleMon,  baby: IMG.oracleMon,  child: IMG.oracleMon,  teen: IMG.oracleMon,  adult: IMG.oracleMon,  mythic: IMG.oracleMon  },
  '세라피몬':  { egg: IMG.seraphiMon, baby: IMG.seraphiMon, child: IMG.seraphiMon, teen: IMG.seraphiMon, adult: IMG.seraphiMon, mythic: IMG.seraphiMon },
  '가이아몬':   { egg: IMG.gaiaMon,    baby: IMG.gaiaMon,    child: IMG.gaiaMon,    teen: IMG.gaiaMon,    adult: IMG.gaiaMon,    mythic: IMG.gaiaMon    },
};

/** 캐릭터 이미지 URL 조회 함수 */
export function getCharacterImage(species: string, stage: PetProfile['stage']): string {
  return CHARACTER_IMAGES[species]?.[stage] || CHARACTER_IMAGES['기본몬']['baby'];
}

export interface EvolutionResult {
  newSpecies: string;
  newStage: PetProfile['stage'];
  statBoosts: Partial<GrowthTraits>;
}

export function checkEvolution(pet: PetProfile): EvolutionResult | null {
  const { level, stage, traits } = pet;

  // 알 부화: Lv.3이상이면 baby로 부화
  if (stage === 'egg' && level >= 3) {
    return { newSpecies: '기본몬', newStage: 'baby', statBoosts: {} };
  }

  if (stage === 'baby' && level >= 5) {
    const dominant = getDominantTrait(traits);
    const evolutions: Record<string, EvolutionResult> = {
      power: { newSpecies: '파워몬', newStage: 'child', statBoosts: { power: 10 } },
      intelligence: { newSpecies: '위즈몬', newStage: 'child', statBoosts: { intelligence: 10 } },
      charm: { newSpecies: '러블리몬', newStage: 'child', statBoosts: { charm: 10 } },
      vitality: { newSpecies: '그린몬', newStage: 'child', statBoosts: { vitality: 10 } },
    };
    return evolutions[dominant] || evolutions.charm;
  }

  if (stage === 'child' && level >= 15) {
    const dominant = getDominantTrait(traits);
    const evolutions: Record<string, EvolutionResult> = {
      power: { newSpecies: '드래곤몬', newStage: 'teen', statBoosts: { power: 20 } },
      intelligence: { newSpecies: '매직몬', newStage: 'teen', statBoosts: { intelligence: 20 } },
      charm: { newSpecies: '엔젤몬', newStage: 'teen', statBoosts: { charm: 20 } },
      vitality: { newSpecies: '포레스몬', newStage: 'teen', statBoosts: { vitality: 20 } },
    };
    return evolutions[dominant] || evolutions.charm;
  }

  if (stage === 'teen' && level >= 30) {
    return { newSpecies: '레전드몬', newStage: 'adult', statBoosts: { power: 15, intelligence: 15, charm: 15, vitality: 15 } };
  }

  // 2차 진화: 레전드몬(adult) Lv.50 + 주력 성향 기반 → Mythic 4종
  if (stage === 'adult' && level >= 40) {
    const dominant = getDominantTrait(traits);
    const mythicEvolutions: Record<string, EvolutionResult> = {
      power:        { newSpecies: '인페르노몬', newStage: 'mythic', statBoosts: { power: 30, intelligence: 10, charm: 10, vitality: 10 } },
      intelligence: { newSpecies: '오라클몬',   newStage: 'mythic', statBoosts: { power: 10, intelligence: 30, charm: 10, vitality: 10 } },
      charm:        { newSpecies: '세라피몬',  newStage: 'mythic', statBoosts: { power: 10, intelligence: 10, charm: 30, vitality: 10 } },
      vitality:     { newSpecies: '가이아몬',   newStage: 'mythic', statBoosts: { power: 10, intelligence: 10, charm: 10, vitality: 30 } },
    };
    return mythicEvolutions[dominant] || mythicEvolutions.charm;
  }

  return null;
}

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

function getDominantTrait(traits: GrowthTraits): string {
  const entries = Object.entries(traits) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// ===== 이름 변경 =====

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
  type: 'food' | 'toy' | 'decor';
  icon: string;
  price: number;
  currency: 'coins' | 'gems';
  description: string;
  /** 인벤토리에 추가할 아이템 정의 (food/toy) */
  inventoryItem?: Omit<InventoryItem, 'quantity'>;
}

export type PurchaseResult =
  | { success: true; newState: GameState }
  | { success: false; reason: 'insufficient_funds' | 'already_owned' };

export function purchaseItem(state: GameState, item: ShopItemDef): PurchaseResult {
  // 재화 확인
  const balance = item.currency === 'coins' ? state.coins : state.gems;
  if (balance < item.price) {
    return { success: false, reason: 'insufficient_funds' };
  }

  // 재화 차감
  const newCoins = item.currency === 'coins' ? state.coins - item.price : state.coins;
  const newGems  = item.currency === 'gems'  ? state.gems  - item.price : state.gems;

  // 가구(decor) 처리: room.furniture 배열에 추가 (중복 허용 안 함)
  if (item.type === 'decor') {
    if (state.room.furniture.includes(item.id)) {
      return { success: false, reason: 'already_owned' };
    }
    return {
      success: true,
      newState: {
        ...state,
        coins: newCoins,
        gems: newGems,
        room: {
          ...state.room,
          furniture: [...state.room.furniture, item.id],
        },
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
      lastSaveTime: Date.now(),
    },
  };
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

/** 미션 리셋 필요 여부 확인 */
export function needsMissionReset(state: GameState): boolean {
  return state.missions.lastResetDate !== todayStr();
}

// ===== 주간 문자열 유틸리 =====
function getWeekStr(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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
  const allClaimed = state.missions.missions.every(m => m.claimed);
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

/** 퍼즐 점수 보상 (이동 수에 따라 차등) */
export function calcPuzzleReward(moves: number): { coins: number; exp: number } {
  if (moves <= 20)      return { coins: 30, exp: 20 }; // 퍼펙트
  if (moves <= 30)      return { coins: 20, exp: 17 }; // 우수
  if (moves <= 50)      return { coins: 10, exp: 15 }; // 일반
  return                       { coins: 5,  exp: 12 }; // 완성
}

// ===== 저장/불러오기 =====

const SAVE_KEY = 'pocket_egg_save';

export function saveGame(state: GameState): void {
  const saveData = { ...state, lastSaveTime: Date.now() };
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
    return data;
  } catch {
    return null;
  }
}

export function resetGame(): void {
  localStorage.removeItem(SAVE_KEY);
}
