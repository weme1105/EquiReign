import test from 'node:test';
import assert from 'node:assert/strict';
import { rankPuzzlePool } from '../src/game-core/levels.ts';
import { BOARD_SIZE_ORDER, CAMPAIGN_BOARD_SIZE_ORDER, campaignBoardSize, campaignDifficulty, campaignStage } from '../src/game-core/progression.ts';

const metrics = (nodesVisited: number, branchesTried = nodesVisited, backtracks = nodesVisited) => ({
  nodesVisited,
  branchesTried,
  backtracks,
  memoHits: 0,
});

test('runtime supports 6x6 through 20x20 while campaign currently stops at 16x16', () => {
  assert.deepEqual([...BOARD_SIZE_ORDER], [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.deepEqual([...CAMPAIGN_BOARD_SIZE_ORDER], [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  const sizes = new Set(Array.from({ length: 200 }, (_, index) => campaignBoardSize(index + 1)));
  assert.deepEqual([...sizes].sort((a, b) => a - b), [...CAMPAIGN_BOARD_SIZE_ORDER]);
  assert.ok(![...sizes].some((size) => size > 16));

  const adjacentSizes = Array.from({ length: 20 }, (_, index) => campaignBoardSize(index + 1));
  assert.ok(adjacentSizes.some((size, index) => index > 0 && size !== adjacentSizes[index - 1]));
});

test('campaign difficulty trends upward while allowing adjacent-tier overlap', () => {
  assert.equal(campaignStage(1), 'beginner');
  assert.equal(campaignStage(200), 'beginner');
  assert.equal(campaignStage(201), 'intermediate');
  assert.equal(campaignStage(1000), 'king');

  const firstStage = new Set(Array.from({ length: 200 }, (_, index) => campaignDifficulty(index + 1)));
  const secondStage = new Set(Array.from({ length: 200 }, (_, index) => campaignDifficulty(index + 201)));
  assert.ok(firstStage.has('beginner'));
  assert.ok(firstStage.has('intermediate'));
  assert.ok(secondStage.has('intermediate'));
  assert.ok(secondStage.has('advanced'));
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
