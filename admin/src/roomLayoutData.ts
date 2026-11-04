/** Admin Room Layout Editor — 공유 데이터 (client roomLayouts.ts와 동기) */
export const WALLPAPER_OPTIONS = [
  { id: 'default', label: '기본 Nursery', url: '/wallpapers/wallpaper_default.webp' },
  { id: 'wallpaper_forest', label: '마법 숲', url: '/wallpapers/wallpaper_forest.webp' },
  { id: 'wallpaper_ocean', label: '바닷속', url: '/wallpapers/wallpaper_ocean.webp' },
  { id: 'wallpaper_cloud', label: '구름 성', url: '/wallpapers/wallpaper_cloud.webp' },
  { id: 'wallpaper_candy', label: '과자 가게', url: '/wallpapers/wallpaper_candy.webp' },
] as const;

export const DECOR_OPTIONS = [
  { id: 'decor_flower', icon: '🌸', name: '꽃 화분' },
  { id: 'decor_star', icon: '🌟', name: '별 조명' },
  { id: 'decor_sofa', icon: '🛋️', name: '소파' },
  { id: 'decor_bookshelf', icon: '📚', name: '책장' },
  { id: 'decor_rainbow', icon: '🌈', name: '무지개 창문' },
  { id: 'decor_cloud_bed', icon: '☁️', name: '구름 침대' },
  { id: 'social_golden_stand', icon: '🏆', name: '황금 받침대' },
  { id: 'social_photo_frame', icon: '🖼️', name: '사진 액자' },
  { id: 'social_rainbow_carpet', icon: '🌈', name: '무지개 카펫' },
  { id: 'social_star_mobile', icon: '✨', name: '별빛 모빌' },
  { id: 'social_crown_cushion', icon: '👑', name: '왕관 쿠션' },
  { id: 'social_trophy', icon: '🥇', name: '트로피' },
] as const;

export interface LayoutPlacement {
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  flipX?: boolean;
  zIndex?: number;
}

export type DecorLayoutMap = Record<string, LayoutPlacement>;
