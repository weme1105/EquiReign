import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateEquiReignSolutions } from '../src/game-core/equireign-enumerator.ts';

test('EquiReign 6x6 enumeration contains exactly 90 legal Queen layouts', () => {
  const result = enumerateEquiReignSolutions(6);
  assert.equal(result.solutionCount, 90);
  assert.equal(new Set(result.solutions.map((solution) => solution.join(','))).size, 90);
});

test('EquiReign enumerator does not apply global diagonal attacks', () => {
  const result = enumerateEquiReignSolutions(6);
  assert.ok(result.solutions.some((solution) =>
    solution.some((column, row) => row + 2 < solution.length && solution[row + 2] === column + 2),
  ));
});
