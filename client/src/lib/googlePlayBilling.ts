import { Capacitor } from '@capacitor/core';
import {
  ErrorCode,
  LogLevel,
  Platform,
  ProductType,
  store,
} from 'capacitor-plugin-cdv-purchase';
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
    name: '다이아 90개',
    amount: 90,
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
  unavailableReason?: string;
}

export interface DiamondPurchaseEvent {
  productId: DiamondProductId;
  amount: number;
  purchaseKey: string;
  purchaseToken: string;
  transactionId?: string;
  purchaseId?: string;
  quantity: number;
}

export type BillingStatus = 'unsupported' | 'initializing' | 'ready' | 'error';
export type DiamondPurchaseDeliveryResult = { success: true } | { success: false; message?: string };

const PRODUCT_BY_ID = new Map(DIAMOND_PRODUCTS.map(product => [product.productId, product]));
const purchaseListeners = new Set<(event: DiamondPurchaseEvent) => DiamondPurchaseDeliveryResult | Promise<DiamondPurchaseDeliveryResult>>();
const catalogListeners = new Set<(products: DiamondCatalogProduct[]) => void>();

let initPromise: Promise<void> | null = null;
let latestProducts: Product[] = [];
let handlersRegistered = false;
let productsRegistered = false;
let latestError: string | null = null;

export function isGooglePlayBillingAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function getDiamondCatalog(): DiamondCatalogProduct[] {
  return DIAMOND_PRODUCTS.map(product => {
    const storeProduct = latestProducts.find(item => item.id === product.productId);
    const offer = storeProduct?.getOffer();
    const price = offer?.pricingPhases?.[0]?.price ?? product.fallbackPrice;
    const canPurchase = Boolean(storeProduct && offer && hasOrderableOffer(offer));

    return {
      productId: product.productId,
      name: product.name,
      amount: product.amount,
      price,
      description: product.description,
      badge: product.badge,
      canPurchase,
      unavailableReason: canPurchase ? undefined : getUnavailableReason(storeProduct, Boolean(offer), Boolean(offer && hasOrderableOffer(offer))),
    };
  });
}

export function getBillingError(): string | null {
  return latestError;
}

export function removeGooglePlayBillingListener(
  onPurchase: (event: DiamondPurchaseEvent) => DiamondPurchaseDeliveryResult | Promise<DiamondPurchaseDeliveryResult>
): void {
  purchaseListeners.delete(onPurchase);
}

export function addGooglePlayBillingCatalogListener(
  onCatalogUpdate: (products: DiamondCatalogProduct[]) => void
): () => void {
  catalogListeners.add(onCatalogUpdate);
  return () => catalogListeners.delete(onCatalogUpdate);
}

