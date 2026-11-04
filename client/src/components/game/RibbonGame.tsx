/**
 * RibbonGame - 리본 리듬 미니게임
 * BPM 차트 + AudioContext 시계 동기화
 */
import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useSound, getBGMSongTimeMs, RIBBON_BGM_KEYS, setMinigameBgmLock, type BGMKey } from '@/hooks/useSound';
import { calcRibbonReward, type RibbonGameRewardResult, SPECIAL_RIBBON_EASE_ID } from '@/lib/gameState';
import {
  getTrackChart,
  getBeatMs,
  RIBBON_GAME_DURATION_MS,
  type RibbonChartNote,
  type RibbonLane,
  type RibbonTrackConfig,
  type JudgeWindows,
} from '@/lib/ribbonCharts';

interface RibbonGameProps {
  onClose: () => void;
}

type Phase = 'ready' | 'playing' | 'result';

interface ActiveNote extends RibbonChartNote {
  hit: boolean;
  missed: boolean;
}

type HitFlash = 'perfect' | 'good' | 'miss' | null;
type ScreenFlash = 'perfect' | 'miss' | null;

const RIBBON_CONTROLS_TUTORIAL_ID = 'ribbon_controls';
const JUDGE_LINE_Y = 80;
const NOTE_TRAVEL = 72;
const LANE_LABELS = ['◀', '●', '▶'];
const LANE_COLORS = ['#F472B6', '#A78BFA', '#60A5FA'];
const COMBO_MILESTONES = [10, 20, 30, 50];

const GRADE_INFO: Record<string, { label: string; color: string; desc: string; bg: string }> = {
  perfect:  { label: '🏆 퍼펙트!', color: '#FBBF24', desc: '완벽한 리듬이었어요!',       bg: 'rgba(251,191,36,0.15)'  },
  great:    { label: '⭐ 우수!',   color: '#60A5FA', desc: '멋진 리듬이었어요!',         bg: 'rgba(96,165,250,0.15)'  },
  normal:   { label: '✅ 일반',    color: '#34D399', desc: '잘 했어요!',                 bg: 'rgba(52,211,153,0.15)'  },
  complete: { label: '🎀 완성',    color: '#A78BFA', desc: '다음엔 더 잘할 수 있어요!', bg: 'rgba(167,139,250,0.15)' },
};

function noteY(hitTimeMs: number, songMs: number, approachMs: number): number {
  const delta = hitTimeMs - songMs;
  if (delta > approachMs) return -8;
  return JUDGE_LINE_Y - (delta / approachMs) * NOTE_TRAVEL;
}

function noteScale(y: number): number {
  if (y >= JUDGE_LINE_Y) return 1;
  const progress = Math.min(1, Math.max(0, 1 - (JUDGE_LINE_Y - y) / NOTE_TRAVEL));
  return 0.7 + progress * 0.3;
}

function pickRandomTrackKey(): BGMKey {
  return RIBBON_BGM_KEYS[Math.floor(Math.random() * RIBBON_BGM_KEYS.length)];
}

