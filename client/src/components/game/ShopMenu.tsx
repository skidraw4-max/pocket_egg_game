/**
 * ShopMenu - 상점 & 꾸미기 메뉴
 * Cozy Nursery: 아이템 구매 및 방 꾸미기
 */
import { useGame } from '@/contexts/GameContext';
import { useEffect, useRef, useState } from 'react';
import {
  RAINBOW_FRAGMENT_EXCHANGES,
  SPARKLE_FRAGMENT_EXCHANGES,
  RAINBOW_FRAGMENT_ID,
  SPARKLE_FRAGMENT_ID,
  todayStr,
  getInventoryQuantity,
  WEEKEND_SHOP_ITEMS,
  isWeekendShopActive,
  getWeekendShopCountdownMs,
  getWeekendShopPurchaseCount,
  formatCountdown,
  type FragmentExchangeDef,
  type InventoryItem,
  type ShopItemDef,
} from '@/lib/gameState';
import { WALLPAPER_CATALOG, getWallpaperUrl } from '@/lib/roomAssets';
import { getAggregatedRoomPerks, getDecorPerkShopLines } from '@/lib/decorPerks';
import { CONTEXT_GUIDE_IDS } from '@/lib/guideData';
import {
  addGooglePlayBillingCatalogListener,
  getBillingError,
  getDiamondCatalog,
  initGooglePlayBilling,
  isGooglePlayBillingAvailable,
  purchaseDiamondProduct,
  removeGooglePlayBillingListener,
  type BillingStatus,
  type DiamondCatalogProduct,
  type DiamondPurchaseEvent,
} from '@/lib/googlePlayBilling';
import { verifyGooglePlayPurchase } from '@/lib/firebase';

interface ShopMenuProps {
  onClose: () => void;
  onStartRoomEdit?: () => void;
  onOpenGuide?: () => void;
  onOpenGuideArticle?: (articleId: string) => void;
  onRequestContextGuide?: (articleId: string) => void;
}

type TabType = 'weekend' | 'diamond' | 'food' | 'toy' | 'decor' | 'wallpaper' | 'social' | 'inventory' | 'exchange';
type InventorySectionType = Extract<InventoryItem['type'], 'food' | 'toy' | 'special'>;

const INVENTORY_SECTIONS: { id: InventorySectionType; label: string; icon: string; emptyText: string }[] = [
  { id: 'food', label: '음식', icon: '🍖', emptyText: '보유한 음식이 아직 없어요.' },
  { id: 'toy', label: '장난감', icon: '🎾', emptyText: '보유한 장난감이 아직 없어요.' },
  { id: 'special', label: '특별/조각', icon: '✨', emptyText: '특별 아이템이나 조각이 아직 없어요.' },
];

