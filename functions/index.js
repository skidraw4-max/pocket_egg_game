const crypto = require('crypto');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onValueWritten } = require('firebase-functions/v2/database');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();

const TOP_LEADERBOARD_SIZE = 20;
const LEADERBOARD_AGGREGATE_DEBOUNCE_MS = 5000;
let leaderboardAggregateTimer = null;
let leaderboardAggregateInFlight = null;
let leaderboardAggregatePending = false;

const PACKAGE_NAME = 'com.pocketegg.game';
const PRODUCT_GEMS = {
  diamond_30: 30,
  diamond_80: 90,
  diamond_180: 180,
  diamond_400: 400,
};
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

let androidPublisherPromise;

exports.verifyPurchaseAndGrantGems = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const uid = request.auth.uid;
  const { productId, purchaseToken, transactionId, purchaseId } = normalizeRequest(request.data);
  const baseAmount = PRODUCT_GEMS[productId];
  if (!baseAmount) {
    throw new HttpsError('invalid-argument', '지원하지 않는 Google Play 상품입니다.');
  }

  const receiptKey = hashPurchaseToken(purchaseToken);
  const db = admin.database();
  const receiptRef = db.ref(`iapReceipts/${receiptKey}`);
  const existingReceiptSnap = await receiptRef.get();
  if (existingReceiptSnap.exists()) {
    return buildAlreadyGrantedResponse(db, uid, receiptKey, existingReceiptSnap.val());
  }

  const purchase = await verifyWithGooglePlay(productId, purchaseToken);
  const quantity = getVerifiedQuantity(purchase, request.data.quantity);
  const amount = baseAmount * quantity;
  const now = Date.now();

  const reservation = {
    uid,
    productId,
    amount,
    quantity,
    purchaseTokenHash: receiptKey,
    transactionId: transactionId ?? null,
    purchaseId: purchaseId ?? null,
    googleOrderId: purchase.orderId ?? null,
    purchaseTimeMillis: purchase.purchaseTimeMillis ?? null,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };

  let reserved = false;
  let existingReceipt = null;
  await receiptRef.transaction((current) => {
    if (current) {
      existingReceipt = current;
      return;
    }
    reserved = true;
    return reservation;
  });

  if (!reserved) {
    return buildAlreadyGrantedResponse(db, uid, receiptKey, existingReceipt);
  }

  const grant = await grantGems(db, uid, receiptKey, {
    productId,
    amount,
    quantity,
    transactionId,
    purchaseId,
    googleOrderId: purchase.orderId ?? null,
    grantedAt: now,
  });

  const finalReceipt = {
    ...reservation,
    status: 'granted',
    grantedAt: now,
    gemsAfterGrant: grant.gems,
    updatedAt: Date.now(),
  };

  await Promise.all([
    receiptRef.set(finalReceipt),
    db.ref(`players/${uid}/iap/${receiptKey}`).set(finalReceipt),
  ]);

  logger.info('Google Play purchase verified and granted', {
    uid,
    productId,
    amount,
    receiptKey,
    alreadyGranted: grant.alreadyGranted,
  });

  return {
    success: true,
    alreadyGranted: grant.alreadyGranted,
    productId,
    amount,
    quantity,
    purchaseKey: receiptKey,
    gems: grant.gems,
    grantedAt: now,
  };
});

function normalizeRequest(data) {
  const productId = typeof data?.productId === 'string' ? data.productId.trim() : '';
  const purchaseToken = typeof data?.purchaseToken === 'string' ? data.purchaseToken.trim() : '';
  const transactionId = typeof data?.transactionId === 'string' && data.transactionId.trim()
    ? data.transactionId.trim()
    : undefined;
  const purchaseId = typeof data?.purchaseId === 'string' && data.purchaseId.trim()
    ? data.purchaseId.trim()
    : undefined;

  if (!productId || !purchaseToken) {
    throw new HttpsError('invalid-argument', 'productId와 purchaseToken이 필요합니다.');
  }

  return { productId, purchaseToken, transactionId, purchaseId };
}

async function verifyWithGooglePlay(productId, token) {
  try {
    const androidpublisher = await getAndroidPublisher();
    const response = await androidpublisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token,
    });
    const purchase = response.data;

    if (purchase.purchaseState !== 0) {
      throw new HttpsError('failed-precondition', '구매가 완료 상태가 아닙니다.', {
        purchaseState: purchase.purchaseState,
      });
    }
    if (purchase.consumptionState === 1) {
      throw new HttpsError('already-exists', '이미 소비된 구매 토큰입니다.');
    }

    return purchase;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.warn('Google Play purchase verification failed', {
      productId,
      code: error?.code,
      message: error?.message,
    });
    throw new HttpsError('permission-denied', 'Google Play 구매 검증에 실패했습니다.');
  }
}

