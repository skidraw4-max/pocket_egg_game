/** TNK Factory Publisher (Display) — Pocket Egg Android */

export const TNK_PUBLISHER_ID =
  (import.meta.env.VITE_TNK_PUBLISHER_ID as string) || '5030a02060e1c9cffc9c1e040a000c08';

/** 서버·S2S 검증용 (앱 SDK 초기화에는 Manifest tnk_pub_id 사용) */
export const TNK_APP_KEY =
  (import.meta.env.VITE_TNK_APP_KEY as string) || 'b8bd38e140638488a25ab980b61d86dd';

export const TNK_PLACEMENT_MISSION = 'reward_mission';
export const TNK_PLACEMENT_PUZZLE_HINT = 'reward_puzzle_hint';

export type TnkRewardedPlacement =
  | typeof TNK_PLACEMENT_MISSION
  | typeof TNK_PLACEMENT_PUZZLE_HINT;
