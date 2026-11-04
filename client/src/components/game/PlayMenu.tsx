/**
 * PlayMenu - 놀이 메뉴 오버레이
 * Cozy Nursery: 하단 슬라이드업, 장난감 선택
 * 방식 1: 장난감 클릭 시 tutorialSeen 체크 → 미확인 시 GameTutorialCard 표시
 */
import { useGame } from '@/contexts/GameContext';
import { useState } from 'react';
import PuzzleGame from '@/components/game/PuzzleGame';
import BallGame from '@/components/game/BallGame';
import RibbonGame from '@/components/game/RibbonGame';
import LeafFlipGame from '@/components/game/LeafFlipGame';
import GameTutorialCard from '@/components/game/GameTutorialCard';
import { TUTORIALS } from '@/lib/tutorialData';
import { PLAY_TOY_IDS, getInventoryCatalogItem } from '@/lib/cloudState';

interface PlayMenuProps {
  onClose: () => void;
}

function getObjectParticle(name: string): '을' | '를' {
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '을';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}

export default function PlayMenu({ onClose }: PlayMenuProps) {
  const { state, play, setTutorialSeen } = useGame();
  const ownedToyIds = new Set(
    state.inventory.filter(i => i.type === 'toy' && i.quantity > 0).map(i => i.id),
  );
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showBallGame, setShowBallGame] = useState(false);
  const [showRibbonGame, setShowRibbonGame] = useState(false);
  const [showLeafFlipGame, setShowLeafFlipGame] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  /** 장난감 클릭 핸들러 — tutorialSeen 여부에 따라 분기 */
  const handlePlay = (itemId: string) => {
    if (!ownedToyIds.has(itemId)) return;

    const seen = state.tutorialSeen?.[itemId] ?? false;
    if (!seen && TUTORIALS[itemId]) {
      setPendingItemId(itemId);
      return;
    }
    startGame(itemId);
  };

  /** 실제 게임 시작 */
  const startGame = (itemId: string) => {
    if (itemId === 'toy_puzzle') {
      setShowPuzzle(true);
    } else if (itemId === 'toy_ball') {
      setShowBallGame(true);
    } else if (itemId === 'toy_ribbon') {
      setShowRibbonGame(true);
    } else if (itemId === 'toy_leaf') {
      setShowLeafFlipGame(true);
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

  // 공놀이 게임 화면
  if (showBallGame) {
    return <BallGame onClose={onClose} />;
  }

  // 리본 리듬 게임 화면
  if (showRibbonGame) {
    return <RibbonGame onClose={onClose} />;
  }

  // 잎사귀 뒤집기 게임 화면
  if (showLeafFlipGame) {
    return <LeafFlipGame onClose={onClose} />;
  }

  // 튜토리얼 카드 오버레이 (장난감 목록 위에 표시)
  if (pendingItemId && TUTORIALS[pendingItemId]) {
    return (
      <div className="absolute inset-0 z-50">
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
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl pt-5 px-5 pb-app-safe shadow-2xl animate-slide-up max-h-[min(70dvh,100%)] flex flex-col min-h-0"
        onClick={e => e.stopPropagation()}
      >
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

        <div className="grid grid-cols-2 gap-3">
          {PLAY_TOY_IDS.map(toyId => {
            const meta = getInventoryCatalogItem(toyId);
            if (!meta) return null;

            const owned = ownedToyIds.has(toyId);
            const seen = state.tutorialSeen?.[toyId] ?? false;
            const particle = getObjectParticle(meta.name);

            return (
              <button
                key={toyId}
                type="button"
                disabled={!owned}
                onClick={() => handlePlay(toyId)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border border-border ${
                  owned
                    ? 'bg-cream cushion-btn'
                    : 'bg-muted/60 opacity-60 grayscale cursor-not-allowed'
                }`}
              >
                {!seen && owned && TUTORIALS[toyId] && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    !
                  </span>
                )}

                <span className="text-4xl">{meta.icon}</span>
                <span className="text-sm font-semibold text-warm-brown">{meta.name}</span>
                <span className="text-[10px] text-sub-brown text-center leading-snug">
                  {owned
                    ? meta.description
                    : `상점에서 ${meta.name}${particle} 구입하면 놀 수 있어요!`}
                </span>
              </button>
            );
          })}
        </div>

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
