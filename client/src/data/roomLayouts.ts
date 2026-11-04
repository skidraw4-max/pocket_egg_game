import type { WallpaperId } from '@/lib/roomAssets';

/** wallpaper별 preset 배치 (0~1 normalized, scale 1 = 8rem 기준) */
export interface LayoutPlacement {
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  flipX?: boolean;
  /** 1=바닥 · 2=가구 · 3=벽 · 4=천장 */
  zIndex?: number;
}

export type DecorLayoutMap = Record<string, LayoutPlacement>;

/** Cozy Nursery (default) — 바닥 y≈0.52~0.72, 벽 y≈0.14~0.32, 천장 y≈0.05~0.10 */
const DEFAULT_LAYOUT: DecorLayoutMap = {
  decor_flower: { x: 0.06, y: 0.62, scale: 0.82, zIndex: 2 },
  decor_star: { x: 0.82, y: 0.10, scale: 0.72, zIndex: 4 },
  decor_sofa: { x: 0.58, y: 0.58, scale: 1.05, zIndex: 2 },
  decor_bookshelf: { x: 0.06, y: 0.22, scale: 0.95, zIndex: 3 },
  decor_rainbow: { x: 0.72, y: 0.24, scale: 0.92, zIndex: 3 },
  decor_cloud_bed: { x: 0.14, y: 0.60, scale: 1.05, zIndex: 2 },
  social_golden_stand: { x: 0.74, y: 0.56, scale: 0.82, zIndex: 2 },
  social_photo_frame: { x: 0.08, y: 0.34, scale: 0.78, zIndex: 3 },
  social_rainbow_carpet: { x: 0.48, y: 0.78, scale: 1.15, scaleX: 1.35, scaleY: 0.42, zIndex: 1 },
  social_star_mobile: { x: 0.44, y: 0.07, scale: 0.72, zIndex: 4 },
  social_crown_cushion: { x: 0.62, y: 0.66, scale: 0.72, zIndex: 2 },
  social_trophy: { x: 0.84, y: 0.52, scale: 0.78, zIndex: 2 },
  decor_forest_mushroom_lamp: { x: 0.24, y: 0.68, scale: 0.78, zIndex: 2 },
  decor_ocean_coral_shelf: { x: 0.76, y: 0.26, scale: 0.88, zIndex: 3 },
  decor_cloud_moon_nightlight: { x: 0.36, y: 0.08, scale: 0.70, zIndex: 4 },
  decor_candy_cake_display: { x: 0.70, y: 0.30, scale: 0.86, zIndex: 3 },
  decor_egg_nest: { x: 0.44, y: 0.72, scale: 0.88, zIndex: 2 },
  decor_ocean_bubble_lamp: { x: 0.88, y: 0.16, scale: 0.72, zIndex: 4 },
  decor_candy_lollipop_tree: { x: 0.30, y: 0.56, scale: 0.92, zIndex: 2 },
  decor_pet_bowl: { x: 0.52, y: 0.80, scale: 0.65, zIndex: 1 },
};

/** 마법 숲 — 왼쪽 나무 선반·이끼 바닥, 오른쪽 숲 창 */
const FOREST_LAYOUT: DecorLayoutMap = {
  ...DEFAULT_LAYOUT,
  decor_flower: { x: 0.10, y: 0.68, scale: 0.85, zIndex: 2 },
  decor_star: { x: 0.78, y: 0.12, scale: 0.70, zIndex: 4 },
  decor_sofa: { x: 0.54, y: 0.62, scale: 1.0, zIndex: 2 },
  decor_bookshelf: { x: 0.08, y: 0.26, scale: 0.92, zIndex: 3 },
  decor_rainbow: { x: 0.70, y: 0.28, scale: 0.88, zIndex: 3 },
  decor_cloud_bed: { x: 0.18, y: 0.64, scale: 1.0, zIndex: 2 },
  social_photo_frame: { x: 0.12, y: 0.38, scale: 0.75, zIndex: 3 },
  social_rainbow_carpet: { x: 0.46, y: 0.82, scale: 1.1, scaleX: 1.4, scaleY: 0.38, zIndex: 1 },
  social_star_mobile: { x: 0.50, y: 0.09, scale: 0.68, zIndex: 4 },
  social_crown_cushion: { x: 0.60, y: 0.70, scale: 0.70, zIndex: 2 },
  decor_forest_mushroom_lamp: { x: 0.18, y: 0.72, scale: 0.82, zIndex: 2 },
  decor_ocean_coral_shelf: { x: 0.08, y: 0.30, scale: 0.90, zIndex: 3 },
};

/** 바닷속 — 산호 선반·모래 바닥(더 아래) */
const OCEAN_LAYOUT: DecorLayoutMap = {
  ...DEFAULT_LAYOUT,
  decor_flower: { x: 0.08, y: 0.70, scale: 0.80, zIndex: 2 },
  decor_star: { x: 0.86, y: 0.14, scale: 0.68, zIndex: 4 },
  decor_sofa: { x: 0.56, y: 0.66, scale: 0.98, zIndex: 2 },
  decor_bookshelf: { x: 0.05, y: 0.30, scale: 0.90, zIndex: 3 },
  decor_rainbow: { x: 0.68, y: 0.22, scale: 0.85, zIndex: 3 },
  decor_cloud_bed: { x: 0.16, y: 0.68, scale: 1.02, zIndex: 2 },
  social_golden_stand: { x: 0.76, y: 0.60, scale: 0.80, zIndex: 2 },
  social_rainbow_carpet: { x: 0.50, y: 0.84, scale: 1.12, scaleX: 1.45, scaleY: 0.35, zIndex: 1 },
  social_star_mobile: { x: 0.42, y: 0.08, scale: 0.70, zIndex: 4 },
  social_trophy: { x: 0.82, y: 0.56, scale: 0.76, zIndex: 2 },
  decor_ocean_coral_shelf: { x: 0.06, y: 0.28, scale: 0.92, zIndex: 3 },
  decor_ocean_bubble_lamp: { x: 0.90, y: 0.12, scale: 0.74, zIndex: 4 },
};

