import { analyzeSolutions } from './solver.ts';
import type { BoardSize, BoardSnapshot } from './types.ts';
import { isValidEquiReignRegionMap } from './region-map.ts';

/** Builds the solver board for a plain Base puzzle with no special cells. */
export function createBasePuzzleBoard(size: BoardSize, regionMap: readonly number[]): BoardSnapshot | null {
  if (!isValidEquiReignRegionMap(size, regionMap)) return null;
  return { size, regionMap: [...regionMap], cells: Array(size * size).fill('empty') };
}

/** Base admission gate: structural validity plus exactly one solver solution. */
export function verifyBasePuzzleUniqueness(size: BoardSize, regionMap: readonly number[]): number {
  const board = createBasePuzzleBoard(size, regionMap);
  if (!board) return 0;
  return analyzeSolutions(board, 2).solutionCount;
}

export function isUniquelySolvableBasePuzzle(size: BoardSize, regionMap: readonly number[]): boolean {
  return verifyBasePuzzleUniqueness(size, regionMap) === 1;
}
