import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalNQueensSolution, enumerateNQueens, solutionToPositions } from '../src/game-core/nqueens.ts';
import type { BoardSize } from '../src/game-core/types.ts';

const expected: Readonly<Record<number, readonly [number, number]>> = {
  6: [4, 1],
  7: [40, 6],
  8: [92, 12],
  9: [352, 46],
  10: [724, 92],
  11: [2680, 341],
  12: [14200, 1787],
};

test('enumerates every N-Queens solution for every standard size', () => {
  for (const size of [6, 7, 8, 9, 10, 11, 12] as const) {
    const result = enumerateNQueens(size);
    assert.equal(result.solutions.length, expected[size][0], `${size}x${size} total solutions`);
    assert.equal(result.fundamentalSolutions.length, expected[size][1], `${size}x${size} fundamental solutions`);

    const uniqueSolutions = new Set(result.solutions.map((solution) => solution.join(',')));
    assert.equal(uniqueSolutions.size, result.solutions.length, `${size}x${size} solutions must be unique`);

    const uniqueFundamental = new Set(result.fundamentalSolutions.map((solution) => canonicalNQueensSolution(solution, size)));
    assert.equal(uniqueFundamental.size, result.fundamentalSolutions.length, `${size}x${size} fundamental solutions must be symmetry unique`);
  }
});

test('converts row-column solutions to board positions', () => {
  assert.deepEqual(solutionToPositions([1, 3, 0, 2]), [
    { row: 0, column: 1 },
    { row: 1, column: 3 },
    { row: 2, column: 0 },
    { row: 3, column: 2 },
  ]);
});
