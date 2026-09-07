import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateNQueens } from '../src/game-core/nqueens.ts';
import { growRegionsFromNQueensSolution } from '../src/game-core/nqueens-region-source.ts';
import { validatePuzzleCandidate } from '../src/game-core/puzzle-candidate-validation.ts';

for (const size of [6, 7] as const) {
  test(`N-Queens seeded source yields formally valid ${size}x${size} candidates`, () => {
    const solutions = enumerateNQueens(size).solutions;
    const strategies = 24;
    let valid = 0;
    let validDefaultStrategies = 0;
    const validStrategyIndexes = new Set<number>();
    const uniqueMaps = new Set<string>();
    const failures = new Map<string, number>();

    for (const solution of solutions) {
      for (let strategy = 0; strategy < strategies; strategy += 1) {
        const candidate = growRegionsFromNQueensSolution(size, solution, strategy);
        uniqueMaps.add(candidate.regionMap.join(','));
        const result = validatePuzzleCandidate(candidate);
        if (result.valid) {
          valid += 1;
          validStrategyIndexes.add(strategy);
          if (strategy < 8) validDefaultStrategies += 1;
        } else failures.set(result.reason, (failures.get(result.reason) ?? 0) + 1);
      }
    }

    console.log(JSON.stringify({ size, attempted: solutions.length * strategies, uniqueMaps: uniqueMaps.size, valid, validDefaultStrategies, validStrategyIndexes: [...validStrategyIndexes], failures: Object.fromEntries(failures) }));
    assert.ok(valid > 0, `${size}x${size} source must yield at least one formally valid unique puzzle`);
    assert.ok(validDefaultStrategies > 0, `${size}x${size} default first 8 strategies must yield at least one formally valid puzzle`);
  });
}
