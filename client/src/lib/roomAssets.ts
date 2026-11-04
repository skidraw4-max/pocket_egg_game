/** wallpaper ID → 이미지 URL (단일 소스, 로컬 public 우선) */

import { publicAssetUrl } from './publicAssets';



export const WALLPAPER_URLS: Record<string, string> = {

  default: publicAssetUrl('wallpapers/wallpaper_default.webp'),

  wallpaper_forest: publicAssetUrl('wallpapers/wallpaper_forest.webp'),

  wallpaper_ocean: publicAssetUrl('wallpapers/wallpaper_ocean.webp'),

  wallpaper_cloud: publicAssetUrl('wallpapers/wallpaper_cloud.webp'),

  wallpaper_candy: publicAssetUrl('wallpapers/wallpaper_candy.webp'),

};



/** @deprecated 외부 CDN — 오프라인·만료 대비 로컬 URL 사용 */

export const WALLPAPER_URLS_FALLBACK: Record<string, string> = {

  wallpaper_forest:

    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/EDyFLiIKoVTNidnh.png',

  wallpaper_ocean:

    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/fpjUTdQSftHkbLXj.png',

  wallpaper_cloud:

    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/jQMljEkJnwaQEIjS.png',

  wallpaper_candy:

    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/vuxdWHKrUrCnFAUo.png',

};



export const WALLPAPER_CATALOG = [

  {

    id: 'wallpaper_forest',

    name: '마법 숲의 방',

    icon: '🌿',

    price: 200,

    currency: 'coins' as const,

    description: '반딧불이와 버섯이 빛나는 신비로운 숲',

  },

  {

    id: 'wallpaper_ocean',

    name: '바닷속 아지트',

    icon: '🐚',

    price: 200,

    currency: 'coins' as const,

    description: '산호와 조개로 꾸며진 해저 방',

  },

  {

    id: 'wallpaper_cloud',

    name: '구름 성 침실',

    icon: '🌈',

    price: 20,

    currency: 'gems' as const,

    description: '무지개와 별빛이 가득한 하늘 성',

  },

  {

    id: 'wallpaper_candy',

    name: '달콤한 과자 가게',

    icon: '🍭',

    price: 20,

    currency: 'gems' as const,

    description: '사탕과 케이크로 가득 찬 달콤한 방',

  },

] as const;



export const WALLPAPER_IDS = [

  'default',

  'wallpaper_forest',

  'wallpaper_ocean',

  'wallpaper_cloud',

  'wallpaper_candy',

] as const;



export type WallpaperId = (typeof WALLPAPER_IDS)[number];



export function getWallpaperUrl(wallpaperId: string): string {

  return WALLPAPER_URLS[wallpaperId] ?? WALLPAPER_URLS.default;

}



export function getWallpaperPreviewUrl(wallpaperId: string): string {

  return getWallpaperUrl(wallpaperId);

}



/** Room Stage 기준 해상도 (9:16) */

export const ROOM_REF_WIDTH = 1080;

export const ROOM_REF_HEIGHT = 1920;

/** 기본 가구 이모지 크기 (rem) — scale 1.0 기준 */

export const ROOM_REF_FONT_REM = 8;



/** stage 너비 대비 rem (viewport font-size 독립) */

export function decorFontSizeRem(stageWidthPx: number, scale: number): string {

  const px = (stageWidthPx / ROOM_REF_WIDTH) * ROOM_REF_FONT_REM * 16 * scale;

  return `${Math.max(12, px)}px`;

}