export default function RibbonGame({ onClose }: RibbonGameProps) {
  const { playRibbonGame, state, consumeRibbonEaseTicket, setTutorialSeen } = useGame();
  const { play, preloadSound, playBGM, playBGMFromStart, resumeAudio, stopBGM } = useSound();

  const ribbonEaseQty = state.inventory.find(i => i.id === SPECIAL_RIBBON_EASE_ID)?.quantity ?? 0;
  const [useRibbonEase, setUseRibbonEase] = useState(ribbonEaseQty > 0);
  const [easeApplied, setEaseApplied] = useState(false);
  const [selectedTrackKey, setSelectedTrackKey] = useState<BGMKey>(() => pickRandomTrackKey());

  const [phase, setPhase] = useState<Phase>('ready');
  const [songMs, setSongMs] = useState(0);
  const [notes, setNotes] = useState<ActiveNote[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [reward, setReward] = useState<RibbonGameRewardResult | null>(null);
  const [lastHitLane, setLastHitLane] = useState<RibbonLane | null>(null);
  const [hitFlash, setHitFlash] = useState<HitFlash>(null);
  const [judgeLabel, setJudgeLabel] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [lanePressFlash, setLanePressFlash] = useState<RibbonLane | null>(null);
  const [screenFlash, setScreenFlash] = useState<ScreenFlash>(null);
  const [laneShake, setLaneShake] = useState<RibbonLane | null>(null);
  const [comboBanner, setComboBanner] = useState<number | null>(null);
  const [showGo, setShowGo] = useState(false);
  const [guidePulse, setGuidePulse] = useState(true);

  const trackRef = useRef<RibbonTrackConfig | null>(null);
  const approachMsRef = useRef(1400);
  const judgeRef = useRef<JudgeWindows>(getTrackChart('ribbon-1', false).judge);
  const notesRef = useRef<ActiveNote[]>([]);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const perfectsRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const playingRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lanePressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goShownRef = useRef(false);
  const lastTapRef = useRef<{ lane: RibbonLane; at: number } | null>(null);

  const showControlsTutorial = !(state.tutorialSeen?.[RIBBON_CONTROLS_TUTORIAL_ID]);

  const previewTrack = useMemo(
    () => getTrackChart(selectedTrackKey, false).track,
    [selectedTrackKey],
  );

  const pulseScreen = useCallback((kind: ScreenFlash, ms = 160) => {
    setScreenFlash(kind);
    if (screenFlashTimerRef.current) clearTimeout(screenFlashTimerRef.current);
    screenFlashTimerRef.current = setTimeout(() => setScreenFlash(null), ms);
  }, []);

  const shakeLane = useCallback((lane: RibbonLane) => {
    setLaneShake(lane);
    setTimeout(() => setLaneShake(null), 220);
  }, []);

  const maybeComboBanner = useCallback((value: number) => {
    if (!COMBO_MILESTONES.includes(value)) return;
    setComboBanner(value);
    if (comboBannerTimerRef.current) clearTimeout(comboBannerTimerRef.current);
    comboBannerTimerRef.current = setTimeout(() => setComboBanner(null), 1100);
  }, []);

  const finishGame = useCallback(() => {
    playingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const total = hitsRef.current + missesRef.current;
    const accuracy = total > 0 ? Math.round((hitsRef.current / total) * 100) : 0;
    const r = calcRibbonReward(accuracy, hitsRef.current, perfectsRef.current);
    setReward(r);
    setPhase('result');
  }, []);

  const showFlash = useCallback((lane: RibbonLane, flash: HitFlash, label: string | null) => {
    setLastHitLane(lane);
    setHitFlash(flash);
    setJudgeLabel(label);
    if (flash === 'perfect') pulseScreen('perfect', 140);
    if (flash === 'miss') {
      pulseScreen('miss', 180);
      shakeLane(lane);
    }
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setHitFlash(null);
      setJudgeLabel(null);
    }, 280);
  }, [pulseScreen, shakeLane]);

  const gameLoop = useCallback(() => {
    if (!playingRef.current) return;

    const currentSongMs = getBGMSongTimeMs();
    setSongMs(currentSongMs);

    const judge = judgeRef.current;
    let missCount = 0;
    let firstMissedLane: RibbonLane | null = null;

    const updated = notesRef.current.map(note => {
      if (note.hit || note.missed) return note;
      if (currentSongMs > note.hitTimeMs + judge.MISS_MS) {
        missCount += 1;
        if (firstMissedLane === null) firstMissedLane = note.lane;
        return { ...note, missed: true };
      }
      return note;
    });

    if (missCount > 0) {
      missesRef.current += missCount;
      comboRef.current = 0;
      setMisses(missesRef.current);
      setCombo(0);
      showFlash(firstMissedLane ?? 1, 'miss', 'Miss');
    }

    notesRef.current = updated;
    setNotes([...updated]);

    if (currentSongMs >= (trackRef.current?.durationMs ?? RIBBON_GAME_DURATION_MS)) {
      finishGame();
      return;
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [finishGame, showFlash]);

  const startGame = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    goShownRef.current = false;
    setShowGo(false);
    setComboBanner(null);

    let appliedEase = false;
    if (useRibbonEase && ribbonEaseQty > 0) {
      appliedEase = consumeRibbonEaseTicket();
    }
    setEaseApplied(appliedEase);

    const trackKey = pickRandomTrackKey();
    setSelectedTrackKey(trackKey);
    const chart = getTrackChart(trackKey, appliedEase);
    trackRef.current = chart.track;
    approachMsRef.current = chart.approachMs;
    judgeRef.current = chart.judge;

    const activeNotes: ActiveNote[] = chart.notes.map(n => ({
      ...n,
      hit: false,
      missed: false,
    }));
    notesRef.current = activeNotes;
    setNotes(activeNotes);

    hitsRef.current = 0;
    missesRef.current = 0;
    perfectsRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    setHits(0);
    setMisses(0);
    setPerfects(0);
    setCombo(0);
    setMaxCombo(0);
    setReward(null);
    setSongMs(0);

    resumeAudio();
    preloadSound('ribbonHit');
    preloadSound('ribbonPerfect');

    const ok = await playBGMFromStart(trackKey);
    if (!ok) {
      setStarting(false);
      return;
    }

    playingRef.current = true;
    setPhase('playing');
    setStarting(false);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [
    starting,
    useRibbonEase,
    ribbonEaseQty,
    consumeRibbonEaseTicket,
    playBGMFromStart,
    resumeAudio,
    preloadSound,
    gameLoop,
  ]);

  const flashLanePress = useCallback((lane: RibbonLane) => {
    setLanePressFlash(lane);
    if (lanePressTimerRef.current) clearTimeout(lanePressTimerRef.current);
    lanePressTimerRef.current = setTimeout(() => setLanePressFlash(null), 120);
  }, []);

  const handleLaneTap = useCallback(
    (lane: RibbonLane) => {
      if (!playingRef.current) return;

      const now = performance.now();
      const last = lastTapRef.current;
      if (last && last.lane === lane && now - last.at < 80) return;
      lastTapRef.current = { lane, at: now };
      flashLanePress(lane);

      const songTime = getBGMSongTimeMs();
      const track = trackRef.current;
      if (!track) return;

      const beatMs = getBeatMs(track.bpm);
      if (songTime < track.countInBeats * beatMs - beatMs * 0.5) return;

      const judge = judgeRef.current;
      const tapMs = songTime - judge.TOUCH_LATENCY_MS;

      const candidates = notesRef.current.filter(
        n =>
          n.lane === lane &&
          !n.hit &&
          !n.missed &&
          Math.abs(tapMs - n.hitTimeMs) <= judge.GOOD_MS,
      );

      if (candidates.length === 0) {
        showFlash(lane, 'miss', 'Miss');
        return;
      }

      const target = candidates.reduce((best, n) =>
        Math.abs(tapMs - n.hitTimeMs) < Math.abs(tapMs - best.hitTimeMs) ? n : best,
      );

      const diff = Math.abs(tapMs - target.hitTimeMs);
      const isPerfect = diff <= judge.PERFECT_MS;

      notesRef.current = notesRef.current.map(n =>
        n.id === target.id ? { ...n, hit: true } : n,
      );
      setNotes([...notesRef.current]);

      hitsRef.current += 1;
      comboRef.current += 1;
      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current;
        setMaxCombo(maxComboRef.current);
      }
      setHits(hitsRef.current);
      setCombo(comboRef.current);
      maybeComboBanner(comboRef.current);

      if (isPerfect) {
        perfectsRef.current += 1;
        setPerfects(perfectsRef.current);
        showFlash(lane, 'perfect', 'Perfect!');
        play('ribbonPerfect');
      } else {
        showFlash(lane, 'good', 'Great!');
        play('ribbonHit');
      }
    },
    [flashLanePress, play, showFlash, maybeComboBanner],
  );

  const handleClose = useCallback(() => {
    playingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (phase === 'result' && reward) {
      playRibbonGame(reward);
    }
  }, [phase, reward, playRibbonGame]);

  useEffect(() => {
    setMinigameBgmLock(true);
    stopBGM();

    return () => {
      setMinigameBgmLock(false);
      playingRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (lanePressTimerRef.current) clearTimeout(lanePressTimerRef.current);
      if (screenFlashTimerRef.current) clearTimeout(screenFlashTimerRef.current);
      if (comboBannerTimerRef.current) clearTimeout(comboBannerTimerRef.current);
      playBGM('main-room');
    };
  }, [playBGM, stopBGM]);

  const totalNotes = hits + misses;
  const accuracy = totalNotes > 0 ? Math.round((hits / totalNotes) * 100) : 0;
  const track = trackRef.current ?? previewTrack;
  const beatMs = getBeatMs(track.bpm);
  const countInMs = track.countInBeats * beatMs;
  const timeLeftSec = Math.max(0, Math.ceil((track.durationMs - songMs) / 1000));
  const songProgress = Math.min(100, (songMs / track.durationMs) * 100);
  const inCountdown = phase === 'playing' && songMs < countInMs;
  const countdownBeat = inCountdown
    ? Math.max(1, track.countInBeats - Math.floor(songMs / beatMs))
    : null;
  const beatPhase = (songMs % beatMs) / beatMs;
  const beatPulse = 0.4 + 0.6 * (1 - Math.abs(beatPhase - 0.5) * 2);
  const approachMs = approachMsRef.current;
  const showLaneGuide = showControlsTutorial && (inCountdown || (songMs >= countInMs && songMs < countInMs + 2500));

  useEffect(() => {
    if (phase !== 'playing') return;
    if (songMs >= countInMs && songMs < countInMs + 120 && !goShownRef.current) {
      goShownRef.current = true;
      setShowGo(true);
      setTimeout(() => setShowGo(false), 650);
      if (showControlsTutorial) {
        setTutorialSeen(RIBBON_CONTROLS_TUTORIAL_ID, true);
      }
    }
  }, [phase, songMs, countInMs, showControlsTutorial, setTutorialSeen]);

  useEffect(() => {
    if (!showLaneGuide) return;
    const id = setInterval(() => setGuidePulse(p => !p), 600);
    return () => clearInterval(id);
  }, [showLaneGuide]);

  const stopClickBubble = (e: MouseEvent) => e.stopPropagation();

  const bgBrightness = 1 + beatPulse * 0.07;

  if (phase === 'ready') {
    return (
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#831843]/90 to-[#1e1b4b]/90 backdrop-blur-sm overflow-y-auto py-6"
        onClick={stopClickBubble}
      >
        <div className="text-7xl mb-4 animate-bounce">🎀</div>
        <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          리본 리듬
        </h2>
        <p className="text-white/80 text-sm mb-1 text-center px-8">
          🎀가 판정선에 닿을 때, <strong>해당 색 레인</strong> 아무 곳이나 탭!
        </p>
        <p className="text-white/60 text-xs mb-4 text-center px-8">
          4박 카운트인 → GO! 후 시작 · {RIBBON_GAME_DURATION_MS / 1000}초
        </p>

        {/* 미니 레인 가이드 */}
        <div className="flex gap-1 mb-4 w-72 h-24 rounded-2xl overflow-hidden border border-white/20">
          {([0, 1, 2] as RibbonLane[]).map(lane => (
            <div
              key={lane}
              className="flex-1 flex flex-col items-center justify-end pb-2"
              style={{ background: `${LANE_COLORS[lane]}33` }}
            >
              <span className="text-2xl mb-1">🎀</span>
              <span className="text-white/80 text-xs font-bold">{LANE_LABELS[lane]}</span>
              <span className="text-white/50 text-[9px]">TAP</span>
            </div>
          ))}
        </div>

        <div className="bg-white/10 rounded-2xl px-5 py-3 mb-4 w-72 text-center">
          <div className="text-white/50 text-[10px] mb-1">다음 곡 (랜덤)</div>
          <div className="text-white font-bold text-sm">{previewTrack.title}</div>
          <div className="text-white/60 text-xs">{previewTrack.bpm} BPM · Easy</div>
        </div>

        <div className="bg-white/10 rounded-2xl px-5 py-3 mb-5 w-72">
          <div className="text-white/60 text-[10px] text-center mb-2">등급별 보상</div>
          {[
            { label: '🏆 퍼펙트', cond: '95%+', reward: 'EXP 25 · 코인 18 · 매력 +5', drop: '🌈 40%' },
            { label: '⭐ 우수', cond: '85%+', reward: 'EXP 20 · 코인 12 · 매력 +4', drop: '✨ 25%' },
            { label: '✅ 일반', cond: '70%+', reward: 'EXP 15 · 코인 8 · 매력 +3', drop: '' },
            { label: '🎀 완성', cond: '~69%', reward: 'EXP 10 · 코인 4 · 매력 +2', drop: '' },
          ].map(g => (
            <div key={g.label} className="flex items-center justify-between text-[10px] text-white/80 mb-1 gap-1">
              <span className="w-14 shrink-0">{g.label}</span>
              <span className="text-white/50 shrink-0">{g.cond}</span>
              <span className="text-right">{g.reward}{g.drop ? ` + ${g.drop}` : ''}</span>
            </div>
          ))}
        </div>

        {ribbonEaseQty > 0 && (
          <label className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 cursor-pointer w-72">
            <input
              type="checkbox"
              checked={useRibbonEase}
              onChange={e => setUseRibbonEase(e.target.checked)}
              className="w-4 h-4 accent-pink-400"
            />
            <div className="text-left">
              <p className="text-white text-xs font-bold">🎵 리듬 완화권 사용 (×{ribbonEaseQty})</p>
              <p className="text-white/60 text-[10px]">노트 접근 20% 여유 · 판정 +15%</p>
            </div>
          </label>
        )}

        <div className="flex gap-3">
          <button onClick={handleClose} className="px-6 py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm">
            취소
          </button>
          <button
            onClick={() => void startGame()}
            disabled={starting}
            className="px-8 py-3 rounded-2xl font-bold text-white text-base disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
          >
            {starting ? '준비 중…' : '시작! 🎮'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && reward) {
    const gi = GRADE_INFO[reward.grade];
    return (
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#831843]/90 to-[#1e1b4b]/90 backdrop-blur-sm overflow-y-auto py-6"
        onClick={stopClickBubble}
      >
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          리듬 완료!
        </h2>
        <div className="text-2xl font-bold mb-4" style={{ color: gi.color }}>{gi.label}</div>

        <div className="bg-white/10 rounded-3xl p-4 mb-3 w-64">
          <div className="text-white/60 text-xs text-center mb-2">게임 결과</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>정확도</span><span className="font-bold">{reward.accuracy}%</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>히트 / 미스</span><span className="font-bold">{hits} / {misses}</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>퍼펙트</span><span className="font-bold">{perfects}회</span>
          </div>
          <div className="flex justify-between text-white text-sm">
            <span>최대 콤보</span><span className="font-bold">{maxCombo}</span>
          </div>
        </div>

        <div className="rounded-3xl p-4 mb-3 w-64 border" style={{ background: gi.bg, borderColor: gi.color + '60' }}>
          <div className="text-xs text-center mb-2" style={{ color: gi.color }}>지급된 보상</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>기분 · 피로</span><span className="font-bold">+25 · -10</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>매력 성향</span>
            <span className="font-bold" style={{ color: gi.color }}>+{reward.charmBonus}</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>EXP</span>
            <span className="font-bold" style={{ color: gi.color }}>+{reward.exp}</span>
          </div>
          <div className="flex justify-between text-white text-sm">
            <span>코인</span>
            <span className="font-bold text-yellow-300">+{reward.coins}</span>
          </div>
        </div>

        {reward.dropItem && (
          <div
            className={`rounded-2xl px-5 py-3 mb-3 w-64 text-center border ${
              reward.dropItem.dropped ? 'bg-yellow-400/20 border-yellow-400/60' : 'bg-white/5 border-white/20'
            }`}
          >
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
              </>
            )}
          </div>
        )}

        <p className="text-white/60 text-xs mb-4">{gi.desc}</p>
        <button
          onClick={handleClose}
          className="px-10 py-3 rounded-2xl font-bold text-white text-base"
          style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
        >
          확인
        </button>
      </div>
    );
  }

  const timerColor = timeLeftSec > 15 ? '#34D399' : timeLeftSec > 5 ? '#FBBF24' : '#F87171';
  const stripeOffset = (songMs / beatMs) * 12;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col select-none overflow-hidden transition-[filter] duration-75"
      style={{
        background: `linear-gradient(160deg, #831843 0%, #4c1d95 50%, #1e1b4b 100%)`,
        filter: `brightness(${bgBrightness})`,
      }}
      onClick={stopClickBubble}
    >
      {/* Perfect / Miss 전체 플래시 */}
      {screenFlash === 'perfect' && (
        <div className="absolute inset-0 z-[60] pointer-events-none bg-yellow-300/20 animate-pulse" />
      )}
      {screenFlash === 'miss' && (
        <div className="absolute inset-0 z-[60] pointer-events-none bg-red-500/15" />
      )}

      {/* 콤보 마일스톤 배너 */}
      {comboBanner !== null && (
        <div className="absolute top-[28%] left-0 right-0 z-[55] flex justify-center pointer-events-none">
          <div
            className="px-5 py-2 rounded-full font-extrabold text-white text-lg animate-bounce"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.9), rgba(236,72,153,0.9))',
              fontFamily: 'Nunito, sans-serif',
              boxShadow: '0 0 24px rgba(251,191,36,0.5)',
            }}
          >
            🔥 {comboBanner} COMBO!
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="px-4 pt-app-safe pb-2 relative z-10">
        {easeApplied && (
          <div className="flex justify-center mb-1">
            <span className="px-2 py-0.5 rounded-full bg-pink-500/80 text-white text-[10px] font-bold">
              🎵 완화권
            </span>
          </div>
        )}
        <div className="text-white/60 text-[10px] text-center mb-1">
          {track.title} · {track.bpm} BPM
        </div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-white/50 text-[10px]">COMBO</div>
            <div
              className="text-2xl font-extrabold tabular-nums transition-transform duration-150"
              style={{
                fontFamily: 'Nunito, sans-serif',
                color: combo >= 10 ? '#FBBF24' : '#FFFFFF',
                transform: combo >= 10 && beatPulse > 0.8 ? `scale(${1 + (beatPulse - 0.8) * 0.15})` : 'scale(1)',
              }}
            >
              {combo}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-extrabold tabular-nums"
              style={{ color: timerColor, fontFamily: 'Nunito, sans-serif' }}
            >
              {timeLeftSec}
            </div>
            <div className="text-white/50 text-[10px]">초 남음</div>
          </div>
          <div className="text-right">
            <div className="text-white/50 text-[10px]">정확도</div>
            <div className="text-2xl font-extrabold text-white tabular-nums" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {accuracy}%
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${songProgress}%`,
              background: `linear-gradient(90deg, #F472B6, #A78BFA)`,
              boxShadow: `0 0 ${beatPulse * 8}px rgba(167,139,250,0.6)`,
            }}
          />
        </div>
        <div className="flex justify-center gap-1.5 mb-1">
          {[0, 1, 2, 3].map(i => {
            const active = Math.floor(songMs / beatMs) % 4 === i;
            return (
              <div
                key={i}
                className="rounded-sm transition-all duration-75"
                style={{
                  width: 14,
                  height: active ? 4 + beatPulse * 6 : 4,
                  background: active ? '#F472B6' : 'rgba(255,255,255,0.25)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 게임 필드 */}
      <div className="relative flex-1 mx-3 mb-2 rounded-3xl overflow-hidden border border-white/10">
        {/* 박자 스트라이프 배경 */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 24px)',
            backgroundPositionY: `${stripeOffset}px`,
          }}
        />

        {/* 전체 높이 레인 터치 컬럼 */}
        <div className="absolute inset-0 flex z-0">
          {([0, 1, 2] as RibbonLane[]).map(lane => {
            const isPressed = lanePressFlash === lane;
            const isShaking = laneShake === lane;
            const guideActive = showLaneGuide && guidePulse;
            return (
              <button
                key={`lane-col-${lane}`}
                type="button"
                aria-label={`레인 ${lane + 1}`}
                className="flex-1 relative flex flex-col items-center justify-end touch-manipulation transition-transform duration-75"
                style={{
                  background: isPressed
                    ? `${LANE_COLORS[lane]}55`
                    : guideActive
                      ? `${LANE_COLORS[lane]}28`
                      : `${LANE_COLORS[lane]}12`,
                  borderLeft: lane > 0 ? '1px solid rgba(255,255,255,0.08)' : undefined,
                  transform: isShaking ? 'translateX(3px)' : isPressed ? 'scale(0.98)' : 'scale(1)',
                  boxShadow: guideActive ? `inset 0 0 24px ${LANE_COLORS[lane]}44` : undefined,
                }}
                onPointerDown={e => {
                  e.preventDefault();
                  handleLaneTap(lane);
                }}
              >
                {/* 판정선 구역 가이드 */}
                <div
                  className="absolute left-1 right-1 pointer-events-none rounded-xl"
                  style={{
                    top: `${JUDGE_LINE_Y - 6}%`,
                    height: '12%',
                    border: `1px dashed ${LANE_COLORS[lane]}66`,
                    background: `${LANE_COLORS[lane]}0A`,
                  }}
                />
                <div className="relative z-10 mb-3 pb-1 flex flex-col items-center gap-0.5">
                  <span className="text-xl font-bold text-white drop-shadow">{LANE_LABELS[lane]}</span>
                  <span
                    className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: `${LANE_COLORS[lane]}44`, color: '#fff' }}
                  >
                    TAP
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 노트·판정선 (터치 통과) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div
            className="absolute left-0 right-0 border-y-2"
            style={{
              top: `${JUDGE_LINE_Y - 4}%`,
              height: '8%',
              borderColor: `rgba(244,114,182,${0.5 + beatPulse * 0.3})`,
              background: `rgba(244,114,182,${0.08 + beatPulse * 0.08})`,
              boxShadow: `0 0 ${12 + beatPulse * 16}px rgba(244,114,182,0.35)`,
            }}
          />

          {[0, 1, 2].map(lane => (
            <div
              key={`recv-${lane}`}
              className="absolute rounded-full border-2"
              style={{
                left: `${lane * 33.33 + 16.66}%`,
                top: `${JUDGE_LINE_Y}%`,
                width: 28 + beatPulse * 6,
                height: 28 + beatPulse * 6,
                transform: 'translate(-50%, -50%)',
                borderColor: LANE_COLORS[lane],
                boxShadow: `0 0 ${10 + beatPulse * 12}px ${LANE_COLORS[lane]}77`,
              }}
            />
          ))}

          {notes
            .filter(n => !n.hit && noteY(n.hitTimeMs, songMs, approachMs) > -5 && noteY(n.hitTimeMs, songMs, approachMs) < 98)
            .map(note => {
              const y = noteY(note.hitTimeMs, songMs, approachMs);
              const laneCenter = note.lane * 33.33 + 16.66;
              const scale = noteScale(y);
              const nearJudge = Math.abs(y - JUDGE_LINE_Y) < 8;
              return (
                <div
                  key={note.id}
                  className="absolute"
                  style={{ left: `${laneCenter}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-0.5 rounded-full opacity-40"
                    style={{
                      top: '50%',
                      height: `${Math.max(0, (JUDGE_LINE_Y - y) * 4)}px`,
                      background: LANE_COLORS[note.lane],
                    }}
                  />
                  <div
                    className="text-5xl transition-transform duration-75"
                    style={{
                      transform: `scale(${scale})`,
                      opacity: note.missed ? 0.35 : 1,
                      filter: note.missed
                        ? 'grayscale(1)'
                        : nearJudge
                          ? `drop-shadow(0 0 ${8 + beatPulse * 6}px ${LANE_COLORS[note.lane]})`
                          : 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
                    }}
                  >
                    🎀
                  </div>
                </div>
              );
            })}

          {judgeLabel && lastHitLane !== null && (
            <div
              className="absolute font-extrabold text-sm"
              style={{
                left: `${lastHitLane * 33.33 + 16.66}%`,
                top: `${JUDGE_LINE_Y - 14}%`,
                transform: 'translate(-50%, -50%) scale(1.1)',
                color: hitFlash === 'perfect' ? '#FBBF24' : hitFlash === 'good' ? '#60A5FA' : '#F87171',
                fontFamily: 'Nunito, sans-serif',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              {judgeLabel}
            </div>
          )}
        </div>

        {/* 첫 플레이 튜토리얼 (카운트인 + 시작 직후) */}
        {showLaneGuide && (
          <div className="absolute inset-x-0 top-3 z-20 pointer-events-none flex flex-col items-center px-4">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/20">
              <p className="text-white text-xs font-bold">🎀가 판정선에 닿을 때 해당 색 레인을 탭!</p>
              <p className="text-white/60 text-[10px] mt-0.5">레인 아무 곳이나 OK · 아래 TAP 표시 참고</p>
            </div>
            <div className="text-white/70 text-2xl mt-2 animate-bounce">↓</div>
          </div>
        )}

        {/* 카운트인 / GO! */}
        {inCountdown && countdownBeat !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-30">
            <div
              className="text-7xl font-extrabold text-white"
              style={{
                fontFamily: 'Nunito, sans-serif',
                textShadow: '0 0 24px rgba(244,114,182,0.8)',
                transform: `scale(${1 + beatPulse * 0.15})`,
              }}
            >
              {countdownBeat}
            </div>
          </div>
        )}

        {showGo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div
              className="text-6xl font-extrabold text-white animate-pulse"
              style={{
                fontFamily: 'Nunito, sans-serif',
                textShadow: '0 0 32px rgba(251,191,36,0.9)',
                color: '#FBBF24',
              }}
            >
              GO!
            </div>
          </div>
        )}
      </div>

      <div className="text-center pb-app-safe pt-1 text-white/60 text-xs relative z-10">
        해당 색 레인 전체가 터치 영역 · 판정선에서 🎀 탭!
      </div>
    </div>
  );
}
