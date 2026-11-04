/**
 * speciesRegistry.ts — 반려몬 종족 단일 소스
 * 도감(ALL_MONS), 이미지(CHARACTER_IMAGES), 진화(checkEvolution)가 동일 registry 참조
 */
import type { GrowthTraits, PetProfile } from './gameState';
import { publicAssetUrl } from './publicAssets';

export type PetStage = PetProfile['stage'];
export type SpeciesGrade = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legend';

export interface GradeStyle {
  stageLabel: string;
  gradeColor: string;
  gradeBg: string;
  gradeBorder: string;
}

export const GRADE_STYLES: Record<SpeciesGrade, GradeStyle> = {
  normal: { stageLabel: '노멀', gradeColor: '#9CA3AF', gradeBg: '#F9FAFB', gradeBorder: '#E5E7EB' },
  uncommon: { stageLabel: '언커먼', gradeColor: '#22C55E', gradeBg: '#F0FDF4', gradeBorder: '#BBF7D0' },
  rare: { stageLabel: '레어', gradeColor: '#3B82F6', gradeBg: '#EFF6FF', gradeBorder: '#BFDBFE' },
  epic: { stageLabel: '에픽', gradeColor: '#A855F7', gradeBg: '#FAF5FF', gradeBorder: '#E9D5FF' },
  legend: { stageLabel: '레전드', gradeColor: '#EAB308', gradeBg: '#FEFCE8', gradeBorder: '#FDE68A' },
};

export interface SpeciesDef {
  id: string;
  name: string;
  stage: Exclude<PetStage, 'egg'>;
  grade: SpeciesGrade;
  icon: string;
  description: string;
  traitHint: string;
  imageKey: keyof typeof IMG;
}

/** 로컬 캐릭터 이미지 (투명 배경 PNG) — 모던 스킨 */
export const IMG_MODERN = {
  egg: publicAssetUrl('characters/egg.png'),
  basicmon: publicAssetUrl('characters/basicmon.png'),
  powermon: publicAssetUrl('characters/powermon.png'),
  wizmon: publicAssetUrl('characters/wizmon.png'),
  lovelemon: publicAssetUrl('characters/lovelemon.png'),
  greenmon: publicAssetUrl('characters/greenmon.png'),
  thundermon: publicAssetUrl('characters/thundermon.png'),
  dragonmon: publicAssetUrl('characters/dragonmon.png'),
  angelmon: publicAssetUrl('characters/angelmon.png'),
  magicmon: publicAssetUrl('characters/magicmon.png'),
  forestmon: publicAssetUrl('characters/forestmon.png'),
  moonlightmon: publicAssetUrl('characters/moonlightmon.png'),
  crystalmon: publicAssetUrl('characters/crystalmon.png'),
  legendmon: publicAssetUrl('characters/legendmon.png'),
  infernoMon: publicAssetUrl('characters/infernomon.png'),
  oracleMon: publicAssetUrl('characters/oraclemon.png'),
  seraphiMon: publicAssetUrl('characters/seraphimon.png'),
  gaiaMon: publicAssetUrl('characters/gaiamon.png'),
} as const;

/** 클래식 로컬 스킨 */
export const IMG_CLASSIC = {
  egg: publicAssetUrl('characters/classic/egg.png'),
  basicmon: publicAssetUrl('characters/classic/basicmon.png'),
  powermon: publicAssetUrl('characters/classic/powermon.png'),
  wizmon: publicAssetUrl('characters/classic/wizmon.png'),
  lovelemon: publicAssetUrl('characters/classic/lovelemon.png'),
  greenmon: publicAssetUrl('characters/classic/greenmon.png'),
  thundermon: publicAssetUrl('characters/classic/thundermon.png'),
  dragonmon: publicAssetUrl('characters/classic/dragonmon.png'),
  angelmon: publicAssetUrl('characters/classic/angelmon.png'),
  magicmon: publicAssetUrl('characters/classic/magicmon.png'),
  forestmon: publicAssetUrl('characters/classic/forestmon.png'),
  moonlightmon: publicAssetUrl('characters/classic/moonlightmon.png'),
  crystalmon: publicAssetUrl('characters/classic/crystalmon.png'),
  legendmon: publicAssetUrl('characters/classic/legendmon.png'),
  infernoMon: publicAssetUrl('characters/classic/infernomon.png'),
  oracleMon: publicAssetUrl('characters/classic/oraclemon.png'),
  seraphiMon: publicAssetUrl('characters/classic/seraphimon.png'),
  gaiaMon: publicAssetUrl('characters/classic/gaiamon.png'),
} as const;

