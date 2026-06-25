/**
 * HallOfFame - 명예의 전당 & 뉴게임+ 화면
 * 레전드몬(최종 진화) 달성 후 표시되는 엔드 콘텐츠
 */
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage } from '@/lib/gameState';
import { useState } from 'react';

interface HallOfFameProps {
  onClose: () => void;
}

export default function HallOfFame({ onClose }: HallOfFameProps) {
  const { state, newGamePlus } = useGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const pet = state.pet;
  const isMythic = pet.stage === 'mythic';
  const legendImage = isMythic
    ? getCharacterImage(pet.species, 'mythic')
    : getCharacterImage('레전드몬', 'adult');

  // 뉴게임+ 확인 다이얼로그
  if (showConfirm) {
    return (
      <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white/95 rounded-3xl p-6 mx-6 shadow-2xl text-center">
          <div className="text-4xl mb-3">🔄</div>
          <h3 className="text-lg font-bold text-warm-brown mb-2">뉴게임+ 시작</h3>
          <p className="text-sm text-sub-brown mb-1">
            새로운 알에서 다시 시작해요.
          </p>
          <p className="text-xs text-sub-brown/70 mb-4">
            코인·젬·도감 기록은 유지되고,<br />
            반려몬과 인벤토리는 초기화돼요.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 rounded-2xl bg-muted text-sub-brown font-semibold text-sm"
            >
              취소
            </button>
            <button
              onClick={() => {
                newGamePlus?.();
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-peach to-lavender text-white font-bold text-sm"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-b from-[oklch(0.20_0.08_280)] to-[oklch(0.10_0.05_260)] overflow-hidden">

      {/* 별 파티클 배경 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['⭐','✨','💫','🌟','⭐','✨'].map((star, i) => (
          <span
            key={i}
            className="absolute text-xl opacity-60"
            style={{
              left: `${10 + i * 15}%`,
              top: `${5 + (i % 3) * 20}%`,
              animation: `star-float ${2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
            }}
          >
            {star}
          </span>
        ))}
      </div>

      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center text-lg"
      >
        ✕
      </button>

      {/* 왕관 */}
      <div className="text-5xl mb-2 animate-bounce">{isMythic ? '✨' : '👑'}</div>

      {/* 타이틀 */}
      <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 0 20px oklch(0.85 0.15 60)' }}>
        {isMythic ? '전설의 전당' : '명예의 전당'}
      </h1>
      <p className="text-sm text-white/70 mb-6">{isMythic ? '전설 진화 달성! 최고의 반려몬!' : '최종 진화 달성!'}</p>

      {/* 레전드몬 이미지 */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-300/30 to-transparent blur-2xl scale-150" />
        <img
          src={legendImage}
          alt="레전드몬"
          className="w-44 h-44 object-contain drop-shadow-2xl relative z-10"
          style={{ animation: 'legend-float 3s ease-in-out infinite' }}
        />
      </div>

      {/* 반려몬 정보 카드 */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl px-6 py-4 mx-6 w-full max-w-xs text-center mb-6 border border-white/20">
        <p className="text-white font-bold text-lg mb-1">{pet.name}</p>
        <p className="text-white/70 text-sm">{pet.species} · Lv.{pet.level}</p>
        <div className="flex justify-center gap-6 mt-3">
          <div className="text-center">
            <p className="text-white/50 text-[10px]">친밀도</p>
            <p className="text-white font-bold">{Math.floor(pet.intimacy)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-[10px]">도감 수집</p>
            <p className="text-white font-bold">{(state.collection ?? []).length}/14</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-[10px]">보유 코인</p>
            <p className="text-white font-bold">{state.coins.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-col gap-3 w-full max-w-xs px-6">
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-black text-base shadow-lg active:scale-95 transition-transform"
        >
          🔄 뉴게임+ 시작
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm border border-white/30"
        >
          계속 키우기
        </button>
      </div>

      <style>{`
        @keyframes legend-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.03); }
        }
        @keyframes star-float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-15px) rotate(20deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
