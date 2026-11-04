/**
 * DiscCatchGame - 원반 캐치 미니게임
 * 좌우 이동으로 날아오는 원반을 Perfect / Good / Miss 판정으로 캐치
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { calcDiscCatchReward, type DiscCatchRewardResult } from '@/lib/gameState';

interface DiscCatchGameProps {
  onClose: () => void;
}

const TOTAL_ROUNDS = 12;
const CATCH_RADIUS = 58; // px
const PERFECT_RADIUS = 28; // px

const GRADE_INFO: Record<string, { label: string; color: string; desc: string; bg: string }> = {
  perfect:  { label: '🏆 퍼펙트!', color: '#FBBF24', desc: '완벽한 캐치 실력이에요!',    bg: 'rgba(251,191,36,0.15)'  },
  great:    { label: '⭐ 우수!',   color: '#60A5FA', desc: '멋진 캐치였어요!',          bg: 'rgba(96,165,250,0.15)'  },
  normal:   { label: '✅ 일반',    color: '#34D399', desc: '잘 받았어요!',              bg: 'rgba(52,211,153,0.15)'  },
  complete: { label: '🎀 완성',    color: '#A78BFA', desc: '다음엔 더 잘할 수 있어요!', bg: 'rgba(167,139,250,0.15)' },
};

type FxItem = { id: number; text: string; color: string; x: number; y: number };

export default function DiscCatchGame({ onClose }: DiscCatchGameProps) {
  const { playDiscCatchGame } = useGame();

  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [round, setRound] = useState(0);
  const [catches, setCatches] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [petX, setPetX] = useState(0.5); // 0~1
  const [discPos, setDiscPos] = useState<{ x: number; y: number; rot: number } | null>(null);
  const [fxList, setFxList] = useState<FxItem[]>([]);
  const [reward, setReward] = useState<DiscCatchRewardResult | null>(null);

  const fieldRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const throwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);
  const fxIdRef = useRef(0);
  const pointerActiveRef = useRef(false);

  // 최신 점수 ref (stale closure 방지)
  const statsRef = useRef({ catches: 0, perfects: 0, combo: 0, maxCombo: 0, round: 0 });
  const petXRef = useRef(0.5);
  const playingRef = useRef(false);

  /** 알 다음 단계 기본 포코 (원반 캐치 전용 스프라이트) */
  const POCO_CATCH_IMG = '/characters/poco-baby-catch.png';

  const spawnFx = useCallback((text: string, color: string, x: number, y: number) => {
    fxIdRef.current += 1;
    const id = fxIdRef.current;
    setFxList(prev => [...prev, { id, text, color, x, y }]);
    setTimeout(() => setFxList(prev => prev.filter(f => f.id !== id)), 700);
  }, []);

  const setPet = useCallback((x: number) => {
    const clamped = Math.max(0.12, Math.min(0.88, x));
    petXRef.current = clamped;
    setPetX(clamped);
  }, []);

  const finishGame = useCallback(() => {
    playingRef.current = false;
    setDiscPos(null);
    const s = statsRef.current;
    const r = calcDiscCatchReward(s.catches, s.perfects, TOTAL_ROUNDS, s.maxCombo);
    setReward(r);
    setPhase('result');
  }, []);

  const throwDisc = useCallback(() => {
    const field = fieldRef.current;
    if (!field || !playingRef.current) return;

    if (statsRef.current.round >= TOTAL_ROUNDS) {
      finishGame();
      return;
    }

    const nextRound = statsRef.current.round + 1;
    statsRef.current.round = nextRound;
    setRound(nextRound);

    const rect = field.getBoundingClientRect();
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -40 : rect.width + 40;
    const endX = fromLeft ? rect.width + 40 : -40;
    const startY = 36 + Math.random() * 50; // 화면 위쪽
    const landY = rect.height * 0.72;       // 캐치존 높이
    const duration = 1400 + Math.random() * 500;
    const start = performance.now();
    const targetLandX = (0.18 + Math.random() * 0.64) * rect.width;
    const landT = 0.82; // 이 시점에 착지·캐치 판정

    resolvedRef.current = false;

    const frame = (now: number) => {
      if (!playingRef.current) return;
      const t = Math.min(1, (now - start) / duration);

      // 수평: landT까지 착지점 도달 후 살짝 지나감
      const x =
        t <= landT
          ? startX + (targetLandX - startX) * (t / landT)
          : targetLandX + (endX - targetLandX) * ((t - landT) / (1 - landT));

      // 수직: 위에서 아래로 낙하 + 중간 아치(살짝 띄움)
      const fall = Math.min(1, t / landT);
      const arch = Math.sin(Math.PI * fall) * 55; // 중간에 위로 들어 올림(top 감소)
      const y = startY + (landY - startY) * fall - arch;
      const rot = t * 720;

      setDiscPos({ x, y: Math.max(20, y), rot });

      // 착지 직전~직후 캐치 판정
      if (t >= landT - 0.08 && t <= landT + 0.1 && !resolvedRef.current) {
        const petPx = petXRef.current * rect.width;
        const dx = Math.abs(x - petPx);
        const dy = Math.abs(y - landY);
        if (dx <= CATCH_RADIUS && dy < 70) {
          resolvedRef.current = true;
          const isPerfect = dx <= PERFECT_RADIUS;
          statsRef.current.catches += 1;
          statsRef.current.combo += 1;
          if (isPerfect) statsRef.current.perfects += 1;
          statsRef.current.maxCombo = Math.max(statsRef.current.maxCombo, statsRef.current.combo);

          setCatches(statsRef.current.catches);
          setPerfects(statsRef.current.perfects);
          setCombo(statsRef.current.combo);
          setMaxCombo(statsRef.current.maxCombo);

          spawnFx(isPerfect ? 'Perfect!' : 'Good!', isPerfect ? '#F59E0B' : '#60A5FA', x, y - 20);
          setDiscPos(null);
          throwTimerRef.current = setTimeout(throwDisc, 450);
          return;
        }
      }

      if (t >= 1) {
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          statsRef.current.combo = 0;
          setCombo(0);
          spawnFx('Miss', '#A78BFA', targetLandX, landY - 30);
        }
        setDiscPos(null);
        throwTimerRef.current = setTimeout(throwDisc, 400);
        return;
      }

      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
  }, [finishGame, spawnFx]);

  const startGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (throwTimerRef.current) clearTimeout(throwTimerRef.current);

    statsRef.current = { catches: 0, perfects: 0, combo: 0, maxCombo: 0, round: 0 };
    setRound(0);
    setCatches(0);
    setPerfects(0);
    setCombo(0);
    setMaxCombo(0);
    setReward(null);
    setFxList([]);
    setPet(0.5);
    setDiscPos(null);
    playingRef.current = true;
    setPhase('playing');
    throwTimerRef.current = setTimeout(throwDisc, 500);
  }, [setPet, throwDisc]);

  /** 결과 시 보상 적용 */
  useEffect(() => {
    if (phase === 'result' && reward) {
      playDiscCatchGame(reward);
    }
  }, [phase, reward, playDiscCatchGame]);

  /** 언마운트 정리 */
  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (throwTimerRef.current) clearTimeout(throwTimerRef.current);
    };
  }, []);

  const pointerToX = (clientX: number) => {
    const field = fieldRef.current;
    if (!field) return 0.5;
    const rect = field.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerActiveRef.current = true;
    setPet(pointerToX(e.clientX));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerActiveRef.current && e.pointerType === 'mouse' && e.buttons === 0) return;
    setPet(pointerToX(e.clientX));
  };

  const onPointerUp = () => {
    pointerActiveRef.current = false;
  };

  // ── 준비 화면 ──────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f766e]/90 to-[#134e4a]/95 backdrop-blur-sm overflow-y-auto py-6">
        <div className="text-7xl mb-4 animate-bounce">🥏</div>
        <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          원반 캐치
        </h2>
        <p className="text-white/80 text-sm mb-1 text-center px-8">
          날아오는 원반을 타이밍에 맞춰 받으세요!
        </p>
        <p className="text-white/60 text-xs mb-5 text-center px-8">
          좌우로 드래그해 반려몬을 이동하세요
        </p>

        <div className="bg-white/10 rounded-2xl px-5 py-3 mb-5 w-72">
          <div className="text-white/60 text-[10px] text-center mb-2">규칙 · 등급 보상</div>
          <div className="text-[10px] text-white/70 mb-2 text-center">
            총 12회 · Perfect / Good / Miss · 연속 캐치 콤보
          </div>
          {[
            { label: '🏆 퍼펙트', cond: '≥92%+P5', reward: 'EXP 30 · 코인 22 · 힘 +6', drop: '🌈 30%' },
            { label: '⭐ 우수',   cond: '≥75%',    reward: 'EXP 24 · 코인 15 · 힘 +5', drop: '✨ 20%' },
            { label: '✅ 일반',   cond: '≥50%',    reward: 'EXP 18 · 코인 10 · 힘 +3', drop: '' },
            { label: '🎀 완성',   cond: '~49%',    reward: 'EXP 12 · 코인 6 · 힘 +2',  drop: '' },
          ].map(g => (
            <div key={g.label} className="flex items-center justify-between text-[10px] text-white/80 mb-1 gap-1">
              <span className="w-14 shrink-0">{g.label}</span>
              <span className="text-white/50 w-14 shrink-0">{g.cond}</span>
              <span className="text-right flex-1">{g.reward}{g.drop ? ` + ${g.drop}` : ''}</span>
            </div>
          ))}
          <div className="border-t border-white/20 mt-2 pt-2 text-[10px] text-white/60 text-center">
            콤보 6+ → EXP +8 · 4~5 → +5 · 2~3 → +2
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm"
          >
            취소
          </button>
          <button
            onClick={startGame}
            className="px-8 py-3 rounded-2xl font-bold text-white text-base"
            style={{ background: 'linear-gradient(135deg, #FFB088, #FF8F6B)' }}
          >
            시작! 🎮
          </button>
        </div>
      </div>
    );
  }

  // ── 결과 화면 ──────────────────────────────────────────────
  if (phase === 'result' && reward) {
    const gi = GRADE_INFO[reward.grade];
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f766e]/90 to-[#134e4a]/95 backdrop-blur-sm overflow-y-auto py-6">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          원반 캐치 완료!
        </h2>
        <div className="text-2xl font-bold mb-4" style={{ color: gi.color }}>
          {gi.label}
        </div>

        <div className="bg-white/10 rounded-3xl p-4 mb-3 w-64">
          <div className="text-white/60 text-xs text-center mb-2">게임 결과</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>캐치</span><span className="font-bold">{reward.catches}/{reward.totalRounds}</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>Perfect</span><span className="font-bold">{reward.perfects}</span>
          </div>
          <div className="flex justify-between text-white text-sm">
            <span>최대 콤보</span><span className="font-bold">{reward.maxCombo}</span>
          </div>
        </div>

        <div className="rounded-3xl p-4 mb-3 w-64 border" style={{ background: gi.bg, borderColor: gi.color + '60' }}>
          <div className="text-xs text-center mb-2" style={{ color: gi.color }}>지급된 보상</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>기분 · 피로</span>
            <span className="font-bold">+{reward.moodBonus} · +{reward.fatigueBonus}</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>힘 성향</span>
            <span className="font-bold" style={{ color: gi.color }}>+{reward.powerBonus}</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>EXP (등급)</span>
            <span className="font-bold" style={{ color: gi.color }}>+{reward.exp}</span>
          </div>
          {reward.comboExpBonus > 0 && (
            <div className="flex justify-between text-white text-sm mb-1">
              <span>🔥 콤보 보너스 EXP</span>
              <span className="font-bold text-orange-300">+{reward.comboExpBonus}</span>
            </div>
          )}
          <div className="flex justify-between text-white text-sm mb-1 border-t border-white/20 pt-1 mt-1">
            <span>총 EXP</span>
            <span className="font-bold text-yellow-300">+{reward.totalExp}</span>
          </div>
          <div className="flex justify-between text-white text-sm">
            <span>코인</span>
            <span className="font-bold text-yellow-300">+{reward.coins}</span>
          </div>
        </div>

        {reward.dropItem && (
          <div className={`rounded-2xl px-5 py-3 mb-3 w-64 text-center border ${
            reward.dropItem.dropped
              ? 'bg-yellow-400/20 border-yellow-400/60'
              : 'bg-white/5 border-white/20'
          }`}>
            {reward.dropItem.dropped ? (
              <>
                <div className="text-yellow-300 text-xs font-bold mb-1">✨ 아이템 드롭!</div>
                <div className="text-3xl mb-1">{reward.dropItem.icon}</div>
                <div className="text-white font-semibold text-sm">{reward.dropItem.name}</div>
              </>
            ) : (
              <>
                <div className="text-white/40 text-xs mb-1">드롭 실패</div>
                <div className="text-2xl opacity-30">{reward.dropItem.icon}</div>
                <div className="text-white/40 text-xs mt-1">
                  {reward.dropItem.name} 드롭 확률에 아깝게 빗나갔어요
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-white/60 text-xs mb-4">{gi.desc}</p>

        <button
          onClick={onClose}
          className="px-10 py-3 rounded-2xl font-bold text-white text-base"
          style={{ background: 'linear-gradient(135deg, #FFB088, #FF8F6B)' }}
        >
          확인
        </button>
      </div>
    );
  }

  // ── 게임 플레이 화면 ───────────────────────────────────────
  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden select-none"
      style={{ background: 'linear-gradient(180deg, #d8f0e4 0%, #fff8f0 45%, #ffe8d6 100%)' }}
    >
      {/* HUD */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2 gap-2">
        <div className="px-3 py-1.5 rounded-full bg-white/85 text-xs font-bold text-[#4A3728] shadow-sm">
          라운드 {round}/{TOTAL_ROUNDS}
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/85 text-xs font-bold text-[#4A3728] shadow-sm">
          캐치 {catches}
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/85 text-xs font-bold text-[#4A3728] shadow-sm">
          {combo >= 2 ? `🔥 콤보 ${combo}` : `콤보 ${combo}`}
        </div>
      </div>

      {/* 필드 */}
      <div
        ref={fieldRef}
        className="relative mx-0 overflow-hidden touch-none"
        style={{ height: 'calc(100% - 120px)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* 언덕 */}
        <div
          className="absolute left-[-10%] right-[-10%] bottom-0 pointer-events-none"
          style={{
            height: '38%',
            background: 'radial-gradient(ellipse at 50% 0%, #b8e8c8 0%, #8fd4a8 70%)',
            borderRadius: '50% 50% 0 0',
          }}
        />

        {/* 캐치존 */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${petX * 100}%`,
            bottom: '14%',
            width: 110,
            height: 28,
            marginLeft: -55,
            borderRadius: '50%',
            border: '2px solid rgba(255,176,136,0.7)',
            background: 'rgba(255,176,136,0.18)',
            zIndex: 2,
          }}
        />

        {/* 반려몬 — 기본 포코 */}
        <div
          className="absolute flex items-end justify-center pointer-events-none"
          style={{
            left: `${petX * 100}%`,
            bottom: '16%',
            width: 104,
            height: 104,
            marginLeft: -52,
            zIndex: 5,
            transition: 'left 60ms linear',
            filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.12))',
          }}
        >
          <img
            src={POCO_CATCH_IMG}
            alt="포코"
            draggable={false}
            className="w-full h-full object-contain select-none"
          />
        </div>

        {/* 원반 */}
        {discPos && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: discPos.x,
              top: discPos.y,
              width: 54,
              height: 54,
              marginLeft: -27,
              marginTop: -27,
              borderRadius: '50%',
              background: 'conic-gradient(from 20deg, #FFB088, #FCD34D, #A8E6CF, #93C5FD, #C8B6FF, #FFB088)',
              boxShadow: '0 6px 14px rgba(0,0,0,0.15), inset 0 0 0 6px rgba(255,255,255,0.35)',
              transform: `rotate(${discPos.rot}deg)`,
              zIndex: 8,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 16,
                borderRadius: '50%',
                background: 'rgba(255,248,240,0.85)',
              }}
            />
          </div>
        )}

        {/* FX */}
        {fxList.map(fx => (
          <div
            key={fx.id}
            className="absolute pointer-events-none font-extrabold text-lg"
            style={{
              left: fx.x,
              top: fx.y,
              color: fx.color,
              transform: 'translate(-50%, -50%)',
              animation: 'disc-fx-pop 700ms ease-out forwards',
              zIndex: 20,
              textShadow: '0 1px 4px rgba(255,255,255,0.8)',
            }}
          >
            {fx.text}
          </div>
        ))}
      </div>

      {/* 하단 힌트 */}
      <div className="absolute left-0 right-0 bottom-0 px-4 py-4 bg-white/80 backdrop-blur-sm border-t border-white/70">
        <div className="text-center text-xs text-[#8B7355]">
          화면을 좌우로 드래그 · 원반이 캐치존에 올 때 받으세요
        </div>
      </div>

      <style>{`
        @keyframes disc-fx-pop {
          0%   { opacity: 0; transform: translate(-50%, -40%) scale(0.7); }
          20%  { opacity: 1; transform: translate(-50%, -70%) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -120%) scale(1); }
        }
      `}</style>
    </div>
  );
}