/** @deprecated IMG_MODERN 별칭 — registry imageKey 타입 호환 */
export const IMG = IMG_MODERN;

export type CharacterSkin = 'modern' | 'classic';

const SKIN_STORAGE_KEY = 'characterSkin';
export const SKIN_CHANGED_EVENT = 'characterSkinChanged';

export function getActiveSkin(): CharacterSkin {
  try {
    const stored = localStorage.getItem(SKIN_STORAGE_KEY);
    if (stored === 'classic' || stored === 'modern') return stored;
  } catch {
    /* ignore */
  }
  return 'modern';
}

export function setActiveSkin(skin: CharacterSkin): void {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SKIN_CHANGED_EVENT, { detail: skin }));
}

function resolveSkinImage(
  skin: CharacterSkin,
  imageKey: keyof typeof IMG_MODERN,
  stage: PetStage,
): string {
  const modern = IMG_MODERN[imageKey];
  if (stage === 'egg') {
    return skin === 'classic' ? IMG_CLASSIC.egg : IMG_MODERN.egg;
  }
  if (skin === 'classic') {
    return IMG_CLASSIC[imageKey] ?? modern;
  }
  return modern;
}

export const SPECIES_REGISTRY: SpeciesDef[] = [
  {
    id: 'basicmon',
    name: '기본몬',
    stage: 'baby',
    grade: 'normal',
    icon: '🥚',
    description: '알에서 갓 태어난 순수한 반려몬',
    traitHint: '모든 성향의 시작점',
    imageKey: 'basicmon',
  },
  {
    id: 'powermon',
    name: '파워몬',
    stage: 'child',
    grade: 'uncommon',
    icon: '💪',
    description: '힘이 넘치는 활발한 반려몬',
    traitHint: '힘 성향 우세 시 진화',
    imageKey: 'powermon',
  },
  {
    id: 'wizmon',
    name: '위즈몬',
    stage: 'child',
    grade: 'uncommon',
    icon: '🧠',
    description: '호기심 가득한 똑똑한 반려몬',
    traitHint: '지능 성향 우세 시 진화',
    imageKey: 'wizmon',
  },
  {
    id: 'lovelemon',
    name: '러블리몬',
    stage: 'child',
    grade: 'uncommon',
    icon: '💖',
    description: '사랑스러운 매력의 반려몬',
    traitHint: '매력 성향 우세 시 진화',
    imageKey: 'lovelemon',
  },
  {
    id: 'greenmon',
    name: '그린몬',
    stage: 'child',
    grade: 'uncommon',
    icon: '🌿',
    description: '자연을 사랑하는 건강한 반려몬',
    traitHint: '활력 성향 우세 시 진화',
    imageKey: 'greenmon',
  },
  {
    id: 'thundermon',
    name: '번개몬',
    stage: 'child',
    grade: 'uncommon',
    icon: '⚡',
    description: '번개 에너지가 몸을 감싼 날카로운 반려몬',
    traitHint: 'Lv.5, 힘+지능 동률 1위 시 진화',
    imageKey: 'thundermon',
  },
  {
    id: 'dragonmon',
    name: '드래곤몬',
    stage: 'teen',
    grade: 'rare',
    icon: '🐉',
    description: '강력한 힘을 가진 용 반려몬',
    traitHint: '파워몬 → 힘 성향 심화',
    imageKey: 'dragonmon',
  },
  {
    id: 'magicmon',
    name: '매직몬',
    stage: 'teen',
    grade: 'rare',
    icon: '🔮',
    description: '마법을 부리는 신비한 반려몬',
    traitHint: '위즈몬 → 지능 성향 심화',
    imageKey: 'magicmon',
  },
  {
    id: 'angelmon',
    name: '엔젤몬',
    stage: 'teen',
    grade: 'rare',
    icon: '👼',
    description: '천사처럼 아름다운 반려몬',
    traitHint: '러블리몬 → 매력 성향 심화',
    imageKey: 'angelmon',
  },
  {
    id: 'forestmon',
    name: '포레스몬',
    stage: 'teen',
    grade: 'rare',
    icon: '🌳',
    description: '숲의 수호자 반려몬',
    traitHint: '그린몬 → 활력 성향 심화',
    imageKey: 'forestmon',
  },
  {
    id: 'moonlightmon',
    name: '문라이트몬',
    stage: 'teen',
    grade: 'rare',
    icon: '🌙',
    description: '달빛을 품은 은은한 고양이 반려몬',
    traitHint: 'Lv.15, 매력+활력 동률 1위 시 진화',
    imageKey: 'moonlightmon',
  },
  {
    id: 'crystalmon',
    name: '크리스탈몬',
    stage: 'teen',
    grade: 'rare',
    icon: '💎',
    description: '수정 결정을 두른 지혜로운 반려몬',
    traitHint: '지혜알 + Lv.15 지능 성향 우세',
    imageKey: 'crystalmon',
  },
  {
    id: 'legendmon',
    name: '레전드몬',
    stage: 'adult',
    grade: 'epic',
    icon: '👑',
    description: '모든 속성을 초월한 전설의 반려몬',
    traitHint: 'Lv.30 최종 진화',
    imageKey: 'legendmon',
  },
  {
    id: 'infernomon',
    name: '인페르노몬',
    stage: 'mythic',
    grade: 'legend',
    icon: '🔥',
    description: '화염을 지배하는 궁극의 드래곤 반려몬',
    traitHint: '레전드몬 Lv.40 + 힘 성향 우세',
    imageKey: 'infernoMon',
  },
  {
    id: 'oraclemon',
    name: '오라클몬',
    stage: 'mythic',
    grade: 'legend',
    icon: '🔮',
    description: '우주의 진리를 꿰뚫는 전지전능한 반려몬',
    traitHint: '레전드몬 Lv.40 + 지능 성향 우세',
    imageKey: 'oracleMon',
  },
  {
    id: 'seraphimon',
    name: '세라피몬',
    stage: 'mythic',
    grade: 'legend',
    icon: '✨',
    description: '신성한 빛을 발하는 최고의 천사 반려몬',
    traitHint: '레전드몬 Lv.40 + 매력 성향 우세',
    imageKey: 'seraphiMon',
  },
  {
    id: 'gaiamon',
    name: '가이아몬',
    stage: 'mythic',
    grade: 'legend',
    icon: '🌍',
    description: '대지의 생명력을 담은 자연의 신 반려몬',
    traitHint: '레전드몬 Lv.40 + 활력 성향 우세',
    imageKey: 'gaiaMon',
  },
];

