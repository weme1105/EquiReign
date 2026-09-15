import type { BoardSize, CellState, Position } from './types.ts';

export interface FrozenPuzzlePresentation {
  readonly frozenCellIndexes: ReadonlySet<number>;
  readonly revealedCellIndexes: ReadonlySet<number>;
}

export function createFrozenPresentation(
  size: BoardSize,
  solution: readonly Position[],
  unavailableIndexes: ReadonlySet<number> = new Set(),
  options: { readonly frozenCellCount?: number; readonly randomValues?: readonly number[] } = {},
): FrozenPuzzlePresentation {
  const cellCount = size * size;
  const frozenCellCount = options.frozenCellCount ?? 1 + Math.floor(Math.random() * solution.length);
  if (!Number.isInteger(frozenCellCount) || frozenCellCount < 1 || frozenCellCount > solution.length) {
    throw new Error('frozenCellCount must be between one and the crown count.');
  }
  if (options.randomValues && options.randomValues.length !== cellCount) throw new Error('randomValues must contain one value per cell.');
  const ranked = Array.from({ length: cellCount }, (_, index) => ({ index, value: options.randomValues?.[index] ?? Math.random() }))
    .filter(({ index }) => !unavailableIndexes.has(index));
  if (ranked.some(({ value }) => !Number.isFinite(value) || value < 0 || value >= 1)) throw new Error('Random values must be in [0, 1).');
  ranked.sort((left, right) => left.value - right.value || left.index - right.index);
  if (ranked.length < frozenCellCount) throw new Error('Not enough available cells to freeze.');
  return { frozenCellIndexes: new Set(ranked.slice(0, frozenCellCount).map(({ index }) => index)), revealedCellIndexes: new Set() };
}

/** Resolves all currently available reveals, including crown-triggered chain reactions. */
export function resolveFrozenCells(
  size: BoardSize,
  solution: readonly Position[],
  cells: readonly CellState[],
  frozen: FrozenPuzzlePresentation,
  lostCellIndexes: ReadonlySet<number> = new Set(),
): FrozenPuzzlePresentation {
  if (cells.length !== size * size) throw new Error('Cell count does not match board size.');
  const solutionCrowns = new Set(solution.map(({ row, column }) => row * size + column));
  const revealed = new Set(frozen.revealedCellIndexes);
  let changed = true;
  while (changed) {
    changed = false;
    for (const index of frozen.frozenCellIndexes) {
      if (revealed.has(index)) continue;
      const row = Math.floor(index / size); const column = index % size;
      const shouldReveal = solutionCrowns.has(index)
        ? lineAllOrdinaryExcluded(row, true, index) || lineAllOrdinaryExcluded(column, false, index)
        : lineHasFoundCrown(row, true) || lineHasFoundCrown(column, false);
      if (shouldReveal) { revealed.add(index); changed = true; }
    }
  }
  return { ...frozen, revealedCellIndexes: revealed };

  function hidden(index: number): boolean {
    return lostCellIndexes.has(index) || (frozen.frozenCellIndexes.has(index) && !revealed.has(index));
  }
  function lineAllOrdinaryExcluded(line: number, rowLine: boolean, targetIndex: number): boolean {
    for (let offset = 0; offset < size; offset += 1) {
      const candidate = rowLine ? line * size + offset : offset * size + line;
      if (candidate === targetIndex || hidden(candidate)) continue;
      if (cells[candidate] !== 'excluded') return false;
    }
    return true;
  }
  function lineHasFoundCrown(line: number, rowLine: boolean): boolean {
    for (let offset = 0; offset < size; offset += 1) {
      const candidate = rowLine ? line * size + offset : offset * size + line;
      if (hidden(candidate)) continue;
      if (cells[candidate] === 'queen' || (revealed.has(candidate) && solutionCrowns.has(candidate))) return true;
    }
    return false;
  }
}
