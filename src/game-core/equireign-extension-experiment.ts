import type { BoardSize } from './types.ts';

export interface EquiReignExtensionResult {
  readonly sourceSize: BoardSize;
  readonly targetSize: BoardSize;
  readonly extensionEdges: readonly (readonly [readonly number[], readonly number[]])[];
  readonly solutions: readonly (readonly number[])[];
}

/**
 * Experimental growth from an EquiReign solution of size N to N+1.
 * One row and one column are inserted; existing queens are shifted around
 * the insertion point. This is intentionally separate from the standard
 * N-Queens generator and is used to compare recursive growth with direct
 * enumeration.
 */
export function extendEquiReignSolution(solution: readonly number[]): readonly number[][] {
  const sourceSize = solution.length;
  const targetSize = sourceSize + 1;
  const extensions: number[][] = [];

  for (let insertedRow = 0; insertedRow < targetSize; insertedRow += 1) {
    for (let insertedColumn = 0; insertedColumn < targetSize; insertedColumn += 1) {
      const candidate = Array<number>(targetSize).fill(-1);

      for (let row = 0; row < sourceSize; row += 1) {
        const nextRow = row < insertedRow ? row : row + 1;
        const column = solution[row]!;
        const nextColumn = column < insertedColumn ? column : column + 1;
        candidate[nextRow] = nextColumn;
      }
      candidate[insertedRow] = insertedColumn;

      if (isEquiReignPlacement(candidate)) {
        extensions.push(candidate);
      }
    }
  }

  return extensions;
}

export function extendEquiReignSolutions(
  sourceSolutions: readonly (readonly number[])[],
): EquiReignExtensionResult {
  const sourceSize = sourceSolutions[0]?.length ?? 0;
  const extensionEdges: (readonly [readonly number[], readonly number[]])[] = [];
  const unique = new Map<string, readonly number[]>();

  for (const source of sourceSolutions) {
    for (const target of extendEquiReignSolution(source)) {
      extensionEdges.push([source, target]);
      unique.set(target.join(','), target);
    }
  }

  return {
    sourceSize: sourceSize as BoardSize,
    targetSize: (sourceSize + 1) as BoardSize,
    extensionEdges,
    solutions: [...unique.values()],
  };
}

function isEquiReignPlacement(solution: readonly number[]): boolean {
  const columns = new Set<number>();
  for (let row = 0; row < solution.length; row += 1) {
    const column = solution[row];
    if (column === undefined || column < 0 || column >= solution.length || columns.has(column)) return false;
    columns.add(column);
    if (row > 0 && Math.abs(solution[row - 1]! - column) <= 1) return false;
  }
  return true;
}
