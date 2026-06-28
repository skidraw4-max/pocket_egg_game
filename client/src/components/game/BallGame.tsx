/**
 * BallGame - 무지개 공 놀이 미니게임
 * 튜토리얼 설명과 동일한 게임:
 *  - 30초 동안 화면에 나타나는 공을 탭/클릭
 *  - 빠르게 연속 탭 시 콤보 보너스
 *  - 완료 시 기분 +20, 피로 +15, Power +3, EXP +15 지급
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';

interface BallGameProps {
  onClose: () => void;
}

interface BallPos {
  x: number; // % (0~85)
  y: number; // % (0~80)
  id: number;
}

const GAME_DURATION = 30; // 초
const BALL_VISIBLE_MS = 1200; // 공이 화면에 머무는 시간
const COMBO_WINDOW_MS = 800; // 콤보 인정 간격

const BALL_EMOJIS = ['⚽', '🌈', '⚽', '🌟', '⚽', '🎾', '⚽', '💫'];

export default function BallGame({ onClose }: BallGameProps) {
  const { play } = useGame();

  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [ball, setBall] = useState<BallPos | null>(null);
  const [hitEffect, setHitEffect] = useState<{ x: number; y: number; id: number } | null>(null);
  const [missCount, setMissCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ballTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHitRef = useRef<number>(0);
  const ballIdRef = useRef(0);
  const emojiIdxRef = useRef(0);

  /** 새 공 위치 생성 */
  const spawnBall = useCallback(() => {
    ballIdRef.current += 1;
    const x = 5 + Math.random() * 80; // 5~85%
    const y = 10 + Math.random() * 65; // 10~75%
    setBall({ x, y, id: ballIdRef.current });

    // 일정 시간 후 공 사라짐 (미스 처리)
    if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
    ballTimerRef.current = setTimeout(() => {
      setBall(null);
      setMissCount(prev => prev + 1);
      setCombo(0); // 콤보 리셋
      // 잠시 후 새 공 등장
      ballTimerRef.current = setTimeout(spawnBall, 300);
    }, BALL_VISIBLE_MS);
  }, []);

  /** 게임 시작 */
  const startGame = useCallback(() => {
    setPhase('playing');
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMissCount(0);
    setBall(null);

    // 카운트다운 타이머
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          setBall(null);
          setPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 첫 공 등장 (0.5초 후)
    setTimeout(spawnBall, 500);
  }, [spawnBall]);

  /** 공 탭 */
  const handleBallTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!ball) return;

    const now = Date.now();
    const isCombo = now - lastHitRef.current < COMBO_WINDOW_MS;
    lastHitRef.current = now;

    const newCombo = isCombo ? combo + 1 : 1;
    setCombo(newCombo);
    setMaxCombo(prev => Math.max(prev, newCombo));

    const baseScore = 10;
    const comboBonus = Math.min(newCombo - 1, 5) * 3; // 최대 +15
    setScore(prev => prev + baseScore + comboBonus);

    // 히트 이펙트
    setHitEffect({ x: ball.x, y: ball.y, id: ball.id });
    setTimeout(() => setHitEffect(null), 500);

    // 공 제거 후 새 공 등장
    if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
    setBall(null);

    // 콤보 타임아웃
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setCombo(0), COMBO_WINDOW_MS + 200);

    // 다음 공 등장 (빠르게)
    ballTimerRef.current = setTimeout(spawnBall, 200);
  }, [ball, combo, spawnBall]);

  /** 게임 종료 시 보상 지급 */
  useEffect(() => {
    if (phase === 'result') {
      // play() 호출로 기존 보상(기분+20, 피로+15, Power+3, EXP+15) 지급
      play('toy_ball');
    }
  }, [phase, play]);

  /** 언마운트 시 타이머 정리 */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ballTimerRef.current) clearTimeout(ballTimerRef.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  const currentEmoji = BALL_EMOJIS[emojiIdxRef.current % BALL_EMOJIS.length];

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
        <p className="text-white/60 text-xs mb-6 text-center px-8">
          연속으로 탭하면 콤보 보너스를 받아요 🌈
        </p>

        <div className="bg-white/10 rounded-2xl px-6 py-4 mb-8 text-center">
          <div className="text-white/70 text-xs mb-2">게임 시간</div>
          <div className="text-white text-3xl font-bold">{GAME_DURATION}초</div>
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
  if (phase === 'result') {
    const grade =
      score >= 200 ? { label: '🏆 퍼펙트!', color: '#FBBF24', desc: '완벽한 공놀이였어요!' } :
      score >= 120 ? { label: '⭐ 우수!',   color: '#60A5FA', desc: '멋진 공놀이였어요!' } :
      score >= 60  ? { label: '✅ 일반',     color: '#34D399', desc: '잘 했어요!' } :
                     { label: '🎀 완성',     color: '#A78BFA', desc: '다음엔 더 잘할 수 있어요!' };

    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#6B21A8]/90 to-[#1e1b4b]/90 backdrop-blur-sm">
        <div className="text-6xl mb-3">🎉</div>
        <h2 className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          공놀이 완료!
        </h2>
        <div className="text-2xl font-bold mb-4" style={{ color: grade.color }}>
          {grade.label}
        </div>

        <div className="bg-white/15 rounded-3xl p-5 mb-6 w-64 text-center">
          <div className="text-white/70 text-xs mb-3">결과</div>
          <div className="flex justify-between text-white mb-2">
            <span className="text-sm">탭 점수</span>
            <span className="font-bold">{score}점</span>
          </div>
          <div className="flex justify-between text-white mb-2">
            <span className="text-sm">최대 콤보</span>
            <span className="font-bold">{maxCombo}콤보</span>
          </div>
          <div className="flex justify-between text-white mb-3">
            <span className="text-sm">놓친 공</span>
            <span className="font-bold">{missCount}개</span>
          </div>
          <div className="border-t border-white/20 pt-3">
            <div className="text-white/70 text-xs mb-1">보상 지급 완료</div>
            <div className="text-white text-sm font-semibold">
              기분 +20 · 피로 +15 · 힘 +3 · EXP +15
            </div>
          </div>
        </div>

        <p className="text-white/70 text-xs mb-5">{grade.desc}</p>

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
        {/* 타이머 */}
        <div className="flex flex-col items-center">
          <div className="text-2xl font-extrabold" style={{ color: timerColor, fontFamily: 'Nunito, sans-serif' }}>
            {timeLeft}
          </div>
          <div className="text-white/50 text-[10px]">초</div>
        </div>

        {/* 타이머 게이지 */}
        <div className="flex-1 mx-3 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor }}
          />
        </div>

        {/* 점수 */}
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
      <div className="relative mx-4 rounded-3xl overflow-hidden"
        style={{ height: 'calc(100% - 140px)', background: 'rgba(255,255,255,0.05)' }}
      >
        {/* 별 배경 */}
        {['✨','⭐','💫','🌟','✨'].map((s, i) => (
          <span
            key={i}
            className="absolute text-lg opacity-20 pointer-events-none"
            style={{ left: `${10 + i * 20}%`, top: `${15 + (i % 3) * 25}%` }}
          >
            {s}
          </span>
        ))}

        {/* 공 */}
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

        {/* 히트 이펙트 */}
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

      {/* 하단 안내 */}
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
