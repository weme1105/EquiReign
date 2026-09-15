import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoard } from '../src/game-core/board.ts';
import { analyzeSolutions } from '../src/game-core/solver.ts';

test('validator solver input uses an empty playable board snapshot', () => {
  const board = createBoard({ id: 'validator-test', difficulty: 'beginner', size: 1, regionMap: [0], givenQueens: [] });
  const analysis = analyzeSolutions(board, 2);
  assert.equal(analysis.solutionCount, 1);
});
