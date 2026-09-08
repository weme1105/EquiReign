import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateNQueens } from '../src/game-core/nqueens.ts';
import { growRegionsFromNQueensSolution, refineNQueensRegionCandidate } from '../src/game-core/nqueens-region-source.ts';
import { validatePuzzleCandidate } from '../src/game-core/puzzle-candidate-validation.ts';

test('N-Queens seeded source yields formally valid 8x8 candidates', () => {
  const size = 8 as const;
  const solutions = enumerateNQueens(size).solutions;
  const strategies = 8;
  let valid = 0;
  const uniqueMaps = new Set<string>();
  const failures = new Map<string, number>();

  for (const solution of solutions) {
    for (let strategy = 0; strategy < strategies; strategy += 1) {
      const grown = growRegionsFromNQueensSolution(size, solution, strategy);
      const candidate = refineNQueensRegionCandidate(grown);
      uniqueMaps.add(candidate.regionMap.join(','));
      const result = validatePuzzleCandidate(candidate);
      if (result.valid) valid += 1;
      else failures.set(result.reason, (failures.get(result.reason) ?? 0) + 1);
    }
  }

  console.log(JSON.stringify({
    size,
    attempted: solutions.length * strategies,
    uniqueMaps: uniqueMaps.size,
    valid,
    failures: Object.fromEntries(failures),
  }));
  assert.ok(valid > 0, '8x8 source must yield at least one formally valid unique puzzle');
});
