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

type TabType = 'food' | 'toy' | 'decor' | 'wallpaper' | 'social';

/** 배경 아이템 카탈로그 */
const WALLPAPER_ITEMS: ShopItemDef[] = [
  {
    id: 'wallpaper_forest',
    name: '마법 숲의 방',
    type: 'wallpaper',
    icon: '🌿',
    price: 200,
    currency: 'coins',
    description: '반딧불이와 버섯이 빛나는 신비로운 숲',
    wallpaperUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/EDyFLiIKoVTNidnh.png',
  },
  {
    id: 'wallpaper_ocean',
    name: '바닷속 아지트',
    type: 'wallpaper',
    icon: '🐚',
    price: 200,
    currency: 'coins',
    description: '산호와 조개로 꾸며진 해저 방',
    wallpaperUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/fpjUTdQSftHkbLXj.png',
  },
  {
    id: 'wallpaper_cloud',
    name: '구름 성 침실',
    type: 'wallpaper',
    icon: '🌈',
    price: 5,
    currency: 'gems',
    description: '무지개와 별빛이 가득한 하늘 성',
    wallpaperUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/jQMljEkJnwaQEIjS.png',
  },
  {
    id: 'wallpaper_candy',
    name: '달콤한 과자 가게',
    type: 'wallpaper',
    icon: '🍭',
    price: 5,
    currency: 'gems',
    description: '사탕과 케이크로 가득 찬 달콤한 방',
    wallpaperUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/vuxdWHKrUrCnFAUo.png',
  },
];

/** 일반 상점 아이템 카탈로그 */
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
  {
    id: 'decor_sofa',
    name: '푹신한 소파',
    type: 'decor',
    icon: '🛋️',
    price: 200,
    currency: 'coins',
    description: '푹신하고 아늑한 소파',
  },
  {
    id: 'decor_bookshelf',
    name: '동화나라 책장',
    type: 'decor',
    icon: '📚',
    price: 180,
    currency: 'coins',
    description: '색깔마다 다른 동화책이 가득',
  },
  {
    id: 'decor_rainbow',
    name: '무지개 창문',
    type: 'decor',
    icon: '🌈',
    price: 8,
    currency: 'gems',
    description: '항상 무지개가 맴도는 마법의 창문',
  },
  {
    id: 'decor_cloud_bed',
    name: '구름 침대',
    type: 'decor',
    icon: '☁️',
    price: 10,
    currency: 'gems',
    description: '하늘에 떠 있는 듯 푹신한 침대',
  },
];

