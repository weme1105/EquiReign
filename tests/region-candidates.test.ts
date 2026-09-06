import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateConnectedRegionCandidates } from '../src/game-core/region-candidates.ts';

test('region candidate enumeration is deterministic and respects singleton limit', () => {
  const first = enumerateConnectedRegionCandidates(6, { maxCandidates: 25 });
  const second = enumerateConnectedRegionCandidates(6, { maxCandidates: 25 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 25);

  for (const candidate of first) {
    assert.equal(candidate.regionMap.length, 36);
    const counts = new Map<number, number>();
    for (const region of candidate.regionMap) counts.set(region, (counts.get(region) ?? 0) + 1);
    assert.equal(counts.size, 6);
    assert.ok([...counts.values()].filter((count) => count === 1).length <= 1);
  }
});

test('region candidate enumeration works for the full standard size range', () => {
  for (const size of [6, 7, 8, 9, 10, 11, 12] as const) {
    const candidates = enumerateConnectedRegionCandidates(size, { maxCandidates: 2 });
    assert.equal(candidates.length, 2, `${size}x${size}`);
    assert.ok(candidates.every((candidate) => candidate.regionMap.length === size * size));
  }
});
