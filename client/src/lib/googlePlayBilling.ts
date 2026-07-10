import { Capacitor } from '@capacitor/core';
import type { Product, Transaction } from 'capacitor-plugin-cdv-purchase';

export const DIAMOND_PRODUCTS = [
  {
    productId: 'diamond_30',
    name: '다이아 30개',
    amount: 30,
    fallbackPrice: '₩1,100',
    description: '처음 충전해 보기 좋은 소량 패키지',
    badge: '입문',
  },
  {
    productId: 'diamond_80',
    name: '다이아 80개',
    amount: 80,
    fallbackPrice: '₩3,300',
    description: '인기 아이템을 여유 있게 살 수 있어요',
    badge: '추천',
  },
  {
    productId: 'diamond_180',
    name: '다이아 180개',
    amount: 180,
    fallbackPrice: '₩6,600',
    description: '배경과 가구를 함께 꾸미기 좋은 구성',
    badge: '인기',
  },
  {
    productId: 'diamond_400',
    name: '다이아 400개',
    amount: 400,
    fallbackPrice: '₩12,000',
    description: '첫 출시 기준 가장 넉넉한 다이아 구성',
    badge: '최대',
  },
] as const;

export type DiamondProductId = (typeof DIAMOND_PRODUCTS)[number]['productId'];

export interface DiamondCatalogProduct {
  productId: DiamondProductId;
  name: string;
  amount: number;
  price: string;
  description: string;
  badge: string;
  canPurchase: boolean;
}

export interface DiamondPurchaseEvent {
  productId: DiamondProductId;
  amount: number;
  purchaseKey: string;
  quantity: number;
}

export type BillingStatus = 'unsupported' | 'initializing' | 'ready' | 'error';

const PRODUCT_BY_ID = new Map(DIAMOND_PRODUCTS.map(product => [product.productId, product]));
const purchaseListeners = new Set<(event: DiamondPurchaseEvent) => void | Promise<void>>();

let initPromise: Promise<void> | null = null;
let latestProducts: Product[] = [];
let handlersRegistered = false;
let latestError: string | null = null;

export function isGooglePlayBillingAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function getDiamondCatalog(): DiamondCatalogProduct[] {
  return DIAMOND_PRODUCTS.map(product => {
    const storeProduct = latestProducts.find(item => item.id === product.productId);
    const offer = storeProduct?.getOffer();
    const price = offer?.pricingPhases?.[0]?.price ?? product.fallbackPrice;

    return {
      productId: product.productId,
      name: product.name,
      amount: product.amount,
      price,
      description: product.description,
      badge: product.badge,
      canPurchase: Boolean(offer?.canPurchase ?? storeProduct?.canPurchase),
    };
  });
}

export function getBillingError(): string | null {
  return latestError;
}

export function removeGooglePlayBillingListener(
  onPurchase: (event: DiamondPurchaseEvent) => void | Promise<void>
): void {
  purchaseListeners.delete(onPurchase);
}

export async function initGooglePlayBilling(
  onPurchase: (event: DiamondPurchaseEvent) => void | Promise<void>
): Promise<DiamondCatalogProduct[]> {
  if (!isGooglePlayBillingAvailable()) {
    latestError = 'Google Play 결제는 Android 네이티브 앱에서만 사용할 수 있어요.';
    return getDiamondCatalog();
  }

  purchaseListeners.add(onPurchase);

  await ensureStoreInitialized();
  return getDiamondCatalog();
}

export async function purchaseDiamondProduct(
  productId: DiamondProductId,
  applicationUsername?: string | null
): Promise<{ success: true } | { success: false; reason: 'unavailable' | 'cancelled' | 'error'; message: string }> {
  if (!isGooglePlayBillingAvailable()) {
    return { success: false, reason: 'unavailable', message: 'Android 앱에서만 Play 결제를 사용할 수 있어요.' };
  }

  await ensureStoreInitialized();

  const { store, Platform, ErrorCode } = await import('capacitor-plugin-cdv-purchase');
  const product = store.get(productId, Platform.GOOGLE_PLAY);
  const offer = product?.getOffer();

  if (!offer) {
    return {
      success: false,
      reason: 'unavailable',
      message: 'Play Console 상품을 불러오지 못했어요. 상품 등록/활성화 상태를 확인해 주세요.',
    };
  }

  const error = await offer.order(applicationUsername ? { applicationUsername } : undefined);
  if (!error) return { success: true };

  if (error.code === ErrorCode.PAYMENT_CANCELLED) {
    return { success: false, reason: 'cancelled', message: '구매가 취소됐어요.' };
  }

  return { success: false, reason: 'error', message: error.message || '구매 요청 중 오류가 발생했어요.' };
}

async function ensureStoreInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = setupStore().catch(error => {
      initPromise = null;
      throw error;
    });
  }
  await initPromise;
}

async function setupStore(): Promise<void> {
  const { store, ProductType, Platform, LogLevel } = await import('capacitor-plugin-cdv-purchase');

  store.verbosity = LogLevel.WARNING;
  store.register(
    DIAMOND_PRODUCTS.map(product => ({
      id: product.productId,
      type: ProductType.CONSUMABLE,
      platform: Platform.GOOGLE_PLAY,
    }))
  );

  if (!handlersRegistered) {
    handlersRegistered = true;
    store.when()
      .productUpdated(() => {
        latestProducts = store.products.filter(product => PRODUCT_BY_ID.has(product.id as DiamondProductId));
      })
      .approved(async transaction => {
        await handleApprovedTransaction(transaction);
      })
      .pending(transaction => {
        console.info('[Billing] Purchase pending:', transaction.transactionId);
      });
  }

  const errors = await store.initialize([Platform.GOOGLE_PLAY]);
  latestProducts = store.products.filter(product => PRODUCT_BY_ID.has(product.id as DiamondProductId));

  if (errors.length > 0) {
    latestError = errors.map(error => error.message).join('\n');
    throw new Error(latestError);
  }

  latestError = null;
}

async function handleApprovedTransaction(transaction: Transaction): Promise<void> {
  const purchaseProduct = transaction.products.find(product => PRODUCT_BY_ID.has(product.id as DiamondProductId));
  if (!purchaseProduct) return;

  const productId = purchaseProduct.id as DiamondProductId;
  const product = PRODUCT_BY_ID.get(productId);
  if (!product) return;

  const purchaseKey = transaction.transactionId || transaction.purchaseId || `${productId}:${transaction.purchaseDate?.getTime() ?? Date.now()}`;
  const quantity = Math.max(1, transaction.quantity ?? 1);

  for (const listener of Array.from(purchaseListeners)) {
    await listener({
      productId,
      amount: product.amount * quantity,
      purchaseKey,
      quantity,
    });
  }

  await transaction.finish();
}
