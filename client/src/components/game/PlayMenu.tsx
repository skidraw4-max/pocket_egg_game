/**
 * PlayMenu - 놀이 메뉴 오버레이
 * Cozy Nursery: 하단 슬라이드업, 장난감 선택
 * 방식 1: 장난감 클릭 시 tutorialSeen 체크 → 미확인 시 GameTutorialCard 표시
 */
import { useGame } from '@/contexts/GameContext';
import { useState } from 'react';
import PuzzleGame from '@/components/game/PuzzleGame';
import GameTutorialCard from '@/components/game/GameTutorialCard';
import { TUTORIALS } from '@/lib/tutorialData';

interface PlayMenuProps {
  onClose: () => void;
}

export default function PlayMenu({ onClose }: PlayMenuProps) {
  const { state, play, setTutorialSeen } = useGame();
  const toyItems = state.inventory.filter(i => i.type === 'toy');
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  /** 장난감 클릭 핸들러 — tutorialSeen 여부에 따라 분기 */
  const handlePlay = (itemId: string) => {
    const seen = state.tutorialSeen?.[itemId] ?? false;
    if (!seen && TUTORIALS[itemId]) {
      // 튜토리얼 미확인 → 카드 표시
      setPendingItemId(itemId);
      return;
    }
    // 튜토리얼 확인됨 → 바로 시작
    startGame(itemId);
  };

  /** 실제 게임 시작 */
  const startGame = (itemId: string) => {
    if (itemId === 'toy_puzzle') {
      setShowPuzzle(true);
    } else {
      play(itemId);
      onClose();
    }
  };

  /** 튜토리얼 카드에서 "게임 시작!" 클릭 */
  const handleTutorialStart = (skipNext: boolean) => {
    if (!pendingItemId) return;
    if (skipNext) {
      setTutorialSeen(pendingItemId, true);
    }
    const itemId = pendingItemId;
    setPendingItemId(null);
    startGame(itemId);
  };

  /** 튜토리얼 카드 닫기 (게임 시작 없이) */
  const handleTutorialClose = () => {
    setPendingItemId(null);
  };

  // 퍼즐 게임 화면
  if (showPuzzle) {
    return <PuzzleGame onClose={onClose} />;
  }

  // 튜토리얼 카드 오버레이 (장난감 목록 위에 표시)
  if (pendingItemId && TUTORIALS[pendingItemId]) {
    return (
      <div className="absolute inset-0 z-50">
        {/* 배경 — 반투명 */}
        <div className="absolute inset-0 bg-black/30" onClick={handleTutorialClose} />
        <GameTutorialCard
          tutorial={TUTORIALS[pendingItemId]}
          onStart={handleTutorialStart}
          onClose={handleTutorialClose}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>🎾</span> 놀아주기
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-sub-brown mb-3">장난감을 골라주세요!</p>

        {/* 장난감 목록 */}
        <div className="grid grid-cols-2 gap-3">
          {toyItems.map(item => {
            const seen = state.tutorialSeen?.[item.id] ?? false;
            return (
              <button
                key={item.id}
                onClick={() => handlePlay(item.id)}
                className="relative flex flex-col items-center gap-2 p-4 bg-cream rounded-2xl cushion-btn border border-border"
              >
                {/* 튜토리얼 미확인 배지 */}
                {!seen && TUTORIALS[item.id] && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    !
                  </span>
                )}
                <span className="text-4xl">{item.icon}</span>
                <span className="text-sm font-semibold text-warm-brown">{item.name}</span>
                <span className="text-[10px] text-sub-brown">{item.description}</span>
              </button>
            );
          })}
        </div>

        {toyItems.length === 0 && (
          <div className="text-center py-8 text-sub-brown text-sm">
            장난감이 없어요... 상점에서 구매해 주세요!
          </div>
        )}

        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
