import { apiBaseUrl } from '../auth/anonymous-auth.ts';
import type { CachedCampaignBatch, CachedCampaignPuzzle } from '../storage/campaign-puzzle-cache.ts';

interface CampaignPuzzleBatchResponse {
  readonly startLevel: number;
  readonly endLevel: number;
  readonly puzzles: readonly CachedCampaignPuzzle[];
}

export async function downloadCampaignBatch(startLevel: number): Promise<CachedCampaignBatch | null> {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) return null;
  const response = await fetch(`${baseUrl}/api/campaign/batches/${startLevel}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Campaign batch download failed: ${response.status}`);
  const payload = await response.json() as CampaignPuzzleBatchResponse;
  if (payload.startLevel !== startLevel || payload.endLevel !== startLevel + 99 || !Array.isArray(payload.puzzles)) {
    throw new Error('Campaign batch response is invalid.');
  }
  return { ...payload, downloadedAtMs: Date.now() };
}
