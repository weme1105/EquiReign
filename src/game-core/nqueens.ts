import type { BoardSize, Position } from './types.ts';

export interface NQueensEnumeration {
  readonly size: BoardSize;
  readonly solutions: readonly (readonly number[])[];
  readonly fundamentalSolutions: readonly (readonly number[])[];
}

/**
 * Enumerate every N-Queens solution for a standard EquiReign board size.
 * A solution is represented as one zero-based column per row.
 */
export function enumerateNQueens(size: BoardSize): NQueensEnumeration {
  const solutions: number[][] = [];
  const columns = new Set<number>();
  const downDiagonals = new Set<number>();
  const upDiagonals = new Set<number>();
  const placement = Array<number>(size).fill(-1);

  const visit = (row: number): void => {
    if (row === size) {
      solutions.push([...placement]);
      return;
    }
    for (let column = 0; column < size; column += 1) {
      if (columns.has(column) || downDiagonals.has(row - column) || upDiagonals.has(row + column)) continue;
      placement[row] = column;
      columns.add(column);
      downDiagonals.add(row - column);
      upDiagonals.add(row + column);
      visit(row + 1);
      columns.delete(column);
      downDiagonals.delete(row - column);
      upDiagonals.delete(row + column);
    }
  };

  visit(0);
  const fundamentalSolutions = dedupeSymmetricSolutions(solutions, size);
  return { size, solutions, fundamentalSolutions };
}

export function solutionToPositions(solution: readonly number[]): readonly Position[] {
  return solution.map((column, row) => ({ row, column }));
}

/** Canonical representative under the full dihedral symmetry group D4. */
export function canonicalNQueensSolution(solution: readonly number[], size: number): string {
  return symmetryVariants(solution, size)
    .map((variant) => variant.join(','))
    .sort()[0]!;
}

function dedupeSymmetricSolutions(solutions: readonly number[][], size: BoardSize): number[][] {
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

function symmetryVariants(solution: readonly number[], size: number): number[][] {
  const transforms = [
    (row: number, column: number) => [row, column],
    (row: number, column: number) => [column, size - 1 - row],
    (row: number, column: number) => [size - 1 - row, size - 1 - column],
    (row: number, column: number) => [size - 1 - column, row],
    (row: number, column: number) => [row, size - 1 - column],
    (row: number, column: number) => [size - 1 - row, column],
    (row: number, column: number) => [column, row],
    (row: number, column: number) => [size - 1 - column, size - 1 - row],
  ];

  return transforms.map((transform) => {
    const variant = Array<number>(size).fill(-1);
    for (let row = 0; row < size; row += 1) {
      const [nextRow, nextColumn] = transform(row, solution[row]!);
      variant[nextRow!] = nextColumn!;
    }
    return variant;
  });
}
