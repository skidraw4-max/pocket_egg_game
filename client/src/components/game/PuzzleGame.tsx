/**
 * PuzzleGame - 별 퍼즐 미니게임
 * Cozy Nursery: 3×3 슬라이딩 퍼즐, 완성 시 보상 지급
 * 방식 2: 게임 내 ❓ 도움말 버튼으로 튜토리얼 오버레이 표시
 * 개선: 방안 A(목표 미리보기) + 방안 C(타일 숫자 표시)
 */
import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { calcPuzzleReward } from '@/lib/gameState';
import { TUTORIALS } from '@/lib/tutorialData';

interface PuzzleGameProps {
  onClose: () => void;
}

type Board = number[]; // 0 = 빈칸, 1~8 = 타일

const GOAL: Board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const TILE_EMOJIS: Record<number, string> = {
  1: '⭐', 2: '🌙', 3: '✨',
  4: '💫', 5: '🌟', 6: '🔮',
  7: '🌈', 8: '🎀',
};

function isSolved(board: Board): boolean {
  return board.every((v, i) => v === GOAL[i]);
}

function getNeighbors(index: number): number[] {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(index - 3);
  if (row < 2) neighbors.push(index + 3);
  if (col > 0) neighbors.push(index - 1);
  if (col < 2) neighbors.push(index + 1);
  return neighbors;
}

function shuffle(board: Board): Board {
  let b = [...board];
  for (let i = 0; i < 300; i++) {
    const emptyIdx = b.indexOf(0);
    const neighbors = getNeighbors(emptyIdx);
    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
    [b[emptyIdx], b[target]] = [b[target], b[emptyIdx]];
  }
  if (isSolved(b)) return shuffle(b);
  return b;
}

