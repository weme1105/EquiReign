/**
 * Experimental helpers for studying N -> N-1 reducibility of EquiReign queen placements.
 *
 * This is research code, not the production puzzle-generation architecture.
 * A placement is represented by one zero-based column per row.
 */

export type DeletionObstruction = 'value-midpoint' | 'row-bridge' | null;

/**
 * Directly tests whether deleting any row and its occupied column leaves a legal
 * EquiReign row/column/non-adjacent placement after column compression.
 */
export function hasLegalEquiReignReduction(solution: readonly number[]): boolean {
  for (let removedRow = 0; removedRow < solution.length; removedRow += 1) {
    if (isLegalAfterDeletion(solution, removedRow)) return true;
  }
  return false;
}

/**
 * Returns the local witness that makes deletion of `removedRow` illegal.
 *
 * There are exactly two ways deletion can create an adjacent-row conflict:
 * 1. value-midpoint: columns c-1 and c+1 are occupied by adjacent rows, so
 *    removing column c compresses their distance from 2 to 1.
 * 2. row-bridge: rows r-1 and r+1 become adjacent after row r is removed and
 *    their compressed columns differ by at most 1.
 */
export function deletionObstructionByWitness(
  solution: readonly number[],
  removedRow: number,
): DeletionObstruction {
  const size = solution.length;
  if (removedRow < 0 || removedRow >= size) {
    throw new RangeError(`removedRow ${removedRow} is outside 0..${size - 1}`);
  }

  const removedColumn = solution[removedRow]!;
  const positions = Array<number>(size).fill(-1);
  for (let row = 0; row < size; row += 1) positions[solution[row]!] = row;

  if (removedColumn > 0 && removedColumn + 1 < size) {
    if (Math.abs(positions[removedColumn - 1]! - positions[removedColumn + 1]!) === 1) {
      return 'value-midpoint';
    }
  }

  if (removedRow > 0 && removedRow + 1 < size) {
    const left = solution[removedRow - 1]!;
    const right = solution[removedRow + 1]!;
    const compressedLeft = left - (left > removedColumn ? 1 : 0);
    const compressedRight = right - (right > removedColumn ? 1 : 0);
    if (Math.abs(compressedLeft - compressedRight) <= 1) return 'row-bridge';
  }

  return null;
}

/** A placement is irreducible iff every possible row deletion has a witness. */
export function isEquiReignIrreducibleByWitness(solution: readonly number[]): boolean {
  for (let row = 0; row < solution.length; row += 1) {
    if (deletionObstructionByWitness(solution, row) === null) return false;
  }
  return true;
}

export function isLegalAfterDeletion(solution: readonly number[], removedRow: number): boolean {
  const removedColumn = solution[removedRow]!;
  let previousColumn: number | null = null;

  for (let row = 0; row < solution.length; row += 1) {
    if (row === removedRow) continue;
    const column = solution[row]! - (solution[row]! > removedColumn ? 1 : 0);
    if (previousColumn !== null && Math.abs(previousColumn - column) <= 1) return false;
    previousColumn = column;
  }

  return true;
}
