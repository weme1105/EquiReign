import type { BoardSize } from './types.ts';
import { canonicalNQueensSolution } from './nqueens.ts';

export interface EquiReignSolutionEnumeration {
  readonly size: BoardSize;
  readonly solutions: readonly (readonly number[])[];
  readonly fundamentalSolutions: readonly (readonly number[])[];
}

/**
 * Enumerate EquiReign's row/column/non-adjacent queen configurations.
 * Unlike standard N-Queens, diagonal attacks are not a global constraint.
 * A solution is represented as one zero-based column per row.
 */
export function enumerateEquiReignSolutions(size: BoardSize): EquiReignSolutionEnumeration {
  const solutions: number[][] = [];
  const columns = new Set<number>();
  const placement = Array<number>(size).fill(-1);

  const visit = (row: number): void => {
    if (row === size) {
      solutions.push([...placement]);
      return;
    }

    for (let column = 0; column < size; column += 1) {
      if (columns.has(column)) continue;
      if (row > 0 && Math.abs(placement[row - 1]! - column) <= 1) continue;

      placement[row] = column;
      columns.add(column);
      visit(row + 1);
      columns.delete(column);
    }
  };

  visit(0);
  const fundamentalSolutions = dedupeSymmetricSolutions(solutions, size);
  return { size, solutions, fundamentalSolutions };
}

function dedupeSymmetricSolutions(
  solutions: readonly number[][],
  size: BoardSize,
): number[][] {
  const seen = new Set<string>();
  const result: number[][] = [];

  for (const solution of solutions) {
    const key = canonicalNQueensSolution(solution, size);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(solution);
  }

  return result;
}
