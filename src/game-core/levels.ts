import { rankSolverCosts } from './complexity.ts';
import type { BoardSize, Difficulty, GeneratedPuzzle, SolverMetrics } from './types.ts';

export interface PuzzlePoolCandidate {
  readonly id: string;
  readonly size: BoardSize;
  readonly regionMap: readonly number[];
  readonly solution: GeneratedPuzzle['solution'];
  readonly solverMetrics: SolverMetrics;
}

export interface RankedPuzzleCandidate extends PuzzlePoolCandidate {
  readonly costScore: number;
  readonly costTier: Difficulty;
}

export interface LevelSelection {
  readonly level: number;
  readonly puzzle: RankedPuzzleCandidate;
  readonly isFixed: boolean;
  readonly replayAllowed: boolean;
}

/** Percentiles are calculated independently inside each board size. */
export function rankPuzzlePool(candidates: readonly PuzzlePoolCandidate[]): readonly RankedPuzzleCandidate[] {
  const output: RankedPuzzleCandidate[] = [];
  const sizes = [...new Set(candidates.map((candidate) => candidate.size))].sort((a, b) => a - b);
  for (const size of sizes) {
    const sameSize = candidates.filter((candidate) => candidate.size === size);
    const ranked = rankSolverCosts(sameSize.map((candidate) => candidate.solverMetrics));
    sameSize.forEach((candidate, index) => output.push({ ...candidate, costScore: ranked[index]!.score, costTier: ranked[index]!.tier }));
  }
  return output;
}

/**
 * Every tenth level is stable and replayable. Other levels use a caller-supplied
 * random value so UI/platform randomness never leaks into Domain tests.
 */
export function selectLevel(
  pool: readonly RankedPuzzleCandidate[],
  request: { readonly level: number; readonly size: BoardSize; readonly difficulty: Difficulty; readonly randomValue?: number; readonly previousPuzzleId?: string | null },
): LevelSelection {
  if (!Number.isInteger(request.level) || request.level < 1) throw new Error('Level must be a positive integer.');
  const eligible = pool.filter((candidate) => candidate.size === request.size && candidate.costTier === request.difficulty);
  if (!eligible.length) throw new Error(`No ${request.size}x${request.size} ${request.difficulty} puzzle is available.`);
  const isFixed = request.level % 10 === 0;
  let puzzle: RankedPuzzleCandidate;
  if (isFixed) {
    const bossIndex = (Math.floor(request.level / 10) - 1) % eligible.length;
    puzzle = [...eligible].sort((a, b) => b.costScore - a.costScore || a.id.localeCompare(b.id))[bossIndex]!;
  } else {
    const withoutPrevious = eligible.filter((candidate) => candidate.id !== request.previousPuzzleId);
    const choices = withoutPrevious.length ? withoutPrevious : eligible;
    const randomValue = request.randomValue ?? Math.random();
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) throw new Error('randomValue must be in [0, 1).');
    puzzle = choices[Math.floor(randomValue * choices.length)]!;
  }
  return { level: request.level, puzzle, isFixed, replayAllowed: isFixed };
}
