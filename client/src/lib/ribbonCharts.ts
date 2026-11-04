/**
 * ribbonCharts.ts — 리본 리듬 곡·노트 차트 (BPM 기반)
 */
import { RIBBON_BGM_KEYS, type BGMKey } from '@/hooks/useSound';

export type RibbonLane = 0 | 1 | 2;

export interface RibbonChartNote {
  id: number;
  lane: RibbonLane;
  hitTimeMs: number;
}

export interface RibbonTrackConfig {
  key: BGMKey;
  title: string;
  bpm: number;
  /** BGM 시작 기준 첫 강박 보정 (ms) — 곡별 튜닝 */
  offsetMs: number;
  durationMs: number;
  countInBeats: number;
}

export const RIBBON_GAME_DURATION_MS = 45_000;

export const JUDGE_WINDOWS = {
  PERFECT_MS: 45,
  GOOD_MS: 90,
  MISS_MS: 120,
  APPROACH_MS: 1400,
  TOUCH_LATENCY_MS: 35,
} as const;

export type JudgeWindows = {
  PERFECT_MS: number;
  GOOD_MS: number;
  MISS_MS: number;
  APPROACH_MS: number;
  TOUCH_LATENCY_MS: number;
};

export type RibbonTrackKey = (typeof RIBBON_BGM_KEYS)[number];

export const RIBBON_TRACKS: Record<RibbonTrackKey, RibbonTrackConfig> = {
  'ribbon-1': {
    key: 'ribbon-1',
    title: 'Ribbon Pop #1',
    bpm: 120,
    offsetMs: 0,
    durationMs: RIBBON_GAME_DURATION_MS,
    countInBeats: 4,
  },
  'ribbon-2': {
    key: 'ribbon-2',
    title: 'Ribbon Pop #2',
    bpm: 128,
    offsetMs: 0,
    durationMs: RIBBON_GAME_DURATION_MS,
    countInBeats: 4,
  },
  'ribbon-3': {
    key: 'ribbon-3',
    title: 'Ribbon Pop #3',
    bpm: 110,
    offsetMs: 0,
    durationMs: RIBBON_GAME_DURATION_MS,
    countInBeats: 4,
  },
};

/** 2박마다 1노트, 레인 순환 + 가끔 연속 패턴 */
export function generateEasyChart(track: RibbonTrackConfig): RibbonChartNote[] {
  const beatMs = 60_000 / track.bpm;
  const startMs = track.countInBeats * beatMs;
  const notes: RibbonChartNote[] = [];
  const laneCycle: RibbonLane[] = [1, 0, 2, 1, 2, 0];
  let id = 1;
  let laneIdx = 0;

  for (let t = startMs; t < track.durationMs - beatMs; t += beatMs * 2) {
    notes.push({
      id: id++,
      lane: laneCycle[laneIdx % laneCycle.length],
      hitTimeMs: Math.round(t),
    });
    laneIdx += 1;

    // 8박마다 2연타 (인접 레인)
    if (laneIdx % 4 === 0 && t + beatMs < track.durationMs) {
      const baseLane = laneCycle[(laneIdx - 1) % laneCycle.length];
      const nextLane = ((baseLane + 1) % 3) as RibbonLane;
      notes.push({
        id: id++,
        lane: nextLane,
        hitTimeMs: Math.round(t + beatMs),
      });
    }
  }

  return notes;
}

export function getBeatMs(bpm: number): number {
  return 60_000 / bpm;
}

export function getTrackChart(
  trackKey: RibbonTrackKey,
  easeApplied: boolean,
): { track: RibbonTrackConfig; notes: RibbonChartNote[]; approachMs: number; judge: JudgeWindows } {
  const track = RIBBON_TRACKS[trackKey];
  const approachMs = easeApplied
    ? JUDGE_WINDOWS.APPROACH_MS * 1.2
    : JUDGE_WINDOWS.APPROACH_MS;
  const judge: JudgeWindows = easeApplied
    ? {
        PERFECT_MS: Math.round(JUDGE_WINDOWS.PERFECT_MS * 1.15),
        GOOD_MS: Math.round(JUDGE_WINDOWS.GOOD_MS * 1.15),
        MISS_MS: Math.round(JUDGE_WINDOWS.MISS_MS * 1.15),
        APPROACH_MS: JUDGE_WINDOWS.APPROACH_MS,
        TOUCH_LATENCY_MS: JUDGE_WINDOWS.TOUCH_LATENCY_MS,
      }
    : { ...JUDGE_WINDOWS };

  return {
    track,
    notes: generateEasyChart(track),
    approachMs,
    judge,
  };
}