/** 구름 성 — 천장 높고 바닥 구름(y 더 위) */
const CLOUD_LAYOUT: DecorLayoutMap = {
  ...DEFAULT_LAYOUT,
  decor_flower: { x: 0.08, y: 0.58, scale: 0.80, zIndex: 2 },
  decor_star: { x: 0.80, y: 0.08, scale: 0.74, zIndex: 4 },
  decor_sofa: { x: 0.52, y: 0.54, scale: 1.0, zIndex: 2 },
  decor_bookshelf: { x: 0.10, y: 0.20, scale: 0.88, zIndex: 3 },
  decor_rainbow: { x: 0.74, y: 0.18, scale: 0.90, zIndex: 3 },
  decor_cloud_bed: { x: 0.20, y: 0.56, scale: 1.08, zIndex: 2 },
  social_photo_frame: { x: 0.06, y: 0.30, scale: 0.76, zIndex: 3 },
  social_rainbow_carpet: { x: 0.48, y: 0.74, scale: 1.08, scaleX: 1.3, scaleY: 0.40, zIndex: 1 },
  social_star_mobile: { x: 0.46, y: 0.05, scale: 0.74, zIndex: 4 },
  social_crown_cushion: { x: 0.64, y: 0.60, scale: 0.68, zIndex: 2 },
  decor_cloud_moon_nightlight: { x: 0.48, y: 0.06, scale: 0.74, zIndex: 4 },
  decor_egg_nest: { x: 0.22, y: 0.58, scale: 0.90, zIndex: 2 },
};

/** 과자 가게 — 선반·카운터 구도, 대칭 배치 */
const CANDY_LAYOUT: DecorLayoutMap = {
  ...DEFAULT_LAYOUT,
  decor_flower: { x: 0.10, y: 0.64, scale: 0.84, zIndex: 2 },
  decor_star: { x: 0.84, y: 0.12, scale: 0.72, zIndex: 4 },
  decor_sofa: { x: 0.60, y: 0.56, scale: 1.02, zIndex: 2 },
  decor_bookshelf: { x: 0.08, y: 0.24, scale: 0.94, zIndex: 3 },
  decor_rainbow: { x: 0.66, y: 0.26, scale: 0.90, zIndex: 3 },
  decor_cloud_bed: { x: 0.14, y: 0.58, scale: 1.0, zIndex: 2 },
  social_golden_stand: { x: 0.70, y: 0.54, scale: 0.80, zIndex: 2 },
  social_photo_frame: { x: 0.14, y: 0.36, scale: 0.78, zIndex: 3 },
  social_rainbow_carpet: { x: 0.50, y: 0.80, scale: 1.18, scaleX: 1.38, scaleY: 0.40, zIndex: 1 },
  social_crown_cushion: { x: 0.58, y: 0.64, scale: 0.74, zIndex: 2 },
  social_trophy: { x: 0.86, y: 0.50, scale: 0.78, zIndex: 2 },
  decor_candy_cake_display: { x: 0.08, y: 0.28, scale: 0.90, zIndex: 3 },
  decor_candy_lollipop_tree: { x: 0.68, y: 0.58, scale: 0.96, zIndex: 2 },
  decor_pet_bowl: { x: 0.46, y: 0.78, scale: 0.68, zIndex: 1 },
};

export const ROOM_LAYOUTS: Record<WallpaperId, DecorLayoutMap> = {
  default: DEFAULT_LAYOUT,
  wallpaper_forest: FOREST_LAYOUT,
  wallpaper_ocean: OCEAN_LAYOUT,
  wallpaper_cloud: CLOUD_LAYOUT,
  wallpaper_candy: CANDY_LAYOUT,
};

/** Firebase Admin에서 저장한 원격 preset (런타임 merge) */
let remoteLayoutOverrides: Partial<Record<string, DecorLayoutMap>> = {};

export function setRemoteRoomLayoutOverrides(
  overrides: Partial<Record<string, DecorLayoutMap>> | null | undefined,
): void {
  remoteLayoutOverrides = overrides && typeof overrides === 'object' ? overrides : {};
}

export function getRemoteRoomLayoutOverrides(): Partial<Record<string, DecorLayoutMap>> {
  return remoteLayoutOverrides;
}

export function getLayoutPlacement(
  wallpaperId: string,
  decorId: string,
): LayoutPlacement | undefined {
  const remote = remoteLayoutOverrides[wallpaperId]?.[decorId];
  if (remote) return remote;

  const wp = (wallpaperId in ROOM_LAYOUTS ? wallpaperId : 'default') as WallpaperId;
  return ROOM_LAYOUTS[wp][decorId] ?? ROOM_LAYOUTS.default[decorId];
}

export const Z_INDEX_FLOOR = 1;
export const Z_INDEX_FURNITURE = 2;
export const Z_INDEX_WALL = 3;
export const Z_INDEX_CEILING = 4;
