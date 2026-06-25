import { useEffect, useRef, useCallback, useState } from 'react';
import {
  ref,
  set,
  get,
  onValue,
  off,
  serverTimestamp,
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

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────
export function useFirebaseSync(state: GameState | null) {
  const [uid, setUid] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
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
      if (!snap.exists()) return;
      const entries: RankingEntry[] = [];
      snap.forEach((child) => {
        entries.push(child.val() as RankingEntry);
      });
      // 내림차순 정렬
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
      if (!snap.exists()) return;
      const list: VisitorEntry[] = [];
      snap.forEach((child) => {
        list.push(child.val() as VisitorEntry);
      });
      list.sort((a, b) => b.visitedAt - a.visitedAt);
      setVisitors(list.slice(0, 20)); // 최근 20명
    });
    return () => off(visitRef);
  }, [uid]);

  // ── 6. 친구 방문 기록 남기기 ─────────────────
  const visitFriend = useCallback(
    async (targetUid: string, myNickname: string) => {
      if (!uid || uid === targetUid) return;
      await set(ref(db, `visits/${targetUid}/${uid}`), {
        uid,
        nickname: myNickname,
        visitedAt: Date.now(),
      });
    },
    [uid]
  );

  // ── 7. state 변경 시 자동 동기화 ─────────────
  useEffect(() => {
    if (state && uid) syncToCloud(state);
  }, [state, uid, syncToCloud]);

  return {
    uid,
    ranking,
    visitors,
    syncing,
    lastSynced,
    loadFromCloud,
    syncToCloud,
    visitFriend,
  };
}
