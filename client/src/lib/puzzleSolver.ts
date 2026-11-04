/**
 * puzzleSolver.ts — 3×3 슬라이딩 퍼즐 BFS (다음 최선 1수)
 */

export type PuzzleBoard = number[];

const GOAL: PuzzleBoard = [1, 2, 3, 4, 5, 6, 7, 8, 0];

function boardKey(board: PuzzleBoard): string {
  return board.join(',');
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

export function isPuzzleSolved(board: PuzzleBoard): boolean {
  return board.every((v, i) => v === GOAL[i]);
}

/** BFS로 목표까지 최단 경로의 첫 클릭 타일 인덱스 */
export function findNextOptimalMove(board: PuzzleBoard): number | null {
  if (isPuzzleSolved(board)) return null;

  const startKey = boardKey(board);
  const queue: { board: PuzzleBoard; firstClick: number | null }[] = [
    { board: [...board], firstClick: null },
  ];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const { board: current, firstClick } = queue.shift()!;

    if (isPuzzleSolved(current)) {
      return firstClick;
    }

    const emptyIdx = current.indexOf(0);
    for (const clickIdx of getNeighbors(emptyIdx)) {
      const next = [...current];
      [next[emptyIdx], next[clickIdx]] = [next[clickIdx], next[emptyIdx]];
      const key = boardKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({
        board: next,
        firstClick: firstClick ?? clickIdx,
      });
    }
  }

  return null;
}

export function applyPuzzleMove(board: PuzzleBoard, clickIndex: number): PuzzleBoard | null {
  const emptyIdx = board.indexOf(0);
  if (!getNeighbors(emptyIdx).includes(clickIndex)) return null;
  const next = [...board];
  [next[emptyIdx], next[clickIndex]] = [next[clickIndex], next[emptyIdx]];
  return next;
}

export const PUZZLE_GOAL = GOAL;
