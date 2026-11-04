/**
 * guideData.ts — 기능 가이드 아티클 (가이드북 + 맥락형 안내)
 */
import type { TutorialStep } from '@/components/game/GameTutorialCard';

export type GuideCategory = 'care' | 'room' | 'minigame' | 'growth' | 'social' | 'quest';

export interface GuideArticle {
  id: string;
  category: GuideCategory;
  icon: string;
  title: string;
  subtitle: string;
  steps: TutorialStep[];
  tip?: string;
  /** 미니게임 가이드북에서 tutorialData 키와 연결 */
  linkedTutorialId?: string;
}

export const GUIDE_CATEGORIES: { id: GuideCategory; label: string; icon: string }[] = [
  { id: 'care', label: '육성', icon: '🍼' },
  { id: 'room', label: '방 꾸미기', icon: '🏠' },
  { id: 'minigame', label: '미니게임', icon: '🎮' },
  { id: 'growth', label: '성장', icon: '🌱' },
  { id: 'social', label: '소셜', icon: '👫' },
  { id: 'quest', label: '퀘스트', icon: '📋' },
];

export const GUIDE_ARTICLES: GuideArticle[] = [
  // —— P0: 육성 기본 ——
  {
    id: 'guide_care_basics',
    category: 'care',
    icon: '🍼',
    title: '육성 기본',
    subtitle: '반려몬을 건강하고 행복하게 키우는 방법',
    steps: [
      {
        icon: '🍖',
        title: '배고픔 · 기분 · 청결 · 피로',
        description: '네 가지 상태는 시간이 지나면 자연스럽게 변해요. 배고픔·기분·청결은 줄고, 피로는 쌓여요. 너무 방치하면 기분도 함께 떨어져요.',
      },
      {
        icon: '🍼',
        title: '먹이주기',
        description: '하단 「먹이주기」에서 음식을 골라 주세요. 배고픔 회복 + EXP·친밀도가 올라가요.',
      },
      {
        icon: '🛁',
        title: '목욕 · 휴식',
        description: '목욕은 청결을, 휴식은 피로를 회복해요. 피로가 높을 때 재우면 EXP 보너스도 받을 수 있어요.',
      },
      {
        icon: '👆',
        title: '터치',
        description: '반려몬을 탭하면 기분과 친밀도가 조금씩 올라가요. 자주 만져 주세요!',
      },
    ],
    tip: '상태 바가 30 이하로 떨어지면 기분 페널티가 생겨요. 먹이·목욕·휴식을 골고루 해 주세요.',
  },

  // —— P0: 방 꾸미기 ——
  {
    id: 'guide_room_decor',
    category: 'room',
    icon: '🏪',
    title: '방 꾸미기 기본',
    subtitle: '배경과 가구로 나만의 방 만들기',
    steps: [
      {
        icon: '🖼️',
        title: '배경 구매·적용',
        description: '상점 → 배경 탭에서 마법 숲, 바닷속, 구름 성, 과자 가게 등을 구매할 수 있어요. 구매 후 「적용하기」로 방 배경을 바꿔요.',
      },
      {
        icon: '🛋️',
        title: '가구 구매',
        description: '상점 → 가구 탭에서 코인·젬·친구 코인으로 가구를 살 수 있어요. 구매하면 자동으로 방에 배치돼요.',
      },
      {
        icon: '✏️',
        title: '방 편집 시작',
        description: '방 오른쪽 위 「✏️ 방 꾸미기」 또는 상점의 「방 배치 편집」으로 편집 모드에 들어가요.',
      },
      {
        icon: '💾',
        title: '저장',
        description: '편집 후 「완료」를 누르면 배치가 저장돼요. 배경 미리보기만 한 경우, 완료 시 원래 배경이 유지돼요.',
      },
    ],
    tip: '가구는 배경마다 preset 위치가 있어요. 처음엔 preset대로 두고, 마음에 안 들면 편집 모드에서 조정해 보세요.',
  },

  {
    id: 'guide_room_edit',
    category: 'room',
    icon: '✏️',
    title: '방 배치 편집',
    subtitle: '드래그 · 크기 · 반전 · 순서 조정',
    steps: [
      {
        icon: '👆',
        title: '가구 선택',
        description: '하단 가구 아이콘을 탭해 선택하세요. 선택된 가구는 방에서 드래그로 이동할 수 있어요.',
      },
      {
        icon: '📏',
        title: '크기 · 반전 · 회전',
        description: '크기 슬라이더, ↔ 반전, ↻ 90° 버튼으로 가구 모양을 조절해요.',
      },
      {
        icon: '⬆️',
        title: '앞·뒤 순서',
        description: '「앞으로」「뒤로」로 z-index를 바꿔 가구가 겹칠 때 순서를 정해요.',
      },
      {
        icon: '👁',
        title: '숨기기 · 초기화',
        description: '「방에서 숨기기」는 보유는 유지하고 화면에서만 숨겨요. 「preset 초기화」는 배경별 기본 위치로 되돌려요.',
      },
      {
        icon: '▲',
        title: '패널 접기',
        description: '「▲ 접기」를 누르면 편집 패널이 줄어들어 방 배치 공간이 넓어져요.',
      },
    ],
    tip: '숨긴 가구는 방 혜택에도 적용되지 않아요. 혜택을 받으려면 방에 표시해 두세요.',
  },

  {
    id: 'guide_decor_perks',
    category: 'room',
    icon: '🏠',
    title: '방 혜택 (가구 패시브)',
    subtitle: '가구를 두면 작은 육성 보너스가 켜져요',
    steps: [
      {
        icon: '✅',
        title: '적용 조건',
        description: '가구를 구매했고, 방에 표시 중(hidden 아님)일 때 혜택이 적용돼요.',
      },
      {
        icon: '📉',
        title: '상태 감소 완화',
        description: '기분·배고픔·청결 감소가 느려지는 가구가 있어요. 같은 종류는 최대 20%까지 모여요.',
      },
      {
        icon: '🍰',
        title: '행동 보너스',
        description: '먹이·수면·터치·놀기 시 소량 보너스(기분+2, 배고픔+3 등)를 주는 가구도 있어요.',
      },
      {
        icon: '✨',
        title: '배경 시너지',
        description: '테마에 맞는 배경과 함께 두면 혜택이 더 커져요. 예: 버섯 램프 + 마법 숲.',
      },
    ],
    tip: '상점 가구 카드와 가구 탭 상단에서 「🏠 방 혜택」과 활성 혜택 요약을 확인할 수 있어요.',
  },

  // —— P1: 미니게임 (요약 + tutorialData 연결) ——
  {
    id: 'guide_minigame_overview',
    category: 'minigame',
    icon: '🎮',
    title: '미니게임 안내',
    subtitle: '장난감으로 놀며 EXP·코인·성향 성장',
    steps: [
      {
        icon: '🎾',
        title: '놀이 메뉴',
        description: '하단 「놀이」에서 보유 장난감을 고르면 미니게임 또는 바로 놀기가 시작돼요.',
      },
      {
        icon: '📖',
        title: '게임별 규칙',
        description: '처음 플레이 시 규칙 카드가 나와요. 가이드북에서도 각 게임 설명을 다시 볼 수 있어요.',
      },
      {
        icon: '🎁',
        title: '보상',
        description: '게임마다 코인·EXP·조각·성향(힘/매력/활력) 보상이 달라요. 등급이 높을수록 더 많이 받아요.',
      },
    ],
    tip: '피로가 80 이상이면 일부 놀이 효과가 줄어들 수 있어요. 휴식 후 놀아 주세요.',
  },
  {
    id: 'guide_toy_puzzle',
    category: 'minigame',
    icon: '⭐',
    title: '별 퍼즐',
    subtitle: '3×3 슬라이딩 퍼즐',
    steps: [],
    linkedTutorialId: 'toy_puzzle',
  },
  {
    id: 'guide_toy_ball',
    category: 'minigame',
    icon: '⚽',
    title: '무지개 공 놀이',
    subtitle: '연속 탭 콤보',
    steps: [],
    linkedTutorialId: 'toy_ball',
  },
  {
    id: 'guide_toy_ribbon',
    category: 'minigame',
    icon: '🎀',
    title: '리본 리듬',
    subtitle: '3레인 리듬 게임',
    steps: [],
    linkedTutorialId: 'toy_ribbon',
  },
  {
    id: 'guide_toy_leaf',
    category: 'minigame',
    icon: '🌿',
    title: '잎사귀 뒤집기',
    subtitle: '메모리 카드 매칭',
    steps: [],
    linkedTutorialId: 'toy_leaf',
  },

  // —— P1: 성장 ——
  {
    id: 'guide_growth',
    category: 'growth',
    icon: '🌱',
    title: '성장 · 진화',
    subtitle: 'EXP, 단계, 성향으로 반려몬이 자라요',
    steps: [
      {
        icon: '⭐',
        title: 'EXP · 레벨',
        description: '먹이·놀이·목욕·휴식·미니게임으로 EXP를 모아요. 레벨업 시 보상이 있어요.',
      },
      {
        icon: '🦋',
        title: '진화',
        description: 'EXP와 성향(힘·지능·매력·활력)에 따라 다른 종족으로 진화해요. 프로필에서 성향을 확인하세요.',
      },
      {
        icon: '💕',
        title: '친밀도',
        description: '터치·먹이·놀이로 친밀도가 올라가요. 마일스톤 보상도 있어요.',
      },
      {
        icon: '📚',
        title: '도감',
        description: '진화한 종족은 도감에 기록돼요. 수집 보상도 챙겨 보세요.',
      },
    ],
    tip: '가구 「알 둥지」는 알·아기 단계에서 친밀도 획득 +10% 혜택이 있어요.',
  },

  // —— P2: 소셜 ——
  {
    id: 'guide_social',
    category: 'social',
    icon: '👫',
    title: '친구 · 소셜',
    subtitle: '친구 방문과 소셜 가구',
    steps: [
      {
        icon: '🏠',
        title: '친구 방 보기',
        description: '소셜 메뉴에서 친구 목록·추천 유저의 방을 미리볼 수 있어요.',
      },
      {
        icon: '🪙',
        title: '친구 코인',
        description: '방문·좋아요 등 소셜 활동으로 친구 코인을 모아 소셜 전용 가구를 살 수 있어요.',
      },
      {
        icon: '🏆',
        title: '소셜 가구',
        description: '황금 받침대, 무지개 카펫 등은 친구 코인 전용이에요. 일부는 방 혜택도 있어요.',
      },
    ],
    tip: '친구 방은 9:16 비율로 예쁘게 보이도록 맞춰져 있어요.',
  },

  // —— P2: 퀘스트 ——
  {
    id: 'guide_quest',
    category: 'quest',
    icon: '📋',
    title: '퀘스트 · 출석',
    subtitle: '일일·주간 목표로 추가 보상',
    steps: [
      {
        icon: '📅',
        title: '일일 미션',
        description: '먹이·놀이·목욕·수면·상점 등 일일 목표를 달성하면 코인·EXP를 받아요.',
      },
      {
        icon: '🎯',
        title: '일일 챌린지 · 주간 목표',
        description: '미니게임·방문 등 추가 챌린지와 주간 육성 목표도 확인해 보세요.',
      },
      {
        icon: '🎁',
        title: '출석',
        description: '매일 접속하면 출석 보상이 쌓여요. 연속 출석일수도 기록돼요.',
      },
      {
        icon: '🌈',
        title: '조각 교환',
        description: '상점 교환 탭에서 미니게임 조각을 간식·가구 등으로 바꿀 수 있어요.',
      },
    ],
    tip: '퀘스트 아이콘은 화면 상단에서 열 수 있어요.',
  },
];

const ARTICLE_MAP = new Map(GUIDE_ARTICLES.map(a => [a.id, a]));

export function getGuideArticle(id: string): GuideArticle | undefined {
  return ARTICLE_MAP.get(id);
}

export function getGuidesByCategory(category: GuideCategory): GuideArticle[] {
  return GUIDE_ARTICLES.filter(a => a.category === category);
}

/** 맥락형 첫 안내용 guide id */
export const CONTEXT_GUIDE_IDS = {
  roomEdit: 'guide_room_edit',
  decorPerks: 'guide_decor_perks',
  careBasics: 'guide_care_basics',
} as const;
