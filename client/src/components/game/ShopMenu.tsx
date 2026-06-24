/**
 * ShopMenu - 상점 & 꾸미기 메뉴
 * Cozy Nursery: 아이템 구매 및 방 꾸미기
 */
import { useGame } from '@/contexts/GameContext';
import { useState } from 'react';
import type { ShopItemDef } from '@/lib/gameState';

interface ShopMenuProps {
  onClose: () => void;
}

type TabType = 'food' | 'toy' | 'decor';

/** 상점 아이템 카탈로그 (inventoryItem 포함) */
const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'food_basic',
    name: '포켓 사료',
    type: 'food',
    icon: '🍖',
    price: 30,
    currency: 'coins',
    description: '영양 가득 기본 사료',
    inventoryItem: {
      id: 'food_basic',
      name: '포켓 사료',
      type: 'food',
      icon: '🍖',
      effect: { hunger: 15 },
      description: '영양이 가득한 기본 사료예요.',
    },
  },
  {
    id: 'food_cookie',
    name: '꿀방울 쿠키',
    type: 'food',
    icon: '🍪',
    price: 50,
    currency: 'coins',
    description: '달콤한 쿠키',
    inventoryItem: {
      id: 'food_cookie',
      name: '꿀방울 쿠키',
      type: 'food',
      icon: '🍪',
      effect: { hunger: 10, mood: 10 },
      traitBonus: { charm: 2 },
      description: '달콤한 쿠키로 기분이 좋아져요!',
    },
  },
  {
    id: 'food_salad',
    name: '잎사귀 샐러드',
    type: 'food',
    icon: '🥗',
    price: 40,
    currency: 'coins',
    description: '신선한 채소',
    inventoryItem: {
      id: 'food_salad',
      name: '잎사귀 샐러드',
      type: 'food',
      icon: '🥗',
      effect: { hunger: 12, clean: 5 },
      traitBonus: { vitality: 2 },
      description: '신선한 채소로 건강을 챙겨요!',
    },
  },
  {
    id: 'food_cake',
    name: '무지개 케이크',
    type: 'food',
    icon: '🎂',
    price: 100,
    currency: 'coins',
    description: '특별한 날의 케이크',
    inventoryItem: {
      id: 'food_cake',
      name: '무지개 케이크',
      type: 'food',
      icon: '🎂',
      effect: { hunger: 25, mood: 20 },
      traitBonus: { charm: 3, vitality: 1 },
      description: '특별한 날의 케이크! 기분이 최고예요!',
    },
  },
  {
    id: 'toy_ball',
    name: '무지개 공',
    type: 'toy',
    icon: '⚽',
    price: 80,
    currency: 'coins',
    description: '힘을 길러주는 공',
    inventoryItem: {
      id: 'toy_ball',
      name: '무지개 공',
      type: 'toy',
      icon: '⚽',
      effect: { mood: 20, fatigue: 15 },
      traitBonus: { power: 3 },
      description: '공놀이로 힘을 길러요!',
    },
  },
  {
    id: 'toy_puzzle',
    name: '별 퍼즐',
    type: 'toy',
    icon: '⭐',
    price: 80,
    currency: 'coins',
    description: '지능을 높여주는 퍼즐',
    inventoryItem: {
      id: 'toy_puzzle',
      name: '별 퍼즐',
      type: 'toy',
      icon: '⭐',
      effect: { mood: 15, fatigue: 10 },
      traitBonus: { intelligence: 3 },
      description: '퍼즐을 풀면 머리가 좋아져요!',
    },
  },
  {
    id: 'toy_ribbon',
    name: '리본 장난감',
    type: 'toy',
    icon: '🎀',
    price: 3,
    currency: 'gems',
    description: '매력을 높여주는 리본',
    inventoryItem: {
      id: 'toy_ribbon',
      name: '리본 장난감',
      type: 'toy',
      icon: '🎀',
      effect: { mood: 25, fatigue: 10 },
      traitBonus: { charm: 5 },
      description: '리본 장난감으로 매력이 올라가요!',
    },
  },
  {
    id: 'decor_flower',
    name: '꽃 화분',
    type: 'decor',
    icon: '🌸',
    price: 150,
    currency: 'coins',
    description: '방을 밝혀주는 화분',
  },
  {
    id: 'decor_star',
    name: '별 조명',
    type: 'decor',
    icon: '🌟',
    price: 5,
    currency: 'gems',
    description: '반짝이는 별 조명',
  },
];

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