/** 방안 A: 소형 목표 미리보기 컴포넌트 */
function GoalPreview() {
  return (
    <div className="mx-5 mb-3">
      <div className="bg-white/80 rounded-2xl border border-amber-200 shadow-sm px-3 py-2">
        <div className="flex items-center gap-3">
          {/* 라벨 */}
          <div className="flex-shrink-0 text-center">
            <div className="text-[10px] font-bold text-amber-600 leading-tight">완성</div>
            <div className="text-[10px] font-bold text-amber-600 leading-tight">목표</div>
          </div>
          {/* 구분선 */}
          <div className="w-px h-10 bg-amber-200 flex-shrink-0" />
          {/* 3×3 미니 그리드 */}
          <div className="grid grid-cols-3 gap-0.5 flex-shrink-0">
            {GOAL.map((tile, idx) => (
              <div
                key={idx}
                className={`w-8 h-8 rounded-md flex flex-col items-center justify-center
                  ${tile === 0
                    ? 'bg-amber-100/60 border border-dashed border-amber-300'
                    : 'bg-amber-50 border border-amber-200'
                  }`}
              >
                {tile !== 0 && (
                  <>
                    <span className="text-sm leading-none">{TILE_EMOJIS[tile]}</span>
                    <span className="text-[8px] font-bold text-amber-500 leading-none mt-0.5">{tile}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {/* 설명 */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-sub-brown leading-relaxed">
              이 순서대로<br />
              맞추면 완성!<br />
              <span className="text-amber-500 font-semibold">빈칸 → 우하단</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PuzzleGame({ onClose }: PuzzleGameProps) {
  const { play } = useGame();
  const [board, setBoard] = useState<Board>(() => shuffle([...GOAL]));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [puzzleReward, setPuzzleReward] = useState<{ coins: number; exp: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const tutorial = TUTORIALS['toy_puzzle'];

  const handleTileClick = useCallback((index: number) => {
    if (solved) return;
    const emptyIdx = board.indexOf(0);
    const neighbors = getNeighbors(emptyIdx);
    if (!neighbors.includes(index)) return;

    setBoard(prev => {
      const next = [...prev];
      [next[emptyIdx], next[index]] = [next[index], next[emptyIdx]];
      return next;
    });
    setMoves(m => m + 1);
  }, [board, solved]);

  useEffect(() => {
    if (isSolved(board) && moves > 0 && !rewarded) {
      setSolved(true);
      setRewarded(true);
      const reward = calcPuzzleReward(moves);
      setPuzzleReward(reward);
      play('toy_puzzle');
    }
  }, [board, moves, rewarded, play]);

  const handleReset = () => {
    setBoard(shuffle([...GOAL]));
    setMoves(0);
    setSolved(false);
    setRewarded(false);
    setPuzzleReward(null);
  };

  const handleExitRequest = () => {
    if (solved) {
      onClose();
    } else {
      setShowConfirmExit(true);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[oklch(0.97_0.02_80)] animate-fade-in">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={handleExitRequest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 shadow text-sm font-semibold text-warm-brown border border-border"
        >
          ← 나가기
        </button>
        <h2 className="text-base font-bold text-warm-brown flex items-center gap-1.5">
          ⭐ 별 퍼즐
        </h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-sub-brown font-medium">
            {moves}번 이동
          </div>
          {/* ❓ 도움말 버튼 (방식 2) */}
          <button
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 rounded-full bg-white/80 shadow border border-border flex items-center justify-center text-base font-bold text-sub-brown hover:bg-amber-50 transition-colors"
            aria-label="도움말"
          >
            ❓
          </button>
        </div>
      </div>

      {/* 방안 A: 목표 배열 미리보기 */}
      <GoalPreview />

      {/* 안내 문구 */}
      <p className="text-center text-xs text-sub-brown mb-3">
        타일을 눌러 빈칸으로 이동시켜 완성하세요!
      </p>

      {/* 퍼즐 보드 */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[320px]">
          <div className="grid grid-cols-3 gap-2">
            {board.map((tile, index) => {
              // 방안 C: 현재 위치가 목표 위치와 일치하는지 확인
              const isCorrectPos = tile !== 0 && GOAL[index] === tile;
              return (
                <button
                  key={index}
                  onClick={() => handleTileClick(index)}
                  disabled={tile === 0 || solved}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center
                    transition-all duration-150 select-none relative
                    ${tile === 0
                      ? 'bg-amber-100/40 border-2 border-dashed border-amber-200 cursor-default'
                      : solved
                        ? 'bg-mint/30 border-2 border-mint scale-100 cursor-default shadow'
                        : isCorrectPos
                          ? 'bg-amber-50 border-2 border-amber-300 shadow-md cushion-btn active:scale-95'
                          : 'bg-white shadow-md border border-border cushion-btn active:scale-95'
                    }
                  `}
                >
                  {tile !== 0 && (
                    <>
                      {/* 방안 C: 이모지 */}
                      <span className="text-3xl leading-none">{TILE_EMOJIS[tile]}</span>
                      {/* 방안 C: 숫자 배지 */}
                      <span className={`text-[10px] font-bold leading-none mt-0.5
                        ${solved ? 'text-mint' : isCorrectPos ? 'text-amber-500' : 'text-gray-400'}
                      `}>
                        {tile}
                      </span>
                      {/* 방안 C: 정위치 체크 표시 */}
                      {isCorrectPos && !solved && (
                        <span className="absolute top-1 right-1 text-[8px] text-amber-400 font-bold">✓</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* 방안 C: 정위치 타일 개수 진행 표시 */}
          {!solved && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 8 }, (_, i) => {
                  const tileNum = i + 1;
                  const currentPos = board.indexOf(tileNum);
                  const correct = GOAL[currentPos] === tileNum;
                  return (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300
                        ${correct ? 'bg-amber-400 scale-110' : 'bg-gray-200'}
                      `}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-sub-brown">
                {board.filter((tile, idx) => tile !== 0 && GOAL[idx] === tile).length}/8 정위치
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 완성 메시지 */}
      {solved && (
        <div className="mx-5 mb-4 p-4 bg-mint/20 rounded-2xl border border-mint text-center animate-pop-in">
          <p className="text-lg font-bold text-warm-brown mb-1">🎉 완성!</p>
          <p className="text-sm text-sub-brown mb-1">
            {moves}번 만에 풀었어요!
          </p>
          {puzzleReward && (
            <div className="flex justify-center gap-3 mb-3">
              <span className="text-sm font-bold text-yellow-600">🪙 +{puzzleReward.coins}</span>
              <span className="text-sm font-bold text-purple-600">EXP +{puzzleReward.exp}</span>
              {moves <= 20 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">🏆 퍼펙트!</span>}
              {moves > 20 && moves <= 30 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">⭐ 우수!</span>}
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-full bg-white border border-border text-sm font-semibold text-warm-brown shadow"
            >
              다시 풀기
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-peach text-sm font-semibold text-warm-brown shadow"
            >
              메뉴로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 하단 리셋 버튼 (게임 중) */}
      {!solved && (
        <div className="px-5 pb-6">
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-2xl bg-white border border-border text-sm font-semibold text-sub-brown shadow"
          >
            🔄 새로 섞기
          </button>
        </div>
      )}

      {/* 나가기 확인 다이얼로그 */}
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
            <p className="text-sm text-sub-brown mb-5">
              진행 중인 퍼즐은 저장되지 않아요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmExit(false)}
                className="flex-1 py-2.5 rounded-2xl bg-muted text-sm font-semibold text-sub-brown"
              >
                계속 풀기
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

      {/* ❓ 도움말 오버레이 (방식 2) */}
      {showHelp && (
        <div
          className="absolute inset-0 z-60 flex items-end bg-black/50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 pt-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tutorial.gameIcon}</span>
                <div>
                  <h3 className="text-base font-bold text-white">{tutorial.gameTitle} 도움말</h3>
                  <p className="text-xs text-white/80">{tutorial.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* 본문 스크롤 */}
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {/* 게임 방법 */}
              <h4 className="text-sm font-bold text-warm-brown mb-3 flex items-center gap-1">
                <span>📖</span> 게임 방법
              </h4>
              <div className="space-y-2 mb-4">
                {tutorial.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-cream rounded-2xl p-3">
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-base">{step.icon}</span>
                        <span className="text-sm font-semibold text-warm-brown">{step.title}</span>
                      </div>
                      <p className="text-xs text-sub-brown leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 보상 안내 */}
              {tutorial.rewards && (
                <>
                  <h4 className="text-sm font-bold text-warm-brown mb-3 flex items-center gap-1">
                    <span>🎁</span> 보상 안내
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {tutorial.rewards.map((r, idx) => (
                      <div key={idx} className={`rounded-2xl p-3 border-2 ${r.color}`}>
                        <div className="text-sm font-bold mb-0.5">{r.grade}</div>
                        <div className="text-xs text-sub-brown mb-1">{r.condition}</div>
                        <div className="text-xs font-semibold text-warm-brown">{r.reward}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 팁 */}
              {tutorial.tip && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4">
                  <p className="text-xs text-blue-700 flex items-start gap-1.5">
                    <span className="text-base flex-shrink-0">💡</span>
                    <span>{tutorial.tip}</span>
                  </p>
                </div>
              )}
            </div>

            {/* 닫기 버튼 */}
            <div className="px-5 pb-6 pt-3 border-t border-border">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm rounded-2xl shadow-md"
              >
                계속 풀기 🎮
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        .animate-pop-in {
          animation: pop-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-slide-up {
          animation: slide-up 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
      `}</style>
    </div>
  );
}
