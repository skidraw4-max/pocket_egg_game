/**
 * LeafFlipGame - 잎사귀 뒤집기 미니게임
 * 10쌍 20장 메모리 매치, 4×5 그리드 — 턴 수 기반 등급 보상
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import {
  calcLeafFlipReward,
  FRAGMENT_DROP_RATES,
  type LeafFlipRewardResult,
} from '@/lib/gameState';
import { TUTORIALS } from '@/lib/tutorialData';
import BottomSheetPanel from '@/components/ui/BottomSheetPanel';

interface LeafFlipGameProps {
  onClose: () => void;
}

type Phase = 'ready' | 'playing' | 'result';

export interface CardPairDef {
  id: string;
  emoji: string;
  name: string;
}

/** 10쌍 반려몬 카드 — speciesRegistry와 동일 이모지/이름 */
export const CARD_PAIRS: CardPairDef[] = [
  { id: 'basicmon', emoji: '🥚', name: '기본몬' },
  { id: 'powermon', emoji: '💪', name: '파워몬' },
  { id: 'wizmon', emoji: '🧠', name: '위즈몬' },
  { id: 'lovelemon', emoji: '💖', name: '러블리몬' },
  { id: 'greenmon', emoji: '🌿', name: '그린몬' },
  { id: 'thundermon', emoji: '⚡', name: '번개몬' },
  { id: 'dragonmon', emoji: '🐉', name: '드래곤몬' },
  { id: 'magicmon', emoji: '🔮', name: '매직몬' },
  { id: 'angelmon', emoji: '👼', name: '엔젤몬' },
  { id: 'forestmon', emoji: '🌳', name: '포레스몬' },
];

interface FlipCard {
  uid: number;
  pairId: string;
  emoji: string;
  name: string;
  flipped: boolean;
  matched: boolean;
}

const CARD_BACK = '🌿';
const MISMATCH_DELAY_MS = 800;
const GRID_COLS = 4;

const GRADE_INFO: Record<string, { label: string; color: string; desc: string; bg: string }> = {
  perfect: { label: '🏆 퍼펙트!', color: '#FBBF24', desc: '기억력이 최고예요!', bg: 'rgba(251,191,36,0.15)' },
  great: { label: '⭐ 우수!', color: '#60A5FA', desc: '멋진 짝 맞추기였어요!', bg: 'rgba(96,165,250,0.15)' },
  normal: { label: '✅ 일반', color: '#34D399', desc: '잘 했어요!', bg: 'rgba(52,211,153,0.15)' },
  complete: { label: '🎀 완성', color: '#A78BFA', desc: '다음엔 더 적은 턴으로!', bg: 'rgba(167,139,250,0.15)' },
};

function getFragmentDropChance(dropItem: NonNullable<LeafFlipRewardResult['dropItem']>): string {
  const rate = dropItem.id === 'fragment_sparkle'
    ? FRAGMENT_DROP_RATES.sparkle
    : FRAGMENT_DROP_RATES.rainbow;
  return `${Math.round(rate * 100)}%`;
}