async function getAndroidPublisher() {
  if (!androidPublisherPromise) {
    androidPublisherPromise = (async () => {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        scopes: [ANDROID_PUBLISHER_SCOPE],
      });
      const authClient = await auth.getClient();
      return google.androidpublisher({ version: 'v3', auth: authClient });
    })();
  }
  return androidPublisherPromise;
}

function getVerifiedQuantity(purchase, requestedQuantity) {
  const googleQuantity = Number(purchase.quantity);
  if (Number.isFinite(googleQuantity) && googleQuantity > 0) {
    return Math.floor(googleQuantity);
  }

  const clientQuantity = Number(requestedQuantity);
  if (Number.isFinite(clientQuantity) && clientQuantity > 0) {
    return Math.floor(clientQuantity);
  }

  return 1;
}

async function grantGems(db, uid, receiptKey, record) {
  let gems = 0;
  let alreadyGranted = false;
  const gameStateRef = db.ref(`players/${uid}/gameState`);

  await gameStateRef.transaction((current) => {
    const state = current && typeof current === 'object' ? current : {};
    const purchases = state.iapPurchases && typeof state.iapPurchases === 'object'
      ? state.iapPurchases
      : {};
    const currentGems = Number(state.gems ?? 0);

    if (purchases[receiptKey]) {
      gems = Number.isFinite(currentGems) ? currentGems : 0;
      alreadyGranted = true;
      return state;
    }

    gems = (Number.isFinite(currentGems) ? currentGems : 0) + record.amount;
    return {
      ...state,
      gems,
      iapPurchases: {
        ...purchases,
        [receiptKey]: {
          productId: record.productId,
          amount: record.amount,
          quantity: record.quantity,
          transactionId: record.transactionId ?? null,
          purchaseId: record.purchaseId ?? null,
          googleOrderId: record.googleOrderId ?? null,
          grantedAt: record.grantedAt,
        },
      },
      lastSaveTime: Date.now(),
      _savedAt: Date.now(),
    };
  });

  return { gems, alreadyGranted };
}

async function buildAlreadyGrantedResponse(db, uid, receiptKey, receipt) {
  if (!receipt || receipt.uid !== uid) {
    throw new HttpsError('permission-denied', '다른 사용자에게 등록된 구매 토큰입니다.');
  }

  const gemsSnap = await db.ref(`players/${uid}/gameState/gems`).get();
  const gems = Number(gemsSnap.val() ?? receipt.gemsAfterGrant ?? 0);
  return {
    success: true,
    alreadyGranted: true,
    productId: receipt.productId,
    amount: receipt.amount,
    quantity: receipt.quantity ?? 1,
    purchaseKey: receiptKey,
    gems: Number.isFinite(gems) ? gems : 0,
    grantedAt: receipt.grantedAt ?? receipt.createdAt ?? Date.now(),
  };
}

function hashPurchaseToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeRankingEntry(uid, raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    uid: typeof raw.uid === 'string' ? raw.uid : uid,
    gameId: typeof raw.gameId === 'string' ? raw.gameId : '?????',
    nickname: typeof raw.nickname === 'string' ? raw.nickname : '알 주인',
    level: Number.isFinite(Number(raw.level)) ? Number(raw.level) : 1,
    stage: typeof raw.stage === 'string' ? raw.stage : 'egg',
    coins: Number.isFinite(Number(raw.coins)) ? Number(raw.coins) : 0,
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0,
  };
}

function sortRankingEntries(entries) {
  return entries.sort((a, b) => b.level - a.level || b.coins - a.coins || b.updatedAt - a.updatedAt);
}

async function aggregateLeaderboardTop20(db = admin.database()) {
  const rankingSnap = await db.ref('ranking').get();
  if (!rankingSnap.exists()) {
    await db.ref('leaderboard/top20').set([]);
    await db.ref('leaderboard/meta').set({
      updatedAt: Date.now(),
      totalRanked: 0,
      source: 'aggregate',
    });
    return { count: 0, totalRanked: 0 };
  }

  const entries = [];
  rankingSnap.forEach((child) => {
    const normalized = normalizeRankingEntry(child.key, child.val());
    if (normalized) entries.push(normalized);
  });

  const top20 = sortRankingEntries(entries).slice(0, TOP_LEADERBOARD_SIZE);
  const now = Date.now();

  await Promise.all([
    db.ref('leaderboard/top20').set(top20),
    db.ref('leaderboard/meta').set({
      updatedAt: now,
      totalRanked: entries.length,
      source: 'aggregate',
    }),
  ]);

  return { count: top20.length, totalRanked: entries.length };
}

