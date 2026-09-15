import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateNQueens } from '../src/game-core/nqueens.ts';
import { growRegionsFromNQueensSolution } from '../src/game-core/nqueens-region-source.ts';
import { areAllRegionsConnected } from '../src/game-core/puzzle-candidate-validation.ts';

test('N-Queens seeded Region growth is deterministic and connected', () => {
  const solution = enumerateNQueens(6).solutions[0]!;
  const first = growRegionsFromNQueensSolution(6, solution, 0);
  const second = growRegionsFromNQueensSolution(6, solution, 0);
  assert.deepEqual(first, second);
  assert.equal(areAllRegionsConnected(first.regionMap, 6), true);
  for (let region = 0; region < 6; region += 1) {
    assert.equal(first.regionMap[region * 6 + solution[region]!], region);
  }
});

test('N-Queens seeded Region growth covers every standard board size', () => {
  for (const size of [6, 7, 8, 9, 10, 11, 12] as const) {
    const solution = enumerateNQueens(size).solutions[0]!;
    for (let strategy = 0; strategy < 3; strategy += 1) {
      const candidate = growRegionsFromNQueensSolution(size, solution, strategy);
      assert.equal(candidate.regionMap.length, size * size);
      assert.equal(candidate.regionMap.includes(-1), false);
      assert.equal(areAllRegionsConnected(candidate.regionMap, size), true);
    }
  }
});

test('different growth strategies provide deterministic candidate diversity', () => {
  const solution = enumerateNQueens(8).solutions[0]!;
  const maps = Array.from({ length: 6 }, (_, strategy) => growRegionsFromNQueensSolution(8, solution, strategy).regionMap.join(','));
  assert.ok(new Set(maps).size > 1);
});
