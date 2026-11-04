/**
 * FeedingMenu - 먹이 주기 오버레이 메뉴
 * Cozy Nursery: 하단에서 슬라이드업, 부드러운 카드 형태
 */
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { FOOD_STAR_GROWTH_SNACK_ID, FOOD_INTIMACY_BOOSTER_ID } from '@/lib/gameState';

interface FeedingMenuProps {
  onClose: () => void;
}

type ToastType = 'info' | 'error';

export default function FeedingMenu({ onClose }: FeedingMenuProps) {
  const { state, feed } = useGame();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const foodItems = state.inventory.filter(i => i.type === 'food' && i.quantity > 0);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleFeed = (itemId: string) => {
    const ok = feed(itemId);
    if (!ok) {
      if (itemId === FOOD_STAR_GROWTH_SNACK_ID) {
        showToast('별빛 성장 효과가 이미 활성화되어 있어요!', 'info');
      } else if (itemId === FOOD_INTIMACY_BOOSTER_ID) {
        showToast('친밀 부스트가 이미 활성화되어 있어요!', 'info');
      }
      return;
    }
    if (itemId === FOOD_STAR_GROWTH_SNACK_ID) {
      showToast('별빛 성장! 24시간 동안 활동 EXP가 2배예요 ✨', 'info');
      setTimeout(onClose, 1200);
      return;
    }
    if (itemId === FOOD_INTIMACY_BOOSTER_ID) {
      showToast('하트 친밀! 12시간 동안 친밀 획득 1.5배 💗', 'info');
      setTimeout(onClose, 1200);
      return;
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl pt-5 px-5 pb-app-safe shadow-2xl animate-slide-up max-h-[min(70dvh,100%)] flex flex-col min-h-0 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>🍖</span> 먹이 주기
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-sub-brown mb-3">먹이를 선택해 주세요!</p>

        {/* 아이템 그리드 */}
        <div className="grid grid-cols-3 gap-3">
          {foodItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleFeed(item.id)}
              className="flex flex-col items-center gap-1 p-3 bg-cream rounded-2xl cushion-btn border border-border"
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="text-xs font-semibold text-warm-brown text-center leading-tight">{item.name}</span>
              {item.id === FOOD_STAR_GROWTH_SNACK_ID && (
                <span className="text-[9px] font-bold text-peach bg-peach/10 px-1.5 py-0.5 rounded-full">
                  EXP×2 · 24h
                </span>
              )}
              <span className="text-[10px] text-sub-brown">x{item.quantity}</span>
            </button>
          ))}
        </div>

        {foodItems.length === 0 && (
          <div className="text-center py-8 text-sub-brown text-sm">
            먹이가 없어요... 상점에서 구매해 주세요!
          </div>
        )}

        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg bg-lavender text-warm-brown animate-pop-in">
            {toast.message}
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
