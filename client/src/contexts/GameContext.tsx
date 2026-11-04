/**
 * 게임 상태 Context
 * Cozy Nursery: 포근하고 생동감 있는 반려몬 육성 상태 관리
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
  claimMissionAdReward,
  createDailyMissions,
  needsMissionReset,
  purchaseItem,
  applyWallpaper,
  updateSinglePlacement,
  resetDecorPlacement,
  hideDecorInRoom,
  showDecorInRoom,
  rotateRoomDecor,
  adjustDecorZIndex,
  PurchaseResult,
  renamePet,
  saveGame,
  ShopItemDef,
  sleepPet,
  todayStr,
  touchPet,
  performSpecialAction,
  canPerformSpecialAction,
  getSpecialActionCooldownRemaining,
  getActiveSpecialActionId,
  getExpBoostRemainingMs,
  consumeRibbonEaseTicket as consumeRibbonEaseTicketState,
  processAttendance,
  AttendanceResult,
  applyLevelUpReward,
  applyEvolutionReward,
  applyCollectionReward,
  setPlayerNickname,
  applyBallGameReward,
  type BallGameRewardResult,
  applyPuzzleReward,
  type PuzzleGameRewardResult,
  applyRibbonReward,
  type RibbonGameRewardResult,
  applyLeafFlipReward,
  type LeafFlipRewardResult,
  applyDiscCatchReward,
  type DiscCatchRewardResult,
  exchangeRainbowFragments,
  exchangeSparkleFragments,
  type FragmentExchangeResult,
  grantPurchasedGems,
  type GrantPurchasedGemsResult,
  applyIntimacyMilestones,
  type IntimacyMilestoneClaim,
  advanceDailyChallengeOnTouch,
  advanceDailyChallengeOnPuzzle,
  advanceDailyChallengeOnBall,
  advanceDailyChallengeOnRibbon,
  advanceDailyChallengeOnLeafFlip,
  claimDailyChallengeReward,
  createDailyChallenges,
  needsDailyChallengeReset,
  advanceWeeklyGoalOnVisit,
  advanceWeeklyGoalOnMinigamePerfect,
  advanceWeeklyGoalOnPowerEvolve,
  claimWeeklyGoalReward,
  createWeeklyGoals,
  needsWeeklyGoalsReset,
  getWeekStr,
} from '@/lib/gameState';
import { useSound } from '@/hooks/useSound';
import {
  type EggColorId,
  type GachaEggId,
  getSelectEgg,
  getGachaEgg,
  applyExpPassive,
  applyIntimacyPassive,
  getStatusDecayMult,
  getFatigueRecoveryMult,
} from '@/lib/eggTypes';
import { useFirebaseSync, type RankingEntry, type VisitorEntry, type FriendEntry, type RecommendEntry, type FriendRoomPreview } from '@/hooks/useFirebaseSync';
import { useRemoteRoomLayouts } from '@/hooks/useRemoteRoomLayouts';
import { registerNickname, signInWithGoogleForRestore, type VerifyGooglePlayPurchaseResult } from '@/lib/firebase';
import { buildSavePreview, getSaveTimestamp } from '@/lib/savePreview';
import AccountRestoreChoiceModal, { type RestoreChoiceData } from '@/components/game/AccountRestoreChoiceModal';
import {
  applyChatMoodEffect,
  canUseChatDialogue,
  getChatRemainingToday,
  recordChatDialogue,
} from '@/lib/chatChoices';
import {
  canUsePuzzleHintDaily,
  canPayForPuzzleHint,
  getPuzzleHintCredits,
  getPuzzleHintsRemainingToday,
  payForPuzzleHint,
  recordPuzzleHintDaily,
} from '@/lib/puzzleHints';

export type PetAction = 'idle' | 'eating' | 'playing' | 'cleaning' | 'sleeping' | 'special';

interface GameContextType {
  state: GameState;
  feed: (itemId: string) => boolean;
  play: (itemId: string) => void;
  clean: () => void;
  sleep: () => void;
  touch: () => void;
  specialAction: () => boolean;
  specialActionCooldownMs: number;
  expBoostRemainingMs: number;
  activeSpecialActionId: string | null;
  purchase: (item: ShopItemDef) => PurchaseResult;
  applyRoomWallpaper: (wallpaperId: string) => void;
  moveRoomDecor: (decorId: string, x: number, y: number) => void;
  setRoomDecorScale: (decorId: string, scale: number) => void;
  flipRoomDecor: (decorId: string) => void;
  rotateRoomDecorAction: (decorId: string) => void;
  adjustRoomDecorZIndex: (decorId: string, delta: number) => void;
  resetRoomDecorPlacement: (decorId: string) => void;
  hideRoomDecor: (decorId: string) => void;
  showRoomDecor: (decorId: string) => void;
  purchaseFriendCoinItem: (item: ShopItemDef) => Promise<PurchaseResult>;
  grantIapGems: (
    purchaseKey: string,
    productId: string,
    amount: number,
    quantity?: number
  ) => GrantPurchasedGemsResult;
  applyVerifiedIapPurchase: (purchase: VerifyGooglePlayPurchaseResult) => void;
  exchangeRainbow: (exchangeId: string) => FragmentExchangeResult;
  exchangeSparkle: (exchangeId: string) => FragmentExchangeResult;
  rename: (newName: string) => void;
  setNickname: (nickname: string) => Promise<void>;
  claimMission: (missionId: string) => void;
  claimMissionAd: (missionId: string) => void;
  claimDailyChallenge: (challengeId: string) => void;
  claimWeeklyGoal: (goalId: string) => void;
  intimacyMilestoneToast: IntimacyMilestoneClaim | null;
  clearIntimacyMilestoneToast: () => void;
  newGamePlus: (gachaEgg?: GachaEggId) => void;
  setEggColor: (eggColor: EggColorId) => void;
  /** 재화·도감 유지, 반려몬·인벤토리 초기화 후 알 선택 스핀으로 이동 */
  resetPet: (onNavigate: () => void) => void;
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
  isAnonymous: boolean;
  providerIds: string[];
  isGoogleLinked: boolean;
  syncing: boolean;
  lastSynced: Date | null;
  ranking: RankingEntry[];
  visitors: VisitorEntry[];
  friends: FriendEntry[];
  recommended: RecommendEntry[];
  friendCoins: number;
  visitFriend: (targetUid: string, myNickname: string) => Promise<{ success: boolean; message: string }>;
  fetchFriendPreview: (targetUid: string) => Promise<FriendRoomPreview | null>;
  likeFriendRoom: (targetUid: string) => Promise<{ success: boolean; message: string }>;
  addFriendByGameId: (gameId: string) => Promise<{ success: boolean; message: string }>;
  removeFriend: (targetUid: string) => Promise<void>;
  copyMyGameId: () => Promise<boolean>;
  setFirebaseSocialActive: (active: boolean) => void;
  setFirebaseShopActive: (active: boolean) => void;
  linkGoogleAccount: () => Promise<{ success: boolean; message: string; uid?: string }>;
  restoreGoogleAccountWithChoice: () => Promise<{ success: boolean; message: string; uid?: string; needsChoice?: boolean }>;
  confirmRestoreChoice: (pick: 'local' | 'cloud') => Promise<void>;
  restoreChoice: RestoreChoiceData | null;
  restoreChoosing: boolean;
  setTutorialSeen: (gameId: string, seen: boolean) => void;
  applyChatDialogue: (moodDelta?: number) => boolean;
  chatRemainingToday: number;
  payForPuzzleHintWithGems: () => boolean;
  recordPuzzleHintFromAd: () => boolean;
  puzzleHintsRemainingToday: number;
  puzzleHintCredits: number;
  canPayForPuzzleHint: boolean;
  consumeRibbonEaseTicket: () => boolean;
  playBallGame: (reward: BallGameRewardResult) => void;
  playPuzzleGame: (reward: PuzzleGameRewardResult) => void;
  playRibbonGame: (reward: RibbonGameRewardResult) => void;
  playLeafFlipGame: (reward: LeafFlipRewardResult) => void;
  playDiscCatchGame: (reward: DiscCatchRewardResult) => void;
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
  const [cooldownTick, setCooldownTick] = useState(0);
  const [expBoostTick, setExpBoostTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickOnlyUpdateRef = useRef(false);
  const restoreChoicePendingRef = useRef(false);
  const restoreSnapshotsRef = useRef<{ local: GameState; cloud: GameState | null; googleUid: string } | null>(null);
  const [restoreChoice, setRestoreChoice] = useState<RestoreChoiceData | null>(null);
  const [restoreChoosing, setRestoreChoosing] = useState(false);
  const [firebaseSocialActive, setFirebaseSocialActive] = useState(false);
  const [firebaseShopActive, setFirebaseShopActive] = useState(false);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { play: playSound, playVoice } = useSound();
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null);
  const clearAttendanceResult = useCallback(() => setAttendanceResult(null), []);
  const [intimacyMilestoneToast, setIntimacyMilestoneToast] = useState<IntimacyMilestoneClaim | null>(null);
  const clearIntimacyMilestoneToast = useCallback(() => setIntimacyMilestoneToast(null), []);

  const finalizeWithIntimacy = useCallback((nextState: GameState): GameState => {
    const { newState, newlyClaimed } = applyIntimacyMilestones(nextState);
    if (newlyClaimed.length > 0) {
      setIntimacyMilestoneToast(newlyClaimed[newlyClaimed.length - 1]);
    }
    return newState;
  }, []);

  const mergeFromCloud = useCallback((cloudState: GameState) => {
    setState((prev) => {
      const localSaved = (prev as GameState & { _savedAt?: number })._savedAt ?? prev.lastSaveTime ?? 0;
      const cloudSaved = (cloudState as GameState & { _savedAt?: number })._savedAt ?? 0;
      if (cloudSaved > localSaved) {
        return calculateTimeSkip({
          ...cloudState,
          tutorialSeen: prev.tutorialSeen,
        });
      }
      return prev;
    });
  }, []);

  const handleCloudSynced = useCallback((savedAt: number) => {
    setState((prev) => {
      const next = { ...prev, lastSaveTime: savedAt };
      (next as GameState & { _savedAt?: number })._savedAt = savedAt;
      return next;
    });
  }, []);

  // Firebase 동기화 훅
  const {
    uid,
    gameId,
    isAnonymous,
    providerIds,
    isGoogleLinked,
    syncing,
    lastSynced,
    ranking,
    visitors,
    friends,
    recommended,
    friendCoins,
    visitFriend,
    fetchFriendPreview,
    likeFriendRoom,
    addFriendByGameId,
    removeFriend,
    copyMyGameId,
    loadFromCloud,
    fetchCloudSaveByUid,
    spendFriendCoins,
    linkGoogleAccount,
    forceSyncToCloud,
    forceSyncToCloudForUid,
    markSyncedSavedAt,
  } =
    useFirebaseSync(state, {
      tickOnlyUpdateRef,
      restoreChoicePendingRef,
      socialActive: firebaseSocialActive,
      shopActive: firebaseShopActive,
      localTutorialSeen: state.tutorialSeen,
      onCloudStateMerge: mergeFromCloud,
      onCloudSynced: handleCloudSynced,
    });

  useRemoteRoomLayouts();

  // 앱 시작 시 클라우드 데이터와 병합 (더 최근 데이터 우선) — 복원 선택 중에는 건너뜀
  useEffect(() => {
    if (!uid || restoreChoicePendingRef.current) return;
    loadFromCloud().then((cloudState) => {
      if (!cloudState || restoreChoicePendingRef.current) return;
      mergeFromCloud(cloudState);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const restoreGoogleAccountWithChoice = useCallback(async () => {
    const localSnapshot = calculateTimeSkip({ ...state });
    restoreChoicePendingRef.current = true;
    restoreSnapshotsRef.current = { local: localSnapshot, cloud: null, googleUid: '' };

    const result = await signInWithGoogleForRestore();
    if (!result.success || !result.uid) {
      restoreChoicePendingRef.current = false;
      restoreSnapshotsRef.current = null;
      return result;
    }

    const cloudState = await fetchCloudSaveByUid(result.uid, state.tutorialSeen, false);
    restoreSnapshotsRef.current = { local: localSnapshot, cloud: cloudState, googleUid: result.uid };

    if (!cloudState) {
      restoreChoicePendingRef.current = false;
      const next = calculateTimeSkip({ ...localSnapshot, tutorialSeen: state.tutorialSeen });
      setState(next);
      saveGame(next);
      await forceSyncToCloudForUid(result.uid, next);
      restoreSnapshotsRef.current = null;
      return {
        success: true,
        message: '클라우드 저장이 없어 현재 기기 데이터를 Google 계정에 연결했습니다.',
        uid: result.uid,
      };
    }

    setRestoreChoice({
      local: buildSavePreview(localSnapshot),
      cloud: buildSavePreview(cloudState),
    });

    return {
      success: true,
      message: '연결할 저장 데이터를 선택해 주세요.',
      uid: result.uid,
      needsChoice: true,
    };
  }, [state, fetchCloudSaveByUid, forceSyncToCloudForUid]);

  const confirmRestoreChoice = useCallback(async (pick: 'local' | 'cloud') => {
    const snapshots = restoreSnapshotsRef.current;
    if (!snapshots?.googleUid) return;

    setRestoreChoosing(true);
    try {
      if (pick === 'local') {
        const next = calculateTimeSkip({ ...snapshots.local, tutorialSeen: state.tutorialSeen });
        setState(next);
        saveGame(next);
        await forceSyncToCloudForUid(snapshots.googleUid, next);
      } else if (snapshots.cloud) {
        const next = calculateTimeSkip({ ...snapshots.cloud, tutorialSeen: state.tutorialSeen });
        setState(next);
        saveGame(next);
        markSyncedSavedAt(getSaveTimestamp(snapshots.cloud));
      }
    } finally {
      restoreChoicePendingRef.current = false;
      restoreSnapshotsRef.current = null;
      setRestoreChoice(null);
      setRestoreChoosing(false);
    }
  }, [state.tutorialSeen, forceSyncToCloudForUid, markSyncedSavedAt]);

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

  // 앱 백그라운드/종료 직전 로컬 저장 (알 선택 직후 종료 시 진행도 유실 방지)
  useEffect(() => {
    const persist = () => saveGame(state);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', persist);

    let removeAppListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) persist();
      }).then((handle) => {
        removeAppListener = () => void handle.remove();
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', persist);
      removeAppListener?.();
    };
  }, [state]);

  // 실시간 상태 감소 (1분마다)
  useEffect(() => {
    tickRef.current = setInterval(() => {
      tickOnlyUpdateRef.current = true;
      setState((prev) => calculateTimeSkip(prev));
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
    const evo = checkEvolution(withRewards.pet, { gachaEgg: withRewards.gachaEgg });
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

  const feed = useCallback((itemId: string): boolean => {
    const preview = feedPet(state, itemId);
    if (!preview.ok) return false;

    triggerAction('eating', 2500);
    playSound('eating');
    playVoice('eating');
    setState(prev => {
      const result = feedPet(prev, itemId);
      if (!result.ok) return prev;
      const next = result.state;
      const progressed = checkProgression(next);
      if (progressed.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(progressed, 'feed'));
    });
    return true;
  }, [state, checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  const play = useCallback((itemId: string) => {
    triggerAction('playing', 3000);
    playSound('playing');
    playVoice('playing');
    setState(prev => {
      const next = playWithPet(prev, itemId);
      const result = checkProgression(next);
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(result, 'play'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  /** 무지개공놀이 등급별 차등 보상 적용 */
  const playBallGame = useCallback((reward: BallGameRewardResult) => {
    triggerAction('playing', 3000);
    playSound('playing');
    playVoice('playing');
    setState(prev => {
      const next = applyBallGameReward(prev, reward);
      let result = checkProgression(next);
      result = advanceDailyChallengeOnBall(result, reward.score);
      if (reward.grade === 'perfect') {
        result = advanceWeeklyGoalOnMinigamePerfect(result);
      }
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(result, 'play'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  /** 별퍼즐 등급별 차등 보상 적용 */
  const playPuzzleGame = useCallback((reward: PuzzleGameRewardResult) => {
    triggerAction('playing', 3000);
    playSound('playing');
    playVoice('playing');
    setState(prev => {
      const next = applyPuzzleReward(prev, reward);
      let result = checkProgression(next);
      result = advanceDailyChallengeOnPuzzle(result, reward.moves);
      if (reward.grade === 'perfect') {
        result = advanceWeeklyGoalOnMinigamePerfect(result);
      }
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(result, 'play'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  /** 리본 리듬 등급별 차등 보상 적용 */
  const playRibbonGame = useCallback((reward: RibbonGameRewardResult) => {
    triggerAction('playing', 3000);
    playSound('playing');
    playVoice('playing');
    setState(prev => {
      const next = applyRibbonReward(prev, reward);
      let result = checkProgression(next);
      result = advanceDailyChallengeOnRibbon(result, reward.accuracy);
      if (reward.grade === 'perfect') {
        result = advanceWeeklyGoalOnMinigamePerfect(result);
      }
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(result, 'play'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  /** 잎사귀 뒤집기 등급별 차등 보상 적용 */
  const playLeafFlipGame = useCallback((reward: LeafFlipRewardResult) => {
    triggerAction('playing', 3000);
    playSound('playing');
    playVoice('playing');
    setState(prev => {
      const next = applyLeafFlipReward(prev, reward);
      let result = checkProgression(next);
      result = advanceDailyChallengeOnLeafFlip(result, reward.grade);
      if (reward.grade === 'perfect') {
        result = advanceWeeklyGoalOnMinigamePerfect(result);
      }
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(result, 'play'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  /** 원반 캐치 등급별 차등 보상 적용 */
  const playDiscCatchGame = useCallback((reward: DiscCatchRewardResult) => {
    triggerAction('playing', 3000);
    playSound('playing');
    playVoice('playing');
    setState(prev => {
      const next = applyDiscCatchReward(prev, reward);
      let result = checkProgression(next);
      if (reward.grade === 'perfect') {
        result = advanceWeeklyGoalOnMinigamePerfect(result);
      }
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(advanceMission(result, 'play'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  const clean = useCallback(() => {
    triggerAction('cleaning', 2500);
    playSound('cleaning');
    playVoice('cleaning');
    setState(prev => {
      const next = cleanPet(prev);
      return finalizeWithIntimacy(advanceMission(checkProgression(next), 'clean'));
    });
  }, [checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  const sleep = useCallback(() => {
    setIsSleeping(true);
    setCurrentAction('sleeping');
    playSound('sleeping');
    playVoice('sleeping');
    setState(prev => {
      const next = sleepPet(prev);
      return finalizeWithIntimacy(advanceMission(checkProgression(next), 'sleep'));
    });
    setTimeout(() => {
      setIsSleeping(false);
      setCurrentAction('idle');
    }, 3000);
  }, [checkProgression, playSound, playVoice, finalizeWithIntimacy]);

  const touch = useCallback(() => {
    playSound('touch');
    playVoice('touch');
    setState(prev => finalizeWithIntimacy(advanceDailyChallengeOnTouch(touchPet(prev))));
  }, [playSound, playVoice, finalizeWithIntimacy]);

  const specialAction = useCallback((): boolean => {
    if (!canPerformSpecialAction(state)) return false;

    triggerAction('special', 2800);
    playSound('playing');
    playVoice('happy');

    setState(prev => {
      const next = performSpecialAction(prev);
      if (!next) return prev;
      const result = checkProgression(next);
      if (result.pet.level > prev.pet.level) setTimeout(() => playVoice('levelup'), 500);
      return finalizeWithIntimacy(result);
    });
    return true;
  }, [state, checkProgression, triggerAction, playSound, playVoice, finalizeWithIntimacy]);

  // 특수 액션 쿨다운 UI 갱신 (1분마다)
  useEffect(() => {
    if (!state.gachaEgg || !state.lastSpecialActionAt) return;
    const interval = setInterval(() => setCooldownTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [state.gachaEgg, state.lastSpecialActionAt]);

  // EXP 2배 버프 카운트다운 UI 갱신 (1분마다, 만료 시 상태 정리)
  useEffect(() => {
    if (!state.expBoostUntil) return;
    const interval = setInterval(() => {
      setExpBoostTick(t => t + 1);
      setState(prev => {
        if (typeof prev.expBoostUntil === 'number' && prev.expBoostUntil <= Date.now()) {
          return { ...prev, expBoostUntil: undefined };
        }
        return prev;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [state.expBoostUntil]);

  const activeSpecialActionId = getActiveSpecialActionId(state);
  const specialActionCooldownMs = getSpecialActionCooldownRemaining(state);
  const expBoostRemainingMs = getExpBoostRemainingMs(state);
  void cooldownTick; // 쿨다운 표시 갱신 트리거
  void expBoostTick; // EXP 버프 표시 갱신 트리거

  const purchase = useCallback((item: ShopItemDef): PurchaseResult => {
    const result = purchaseItem(state, item);
    if (result.success) {
      setState(prev => {
        const r = purchaseItem(prev, item);
        if (r.success) return advanceMission(r.newState, 'shop');
        return prev;
      });
    }
    return result;
  }, [state]);

  const applyRoomWallpaper = useCallback((wallpaperId: string) => {
    setState(prev => applyWallpaper(prev, wallpaperId));
  }, []);

  const moveRoomDecor = useCallback((decorId: string, x: number, y: number) => {
    setState(prev => updateSinglePlacement(prev, decorId, { x, y }));
  }, []);

  const setRoomDecorScale = useCallback((decorId: string, scale: number) => {
    setState(prev => updateSinglePlacement(prev, decorId, { scale }));
  }, []);

  const flipRoomDecor = useCallback((decorId: string) => {
    setState(prev => {
      const existing = prev.room.placements?.find(p => p.id === decorId);
      const currentFlip = existing?.flipX ?? false;
      return updateSinglePlacement(prev, decorId, { flipX: !currentFlip });
    });
  }, []);

  const rotateRoomDecorAction = useCallback((decorId: string) => {
    setState(prev => rotateRoomDecor(prev, decorId, 90));
  }, []);

  const adjustRoomDecorZIndex = useCallback((decorId: string, delta: number) => {
    setState(prev => adjustDecorZIndex(prev, decorId, delta));
  }, []);

  const resetRoomDecorPlacement = useCallback((decorId: string) => {
    setState(prev => resetDecorPlacement(prev, decorId));
  }, []);

  const hideRoomDecor = useCallback((decorId: string) => {
    setState(prev => hideDecorInRoom(prev, decorId));
  }, []);

  const showRoomDecor = useCallback((decorId: string) => {
    setState(prev => showDecorInRoom(prev, decorId));
  }, []);

  const purchaseFriendCoinItem = useCallback(async (item: ShopItemDef): Promise<PurchaseResult> => {
    if (item.currency !== 'friendCoins') {
      return purchase(item);
    }
    if (friendCoins < item.price) {
      return { success: false, reason: 'insufficient_funds' };
    }

    const preview = purchaseItem(state, item, { friendCoinsBalance: friendCoins });
    if (!preview.success) return preview;

    const spent = await spendFriendCoins(item.price);
    if (!spent) {
      return { success: false, reason: 'insufficient_funds' };
    }

    setState(prev => {
      const r = purchaseItem(prev, item, { friendCoinsBalance: friendCoins });
      if (r.success) return advanceMission(r.newState, 'shop');
      return prev;
    });
    return preview;
  }, [state, friendCoins, spendFriendCoins, purchase]);

  const grantIapGems = useCallback((
    purchaseKey: string,
    productId: string,
    amount: number,
    quantity = 1
  ): GrantPurchasedGemsResult => {
    const result = grantPurchasedGems(state, purchaseKey, productId, amount, quantity);
    if (result.success) {
      setState(prev => {
        const current = grantPurchasedGems(prev, purchaseKey, productId, amount, quantity);
        return current.success ? current.newState : prev;
      });
    }
    return result;
  }, [state]);

  const applyVerifiedIapPurchase = useCallback((purchase: VerifyGooglePlayPurchaseResult) => {
    setState(prev => ({
      ...prev,
      gems: purchase.gems,
      iapPurchases: {
        ...(prev.iapPurchases ?? {}),
        [purchase.purchaseKey]: {
          productId: purchase.productId,
          amount: purchase.amount,
          quantity: purchase.quantity,
          grantedAt: purchase.grantedAt,
        },
      },
      lastSaveTime: Date.now(),
    }));
  }, []);

  const exchangeRainbow = useCallback((exchangeId: string): FragmentExchangeResult => {
    const result = exchangeRainbowFragments(state, exchangeId);
    if (result.success) {
      setState(prev => {
        const current = exchangeRainbowFragments(prev, exchangeId);
        return current.success ? current.newState : prev;
      });
    }
    return result;
  }, [state]);

  const exchangeSparkle = useCallback((exchangeId: string): FragmentExchangeResult => {
    const result = exchangeSparkleFragments(state, exchangeId);
    if (result.success) {
      setState(prev => {
        const current = exchangeSparkleFragments(prev, exchangeId);
        return current.success ? current.newState : prev;
      });
    }
    return result;
  }, [state]);

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

  const claimMissionAd = useCallback((missionId: string) => {
    setState(prev => claimMissionAdReward(prev, missionId));
  }, []);

  const claimDailyChallenge = useCallback((challengeId: string) => {
    setState(prev => claimDailyChallengeReward(prev, challengeId));
  }, []);

  const claimWeeklyGoal = useCallback((goalId: string) => {
    setState(prev => claimWeeklyGoalReward(prev, goalId));
  }, []);

  const visitFriendWithGoals = useCallback(async (targetUid: string, myNickname: string) => {
    const result = await visitFriend(targetUid, myNickname);
    if (result.success) {
      setState(prev => advanceWeeklyGoalOnVisit(prev));
    }
    return result;
  }, [visitFriend]);

  // 날짜가 바뀌면 미션·챌린지 자동 리셋 + 출석 보상 처리
  useEffect(() => {
    setState(prev => {
      let next = prev;
      if (needsMissionReset(next)) {
        next = { ...next, missions: { missions: createDailyMissions(), lastResetDate: todayStr() } };
      }
      if (needsDailyChallengeReset(next)) {
        next = { ...next, dailyChallenges: { challenges: createDailyChallenges(), lastResetDate: todayStr() } };
      }
      if (needsWeeklyGoalsReset(next)) {
        next = { ...next, weeklyGoals: { goals: createWeeklyGoals(), lastResetWeek: getWeekStr(new Date()) } };
      }
      const { newState, result } = processAttendance(next);
      if (result.isNewDay) {
        setTimeout(() => setAttendanceResult(result), 1500);
      }
      return newState;
    });
  }, []);

  // 뉴게임+: 코인/젬/도감은 유지, 반려몬·인벤토리·미션 초기화
  // gachaEgg: 뽑기로 얻은 알 ID (뉴게임+ 전용)
  const newGamePlus = useCallback((gachaEgg?: GachaEggId) => {
    setState(prev => {
      // 가챠 알 패시브 성향 보너스 계산
      const gachaDef = gachaEgg ? getGachaEgg(gachaEgg) : null;
      const traitBonus = gachaDef?.passiveEffect.traitBonus ?? {};
      return {
        ...INITIAL_GAME_STATE,
        coins: prev.coins,
        gems: prev.gems,
        iapPurchases: prev.iapPurchases ?? {},
        collection: prev.collection,
        room: prev.room ?? { wallpaper: 'default', furniture: [] },
        friendCoins: prev.friendCoins ?? 0,
        nickname: prev.nickname ?? '',
        attendance: prev.attendance ?? INITIAL_GAME_STATE.attendance,
        eggColor: null,          // 뉴게임+는 가챠 알 사용
        gachaEgg: gachaEgg ?? null,
        // 가챠 알 패시브 성향 보너스 즉시 적용
        pet: {
          ...INITIAL_GAME_STATE.pet,
          traits: {
            power:        (INITIAL_GAME_STATE.pet.traits.power        + (traitBonus.power        ?? 0)),
            intelligence: (INITIAL_GAME_STATE.pet.traits.intelligence + (traitBonus.intelligence ?? 0)),
            charm:        (INITIAL_GAME_STATE.pet.traits.charm        + (traitBonus.charm        ?? 0)),
            vitality:     (INITIAL_GAME_STATE.pet.traits.vitality     + (traitBonus.vitality     ?? 0)),
          },
        },
      };
    });
    setPendingEvolution(null);
    setIsSleeping(false);
  }, []);

  /** 새로 키우기 — 재화·도감·방·닉네임 유지, 반려몬·인벤토리·알 초기화 후 알 선택 스핀으로 이동 */
  const resetPet = useCallback((onNavigate: () => void) => {
    setState(prev => ({
      ...INITIAL_GAME_STATE,
      // ── 유지할 항목 ──────────────────────────────────────────────────────────
      coins: prev.coins,
      gems: prev.gems,
      iapPurchases: prev.iapPurchases ?? {},
      collection: prev.collection,
      claimedCollectionRewards: prev.claimedCollectionRewards,
      claimedEvolutionRewards: prev.claimedEvolutionRewards,
      room: prev.room,
      ownedWallpapers: prev.ownedWallpapers,
      friendCoins: prev.friendCoins,
      nickname: prev.nickname,
      attendance: prev.attendance,
      tutorialSeen: prev.tutorialSeen,
      // ── 알 선택 초기화 (룰렛 스핀 진입) ─────────────────────────────────────
      eggColor: null,
      gachaEgg: null,
      lastSaveTime: Date.now(),
    }));
    setPendingEvolution(null);
    setIsSleeping(false);
    // 상태 업데이트 후 화면 전환
    setTimeout(onNavigate, 50);
  }, []);

  /** 최초 알 선택 — eggColor 저장 + 선택형 알 패시브 성향 보너스 즉시 적용 */
  const setEggColor = useCallback((eggColor: EggColorId) => {
    setState(prev => {
      const eggDef = getSelectEgg(eggColor);
      const traitBonus = eggDef.passiveEffect.traitBonus ?? {};
      const next = {
        ...prev,
        eggColor,
        pet: {
          ...prev.pet,
          traits: {
            power:        prev.pet.traits.power        + (traitBonus.power        ?? 0),
            intelligence: prev.pet.traits.intelligence + (traitBonus.intelligence ?? 0),
            charm:        prev.pet.traits.charm        + (traitBonus.charm        ?? 0),
            vitality:     prev.pet.traits.vitality     + (traitBonus.vitality     ?? 0),
          },
        },
      };
      saveGame(next);
      return next;
    });
  }, []);

  const confirmEvolution = useCallback(() => {
    if (!pendingEvolution) return;
    setState(prev => {
      const evolved = evolvePet(prev, pendingEvolution);
      let withReward = applyEvolutionReward(evolved, pendingEvolution.newStage);
      const newSpecies = pendingEvolution.newSpecies;
      if (!prev.collection.includes(newSpecies)) {
        withReward = applyCollectionReward(withReward, newSpecies);
      }
      if (pendingEvolution.newSpecies === '파워몬') {
        withReward = advanceWeeklyGoalOnPowerEvolve(withReward);
      }
      return finalizeWithIntimacy(withReward);
    });
    setPendingEvolution(null);
  }, [pendingEvolution, finalizeWithIntimacy]);

  const resetPendingEvolution = useCallback(() => {
    setPendingEvolution(null);
  }, []);

  const setTutorialSeen = useCallback((gameId: string, seen: boolean) => {
    setState(prev => ({
      ...prev,
      tutorialSeen: { ...(prev.tutorialSeen ?? {}), [gameId]: seen },
    }));
  }, []);

  const applyChatDialogue = useCallback((moodDelta?: number): boolean => {
    if (!canUseChatDialogue(state)) return false;
    setState(prev => {
      let next = recordChatDialogue(prev);
      if (moodDelta) next = applyChatMoodEffect(next, moodDelta);
      return next;
    });
    return true;
  }, [state]);

  const chatRemainingToday = getChatRemainingToday(state);
  const puzzleHintsRemainingToday = getPuzzleHintsRemainingToday(state);
  const puzzleHintCredits = getPuzzleHintCredits(state);
  const canPayForPuzzleHintNow = canPayForPuzzleHint(state);

  const payForPuzzleHintWithGems = useCallback((): boolean => {
    let ok = false;
    setState(prev => {
      const next = payForPuzzleHint(prev);
      if (!next) return prev;
      ok = true;
      return next;
    });
    return ok;
  }, []);

  const recordPuzzleHintFromAd = useCallback((): boolean => {
    if (!canUsePuzzleHintDaily(state)) return false;
    setState(prev => {
      if (!canUsePuzzleHintDaily(prev)) return prev;
      return recordPuzzleHintDaily(prev);
    });
    return true;
  }, [state]);

  const consumeRibbonEaseTicketAction = useCallback((): boolean => {
    let ok = false;
    setState(prev => {
      const next = consumeRibbonEaseTicketState(prev);
      if (!next) return prev;
      ok = true;
      return next;
    });
    return ok;
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
        specialAction,
        specialActionCooldownMs,
        expBoostRemainingMs,
        activeSpecialActionId,
        purchase,
        applyRoomWallpaper,
        moveRoomDecor,
        setRoomDecorScale,
        flipRoomDecor,
        rotateRoomDecorAction,
        adjustRoomDecorZIndex,
        resetRoomDecorPlacement,
        hideRoomDecor,
        showRoomDecor,
        purchaseFriendCoinItem,
        grantIapGems,
        applyVerifiedIapPurchase,
        exchangeRainbow,
        exchangeSparkle,
        rename,
        setNickname,
      claimMission,
      claimMissionAd,
      claimDailyChallenge,
      claimWeeklyGoal,
      intimacyMilestoneToast,
      clearIntimacyMilestoneToast,
      newGamePlus,
      resetPet,
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
      isAnonymous,
      providerIds,
      isGoogleLinked,
      syncing,
      lastSynced,
      ranking,
      visitors,
      friends,
      recommended,
      friendCoins,
      visitFriend: visitFriendWithGoals,
      fetchFriendPreview,
      likeFriendRoom,
      addFriendByGameId,
      removeFriend,
      copyMyGameId,
      setFirebaseSocialActive,
      setFirebaseShopActive,
      linkGoogleAccount,
      restoreGoogleAccountWithChoice,
      confirmRestoreChoice,
      restoreChoice,
      restoreChoosing,
      setTutorialSeen,
      applyChatDialogue,
      chatRemainingToday,
      payForPuzzleHintWithGems,
      recordPuzzleHintFromAd,
      puzzleHintsRemainingToday,
      puzzleHintCredits,
      canPayForPuzzleHint: canPayForPuzzleHintNow,
      consumeRibbonEaseTicket: consumeRibbonEaseTicketAction,
      playBallGame,
      playPuzzleGame,
      playRibbonGame,
      playDiscCatchGame,
      playLeafFlipGame,
      setEggColor,
    }}
    >
      {children}
      {restoreChoice && (
        <AccountRestoreChoiceModal
          choice={restoreChoice}
          choosing={restoreChoosing}
          onSelect={(pick) => { void confirmRestoreChoice(pick); }}
        />
      )}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
