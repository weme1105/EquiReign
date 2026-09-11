import { analyzeSolutions } from './solver.ts';
import type { BoardSnapshot, PuzzleVariants } from './types.ts';
import { validateVariantCells } from './variants.ts';

export interface VariantCandidate {
  readonly variants: PuzzleVariants;
  readonly solutionCount: number;
}

export type VariantSemanticKind = 'base' | 'frozen' | 'lost' | 'dual';

export interface VariantEffectiveBoard {
  readonly kind: VariantSemanticKind;
  readonly board: BoardSnapshot;
  /** True when the variant changes the solver's playable constraint set. */
  readonly changesSolverConstraints: boolean;
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

/**
 * Translate a validated variant layer into the board actually consumed by the
 * formal solver. Frozen and Lost are currently presentation/gameplay layers:
 * they hide/reveal cells but do not remove those cells from the solver's
 * solution space. Dual-region is intentionally rejected until its formal
 * solver semantics exist; silently treating it as ordinary metadata would be
 * a correctness bug.
 */
export function resolveVariantEffectiveBoard(
  baseBoard: BoardSnapshot,
  variants: PuzzleVariants,
): VariantEffectiveBoard {
  validateVariantCells(baseBoard.size, baseBoard.regionMap, variants);

  if (variants.dualRegionCells.length > 0) {
    throw new Error('Dual-region solver semantics are not implemented yet.');
  }

  const hasPresentationLayer = variants.frozenCellIndexes.length > 0 || variants.lostCellIndexes.length > 0;
  return {
    kind: hasPresentationLayer ? (variants.frozenCellIndexes.length > 0 ? 'frozen' : 'lost') : 'base',
    board: baseBoard,
    changesSolverConstraints: false,
  };
}

/** Build the ordinary board used when a variant only carries presentation metadata. */
export function createVariantVerificationBoard(
  size: number,
  regionMap: readonly number[],
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
  const effective = resolveVariantEffectiveBoard(board, variants);
  const solutionCount = verifyVariantUniqueness(effective.board);
  return solutionCount === 1 ? { variants, solutionCount } : null;
}
