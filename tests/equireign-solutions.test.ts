import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalNQueensSolution } from '../src/game-core/nqueens.ts';
import { enumerateEquiReignSolutions } from '../src/game-core/equireign-solutions.ts';


test('enumerates 90 EquiReign 6x6 solutions and deduplicates them to 15 fundamental solutions', () => {
  const result = enumerateEquiReignSolutions(6);

  assert.equal(result.solutions.length, 90);
  assert.equal(result.fundamentalSolutions.length, 15);

  const uniqueSolutions = new Set(result.solutions.map((solution) => solution.join(',')));
  assert.equal(uniqueSolutions.size, 90);

  const uniqueFundamental = new Set(
    result.fundamentalSolutions.map((solution) => canonicalNQueensSolution(solution, 6)),
  );
  assert.equal(uniqueFundamental.size, 15);
});
