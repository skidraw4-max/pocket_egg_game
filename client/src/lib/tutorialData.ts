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
        reward: '코인 30 + EXP 20',
        color: 'border-yellow-400 bg-yellow-50',
      },
      {
        grade: '⭐ 우수',
        condition: '21~30번',
        reward: '코인 20 + EXP 17',
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
};
