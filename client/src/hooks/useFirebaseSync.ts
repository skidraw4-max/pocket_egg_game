import { useEffect, useRef, useCallback, useState, type MutableRefObject } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  ref,
  set,
  get,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  runTransaction,
} from 'firebase/database';
import {
  db,
  ensureAnonymousAuth,
  onAuthChanged,
  ensureGameId,
  lookupUidByGameId,
  isGoogleLinked,
  linkGoogleAccount,
  signInWithGoogleForRestore,
} from '../lib/firebase';
import type { GameState, PlacedDecor } from '../lib/gameState';
import { toCloudState, fromCloudState, extractLegacyFriendCoins } from '../lib/cloudState';

const CLOUD_SYNC_DEBOUNCE_MS = 30000;

/** 소셜 목록 표시용 닉네임 — 프로필 이름 우선, 없으면 gameId 폴백 (반려몬 이름 미사용) */
export function resolveSocialNickname(
  nickname: string | undefined | null,
  gameId?: string | null,
): string {
  const trimmed = nickname?.trim();
  if (trimmed) return trimmed;
  if (gameId && gameId !== '?????') return `#${gameId}`;
  return '알 주인';
}

interface RankingSnapshot {
  level: number;
  coins: number;
  nickname: string;
  stage: string;
}

/** calculateTimeSkip은 status·lastSaveTime만 변경한다 */
function isTickOnlyChange(prev: GameState, next: GameState): boolean {
  const tickKeys: (keyof GameState)[] = [
    'pet', 'coins', 'gems', 'iapPurchases', 'inventory', 'room', 'collection',
    'totalPlayDays', 'missions', 'attendance', 'claimedEvolutionRewards',
    'claimedCollectionRewards', 'nickname', 'tutorialSeen',
    'ownedWallpapers', 'eggColor', 'gachaEgg',
    'claimedIntimacyRewards', 'unlockedEmotions', 'dailyChallenges', 'weeklyGoals',
    'fragmentExchangeDaily', 'expBoostUntil', 'intimacyBoostUntil', 'puzzleHintCredits', 'puzzleHintDaily',
  ];

  return tickKeys.every((key) => JSON.stringify(prev[key]) === JSON.stringify(next[key]));
}

function extractRankingSnapshot(gameState: GameState, gameId?: string | null): RankingSnapshot {
  return {
    nickname: resolveSocialNickname(gameState.nickname, gameId),
    level: gameState.pet?.level ?? 1,
    stage: gameState.pet?.stage ?? 'egg',
    coins: gameState.coins ?? 0,
  };
}

/** 내 닉네임 변경 시 친구 목록의 내 프로필 정보도 갱신 */
async function propagateNicknameToFriends(
  myUid: string,
  gameId: string,
  snapshot: RankingSnapshot,
): Promise<void> {
  try {
    const friendsSnap = await get(ref(db, `friends/${myUid}`));
    if (!friendsSnap.exists()) return;

    const updates: Promise<void>[] = [];
    friendsSnap.forEach((child) => {
      const friendUid = child.key;
      if (!friendUid) return;
      const existing = child.val() as FriendEntry;
      updates.push(
        set(ref(db, `friends/${friendUid}/${myUid}`), {
          uid: myUid,
          gameId,
          nickname: snapshot.nickname,
          level: snapshot.level,
          stage: snapshot.stage,
          addedAt: existing.addedAt ?? Date.now(),
        }),
      );
    });
    await Promise.all(updates);
  } catch (e) {
    console.warn('[Firebase] propagateNicknameToFriends 실패:', e);
  }
}

function hasRankingChanged(prev: RankingSnapshot | null, next: RankingSnapshot): boolean {
  if (!prev) return true;
  return (
    prev.level !== next.level
    || prev.coins !== next.coins
    || prev.nickname !== next.nickname
    || prev.stage !== next.stage
  );
}

