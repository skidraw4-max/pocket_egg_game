/**
 * FeedingMenu - 먹이 주기 오버레이 메뉴
 * Cozy Nursery: 하단에서 슬라이드업, 부드러운 카드 형태
 */
import { useGame } from '@/contexts/GameContext';

interface FeedingMenuProps {
  onClose: () => void;
}

export default function FeedingMenu({ onClose }: FeedingMenuProps) {
  const { state, feed } = useGame();
  const foodItems = state.inventory.filter(i => i.type === 'food' && i.quantity > 0);

  const handleFeed = (itemId: string) => {
    feed(itemId);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up"
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
              <span className="text-xs font-semibold text-warm-brown">{item.name}</span>
              <span className="text-[10px] text-sub-brown">x{item.quantity}</span>
            </button>
          ))}
        </div>

        {foodItems.length === 0 && (
          <div className="text-center py-8 text-sub-brown text-sm">
            먹이가 없어요... 상점에서 구매해 주세요!
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
