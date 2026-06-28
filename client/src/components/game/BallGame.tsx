/**
 * BallGame - 무지개 공 놀이 미니게임
 * 방안 B + C 조합 등급별 차등 보상:
 *  - 방안 B: 등급(점수)에 따라 EXP/코인/힘 성향 차등 + 희귀 아이템 드롭
 *  - 방안 C: 최대 콤보에 따라 추가 EXP 보너스
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { calcBallGameReward, type BallGameRewardResult } from '@/lib/gameState';

interface BallGameProps {
  onClose: () => void;
}

interface BallPos {
  x: number; // % (0~85)
  y: number; // % (0~80)
  id: number;
}

const GAME_DURATION = 30;       // 초
const BALL_VISIBLE_MS = 1200;   // 공이 화면에 머무는 시간
const COMBO_WINDOW_MS = 800;    // 콤보 인정 간격

const GRADE_INFO: Record<string, { label: string; color: string; desc: string; bg: string }> = {
  perfect:  { label: '🏆 퍼펙트!', color: '#FBBF24', desc: '완벽한 공놀이였어요!',    bg: 'rgba(251,191,36,0.15)'  },
  great:    { label: '⭐ 우수!',   color: '#60A5FA', desc: '멋진 공놀이였어요!',      bg: 'rgba(96,165,250,0.15)'  },
  normal:   { label: '✅ 일반',    color: '#34D399', desc: '잘 했어요!',              bg: 'rgba(52,211,153,0.15)'  },
  complete: { label: '🎀 완성',    color: '#A78BFA', desc: '다음엔 더 잘할 수 있어요!', bg: 'rgba(167,139,250,0.15)' },
};

export default function BallGame({ onClose }: BallGameProps) {
  const { playBallGame } = useGame();

  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [ball, setBall] = useState<BallPos | null>(null);
  const [hitEffect, setHitEffect] = useState<{ x: number; y: number; id: number } | null>(null);
  const [missCount, setMissCount] = useState(0);
  const [reward, setReward] = useState<BallGameRewardResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ballTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHitRef = useRef<number>(0);
  const ballIdRef = useRef(0);
  // 결과 계산 시 최신 score/maxCombo를 읽기 위한 ref
  const scoreRef = useRef(0);
  const maxComboRef = useRef(0);

  /** 새 공 위치 생성 */
  const spawnBall = useCallback(() => {
    ballIdRef.current += 1;
    const x = 5 + Math.random() * 80;
    const y = 10 + Math.random() * 65;
    setBall({ x, y, id: ballIdRef.current });

    if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
    ballTimerRef.current = setTimeout(() => {
      setBall(null);
      setMissCount(prev => prev + 1);
      setCombo(0);
      ballTimerRef.current = setTimeout(spawnBall, 300);
    }, BALL_VISIBLE_MS);
  }, []);

  /** 게임 시작 */
  const startGame = useCallback(() => {
    setPhase('playing');
    setTimeLeft(GAME_DURATION);
    setScore(0); scoreRef.current = 0;
    setCombo(0);
    setMaxCombo(0); maxComboRef.current = 0;
    setMissCount(0);
    setBall(null);
    setReward(null);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          setBall(null);
          // 보상 계산 — ref 값 사용 (stale closure 방지)
          const r = calcBallGameReward(scoreRef.current, maxComboRef.current);
          setReward(r);
          setPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(spawnBall, 500);
  }, [spawnBall]);

  /** 공 탭 */
  const handleBallTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!ball) return;

    const now = Date.now();
    const isCombo = now - lastHitRef.current < COMBO_WINDOW_MS;
    lastHitRef.current = now;

    setCombo(prev => {
      const newCombo = isCombo ? prev + 1 : 1;
      setMaxCombo(mc => {
        const updated = Math.max(mc, newCombo);
        maxComboRef.current = updated;
        return updated;
      });
      return newCombo;
    });

    const baseScore = 10;
    const comboBonus = Math.min((isCombo ? combo : 0), 5) * 3;
    setScore(prev => {
      const next = prev + baseScore + comboBonus;
      scoreRef.current = next;
      return next;
    });

    setHitEffect({ x: ball.x, y: ball.y, id: ball.id });
    setTimeout(() => setHitEffect(null), 500);

    if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
    setBall(null);

    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setCombo(0), COMBO_WINDOW_MS + 200);

    ballTimerRef.current = setTimeout(spawnBall, 200);
  }, [ball, combo, spawnBall]);

  /** 게임 종료 시 보상 적용 */
  useEffect(() => {
    if (phase === 'result' && reward) {
      playBallGame(reward);
    }
  }, [phase, reward, playBallGame]);

  /** 언마운트 시 타이머 정리 */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  // ── 준비 화면 ──────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#6B21A8]/90 to-[#1e1b4b]/90 backdrop-blur-sm">
        <div className="text-7xl mb-4 animate-bounce">⚽</div>
        <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          무지개 공 놀이
        </h2>
        <p className="text-white/80 text-sm mb-1 text-center px-8">
          화면에 나타나는 공을 빠르게 탭하세요!
        </p>
        <p className="text-white/60 text-xs mb-5 text-center px-8">
          연속으로 탭하면 콤보 보너스를 받아요 🌈
        </p>

        {/* 등급 안내 */}
        <div className="bg-white/10 rounded-2xl px-5 py-3 mb-5 w-64">
          <div className="text-white/60 text-[10px] text-center mb-2">등급별 보상</div>
          {[
            { label: '🏆 퍼펙트', cond: '200점+', reward: 'EXP 30 · 코인 20 · 힘 +5', drop: '🌈 30%' },
            { label: '⭐ 우수',   cond: '120점+', reward: 'EXP 22 · 코인 12 · 힘 +4', drop: '✨ 15%' },
            { label: '✅ 일반',   cond: '60점+',  reward: 'EXP 15 · 코인 6 · 힘 +3',  drop: '' },
            { label: '🎀 완성',   cond: '~59점',  reward: 'EXP 10 · 코인 2 · 힘 +2',  drop: '' },
          ].map(g => (
            <div key={g.label} className="flex items-center justify-between text-[10px] text-white/80 mb-1">
              <span className="w-16">{g.label}</span>
              <span className="text-white/50">{g.cond}</span>
              <span>{g.reward}{g.drop ? ` + ${g.drop}` : ''}</span>
            </div>
          ))}
          <div className="border-t border-white/20 mt-2 pt-2 text-[10px] text-white/60 text-center">
            콤보 10+ → EXP +15 · 7~9 → +10 · 4~6 → +5
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
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
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
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#6B21A8]/90 to-[#1e1b4b]/90 backdrop-blur-sm overflow-y-auto py-6">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          공놀이 완료!
        </h2>
        <div className="text-2xl font-bold mb-4" style={{ color: gi.color }}>
          {gi.label}
        </div>

        {/* 게임 결과 */}
        <div className="bg-white/10 rounded-3xl p-4 mb-3 w-64">
          <div className="text-white/60 text-xs text-center mb-2">게임 결과</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>탭 점수</span><span className="font-bold">{score}점</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>최대 콤보</span><span className="font-bold">{maxCombo}콤보</span>
          </div>
          <div className="flex justify-between text-white text-sm">
            <span>놓친 공</span><span className="font-bold">{missCount}개</span>
          </div>
        </div>

        {/* 보상 상세 */}
        <div className="rounded-3xl p-4 mb-3 w-64 border" style={{ background: gi.bg, borderColor: gi.color + '60' }}>
          <div className="text-xs text-center mb-2" style={{ color: gi.color }}>지급된 보상</div>

          {/* 기본 보상 */}
          <div className="flex justify-between text-white text-sm mb-1">
            <span>기분 · 피로</span><span className="font-bold">+20 · +15 (고정)</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>힘 성향</span>
            <span className="font-bold" style={{ color: gi.color }}>+{reward.powerBonus}</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>EXP (등급)</span>
            <span className="font-bold" style={{ color: gi.color }}>+{reward.exp}</span>
          </div>

          {/* 콤보 보너스 EXP (방안 C) */}
          {reward.comboExpBonus > 0 && (
            <div className="flex justify-between text-white text-sm mb-1">
              <span>🔥 콤보 보너스 EXP</span>
              <span className="font-bold text-orange-300">+{reward.comboExpBonus}</span>
            </div>
          )}

          {/* 총 EXP */}
          <div className="flex justify-between text-white text-sm mb-1 border-t border-white/20 pt-1 mt-1">
            <span>총 EXP</span>
            <span className="font-bold text-yellow-300">+{reward.totalExp}</span>
          </div>

          <div className="flex justify-between text-white text-sm">
            <span>코인</span>
            <span className="font-bold text-yellow-300">+{reward.coins}</span>
          </div>
        </div>

        {/* 드롭 아이템 (방안 B) */}
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
                <div className="text-white/60 text-[10px] mt-1">인벤토리에 추가되었어요</div>
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
          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
        >
          확인
        </button>
      </div>
    );
  }

  // ── 게임 플레이 화면 ───────────────────────────────────────
  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 10 ? '#34D399' : timeLeft > 5 ? '#FBBF24' : '#F87171';

  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden select-none"
      style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e1b4b 100%)' }}
    >
      {/* 상단 HUD */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col items-center">
          <div className="text-2xl font-extrabold" style={{ color: timerColor, fontFamily: 'Nunito, sans-serif' }}>
            {timeLeft}
          </div>
          <div className="text-white/50 text-[10px]">초</div>
        </div>

        <div className="flex-1 mx-3 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor }}
          />
        </div>

        <div className="flex flex-col items-center">
          <div className="text-2xl font-extrabold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {score}
          </div>
          <div className="text-white/50 text-[10px]">점수</div>
        </div>
      </div>

      {/* 콤보 표시 */}
      <div className="flex justify-center mb-1">
        {combo >= 2 ? (
          <div
            className="px-4 py-1 rounded-full text-white font-bold text-sm animate-combo-pop"
            style={{ background: 'linear-gradient(90deg, #f97316, #ec4899)' }}
          >
            🔥 {combo} 콤보!
          </div>
        ) : (
          <div className="h-7" />
        )}
      </div>

      {/* 게임 필드 */}
      <div
        className="relative mx-4 rounded-3xl overflow-hidden"
        style={{ height: 'calc(100% - 140px)', background: 'rgba(255,255,255,0.05)' }}
      >
        {['✨','⭐','💫','🌟','✨'].map((s, i) => (
          <span
            key={i}
            className="absolute text-lg opacity-20 pointer-events-none"
            style={{ left: `${10 + i * 20}%`, top: `${15 + (i % 3) * 25}%` }}
          >
            {s}
          </span>
        ))}

        {ball && (
          <button
            key={ball.id}
            className="absolute flex items-center justify-center rounded-full cursor-pointer active:scale-90 transition-transform"
            style={{
              left: `${ball.x}%`,
              top: `${ball.y}%`,
              width: '72px',
              height: '72px',
              fontSize: '3rem',
              transform: 'translate(-50%, -50%)',
              animation: 'ball-appear 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
              background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), transparent 60%)',
              filter: 'drop-shadow(0 4px 16px rgba(249,115,22,0.6))',
            }}
            onClick={handleBallTap}
            onTouchStart={handleBallTap}
          >
            ⚽
          </button>
        )}

        {hitEffect && (
          <div
            key={`hit-${hitEffect.id}`}
            className="absolute pointer-events-none text-3xl"
            style={{
              left: `${hitEffect.x}%`,
              top: `${hitEffect.y}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'hit-burst 0.5s ease-out forwards',
            }}
          >
            💥
          </div>
        )}
      </div>

      <div className="text-center mt-2 text-white/50 text-xs">
        공을 빠르게 탭하세요!
      </div>

      <style>{`
        @keyframes ball-appear {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          70%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes hit-burst {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(0.8); }
          50%  { opacity: 1; transform: translate(-50%, -60%) scale(1.4); }
          100% { opacity: 0; transform: translate(-50%, -80%) scale(0.6); }
        }
        @keyframes combo-pop {
          0%   { transform: scale(0.8); }
          50%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-combo-pop { animation: combo-pop 0.3s ease-out; }
      `}</style>
    </div>
  );
}
