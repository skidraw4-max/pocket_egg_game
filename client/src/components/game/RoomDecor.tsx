/**
 * RoomDecor - 방 꾸미기 가구 렌더링 레이어
 * Cozy Nursery: 구매한 가구를 방 배경 위에 배치
 *
 * 레이어 구조:
 *  - 배경 이미지: z-0
 *  - 가구 (배경 가구): z-[2]  ← 캐릭터(z-10)보다 반드시 낮게
 *  - 콘텐츠 레이어(TopBar, PetDisplay 등): z-10
 */

interface DecorPlacement {
  /** 이모지 */
  icon: string;
  /** 가구 이름 */
  name: string;
  /** 좌측 기준 위치 (%) */
  left: string;
  /** 상단 기준 위치 (%) */
  top: string;
  /**
   * 이모지 폰트 크기 (rem 단위 직접 지정)
   * 캐릭터 이미지가 약 w-56(14rem=224px) 수준이므로
   * 가구는 6rem~10rem 범위로 설정해 존재감을 확보
   */
  fontSize: string;
  /** 추가 인라인 스타일 */
  extraStyle?: React.CSSProperties;
  /** 애니메이션 */
  animation?: 'float' | 'sway' | 'twinkle' | 'none';
}

/** 가구 ID별 배치 정의 */
const DECOR_PLACEMENTS: Record<string, DecorPlacement> = {
  // ── 일반 가구 ──────────────────────────────────────────────
  decor_flower: {
    icon: '🌸',
    name: '꽃 화분',
    left: '4%',
    top: '48%',
    fontSize: '7rem',
    animation: 'sway',
  },
  decor_star: {
    icon: '🌟',
    name: '별 조명',
    left: '76%',
    top: '8%',
    fontSize: '6rem',
    animation: 'twinkle',
  },
  decor_sofa: {
    icon: '🛋️',
    name: '푹신한 소파',
    left: '55%',
    top: '52%',
    fontSize: '9rem',
    animation: 'none',
  },
  decor_bookshelf: {
    icon: '📚',
    name: '동화나라 책장',
    left: '2%',
    top: '16%',
    fontSize: '8rem',
    animation: 'none',
  },
  decor_rainbow: {
    icon: '🌈',
    name: '무지개 창문',
    left: '68%',
    top: '22%',
    fontSize: '8rem',
    animation: 'float',
  },
  decor_cloud_bed: {
    icon: '☁️',
    name: '구름 침대',
    left: '10%',
    top: '56%',
    fontSize: '9rem',
    animation: 'float',
  },

  // ── 소셜 전용 가구 ─────────────────────────────────────────
  social_golden_stand: {
    icon: '🏆',
    name: '황금 알 받침대',
    left: '72%',
    top: '50%',
    fontSize: '7rem',
    animation: 'twinkle',
  },
  social_photo_frame: {
    icon: '🖼️',
    name: '친구 사진 액자',
    left: '3%',
    top: '30%',
    fontSize: '7rem',
    animation: 'none',
  },
  social_rainbow_carpet: {
    icon: '🌈',
    name: '무지개 카펫',
    left: '30%',
    top: '72%',
    fontSize: '10rem',
    animation: 'none',
    extraStyle: { transform: 'scaleY(0.45) scaleX(1.3)', transformOrigin: 'bottom center' },
  },
  social_star_mobile: {
    icon: '✨',
    name: '별빛 모빌',
    left: '42%',
    top: '5%',
    fontSize: '6rem',
    animation: 'float',
  },
  social_crown_cushion: {
    icon: '👑',
    name: '왕관 쿠션',
    left: '60%',
    top: '62%',
    fontSize: '6rem',
    animation: 'sway',
  },
  social_trophy: {
    icon: '🥇',
    name: '소셜 트로피',
    left: '78%',
    top: '48%',
    fontSize: '7rem',
    animation: 'twinkle',
  },
};

interface RoomDecorProps {
  furniture: string[];
}

export default function RoomDecor({ furniture }: RoomDecorProps) {
  if (!furniture || !Array.isArray(furniture) || furniture.length === 0) return null;

  return (
    <>
      {furniture.map(id => {
        const p = DECOR_PLACEMENTS[id];
        if (!p) return null;

        const animClass =
          p.animation === 'float'   ? 'animate-decor-float'   :
          p.animation === 'sway'    ? 'animate-decor-sway'    :
          p.animation === 'twinkle' ? 'animate-decor-twinkle' : '';

        return (
          <div
            key={id}
            className={`absolute pointer-events-none select-none ${animClass}`}
            style={{
              left: p.left,
              top: p.top,
              fontSize: p.fontSize,
              lineHeight: 1,
              /* 캐릭터(z-10)보다 반드시 낮은 z-index로 배경에 배치 */
              zIndex: 2,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.22))',
              ...p.extraStyle,
            }}
            title={p.name}
          >
            {p.icon}
          </div>
        );
      })}

      <style>{`
        @keyframes decor-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes decor-sway {
          0%, 100% { transform: rotate(-5deg) scale(1); }
          50%       { transform: rotate(5deg) scale(1.05); }
        }
        @keyframes decor-twinkle {
          0%, 100% { opacity: 1;    transform: scale(1); }
          30%       { opacity: 0.55; transform: scale(0.88); }
          60%       { opacity: 1;    transform: scale(1.12); }
        }
        .animate-decor-float   { animation: decor-float   3s ease-in-out infinite; }
        .animate-decor-sway    { animation: decor-sway    4s ease-in-out infinite; }
        .animate-decor-twinkle { animation: decor-twinkle 2.5s ease-in-out infinite; }
      `}</style>
    </>
  );
}
