/**
 * tutorialData.ts — 미니게임별 튜토리얼 데이터
 */
import type { TutorialData } from '@/components/game/GameTutorialCard';

export const TUTORIALS: Record<string, TutorialData> = {
  toy_puzzle: {
    gameId: 'toy_puzzle',
    gameIcon: '⭐',
    gameTitle: '별 퍼즐',
    subtitle: '타일을 올바른 순서로 맞춰보세요!',
    steps: [
      {
        icon: '🔲',
        title: '3×3 슬라이딩 퍼즐',
        description: '8개의 이모지 타일과 1개의 빈칸으로 이루어진 퍼즐입니다. 타일을 밀어 올바른 순서로 완성하세요.',
      },
      {
        icon: '👆',
        title: '빈칸 옆 타일 클릭',
        description: '빈칸과 인접한(상하좌우) 타일만 클릭할 수 있습니다. 클릭하면 해당 타일이 빈칸 방향으로 이동합니다.',
      },
      {
        icon: '🎯',
        title: '완성 목표 배열',
        description: '⭐🌙✨ / 💫🌟🔮 / 🌈🎀[빈] 순서로 완성하면 됩니다. 이동 횟수가 적을수록 더 많은 보상을 받아요!',
      },
      {
        icon: '🔄',
        title: '새로 섞기',
        description: '게임 중 "새로 섞기" 버튼을 누르면 타일을 다시 섞어 새로 시작할 수 있습니다.',
      },
    ],
    rewards: [
      {
        grade: '🏆 퍼펙트',
        condition: '20번 이하',
        reward: '코인 30 + EXP 20 + 🌈 40%',
        color: 'border-yellow-400 bg-yellow-50',
      },
      {
        grade: '⭐ 우수',
        condition: '21~30번',
        reward: '코인 20 + EXP 17 + ✨ 25%',
        color: 'border-blue-300 bg-blue-50',
      },
      {
        grade: '✅ 일반',
        condition: '31~50번',
        reward: '코인 10 + EXP 15',
        color: 'border-green-300 bg-green-50',
      },
      {
        grade: '🎀 완성',
        condition: '51번 이상',
        reward: '코인 5 + EXP 12',
        color: 'border-gray-200 bg-gray-50',
      },
    ],
    tip: '처음엔 빈칸 위치를 확인하고 목표 타일을 빈칸 쪽으로 유도하는 방향으로 생각해보세요. 모서리 타일부터 맞추면 더 쉬워요!',
  },

  toy_ball: {
    gameId: 'toy_ball',
    gameIcon: '⚽',
    gameTitle: '무지개 공 놀이',
    subtitle: '반려몬과 신나게 공놀이를 해요!',
    steps: [
      {
        icon: '⚽',
        title: '공 던지기',
        description: '화면에 표시되는 공을 탭하거나 클릭하세요. 반려몬이 공을 쫓아가며 신나게 놀아요!',
      },
      {
        icon: '💨',
        title: '연속 탭으로 콤보',
        description: '빠르게 연속으로 탭하면 콤보가 쌓여 더 많은 기분 회복 효과를 얻을 수 있어요.',
      },
      {
        icon: '😊',
        title: '기분 & 피로 변화',
        description: '공놀이를 하면 반려몬의 기분(+20)이 올라가지만 피로(+15)도 함께 쌓여요. 너무 무리하지 않도록 주의하세요!',
      },
      {
        icon: '💪',
        title: '힘 성향 성장',
        description: '무지개 공으로 놀면 반려몬의 힘(Power) 성향이 +3 성장해요. 힘 성향이 높을수록 강한 반려몬으로 진화해요!',
      },
    ],
    tip: '피로가 80 이상이면 공놀이 효과가 줄어들어요. 재우기로 피로를 회복한 뒤 놀아주세요!',
  },

  toy_ribbon: {
    gameId: 'toy_ribbon',
    gameIcon: '🎀',
    gameTitle: '리본 리듬',
    subtitle: '음악 박자에 맞춰 판정선에서 리본을 탭하세요!',
    steps: [
      {
        icon: '🎵',
        title: '박자 리듬',
        description: 'BGM 박자에 맞춰 🎀가 판정선에 도달할 때 3개 레인(◀ ● ▶)을 탭하세요. 4박 카운트인 후 45초!',
      },
      {
        icon: '🎯',
        title: '타이밍 맞추기',
        description: '판정선에 🎀가 올 때 탭! 음악과 동기화된 타이밍일수록 Perfect · Great 판정이에요.',
      },
      {
        icon: '😊',
        title: '기분 & 피로 변화',
        description: '리본 놀이를 하면 기분(+25)이 크게 올라가고 피로(-10)가 줄어요. 편안한 놀이예요!',
      },
      {
        icon: '💫',
        title: '매력 성향 성장',
        description: '정확도에 따라 매력(Charm) 성향이 +2~+5 성장해요. 매력이 높을수록 우아한 반려몬으로 진화해요!',
      },
    ],
    rewards: [
      {
        grade: '🏆 퍼펙트',
        condition: '95%+',
        reward: '코인 18 + EXP 25 + 매력 +5 + 🌈 40%',
        color: 'border-yellow-400 bg-yellow-50',
      },
      {
        grade: '⭐ 우수',
        condition: '85%+',
        reward: '코인 12 + EXP 20 + 매력 +4 + ✨ 25%',
        color: 'border-blue-300 bg-blue-50',
      },
      {
        grade: '✅ 일반',
        condition: '70%+',
        reward: '코인 8 + EXP 15 + 매력 +3',
        color: 'border-green-300 bg-green-50',
      },
      {
        grade: '🎀 완성',
        condition: '~69%',
        reward: '코인 4 + EXP 10 + 매력 +2',
        color: 'border-gray-200 bg-gray-50',
      },
    ],
    tip: '처음엔 가운데 레인(●)에 집중해보세요. 퍼펙트 타이밍은 핑크 존 중앙이에요!',
  },

  toy_leaf: {
    gameId: 'toy_leaf',
    gameIcon: '🌿',
    gameTitle: '잎사귀 뒤집기',
    subtitle: '카드를 뒤집어 같은 반려몬 짝을 찾으세요!',
    steps: [
      {
        icon: '🃏',
        title: '카드 뒤집기',
        description: '4×5 그리드에 10쌍 20장의 반려몬 카드가 있어요. 카드를 탭해서 두 장씩 짝을 맞춰보세요!',
      },
      {
        icon: '🧠',
        title: '기억력 게임',
        description: '앞면은 🌿 잎사귀로 통일! 뒤집으면 반려몬 이모지가 나와요. 위치를 기억하는 게 핵심이에요.',
      },
      {
        icon: '😊',
        title: '기분 & 피로 변화',
        description: '집중 놀이로 기분(+18)이 올라가지만 피로(+8)도 쌓여요. 적당히 쉬어가며 놀아주세요!',
      },
      {
        icon: '🌱',
        title: '활력 성향 성장',
        description: '턴 수에 따라 활력(Vitality) 성향이 +2~+5 성장해요. 적은 턴일수록 높은 등급과 보상!',
      },
    ],
    rewards: [
      {
        grade: '🏆 퍼펙트',
        condition: '≤12턴',
        reward: '코인 18 + EXP 26 + 활력 +5 + 🌈 40%',
        color: 'border-yellow-400 bg-yellow-50',
      },
      {
        grade: '⭐ 우수',
        condition: '≤17턴',
        reward: '코인 12 + EXP 20 + 활력 +4 + ✨ 25%',
        color: 'border-blue-300 bg-blue-50',
      },
      {
        grade: '✅ 일반',
        condition: '≤24턴',
        reward: '코인 8 + EXP 15 + 활력 +3',
        color: 'border-green-300 bg-green-50',
      },
      {
        grade: '🎀 완성',
        condition: '25턴+',
        reward: '코인 3 + EXP 10 + 활력 +2',
        color: 'border-gray-200 bg-gray-50',
      },
    ],
    tip: '처음엔 한쪽 구역부터 천천히 뒤집어 위치를 기억해보세요. 이미 본 카드는 다시 탭하지 않도록 집중!',
  },
};
