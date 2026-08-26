import { persistenceStore } from './persistence-store';
import { getCampaignBatchStorageKey } from '../game/campaign-batch.ts';

export interface CachedCampaignPuzzle {
  readonly level: number;
  readonly puzzleId: string;
  readonly size: number;
  readonly difficulty: string;
  readonly regionMap: readonly number[];
  readonly givenQueenCellIndexes: readonly number[];
  readonly version: number;
}

export interface CachedCampaignBatch {
  readonly startLevel: number;
  readonly endLevel: number;
  readonly downloadedAtMs: number;
  readonly puzzles: readonly CachedCampaignPuzzle[];
}

export async function loadCampaignBatch(startLevel: number): Promise<CachedCampaignBatch | null> {
  const raw = await persistenceStore.getItem(getCampaignBatchStorageKey(startLevel));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedCampaignBatch;
    const validEnd = parsed.endLevel >= startLevel && parsed.endLevel <= startLevel + 99;
    return parsed.startLevel === startLevel && validEnd && Array.isArray(parsed.puzzles) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCampaignBatch(batch: CachedCampaignBatch): Promise<void> {
  await persistenceStore.setItem(getCampaignBatchStorageKey(batch.startLevel), JSON.stringify(batch));
}

export async function findCachedCampaignPuzzle(level: number): Promise<CachedCampaignPuzzle | null> {
  if (!Number.isInteger(level) || level < 100) return null;
  const startLevel = Math.floor(level / 100) * 100;
  const batch = await loadCampaignBatch(startLevel);
  return batch?.puzzles.find((puzzle) => puzzle.level === level) ?? null;
}

export async function clearCampaignPuzzleCache(maxStartLevel = 1_000): Promise<void> {
  for (let startLevel = 100; startLevel <= maxStartLevel; startLevel += 100) {
    await persistenceStore.removeItem(getCampaignBatchStorageKey(startLevel));
  }
}
