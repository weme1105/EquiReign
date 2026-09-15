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
  /** Campaign levels are permanent slots: the same level always resolves to the same puzzle. */
  readonly isFixed: true;
  /** Every campaign level can be replayed after it has been cleared. */
  readonly replayAllowed: true;
}

/**
 * Difficulty is one global distribution across the complete pool.
 * Size remains an independent campaign axis, so cross-size comparisons are intentional.
 */
export function rankPuzzlePool(candidates: readonly PuzzlePoolCandidate[]): readonly RankedPuzzleCandidate[] {
  const ranked = rankSolverCosts(candidates.map((candidate) => candidate.solverMetrics));
  return candidates.map((candidate, index) => ({
    ...candidate,
    costScore: ranked[index]!.score,
    costTier: ranked[index]!.tier,
  }));
}

/**
 * Every campaign level is a fixed, replayable slot shared by all players.
 * Selection is derived only from level + the eligible puzzle pool; runtime randomness
 * and previous-play state must never affect campaign puzzle identity.
 */
export function selectLevel(
  pool: readonly RankedPuzzleCandidate[],
  request: { readonly level: number; readonly size: BoardSize; readonly difficulty: Difficulty },
): LevelSelection {
  if (!Number.isInteger(request.level) || request.level < 1) throw new Error('Level must be a positive integer.');
  const eligible = pool
    .filter((candidate) => candidate.size === request.size && candidate.costTier === request.difficulty)
    .sort((a, b) => a.costScore - b.costScore || a.id.localeCompare(b.id));
  if (!eligible.length) throw new Error(`No ${request.size}x${request.size} ${request.difficulty} puzzle is available.`);

  // A stable integer mix avoids obvious sequential repetition while keeping mapping deterministic.
  const mixed = Math.imul(request.level ^ 0x7f4a7c15, 0x9e3779b1) >>> 0;
  const puzzle = eligible[mixed % eligible.length]!;
  return { level: request.level, puzzle, isFixed: true, replayAllowed: true };
}
