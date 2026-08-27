import type { Difficulty, Position, PuzzleDefinition } from '../game-core/types.ts';
import { BUNDLED_CAMPAIGN_PUZZLES } from './bundled-campaign.generated.ts';

function isDifficulty(value: string): value is Difficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' || value === 'expert' || value === 'king';
}

export function getBundledCampaignPuzzle(level: number): PuzzleDefinition | null {
  if (!Number.isInteger(level) || level < 1 || level > 150) return null;
  const source = BUNDLED_CAMPAIGN_PUZZLES[level - 1];
  if (!source || source.level !== level || !isDifficulty(source.difficulty)) return null;
  const givenQueens: Position[] = source.givenQueenCellIndexes.map((cell) => ({
    row: Math.floor(cell / source.size),
    column: cell % source.size,
  }));
  return {
    id: source.puzzleId,
    difficulty: source.difficulty,
    size: source.size,
    regionMap: source.regionMap,
    givenQueens,
  };
}

export function bundledCampaignPuzzleCount(): number {
  return BUNDLED_CAMPAIGN_PUZZLES.length;
}