function scheduleLeaderboardAggregate(trigger = 'ranking-write') {
  leaderboardAggregatePending = true;
  if (leaderboardAggregateTimer) {
    clearTimeout(leaderboardAggregateTimer);
  }

  leaderboardAggregateTimer = setTimeout(() => {
    leaderboardAggregateTimer = null;
    void runLeaderboardAggregate(trigger);
  }, LEADERBOARD_AGGREGATE_DEBOUNCE_MS);
}

async function runLeaderboardAggregate(trigger) {
  if (!leaderboardAggregatePending) return;

  if (leaderboardAggregateInFlight) {
    await leaderboardAggregateInFlight;
    if (leaderboardAggregatePending) {
      return runLeaderboardAggregate(trigger);
    }
    return;
  }

  leaderboardAggregatePending = false;
  leaderboardAggregateInFlight = aggregateLeaderboardTop20()
    .then((result) => {
      logger.info('Leaderboard top20 aggregated', { trigger, ...result });
      return result;
    })
    .catch((error) => {
      logger.error('Leaderboard aggregation failed', { trigger, error });
      throw error;
    })
    .finally(() => {
      leaderboardAggregateInFlight = null;
    });

  await leaderboardAggregateInFlight;

  if (leaderboardAggregatePending) {
    return runLeaderboardAggregate(trigger);
  }
}

exports.onRankingEntryWrite = onValueWritten(
  { ref: '/ranking/{uid}', region: 'us-central1' },
  async (event) => {
    const uid = event.params.uid;
    const after = event.data.after.val();
    if (!after) {
      logger.info('Ranking entry removed; refreshing leaderboard', { uid });
    }
    scheduleLeaderboardAggregate('ranking-write');
  }
);

exports.refreshLeaderboardTop20 = onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1' },
  async () => {
    const result = await aggregateLeaderboardTop20();
    logger.info('Scheduled leaderboard refresh completed', result);
  }
);

// ===== Admin MVP =====

const ADMIN_ITEM_WHITELIST = new Set([
  'fragment_rainbow',
  'fragment_sparkle',
  'food_basic',
  'food_cookie',
  'food_salad',
  'food_cake',
  'toy_ball',
  'toy_puzzle',
  'toy_ribbon',
  'toy_leaf',
  'food_rainbow_snack',
  'food_star_growth_snack',
]);

const MAX_CURRENCY_GRANT = 100000;
const MAX_ITEM_QUANTITY = 999;

const PET_STAGES = new Set(['egg', 'baby', 'child', 'teen', 'adult', 'mythic']);
const MIN_LEVEL = 1;
const MAX_LEVEL = 999;
const MIN_STAT = 0;
const MAX_STAT = 100;
const MIN_EXP = 0;
const MAX_EXP = 999999;
const MIN_EXP_TO_NEXT = 1;
const MAX_EXP_TO_NEXT = 999999;
const MIN_TRAIT = 0;
const MAX_TRAIT = 999;
const MAX_NICKNAME_LENGTH = 20;
const MAX_PET_NAME_LENGTH = 20;

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Math.floor(Number(value))));
}

/** 게임 checkLevelUp과 동일: level L 시작 시 expToNext (L=1 → 100) */
function computeExpToNextForLevel(level) {
  let expToNext = 100;
  for (let i = 1; i < level; i += 1) {
    expToNext = Math.floor(expToNext * 1.1);
  }
  return expToNext;
}

function resolveSocialNickname(nickname, gameId) {
  const trimmed = typeof nickname === 'string' ? nickname.trim() : '';
  if (trimmed) return trimmed;
  if (gameId && gameId !== '?????') return `#${gameId}`;
  return '알 주인';
}

function assertAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }
  return request.auth.uid;
}

function normalizeInventorySlots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((slot) => slot && typeof slot === 'object' && typeof slot.id === 'string')
    .map((slot) => ({
      id: slot.id,
      quantity: Number.isFinite(Number(slot.quantity))
        ? Math.max(0, Math.floor(Number(slot.quantity)))
        : 0,
    }))
    .filter((slot) => slot.quantity > 0);
}

