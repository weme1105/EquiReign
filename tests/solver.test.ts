import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoard, withCell } from '../src/game-core/board.ts';
import { analyzeSolutions, countSolutions, extractFirstSolution } from '../src/game-core/solver.ts';
import type { BoardSnapshot } from '../src/game-core/types.ts';

const uniqueBoard: BoardSnapshot = {
  size: 1,
  regionMap: [0],
  cells: ['empty'],
};

test('base solver counts a uniquely solvable board', () => {
  assert.equal(countSolutions(uniqueBoard, 2), 1);
  assert.deepEqual(extractFirstSolution(uniqueBoard), [{ row: 0, column: 0 }]);
});

test('base solver rejects adjacent queens but does not apply long diagonal attacks', () => {
  const board: BoardSnapshot = {
    size: 3,
    regionMap: [0, 1, 2, 1, 2, 0, 2, 0, 1],
    cells: Array(9).fill('empty'),
  };
  const distantDiagonal = withCell(withCell(board, { row: 0, column: 0 }, 'queen'), { row: 2, column: 2 }, 'queen');
  assert.equal(countSolutions(distantDiagonal, 2), 0, 'region/row/column constraints still apply to the partial board');
  const adjacent = withCell(withCell(board, { row: 0, column: 0 }, 'queen'), { row: 1, column: 1 }, 'queen');
  assert.equal(countSolutions(adjacent, 2), 0);
});

test('solution analysis stops at the requested uniqueness cap', () => {
  const board = createBoard({
    id: 'solver-test',
    difficulty: 'beginner',
    size: 6,
    regionMap: Array.from({ length: 36 }, (_, index) => Math.floor(index / 6)),
    givenQueens: [],
  });
  const analysis = analyzeSolutions(board, 2);
  assert.equal(analysis.solutionCount, 2);
  assert.ok(analysis.metrics.nodesVisited > 0);
  assert.ok(analysis.metrics.branchesTried > 0);
});

test('forced queen and excluded cells constrain the same base solver', () => {
  const board = uniqueBoard;
  assert.equal(countSolutions(withCell(board, { row: 0, column: 0 }, 'queen'), 2), 1);
  assert.equal(countSolutions(withCell(board, { row: 0, column: 0 }, 'excluded'), 2), 0);
});
