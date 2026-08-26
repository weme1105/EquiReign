import assert from 'node:assert/strict';
import test from 'node:test';
import { bundledCampaignPuzzleCount, getBundledCampaignPuzzle } from '../src/puzzles/bundled-campaign.ts';

test('first 99 campaign levels are bundled and deterministic', () => {
  assert.equal(bundledCampaignPuzzleCount(), 99);
  const ids = new Set<string>();
  const regionMaps = new Set<string>();
  for (let level = 1; level <= 99; level += 1) {
    const first = getBundledCampaignPuzzle(level);
    const second = getBundledCampaignPuzzle(level);
    assert.ok(first, `level ${level} should be bundled`);
    assert.deepEqual(second, first);
    assert.equal(first.regionMap.length, first.size * first.size);
    assert.equal(first.givenQueens.length, 2);
    assert.ok(!ids.has(first.id), `duplicate puzzle id at level ${level}`);
    ids.add(first.id);
    const regionKey = `${first.size}:${first.regionMap.join(',')}`;
    assert.ok(!regionMaps.has(regionKey), `duplicate region map at level ${level}`);
    regionMaps.add(regionKey);
  }
});

test('bundled campaign rejects levels outside 1-99', () => {
  assert.equal(getBundledCampaignPuzzle(0), null);
  assert.equal(getBundledCampaignPuzzle(100), null);
});
