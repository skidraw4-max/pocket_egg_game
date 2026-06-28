import { useEffect, useRef, useCallback, useState } from 'react';
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
import { db, ensureAnonymousAuth, onAuthChanged, ensureGameId, lookupUidByGameId } from '../lib/firebase';
import type { GameState } from '../lib/gameState';

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

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────
export function useFirebaseSync(state: GameState | null) {
  const [uid, setUid] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [recommended, setRecommended] = useState<RecommendEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. 익명 로그인 + 게임 ID 발급 ────────────
  useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      if (user) {
        setUid(user.uid);
        const gid = await ensureGameId(user.uid);
        setGameId(gid);
      } else {
        ensureAnonymousAuth().catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  // ── 2. 앱 시작 시 클라우드 데이터 불러오기 ──
  const loadFromCloud = useCallback(async (): Promise<GameState | null> => {
    if (!uid) return null;
    try {
      const snap = await get(ref(db, `players/${uid}/gameState`));
      if (snap.exists()) {
        const data = snap.val() as GameState;
        // 클라우드 데이터 정규화 (구버전 데이터 대응)
        if (!data.room) data.room = { wallpaper: 'default', furniture: [] };
        if (!data.room.furniture || !Array.isArray(data.room.furniture)) data.room.furniture = [];
        if (typeof data.friendCoins !== 'number') data.friendCoins = 0;
        if (typeof data.nickname !== 'string') data.nickname = '';
        if (typeof data.totalPlayDays !== 'number') data.totalPlayDays = 0;
        if (!data.attendance) data.attendance = { lastLoginDate: '', streak: 0, totalDays: 0, weeklyMissionsClaimed: false, lastWeekStr: '' };
        if (!data.claimedEvolutionRewards) data.claimedEvolutionRewards = [];
        if (!data.claimedCollectionRewards) data.claimedCollectionRewards = [];
        if (!data.missions) data.missions = { missions: [], lastResetDate: '' };
        if (!Array.isArray(data.inventory)) data.inventory = [];
        if (!Array.isArray(data.collection)) data.collection = [];
        if (!('eggColor' in data)) (data as GameState).eggColor = null;
        if (!('gachaEgg' in data)) (data as GameState).gachaEgg = null;
        return data;
      }
    } catch (e) {
      console.warn('[Firebase] loadFromCloud 실패:', e);
    }
    return null;
  }, [uid]);

  // ── 3. 클라우드에 저장 (디바운스 5초) ───────
  const syncToCloud = useCallback(
    (gameState: GameState) => {
      if (!uid || !gameId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSyncing(true);
        try {
          // 플레이어 닉네임 우선, 없으면 반려몬 이름 사용
          const nickname = (gameState.nickname && gameState.nickname.trim())
            ? gameState.nickname.trim()
            : (gameState.pet?.name ?? '알 주인');
          const level = gameState.pet?.level ?? 1;
          const stage = gameState.pet?.stage ?? 'egg';
          const coins = gameState.coins ?? 0;

          await set(ref(db, `players/${uid}/gameState`), {
            ...gameState,
            _savedAt: Date.now(),
          });

          // 랭킹 노드 업데이트 (gameId 포함)
          await set(ref(db, `ranking/${uid}`), {
            uid,
            gameId,
            nickname,
            level,
            stage,
            coins,
            updatedAt: Date.now(),
          });

          setLastSynced(new Date());
        } catch (e) {
          console.warn('[Firebase] syncToCloud 실패:', e);
        } finally {
          setSyncing(false);
        }
      }, 5000);
    },
    [uid, gameId]
  );

  // ── 4. 랭킹 실시간 구독 (상위 20명) ─────────
  useEffect(() => {
    if (!uid) return;
    const rankRef = query(
      ref(db, 'ranking'),
      orderByChild('level'),
      limitToLast(20)
    );
    onValue(rankRef, (snap) => {
      if (!snap.exists()) { setRanking([]); return; }
      const entries: RankingEntry[] = [];
      snap.forEach((child) => entries.push(child.val() as RankingEntry));
      entries.sort((a, b) => b.level - a.level || b.coins - a.coins);
      setRanking(entries);
    });
    return () => off(rankRef);
  }, [uid]);

  // ── 5. 방문자 실시간 구독 ────────────────────
  useEffect(() => {
    if (!uid) return;
    const visitRef = ref(db, `visits/${uid}`);
    onValue(visitRef, (snap) => {
      if (!snap.exists()) { setVisitors([]); return; }
      const list: VisitorEntry[] = [];
      snap.forEach((child) => list.push(child.val() as VisitorEntry));
      list.sort((a, b) => b.visitedAt - a.visitedAt);
      setVisitors(list.slice(0, 20));
    });
    return () => off(visitRef);
  }, [uid]);

  // ── 6. 친구 목록 실시간 구독 ─────────────────
  useEffect(() => {
    if (!uid) return;
    const friendRef = ref(db, `friends/${uid}`);
    onValue(friendRef, (snap) => {
      if (!snap.exists()) { setFriends([]); return; }
      const list: FriendEntry[] = [];
      snap.forEach((child) => list.push(child.val() as FriendEntry));
      list.sort((a, b) => b.addedAt - a.addedAt);
      setFriends(list);
    });
    return () => off(friendRef);
  }, [uid]);

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
      const targetNickname = targetProfile?.nickname ?? '알 주인';
      const targetLevel = targetProfile?.level ?? 1;
      const targetStage = targetProfile?.stage ?? 'egg';
      const targetGameId = targetProfile?.gameId ?? normalized;

      const myNickname = (state?.nickname && state.nickname.trim())
        ? state.nickname.trim()
        : (state?.pet?.name ?? '알 주인');
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
        await addFriendCoins(targetUid, 50);

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

  // ── 9. 친구 코인 지급 (Firebase 트랜잭션) ────
  const addFriendCoins = useCallback(async (targetUid: string, amount: number) => {
    const coinRef = ref(db, `players/${targetUid}/friendCoins`);
    await runTransaction(coinRef, (current) => (current ?? 0) + amount);
  }, []);

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

      // 1일 1회 방문 보상 제한 체크
      const today = new Date().toISOString().slice(0, 10);
      const visitLogRef = ref(db, `visitLog/${uid}/${targetUid}/${today}`);
      const logSnap = await get(visitLogRef);
      const alreadyVisited = logSnap.exists();

      try {
        await set(ref(db, `visits/${targetUid}/${uid}`), {
          uid, nickname: myNickname, visitedAt: Date.now(),
        });

        if (!alreadyVisited) {
          await set(visitLogRef, true);
          await addFriendCoins(uid, 10); // 방문자 친구 코인 10개
          return { success: true, message: '방문 완료! 친구 코인 10개를 받았습니다. 🎁' };
        }
        return { success: true, message: '방문 완료! (오늘 방문 보상은 이미 수령했습니다)' };
      } catch (e) {
        console.warn('[Firebase] visitFriend 실패:', e);
        return { success: false, message: '방문 중 오류가 발생했습니다.' };
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

  // ── 14. 친구 코인 실시간 구독 ────────────────
  const [friendCoins, setFriendCoins] = useState<number>(0);
  useEffect(() => {
    if (!uid) return;
    const coinRef = ref(db, `players/${uid}/friendCoins`);
    onValue(coinRef, (snap) => {
      setFriendCoins(snap.exists() ? (snap.val() as number) : 0);
    });
    return () => off(coinRef);
  }, [uid]);

  // ── 15. state 변경 시 자동 동기화 ─────────────
  useEffect(() => {
    if (state && uid && gameId) syncToCloud(state);
  }, [state, uid, gameId, syncToCloud]);

  return {
    uid,
    gameId,
    ranking,
    visitors,
    friends,
    recommended,
    friendCoins,
    syncing,
    lastSynced,
    loadFromCloud,
    syncToCloud,
    visitFriend,
    addFriendByGameId,
    removeFriend,
    copyMyGameId,
    addFriendCoins,
  };
}
