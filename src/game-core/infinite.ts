import type { BoardSize, Position } from './types.ts';

export interface InfinitePuzzlePresentation {
  /** Presentation-only loss: these cells remain in the Solver board and solution. */
  readonly lostCellIndexes: ReadonlySet<number>;
  readonly lostCrownIndexes: ReadonlySet<number>;
}

/**
 * Randomly loses 1..size cells. No more than half of the lost cells may contain
 * solution crowns, and lost cells remain part of the Solver board.
 */
export function createInfinitePresentation(
  size: BoardSize,
  solution: readonly Position[],
  options: { readonly lostCellCount?: number; readonly randomValues?: readonly number[] } = {},
): InfinitePuzzlePresentation {
  const cellCount = size * size;
  const lostCellCount = options.lostCellCount ?? 1 + Math.floor(Math.random() * size);
  if (!Number.isInteger(lostCellCount) || lostCellCount < 1 || lostCellCount > solution.length) {
    throw new Error('lostCellCount must be between one and the crown count.');
  }
  if (options.randomValues && options.randomValues.length !== cellCount) throw new Error('randomValues must contain one value per cell.');
  const crownIndexes = new Set(solution.map(({ row, column }) => row * size + column));
  const ranked = Array.from({ length: cellCount }, (_, index) => ({
    index,
    value: options.randomValues?.[index] ?? Math.random(),
  }));
  if (ranked.some(({ value }) => !Number.isFinite(value) || value < 0 || value >= 1)) throw new Error('Random values must be in [0, 1).');
  ranked.sort((left, right) => left.value - right.value || left.index - right.index);
  const lostCellIndexes = new Set<number>();
  const lostCrownIndexes = new Set<number>();
  const lostCrownLimit = Math.floor(lostCellCount / 2);
  for (const { index } of ranked) {
    if (lostCellIndexes.size >= lostCellCount) break;
    if (crownIndexes.has(index)) {
      if (lostCrownIndexes.size >= lostCrownLimit) continue;
      lostCrownIndexes.add(index);
    }
    lostCellIndexes.add(index);
  }
  return { lostCellIndexes, lostCrownIndexes };
}

/** Lost crowns appear only when every visible crown is correct and there are no visible extras. */
export function revealedLostCrowns(
  size: BoardSize,
  solution: readonly Position[],
  placedQueens: readonly Position[],
  presentation: InfinitePuzzlePresentation,
): readonly Position[] {
  const visibleSolution = new Set(solution.map(({ row, column }) => row * size + column)
    .filter((index) => !presentation.lostCellIndexes.has(index)));
  const visiblePlaced = new Set(placedQueens.map(({ row, column }) => row * size + column)
    .filter((index) => !presentation.lostCellIndexes.has(index)));
  const ready = visiblePlaced.size === visibleSolution.size && [...visiblePlaced].every((index) => visibleSolution.has(index));
  return ready ? solution.filter(({ row, column }) => presentation.lostCrownIndexes.has(row * size + column)) : [];
}

export function isLostCell(presentation: InfinitePuzzlePresentation, size: BoardSize, position: Position): boolean {
  return presentation.lostCellIndexes.has(position.row * size + position.column);
}
