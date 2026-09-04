import test from 'node:test';
import assert from 'node:assert/strict';
import { rankPuzzlePool } from '../src/game-core/levels.ts';
import { BOARD_SIZE_ORDER, campaignBoardSize } from '../src/game-core/progression.ts';

const metrics = (nodesVisited: number, branchesTried = nodesVisited, backtracks = nodesVisited) => ({
  nodesVisited,
  branchesTried,
  backtracks,
  memoHits: 0,
});

test('campaign uses standard sizes independently from difficulty', () => {
  const sizes = new Set(Array.from({ length: 100 }, (_, index) => campaignBoardSize(index + 1)));
  assert.deepEqual([...sizes].sort((a, b) => a - b), [...BOARD_SIZE_ORDER]);

  const adjacentSizes = Array.from({ length: 20 }, (_, index) => campaignBoardSize(index + 1));
  assert.ok(adjacentSizes.some((size, index) => index > 0 && size !== adjacentSizes[index - 1]));
});

test('difficulty ranking is global rather than partitioned by board size', () => {
  const ranked = rankPuzzlePool([
    { id: '7-hard', size: 7, regionMap: [], solution: [], solverMetrics: metrics(1000) },
    { id: '8-easy', size: 8, regionMap: [], solution: [], solverMetrics: metrics(1) },
    { id: '8-mid', size: 8, regionMap: [], solution: [], solverMetrics: metrics(10) },
  ]);

  const hard = ranked.find((candidate) => candidate.id === '7-hard')!;
  const easy = ranked.find((candidate) => candidate.id === '8-easy')!;
  assert.ok(hard.costScore > easy.costScore);
  assert.equal(hard.costTier, 'king');
  assert.equal(easy.costTier, 'beginner');
});
