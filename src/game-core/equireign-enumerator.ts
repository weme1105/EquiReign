import type { BoardSize } from './types.ts';

export interface EquiReignEnumeration {
  readonly size: BoardSize;
  readonly solutions: readonly (readonly number[])[];
  readonly solutionCount: number;
}

/**
 * Exhaustively enumerates Queen layouts under EquiReign rules only.
 * There is deliberately no global diagonal constraint: only adjacent-row
 * Queen columns must differ by more than one.
 */
export function enumerateEquiReignSolutions(size: BoardSize): EquiReignEnumeration {
  const solutions: number[][] = [];
  const usedColumns = new Set<number>();
  const placement = Array<number>(size).fill(-1);

  const visit = (row: number): void => {
    if (row === size) {
      solutions.push([...placement]);
      return;
    }
    for (let column = 0; column < size; column += 1) {
      if (usedColumns.has(column)) continue;
      if (row > 0 && Math.abs(column - placement[row - 1]!) <= 1) continue;
      placement[row] = column;
      usedColumns.add(column);
      visit(row + 1);
      usedColumns.delete(column);
    }
  };

  visit(0);
  return { size, solutions, solutionCount: solutions.length };
}

export function isExpectedSixBySixEnumeration(result: EquiReignEnumeration): boolean {
  return result.size === 6 && result.solutionCount === 90;
}