/** 레벨·진화 단계 등 Admin과 충돌하기 쉬운 pet 필드 변경 */
function isCriticalPetChange(prev: GameState, next: GameState): boolean {
  return (
    prev.pet.level !== next.pet.level
    || prev.pet.stage !== next.pet.stage
  );
}

/** tutorialSeen·friendCoins 등 클라우드 미동기화 필드만 변경된 경우 */
function isLocalOnlyChange(prev: GameState, next: GameState): boolean {
  const localOnlyKeys: (keyof GameState)[] = ['tutorialSeen', 'friendCoins'];
  const syncKeys = (Object.keys(next) as (keyof GameState)[]).filter(
    (key) => !localOnlyKeys.includes(key)
  );

  const localChanged = localOnlyKeys.some(
    (key) => JSON.stringify(prev[key]) !== JSON.stringify(next[key])
  );
  const syncUnchanged = syncKeys.every(
    (key) => JSON.stringify(prev[key]) === JSON.stringify(next[key])
  );

  return localChanged && syncUnchanged;
}

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────
export interface RankingEntry {
  uid: string;
  gameId: string;
  nickname: string;
  level: number;
  stage: string;
  coins: number;
  updatedAt: number;
}

export interface VisitorEntry {
  uid: string;
  nickname: string;
  visitedAt: number;
}

export interface FriendEntry {
  uid: string;
  gameId: string;
  nickname: string;
  level: number;
  stage: string;
  addedAt: number;
}

export interface RecommendEntry {
  uid: string;
  gameId: string;
  nickname: string;
  level: number;
  stage: string;
}

export interface FriendRoomPreview {
  uid: string;
  nickname: string;
  gameId?: string;
  pet: {
    name: string;
    species: string;
    stage: string;
    level: number;
  };
  room: {
    wallpaper: string;
    furniture: string[];
    placements?: PlacedDecor[];
  };
}

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────
export interface FirebaseSyncOptions {
  /** 1분 tick(setInterval)으로 인한 state 변경 시 true로 설정 */
  tickOnlyUpdateRef?: MutableRefObject<boolean>;
  /** Google 복원 선택 UI 표시 중 — 자동 클라우드 병합·업로드 차단 */
  restoreChoicePendingRef?: MutableRefObject<boolean>;
  /** SocialMenu 열림 — ranking/visits/friends 리스너 구독 */
  socialActive?: boolean;
  /** ShopMenu(꾸미기) 열림 — friendCoins 리스너 구독 */
  shopActive?: boolean;
  /** localStorage tutorialSeen — 클라우드 병합 시 유지 */
  localTutorialSeen?: Record<string, boolean>;
  /** 클라우드가 더 최신일 때 게임 state 병합 (Admin 수정 반영) */
  onCloudStateMerge?: (cloudState: GameState) => void;
  /** 클라우드 저장 성공 시 로컬 _savedAt 갱신 */
  onCloudSynced?: (savedAt: number) => void;
}