function mergeInventoryGrant(currentInventory, grantItems) {
  const slotMap = new Map(
    normalizeInventorySlots(currentInventory).map((slot) => [slot.id, slot.quantity])
  );
  for (const item of grantItems) {
    slotMap.set(item.id, (slotMap.get(item.id) ?? 0) + item.quantity);
  }
  return Array.from(slotMap.entries())
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ id, quantity }));
}

async function resolveTargetUid(db, query) {
  const trimmed = typeof query === 'string' ? query.trim().replace(/^#/, '') : '';
  if (!trimmed) {
    throw new HttpsError('invalid-argument', 'gameId 또는 uid가 필요합니다.');
  }

  if (/^\d{5}$/.test(trimmed)) {
    const mapSnap = await db.ref(`userIds/${trimmed}`).get();
    if (!mapSnap.exists()) {
      throw new HttpsError('not-found', '해당 게임 ID를 찾을 수 없습니다.');
    }
    return { uid: String(mapSnap.val()), gameId: trimmed };
  }

  const playerSnap = await db.ref(`players/${trimmed}`).get();
  if (!playerSnap.exists()) {
    throw new HttpsError('not-found', '해당 플레이어를 찾을 수 없습니다.');
  }

  const gameIdSnap = await db.ref(`players/${trimmed}/profile/gameId`).get();
  return {
    uid: trimmed,
    gameId: gameIdSnap.exists() ? String(gameIdSnap.val()) : null,
  };
}

function parseAdminGrants(grants) {
  if (!grants || typeof grants !== 'object' || Array.isArray(grants)) {
    throw new HttpsError('invalid-argument', 'grants 객체가 필요합니다.');
  }

  const coins = grants.coins !== undefined ? Math.floor(Number(grants.coins)) : 0;
  const gems = grants.gems !== undefined ? Math.floor(Number(grants.gems)) : 0;
  const friendCoins = grants.friendCoins !== undefined ? Math.floor(Number(grants.friendCoins)) : 0;

  for (const [label, value] of [
    ['coins', coins],
    ['gems', gems],
    ['friendCoins', friendCoins],
  ]) {
    if (!Number.isFinite(value) || value < 0 || value > MAX_CURRENCY_GRANT) {
      throw new HttpsError('invalid-argument', `${label}은(는) 0~${MAX_CURRENCY_GRANT} 범위여야 합니다.`);
    }
  }

  const items = [];
  if (grants.items !== undefined) {
    if (!Array.isArray(grants.items)) {
      throw new HttpsError('invalid-argument', 'grants.items는 배열이어야 합니다.');
    }
    for (const item of grants.items) {
      const id = typeof item?.id === 'string' ? item.id.trim() : '';
      const quantity = Math.floor(Number(item?.quantity));
      if (!ADMIN_ITEM_WHITELIST.has(id)) {
        throw new HttpsError('invalid-argument', `허용되지 않은 아이템 ID입니다: ${id || '(empty)'}`);
      }
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_ITEM_QUANTITY) {
        throw new HttpsError('invalid-argument', `아이템 수량은 1~${MAX_ITEM_QUANTITY} 범위여야 합니다.`);
      }
      items.push({ id, quantity });
    }
  }

  if (coins === 0 && gems === 0 && friendCoins === 0 && items.length === 0) {
    throw new HttpsError('invalid-argument', '지급할 항목이 없습니다.');
  }

  return { coins, gems, friendCoins, items };
}

