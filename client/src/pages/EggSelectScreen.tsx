/**
 * EggSelectScreen — 최초 게임 시작 시 룰렛 스핀으로 알 랜덤 선택
 * 화면 진입 → 알 이모지 빠르게 교체 스핀 → 점점 느려지며 랜덤 알에 정착 → 패시브 카드 표시 → 시작 버튼
 */
import { useState, useEffect, useRef } from 'react';
import { SELECT_EGGS, type EggColorId, type SelectEggDef } from '@/lib/eggTypes';

interface EggSelectScreenProps {
  onSelect: (eggColor: EggColorId) => void;
}

type Phase = 'spin' | 'reveal' | 'ready' | 'confirm';

export default function EggSelectScreen({ onSelect }: EggSelectScreenProps) {
  // 현재 스핀 중 표시되는 알 인덱스
  const [spinIndex, setSpinIndex] = useState(0);
  // 최종 선택된 알
  const [result, setResult] = useState<SelectEggDef | null>(null);
  // 진행 단계
  const [phase, setPhase] = useState<Phase>('spin');
  // 확인 버튼 누른 후 페이드아웃
  const [confirming, setConfirming] = useState(false);
  // 파티클 표시 여부
  const [showParticles, setShowParticles] = useState(false);

  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 랜덤 최종 알 미리 결정
    const finalIdx = Math.floor(Math.random() * SELECT_EGGS.length);
    const finalEgg = SELECT_EGGS[finalIdx];

    // 스핀 속도 스케줄: [딜레이(ms), 반복횟수] 배열
    // 처음엔 빠르게, 점점 느려지다가 마지막에 정착
    const schedule: [number, number][] = [
      [60,  8],   // 초고속
      [90,  6],   // 고속
      [130, 5],   // 중속
      [180, 4],   // 감속
      [250, 3],   // 저속
      [350, 2],   // 매우 느림
      [500, 1],   // 거의 정지
    ];

    let currentIdx = 0;
    let schedulePos = 0;
    let stepInSchedule = 0;

    const tick = () => {
      const [delay, count] = schedule[schedulePos];

      currentIdx = (currentIdx + 1) % SELECT_EGGS.length;
      setSpinIndex(currentIdx);
      stepInSchedule++;

      if (stepInSchedule >= count) {
        schedulePos++;
        stepInSchedule = 0;

        if (schedulePos >= schedule.length) {
          // 스핀 종료 — 최종 알로 맞추기
          setSpinIndex(finalIdx);
          setResult(finalEgg);
          setPhase('reveal');
          setShowParticles(true);
          setTimeout(() => {
            setShowParticles(false);
            setPhase('ready');
          }, 1200);
          return;
        }
      }

      spinRef.current = setTimeout(tick, delay);
    };

    // 첫 틱 시작
    spinRef.current = setTimeout(tick, schedule[0][0]);

    return () => {
      if (spinRef.current) clearTimeout(spinRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleConfirm = () => {
    if (!result || phase !== 'ready') return;
    setConfirming(true);
    setTimeout(() => onSelect(result.id), 700);
  };

  const currentEgg = phase === 'spin' ? SELECT_EGGS[spinIndex] : result ?? SELECT_EGGS[spinIndex];

  return (
    <div
      className="absolute inset-0 z-[300] flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e1b4b 100%)',
        opacity: confirming ? 0 : 1,
        transition: 'opacity 0.7s ease',
      }}
    >
      {/* 별 배경 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['⭐','✨','💫','🌟','⭐','✨','💫'].map((s, i) => (
          <span
            key={i}
            className="absolute opacity-30 text-lg"
            style={{
              left: `${8 + i * 13}%`,
              top: `${5 + (i % 4) * 18}%`,
              animation: `star-twinkle ${2 + i * 0.5}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >{s}</span>
        ))}
      </div>

      {/* 헤더 */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-4 px-6">
        <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {phase === 'spin' ? '알을 뽑는 중...' : phase === 'reveal' ? '알이 결정됐어요!' : '당신의 알이에요!'}
        </h1>
        <p className="text-white/60 text-sm text-center">
          {phase === 'spin' ? '운명의 알이 정해지고 있어요' : '이 알과 함께 모험을 시작해요'}
        </p>
      </div>

      {/* 룰렛 중앙 디스플레이 */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6">

        {/* 스핀 원형 디스플레이 */}
        <div className="relative flex items-center justify-center mb-6">
          {/* 외부 링 — 스핀 중 회전 */}
          <div
            className="absolute w-52 h-52 rounded-full border-4 border-white/20"
            style={{
              animation: phase === 'spin' ? 'spin-ring 0.8s linear infinite' : 'none',
              borderTopColor: currentEgg.color,
              borderRightColor: currentEgg.color + '80',
            }}
          />
          {/* 내부 카드 */}
          <div
            className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center"
            style={{
              background: currentEgg.gradient,
              boxShadow: phase !== 'spin'
                ? `0 0 60px ${currentEgg.color}80, 0 0 120px ${currentEgg.color}40, 0 8px 32px rgba(0,0,0,0.4)`
                : `0 0 20px ${currentEgg.color}40, 0 4px 16px rgba(0,0,0,0.3)`,
              transition: phase === 'spin' ? 'none' : 'box-shadow 0.5s ease',
              animation: phase === 'reveal' ? 'egg-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
            }}
          >
            <span
              className="text-7xl"
              style={{
                filter: phase !== 'spin' ? 'drop-shadow(0 0 12px rgba(255,255,255,0.6))' : 'none',
                transition: 'filter 0.5s ease',
              }}
            >
              {currentEgg.emoji}
            </span>
            <span
              className="text-white font-black text-lg mt-1"
              style={{
                opacity: phase !== 'spin' ? 1 : 0.7,
                transition: 'opacity 0.3s ease',
              }}
            >
              {currentEgg.name}
            </span>
          </div>

          {/* 파티클 폭발 */}
          {showParticles && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="absolute text-xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    animation: `particle-burst-${i % 4} 1s ease-out forwards`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  {['✨','⭐','💫','🌟'][i % 4]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 스핀 중 미니 알 목록 */}
        {phase === 'spin' && (
          <div className="flex gap-3 mb-4">
            {SELECT_EGGS.map((egg, i) => (
              <div
                key={egg.id}
                className="w-10 h-10 rounded-full flex items-center justify-center text-2xl transition-all duration-100"
                style={{
                  background: i === spinIndex ? egg.gradient : 'rgba(255,255,255,0.1)',
                  transform: i === spinIndex ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: i === spinIndex ? `0 0 12px ${egg.color}80` : 'none',
                }}
              >
                {egg.emoji}
              </div>
            ))}
          </div>
        )}

        {/* 결과 패시브 카드 */}
        {(phase === 'ready' || phase === 'reveal') && result && (
          <div
            className="w-full rounded-3xl p-4 border"
            style={{
              background: result.color + '20',
              borderColor: result.borderColor + '60',
              animation: 'fade-slide-up 0.5s ease forwards',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{result.emoji}</span>
              <div>
                <div className="text-white font-black text-lg">{result.name}</div>
                <div className="text-white/60 text-xs">{result.description}</div>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 mb-2">
              <div className="text-white/50 text-[10px] mb-1">패시브 능력</div>
              <div className="text-white font-bold text-sm mb-1">{result.passive}</div>
              <div className="text-white/70 text-xs">{result.passiveDetail}</div>
            </div>
            {result.passiveEffect.traitBonus && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.passiveEffect.traitBonus).map(([trait, val]) => (
                  <span
                    key={trait}
                    className="px-2 py-1 rounded-full text-white text-[10px] font-bold"
                    style={{ background: result.color + '60' }}
                  >
                    {trait === 'power' ? '힘' : trait === 'intelligence' ? '지능' : trait === 'charm' ? '매력' : '활력'} +{val}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 text-white/40 text-[10px]">{result.evolutionHint}</div>
          </div>
        )}
      </div>

      {/* 하단 시작 버튼 */}
      <div className="relative z-10 px-6 pb-8 pt-2">
        <button
          onClick={handleConfirm}
          disabled={phase !== 'ready'}
          className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all duration-300 active:scale-95 disabled:opacity-0"
          style={{
            background: result
              ? `linear-gradient(135deg, ${result.color}, ${result.color}cc)`
              : 'rgba(255,255,255,0.2)',
            boxShadow: result ? `0 4px 20px ${result.color}60` : 'none',
            opacity: phase === 'ready' ? 1 : 0,
            transition: 'opacity 0.5s ease, background 0.3s ease',
          }}
        >
          {result ? `${result.emoji} 이 알로 시작하기!` : '잠시만요...'}
        </button>
      </div>

      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes egg-pop {
          0%   { transform: scale(0.8); }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes particle-burst-0 {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + 80px), calc(-50% - 80px)) scale(0); opacity: 0; }
        }
        @keyframes particle-burst-1 {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% - 80px), calc(-50% - 80px)) scale(0); opacity: 0; }
        }
        @keyframes particle-burst-2 {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + 80px), calc(-50% + 80px)) scale(0); opacity: 0; }
        }
        @keyframes particle-burst-3 {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% - 80px), calc(-50% + 80px)) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
