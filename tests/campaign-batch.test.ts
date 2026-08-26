import assert from 'node:assert/strict';
import test from 'node:test';
import { getCampaignBatchStart, getCampaignBatchStorageKey, getNextCampaignBatchStart } from '../src/game/campaign-batch.ts';

test('campaign batch boundaries follow 100-level groups', () => {
  assert.equal(getCampaignBatchStart(100), 100);
  assert.equal(getCampaignBatchStart(199), 100);
  assert.equal(getCampaignBatchStart(200), 200);
  assert.equal(getCampaignBatchStart(299), 200);
});

test('next batch prefetch starts ten levels before the boundary', () => {
  assert.equal(getNextCampaignBatchStart(89), null);
  assert.equal(getNextCampaignBatchStart(90), 100);
  assert.equal(getNextCampaignBatchStart(99), 100);
  assert.equal(getNextCampaignBatchStart(189), null);
  assert.equal(getNextCampaignBatchStart(190), 200);
  assert.equal(getNextCampaignBatchStart(199), 200);
  assert.equal(getNextCampaignBatchStart(989), null);
  assert.equal(getNextCampaignBatchStart(990), 1_000);
  assert.equal(getNextCampaignBatchStart(1_000), null);
  assert.equal(getNextCampaignBatchStart(1_001), null);
});

test('campaign batch cache keys are stable and finite', () => {
  assert.equal(getCampaignBatchStorageKey(100), 'equireign.campaign-batch.v1.100');
  assert.equal(getCampaignBatchStorageKey(1_000), 'equireign.campaign-batch.v1.1000');
  assert.throws(() => getCampaignBatchStorageKey(99), RangeError);
  assert.throws(() => getCampaignBatchStorageKey(1_100), RangeError);
});