function buildDeck(): FlipCard[] {
  const cards: FlipCard[] = [];
  let uid = 0;
  for (const pair of CARD_PAIRS) {
    for (let copy = 0; copy < 2; copy++) {
      cards.push({
        uid: uid++,
        pairId: pair.id,
        emoji: pair.emoji,
        name: pair.name,
        flipped: false,
        matched: false,
      });
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export default function LeafFlipGame({ onClose }: LeafFlipGameProps) {
  const { playLeafFlipGame } = useGame();
  const tutorial = TUTORIALS['toy_leaf'];

  const [phase, setPhase] = useState<Phase>('ready');
  const [cards, setCards] = useState<FlipCard[]>(() => buildDeck());
  const [turns, setTurns] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [reward, setReward] = useState<LeafFlipRewardResult | null>(null);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [checking, setChecking] = useState(false);
  const [peekIds, setPeekIds] = useState<number[]>([]);

  const firstPickRef = useRef<number | null>(null);
  const rewardedRef = useRef(false);

  const startGame = useCallback(() => {
    setCards(buildDeck());
    setTurns(0);
    setMatchedPairs(0);
    setReward(null);
    setChecking(false);
    setPeekIds([]);
    firstPickRef.current = null;
    rewardedRef.current = false;
    setPhase('playing');
  }, []);

  const finishGame = useCallback((finalTurns: number) => {
    const r = calcLeafFlipReward(finalTurns);
    setReward(r);
    setPhase('result');
  }, []);

  const handleCardClick = useCallback((uid: number) => {
    if (phase !== 'playing' || checking) return;

    setCards(prev => {
      const card = prev.find(c => c.uid === uid);
      if (!card || card.matched || card.flipped) return prev;

      const next = prev.map(c => (c.uid === uid ? { ...c, flipped: true } : c));

      if (firstPickRef.current === null) {
        firstPickRef.current = uid;
        return next;
      }

      const firstUid = firstPickRef.current;
      firstPickRef.current = null;
      const first = next.find(c => c.uid === firstUid);
      const second = next.find(c => c.uid === uid);
      if (!first || !second) return prev;

      setChecking(true);
      setTurns(t => {
        const finalTurns = t + 1;

        if (first.pairId === second.pairId) {
          const pairs = prev.filter(c => c.matched || c.pairId === first.pairId).length / 2 + 1;
          setMatchedPairs(pairs);
          setChecking(false);
          if (pairs >= CARD_PAIRS.length) {
            setTimeout(() => finishGame(finalTurns), 400);
          }
        }

        return finalTurns;
      });

      if (first.pairId === second.pairId) {
        return next.map(c =>
          c.pairId === first.pairId ? { ...c, matched: true, flipped: true } : c,
        );
      }

      setPeekIds([firstUid, uid]);
      setTimeout(() => {
        setCards(cur =>
          cur.map(c =>
            c.uid === firstUid || c.uid === uid ? { ...c, flipped: false } : c,
          ),
        );
        setPeekIds([]);
        setChecking(false);
      }, MISMATCH_DELAY_MS);

      return next;
    });
  }, [phase, checking, finishGame]);

  useEffect(() => {
    if (phase === 'result' && reward && !rewardedRef.current) {
      rewardedRef.current = true;
      playLeafFlipGame(reward);
    }
  }, [phase, reward, playLeafFlipGame]);

  const handleExitRequest = () => {
    if (phase === 'result') {
      onClose();
    } else {
      setShowConfirmExit(true);
    }
  };

  if (phase === 'ready') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#14532d]/90 to-[#1e1b4b]/90 backdrop-blur-sm overflow-y-auto py-6">
        <div className="text-7xl mb-4 animate-bounce">🌿</div>
        <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          잎사귀 뒤집기
        </h2>
        <p className="text-white/80 text-sm mb-1 text-center px-8">
          카드를 뒤집어 같은 반려몬 짝을 찾으세요!
        </p>
        <p className="text-white/60 text-xs mb-5 text-center px-8">
          10쌍 · 4×5 그리드 · 턴이 적을수록 높은 등급
        </p>

        <div className="bg-white/10 rounded-2xl px-5 py-3 mb-5 w-72">
          <div className="text-white/60 text-[10px] text-center mb-2">등급별 보상 (턴 수)</div>
          {[
            { label: '🏆 퍼펙트', cond: '≤12턴', reward: 'EXP 26 · 코인 18 · 활력 +5', drop: '🌈 40%' },
            { label: '⭐ 우수', cond: '≤17턴', reward: 'EXP 20 · 코인 12 · 활력 +4', drop: '✨ 25%' },
            { label: '✅ 일반', cond: '≤24턴', reward: 'EXP 15 · 코인 8 · 활력 +3', drop: '' },
            { label: '🎀 완성', cond: '25턴+', reward: 'EXP 10 · 코인 3 · 활력 +2', drop: '' },
          ].map(g => (
            <div key={g.label} className="flex items-center justify-between text-[10px] text-white/80 mb-1 gap-1">
              <span className="w-14 shrink-0">{g.label}</span>
              <span className="text-white/50 shrink-0">{g.cond}</span>
              <span className="text-right">{g.reward}{g.drop ? ` + ${g.drop}` : ''}</span>
            </div>
          ))}
          <div className="border-t border-white/20 mt-2 pt-2 text-[10px] text-white/60 text-center">
            기분 +18 · 피로 +8 · 친밀 +2
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm">
            취소
          </button>
          <button
            onClick={startGame}
            className="px-8 py-3 rounded-2xl font-bold text-white text-base"
            style={{ background: 'linear-gradient(135deg, #22c55e, #14b8a6)' }}
          >
            시작! 🎮
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && reward) {
    const gi = GRADE_INFO[reward.grade];
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#14532d]/90 to-[#1e1b4b]/90 backdrop-blur-sm overflow-y-auto py-6">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-xl font-extrabold text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          짝 맞추기 완료!
        </h2>
        <div className="text-2xl font-bold mb-4" style={{ color: gi.color }}>{gi.label}</div>

        <div className="bg-white/10 rounded-3xl p-4 mb-3 w-64">
          <div className="text-white/60 text-xs text-center mb-2">게임 결과</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>턴 수</span><span className="font-bold">{reward.turns}턴</span>
          </div>
          <div className="flex justify-between text-white text-sm">
            <span>맞춘 짝</span><span className="font-bold">{CARD_PAIRS.length}/{CARD_PAIRS.length}</span>
          </div>
        </div>

        <div className="rounded-3xl p-4 mb-3 w-64 border" style={{ background: gi.bg, borderColor: gi.color + '60' }}>
          <div className="text-xs text-center mb-2" style={{ color: gi.color }}>지급된 보상</div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>기분 · 피로</span><span className="font-bold">+18 · +8</span>
          </div>
          <div className="flex justify-between text-white text-sm mb-1">
            <span>친밀 · 활력</span>
            <span className="font-bold">+2 · +{reward.vitalityBonus}</span>
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
          <div className={`rounded-2xl px-5 py-3 mb-3 w-64 text-center border ${
            reward.dropItem.dropped ? 'bg-yellow-400/20 border-yellow-400/60' : 'bg-white/5 border-white/20'
          }`}>
            {reward.dropItem.dropped ? (
              <>
                <div className="text-yellow-300 text-xs font-bold mb-1">✨ 아이템 드롭!</div>
                <div className="text-3xl mb-1">{reward.dropItem.icon}</div>
                <div className="text-white font-semibold text-sm">{reward.dropItem.name}</div>
              </>
            ) : (
              <>
                <div className="text-white/40 text-xs mb-1">드롭 실패 ({getFragmentDropChance(reward.dropItem)})</div>
                <div className="text-2xl opacity-30">{reward.dropItem.icon}</div>
              </>
            )}
          </div>
        )}

        <p className="text-white/60 text-xs mb-4">{gi.desc}</p>
        <button
          onClick={onClose}
          className="px-10 py-3 rounded-2xl font-bold text-white text-base"
          style={{ background: 'linear-gradient(135deg, #22c55e, #14b8a6)' }}
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #14532d 0%, #065f46 40%, #1e1b4b 100%)' }}
    >
      {/* HUD */}
      <div className="flex items-center justify-between px-4 pt-app-safe pb-2">
        <button
          onClick={handleExitRequest}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold"
        >
          ← 나가기
        </button>
        <h2 className="text-sm font-bold text-white">🌿 잎사귀 뒤집기</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/80 font-medium">{turns}턴</div>
          <button
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm"
            aria-label="도움말"
          >
            ❓
          </button>
        </div>
      </div>

      {/* 진행 */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: CARD_PAIRS.length }, (_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < matchedPairs ? 'bg-green-400 scale-110' : 'bg-white/25'
              }`}
            />
          ))}
          <span className="text-[10px] text-white/60 ml-1">{matchedPairs}/{CARD_PAIRS.length}</span>
        </div>
      </div>

      {/* 4×5 그리드 */}
      <div className="flex-1 flex items-center justify-center px-3 pb-4">
        <div
          className="grid gap-1.5 w-full max-w-[340px]"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          {cards.map(card => {
            const showFace = card.flipped || card.matched;
            const isPeeking = peekIds.includes(card.uid);
            return (
              <button
                key={card.uid}
                type="button"
                disabled={card.matched || checking && !showFace}
                onClick={() => handleCardClick(card.uid)}
                className={`
                  aspect-[4/5] rounded-xl flex flex-col items-center justify-center
                  transition-all duration-200 border-2
                  ${card.matched
                    ? 'bg-green-500/30 border-green-400/50 scale-95 cursor-default'
                    : showFace
                      ? 'bg-white/95 border-white shadow-md active:scale-95'
                      : 'bg-green-800/60 border-green-600/40 shadow-inner active:scale-95'
                  }
                  ${isPeeking && !card.matched ? 'ring-2 ring-red-400/60' : ''}
                `}
              >
                {showFace ? (
                  <>
                    <span className="text-2xl leading-none">{card.emoji}</span>
                    <span className="text-[8px] text-green-800/70 font-medium mt-0.5 leading-tight">{card.name}</span>
                  </>
                ) : (
                  <span className="text-2xl opacity-90">{CARD_BACK}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center pb-3 text-white/50 text-xs">
        카드를 탭해서 같은 반려몬 짝을 찾으세요!
      </div>

      {/* 나가기 확인 */}
      {showConfirmExit && (
        <div
          className="absolute inset-0 z-60 flex items-center justify-center bg-black/40"
          onClick={() => setShowConfirmExit(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 mx-8 shadow-2xl text-center animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base font-bold text-warm-brown mb-2">게임을 나가시겠어요?</p>
            <p className="text-sm text-sub-brown mb-5">진행 중인 게임은 저장되지 않아요.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmExit(false)}
                className="flex-1 py-2.5 rounded-2xl bg-muted text-sm font-semibold text-sub-brown"
              >
                계속하기
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-peach text-sm font-semibold text-warm-brown"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도움말 */}
      {showHelp && (
        <div
          className="absolute inset-0 z-60 flex items-end bg-black/50"
          onClick={() => setShowHelp(false)}
        >
          <BottomSheetPanel
            className="bg-white rounded-t-3xl shadow-2xl"
            maxHeight="85"
            onClick={e => e.stopPropagation()}
            bodyClassName="px-5 py-4"
            header={
              <div className="bg-gradient-to-r from-green-500 to-teal-500 px-5 pt-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tutorial.gameIcon}</span>
                  <div>
                    <h3 className="text-base font-bold text-white">{tutorial.gameTitle} 도움말</h3>
                    <p className="text-xs text-white/80">{tutorial.subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm"
                >
                  ✕
                </button>
              </div>
            }
            footer={
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-sm rounded-2xl shadow-md"
              >
                계속하기 🍃
              </button>
            }
          >
            {tutorial.steps.map((step, i) => (
              <div key={i} className="flex gap-3 mb-4">
                <span className="text-2xl shrink-0">{step.icon}</span>
                <div>
                  <p className="text-sm font-bold text-warm-brown">{step.title}</p>
                  <p className="text-xs text-sub-brown leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
            <div className="bg-green-50 rounded-2xl p-3 border border-green-200 mb-2">
              <p className="text-xs text-green-800 font-semibold mb-2">💡 팁</p>
              <p className="text-xs text-sub-brown">{tutorial.tip}</p>
            </div>
          </BottomSheetPanel>
        </div>
      )}
    </div>
  );
}
