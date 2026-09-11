import assert from 'node:assert/strict';
import test from 'node:test';
import { isUniquelySolvableBasePuzzle, verifyBasePuzzleUniqueness } from '../src/game-core/base-uniqueness.ts';

const uniqueRegionMap = [
  0, 0, 0, 2, 2, 2,
  0, 0, 0, 1, 2, 2,
  0, 0, 0, 2, 2, 2,
  3, 3, 0, 2, 2, 2,
  3, 5, 4, 4, 5, 5,
  3, 5, 5, 5, 5, 5,
] as const;

test('Base gate accepts a structurally valid unique 6x6 puzzle', () => {
  assert.equal(verifyBasePuzzleUniqueness(6, uniqueRegionMap), 1);
  assert.equal(isUniquelySolvableBasePuzzle(6, uniqueRegionMap), true);
});

test('Base gate rejects a structurally invalid region map before solving', () => {
  const invalid = [...uniqueRegionMap];
  invalid[0] = 99;
  assert.equal(verifyBasePuzzleUniqueness(6, invalid), 0);
});
