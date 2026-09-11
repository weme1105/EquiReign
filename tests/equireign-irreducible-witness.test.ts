import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deletionObstructionByWitness,
  hasLegalEquiReignReduction,
  isEquiReignIrreducibleByWitness,
  isLegalAfterDeletion,
} from '../src/game-core/equireign-irreducible-experiment.ts';
import { enumerateEquiReignSolutions } from '../src/game-core/equireign-solutions.ts';
import type { BoardSize } from '../src/game-core/types.ts';

const expectedIrreducibleCounts = new Map<number, number>([
  [6, 0],
  [7, 0],
  [8, 8],
  [9, 0],
]);

for (const size of [6, 7, 8, 9] as const) {
  test(`${size}x${size} witness obstruction exactly matches direct deletion`, () => {
    const { solutions } = enumerateEquiReignSolutions(size as BoardSize);

    for (const solution of solutions) {
      for (let row = 0; row < size; row += 1) {
        const obstructed = deletionObstructionByWitness(solution, row) !== null;
        assert.equal(
          obstructed,
          !isLegalAfterDeletion(solution, row),
          `witness mismatch for ${solution.join(',')} deleting row ${row}`,
        );
      }
    }
  });

  test(`${size}x${size} witness irreducibility matches direct reduction`, () => {
    const { solutions } = enumerateEquiReignSolutions(size as BoardSize);
    let irreducibleCount = 0;

    for (const solution of solutions) {
      const byWitness = isEquiReignIrreducibleByWitness(solution);
      const byDirectReduction = !hasLegalEquiReignReduction(solution);
      assert.equal(byWitness, byDirectReduction, `irreducibility mismatch for ${solution.join(',')}`);
      if (byWitness) irreducibleCount += 1;
    }

    assert.equal(irreducibleCount, expectedIrreducibleCounts.get(size));
  });
}
