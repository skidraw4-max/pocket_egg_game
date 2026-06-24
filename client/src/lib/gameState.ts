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
  stage: 'egg' | 'baby' | 'child' | 'teen' | 'adult';
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

// ===== 초기 상태 =====

export const INITIAL_PET_PROFILE: PetProfile = {
  name: '포코',
  stage: 'baby',
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
      exp: state.pet.exp + 5,
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
      exp: state.pet.exp + 10,
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
      exp: state.pet.exp + 3,
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
      exp: state.pet.exp + 2,
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

/** 캐릭터 이미지 URL 매핑 (종족별 진화 단계) */
export const CHARACTER_IMAGES: Record<string, Record<PetProfile['stage'], string>> = {
  '기본몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-RWqGiSQbzfCq5GS93bZek3.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-RWqGiSQbzfCq5GS93bZek3.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-RWqGiSQbzfCq5GS93bZek3.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-RWqGiSQbzfCq5GS93bZek3.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-RWqGiSQbzfCq5GS93bZek3.webp',
  },
  '파워몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
  },
  '위즈몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
  },
  '레전드몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
  '러블리몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
  '그린몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
  '드래곤몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
  '매직몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
  '엔젤몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
  '포레스몬': {
    egg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    baby: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    child: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage1-powermon-X9iXMX5w9Y4epKrsNjsGLt.webp',
    teen: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage2-wizmon-Tn2xkGxWbzwe2Xg8DzREnK.webp',
    adult: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-evolution-stage3-celestialmon-KPLkkcuCQEp4kXcMJ36uxt.webp',
  },
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
    expToNext = Math.floor(expToNext * 1.2);
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
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function resetGame(): void {
  localStorage.removeItem(SAVE_KEY);
}
