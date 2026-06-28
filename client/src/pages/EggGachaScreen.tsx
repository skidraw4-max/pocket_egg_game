/**
 * EggGachaScreen — 뉴게임+ 이후 6종 알 뽑기 화면
 * 확률 기반 가챠 시스템으로 알을 뽑고 패시브 능력 확인 후 게임 재시작
 */
import { useState, useEffect, useRef } from 'react';
import { GACHA_EGGS, rollGachaEgg, type GachaEggId, type GachaEggDef } from '@/lib/eggTypes';

interface EggGachaScreenProps {
  onSelect: (gachaEgg: GachaEggId) => void;
}

type Phase = 'intro' | 'rolling' | 'reveal' | 'confirm';

const GRADE_BG: Record<string, string> = {
  rare:   'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
  epic:   'linear-gradient(135deg, #2d1b69 0%, #7c3aed 100%)',
  legend: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #451a03 100%)',
};

export default function EggGachaScreen({ onSelect }: EggGachaScreenProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [rolledEgg, setRolledEgg] = useState<GachaEggDef | null>(null);
  const [rollCount, setRollCount] = useState(0);
  const [displayEgg, setDisplayEgg] = useState<GachaEggDef>(GACHA_EGGS[0]);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollCountRef = useRef(0);

  /** 뽑기 시작 */
  const startRoll = () => {
    setPhase('rolling');
    rollCountRef.current = 0;

    // 알 슬롯머신 효과 — 빠르게 순환
    rollIntervalRef.current = setInterval(() => {
      rollCountRef.current += 1;
      const idx = rollCountRef.current % GACHA_EGGS.length;
      setDisplayEgg(GACHA_EGGS[idx]);
      setRollCount(rollCountRef.current);

      // 30프레임 후 속도 감소 → 50프레임 후 결과 확정
      if (rollCountRef.current >= 50) {
        clearInterval(rollIntervalRef.current!);
        const result = rollGachaEgg();
        const resultDef = GACHA_EGGS.find(e => e.id === result) ?? GACHA_EGGS[0];
        setRolledEgg(resultDef);
        setDisplayEgg(resultDef);
        setTimeout(() => setPhase('reveal'), 400);
      }
    }, rollCountRef.current < 30 ? 80 : 150);
  };

  // 롤링 속도 동적 조절
  useEffect(() => {
    if (phase !== 'rolling') return;
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);

    const speed = rollCount < 20 ? 80 : rollCount < 35 ? 130 : 200;
    rollIntervalRef.current = setInterval(() => {
      rollCountRef.current += 1;
      const idx = rollCountRef.current % GACHA_EGGS.length;
      setDisplayEgg(GACHA_EGGS[idx]);
      setRollCount(rollCountRef.current);

      if (rollCountRef.current >= 50) {
        clearInterval(rollIntervalRef.current!);
        const result = rollGachaEgg();
        const resultDef = GACHA_EGGS.find(e => e.id === result) ?? GACHA_EGGS[0];
        setRolledEgg(resultDef);
        setDisplayEgg(resultDef);
        setTimeout(() => setPhase('reveal'), 400);
      }
    }, speed);

    return () => { if (rollIntervalRef.current) clearInterval(rollIntervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollCount]);

  useEffect(() => {
    return () => { if (rollIntervalRef.current) clearInterval(rollIntervalRef.current); };
  }, []);

  const handleConfirm = () => {
    if (!rolledEgg) return;
    setPhase('confirm');
    setTimeout(() => onSelect(rolledEgg.id), 700);
  };

  // ── 인트로 화면 ──────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div
        className="absolute inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e1b4b 100%)' }}
      >
        {/* 별 배경 */}
        <div className="absolute inset-0 pointer-events-none">
          {['⭐','✨','💫','🌟','⭐','✨','💫','🌟'].map((s, i) => (
            <span key={i} className="absolute opacity-30 text-xl"
              style={{ left: `${5 + i * 12}%`, top: `${8 + (i % 4) * 20}%`,
                animation: `star-twinkle ${2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }}
            >{s}</span>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <div className="text-6xl mb-4 animate-bounce">🎰</div>
          <h1 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
            뉴게임+ 알 뽑기
          </h1>
          <p className="text-white/70 text-sm mb-2">
            포코가 도감에 등록되었어요! 🎉
          </p>
          <p className="text-white/60 text-xs mb-6">
            이번엔 특별한 알을 뽑아 새로운 반려몬을 키워봐요
          </p>

          {/* 확률표 */}
          <div className="bg-white/10 rounded-3xl p-4 mb-6 w-full max-w-xs">
            <div className="text-white/50 text-xs text-center mb-3">뽑기 확률표</div>
            {GACHA_EGGS.map(egg => (
              <div key={egg.id} className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{egg.emoji}</span>
                  <span className="text-white text-xs font-semibold">{egg.name}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: egg.gradeColor + '40', color: egg.gradeColor }}
                  >{egg.gradeLabel}</span>
                </div>
                <span className="text-white/70 text-xs font-bold">
                  {(egg.probability * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={startRoll}
            className="w-full max-w-xs py-4 rounded-2xl font-black text-white text-lg active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
          >
            🎰 뽑기 시작!
          </button>
        </div>

        <style>{`
          @keyframes star-twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  // ── 롤링 화면 ──────────────────────────────────────────
  if (phase === 'rolling') {
    return (
      <div
        className="absolute inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e1b4b 100%)' }}
      >
        <div className="text-white/60 text-sm mb-6 animate-pulse">뽑는 중...</div>

        {/* 슬롯머신 알 표시 */}
        <div
          className="w-40 h-40 rounded-full flex items-center justify-center mb-6"
          style={{
            background: displayEgg.gradient,
            boxShadow: `0 0 40px ${displayEgg.color}80`,
            animation: 'slot-spin 0.1s ease-in-out',
          }}
        >
          <span className="text-7xl">{displayEgg.emoji}</span>
        </div>

        <div className="text-white font-bold text-xl mb-2">{displayEgg.name}</div>
        <div
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: displayEgg.gradeColor + '40', color: displayEgg.gradeColor }}
        >
          {displayEgg.gradeLabel}
        </div>

        <style>{`
          @keyframes slot-spin {
            0% { transform: scale(0.9) rotateY(90deg); opacity: 0.5; }
            100% { transform: scale(1) rotateY(0deg); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── 결과 공개 화면 ──────────────────────────────────────
  if ((phase === 'reveal' || phase === 'confirm') && rolledEgg) {
    const isLegend = rolledEgg.grade === 'legend';
    const isEpic = rolledEgg.grade === 'epic';

    return (
      <div
        className="absolute inset-0 z-[300] flex flex-col items-center overflow-y-auto py-8 px-6"
        style={{ background: GRADE_BG[rolledEgg.grade] ?? GRADE_BG.rare }}
      >
        {/* 등급 이펙트 */}
        {isLegend && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['🌟','✨','💫','⭐','🌟','✨','💫'].map((s, i) => (
              <span key={i} className="absolute text-2xl"
                style={{ left: `${5 + i * 13}%`, top: `${3 + (i % 3) * 25}%`,
                  animation: `legend-sparkle ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` }}
              >{s}</span>
            ))}
          </div>
        )}

        {/* 등급 배너 */}
        <div
          className="relative z-10 px-6 py-2 rounded-full font-black text-lg mb-4"
          style={{
            background: isLegend
              ? 'linear-gradient(90deg, #FBBF24, #F59E0B, #FBBF24)'
              : isEpic
              ? 'linear-gradient(90deg, #C084FC, #7C3AED, #C084FC)'
              : 'linear-gradient(90deg, #60A5FA, #3B82F6, #60A5FA)',
            color: '#fff',
            boxShadow: `0 0 20px ${rolledEgg.gradeColor}80`,
          }}
        >
          {isLegend ? '🏆 LEGEND 획득!' : isEpic ? '💜 EPIC 획득!' : '⭐ RARE 획득!'}
        </div>

        {/* 알 이미지 */}
        <div
          className="relative z-10 w-44 h-44 rounded-full flex items-center justify-center mb-4"
          style={{
            background: rolledEgg.gradient,
            boxShadow: `0 0 50px ${rolledEgg.color}80, 0 0 100px ${rolledEgg.color}40`,
            animation: 'reveal-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          <span className="text-8xl">{rolledEgg.emoji}</span>
        </div>

        {/* 알 이름 */}
        <h2 className="relative z-10 text-3xl font-black text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {rolledEgg.name}
        </h2>
        <p className="relative z-10 text-white/70 text-sm mb-5 text-center">{rolledEgg.description}</p>

        {/* 패시브 능력 카드 */}
        <div
          className="relative z-10 rounded-3xl p-4 mb-4 w-full max-w-xs border"
          style={{ background: rolledEgg.color + '20', borderColor: rolledEgg.borderColor + '60' }}
        >
          <div className="text-white/50 text-xs mb-2">패시브 능력</div>
          <div className="text-white font-bold text-base mb-1">{rolledEgg.passive}</div>
          <div className="text-white/70 text-xs mb-3">{rolledEgg.passiveDetail}</div>

          {/* 성향 보너스 */}
          {rolledEgg.passiveEffect.traitBonus && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(rolledEgg.passiveEffect.traitBonus).map(([trait, val]) => (
                <span
                  key={trait}
                  className="px-2 py-1 rounded-full text-white text-[10px] font-bold"
                  style={{ background: rolledEgg.color + '60' }}
                >
                  {trait === 'power' ? '힘' : trait === 'intelligence' ? '지능' : trait === 'charm' ? '매력' : '활력'} +{val}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 특수 액션 */}
        <div
          className="relative z-10 rounded-2xl px-4 py-3 mb-6 w-full max-w-xs text-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <div className="text-white/50 text-xs mb-1">전용 특수 액션</div>
          <div className="text-white font-bold text-base">✨ {rolledEgg.specialAction}</div>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={handleConfirm}
          disabled={phase === 'confirm'}
          className="relative z-10 w-full max-w-xs py-4 rounded-2xl font-black text-white text-lg active:scale-95 transition-all"
          style={{
            background: `linear-gradient(135deg, ${rolledEgg.color}, ${rolledEgg.color}cc)`,
            boxShadow: `0 4px 20px ${rolledEgg.color}60`,
            opacity: phase === 'confirm' ? 0 : 1,
            transition: 'opacity 0.7s ease',
          }}
        >
          {rolledEgg.emoji} 이 알로 시작하기!
        </button>

        <style>{`
          @keyframes reveal-pop {
            0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
            70% { transform: scale(1.1) rotate(3deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes legend-sparkle {
            0%, 100% { opacity: 0.4; transform: scale(1) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.3) rotate(20deg); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
