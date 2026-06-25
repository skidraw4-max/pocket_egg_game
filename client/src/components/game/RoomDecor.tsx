/**
 * RoomDecor - 방 꾸미기 가구 렌더링 레이어
 * Cozy Nursery: 구매한 가구를 방 배경 위에 배치
 */

interface DecorPlacement {
  /** 이모지 또는 이미지 */
  icon: string;
  /** 가구 이름 */
  name: string;
  /** 좌측 기준 위치 (%) */
  left: string;
  /** 상단 기준 위치 (%) */
  top: string;
  /** 이모지 크기 */
  size: string;
  /** 추가 Tailwind 클래스 */
  className?: string;
  /** 애니메이션 스타일 */
  animation?: 'float' | 'sway' | 'twinkle' | 'none';
}

/** 가구 ID별 배치 정의 */
const DECOR_PLACEMENTS: Record<string, DecorPlacement> = {
  decor_flower: {
    icon: '🌸',
    name: '꽃 화분',
    left: '8%',
    top: '52%',
    size: 'text-5xl',
    animation: 'sway',
  },
  decor_star: {
    icon: '🌟',
    name: '별 조명',
    left: '78%',
    top: '12%',
    size: 'text-4xl',
    animation: 'twinkle',
  },
  decor_sofa: {
    icon: '🛋️',
    name: '폠신한 소파',
    left: '60%',
    top: '55%',
    size: 'text-5xl',
    animation: 'none',
  },
  decor_bookshelf: {
    icon: '📚',
    name: '동화나라 체르장',
    left: '5%',
    top: '20%',
    size: 'text-5xl',
    animation: 'none',
  },
  decor_rainbow: {
    icon: '🌈',
    name: '무지개 창문',
    left: '72%',
    top: '28%',
    size: 'text-4xl',
    animation: 'float',
  },
  decor_cloud_bed: {
    icon: '☁️',
    name: '구름 침대',
    left: '15%',
    top: '60%',
    size: 'text-5xl',
    animation: 'float',
  },
};

interface RoomDecorProps {
  furniture: string[];
}

export default function RoomDecor({ furniture }: RoomDecorProps) {
  // furniture가 undefined/null인 경우 방어 처리 (구버전 저장 데이터 대응)
  if (!furniture || !Array.isArray(furniture) || furniture.length === 0) return null;

  return (
    <>
      {furniture.map(id => {
        const placement = DECOR_PLACEMENTS[id];
        if (!placement) return null;

        return (
          <div
            key={id}
            className={`absolute pointer-events-none select-none ${placement.size} ${placement.className ?? ''} ${
              placement.animation === 'float'    ? 'animate-decor-float'   :
              placement.animation === 'sway'     ? 'animate-decor-sway'    :
              placement.animation === 'twinkle'  ? 'animate-decor-twinkle' : ''
            }`}
            style={{
              left: placement.left,
              top: placement.top,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
              zIndex: 5,
            }}
            title={placement.name}
          >
            {placement.icon}
          </div>
        );
      })}

      <style>{`
        @keyframes decor-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes decor-sway {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50%       { transform: rotate(4deg) scale(1.04); }
        }
        @keyframes decor-twinkle {
          0%, 100% { opacity: 1;   transform: scale(1); }
          30%       { opacity: 0.5; transform: scale(0.85); }
          60%       { opacity: 1;   transform: scale(1.1); }
        }
        .animate-decor-float   { animation: decor-float   3s ease-in-out infinite; }
        .animate-decor-sway    { animation: decor-sway    4s ease-in-out infinite; }
        .animate-decor-twinkle { animation: decor-twinkle 2.5s ease-in-out infinite; }
      `}</style>
    </>
  );
}
