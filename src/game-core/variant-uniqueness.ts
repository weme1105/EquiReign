import { analyzeSolutions } from './solver.ts';
import type { BoardSnapshot, Position, PuzzleVariants } from './types.ts';

export interface VariantCandidate {
  readonly variants: PuzzleVariants;
  readonly solutionCount: number;
}

/**
 * Phase 3 acceptance gate. A variant is accepted only when its effective
 * playable board has exactly one solution. The base solution is never used
 * as a substitute for this verification.
 */
export function verifyVariantUniqueness(board: BoardSnapshot): number {
  return analyzeSolutions(board, 2).solutionCount;
}

export function isUniquelySolvableVariant(board: BoardSnapshot): boolean {
  return verifyVariantUniqueness(board) === 1;
}

/** Build the ordinary board used when a variant only carries presentation metadata. */
export function createVariantVerificationBoard(
  size: number,
  regionMap: readonly number[],
  solution: readonly Position[],
): BoardSnapshot {
  const cells = Array.from({ length: size * size }, () => 'empty' as const);
  return { size, regionMap, cells };
}

/**
 * Deterministic helper for candidate pipelines: reject every candidate whose
 * effective board does not have exactly one solution.
 */
export function acceptUniqueVariant(
  board: BoardSnapshot,
  variants: PuzzleVariants,
): VariantCandidate | null {
  const solutionCount = verifyVariantUniqueness(board);
  return solutionCount === 1 ? { variants, solutionCount } : null;
}
