import type { BoardSize, Position } from './types.ts';

export interface InfinitePuzzlePresentation {
  /** Presentation-only loss: these cells remain in the Solver board and solution. */
  readonly lostCellIndexes: ReadonlySet<number>;
}

/**
 * Selects cells whose visual information is lost in Infinite mode. Because all
 * board indexes participate, a correct crown position can be selected as lost.
 */
export function createInfinitePresentation(
  size: BoardSize,
  lostCellCount: number,
  randomValues?: readonly number[],
): InfinitePuzzlePresentation {
  const cellCount = size * size;
  if (!Number.isInteger(lostCellCount) || lostCellCount < 1 || lostCellCount >= cellCount) {
    throw new Error('lostCellCount must leave at least one visible cell.');
  }
  if (randomValues && randomValues.length !== cellCount) throw new Error('randomValues must contain one value per cell.');
  const ranked = Array.from({ length: cellCount }, (_, index) => ({
    index,
    value: randomValues?.[index] ?? Math.random(),
  }));
  if (ranked.some(({ value }) => !Number.isFinite(value) || value < 0 || value >= 1)) throw new Error('Random values must be in [0, 1).');
  ranked.sort((left, right) => left.value - right.value || left.index - right.index);
  return { lostCellIndexes: new Set(ranked.slice(0, lostCellCount).map(({ index }) => index)) };
}

export function isLostCell(presentation: InfinitePuzzlePresentation, size: BoardSize, position: Position): boolean {
  return presentation.lostCellIndexes.has(position.row * size + position.column);
}
