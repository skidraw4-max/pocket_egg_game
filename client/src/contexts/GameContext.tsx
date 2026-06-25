/**
 * 게임 상태 Context
 * Cozy Nursery: 포근하고 생동감 있는 반려몬 육성 상태 관리
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  calculateTimeSkip,
  checkEvolution,
  checkLevelUp,
  cleanPet,
  evolvePet,
  EvolutionResult,
  feedPet,
  GameState,
  INITIAL_GAME_STATE,
  loadGame,
  playWithPet,
  advanceMission,
  claimMissionReward,
  createDailyMissions,
  needsMissionReset,
  purchaseItem,
  PurchaseResult,
  renamePet,
  saveGame,
  ShopItemDef,
  sleepPet,
  todayStr,
  touchPet,
  processAttendance,
  AttendanceResult,
  applyLevelUpReward,
  applyEvolutionReward,
  applyCollectionReward,
  setPlayerNickname,
} from '@/lib/gameState';
import { useSound } from '@/hooks/useSound';
import { useFirebaseSync, type RankingEntry, type VisitorEntry, type FriendEntry, type RecommendEntry } from '@/hooks/useFirebaseSync';
import { registerNickname } from '@/lib/firebase';

export type PetAction = 'idle' | 'eating' | 'playing' | 'cleaning' | 'sleeping';

interface GameContextType {
  state: GameState;
  feed: (itemId: string) => void;
  play: (itemId: string) => void;
  clean: () => void;
  sleep: () => void;
  touch: () => void;
  purchase: (item: ShopItemDef) => PurchaseResult;
  rename: (newName: string) => void;
  setNickname: (nickname: string) => Promise<void>;
  claimMission: (missionId: string) => void;
  newGamePlus: () => void;
  pendingEvolution: EvolutionResult | null;
  confirmEvolution: () => void;
  resetPendingEvolution: () => void;
  isSleeping: boolean;
  setIsSleeping: (v: boolean) => void;
  currentAction: PetAction;
  attendanceResult: AttendanceResult | null;
  clearAttendanceResult: () => void;
  // Firebase 소셜
  uid: string | null;
  gameId: string | null;
  syncing: boolean;
  lastSynced: Date | null;
  ranking: RankingEntry[];
  visitors: VisitorEntry[];
  friends: FriendEntry[];
  recommended: RecommendEntry[];
  friendCoins: number;
  visitFriend: (targetUid: string, myNickname: string) => Promise<{ success: boolean; message: string }>;
  addFriendByGameId: (gameId: string) => Promise<{ success: boolean; message: string }>;
  removeFriend: (targetUid: string) => Promise<void>;
  copyMyGameId: () => Promise<boolean>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadGame();
    if (saved) {
      return calculateTimeSkip(saved);
    }
    return { ...INITIAL_GAME_STATE, lastSaveTime: Date.now() };
  });

  const [pendingEvolution, setPendingEvolution] = useState<EvolutionResult | null>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [currentAction, setCurrentAction] = useState<PetAction>('idle');
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { play: playSound } = useSound();
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null);
  const clearAttendanceResult = useCallback(() => setAttendanceResult(null), []);

  // Firebase 동기화 훅
  const { uid, gameId, syncing, lastSynced, ranking, visitors, friends, recommended, friendCoins, visitFriend, addFriendByGameId, removeFriend, copyMyGameId, loadFromCloud } =
    useFirebaseSync(state);

  // 앱 시작 시 클라우드 데이터와 병합 (더 최근 데이터 우선)
  useEffect(() => {
    if (!uid) return;
    loadFromCloud().then((cloudState) => {
      if (!cloudState) return;
      const localSaved = (state as any)._savedAt ?? 0;
      const cloudSaved = (cloudState as any)._savedAt ?? 0;
      if (cloudSaved > localSaved) {
        setState(calculateTimeSkip(cloudState));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 액션 모션 타이머 (일정 시간 후 idle로 복귀)
  const triggerAction = useCallback((action: PetAction, duration = 2500) => {
    setCurrentAction(action);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setCurrentAction('idle');
    }, duration);
  }, []);

  // 자동 저장 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame(state);
    }, 30000);
    return () => clearInterval(interval);
  }, [state]);

  // 실시간 상태 감소 (1분마다)
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setState(prev => {
        const updated = calculateTimeSkip(prev);
        return updated;
      });
    }, 60000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // 레벨업 & 진화 체크 (레벨업 보상 + 도감 보상 포함)
  const checkProgression = useCallback((newState: GameState): GameState => {
    const before = newState.pet.level;
    const leveled = checkLevelUp(newState);
    const after = leveled.pet.level;

    // 레벨업 코인 보상
    let withRewards = leveled;
    if (after > before) {
      for (let lv = before + 1; lv <= after; lv++) {
        withRewards = applyLevelUpReward(withRewards, lv);
      }
    }

    // 진화 체크
    const evo = checkEvolution(withRewards.pet);
    if (evo) {
      setPendingEvolution(evo);
    }

    // 도감 등록 보상 (새 종족이 추가된 경우)
    const prevCollection = newState.collection;
    const newCollection = withRewards.collection;
    for (const species of newCollection) {
      if (!prevCollection.includes(species)) {
        withRewards = applyCollectionReward(withRewards, species);
      }
    }

    return withRewards;
  }, []);

  const feed = useCallback((itemId: string) => {
    triggerAction('eating', 2500);
    playSound('eating');
    setState(prev => {
      const next = feedPet(prev, itemId);
      return advanceMission(checkProgression(next), 'feed');
    });
  }, [checkProgression, triggerAction, playSound]);

  const play = useCallback((itemId: string) => {
    triggerAction('playing', 3000);
    playSound('playing');
    setState(prev => {
      const next = playWithPet(prev, itemId);
      return advanceMission(checkProgression(next), 'play');
    });
  }, [checkProgression, triggerAction, playSound]);

  const clean = useCallback(() => {
    triggerAction('cleaning', 2500);
    playSound('cleaning');
    setState(prev => {
      const next = cleanPet(prev);
      return advanceMission(checkProgression(next), 'clean');
    });
  }, [checkProgression, triggerAction, playSound]);

  const sleep = useCallback(() => {
    setIsSleeping(true);
    setCurrentAction('sleeping');
    playSound('sleeping');
    setState(prev => {
      const next = sleepPet(prev);
      return advanceMission(checkProgression(next), 'sleep');
    });
    setTimeout(() => {
      setIsSleeping(false);
      setCurrentAction('idle');
    }, 3000);
  }, [checkProgression, playSound]);

  const touch = useCallback(() => {
    playSound('touch');
    setState(prev => touchPet(prev));
  }, [playSound]);

  const purchase = useCallback((item: ShopItemDef): PurchaseResult => {
    let result: PurchaseResult = { success: false, reason: 'insufficient_funds' };
    setState(prev => {
      result = purchaseItem(prev, item);
      if (result.success) return advanceMission(result.newState, 'shop');
      return prev;
    });
    return result;
  }, []);

  const rename = useCallback((newName: string) => {
    setState(prev => renamePet(prev, newName));
  }, []);

  const setNickname = useCallback(async (nickname: string) => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    // Firebase 닉네임 인덱스 등록 (이전 닉네임 자동 해제)
    if (uid) {
      const prevNickname = state.nickname || undefined;
      const ok = await registerNickname(trimmed, uid, prevNickname);
      if (!ok) {
        // 등록 실패 시 (race condition 등)에도 로컈에는 저장 (이미 UI에서 사전 차단)
        console.warn('[Nickname] Firebase 등록 실패 — 로컈에만 저장');
      }
    }

    setState(prev => setPlayerNickname(prev, trimmed));
  }, [uid, state.nickname]);

  const claimMission = useCallback((missionId: string) => {
    setState(prev => checkProgression(claimMissionReward(prev, missionId)));
  }, [checkProgression]);

  // 날짜가 바뀌면 미션 자동 리셋 + 출석 보상 처리
  useEffect(() => {
    setState(prev => {
      // 미션 리셋
      const withMissions = needsMissionReset(prev)
        ? { ...prev, missions: { missions: createDailyMissions(), lastResetDate: todayStr() } }
        : prev;
      // 출석 보상
      const { newState, result } = processAttendance(withMissions);
      if (result.isNewDay) {
        setTimeout(() => setAttendanceResult(result), 1500);
      }
      return newState;
    });
  }, []);

  // 뉴게임+: 코인/젬/도감은 유지, 반려몬·인벤토리·미션 초기화
  const newGamePlus = useCallback(() => {
    setState(prev => ({
      ...INITIAL_GAME_STATE,
      coins: prev.coins,
      gems: prev.gems,
      collection: prev.collection,
      room: prev.room, // 가구도 유지
    }));
    setPendingEvolution(null);
    setIsSleeping(false);
  }, []);

  const confirmEvolution = useCallback(() => {
    if (!pendingEvolution) return;
    setState(prev => {
      const evolved = evolvePet(prev, pendingEvolution);
      return applyEvolutionReward(evolved, pendingEvolution.newStage);
    });
    setPendingEvolution(null);
  }, [pendingEvolution]);

  const resetPendingEvolution = useCallback(() => {
    setPendingEvolution(null);
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        feed,
        play,
        clean,
        sleep,
        touch,
        purchase,
        rename,
        setNickname,
        claimMission,
        newGamePlus,
        pendingEvolution,
        confirmEvolution,
        resetPendingEvolution,
      isSleeping,
      setIsSleeping,
      currentAction,
      attendanceResult,
      clearAttendanceResult,
      uid,
      gameId,
      syncing,
      lastSynced,
      ranking,
      visitors,
      friends,
      recommended,
      friendCoins,
      visitFriend,
      addFriendByGameId,
      removeFriend,
      copyMyGameId,
    }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
