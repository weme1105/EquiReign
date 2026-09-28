import type { Difficulty, Position, PuzzleDefinition } from '../game-core/types.ts';
import { getNextCampaignBatchStart } from '../game/campaign-batch.ts';
import { downloadCampaignBatch } from './campaign-api.ts';
import { findCachedCampaignPuzzle, loadCampaignBatch, saveCampaignBatch, type CachedCampaignPuzzle } from '../storage/campaign-puzzle-cache.ts';

function isDifficulty(value: string): value is Difficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' || value === 'expert' || value === 'king';
}

const campaignBatchDownloads = new Map<number, Promise<boolean>>();

function toPuzzleDefinition(puzzle: CachedCampaignPuzzle): PuzzleDefinition {
  if (!isDifficulty(puzzle.difficulty)) throw new Error(`Unsupported campaign difficulty: ${puzzle.difficulty}`);
  const size = puzzle.size;
  const givenQueens: Position[] = puzzle.givenQueenCellIndexes.map((cell) => ({ row: Math.floor(cell / size), column: cell % size }));
  return { id: puzzle.puzzleId, difficulty: puzzle.difficulty, size, regionMap: puzzle.regionMap, givenQueens };
}

export async function loadDownloadedCampaignPuzzle(level: number): Promise<PuzzleDefinition | null> {
  const cached = await findCachedCampaignPuzzle(level);
  return cached ? toPuzzleDefinition(cached) : null;
}

export async function ensureCampaignBatch(startLevel: number): Promise<boolean> {
  const cached = await loadCampaignBatch(startLevel);
  if (cached) return true;

  const existing = campaignBatchDownloads.get(startLevel);
  if (existing) return existing;

  const download = (async () => {
    const downloaded = await downloadCampaignBatch(startLevel);
    if (!downloaded) return false;
    await saveCampaignBatch(downloaded);
    return true;
  })();

  campaignBatchDownloads.set(startLevel, download);
  try {
    return await download;
  } finally {
    campaignBatchDownloads.delete(startLevel);
  }
}

export async function ensureDownloadedCampaignPuzzle(level: number): Promise<PuzzleDefinition | null> {
  const cached = await loadDownloadedCampaignPuzzle(level);
  if (cached) return cached;
  if (level < 100) return null;
  const startLevel = Math.floor(level / 100) * 100;
  if (!await ensureCampaignBatch(startLevel)) return null;
  return loadDownloadedCampaignPuzzle(level);
}

export async function prefetchNextCampaignBatch(level: number): Promise<void> {
  const nextStart = getNextCampaignBatchStart(level);
  if (nextStart === null) return;
  try { await ensureCampaignBatch(nextStart); } catch { /* Prefetch must never block gameplay. */ }
}
