import assert from 'node:assert/strict';
import test from 'node:test';
import { bundledCampaignPuzzleCount, getBundledCampaignPuzzle } from '../src/puzzles/bundled-campaign.ts';
import { validatePuzzle } from '../src/game-core/puzzle.ts';

const BUNDLED_LEVEL_COUNT = 99;

test('every bundled campaign puzzle passes production puzzle validation', () => {
  assert.equal(bundledCampaignPuzzleCount(), BUNDLED_LEVEL_COUNT);

  for (let level = 1; level <= BUNDLED_LEVEL_COUNT; level += 1) {
    const puzzle = getBundledCampaignPuzzle(level);
    assert.ok(puzzle, `level ${level} should be bundled`);
    assert.doesNotThrow(
      () => validatePuzzle(puzzle),
      `level ${level} must be structurally valid and uniquely solvable`,
    );
  }
});
