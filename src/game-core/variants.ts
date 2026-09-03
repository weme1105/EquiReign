import type { Difficulty, PuzzleVariants } from './types.ts';

export type SpecialCellKind = 'frozen' | 'lost' | 'dual';

export const EMPTY_PUZZLE_VARIANTS: PuzzleVariants = {
  frozenCellIndexes: [],
  lostCellIndexes: [],
  dualRegionCells: [],
};

export function countVariantCells(variants: PuzzleVariants): Readonly<Record<SpecialCellKind, number>> {
  return {
    frozen: variants.frozenCellIndexes.length,
    lost: variants.lostCellIndexes.length,
    dual: variants.dualRegionCells.length,
  };
}

/**
 * Difficulty limits for special-cell variants. Limits are inclusive (<=), per game design.
 * N is the board size / queen count.
 */
export function validateVariantLimits(difficulty: Difficulty, size: number, variants: PuzzleVariants): void {
  const { frozen, lost, dual } = countVariantCells(variants);
  switch (difficulty) {
    case 'beginner':
      requireAtMost('frozen', frozen, 0); requireAtMost('lost', lost, 0); requireAtMost('dual', dual, 0); break;
    case 'intermediate':
      requireAtMost('frozen', frozen, 1); requireAtMost('lost', lost, 0); requireAtMost('dual', dual, 0); break;
    case 'advanced':
      requireAtMost('frozen', frozen, size - 1); requireAtMost('lost', lost, 1); requireAtMost('dual', dual, 0); break;
    case 'expert':
      requireAtMost('frozen + lost', frozen + lost, size); requireAtMost('dual', dual, 0); break;
    case 'king':
      requireAtMost('frozen + lost', frozen + lost, size - 1); requireAtMost('dual', dual, 1); break;
  }
}

/** Infinite mode uses a combined inclusive cap and permits all three special-cell types. */
export function validateInfiniteVariantLimits(size: number, variants: PuzzleVariants): void {
  const { frozen, lost, dual } = countVariantCells(variants);
  requireAtMost('frozen + lost + dual', frozen + lost + dual, size);
}

function requireAtMost(label: string, actual: number, maximum: number): void {
  if (actual > maximum) throw new Error(`Invalid ${label} count: ${actual} exceeds ${maximum}.`);
}

export function validateVariantCells(size: number, regionMap: readonly number[], variants: PuzzleVariants): void {
  const occupied = new Map<number, SpecialCellKind>();
  for (const index of variants.frozenCellIndexes) claimCell(size, index, 'frozen', occupied);
  for (const index of variants.lostCellIndexes) claimCell(size, index, 'lost', occupied);
  for (const dual of variants.dualRegionCells) {
    claimCell(size, dual.index, 'dual', occupied);
    if (!Number.isInteger(dual.regions[0]) || !Number.isInteger(dual.regions[1]) || dual.regions[0] === dual.regions[1]) {
      throw new Error(`Invalid dual-region cell ${dual.index}: exactly two distinct regions are required.`);
    }
    for (const region of dual.regions) {
      if (region < 0 || region >= size) throw new Error(`Invalid dual-region cell ${dual.index}: region ${region} is outside 0..${size - 1}.`);
    }
    const baseRegion = regionMap[dual.index];
    if (baseRegion !== dual.regions[0] && baseRegion !== dual.regions[1]) {
      throw new Error(`Invalid dual-region cell ${dual.index}: base region ${baseRegion} is not one of its candidates.`);
    }
  }
}

function claimCell(size: number, index: number, kind: SpecialCellKind, occupied: Map<number, SpecialCellKind>): void {
  if (!Number.isInteger(index) || index < 0 || index >= size * size) throw new Error(`Invalid ${kind} cell index ${index}.`);
  const previous = occupied.get(index);
  if (previous) throw new Error(`Cell ${index} cannot be both ${previous} and ${kind}.`);
  occupied.set(index, kind);
}