function parseAdminStatUpdates(updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new HttpsError('invalid-argument', 'updates 객체가 필요합니다.');
  }

  const parsed = {};
  let fieldCount = 0;

  if (updates.nickname !== undefined) {
    const nickname = typeof updates.nickname === 'string' ? updates.nickname.trim() : '';
    if (nickname.length > MAX_NICKNAME_LENGTH) {
      throw new HttpsError('invalid-argument', `닉네임은 ${MAX_NICKNAME_LENGTH}자 이하여야 합니다.`);
    }
    parsed.nickname = nickname;
    fieldCount += 1;
  }

  if (updates.pet !== undefined) {
    if (!updates.pet || typeof updates.pet !== 'object' || Array.isArray(updates.pet)) {
      throw new HttpsError('invalid-argument', 'updates.pet는 객체여야 합니다.');
    }
    const pet = {};
    const rawPet = updates.pet;

    if (rawPet.level !== undefined) {
      const level = clampInt(rawPet.level, MIN_LEVEL, MAX_LEVEL);
      if (!Number.isFinite(Number(rawPet.level)) || level < MIN_LEVEL || level > MAX_LEVEL) {
        throw new HttpsError('invalid-argument', `레벨은 ${MIN_LEVEL}~${MAX_LEVEL} 범위여야 합니다.`);
      }
      pet.level = level;
      fieldCount += 1;
    }

    if (rawPet.stage !== undefined) {
      const stage = typeof rawPet.stage === 'string' ? rawPet.stage.trim() : '';
      if (!PET_STAGES.has(stage)) {
        throw new HttpsError('invalid-argument', '유효하지 않은 진화 단계(stage)입니다.');
      }
      pet.stage = stage;
      fieldCount += 1;
    }

    if (rawPet.exp !== undefined) {
      const exp = clampInt(rawPet.exp, MIN_EXP, MAX_EXP);
      if (!Number.isFinite(Number(rawPet.exp)) || exp < MIN_EXP || exp > MAX_EXP) {
        throw new HttpsError('invalid-argument', `경험치(exp)는 ${MIN_EXP}~${MAX_EXP} 범위여야 합니다.`);
      }
      pet.exp = exp;
      fieldCount += 1;
    }

    if (rawPet.expToNext !== undefined) {
      const expToNext = clampInt(rawPet.expToNext, MIN_EXP_TO_NEXT, MAX_EXP_TO_NEXT);
      if (
        !Number.isFinite(Number(rawPet.expToNext))
        || expToNext < MIN_EXP_TO_NEXT
        || expToNext > MAX_EXP_TO_NEXT
      ) {
        throw new HttpsError(
          'invalid-argument',
          `다음 레벨 경험치(expToNext)는 ${MIN_EXP_TO_NEXT}~${MAX_EXP_TO_NEXT} 범위여야 합니다.`,
        );
      }
      pet.expToNext = expToNext;
      fieldCount += 1;
    }

    if (rawPet.intimacy !== undefined) {
      const intimacy = clampInt(rawPet.intimacy, MIN_STAT, MAX_STAT);
      if (!Number.isFinite(Number(rawPet.intimacy)) || intimacy < MIN_STAT || intimacy > MAX_STAT) {
        throw new HttpsError('invalid-argument', `친밀도(intimacy)는 ${MIN_STAT}~${MAX_STAT} 범위여야 합니다.`);
      }
      pet.intimacy = intimacy;
      fieldCount += 1;
    }

    if (rawPet.name !== undefined) {
      const name = typeof rawPet.name === 'string' ? rawPet.name.trim() : '';
      if (!name || name.length > MAX_PET_NAME_LENGTH) {
        throw new HttpsError('invalid-argument', `반려몬 이름은 1~${MAX_PET_NAME_LENGTH}자여야 합니다.`);
      }
      pet.name = name;
      fieldCount += 1;
    }

    if (rawPet.traits !== undefined) {
      if (!rawPet.traits || typeof rawPet.traits !== 'object' || Array.isArray(rawPet.traits)) {
        throw new HttpsError('invalid-argument', 'updates.pet.traits는 객체여야 합니다.');
      }
      const traits = {};
      for (const key of ['power', 'intelligence', 'charm', 'vitality']) {
        if (rawPet.traits[key] !== undefined) {
          const value = clampInt(rawPet.traits[key], MIN_TRAIT, MAX_TRAIT);
          if (
            !Number.isFinite(Number(rawPet.traits[key]))
            || value < MIN_TRAIT
            || value > MAX_TRAIT
          ) {
            throw new HttpsError('invalid-argument', `성향(${key})은 ${MIN_TRAIT}~${MAX_TRAIT} 범위여야 합니다.`);
          }
          traits[key] = value;
          fieldCount += 1;
        }
      }
      if (Object.keys(traits).length > 0) {
        pet.traits = traits;
      }
    }

    if (pet.level !== undefined) {
      if (rawPet.exp === undefined) {
        pet.exp = 0;
      }
      if (rawPet.expToNext === undefined) {
        pet.expToNext = computeExpToNextForLevel(pet.level);
      }
    }

    if (Object.keys(pet).length > 0) {
      parsed.pet = pet;
    }
  }

  if (updates.status !== undefined) {
    if (!updates.status || typeof updates.status !== 'object' || Array.isArray(updates.status)) {
      throw new HttpsError('invalid-argument', 'updates.status는 객체여야 합니다.');
    }
    const status = {};
    const statusLabels = {
      hunger: '배고픔',
      mood: '기분',
      clean: '청결',
      fatigue: '피로',
    };

    for (const [key, label] of Object.entries(statusLabels)) {
      if (updates.status[key] !== undefined) {
        const value = clampInt(updates.status[key], MIN_STAT, MAX_STAT);
        if (
          !Number.isFinite(Number(updates.status[key]))
          || value < MIN_STAT
          || value > MAX_STAT
        ) {
          throw new HttpsError('invalid-argument', `${label}(${key})는 ${MIN_STAT}~${MAX_STAT} 범위여야 합니다.`);
        }
        status[key] = value;
        fieldCount += 1;
      }
    }

    if (Object.keys(status).length > 0) {
      parsed.status = status;
    }
  }

  if (fieldCount === 0) {
    throw new HttpsError('invalid-argument', '변경할 항목이 없습니다.');
  }

  return parsed;
}

