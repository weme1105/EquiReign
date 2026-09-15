import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePuzzleCandidate, singletonRegionLimit } from '../src/game-core/puzzle-candidate-validation.ts';
import { belongsToDatasetShard, puzzleCandidateId, puzzleCandidateKey, stableHash32 } from '../src/game-core/puzzle-dataset.ts';

const valid6 = {
  size: 6 as const,
  regionMap: [1,0,0,2,3,3, 1,1,0,2,3,3, 1,1,2,2,2,3, 4,2,2,3,3,3, 4,4,5,5,5,3, 4,4,4,5,5,5],
  solution: [2,0,3,5,1,4],
};

test('formal candidate validation admits a connected unique puzzle and records solver cost', () => {
  const result = validatePuzzleCandidate(valid6);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.ok(result.candidate.solverMetrics.nodesVisited > 0);
  assert.ok(result.candidate.singletonRegionCount <= singletonRegionLimit(6));
});

test('formal candidate validation rejects disconnected regions before solver admission', () => {
  const disconnected = [...valid6.regionMap];
  disconnected[0] = 0;
  disconnected[2] = 1;
  const result = validatePuzzleCandidate({ ...valid6, regionMap: disconnected });
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.ok(['disconnected-region', 'singleton-limit-exceeded', 'multiple-solutions', 'stored-solution-mismatch'].includes(result.reason));
});

test('dataset key, id and shard assignment are deterministic', () => {
  const key = puzzleCandidateKey(valid6.size, valid6.solution, valid6.regionMap);
  assert.equal(key, puzzleCandidateKey(valid6.size, valid6.solution, valid6.regionMap));
  assert.equal(stableHash32(key), stableHash32(key));
  assert.equal(puzzleCandidateId(valid6.size, valid6.solution, valid6.regionMap), puzzleCandidateId(valid6.size, valid6.solution, valid6.regionMap));

  const memberships = Array.from({ length: 8 }, (_, shardIndex) => belongsToDatasetShard(key, { shardIndex, shardCount: 8 }));
  assert.equal(memberships.filter(Boolean).length, 1);
});

test('dataset shard spec rejects invalid indexes and counts', () => {
  assert.throws(() => belongsToDatasetShard('x', { shardIndex: 0, shardCount: 0 }), /shardCount/);
  assert.throws(() => belongsToDatasetShard('x', { shardIndex: 2, shardCount: 2 }), /shardIndex/);
});