/** 배경 아이템 카탈로그 (URL은 roomAssets 단일 소스) */
const WALLPAPER_ITEMS: ShopItemDef[] = WALLPAPER_CATALOG.map(item => ({
  ...item,
  type: 'wallpaper',
  wallpaperUrl: getWallpaperUrl(item.id),
}));

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
    id: 'food_star_growth_snack',
    name: '별빛 성장 간식',
    type: 'food',
    icon: '🌟',
    price: 10,
    currency: 'gems',
    description: '24시간 활동 EXP 2배',
    inventoryItem: {
      id: 'food_star_growth_snack',
      name: '별빛 성장 간식',
      type: 'food',
      icon: '🌟',
      effect: { hunger: 8, mood: 5 },
      description: '먹으면 24시간 동안 모든 활동에서 경험치를 두 배로 받아요. 성장이 빛나는 특별한 간식이에요!',
    },
  },
  {
    id: 'gem_puzzle_hint_pack',
    name: '별빛 힌트 3회권',
    type: 'food',
    icon: '💡',
    price: 5,
    currency: 'gems',
    description: '별 퍼즐 힌트 3회 충전 (2💎×3 대비 할인)',
    purchaseEffect: { kind: 'puzzle_hint_credits', amount: 3 },
  },
  {
    id: 'food_energy_jelly',
    name: '달콤 에너지 젤리',
    type: 'food',
    icon: '🍮',
    price: 5,
    currency: 'gems',
    description: '배고픔·기분·피로 한 번에 회복',
    inventoryItem: {
      id: 'food_energy_jelly',
      name: '달콤 에너지 젤리',
      type: 'food',
      icon: '🍮',
      effect: { hunger: 20, mood: 15, fatigue: 10 },
      description: '달콤한 젤리로 배고픔·기분을 채우고 피로를 풀어줘요. 코인 음식보다 빠르게 컨디션을 올릴 수 있어요.',
    },
  },
  {
    id: 'food_intimacy_booster',
    name: '하트 친밀 드링크',
    type: 'food',
    icon: '💗',
    price: 8,
    currency: 'gems',
    description: '12시간 친밀도 획득 1.5배',
    inventoryItem: {
      id: 'food_intimacy_booster',
      name: '하트 친밀 드링크',
      type: 'food',
      icon: '💗',
      effect: { hunger: 5, mood: 10 },
      description: '12시간 동안 쓰다듬기·먹이·놀기 등 모든 친밀 상승이 1.5배! 알·아기 때 친밀 올리기에 추천해요.',
    },
  },
  {
    id: 'special_ribbon_ease',
    name: '리본 리듬 완화권',
    type: 'food',
    icon: '🎵',
    price: 6,
    currency: 'gems',
    description: '리본 리듬 1판 노트 속도 완화',
    inventoryItem: {
      id: 'special_ribbon_ease',
      name: '리본 리듬 완화권',
      type: 'special',
      icon: '🎵',
      effect: {},
      description: '다음 리본 리듬 1판에서 노트가 조금 느리게 내려와요. 리본 게임 시작 시 자동 사용돼요.',
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
    id: 'toy_disc',
    name: '원반',
    type: 'toy',
    icon: '🥏',
    price: 120,
    currency: 'coins',
    description: '힘으로 캐치하는 원반',
    inventoryItem: {
      id: 'toy_disc',
      name: '원반',
      type: 'toy',
      icon: '🥏',
      effect: { mood: 22, fatigue: 18 },
      traitBonus: { power: 4 },
      description: '원반 캐치로 힘을 길러요!',
    },
  },
  {
    id: 'toy_ribbon',
    name: '리본 장난감',
    type: 'toy',
    icon: '🎀',
    price: 12,
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
    id: 'toy_leaf',
    name: '잎사귀 장난감',
    type: 'toy',
    icon: '🌿',
    price: 80,
    currency: 'coins',
    description: '활력을 길러주는 잎사귀',
    inventoryItem: {
      id: 'toy_leaf',
      name: '잎사귀 장난감',
      type: 'toy',
      icon: '🌿',
      effect: { mood: 18 },
      traitBonus: { vitality: 4 },
      description: '잎사귀 뒤집기로 활력이 올라가요!',
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
    price: 20,
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
    price: 32,
    currency: 'gems',
    description: '항상 무지개가 맴도는 마법의 창문',
  },
  {
    id: 'decor_cloud_bed',
    name: '구름 침대',
    type: 'decor',
    icon: '☁️',
    price: 40,
    currency: 'gems',
    description: '하늘에 떠 있는 듯 푹신한 침대',
  },
  {
    id: 'decor_forest_mushroom_lamp',
    name: '버섯 램프',
    type: 'decor',
    icon: '🍄',
    price: 150,
    currency: 'coins',
    description: '숲속처럼 따뜻하게 빛나는 버섯 램프',
  },
  {
    id: 'decor_ocean_coral_shelf',
    name: '산호 선반',
    type: 'decor',
    icon: '🪸',
    price: 180,
    currency: 'coins',
    description: '산호와 조개로 꾸민 바닷속 선반',
  },
  {
    id: 'decor_cloud_moon_nightlight',
    name: '달 밤등',
    type: 'decor',
    icon: '🌙',
    price: 22,
    currency: 'gems',
    description: '부드러운 달빛이 방을 비춰요',
  },
  {
    id: 'decor_candy_cake_display',
    name: '케이크 진열장',
    type: 'decor',
    icon: '🍰',
    price: 180,
    currency: 'coins',
    description: '달콤한 케이크가 가득한 진열장',
  },
  {
    id: 'decor_egg_nest',
    name: '알 둥지',
    type: 'decor',
    icon: '🪺',
    price: 120,
    currency: 'coins',
    description: '포근한 알·아기 전용 둥지',
  },
  {
    id: 'decor_ocean_bubble_lamp',
    name: '거품 조명',
    type: 'decor',
    icon: '🫧',
    price: 150,
    currency: 'coins',
    description: '바닷속 거품처럼 둥실둥실 빛나요',
  },
  {
    id: 'decor_candy_lollipop_tree',
    name: '롤리팝 나무',
    type: 'decor',
    icon: '🍭',
    price: 160,
    currency: 'coins',
    description: '알록달록 사탕이 열린 나무',
  },
  {
    id: 'decor_pet_bowl',
    name: '반려몬 밥그릇',
    type: 'decor',
    icon: '🥣',
    price: 100,
    currency: 'coins',
    description: '항상 든든한 밥그릇',
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

export default function ShopMenu({
  onClose,
  onStartRoomEdit,
  onOpenGuide,
  onOpenGuideArticle,
  onRequestContextGuide,
}: ShopMenuProps) {
  const { state, purchase, purchaseFriendCoinItem, exchangeRainbow, exchangeSparkle, applyVerifiedIapPurchase, applyRoomWallpaper, uid, gameId, friendCoins } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    isWeekendShopActive() ? 'weekend' : 'diamond'
  );
  const [weekendCountdown, setWeekendCountdown] = useState(() => getWeekendShopCountdownMs());
  const [toast, setToast] = useState<Toast | null>(null);
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null);
  const [diamondProducts, setDiamondProducts] = useState<DiamondCatalogProduct[]>(() => getDiamondCatalog());
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(
    () => (isGooglePlayBillingAvailable() ? 'initializing' : 'unsupported')
  );
  const [billingMessage, setBillingMessage] = useState<string | null>(() =>
    isGooglePlayBillingAvailable() ? null : '웹에서는 Google Play 결제를 사용할 수 없어요. Android 앱에서 이용해 주세요.'
  );
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [verifyingPurchase, setVerifyingPurchase] = useState<{ productId: string; message: string } | null>(null);
  const applyVerifiedIapPurchaseRef = useRef(applyVerifiedIapPurchase);
  const uidRef = useRef(uid);

  const isWeekendTab = activeTab === 'weekend';
  const isDiamondTab = activeTab === 'diamond';
  const isSocialTab = activeTab === 'social';
  const isWallpaperTab = activeTab === 'wallpaper';
  const isDecorTab = activeTab === 'decor';
  const isInventoryTab = activeTab === 'inventory';
  const isExchangeTab = activeTab === 'exchange';
  const isFoodTab = activeTab === 'food';
  const weekendShopOpen = weekendCountdown.active;
  const activeRoomPerks = getAggregatedRoomPerks(state);
  const [exchangeSection, setExchangeSection] = useState<'rainbow' | 'sparkle'>('rainbow');
  const rainbowFragmentQty = getInventoryQuantity(state, RAINBOW_FRAGMENT_ID);
  const sparkleFragmentQty = getInventoryQuantity(state, SPARKLE_FRAGMENT_ID);
  const inventoryItems = state.inventory.filter(item => item.quantity > 0);
  const inventoryTotalQty = inventoryItems.reduce((total, item) => total + item.quantity, 0);
  const hasInventoryItems = inventoryTotalQty > 0;
  const decorGuideTriggered = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setWeekendCountdown(getWeekendShopCountdownMs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (activeTab !== 'decor' || decorGuideTriggered.current) return;
    if (state.tutorialSeen?.[CONTEXT_GUIDE_IDS.decorPerks]) return;
    decorGuideTriggered.current = true;
    onRequestContextGuide?.(CONTEXT_GUIDE_IDS.decorPerks);
  }, [activeTab, state.tutorialSeen, onRequestContextGuide]);

  const currentItems = isWeekendTab
    ? WEEKEND_SHOP_ITEMS
    : isSocialTab
    ? SOCIAL_ITEMS
    : isWallpaperTab
      ? WALLPAPER_ITEMS
      : isDiamondTab || isExchangeTab || isInventoryTab
        ? []
      : SHOP_ITEMS.filter(item => item.type === activeTab);

  const coinFoodItems = isFoodTab
    ? currentItems.filter(item => item.currency === 'coins')
    : [];
  const gemFoodItems = isFoodTab
    ? currentItems.filter(item => item.currency === 'gems')
    : [];
  const puzzleHintCredits = state.puzzleHintCredits ?? 0;

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    applyVerifiedIapPurchaseRef.current = applyVerifiedIapPurchase;
  }, [applyVerifiedIapPurchase]);

  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  useEffect(() => {
    if (!isGooglePlayBillingAvailable()) {
      setBillingStatus('unsupported');
      setBillingMessage('웹에서는 Google Play 결제를 사용할 수 없어요. Android 앱에서 이용해 주세요.');
      return;
    }

    let mounted = true;
    const updateBillingCatalog = (products: DiamondCatalogProduct[]) => {
      if (!mounted) return;
      setDiamondProducts(products);
      if (products.some(product => product.canPurchase)) {
        setBillingStatus('ready');
        setBillingMessage(null);
      } else {
        const reason = getBillingError() ?? products.find(product => product.unavailableReason)?.unavailableReason;
        setBillingMessage(
          reason
            ? `상품 정보는 연결됐지만 아직 구매 가능 상태가 아니에요. ${reason}`
            : '상품 정보는 연결됐지만 아직 구매 가능한 상품이 없어요.'
        );
      }
    };
    const handleApprovedPurchase = async (event: DiamondPurchaseEvent) => {
      if (!uidRef.current) {
        const message = '로그인 확인 전에는 서버 결제 검증을 진행할 수 없어요. 잠시 후 상점을 다시 열어 주세요.';
        showToast(message, 'error');
        return { success: false as const, message };
      }

      setVerifyingPurchase({ productId: event.productId, message: 'Google Play 구매를 서버에서 검증 중이에요.' });
      try {
        const verified = await verifyGooglePlayPurchase({
          productId: event.productId,
          purchaseToken: event.purchaseToken,
          transactionId: event.transactionId,
          purchaseId: event.purchaseId,
          quantity: event.quantity,
        });

        applyVerifiedIapPurchaseRef.current(verified);
        showToast(
          verified.alreadyGranted
            ? '이미 서버에서 지급 처리된 구매예요.'
            : `다이아 ${verified.amount.toLocaleString()}개가 서버 검증 후 지급됐어요!`,
          verified.alreadyGranted ? 'info' : 'success'
        );
        return { success: true as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : '서버 결제 검증에 실패했어요.';
        console.error('[Billing] Server purchase verification failed:', error);
        showToast('서버 검증에 실패해 다이아를 지급하지 않았어요. 네트워크 확인 후 다시 시도해 주세요.', 'error');
        return { success: false as const, message };
      } finally {
        setVerifyingPurchase(null);
      }
    };

    setBillingStatus('initializing');
    setBillingMessage('Google Play 상품 정보를 불러오는 중이에요.');

    const removeCatalogListener = addGooglePlayBillingCatalogListener(updateBillingCatalog);

    initGooglePlayBilling(handleApprovedPurchase)
      .then(products => {
        if (!mounted) return;
        setDiamondProducts(products);
        setBillingStatus('ready');
        if (products.some(product => product.canPurchase)) {
          setBillingMessage(null);
        } else {
          const reason = getBillingError() ?? products.find(product => product.unavailableReason)?.unavailableReason;
          setBillingMessage(
            reason
              ? `상품 정보는 연결됐지만 아직 구매 가능 상태가 아니에요. ${reason}`
              : '상품 정보는 연결됐지만 아직 구매 가능한 상품이 없어요.'
          );
        }
      })
      .catch(error => {
        if (!mounted) return;
        setDiamondProducts(getDiamondCatalog());
        setBillingStatus('error');
        setBillingMessage(getBillingError() ?? (error instanceof Error ? error.message : 'Play 결제 초기화에 실패했어요.'));
      });

    return () => {
      mounted = false;
      removeCatalogListener();
      removeGooglePlayBillingListener(handleApprovedPurchase);
    };
  }, []);

  const handlePurchase = async (item: ShopItemDef) => {
    const result = item.currency === 'friendCoins'
      ? await purchaseFriendCoinItem(item)
      : purchase(item);

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
      } else if (result.reason === 'event_closed') {
        showToast('주말 특가는 금~일에만 열려요!', 'info');
      } else if (result.reason === 'weekly_limit') {
        showToast('이번 주 구매 한도에 도달했어요!', 'info');
      }
      return;
    }

    showToast(
      item.purchaseEffect?.kind === 'puzzle_hint_credits'
        ? `${item.name} 구매 완료! 힌트 ${item.purchaseEffect.amount}회 충전 💡`
        : item.type === 'wallpaper'
        ? `${item.name} 구매 완료! 배경이 적용됐어요 🎉`
        : item.inventoryItem?.type === 'special'
          ? `${item.name} 구매 완료! 가방 특별 탭에 넣었어요 🎉`
        : item.type === 'food' || item.type === 'toy'
          ? `${item.name} 구매 완료! 가방에 넣었어요 🎉`
          : `${item.name} 구매 완료! 🎉`,
      'success',
    );
  };

  const handleExchange = (exchange: FragmentExchangeDef, kind: 'rainbow' | 'sparkle') => {
    const result = kind === 'rainbow'
      ? exchangeRainbow(exchange.id)
      : exchangeSparkle(exchange.id);

    if (!result.success) {
      if (result.reason === 'insufficient_fragments') {
        const label = kind === 'rainbow' ? '무지개' : '반짝';
        showToast(`${label} 조각이 부족해요! ${exchange.cost}개가 필요해요.`, 'error');
      } else if (result.reason === 'already_owned') {
        showToast('이미 보유 중인 특별 보상이에요!', 'info');
      } else if (result.reason === 'daily_limit') {
        showToast('오늘은 이미 교환했어요. 내일 다시 시도해 주세요!', 'info');
      } else {
        showToast('교환할 수 없는 보상이에요.', 'error');
      }
      return;
    }

    showToast(`${exchange.rewardLabel} 교환 완료!`, 'success');
  };

  const handleDiamondPurchase = async (product: DiamondCatalogProduct) => {
    if (!isGooglePlayBillingAvailable()) {
      showToast('Android 앱에서만 Google Play 결제를 사용할 수 있어요.', 'info');
      return;
    }
    if (billingStatus !== 'ready' || !product.canPurchase) {
      const message =
        billingStatus === 'initializing'
          ? 'Play 상품 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.'
          : billingStatus === 'error'
            ? (billingMessage ?? 'Play 결제 초기화에 실패했어요.')
            : (product.unavailableReason ?? 'Play Console 상품 정보를 아직 확인할 수 없어요.');
      console.warn('[Billing] Purchase button blocked:', {
        productId: product.productId,
        billingStatus,
        canPurchase: product.canPurchase,
        message,
      });
      showToast(message, 'error');
      return;
    }

    setPurchasingProductId(product.productId);
    try {
      const result = await purchaseDiamondProduct(product.productId, uid ?? gameId ?? null);
      setDiamondProducts(getDiamondCatalog());

      if (!result.success) {
        console.warn('[Billing] Purchase request failed:', {
          productId: product.productId,
          reason: result.reason,
          message: result.message,
        });
        showToast(result.message, result.reason === 'cancelled' ? 'info' : 'error');
      } else {
        showToast('Google Play 구매 승인을 기다리고 있어요.', 'info');
      }
    } catch (error) {
      console.error('[Billing] Purchase request threw:', error);
      showToast(error instanceof Error ? error.message : '구매 요청 중 오류가 발생했어요.', 'error');
    } finally {
      setPurchasingProductId(null);
    }
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
    return friendCoins >= item.price;
  };

  const getInventoryQty = (itemId: string) => {
    return state.inventory.find(i => i.id === itemId)?.quantity ?? 0;
  };

  const isWeeklyLimitReached = (item: ShopItemDef) => {
    if (!item.weekendOnly || item.weeklyLimit == null) return false;
    return getWeekendShopPurchaseCount(state, item.id) >= item.weeklyLimit;
  };

  const renderShopItemCard = (item: ShopItemDef) => {
    const owned = isOwned(item);
    const affordable = canAfford(item);
    const qty = item.type !== 'decor' && item.id !== 'gem_weekend_pack' ? getInventoryQty(item.id) : null;
    const boughtCount = item.weekendOnly ? getWeekendShopPurchaseCount(state, item.id) : 0;
    const limitReached = isWeeklyLimitReached(item);
    const lockedByEvent = Boolean(item.weekendOnly && !weekendShopOpen);
    const purchaseDisabled = owned || limitReached || lockedByEvent;
    const perkLines = item.type === 'decor'
      ? getDecorPerkShopLines(item.id, state.room?.wallpaper)
      : [];

    return (
      <button
        key={item.id}
        onClick={() => !purchaseDisabled && handlePurchase(item)}
        disabled={purchaseDisabled}
        className={`
          relative flex flex-col items-center gap-1 p-3 rounded-2xl border
          transition-all duration-150
          ${purchaseDisabled
            ? 'bg-muted/50 border-border opacity-60 cursor-default'
            : affordable
              ? item.currency === 'friendCoins'
                ? 'bg-purple-50 border-purple-200 active:scale-95'
                : item.weekendOnly
                  ? 'bg-amber-50 border-amber-200 active:scale-95'
                : item.currency === 'gems'
                  ? 'bg-violet-50 border-violet-200 active:scale-95'
                  : 'bg-cream border-border cushion-btn active:scale-95'
              : 'bg-cream border-border cushion-btn active:scale-95 opacity-70'
          }
        `}
      >
        {(item.badge || (item.currency === 'friendCoins' && !owned)) && !owned && (
          <span className={`absolute top-2 left-2 text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold ${
            item.weekendOnly ? 'bg-amber-500' : 'bg-purple-500'
          }`}>
            {item.badge || '소셜'}
          </span>
        )}
        {item.currency === 'gems' && !owned && !item.weekendOnly && (
          <span className="absolute top-2 left-2 text-[9px] bg-violet-500 text-white px-1.5 py-0.5 rounded-full font-bold">
            💎
          </span>
        )}
        {owned && (
          <span className="absolute top-2 right-2 text-[10px] bg-mint text-warm-brown px-1.5 py-0.5 rounded-full font-bold">
            보유
          </span>
        )}
        {!owned && limitReached && (
          <span className="absolute top-2 right-2 text-[10px] bg-stone-400 text-white px-1.5 py-0.5 rounded-full font-bold">
            한도
          </span>
        )}
        {!owned && lockedByEvent && (
          <span className="absolute top-2 right-2 text-[10px] bg-stone-500 text-white px-1.5 py-0.5 rounded-full font-bold">
            잠김
          </span>
        )}
        {item.weekendOnly && item.weeklyLimit != null && !owned && (
          <span className="absolute bottom-2 left-2 text-[9px] text-amber-700/80 font-semibold">
            {boughtCount}/{item.weeklyLimit}
          </span>
        )}
        {qty !== null && qty > 0 && (
          <span className="absolute top-2 right-2 text-[10px] bg-peach/80 text-white px-1.5 py-0.5 rounded-full font-bold">
            ×{qty}
          </span>
        )}
        <span className="text-3xl">{item.icon}</span>
        <span className="text-xs font-semibold text-warm-brown text-center">{item.name}</span>
        <span className="text-[10px] text-sub-brown text-center">{item.description}</span>
        {perkLines.length > 0 && (
          <div className="w-full mt-0.5 space-y-0.5">
            {perkLines.map(line => (
              <p key={line} className="text-[9px] text-purple-600 text-center leading-tight font-medium">
                {line}
              </p>
            ))}
          </div>
        )}
        <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full ${
          affordable ? 'bg-white/60' : 'bg-white/30'
        }`}>
          <span className="text-xs">{getCurrencyIcon(item.currency)}</span>
          <span className={`text-xs font-bold ${
            affordable
              ? item.currency === 'friendCoins'
                ? 'text-purple-600'
                : item.currency === 'gems'
                  ? 'text-violet-600'
                  : 'text-peach'
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
  };

  const getInventorySectionItems = (type: InventorySectionType) => {
    return inventoryItems.filter(item => item.type === type);
  };

  const isExchangeOwned = (exchange: FragmentExchangeDef) => {
    if (exchange.reward.type === 'decor') {
      return (state.room?.furniture ?? []).includes(exchange.reward.decorId);
    }
    if (exchange.reward.type === 'gachaEgg') {
      return state.gachaEgg === exchange.reward.eggId;
    }
    return false;
  };

  const isSparkleExchangeBlocked = (exchange: FragmentExchangeDef) => {
    if (exchange.dailyLimit) {
      return state.fragmentExchangeDaily?.[exchange.id] === todayStr();
    }
    return false;
  };

  const renderExchangeCard = (
    exchange: FragmentExchangeDef,
    fragmentQty: number,
    fragmentIcon: string,
    kind: 'rainbow' | 'sparkle'
  ) => {
    const owned = isExchangeOwned(exchange);
    const dailyUsed = isSparkleExchangeBlocked(exchange);
    const affordable = fragmentQty >= exchange.cost;
    const canExchange = affordable && !owned && !dailyUsed;

    return (
      <div
        key={exchange.id}
        className={`rounded-2xl border p-3 transition-all ${
          owned || dailyUsed
            ? 'bg-muted/50 border-mint'
            : affordable
              ? 'bg-white border-pink-100 shadow-sm'
              : 'bg-cream border-border opacity-80'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
            {exchange.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-warm-brown truncate">{exchange.name}</p>
              {owned && (
                <span className="text-[10px] font-bold bg-mint text-warm-brown px-2 py-0.5 rounded-full whitespace-nowrap">
                  보유
                </span>
              )}
              {dailyUsed && !owned && (
                <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                  오늘 완료
                </span>
              )}
            </div>
            <p className="text-[11px] text-sub-brown mt-0.5">{exchange.description}</p>
            <p className="text-[10px] text-pink-500 font-semibold mt-1">{exchange.rewardLabel}</p>
          </div>
        </div>

        <button
          onClick={() => handleExchange(exchange, kind)}
          disabled={!canExchange}
          className={`mt-3 w-full py-2 rounded-2xl text-xs font-bold transition-all ${
            canExchange
              ? 'bg-gradient-to-r from-pink-400 to-amber-300 text-white active:scale-95'
              : 'bg-muted text-sub-brown'
          }`}
        >
          {owned
            ? '✓ 이미 보유 중'
            : dailyUsed
              ? '오늘 교환 완료'
              : canExchange
                ? `${fragmentIcon} ${exchange.cost}개로 교환`
                : `${fragmentIcon} ${exchange.cost}개 필요 · ${exchange.cost - fragmentQty}개 부족`}
        </button>
      </div>
    );
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'weekend', label: '주말특가', icon: '🎁' },
    { id: 'diamond', label: '다이아', icon: '💎' },
    { id: 'food', label: '먹이', icon: '🍖' },
    { id: 'toy', label: '장난감', icon: '🎾' },
    { id: 'decor', label: '가구', icon: '🏠' },
    { id: 'wallpaper', label: '배경', icon: '🖼️' },
    { id: 'social', label: '소셜', icon: '🤝' },
    { id: 'inventory', label: '가방', icon: '🎒' },
    { id: 'exchange', label: '교환소', icon: '🌈' },
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
        className="w-full bg-white/95 backdrop-blur-lg rounded-t-3xl pt-5 px-5 pb-app-safe shadow-2xl animate-slide-up max-h-[min(80dvh,100%)] flex flex-col min-h-0"
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
            {activeTab === 'inventory' && (
              <span className="text-sm font-semibold text-warm-brown bg-cream px-2 py-0.5 rounded-full">
                🎒 {inventoryTotalQty}
              </span>
            )}
            {activeTab === 'exchange' && (
              <>
                <span className="text-sm font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                  🌈 {rainbowFragmentQty}
                </span>
                <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  ✨ {sparkleFragmentQty}
                </span>
              </>
            )}
            {activeTab === 'social' && (
              <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                🤝 {friendCoins.toLocaleString()}
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
                  ? tab.id === 'weekend'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                  : tab.id === 'diamond'
                    ? 'bg-gradient-to-r from-sky-400 to-violet-400 text-white'
                    : tab.id === 'social'
                    ? 'bg-purple-500 text-white'
                    : tab.id === 'inventory'
                      ? 'bg-mint text-warm-brown'
                    : tab.id === 'exchange'
                      ? 'bg-gradient-to-r from-pink-400 to-amber-300 text-white'
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

        {/* 주말 특가 안내 배너 */}
        {isWeekendTab && (
          <div
            className="mb-3 rounded-2xl px-3 py-2.5 flex items-center gap-2 border"
            style={{
              background: weekendShopOpen
                ? 'linear-gradient(135deg, #fff7ed, #ffedd5)'
                : '#f5f5f4',
              borderColor: weekendShopOpen ? '#fdba74' : '#e7e5e4',
            }}
          >
            <span className="text-lg">{weekendShopOpen ? '🎉' : '🔒'}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-700">
                {weekendShopOpen ? '주말 특가 진행 중! (금~일)' : '주말 특가 잠금 중'}
              </p>
              <p className="text-xs text-amber-600/80">
                {weekendCountdown.label}{' '}
                <span className="font-bold">{formatCountdown(weekendCountdown.remainingMs)}</span>
              </p>
            </div>
          </div>
        )}

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
              🤝 {friendCoins.toLocaleString()}
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

        {/* 가방 탭 안내 배너 */}
        {isInventoryTab && (
          <div className="mb-3 bg-cream border border-border rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-lg">🎒</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-warm-brown">내 가방</p>
              <p className="text-xs text-sub-brown">
                음식, 장난감, 특별 조각을 한곳에서 확인해요.
              </p>
            </div>
            <span className="text-sm font-bold text-warm-brown whitespace-nowrap">
              총 {inventoryTotalQty}개
            </span>
          </div>
        )}

        {/* 조각 교환소 안내 배너 */}
        {isExchangeTab && (
          <>
            <div className="mb-2 flex gap-2">
              <button
                onClick={() => setExchangeSection('rainbow')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  exchangeSection === 'rainbow'
                    ? 'bg-gradient-to-r from-pink-400 to-amber-300 text-white'
                    : 'bg-cream text-warm-brown'
                }`}
              >
                🌈 무지개 조각 ({rainbowFragmentQty})
              </button>
              <button
                onClick={() => setExchangeSection('sparkle')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  exchangeSection === 'sparkle'
                    ? 'bg-gradient-to-r from-amber-300 to-yellow-300 text-warm-brown'
                    : 'bg-cream text-warm-brown'
                }`}
              >
                ✨ 반짝 조각 ({sparkleFragmentQty})
              </button>
            </div>
            <div className="mb-3 bg-gradient-to-r from-pink-50 via-amber-50 to-sky-50 border border-pink-100 rounded-2xl px-3 py-2.5 flex items-center gap-2">
              <span className="text-lg">{exchangeSection === 'rainbow' ? '🌈' : '✨'}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-pink-600">
                  {exchangeSection === 'rainbow' ? '무지개 조각 교환소' : '반짝 조각 교환소'}
                </p>
                <p className="text-xs text-sub-brown">
                  {exchangeSection === 'rainbow'
                    ? '무지개공놀이 퍼펙트 보상 조각을 모아 특별 아이템으로 바꿔요.'
                    : '별퍼즐·공놀이 우수 등급 보상 조각으로 간식·부스터를 교환해요.'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* 가방 탭: 보유 아이템 목록 */}
        {isDiamondTab ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
            <div className="grid grid-cols-2 gap-3">
              {diamondProducts.map(product => {
                const isPurchasing = purchasingProductId === product.productId;
                const isVerifying = verifyingPurchase?.productId === product.productId;
                const disabled =
                  billingStatus !== 'ready' ||
                  !product.canPurchase ||
                  Boolean(purchasingProductId && !isPurchasing) ||
                  Boolean(verifyingPurchase && !isVerifying);
                const buttonLabel = isVerifying
                  ? '서버 검증 중...'
                  : isPurchasing
                  ? '구매 진행 중...'
                  : billingStatus === 'unsupported'
                    ? `${product.price} · Android 앱 전용`
                    : billingStatus === 'initializing'
                      ? `${product.price} · 상품 조회 중`
                      : billingStatus === 'error'
                        ? `${product.price} · 초기화 실패`
                        : product.canPurchase
                          ? `${product.price} · 구매하기`
                          : `${product.price} · 구매 불가`;

                return (
                  <div
                    key={product.productId}
                    className="relative flex flex-col gap-2 rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-3 shadow-sm"
                  >
                    <span className="absolute top-2 right-2 text-[9px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {product.badge}
                    </span>

                    <div className="flex items-center gap-2 pr-10">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm">
                        💎
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-warm-brown truncate">{product.name}</p>
                        <p className="text-[10px] font-semibold text-sky-600">
                          {product.amount.toLocaleString()} 다이아(젬)
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-sub-brown min-h-[2.5rem]">{product.description}</p>

                    <button
                      type="button"
                      onClick={() => handleDiamondPurchase(product)}
                      disabled={disabled}
                      className={`w-full rounded-2xl px-3 py-2 text-xs font-bold transition-all ${
                        disabled
                          ? 'bg-muted text-sub-brown cursor-not-allowed'
                          : 'bg-gradient-to-r from-sky-400 to-violet-400 text-white active:scale-95'
                      }`}
                      aria-label={`${product.name} ${product.price} Google Play 결제`}
                    >
                      {buttonLabel}
                    </button>

                    {!product.canPurchase && (
                      <p className="text-[10px] text-sky-500 leading-snug">
                        {billingStatus === 'error'
                          ? (billingMessage ?? 'Play 결제 초기화에 실패했어요.')
                          : product.unavailableReason ?? '상품 조회 후 구매 가능 상태가 되면 버튼이 활성화돼요.'}
                      </p>
                    )}

                    {isVerifying && (
                      <p className="text-[10px] text-violet-500 leading-snug">
                        {verifyingPurchase.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : isInventoryTab ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
            {!hasInventoryItems ? (
              <div className="h-full min-h-44 rounded-3xl border border-dashed border-border bg-cream/70 flex flex-col items-center justify-center text-center px-6 py-8">
                <div className="text-4xl mb-2">🎒</div>
                <p className="text-sm font-bold text-warm-brown">가방이 비어 있어요</p>
                <p className="text-xs text-sub-brown mt-1">
                  상점에서 아이템을 사거나 미니게임 보상을 얻으면 여기에 표시돼요.
                </p>
              </div>
            ) : (
              INVENTORY_SECTIONS.map(section => {
                const sectionItems = getInventorySectionItems(section.id);

                return (
                  <section key={section.id} className="rounded-2xl border border-border bg-white/80 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{section.icon}</span>
                        <h3 className="text-sm font-bold text-warm-brown">{section.label}</h3>
                      </div>
                      <span className="text-[10px] font-semibold text-sub-brown bg-cream px-2 py-0.5 rounded-full">
                        {sectionItems.reduce((total, item) => total + item.quantity, 0)}개
                      </span>
                    </div>

                    {sectionItems.length === 0 ? (
                      <p className="text-xs text-sub-brown bg-cream/70 rounded-2xl px-3 py-3 text-center">
                        {section.emptyText}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sectionItems.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-2xl bg-cream/60 px-3 py-2"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-2xl flex-shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-warm-brown truncate">{item.name}</p>
                                <span className="text-[10px] font-bold bg-peach/80 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  ×{item.quantity}
                                </span>
                              </div>
                              <p className="text-[11px] text-sub-brown line-clamp-2">{item.description}</p>
                            </div>
                            {(item.id === RAINBOW_FRAGMENT_ID || item.id === SPARKLE_FRAGMENT_ID) && (
                              <button
                                onClick={() => {
                                  setActiveTab('exchange');
                                  setExchangeSection(item.id === SPARKLE_FRAGMENT_ID ? 'sparkle' : 'rainbow');
                                }}
                                className="flex-shrink-0 text-[10px] font-bold bg-gradient-to-r from-pink-400 to-amber-300 text-white px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
                              >
                                교환소
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        ) : isExchangeTab ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
            {(exchangeSection === 'rainbow' ? RAINBOW_FRAGMENT_EXCHANGES : SPARKLE_FRAGMENT_EXCHANGES).map(exchange =>
              renderExchangeCard(
                exchange,
                exchangeSection === 'rainbow' ? rainbowFragmentQty : sparkleFragmentQty,
                exchangeSection === 'rainbow' ? '🌈' : '✨',
                exchangeSection
              )
            )}
          </div>
        ) : isWallpaperTab ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
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
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2 min-h-0">
            {isDecorTab && (
              <div className="flex gap-2 shrink-0">
                {onOpenGuide && (
                  <button
                    type="button"
                    onClick={onOpenGuide}
                    className="flex-1 py-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold active:scale-[0.98] transition-transform"
                  >
                    📖 가이드북
                  </button>
                )}
                {onOpenGuideArticle && (
                  <button
                    type="button"
                    onClick={() => onOpenGuideArticle('guide_room_decor')}
                    className="flex-1 py-2.5 rounded-2xl bg-cream border border-border text-warm-brown text-xs font-bold active:scale-[0.98] transition-transform"
                  >
                    🏠 방 꾸미기 안내
                  </button>
                )}
              </div>
            )}
            {isDecorTab && activeRoomPerks.activeCount > 0 && (
              <div className="rounded-2xl bg-purple-50 border border-purple-200 px-3 py-2 shrink-0">
                <p className="text-[10px] font-bold text-purple-700">
                  🏠 활성 방 혜택 ({activeRoomPerks.activeCount})
                </p>
                <p className="text-[10px] text-purple-600 mt-0.5 leading-snug">
                  {activeRoomPerks.activeLabels.slice(0, 3).join(' · ')}
                  {activeRoomPerks.activeLabels.length > 3 ? ' …' : ''}
                </p>
              </div>
            )}
            {isDecorTab && (state.room?.furniture?.length ?? 0) > 0 && onStartRoomEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartRoomEdit();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 text-white text-sm font-bold active:scale-[0.98] transition-transform shrink-0"
              >
                ✏️ 방 배치 편집 (드래그 · 크기 · 반전)
              </button>
            )}
            {isFoodTab && puzzleHintCredits > 0 && (
              <div className="rounded-2xl bg-violet-50 border border-violet-200 px-3 py-2 shrink-0">
                <p className="text-[10px] font-bold text-violet-700">
                  💡 힌트권 보유 {puzzleHintCredits}회
                </p>
                <p className="text-[10px] text-violet-600 mt-0.5">
                  별 퍼즐에서 젬 2💎 대신 먼저 사용돼요.
                </p>
              </div>
            )}
          {isFoodTab ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {coinFoodItems.map(renderShopItemCard)}
              </div>
              {gemFoodItems.length > 0 && (
                <>
                  <p className="text-xs font-bold text-violet-700 shrink-0">💎 젬 아이템</p>
                  <div className="grid grid-cols-2 gap-3">
                    {gemFoodItems.map(renderShopItemCard)}
                  </div>
                </>
              )}
            </>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {currentItems.map(renderShopItemCard)}
          </div>
          )}
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
    applyRoomWallpaper(item.id);
    showToast(`${item.name} 배경이 적용됐어요!`, 'success');
  }
}