function applyAdminStatUpdates(state, parsedUpdates) {
  const next = { ...state };

  if (parsedUpdates.nickname !== undefined) {
    next.nickname = parsedUpdates.nickname;
  }

  if (parsedUpdates.pet) {
    const currentPet = next.pet && typeof next.pet === 'object' ? next.pet : {};
    const nextPet = { ...currentPet, ...parsedUpdates.pet };
    if (parsedUpdates.pet.traits) {
      nextPet.traits = {
        ...(currentPet.traits && typeof currentPet.traits === 'object' ? currentPet.traits : {}),
        ...parsedUpdates.pet.traits,
      };
    }
    next.pet = nextPet;
  }

  if (parsedUpdates.status) {
    const currentStatus = next.status && typeof next.status === 'object' ? next.status : {};
    next.status = { ...currentStatus, ...parsedUpdates.status };
  }

  return next;
}

exports.adminLookupPlayer = onCall({ region: 'us-central1' }, async (request) => {
  assertAdmin(request);

  const query = request.data?.query ?? request.data?.gameId ?? request.data?.uid;
  const db = admin.database();
  const { uid } = await resolveTargetUid(db, query);

  const [profileSnap, gameStateSnap, friendCoinsSnap] = await Promise.all([
    db.ref(`players/${uid}/profile`).get(),
    db.ref(`players/${uid}/gameState`).get(),
    db.ref(`players/${uid}/friendCoins`).get(),
  ]);

  const gameState = gameStateSnap.val() && typeof gameStateSnap.val() === 'object'
    ? gameStateSnap.val()
    : {};
  const profile = profileSnap.val() && typeof profileSnap.val() === 'object'
    ? profileSnap.val()
    : {};

  return {
    uid,
    profile,
    nickname: typeof gameState.nickname === 'string' ? gameState.nickname : '',
    coins: Number.isFinite(Number(gameState.coins)) ? Number(gameState.coins) : 0,
    gems: Number.isFinite(Number(gameState.gems)) ? Number(gameState.gems) : 0,
    inventory: normalizeInventorySlots(gameState.inventory),
    pet: gameState.pet ?? null,
    status: gameState.status ?? null,
    friendCoins: Number.isFinite(Number(friendCoinsSnap.val())) ? Number(friendCoinsSnap.val()) : 0,
    lastSaveTime: typeof gameState.lastSaveTime === 'number' ? gameState.lastSaveTime : null,
    _savedAt: typeof gameState._savedAt === 'number' ? gameState._savedAt : null,
  };
});

