/**
 * PuzzleGame - 별 퍼즐 미니게임
 * Cozy Nursery: 3×3 슬라이딩 퍼즐, 완성 시 보상 지급
 */
import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { calcPuzzleReward } from '@/lib/gameState';

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
  // 300번 랜덤 이동으로 섞기 (항상 풀 수 있는 상태 보장)
  for (let i = 0; i < 300; i++) {
    const emptyIdx = b.indexOf(0);
    const neighbors = getNeighbors(emptyIdx);
    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
    [b[emptyIdx], b[target]] = [b[target], b[emptyIdx]];
  }
  // 이미 풀린 상태면 다시 섞기
  if (isSolved(b)) return shuffle(b);
  return b;
}

export default function PuzzleGame({ onClose }: PuzzleGameProps) {
  const { play } = useGame();
  const [board, setBoard] = useState<Board>(() => shuffle([...GOAL]));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [puzzleReward, setPuzzleReward] = useState<{ coins: number; exp: number } | null>(null);

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
      // 퍼즐 완성 시 play 보상 지급
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
        <div className="text-sm text-sub-brown font-medium min-w-[56px] text-right">
          {moves}번 이동
        </div>
      </div>

      {/* 안내 문구 */}
      <p className="text-center text-xs text-sub-brown mb-3">
        타일을 눌러 빈칸으로 이동시켜 완성하세요!
      </p>

      {/* 퍼즐 보드 */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[320px]">
          <div className="grid grid-cols-3 gap-2">
            {board.map((tile, index) => (
              <button
                key={index}
                onClick={() => handleTileClick(index)}
                disabled={tile === 0 || solved}
                className={`
                  aspect-square rounded-2xl flex items-center justify-center text-4xl
                  transition-all duration-150 select-none
                  ${tile === 0
                    ? 'bg-transparent cursor-default'
                    : solved
                      ? 'bg-mint/30 border-2 border-mint scale-100 cursor-default shadow'
                      : 'bg-white shadow-md border border-border cushion-btn active:scale-95'
                  }
                `}
              >
                {tile !== 0 && TILE_EMOJIS[tile]}
              </button>
            ))}
          </div>
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

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        .animate-pop-in {
          animation: pop-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
