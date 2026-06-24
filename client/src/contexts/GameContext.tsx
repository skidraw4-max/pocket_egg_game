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
} from '@/lib/gameState';
import { useSound } from '@/hooks/useSound';

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
  claimMission: (missionId: string) => void;
  pendingEvolution: EvolutionResult | null;
  confirmEvolution: () => void;
  resetPendingEvolution: () => void;
  isSleeping: boolean;
  setIsSleeping: (v: boolean) => void;
  currentAction: PetAction;
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

  // 레벨업 & 진화 체크
  const checkProgression = useCallback((newState: GameState): GameState => {
    const leveled = checkLevelUp(newState);
    const evo = checkEvolution(leveled.pet);
    if (evo) {
      setPendingEvolution(evo);
    }
    return leveled;
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

  const claimMission = useCallback((missionId: string) => {
    setState(prev => claimMissionReward(prev, missionId));
  }, []);

  // 날짜가 바뀌면 미션 자동 리셋
  useEffect(() => {
    setState(prev => {
      if (!needsMissionReset(prev)) return prev;
      return {
        ...prev,
        missions: { missions: createDailyMissions(), lastResetDate: todayStr() },
      };
    });
  }, []);

  const confirmEvolution = useCallback(() => {
    if (!pendingEvolution) return;
    setState(prev => evolvePet(prev, pendingEvolution));
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
        claimMission,
        pendingEvolution,
        confirmEvolution,
        resetPendingEvolution,
        isSleeping,
        setIsSleeping,
        currentAction,
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