exports.adminGrantRewards = onCall({ region: 'us-central1' }, async (request) => {
  const adminUid = assertAdmin(request);

  const targetUid = typeof request.data?.targetUid === 'string' ? request.data.targetUid.trim() : '';
  const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim() : '';

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid가 필요합니다.');
  }
  if (!reason) {
    throw new HttpsError('invalid-argument', 'reason(지급 사유)가 필요합니다.');
  }

  const db = admin.database();
  const playerSnap = await db.ref(`players/${targetUid}`).get();
  if (!playerSnap.exists()) {
    throw new HttpsError('not-found', '해당 플레이어를 찾을 수 없습니다.');
  }

  const grants = parseAdminGrants(request.data?.grants);
  const now = Date.now();
  const applied = {
    coins: grants.coins,
    gems: grants.gems,
    friendCoins: grants.friendCoins,
    items: grants.items,
  };

  let balances = {
    coins: 0,
    gems: 0,
    friendCoins: 0,
    inventory: [],
  };

  if (grants.coins > 0 || grants.gems > 0 || grants.items.length > 0) {
    const gameStateRef = db.ref(`players/${targetUid}/gameState`);
    await gameStateRef.transaction((current) => {
      const state = current && typeof current === 'object' ? current : {};
      const currentCoins = Number(state.coins ?? 0);
      const currentGems = Number(state.gems ?? 0);
      const newCoins = (Number.isFinite(currentCoins) ? currentCoins : 0) + grants.coins;
      const newGems = (Number.isFinite(currentGems) ? currentGems : 0) + grants.gems;
      const newInventory = grants.items.length > 0
        ? mergeInventoryGrant(state.inventory, grants.items)
        : normalizeInventorySlots(state.inventory);

      balances = {
        coins: newCoins,
        gems: newGems,
        friendCoins: balances.friendCoins,
        inventory: newInventory,
      };

      return {
        ...state,
        coins: newCoins,
        gems: newGems,
        inventory: newInventory,
        lastSaveTime: now,
        _savedAt: now,
      };
    });
  } else {
    const gameStateSnap = await db.ref(`players/${targetUid}/gameState`).get();
    const state = gameStateSnap.val() && typeof gameStateSnap.val() === 'object'
      ? gameStateSnap.val()
      : {};
    balances.coins = Number.isFinite(Number(state.coins)) ? Number(state.coins) : 0;
    balances.gems = Number.isFinite(Number(state.gems)) ? Number(state.gems) : 0;
    balances.inventory = normalizeInventorySlots(state.inventory);
  }

  if (grants.friendCoins > 0) {
    const friendCoinsRef = db.ref(`players/${targetUid}/friendCoins`);
    await friendCoinsRef.transaction((current) => {
      const currentFriendCoins = Number.isFinite(Number(current)) ? Number(current) : 0;
      const newFriendCoins = currentFriendCoins + grants.friendCoins;
      balances.friendCoins = newFriendCoins;
      return newFriendCoins;
    });
  } else {
    const friendCoinsSnap = await db.ref(`players/${targetUid}/friendCoins`).get();
    balances.friendCoins = Number.isFinite(Number(friendCoinsSnap.val()))
      ? Number(friendCoinsSnap.val())
      : 0;
  }

  if (grants.coins > 0) {
    const rankingRef = db.ref(`ranking/${targetUid}`);
    await rankingRef.transaction((current) => {
      if (!current || typeof current !== 'object') return current;
      const currentCoins = Number(current.coins ?? 0);
      return {
        ...current,
        coins: (Number.isFinite(currentCoins) ? currentCoins : 0) + grants.coins,
        updatedAt: now,
      };
    });
  }

  await db.ref('adminAudit').push({
    adminUid,
    targetUid,
    reason,
    grants: applied,
    balancesAfter: {
      coins: balances.coins,
      gems: balances.gems,
      friendCoins: balances.friendCoins,
    },
    createdAt: now,
  });

  logger.info('Admin grant applied', {
    adminUid,
    targetUid,
    reason,
    grants: applied,
  });

  return {
    success: true,
    targetUid,
    applied,
    balances: {
      coins: balances.coins,
      gems: balances.gems,
      friendCoins: balances.friendCoins,
      inventory: balances.inventory,
    },
  };
});