/** 도감 UI용 항목 (CollectionMenu) */
export interface MonEntry {
  name: string;
  stage: Exclude<PetStage, 'egg'>;
  stageLabel: string;
  icon: string;
  description: string;
  traitHint: string;
  gradeColor: string;
  gradeBg: string;
  gradeBorder: string;
}

export const ALL_MONS: MonEntry[] = SPECIES_REGISTRY.map(species => {
  const style = GRADE_STYLES[species.grade];
  return {
    name: species.name,
    stage: species.stage,
    stageLabel: style.stageLabel,
    icon: species.icon,
    description: species.description,
    traitHint: species.traitHint,
    gradeColor: style.gradeColor,
    gradeBg: style.gradeBg,
    gradeBorder: style.gradeBorder,
  };
});

function buildStageImages(
  imageKey: keyof typeof IMG_MODERN,
  skin: CharacterSkin,
): Record<PetStage, string> {
  const url = resolveSkinImage(skin, imageKey, 'baby');
  const eggUrl = resolveSkinImage(skin, imageKey, 'egg');
  return { egg: eggUrl, baby: url, child: url, teen: url, adult: url, mythic: url };
}

function buildCharacterImages(skin: CharacterSkin): Record<string, Record<PetStage, string>> {
  return Object.fromEntries(
    SPECIES_REGISTRY.map(species => [species.name, buildStageImages(species.imageKey, skin)]),
  );
}

/** 캐릭터 이미지 URL 매핑 (종족별 진화 단계) — 모던 스킨 */
export const CHARACTER_IMAGES: Record<string, Record<PetStage, string>> = buildCharacterImages('modern');

