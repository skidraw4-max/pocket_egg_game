/**
 * ShopMenu - 상점 & 꾸미기 메뉴
 * Cozy Nursery: 아이템 구매 및 방 꾸미기
 */
import { useGame } from '@/contexts/GameContext';
import { useState } from 'react';

interface ShopMenuProps {
  onClose: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'decor';
  icon: string;
  price: number;
  currency: 'coins' | 'gems';
  description: string;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'food_basic', name: '포켓 사료', type: 'food', icon: '🍖', price: 30, currency: 'coins', description: '영양 가득 기본 사료' },
  { id: 'food_cookie', name: '꿀방울 쿠키', type: 'food', icon: '🍪', price: 50, currency: 'coins', description: '달콤한 쿠키' },
  { id: 'food_salad', name: '잎사귀 샐러드', type: 'food', icon: '🥗', price: 40, currency: 'coins', description: '신선한 채소' },
  { id: 'food_cake', name: '무지개 케이크', type: 'food', icon: '🎂', price: 100, currency: 'coins', description: '특별한 날의 케이크' },
  { id: 'toy_ball', name: '무지개 공', type: 'toy', icon: '⚽', price: 80, currency: 'coins', description: '힘을 길러주는 공' },
  { id: 'toy_puzzle', name: '별 퍼즐', type: 'toy', icon: '⭐', price: 80, currency: 'coins', description: '지능을 높여주는 퍼즐' },
  { id: 'toy_ribbon', name: '리본 장난감', type: 'toy', icon: '🎀', price: 3, currency: 'gems', description: '매력을 높여주는 리본' },
  { id: 'decor_flower', name: '꽃 화분', type: 'decor', icon: '🌸', price: 150, currency: 'coins', description: '방을 밝혀주는 화분' },
  { id: 'decor_star', name: '별 조명', type: 'decor', icon: '🌟', price: 5, currency: 'gems', description: '반짝이는 별 조명' },
];

type TabType = 'food' | 'toy' | 'decor';

export default function ShopMenu({ onClose }: ShopMenuProps) {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>('food');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  const filteredItems = SHOP_ITEMS.filter(item => item.type === activeTab);

  const handlePurchase = (item: ShopItem) => {
    const canAfford = item.currency === 'coins'
      ? state.coins >= item.price
      : state.gems >= item.price;

    if (!canAfford) {
      setPurchaseMessage('재화가 부족해요!');
      setTimeout(() => setPurchaseMessage(null), 2000);
      return;
    }

    setPurchaseMessage(`${item.name}을(를) 구매했어요!`);
    setTimeout(() => setPurchaseMessage(null), 2000);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'food', label: '먹이', icon: '🍖' },
    { id: 'toy', label: '장난감', icon: '🎾' },
    { id: 'decor', label: '가구', icon: '🏠' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>🛒</span> 상점
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm">🪙 {state.coins}</span>
            <span className="text-sm">💎 {state.gems}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-peach text-white'
                  : 'bg-cream text-warm-brown'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 상품 목록 */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-2">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handlePurchase(item)}
              className="flex flex-col items-center gap-1 p-3 bg-cream rounded-2xl cushion-btn border border-border"
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="text-xs font-semibold text-warm-brown">{item.name}</span>
              <span className="text-[10px] text-sub-brown">{item.description}</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs">{item.currency === 'coins' ? '🪙' : '💎'}</span>
                <span className="text-xs font-bold text-peach">{item.price}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 구매 메시지 */}
        {purchaseMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-warm-brown text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-pop-in">
            {purchaseMessage}
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
          @keyframes pop-in {
            0% { transform: translate(-50%, -10px) scale(0.9); opacity: 0; }
            100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          }
          .animate-pop-in {
            animation: pop-in 200ms ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
