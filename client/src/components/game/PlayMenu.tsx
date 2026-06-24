/**
 * PlayMenu - 놀이 메뉴 오버레이
 * Cozy Nursery: 하단 슬라이드업, 장난감 선택
 */
import { useGame } from '@/contexts/GameContext';
import { useState } from 'react';
import PuzzleGame from '@/components/game/PuzzleGame';

interface PlayMenuProps {
  onClose: () => void;
}

export default function PlayMenu({ onClose }: PlayMenuProps) {
  const { state, play } = useGame();
  const toyItems = state.inventory.filter(i => i.type === 'toy');
  const [showPuzzle, setShowPuzzle] = useState(false);

  const handlePlay = (itemId: string) => {
    if (itemId === 'toy_puzzle') {
      setShowPuzzle(true);
      return;
    }
    play(itemId);
    onClose();
  };

  if (showPuzzle) {
    return <PuzzleGame onClose={onClose} />;
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
          {toyItems.map(item => (
            <button
              key={item.id}
              onClick={() => handlePlay(item.id)}
              className="flex flex-col items-center gap-2 p-4 bg-cream rounded-2xl cushion-btn border border-border"
            >
              <span className="text-4xl">{item.icon}</span>
              <span className="text-sm font-semibold text-warm-brown">{item.name}</span>
              <span className="text-[10px] text-sub-brown">{item.description}</span>
            </button>
          ))}
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