export function useFirebaseSync(state: GameState | null, options?: FirebaseSyncOptions) {
  const [uid, setUid] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [recommended, setRecommended] = useState<RecommendEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [friendCoins, setFriendCoins] = useState<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<GameState | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const lastRankingRef = useRef<RankingSnapshot | null>(null);
  const uidRef = useRef<string | null>(null);
  const cloudLoadPendingRef = useRef(false);
  const lastSyncedSavedAtRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ── 1. 익명 로그인 + 게임 ID 발급 ────────────
  useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        if (uidRef.current !== user.uid) {
          cloudLoadPendingRef.current = true;
          uidRef.current = user.uid;
        }
        setUid(user.uid);
        setIsAnonymous(user.isAnonymous);
        setProviderIds(user.providerData.map((provider) => provider.providerId));
        const gid = await ensureGameId(user.uid);
        setGameId(gid);
      } else {
        uidRef.current = null;
        cloudLoadPendingRef.current = false;
        ensureAnonymousAuth().catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  // ── 2. 앱 시작 시 클라우드 데이터 불러오기 ──
  const fetchCloudSaveByUid = useCallback(async (
    targetUid: string,
    tutorialSeen: Record<string, boolean> = optionsRef.current?.localTutorialSeen ?? {},
    updateSyncedSavedAt = false,
  ): Promise<GameState | null> => {
    try {
      const snap = await get(ref(db, `players/${targetUid}/gameState`));
      if (snap.exists()) {
        const raw = snap.val();
        const legacyFriendCoins = extractLegacyFriendCoins(raw);

        if (legacyFriendCoins !== null && legacyFriendCoins > 0) {
          const coinRef = ref(db, `players/${targetUid}/friendCoins`);
          const coinSnap = await get(coinRef);
          if (!coinSnap.exists()) {
            await set(coinRef, legacyFriendCoins);
          }
        }

        const cloudSavedAt = typeof raw._savedAt === 'number' ? raw._savedAt : 0;
        if (updateSyncedSavedAt) {
          lastSyncedSavedAtRef.current = cloudSavedAt;
        }

        return fromCloudState(raw, {
          tutorialSeen,
          legacyFriendCoins: 0,
        });
      }
    } catch (e) {
      console.warn('[Firebase] fetchCloudSaveByUid 실패:', e);
    }
    return null;
  }, []);

  const loadFromCloud = useCallback(async (): Promise<GameState | null> => {
    if (!uid) return null;
    try {
      return await fetchCloudSaveByUid(uid, options?.localTutorialSeen ?? {}, true);
    } finally {
      cloudLoadPendingRef.current = false;
    }
  }, [uid, options?.localTutorialSeen, fetchCloudSaveByUid]);

  const reloadCloudIfNewer = useCallback(async () => {
    if (!uid) return;
    if (optionsRef.current?.restoreChoicePendingRef?.current) return;
    try {
      const savedAtSnap = await get(ref(db, `players/${uid}/gameState/_savedAt`));
      const cloudSavedAt = typeof savedAtSnap.val() === 'number' ? savedAtSnap.val() : 0;
      if (cloudSavedAt <= lastSyncedSavedAtRef.current) return;

      const cloudState = await loadFromCloud();
      if (cloudState) {
        optionsRef.current?.onCloudStateMerge?.(cloudState);
      }
    } catch (e) {
      console.warn('[Firebase] reloadCloudIfNewer 실패:', e);
    }
  }, [uid, loadFromCloud]);

  // ── 3. 클라우드에 저장 (디바운스 30초) ──────
  const performCloudSync = useCallback(
    async (gameState: GameState, force = false) => {
      if (!uid || !gameId) return;
      if (!force && cloudLoadPendingRef.current) return;
      if (!force && optionsRef.current?.restoreChoicePendingRef?.current) return;

      setSyncing(true);
      try {
        if (!force) {
          const savedAtSnap = await get(ref(db, `players/${uid}/gameState/_savedAt`));
          const cloudSavedAt = typeof savedAtSnap.val() === 'number' ? savedAtSnap.val() : 0;
          if (cloudSavedAt > lastSyncedSavedAtRef.current) {
            console.warn('[Firebase] syncToCloud 건너뜀 — 클라우드가 더 최신 (Admin/외부 수정)');
            void reloadCloudIfNewer();
            return;
          }
        }

        const rankingSnapshot = extractRankingSnapshot(gameState, gameId);
        const prevNickname = lastRankingRef.current?.nickname;
        const newSavedAt = Date.now();

        await set(ref(db, `players/${uid}/gameState`), {
          ...toCloudState(gameState),
          _savedAt: newSavedAt,
        });
        lastSyncedSavedAtRef.current = newSavedAt;
        optionsRef.current?.onCloudSynced?.(newSavedAt);

        if (hasRankingChanged(lastRankingRef.current, rankingSnapshot)) {
          await set(ref(db, `ranking/${uid}`), {
            uid,
            gameId,
            ...rankingSnapshot,
            updatedAt: Date.now(),
          });
          lastRankingRef.current = rankingSnapshot;

          if (prevNickname !== rankingSnapshot.nickname) {
            await propagateNicknameToFriends(uid, gameId, rankingSnapshot);
          }
        }

        setLastSynced(new Date());
      } catch (e) {
        console.warn('[Firebase] syncToCloud 실패:', e);
      } finally {
        setSyncing(false);
      }
    },
    [uid, gameId, reloadCloudIfNewer]
  );

  const flushToCloud = useCallback((force = false) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingStateRef.current;
    if (!pending) return;
    pendingStateRef.current = null;
    void performCloudSync(pending, force);
  }, [performCloudSync]);

  const forceSyncToCloud = useCallback(
    (gameState: GameState) => {
      pendingStateRef.current = gameState;
      flushToCloud(true);
    },
    [flushToCloud],
  );

  const forceSyncToCloudForUid = useCallback(async (targetUid: string, gameState: GameState) => {
    const targetGameId = await ensureGameId(targetUid);
    const rankingSnapshot = extractRankingSnapshot(gameState, targetGameId);
    const newSavedAt = Date.now();

    await set(ref(db, `players/${targetUid}/gameState`), {
      ...toCloudState(gameState),
      _savedAt: newSavedAt,
    });

    if (targetUid === uidRef.current) {
      lastSyncedSavedAtRef.current = newSavedAt;
      optionsRef.current?.onCloudSynced?.(newSavedAt);
      setLastSynced(new Date());
    }

    await set(ref(db, `ranking/${targetUid}`), {
      uid: targetUid,
      gameId: targetGameId,
      ...rankingSnapshot,
      updatedAt: Date.now(),
    });
  }, []);

  const syncToCloud = useCallback(
    (gameState: GameState) => {
      if (!uid || !gameId) return;
      if (cloudLoadPendingRef.current) return;
      if (optionsRef.current?.restoreChoicePendingRef?.current) return;

      pendingStateRef.current = gameState;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const pending = pendingStateRef.current;
        pendingStateRef.current = null;
        if (pending) void performCloudSync(pending);
      }, CLOUD_SYNC_DEBOUNCE_MS);
    },
    [uid, gameId, performCloudSync]
  );

  const isTickOnlyStateChange = useCallback((gameState: GameState): boolean => {
    const tickFlag = options?.tickOnlyUpdateRef?.current ?? false;
    if (options?.tickOnlyUpdateRef) {
      options.tickOnlyUpdateRef.current = false;
    }
    if (tickFlag) return true;

    const prev = prevStateRef.current;
    return prev !== null && isTickOnlyChange(prev, gameState);
  }, [options?.tickOnlyUpdateRef]);

  // 앱 백그라운드/종료 시 pending flush · 포그라운드 복귀 시 클라우드 재로드
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushToCloud();
      } else if (document.visibilityState === 'visible') {
        void reloadCloudIfNewer();
      }
    };
    const onBeforeUnload = () => flushToCloud();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    let removeAppListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          flushToCloud();
        } else {
          void reloadCloudIfNewer();
        }
      }).then((handle) => {
        removeAppListener = () => void handle.remove();
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      removeAppListener?.();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [flushToCloud, reloadCloudIfNewer]);

  // Admin 수정 등 외부 _savedAt 변경 감지 (단일 필드 리스너)
  useEffect(() => {
    if (!uid) return;
    const savedAtRef = ref(db, `players/${uid}/gameState/_savedAt`);
    onValue(savedAtRef, (snap) => {
      if (optionsRef.current?.restoreChoicePendingRef?.current) return;
      const cloudSavedAt = typeof snap.val() === 'number' ? snap.val() : 0;
      if (cloudSavedAt <= lastSyncedSavedAtRef.current) return;
      void reloadCloudIfNewer();
    });
    return () => off(savedAtRef);
  }, [uid, reloadCloudIfNewer]);

  const socialActive = options?.socialActive ?? false;

  // ── 4. 랭킹 실시간 구독 (SocialMenu 열릴 때만, ranking 직접 쿼리) ─
  useEffect(() => {
    if (!uid || !socialActive) {
      setRanking([]);
      return;
    }
    const rankRef = query(
      ref(db, 'ranking'),
      orderByChild('level'),
      limitToLast(20)
    );
    onValue(rankRef, (snap) => {
      if (!snap.exists()) {
        setRanking([]);
        return;
      }
      const entries: RankingEntry[] = [];
      snap.forEach((child) => {
        const raw = child.val() as RankingEntry;
        entries.push({
          ...raw,
          nickname: resolveSocialNickname(raw.nickname, raw.gameId),
        });
      });
      entries.sort((a, b) => b.level - a.level || b.coins - a.coins || b.updatedAt - a.updatedAt);
      setRanking(entries);
    });
    return () => off(rankRef);
  }, [uid, socialActive]);

  // ── 5. 방문자 실시간 구독 (SocialMenu 열릴 때만) ─
  useEffect(() => {
    if (!uid || !socialActive) {
      setVisitors([]);
      return;
    }
    const visitRef = ref(db, `visits/${uid}`);
    onValue(visitRef, (snap) => {
      if (!snap.exists()) { setVisitors([]); return; }
      const list: VisitorEntry[] = [];
      snap.forEach((child) => {
        list.push(child.val() as VisitorEntry);
      });
      list.sort((a, b) => b.visitedAt - a.visitedAt);
      setVisitors(list.slice(0, 20));
    });
    return () => off(visitRef);
  }, [uid, socialActive]);

  // ── 6. 친구 목록 실시간 구독 (SocialMenu 열릴 때만) ─
  useEffect(() => {
    if (!uid || !socialActive) {
      setFriends([]);
      return;
    }
    const friendRef = ref(db, `friends/${uid}`);
    onValue(friendRef, (snap) => {
      if (!snap.exists()) { setFriends([]); return; }
      const list: FriendEntry[] = [];
      snap.forEach((child) => {
        const raw = child.val() as FriendEntry;
        list.push({
          ...raw,
          nickname: resolveSocialNickname(raw.nickname, raw.gameId),
        });
      });
      list.sort((a, b) => b.addedAt - a.addedAt);
      setFriends(list);
    });
    return () => off(friendRef);
  }, [uid, socialActive]);

  // ── 7. 친구 추천 목록 생성 (랭킹 기반 5명) ───
  useEffect(() => {
    if (!uid || ranking.length === 0) return;
    const friendUids = new Set(friends.map((f) => f.uid));
    // 방문자 중 미친구 우선, 그 다음 랭킹 상위 활성 유저
    const visitorUids = new Set(visitors.map((v) => v.uid));
    const candidates = ranking.filter(
      (r) => r.uid !== uid && !friendUids.has(r.uid)
    );
    // 방문자 우선 정렬
    candidates.sort((a, b) => {
      const aVisitor = visitorUids.has(a.uid) ? 1 : 0;
      const bVisitor = visitorUids.has(b.uid) ? 1 : 0;
      return bVisitor - aVisitor || b.level - a.level;
    });
    setRecommended(
      candidates.slice(0, 5).map((r) => ({
        uid: r.uid,
        gameId: r.gameId ?? '?????',
        nickname: r.nickname,
        level: r.level,
        stage: r.stage,
      }))
    );
  }, [uid, ranking, friends, visitors]);

  // ── 8. 게임 ID로 친구 추가 ───────────────────
  const addFriendByGameId = useCallback(
    async (inputGameId: string): Promise<{ success: boolean; message: string }> => {
      if (!uid || !gameId) return { success: false, message: '로그인 중입니다. 잠시 후 다시 시도해 주세요.' };

      const normalized = inputGameId.replace('#', '').trim();
      if (!normalized || normalized.length !== 5 || !/^\d+$/.test(normalized)) {
        return { success: false, message: '5자리 숫자 ID를 입력해 주세요. (예: #12345)' };
      }
      if (normalized === gameId) {
        return { success: false, message: '자기 자신은 친구 추가할 수 없습니다.' };
      }

      // 숫자 ID → UID 역조회
      const targetUid = await lookupUidByGameId(normalized);
      if (!targetUid) {
        return { success: false, message: `#${normalized} 플레이어를 찾을 수 없습니다.\n게임을 한 번 이상 플레이한 플레이어만 검색됩니다.` };
      }

      // 이미 친구인지 확인
      const alreadySnap = await get(ref(db, `friends/${uid}/${targetUid}`));
      if (alreadySnap.exists()) {
        return { success: false, message: '이미 친구 목록에 있습니다.' };
      }

      // 상대방 프로필 조회
      const rankSnap = await get(ref(db, `ranking/${targetUid}`));
      const targetProfile = rankSnap.exists() ? (rankSnap.val() as RankingEntry) : null;
      const targetNickname = resolveSocialNickname(targetProfile?.nickname, targetProfile?.gameId ?? normalized);
      const targetLevel = targetProfile?.level ?? 1;
      const targetStage = targetProfile?.stage ?? 'egg';
      const targetGameId = targetProfile?.gameId ?? normalized;

      const myNickname = resolveSocialNickname(state?.nickname, gameId);
      const myLevel = state?.pet?.level ?? 1;
      const myStage = state?.pet?.stage ?? 'egg';
      const now = Date.now();

      try {
        // 양방향 친구 등록
        await set(ref(db, `friends/${uid}/${targetUid}`), {
          uid: targetUid, gameId: targetGameId, nickname: targetNickname,
          level: targetLevel, stage: targetStage, addedAt: now,
        });
        await set(ref(db, `friends/${targetUid}/${uid}`), {
          uid, gameId, nickname: myNickname,
          level: myLevel, stage: myStage, addedAt: now,
        });

        // 친구 코인 보상: 양쪽 모두 50개 지급
        await addFriendCoins(uid, 50);
        try {
          await addFriendCoins(targetUid, 50);
        } catch (rewardError) {
          // 상대 보상은 security rules 배포 전 기존 DB에서도 친구 추가 자체가 실패하지 않도록 분리한다.
          console.warn('[Firebase] target friendCoins reward 실패:', rewardError);
        }

        // 친구 수 달성 보너스 체크
        await checkFriendCountBonus(uid);

        return { success: true, message: `#${normalized} ${targetNickname}님과 친구가 되었습니다! 🎉\n친구 코인 50개가 지급되었습니다.` };
      } catch (e) {
        console.warn('[Firebase] addFriendByGameId 실패:', e);
        return { success: false, message: '친구 추가 중 오류가 발생했습니다.' };
      }
    },
    [uid, gameId, state]
  );

  // ── 9. 친구 코인 지급/차감 (Firebase 트랜잭션) ─
  const addFriendCoins = useCallback(async (targetUid: string, amount: number) => {
    const coinRef = ref(db, `players/${targetUid}/friendCoins`);
    const result = await runTransaction(coinRef, (current) => (current ?? 0) + amount);
    const newBalance = result.snapshot.val() as number ?? 0;
    if (targetUid === uidRef.current) {
      setFriendCoins(newBalance);
    }
    return newBalance;
  }, []);

  const spendFriendCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (!uid) return false;
    const coinRef = ref(db, `players/${uid}/friendCoins`);
    const result = await runTransaction(coinRef, (current) => {
      const balance = (current ?? 0) as number;
      if (balance < amount) return;
      return balance - amount;
    });
    if (!result.committed) return false;
    setFriendCoins((result.snapshot.val() as number) ?? 0);
    return true;
  }, [uid]);

  // ── 10. 친구 수 달성 보너스 ──────────────────
  const checkFriendCountBonus = useCallback(async (targetUid: string) => {
    const snap = await get(ref(db, `friends/${targetUid}`));
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    const bonusRef = ref(db, `players/${targetUid}/friendCountBonus`);
    const bonusSnap = await get(bonusRef);
    const rawClaimed = bonusSnap.exists() ? bonusSnap.val() : [];
    const claimed: number[] = Array.isArray(rawClaimed) ? rawClaimed : Object.values(rawClaimed ?? {});

    if (count >= 3 && !claimed.includes(3)) {
      await addFriendCoins(targetUid, 100);
      await set(bonusRef, [...claimed, 3]);
    }
    if (count >= 10 && !claimed.includes(10)) {
      await addFriendCoins(targetUid, 300);
      await set(bonusRef, [...claimed, 3, 10]);
    }
  }, [addFriendCoins]);

  // ── 11. 친구 삭제 ────────────────────────────
  const removeFriend = useCallback(
    async (targetUid: string): Promise<void> => {
      if (!uid) return;
      try {
        await remove(ref(db, `friends/${uid}/${targetUid}`));
        await remove(ref(db, `friends/${targetUid}/${uid}`));
      } catch (e) {
        console.warn('[Firebase] removeFriend 실패:', e);
      }
    },
    [uid]
  );

  // ── 12. 친구 방문 ────────────────────────────
  const visitFriend = useCallback(
    async (targetUid: string, myNickname: string): Promise<{ success: boolean; message: string }> => {
      if (!uid) return { success: false, message: '로그인 중입니다.' };
      if (uid === targetUid) return { success: false, message: '자기 자신은 방문할 수 없습니다.' };

      try {
        // 1일 1회 방문 보상 제한 체크
        const today = new Date().toISOString().slice(0, 10);
        const visitLogRef = ref(db, `visitLog/${uid}/${targetUid}/${today}`);
        const logSnap = await get(visitLogRef);
        const alreadyVisited = logSnap.exists();

        await set(ref(db, `visits/${targetUid}/${uid}`), {
          uid, nickname: myNickname, visitedAt: Date.now(),
        });

        if (!alreadyVisited) {
          await set(visitLogRef, true);
          await addFriendCoins(uid, 10); // 방문자 친구 코인 10개
          return { success: true, message: '선물 완료! 친구 코인 10개를 받았습니다. 🎁' };
        }
        return { success: true, message: '선물 완료! (오늘 선물 보상은 이미 수령했습니다)' };
      } catch (e) {
        console.warn('[Firebase] visitFriend 실패:', e);
        return { success: false, message: '선물 중 오류가 발생했습니다.' };
      }
    },
    [uid, addFriendCoins]
  );

  // ── 12-1. 친구 방 프리뷰 (lazy get, 리스너 없음) ─
  const fetchFriendPreview = useCallback(
    async (targetUid: string): Promise<FriendRoomPreview | null> => {
      if (!uid || uid === targetUid) return null;
      try {
        const snap = await get(ref(db, `players/${targetUid}/gameState`));
        if (!snap.exists()) return null;

        const restored = fromCloudState(snap.val());

        const friendMetaSnap = await get(ref(db, `friends/${uid}/${targetUid}`));
        const friendMeta = friendMetaSnap.exists()
          ? (friendMetaSnap.val() as FriendEntry)
          : null;

        return {
          uid: targetUid,
          nickname: resolveSocialNickname(restored.nickname, friendMeta?.gameId),
          gameId: friendMeta?.gameId,
          pet: {
            name: restored.pet?.name ?? '포코',
            species: restored.pet?.species ?? '기본몬',
            stage: restored.pet?.stage ?? 'egg',
            level: restored.pet?.level ?? 1,
          },
          room: {
            wallpaper: restored.room?.wallpaper ?? 'default',
            furniture: Array.isArray(restored.room?.furniture) ? restored.room.furniture : [],
            placements: Array.isArray(restored.room?.placements) ? restored.room.placements : undefined,
          },
        };
      } catch (e) {
        console.warn('[Firebase] fetchFriendPreview 실패:', e);
        return null;
      }
    },
    [uid]
  );

  // ── 12-2. 친구 방 좋아요 (1일 1회, 양쪽 친구코인 +5) ─
  const likeFriendRoom = useCallback(
    async (targetUid: string): Promise<{ success: boolean; message: string }> => {
      if (!uid) return { success: false, message: '로그인 중입니다.' };
      if (uid === targetUid) return { success: false, message: '자기 방에는 좋아요를 누를 수 없어요.' };

      try {
        const today = new Date().toISOString().slice(0, 10);
        const likeLogRef = ref(db, `likeLog/${uid}/${targetUid}/${today}`);
        const logSnap = await get(likeLogRef);
        if (logSnap.exists()) {
          return { success: false, message: '오늘은 이미 좋아요를 눌렀어요.' };
        }

        // 코인 지급 성공 후 likeLog 기록 (실패 시 재시도 가능)
        await addFriendCoins(uid, 5);
        try {
          await addFriendCoins(targetUid, 5);
        } catch (rewardError) {
          console.warn('[Firebase] target like friendCoins reward 실패:', rewardError);
          await set(likeLogRef, true);
          return {
            success: true,
            message: '좋아요! 친구 코인 5개를 받았어요. (상대 보상은 잠시 후 반영될 수 있어요)',
          };
        }
        await set(likeLogRef, true);
        return { success: true, message: '좋아요! 양쪽 모두 친구 코인 5개를 받았어요 💕' };
      } catch (e) {
        console.warn('[Firebase] likeFriendRoom 실패:', e);
        return { success: false, message: '좋아요 처리 중 오류가 발생했습니다.' };
      }
    },
    [uid, addFriendCoins]
  );

  // ── 13. 내 게임 ID 클립보드 복사 ─────────────
  const copyMyGameId = useCallback(async (): Promise<boolean> => {
    if (!gameId) return false;
    try {
      await navigator.clipboard.writeText(`#${gameId}`);
      return true;
    } catch {
      return false;
    }
  }, [gameId]);

  // ── 14. 친구 코인 실시간 구독 (소셜/상점 열릴 때만) ─
  const friendCoinsActive = socialActive || (options?.shopActive ?? false);

  useEffect(() => {
    if (!uid || !friendCoinsActive) return;
    const coinRef = ref(db, `players/${uid}/friendCoins`);
    onValue(coinRef, (snap) => {
      setFriendCoins(snap.exists() ? (snap.val() as number) : 0);
    });
    return () => off(coinRef);
  }, [uid, friendCoinsActive]);

  // ── 15. state 변경 시 자동 동기화 (tick-only 제외) ─
  useEffect(() => {
    if (!state || !uid || !gameId) {
      if (state) prevStateRef.current = state;
      return;
    }

    if (optionsRef.current?.restoreChoicePendingRef?.current) {
      prevStateRef.current = state;
      return;
    }

    if (isTickOnlyStateChange(state)) {
      prevStateRef.current = state;
      return;
    }

    const prev = prevStateRef.current;
    if (prev !== null && isLocalOnlyChange(prev, state)) {
      prevStateRef.current = state;
      return;
    }

    prevStateRef.current = state;

    if (prev !== null && isCriticalPetChange(prev, state)) {
      pendingStateRef.current = state;
      flushToCloud();
      return;
    }

    syncToCloud(state);
  }, [state, uid, gameId, syncToCloud, flushToCloud, isTickOnlyStateChange]);

  const markSyncedSavedAt = useCallback((savedAt: number) => {
    lastSyncedSavedAtRef.current = savedAt;
    setLastSynced(new Date(savedAt));
  }, []);

  return {
    uid,
    gameId,
    isAnonymous,
    providerIds,
    isGoogleLinked: isGoogleLinked(),
    ranking,
    visitors,
    friends,
    recommended,
    friendCoins,
    syncing,
    lastSynced,
    loadFromCloud,
    fetchCloudSaveByUid,
    syncToCloud,
    flushToCloud,
    forceSyncToCloud,
    forceSyncToCloudForUid,
    markSyncedSavedAt,
    visitFriend,
    fetchFriendPreview,
    likeFriendRoom,
    addFriendByGameId,
    removeFriend,
    copyMyGameId,
    addFriendCoins,
    spendFriendCoins,
    linkGoogleAccount,
    signInWithGoogleForRestore,
  };
}
