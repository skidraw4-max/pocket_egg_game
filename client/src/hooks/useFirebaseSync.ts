import { useEffect, useRef, useCallback, useState } from 'react';
import {
  ref,
  set,
  get,
  push,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import { db, ensureAnonymousAuth, onAuthChanged } from '../lib/firebase';
import type { GameState } from '../lib/gameState';

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────
export interface RankingEntry {
  uid: string;
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
  nickname: string;
  level: number;
  stage: string;
  addedAt: number;
}

export interface FriendProfile {
  uid: string;
  nickname: string;
  level: number;
  stage: string;
  coins: number;
}

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────
export function useFirebaseSync(state: GameState | null) {
  const [uid, setUid] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. 익명 로그인 ──────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      if (user) {
        setUid(user.uid);
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
      if (snap.exists()) return snap.val() as GameState;
    } catch (e) {
      console.warn('[Firebase] loadFromCloud 실패:', e);
    }
    return null;
  }, [uid]);

  // ── 3. 클라우드에 저장 (디바운스 5초) ───────
  const syncToCloud = useCallback(
    (gameState: GameState) => {
      if (!uid) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSyncing(true);
        try {
          const nickname = gameState.pet?.name ?? '알 주인';
          const level = gameState.level ?? 1;
          const stage = gameState.pet?.stage ?? 'egg';
          const coins = gameState.coins ?? 0;

          await set(ref(db, `players/${uid}/gameState`), {
            ...gameState,
            _savedAt: Date.now(),
          });

          // 랭킹 노드 업데이트
          await set(ref(db, `ranking/${uid}`), {
            uid,
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
    [uid]
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
      if (!snap.exists()) {
        setRanking([]);
        return;
      }
      const entries: RankingEntry[] = [];
      snap.forEach((child) => {
        entries.push(child.val() as RankingEntry);
      });
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
      if (!snap.exists()) {
        setVisitors([]);
        return;
      }
      const list: VisitorEntry[] = [];
      snap.forEach((child) => {
        list.push(child.val() as VisitorEntry);
      });
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
      if (!snap.exists()) {
        setFriends([]);
        return;
      }
      const list: FriendEntry[] = [];
      snap.forEach((child) => {
        list.push(child.val() as FriendEntry);
      });
      list.sort((a, b) => b.addedAt - a.addedAt);
      setFriends(list);
    });
    return () => off(friendRef);
  }, [uid]);

  // ── 7. UID로 플레이어 프로필 조회 ─────────────
  const lookupPlayer = useCallback(async (targetUid: string): Promise<FriendProfile | null> => {
    if (!targetUid.trim()) return null;
    try {
      // 랭킹 노드에서 공개 정보 조회
      const snap = await get(ref(db, `ranking/${targetUid}`));
      if (snap.exists()) {
        const data = snap.val();
        return {
          uid: data.uid,
          nickname: data.nickname,
          level: data.level,
          stage: data.stage,
          coins: data.coins,
        };
      }
    } catch (e) {
      console.warn('[Firebase] lookupPlayer 실패:', e);
    }
    return null;
  }, []);

  // ── 8. 친구 추가 ─────────────────────────────
  const addFriend = useCallback(
    async (targetUid: string): Promise<{ success: boolean; message: string; profile?: FriendProfile }> => {
      if (!uid) return { success: false, message: '로그인 중입니다. 잠시 후 다시 시도해 주세요.' };
      if (uid === targetUid) return { success: false, message: '자기 자신은 친구 추가할 수 없습니다.' };

      // 이미 친구인지 확인
      const alreadySnap = await get(ref(db, `friends/${uid}/${targetUid}`));
      if (alreadySnap.exists()) return { success: false, message: '이미 친구 목록에 있습니다.' };

      // 대상 플레이어 존재 확인
      const profile = await lookupPlayer(targetUid);
      if (!profile) return { success: false, message: '해당 플레이어 ID를 찾을 수 없습니다.\n게임을 한 번 이상 플레이한 플레이어만 검색됩니다.' };

      try {
        const myNickname = state?.pet?.name ?? '알 주인';
        const myLevel = state?.level ?? 1;
        const myStage = state?.pet?.stage ?? 'egg';

        // 내 친구 목록에 상대방 추가
        await set(ref(db, `friends/${uid}/${targetUid}`), {
          uid: targetUid,
          nickname: profile.nickname,
          level: profile.level,
          stage: profile.stage,
          addedAt: Date.now(),
        });

        // 상대방 친구 목록에 나 추가 (맞팔)
        await set(ref(db, `friends/${targetUid}/${uid}`), {
          uid,
          nickname: myNickname,
          level: myLevel,
          stage: myStage,
          addedAt: Date.now(),
        });

        return { success: true, message: `${profile.nickname}님과 친구가 되었습니다! 🎉`, profile };
      } catch (e) {
        console.warn('[Firebase] addFriend 실패:', e);
        return { success: false, message: '친구 추가 중 오류가 발생했습니다.' };
      }
    },
    [uid, state, lookupPlayer]
  );

  // ── 9. 친구 삭제 ─────────────────────────────
  const removeFriend = useCallback(
    async (targetUid: string): Promise<void> => {
      if (!uid) return;
      try {
        await remove(ref(db, `friends/${uid}/${targetUid}`));
        // 상대방 목록에서도 나를 제거
        await remove(ref(db, `friends/${targetUid}/${uid}`));
      } catch (e) {
        console.warn('[Firebase] removeFriend 실패:', e);
      }
    },
    [uid]
  );

  // ── 10. 친구 방문 기록 남기기 ─────────────────
  const visitFriend = useCallback(
    async (targetUid: string, myNickname: string): Promise<{ success: boolean; message: string }> => {
      if (!uid) return { success: false, message: '로그인 중입니다.' };
      if (uid === targetUid) return { success: false, message: '자기 자신은 방문할 수 없습니다.' };

      try {
        await set(ref(db, `visits/${targetUid}/${uid}`), {
          uid,
          nickname: myNickname,
          visitedAt: Date.now(),
        });
        return { success: true, message: '방문 완료! 친구에게 알림이 전송됩니다.' };
      } catch (e) {
        console.warn('[Firebase] visitFriend 실패:', e);
        return { success: false, message: '방문 중 오류가 발생했습니다.' };
      }
    },
    [uid]
  );

  // ── 11. 내 UID 클립보드 복사 ──────────────────
  const copyMyUid = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    try {
      await navigator.clipboard.writeText(uid);
      return true;
    } catch {
      return false;
    }
  }, [uid]);

  // ── 12. state 변경 시 자동 동기화 ─────────────
  useEffect(() => {
    if (state && uid) syncToCloud(state);
  }, [state, uid, syncToCloud]);

  return {
    uid,
    ranking,
    visitors,
    friends,
    syncing,
    lastSynced,
    loadFromCloud,
    syncToCloud,
    visitFriend,
    addFriend,
    removeFriend,
    lookupPlayer,
    copyMyUid,
  };
}
