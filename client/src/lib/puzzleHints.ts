/**
 * puzzleHints.ts — 별 퍼즐 힌트 (광고/젬) 일일·등급 규칙
 */
import type { GameState } from './gameState';
import { todayStr } from './gameState';

export const PUZZLE_SHUFFLE_ITERATIONS = 100;
export const PUZZLE_HINT_GEM_COST = 2;
export const PUZZLE_HINT_PER_GAME_MAX = 3;
export const PUZZLE_HINT_DAILY_MAX = 10;
/** 이 횟수 이상 힌트 사용 시 등급 최대 normal */
export const PUZZLE_HINT_GRADE_CAP_THRESHOLD = 3;

export function getPuzzleHintDailyCount(state: GameState): number {
  const today = todayStr();
  const daily = state.puzzleHintDaily;
  if (!daily || daily.date !== today) return 0;
  return daily.count;
}

export function getPuzzleHintsRemainingToday(state: GameState): number {
  return Math.max(0, PUZZLE_HINT_DAILY_MAX - getPuzzleHintDailyCount(state));
}

export function canUsePuzzleHintDaily(state: GameState): boolean {
  return getPuzzleHintsRemainingToday(state) > 0;
}

export function recordPuzzleHintDaily(state: GameState): GameState {
  const today = todayStr();
  const prev = state.puzzleHintDaily;
  const count = prev?.date === today ? prev.count : 0;
  return {
    ...state,
    puzzleHintDaily: { date: today, count: count + 1 },
    lastSaveTime: Date.now(),
  };
}

export function trySpendGems(state: GameState, amount: number): GameState | null {
  if (amount <= 0 || state.gems < amount) return null;
  return {
    ...state,
    gems: state.gems - amount,
    lastSaveTime: Date.now(),
  };
}

export function getPuzzleHintCredits(state: GameState): number {
  return Math.max(0, state.puzzleHintCredits ?? 0);
}

/** 크레딧 우선, 없으면 젬 2개 차감 후 일일 힌트 기록 */
export function payForPuzzleHint(state: GameState): GameState | null {
  if (!canUsePuzzleHintDaily(state)) return null;

  const credits = getPuzzleHintCredits(state);
  if (credits > 0) {
    return recordPuzzleHintDaily({
      ...state,
      puzzleHintCredits: credits - 1,
      lastSaveTime: Date.now(),
    });
  }

  const spent = trySpendGems(state, PUZZLE_HINT_GEM_COST);
  if (!spent) return null;
  return recordPuzzleHintDaily(spent);
}

export function canPayForPuzzleHint(state: GameState): boolean {
  if (!canUsePuzzleHintDaily(state)) return false;
  return getPuzzleHintCredits(state) > 0 || state.gems >= PUZZLE_HINT_GEM_COST;
}