export default function ShopMenu({ onClose }: ShopMenuProps) {
  const { state, purchase } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>('food');
  const [toast, setToast] = useState<Toast | null>(null);

  const filteredItems = SHOP_ITEMS.filter(item => item.type === activeTab);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handlePurchase = (item: ShopItemDef) => {
    const result = purchase(item);

    if (!result.success) {
      if (result.reason === 'insufficient_funds') {
        showToast('재화가 부족해요!', 'error');
      } else if (result.reason === 'already_owned') {
        showToast('이미 보유 중이에요!', 'info');
      }
      return;
    }

    showToast(`${item.name} 구매 완료!`, 'success');
  };

  const isOwned = (item: ShopItemDef) => {
    if (item.type === 'decor') {
      return state.room.furniture.includes(item.id);
    }
    return false; // 음식/장난감은 중복 구매 허용
  };

  const canAfford = (item: ShopItemDef) => {
    return item.currency === 'coins'
      ? state.coins >= item.price
      : state.gems >= item.price;
  };

  // 인벤토리에서 현재 보유 수량 조회
  const getInventoryQty = (itemId: string) => {
    return state.inventory.find(i => i.id === itemId)?.quantity ?? 0;
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'food', label: '먹이', icon: '🍖' },
    { id: 'toy', label: '장난감', icon: '🎾' },
    { id: 'decor', label: '가구', icon: '🏠' },
  ];

  const toastColors: Record<ToastType, string> = {
    success: 'bg-mint text-warm-brown',
    error: 'bg-[oklch(0.70_0.15_30)] text-white',
    info: 'bg-lavender text-warm-brown',
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up max-h-[75vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>🛒</span> 상점
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-warm-brown">🪙 {state.coins}</span>
            <span className="text-sm font-semibold text-warm-brown">💎 {state.gems}</span>
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
          {filteredItems.map(item => {
            const owned = isOwned(item);
            const affordable = canAfford(item);
            const qty = item.type !== 'decor' ? getInventoryQty(item.id) : null;

            return (
              <button
                key={item.id}
                onClick={() => !owned && handlePurchase(item)}
                disabled={owned}
                className={`
                  relative flex flex-col items-center gap-1 p-3 rounded-2xl border
                  transition-all duration-150
                  ${owned
                    ? 'bg-muted/50 border-border opacity-60 cursor-default'
                    : affordable
                      ? 'bg-cream border-border cushion-btn active:scale-95'
                      : 'bg-cream border-border cushion-btn active:scale-95 opacity-70'
                  }
                `}
              >
                {/* 보유 중 뱃지 */}
                {owned && (
                  <span className="absolute top-2 right-2 text-[10px] bg-mint text-warm-brown px-1.5 py-0.5 rounded-full font-bold">
                    보유
                  </span>
                )}

                {/* 인벤토리 수량 뱃지 */}
                {qty !== null && qty > 0 && (
                  <span className="absolute top-2 right-2 text-[10px] bg-peach/80 text-white px-1.5 py-0.5 rounded-full font-bold">
                    ×{qty}
                  </span>
                )}

                <span className="text-3xl">{item.icon}</span>
                <span className="text-xs font-semibold text-warm-brown text-center">{item.name}</span>
                <span className="text-[10px] text-sub-brown text-center">{item.description}</span>

                {/* 가격 */}
                <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full ${
                  affordable ? 'bg-white/60' : 'bg-white/30'
                }`}>
                  <span className="text-xs">{item.currency === 'coins' ? '🪙' : '💎'}</span>
                  <span className={`text-xs font-bold ${affordable ? 'text-peach' : 'text-sub-brown'}`}>
                    {item.price}
                  </span>
                  {!affordable && (
                    <span className="text-[9px] text-sub-brown">부족</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 토스트 메시지 */}
        {toast && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-pop-in ${toastColors[toast.type]}`}>
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
