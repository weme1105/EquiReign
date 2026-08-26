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
});

test('campaign batch cache keys are stable', () => {
  assert.equal(getCampaignBatchStorageKey(100), 'equireign.campaign-batch.v1.100');
  assert.equal(getCampaignBatchStorageKey(200), 'equireign.campaign-batch.v1.200');
  assert.throws(() => getCampaignBatchStorageKey(99), RangeError);
});