/** 소셜 전용 가구 카탈로그 (친구 코인으로만 구매 가능) */
const SOCIAL_ITEMS: ShopItemDef[] = [
  {
    id: 'social_golden_stand',
    name: '황금 알 받침대',
    type: 'decor',
    icon: '🏆',
    price: 100,
    currency: 'friendCoins',
    description: '황금빛으로 빛나는 희귀 받침대',
  },
  {
    id: 'social_photo_frame',
    name: '친구 사진 액자',
    type: 'decor',
    icon: '🖼️',
    price: 150,
    currency: 'friendCoins',
    description: '방문자 닉네임이 새겨지는 특별 액자',
  },
  {
    id: 'social_rainbow_carpet',
    name: '무지개 카펫',
    type: 'decor',
    icon: '🌈',
    price: 200,
    currency: 'friendCoins',
    description: '발걸음마다 무지개가 피어나는 카펫',
  },
  {
    id: 'social_star_mobile',
    name: '별빛 모빌',
    type: 'decor',
    icon: '✨',
    price: 250,
    currency: 'friendCoins',
    description: '천장에서 반짝이는 별빛 모빌',
  },
  {
    id: 'social_crown_cushion',
    name: '왕관 쿠션',
    type: 'decor',
    icon: '👑',
    price: 300,
    currency: 'friendCoins',
    description: '반려몬 옆에 놓이는 희귀 왕관 쿠션',
  },
  {
    id: 'social_trophy',
    name: '소셜 트로피',
    type: 'decor',
    icon: '🥇',
    price: 500,
    currency: 'friendCoins',
    description: '친구 10명 달성 기념 특별 트로피',
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
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null);

  const isSocialTab = activeTab === 'social';
  const isWallpaperTab = activeTab === 'wallpaper';

  const currentItems = isSocialTab
    ? SOCIAL_ITEMS
    : isWallpaperTab
      ? WALLPAPER_ITEMS
      : SHOP_ITEMS.filter(item => item.type === activeTab);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handlePurchase = (item: ShopItemDef) => {
    const result = purchase(item);

    if (!result.success) {
      if (result.reason === 'insufficient_funds') {
        showToast(
          item.currency === 'friendCoins'
            ? '친구 코인이 부족해요! 친구를 추가하거나 방문해 보세요.'
            : '재화가 부족해요!',
          'error'
        );
      } else if (result.reason === 'already_owned') {
        showToast('이미 보유 중이에요!', 'info');
      }
      return;
    }

    showToast(`${item.name} 구매 완료! 배경이 적용됐어요 🎉`, 'success');
  };

  const isOwned = (item: ShopItemDef) => {
    if (item.type === 'decor') {
      return (state.room?.furniture ?? []).includes(item.id);
    }
    if (item.type === 'wallpaper') {
      return (state.ownedWallpapers ?? []).includes(item.id);
    }
    return false;
  };

  const isActiveWallpaper = (item: ShopItemDef) => {
    return item.type === 'wallpaper' && state.room?.wallpaper === item.id;
  };

  const canAfford = (item: ShopItemDef) => {
    if (item.currency === 'coins') return state.coins >= item.price;
    if (item.currency === 'gems') return state.gems >= item.price;
    return (state.friendCoins ?? 0) >= item.price;
  };

  const getInventoryQty = (itemId: string) => {
    return state.inventory.find(i => i.id === itemId)?.quantity ?? 0;
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'food', label: '먹이', icon: '🍖' },
    { id: 'toy', label: '장난감', icon: '🎾' },
    { id: 'decor', label: '가구', icon: '🏠' },
    { id: 'wallpaper', label: '배경', icon: '🖼️' },
    { id: 'social', label: '소셜', icon: '🤝' },
  ];

  const toastColors: Record<ToastType, string> = {
    success: 'bg-mint text-warm-brown',
    error: 'bg-[oklch(0.70_0.15_30)] text-white',
    info: 'bg-lavender text-warm-brown',
  };

  const getCurrencyIcon = (currency: ShopItemDef['currency']) => {
    if (currency === 'coins') return '🪙';
    if (currency === 'gems') return '💎';
    return '🤝';
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl p-5 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-warm-brown flex items-center gap-2">
            <span>🛒</span> 상점
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-warm-brown">🪙 {state.coins}</span>
            <span className="text-sm font-semibold text-warm-brown">💎 {state.gems}</span>
            {activeTab === 'social' && (
              <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                🤝 {(state.friendCoins ?? 0).toLocaleString()}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? tab.id === 'social'
                    ? 'bg-purple-500 text-white'
                    : tab.id === 'wallpaper'
                      ? 'bg-[oklch(0.75_0.12_280)] text-white'
                      : 'bg-peach text-white'
                  : 'bg-cream text-warm-brown'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 소셜 탭 안내 배너 */}
        {isSocialTab && (
          <div className="mb-3 bg-purple-50 border border-purple-100 rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-lg">🤝</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-purple-600">친구 코인 전용 상점</p>
              <p className="text-xs text-purple-400">
                친구 추가·방문 보상으로 받은 친구 코인으로만 구매할 수 있는 특별 가구입니다.
              </p>
            </div>
            <span className="text-sm font-bold text-purple-600 whitespace-nowrap">
              🤝 {(state.friendCoins ?? 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* 배경 탭 안내 배너 */}
        {isWallpaperTab && (
          <div className="mb-3 bg-[oklch(0.96_0.04_280)]/60 border border-[oklch(0.85_0.08_280)] rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[oklch(0.50_0.15_280)]">방 배경 변경</p>
              <p className="text-xs text-[oklch(0.60_0.10_280)]">
                구매 즉시 방 배경이 바뀌어요. 이미지를 눌러 미리 볼 수 있어요!
              </p>
            </div>
          </div>
        )}

        {/* 배경 탭: 이미지 미리보기 카드 */}
        {isWallpaperTab ? (
          <div className="flex-1 overflow-y-auto space-y-3 pb-2">
            {WALLPAPER_ITEMS.map(item => {
              const owned = isOwned(item);
              const active = isActiveWallpaper(item);
              const affordable = canAfford(item);

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                    active
                      ? 'border-[oklch(0.75_0.12_280)] shadow-lg'
                      : owned
                        ? 'border-mint'
                        : 'border-border'
                  }`}
                >
                  {/* 배경 미리보기 이미지 */}
                  <div
                    className="w-full h-36 bg-cover bg-center cursor-pointer"
                    style={{ backgroundImage: `url(${item.wallpaperUrl})` }}
                    onClick={() => setPreviewWallpaper(previewWallpaper === item.id ? null : item.id)}
                  />

                  {/* 정보 + 구매 버튼 */}
                  <div className="bg-white/95 px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xl">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-warm-brown truncate">{item.name}</p>
                        <p className="text-[10px] text-sub-brown truncate">{item.description}</p>
                      </div>
                    </div>

                    {active ? (
                      <span className="flex-shrink-0 text-[10px] font-bold bg-[oklch(0.75_0.12_280)] text-white px-2.5 py-1 rounded-full">
                        적용 중
                      </span>
                    ) : owned ? (
                      <button
                        onClick={() => handleApplyWallpaper(item)}
                        className="flex-shrink-0 text-[10px] font-bold bg-mint text-warm-brown px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                      >
                        적용하기
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item)}
                        className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 ${
                          affordable
                            ? item.currency === 'gems'
                              ? 'bg-[oklch(0.75_0.12_280)] text-white'
                              : 'bg-peach text-white'
                            : 'bg-muted text-sub-brown opacity-70'
                        }`}
                      >
                        <span>{getCurrencyIcon(item.currency)}</span>
                        <span>{item.price}</span>
                        {!affordable && <span className="text-[9px]">부족</span>}
                      </button>
                    )}
                  </div>

                  {/* 전체 미리보기 오버레이 */}
                  {previewWallpaper === item.id && (
                    <div
                      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
                      onClick={() => setPreviewWallpaper(null)}
                    >
                      <div className="relative w-[80vw] max-w-xs rounded-3xl overflow-hidden shadow-2xl">
                        <img src={item.wallpaperUrl} alt={item.name} className="w-full h-auto" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-4 py-2 text-center">
                          <p className="text-white text-xs font-bold">{item.name}</p>
                          <p className="text-white/70 text-[10px]">탭하여 닫기</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 일반 상품 목록 (food / toy / decor / social) */
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-2">
            {currentItems.map(item => {
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
                        ? item.currency === 'friendCoins'
                          ? 'bg-purple-50 border-purple-200 active:scale-95'
                          : 'bg-cream border-border cushion-btn active:scale-95'
                        : 'bg-cream border-border cushion-btn active:scale-95 opacity-70'
                    }
                  `}
                >
                  {/* 소셜 전용 뱃지 */}
                  {item.currency === 'friendCoins' && !owned && (
                    <span className="absolute top-2 left-2 text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      소셜
                    </span>
                  )}

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
                    <span className="text-xs">{getCurrencyIcon(item.currency)}</span>
                    <span className={`text-xs font-bold ${
                      affordable
                        ? item.currency === 'friendCoins' ? 'text-purple-600' : 'text-peach'
                        : 'text-sub-brown'
                    }`}>
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
        )}

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

  function handleApplyWallpaper(item: ShopItemDef) {
    // 이미 보유한 배경을 다시 적용 (재화 차감 없이 wallpaper만 변경)
    purchase({ ...item, price: 0 });
    showToast(`${item.name} 배경이 적용됐어요!`, 'success');
  }
}