/** 캐릭터 이미지 URL 조회 */
export function getCharacterImage(
  species: string,
  stage: PetStage,
  skin?: CharacterSkin,
): string {
  const activeSkin = skin ?? getActiveSkin();
  const images = buildCharacterImages(activeSkin);
  return images[species]?.[stage] || images['기본몬']['baby'];
}

export interface EvolutionResult {
  newSpecies: string;
  newStage: PetProfile['stage'];
  statBoosts: Partial<GrowthTraits>;
}

export interface EvolutionContext {
  gachaEgg?: string | null;
}

function getDominantTrait(traits: GrowthTraits): keyof GrowthTraits {
  const entries = Object.entries(traits) as [keyof GrowthTraits, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/** 두 성향이 동률 1위인지 확인 */
function areDualDominant(
  traits: GrowthTraits,
  trait1: keyof GrowthTraits,
  trait2: keyof GrowthTraits,
): boolean {
  const max = Math.max(traits.power, traits.intelligence, traits.charm, traits.vitality);
  return traits[trait1] === max && traits[trait2] === max;
}

export function checkEvolution(pet: PetProfile, context: EvolutionContext = {}): EvolutionResult | null {
  const { level, stage, traits } = pet;

  if (stage === 'egg' && level >= 3) {
    return { newSpecies: '기본몬', newStage: 'baby', statBoosts: {} };
  }

  if (stage === 'baby' && level >= 5) {
    if (areDualDominant(traits, 'power', 'intelligence')) {
      return { newSpecies: '번개몬', newStage: 'child', statBoosts: { power: 8, intelligence: 8 } };
    }
    const dominant = getDominantTrait(traits);
    const evolutions: Record<keyof GrowthTraits, EvolutionResult> = {
      power: { newSpecies: '파워몬', newStage: 'child', statBoosts: { power: 10 } },
      intelligence: { newSpecies: '위즈몬', newStage: 'child', statBoosts: { intelligence: 10 } },
      charm: { newSpecies: '러블리몬', newStage: 'child', statBoosts: { charm: 10 } },
      vitality: { newSpecies: '그린몬', newStage: 'child', statBoosts: { vitality: 10 } },
    };
    return evolutions[dominant];
  }

  if (stage === 'child' && level >= 15) {
    if (areDualDominant(traits, 'charm', 'vitality')) {
      return { newSpecies: '문라이트몬', newStage: 'teen', statBoosts: { charm: 15, vitality: 15 } };
    }
    if (context.gachaEgg === 'wisdom' && getDominantTrait(traits) === 'intelligence') {
      return { newSpecies: '크리스탈몬', newStage: 'teen', statBoosts: { intelligence: 20, power: 5 } };
    }
    const dominant = getDominantTrait(traits);
    const evolutions: Record<keyof GrowthTraits, EvolutionResult> = {
      power: { newSpecies: '드래곤몬', newStage: 'teen', statBoosts: { power: 20 } },
      intelligence: { newSpecies: '매직몬', newStage: 'teen', statBoosts: { intelligence: 20 } },
      charm: { newSpecies: '엔젤몬', newStage: 'teen', statBoosts: { charm: 20 } },
      vitality: { newSpecies: '포레스몬', newStage: 'teen', statBoosts: { vitality: 20 } },
    };
    return evolutions[dominant];
  }

  if (stage === 'teen' && level >= 30) {
    return {
      newSpecies: '레전드몬',
      newStage: 'adult',
      statBoosts: { power: 15, intelligence: 15, charm: 15, vitality: 15 },
    };
  }

  if (stage === 'adult' && level >= 40) {
    const dominant = getDominantTrait(traits);
    const mythicEvolutions: Record<keyof GrowthTraits, EvolutionResult> = {
      power: { newSpecies: '인페르노몬', newStage: 'mythic', statBoosts: { power: 30, intelligence: 10, charm: 10, vitality: 10 } },
      intelligence: { newSpecies: '오라클몬', newStage: 'mythic', statBoosts: { power: 10, intelligence: 30, charm: 10, vitality: 10 } },
      charm: { newSpecies: '세라피몬', newStage: 'mythic', statBoosts: { power: 10, intelligence: 10, charm: 30, vitality: 10 } },
      vitality: { newSpecies: '가이아몬', newStage: 'mythic', statBoosts: { power: 10, intelligence: 10, charm: 10, vitality: 30 } },
    };
    return mythicEvolutions[dominant];
  }

  return null;
}