exports.adminUpdatePlayerStats = onCall({ region: 'us-central1' }, async (request) => {
  const adminUid = assertAdmin(request);

  const targetUid = typeof request.data?.targetUid === 'string' ? request.data.targetUid.trim() : '';
  const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim() : '';

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid가 필요합니다.');
  }
  if (!reason) {
    throw new HttpsError('invalid-argument', 'reason(수정 사유)가 필요합니다.');
  }

  const parsedUpdates = parseAdminStatUpdates(request.data?.updates);
  const db = admin.database();

  const [playerSnap, profileSnap] = await Promise.all([
    db.ref(`players/${targetUid}`).get(),
    db.ref(`players/${targetUid}/profile`).get(),
  ]);

  if (!playerSnap.exists()) {
    throw new HttpsError('not-found', '해당 플레이어를 찾을 수 없습니다.');
  }

  const profile = profileSnap.val() && typeof profileSnap.val() === 'object'
    ? profileSnap.val()
    : {};
  const gameId = typeof profile.gameId === 'string' ? profile.gameId : null;
  const now = Date.now();

  let updatedState = null;

  const gameStateRef = db.ref(`players/${targetUid}/gameState`);
  await gameStateRef.transaction((current) => {
    const state = current && typeof current === 'object' ? current : {};
    updatedState = applyAdminStatUpdates(state, parsedUpdates);
    return {
      ...updatedState,
      lastSaveTime: now,
      _savedAt: now,
    };
  });

  const rankingPatch = {};
  if (parsedUpdates.pet?.level !== undefined) {
    rankingPatch.level = updatedState.pet?.level ?? parsedUpdates.pet.level;
  }
  if (parsedUpdates.pet?.stage !== undefined) {
    rankingPatch.stage = updatedState.pet?.stage ?? parsedUpdates.pet.stage;
  }
  if (parsedUpdates.nickname !== undefined) {
    rankingPatch.nickname = resolveSocialNickname(
      updatedState.nickname,
      gameId,
    );
  }

  if (Object.keys(rankingPatch).length > 0) {
    const rankingRef = db.ref(`ranking/${targetUid}`);
    await rankingRef.transaction((current) => {
      if (!current || typeof current !== 'object') {
        return {
          uid: targetUid,
          gameId,
          level: rankingPatch.level ?? updatedState.pet?.level ?? 1,
          stage: rankingPatch.stage ?? updatedState.pet?.stage ?? 'egg',
          nickname: rankingPatch.nickname
            ?? resolveSocialNickname(updatedState.nickname, gameId),
          coins: Number.isFinite(Number(updatedState.coins)) ? Number(updatedState.coins) : 0,
          updatedAt: now,
        };
      }
      return {
        ...current,
        ...rankingPatch,
        updatedAt: now,
      };
    });
  }

  await db.ref('adminAudit').push({
    adminUid,
    targetUid,
    reason,
    action: 'updatePlayerStats',
    updates: parsedUpdates,
    createdAt: now,
  });

  logger.info('Admin player stats updated', {
    adminUid,
    targetUid,
    reason,
    updates: parsedUpdates,
  });

  return {
    success: true,
    targetUid,
    applied: parsedUpdates,
    pet: updatedState.pet ?? null,
    status: updatedState.status ?? null,
    nickname: typeof updatedState.nickname === 'string' ? updatedState.nickname : '',
    lastSaveTime: now,
    _savedAt: now,
  };
});

function sanitizeLayoutPlacement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const scale = Number(raw.scale);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale)) return null;
  const out = {
    x: Math.min(0.98, Math.max(0.02, x)),
    y: Math.min(0.98, Math.max(0.02, y)),
    scale: Math.min(2, Math.max(0.4, scale)),
    zIndex: Number.isFinite(Number(raw.zIndex)) ? Math.min(5, Math.max(1, Number(raw.zIndex))) : 2,
  };
  if (raw.rotation != null && Number.isFinite(Number(raw.rotation))) {
    out.rotation = Number(raw.rotation) % 360;
  }
  if (raw.flipX === true) out.flipX = true;
  if (raw.scaleX != null && Number.isFinite(Number(raw.scaleX))) out.scaleX = Number(raw.scaleX);
  if (raw.scaleY != null && Number.isFinite(Number(raw.scaleY))) out.scaleY = Number(raw.scaleY);
  return out;
}

exports.adminGetRoomLayouts = onCall({ region: 'us-central1' }, async (request) => {
  assertAdmin(request);
  const snap = await admin.database().ref('config/roomLayouts').get();
  return { layouts: snap.val() ?? null };
});

exports.adminSaveRoomLayouts = onCall({ region: 'us-central1' }, async (request) => {
  const adminUid = assertAdmin(request);
  const wallpaperId = typeof request.data?.wallpaperId === 'string' ? request.data.wallpaperId.trim() : '';
  const placementsRaw = request.data?.placements;
  const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim() : '';

  const allowed = new Set(['default', 'wallpaper_forest', 'wallpaper_ocean', 'wallpaper_cloud', 'wallpaper_candy']);
  if (!allowed.has(wallpaperId)) {
    throw new HttpsError('invalid-argument', 'Invalid wallpaperId');
  }
  if (!placementsRaw || typeof placementsRaw !== 'object' || Array.isArray(placementsRaw)) {
    throw new HttpsError('invalid-argument', 'placements must be an object');
  }

  const sanitized = {};
  for (const [decorId, raw] of Object.entries(placementsRaw)) {
    if (typeof decorId !== 'string' || (!decorId.startsWith('decor_') && !decorId.startsWith('social_'))) continue;
    const p = sanitizeLayoutPlacement(raw);
    if (p) sanitized[decorId] = p;
  }

  const db = admin.database();
  await db.ref(`config/roomLayouts/${wallpaperId}`).set(sanitized);
  await db.ref('adminAudit').push({
    adminUid,
    action: 'saveRoomLayouts',
    wallpaperId,
    decorCount: Object.keys(sanitized).length,
    reason: reason || 'room layout preset update',
    at: Date.now(),
  });

  return { success: true, wallpaperId, decorCount: Object.keys(sanitized).length };
});
