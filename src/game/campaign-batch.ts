import { CAMPAIGN_FINITE_LEVELS } from '../game-core/progression.ts';

export const CAMPAIGN_BATCH_SIZE = 100;
export const CAMPAIGN_PREFETCH_LEAD = 10;

export function getCampaignBatchStart(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('level must be a positive integer');
  return Math.floor(level / CAMPAIGN_BATCH_SIZE) * CAMPAIGN_BATCH_SIZE;
}

export function getNextCampaignBatchStart(level: number): number | null {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('level must be a positive integer');
  if (level > CAMPAIGN_FINITE_LEVELS) return null;
  const nextBatchStart = (Math.floor(level / CAMPAIGN_BATCH_SIZE) + 1) * CAMPAIGN_BATCH_SIZE;
  if (nextBatchStart > CAMPAIGN_FINITE_LEVELS) return null;
  return level >= nextBatchStart - CAMPAIGN_PREFETCH_LEAD ? nextBatchStart : null;
}

export function getCampaignBatchStorageKey(startLevel: number): string {
  if (!Number.isInteger(startLevel) || startLevel < 100 || startLevel > CAMPAIGN_FINITE_LEVELS || startLevel % CAMPAIGN_BATCH_SIZE !== 0) {
    throw new RangeError('startLevel must be a campaign batch boundary');
  }
  return `equireign.campaign-batch.v1.${startLevel}`;
}