export async function initGooglePlayBilling(
  onPurchase: (event: DiamondPurchaseEvent) => DiamondPurchaseDeliveryResult | Promise<DiamondPurchaseDeliveryResult>
): Promise<DiamondCatalogProduct[]> {
  if (!isGooglePlayBillingAvailable()) {
    latestError = 'Google Play 결제는 Android 네이티브 앱에서만 사용할 수 있어요.';
    return getDiamondCatalog();
  }

  purchaseListeners.add(onPurchase);

  await ensureStoreInitialized();
  await updateStoreProducts();
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

  const product = store.get(productId, Platform.GOOGLE_PLAY);
  const offer = product?.getOffer();

  if (!product || !offer) {
    console.warn('[Billing] Purchase unavailable. Product or offer missing:', productId, {
      productFound: Boolean(product),
      latestError,
    });
    return {
      success: false,
      reason: 'unavailable',
      message: 'Play Console 상품을 불러오지 못했어요. 상품 등록/활성화 상태를 확인해 주세요.',
    };
  }

  if (!hasOrderableOffer(offer)) {
    console.warn('[Billing] Purchase unavailable. Offer order method missing:', productId, {
      productCanPurchase: product?.canPurchase,
      offerCanPurchase: offer.canPurchase,
      hasOrderMethod: typeof offer.order === 'function',
    });
    return {
      success: false,
      reason: 'unavailable',
      message: '현재 이 상품은 구매 요청을 시작할 수 없어요. 앱/Play 결제 라이브러리 상태를 확인해 주세요.',
    };
  }

  if (offer.canPurchase === false || product.canPurchase === false) {
    console.info('[Billing] Ordering product despite canPurchase flag:', productId, {
      productCanPurchase: product.canPurchase,
      offerCanPurchase: offer.canPurchase,
    });
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
  store.verbosity = LogLevel.INFO;
  if (!productsRegistered) {
    productsRegistered = true;
    store.register(
      DIAMOND_PRODUCTS.map(product => ({
        id: product.productId,
        type: ProductType.CONSUMABLE,
        platform: Platform.GOOGLE_PLAY,
      }))
    );
  }

  if (!handlersRegistered) {
    handlersRegistered = true;
    store.when()
      .productUpdated(product => {
        refreshLatestProducts(store.products);
        if (PRODUCT_BY_ID.has(product.id as DiamondProductId)) {
          console.info('[Billing] Product updated:', product.id, {
            canPurchase: product.canPurchase,
            offerCount: product.offers.length,
          });
        }
        notifyCatalogListeners();
      })
      .approved(async transaction => {
        console.info('[Billing] Purchase approved:', transaction.transactionId, transaction.products);
        try {
          await handleApprovedTransaction(transaction);
          refreshLatestProducts(store.products);
          notifyCatalogListeners();
        } catch (error) {
          latestError = error instanceof Error ? error.message : '승인된 구매 처리 중 오류가 발생했어요.';
          console.error('[Billing] Approved transaction handling failed:', error);
          notifyCatalogListeners();
        }
      })
      .pending(transaction => {
        console.info('[Billing] Purchase pending:', transaction.transactionId);
      })
      .receiptUpdated(() => {
        refreshLatestProducts(store.products);
        notifyCatalogListeners();
      });

    store.ready(() => {
      refreshLatestProducts(store.products);
      console.info('[Billing] Store ready. Products:', latestProducts.map(product => ({
        id: product.id,
        canPurchase: product.canPurchase,
        offerCount: product.offers.length,
      })));
      notifyCatalogListeners();
    });
  }

  const errors = await store.initialize([Platform.GOOGLE_PLAY]);
  refreshLatestProducts(store.products);

  if (errors.length > 0) {
    latestError = errors.map(error => error.message).join('\n');
    console.error('[Billing] Store initialization failed:', latestError);
    notifyCatalogListeners();
    throw new Error(latestError);
  }

  latestError = null;
  notifyCatalogListeners();

  await updateStoreProducts();
}

async function handleApprovedTransaction(transaction: Transaction): Promise<void> {
  const purchaseProduct = transaction.products.find(product => PRODUCT_BY_ID.has(product.id as DiamondProductId));
  if (!purchaseProduct) return;

  if (purchaseListeners.size === 0) {
    latestError = '결제는 승인됐지만 다이아 지급 화면이 준비되지 않아 거래를 완료하지 않았어요. 상점을 다시 열어 주세요.';
    console.warn('[Billing] Approved purchase has no delivery listener. Transaction left unfinished:', transaction.transactionId);
    notifyCatalogListeners();
    return;
  }

  const productId = purchaseProduct.id as DiamondProductId;
  const product = PRODUCT_BY_ID.get(productId);
  if (!product) return;

  const purchaseKey = transaction.transactionId || transaction.purchaseId || `${productId}:${transaction.purchaseDate?.getTime() ?? Date.now()}`;
  const purchaseToken = getGooglePlayPurchaseToken(transaction);
  if (!purchaseToken) {
    latestError = 'Google Play purchase token을 찾지 못해 서버 검증을 진행하지 않았어요.';
    console.warn('[Billing] Approved purchase has no purchase token. Transaction left unfinished:', transaction.transactionId);
    notifyCatalogListeners();
    return;
  }

  const quantity = Math.max(1, transaction.quantity ?? 1);

  for (const listener of Array.from(purchaseListeners)) {
    const result = await listener({
      productId,
      amount: product.amount * quantity,
      purchaseKey,
      purchaseToken,
      transactionId: transaction.transactionId,
      purchaseId: transaction.purchaseId,
      quantity,
    });
    if (!result.success) {
      latestError = result.message ?? '서버 검증이 완료되지 않아 거래를 완료하지 않았어요.';
      console.warn('[Billing] Purchase delivery listener failed. Transaction left unfinished:', {
        purchaseKey,
        productId,
        message: latestError,
      });
      notifyCatalogListeners();
      return;
    }
  }

  await transaction.finish();
  console.info('[Billing] Transaction finished:', purchaseKey);
}

function getGooglePlayPurchaseToken(transaction: Transaction): string | null {
  const googleTransaction = transaction as Transaction & {
    nativePurchase?: { purchaseToken?: string | null };
    parentReceipt?: { purchaseToken?: string | null };
  };

  return (
    googleTransaction.nativePurchase?.purchaseToken ??
    googleTransaction.parentReceipt?.purchaseToken ??
    transaction.purchaseId ??
    null
  );
}

function refreshLatestProducts(products: Product[]): void {
  latestProducts = products.filter(product => PRODUCT_BY_ID.has(product.id as DiamondProductId));
}

function notifyCatalogListeners(): void {
  const catalog = getDiamondCatalog();
  for (const listener of Array.from(catalogListeners)) {
    listener(catalog);
  }
}

async function updateStoreProducts(): Promise<void> {
  try {
    await store.update();
    latestError = null;
    refreshLatestProducts(store.products);
    notifyCatalogListeners();
  } catch (error) {
    latestError = error instanceof Error ? error.message : 'Google Play 상품 정보를 새로고침하지 못했어요.';
    console.warn('[Billing] Store update failed:', error);
    refreshLatestProducts(store.products);
    notifyCatalogListeners();
  }
}

function hasOrderableOffer(offer: NonNullable<ReturnType<Product['getOffer']>>): boolean {
  return typeof offer.order === 'function';
}

function getUnavailableReason(storeProduct: Product | undefined, hasOffer: boolean, hasOrderMethod: boolean): string {
  if (!isGooglePlayBillingAvailable()) {
    return 'Android 네이티브 앱에서만 구매할 수 있어요.';
  }
  if (!storeProduct) {
    return 'Play Console에서 상품을 조회하지 못했어요.';
  }
  if (!hasOffer) {
    return '구매 가능한 Play offer를 찾지 못했어요.';
  }
  if (!hasOrderMethod) {
    return '구매 요청 메서드를 찾지 못했어요.';
  }
  return '보류/미완료 결제 또는 상품 상태 때문에 현재 구매할 수 없어요.';
}
