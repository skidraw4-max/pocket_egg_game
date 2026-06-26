/**
 * TitleScreen - 게임 타이틀 화면
 * 상단 타이틀 + 중앙 기본몬 인사 애니메이션 + 하단 시작 버튼
 */
import { useEffect, useState } from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

const BASICMON_IMG = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/VMfNTgvHQyyUsWlF.png';
const TITLE_BG = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/YSlzPwLAfBZIZzDk.png';

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const [visible, setVisible] = useState(false);
  const [starting, setStarting] = useState(false);

  // 마운트 시 페이드인
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    if (starting) return;
    setStarting(true);
    // 페이드아웃 후 전환
    setTimeout(() => onStart(), 600);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: starting ? 'opacity 0.6s ease' : 'opacity 0.5s ease',
        ...(starting ? { opacity: 0 } : {}),
      }}
    >
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${TITLE_BG})` }}
      />
      {/* 배경 오버레이 (가독성 향상) */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-purple-900/50" />

      {/* 상단 타이틀 영역 */}
      <div className="relative z-10 flex flex-col items-center pt-16 px-6">
        {/* 부제 */}
        <div
          className="text-white/80 text-sm font-medium tracking-widest mb-2 drop-shadow"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
        >
          ✨ 나만의 반려몬 키우기 ✨
        </div>

        {/* 메인 타이틀 */}
        <div
          className="text-center leading-tight"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          <div
            className="text-5xl font-black drop-shadow-lg"
            style={{
              color: '#fff',
              textShadow: '0 2px 0 #c084fc, 0 4px 12px rgba(168,85,247,0.6), 0 0 30px rgba(255,255,255,0.3)',
              letterSpacing: '-0.5px',
            }}
          >
            포켓
          </div>
          <div
            className="text-5xl font-black drop-shadow-lg"
            style={{
              color: '#fde68a',
              textShadow: '0 2px 0 #d97706, 0 4px 12px rgba(251,191,36,0.6)',
              letterSpacing: '-0.5px',
            }}
          >
            에그 🥚
          </div>
        </div>
      </div>

      {/* 중앙 캐릭터 영역 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* 발광 효과 원 */}
        <div
          className="absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
            animation: 'pulse-glow 2.5s ease-in-out infinite',
          }}
        />

        {/* 캐릭터 이미지 - 인사 애니메이션 */}
        <div
          style={{
            animation: 'wave-hello 1.2s ease-in-out infinite',
            transformOrigin: 'bottom center',
            filter: 'drop-shadow(0 8px 24px rgba(168,85,247,0.4))',
          }}
        >
          <img
            src={BASICMON_IMG}
            alt="포켓에그 기본몬"
            className="w-44 h-44 object-contain"
          />
        </div>

        {/* 말풍선 */}
        <div
          className="mt-3 bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-lg"
          style={{ animation: 'bubble-pop 0.4s cubic-bezier(0.23,1,0.32,1) forwards' }}
        >
          <p className="text-warm-brown font-bold text-sm text-center">
            안녕! 나랑 같이 놀자! 🎉
          </p>
        </div>

        {/* 파티클 별 */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-300 pointer-events-none select-none"
            style={{
              fontSize: `${10 + (i % 3) * 4}px`,
              left: `${20 + i * 12}%`,
              top: `${30 + (i % 2) * 25}%`,
              animation: `float-star ${2 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
              opacity: 0.8,
            }}
          >
            {['⭐', '✨', '💫', '🌟', '⭐', '✨'][i]}
          </div>
        ))}
      </div>

      {/* 하단 버튼 영역 */}
      <div className="relative z-10 w-full px-8 pb-16 flex flex-col items-center gap-3">
        {/* 게임 시작 버튼 */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full max-w-xs py-4 rounded-3xl font-black text-xl text-white shadow-2xl active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #818cf8 100%)',
            boxShadow: '0 6px 0 #9333ea, 0 8px 20px rgba(168,85,247,0.5)',
            fontFamily: 'Nunito, sans-serif',
            animation: 'btn-float 2s ease-in-out infinite',
            letterSpacing: '1px',
          }}
        >
          🎮 게임 시작하기
        </button>

        {/* 버전 표시 */}
        <div className="text-white/50 text-xs">v0.1.0</div>
      </div>

      {/* 애니메이션 정의 */}
      <style>{`
        @keyframes wave-hello {
          0%   { transform: rotate(-8deg) translateY(0px); }
          25%  { transform: rotate(8deg)  translateY(-8px); }
          50%  { transform: rotate(-6deg) translateY(0px); }
          75%  { transform: rotate(6deg)  translateY(-6px); }
          100% { transform: rotate(-8deg) translateY(0px); }
        }
        @keyframes float-star {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          50%       { transform: translateY(-14px) rotate(20deg); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%       { transform: scale(1.15); opacity: 1;   }
        }
        @keyframes btn-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes bubble-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          80%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
