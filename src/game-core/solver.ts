import { cellIndex, isInside, positionsWithState, withCell } from './board.ts';
import type { BoardSnapshot, Position } from './types.ts';

interface RowOption { readonly column: number; readonly region: number }

/** Ported domain algorithm from NQueensSimulator; rows are implicit DFS depth. */
export function countSolutions(board: BoardSnapshot, requestedLimit = 2): number {
  const size = board.size;
  if (!Number.isInteger(size) || size < 1 || size > 30 || board.cells.length !== size * size || board.regionMap.length !== size * size) return 0;
  const rowOptions: RowOption[][] = Array.from({ length: size }, () => []);

  for (let row = 0; row < size; row += 1) {
    const queens: RowOption[] = [];
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const region = board.regionMap[index];
      if (!Number.isInteger(region) || region < 0 || region >= size) {
        if (board.cells[index] === 'queen') return 0;
        continue; // Unassigned generator cells are not playable yet.
      }
      if (board.cells[index] === 'queen') queens.push({ column, region });
      else if (board.cells[index] !== 'excluded') rowOptions[row]!.push({ column, region });
    }
    if (queens.length > 1) return 0;
    if (queens.length === 1) rowOptions[row] = queens;
    if (rowOptions[row]!.length === 0) return 0;
  }

  const limit = Math.max(1, Math.floor(requestedLimit));
  const memo = new Map<string, number>();
  const search = (row: number, columnsMask: number, regionsMask: number, previousColumn: number): number => {
    if (row === size) return 1;
    const key = `${row}|${columnsMask >>> 0}|${regionsMask >>> 0}|${previousColumn}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let count = 0;
    for (const option of rowOptions[row]!) {
      const columnBit = 1 << option.column;
      const regionBit = 1 << option.region;
      if ((columnsMask & columnBit) || (regionsMask & regionBit)) continue;
      if (previousColumn >= 0 && Math.abs(option.column - previousColumn) <= 1) continue;
      count += search(row + 1, (columnsMask | columnBit) >>> 0, (regionsMask | regionBit) >>> 0, option.column);
      if (count >= limit) { count = limit; break; }
    }
    memo.set(key, count);
    return count;
  };
  return search(0, 0, 0, -1);
}

export function canCompleteWithQueen(board: BoardSnapshot, position: Position): boolean {
  if (!isInside(board.size, position)) return false;
  return countSolutions(withCell(board, position, 'queen'), 1) > 0;
}

/** Returns a provably determined cell without exposing whether it is Queen or X. */
export function findLogicalHint(board: BoardSnapshot): Position | null {
  if (countSolutions(board, 1) === 0) return null;
  for (let row = 0; row < board.size; row += 1) for (let column = 0; column < board.size; column += 1) {
    const position = { row, column };
    const index = cellIndex(board.size, position);
    if (board.cells[index] !== 'empty') continue;
    const withQueen = countSolutions(withCell(board, position, 'queen'), 1);
    const withExcluded = countSolutions(withCell(board, position, 'excluded'), 1);
    if ((withQueen === 0) !== (withExcluded === 0)) return position;
  }
  return null;
}

export function extractFirstSolution(board: BoardSnapshot): Position[] | null {
  if (countSolutions(board, 1) === 0) return null;
  let current = board;
  const fixed = positionsWithState(board, 'queen');
  for (let row = 0; row < board.size; row += 1) {
    if (fixed.some((queen) => queen.row === row)) continue;
    for (let column = 0; column < board.size; column += 1) {
      const position = { row, column };
      if (current.cells[cellIndex(board.size, position)] === 'excluded') continue;
      const candidate = withCell(current, position, 'queen');
      if (countSolutions(candidate, 1) > 0) { current = candidate; break; }
    }
  }
  return positionsWithState(current, 'queen');
}
