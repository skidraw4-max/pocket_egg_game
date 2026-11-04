/** 가구 ID별 표시 메타 (아이콘·이름·애니메이션) */
export type DecorAnimation = 'float' | 'sway' | 'twinkle' | 'none';

export interface DecorMeta {
  icon: string;
  name: string;
  animation: DecorAnimation;
}

export const DECOR_REGISTRY: Record<string, DecorMeta> = {
  decor_flower: { icon: '🌸', name: '꽃 화분', animation: 'sway' },
  decor_star: { icon: '🌟', name: '별 조명', animation: 'twinkle' },
  decor_sofa: { icon: '🛋️', name: '푹신한 소파', animation: 'none' },
  decor_bookshelf: { icon: '📚', name: '동화나라 책장', animation: 'none' },
  decor_rainbow: { icon: '🌈', name: '무지개 창문', animation: 'float' },
  decor_cloud_bed: { icon: '☁️', name: '구름 침대', animation: 'float' },
  social_golden_stand: { icon: '🏆', name: '황금 알 받침대', animation: 'twinkle' },
  social_photo_frame: { icon: '🖼️', name: '친구 사진 액자', animation: 'none' },
  social_rainbow_carpet: { icon: '🌈', name: '무지개 카펫', animation: 'none' },
  social_star_mobile: { icon: '✨', name: '별빛 모빌', animation: 'float' },
  social_crown_cushion: { icon: '👑', name: '왕관 쿠션', animation: 'sway' },
  social_trophy: { icon: '🥇', name: '소셜 트로피', animation: 'twinkle' },
  decor_forest_mushroom_lamp: { icon: '🍄', name: '버섯 램프', animation: 'twinkle' },
  decor_ocean_coral_shelf: { icon: '🪸', name: '산호 선반', animation: 'none' },
  decor_cloud_moon_nightlight: { icon: '🌙', name: '달 밤등', animation: 'twinkle' },
  decor_candy_cake_display: { icon: '🍰', name: '케이크 진열장', animation: 'none' },
  decor_egg_nest: { icon: '🪺', name: '알 둥지', animation: 'sway' },
  decor_ocean_bubble_lamp: { icon: '🫧', name: '거품 조명', animation: 'float' },
  decor_candy_lollipop_tree: { icon: '🍭', name: '롤리팝 나무', animation: 'sway' },
  decor_pet_bowl: { icon: '🥣', name: '반려몬 밥그릇', animation: 'none' },
};

export function getDecorMeta(decorId: string): DecorMeta | undefined {
  return DECOR_REGISTRY[decorId];
}
