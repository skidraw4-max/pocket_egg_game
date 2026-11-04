/**
 * Unity LevelPlay (ironSource) — Pocket Egg Android
 * @see https://platform.ironsrc.com/
 */

export const LEVELPLAY_APP_KEY =
  (import.meta.env.VITE_LEVELPLAY_APP_KEY as string) || '276929ead';

export const LEVELPLAY_REWARDED_AD_UNIT_ID =
  (import.meta.env.VITE_LEVELPLAY_REWARDED_AD_UNIT_ID as string) || '66nmvwyaeynp7mux';

/** 내부·QA: true, Play 스토어: false */
export const LEVELPLAY_USE_TEST_ADS =
  import.meta.env.VITE_LEVELPLAY_USE_TEST_ADS === 'true' ||
  import.meta.env.VITE_LEVELPLAY_USE_TEST_ADS === '1';

export const LEVELPLAY_ANDROID_PACKAGE = 'com.pocketegg.game';

/** LevelPlay 대시보드 Placements (리포트·S2S 구분용) */
export const LEVELPLAY_PLACEMENT_PUZZLE_HINT = 'puzzle_hint';
export const LEVELPLAY_PLACEMENT_MISSION_GEM = 'mission_gem';

export type LevelPlayRewardedPlacement =
  | typeof LEVELPLAY_PLACEMENT_MISSION_GEM
  | typeof LEVELPLAY_PLACEMENT_PUZZLE_HINT;
