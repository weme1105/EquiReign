import { cellIndex, positionKey, positionsWithState } from './board.ts';
import type { BoardSnapshot, ConflictMap, ConflictReason, Position } from './types.ts';

function mark(positions: Set<string>, reasons: Set<ConflictReason>, reason: ConflictReason, a: Position, b: Position): void {
  positions.add(positionKey(a)); positions.add(positionKey(b)); reasons.add(reason);
}

/** Direct rule conflicts are difficulty-independent and never use a stored answer. */
export function findRuleConflicts(board: BoardSnapshot): ConflictMap {
  const queens = positionsWithState(board, 'queen');
  const positions = new Set<string>();
  const reasons = new Set<ConflictReason>();
  for (let left = 0; left < queens.length; left += 1) for (let right = left + 1; right < queens.length; right += 1) {
    const a = queens[left]!; const b = queens[right]!;
    if (a.row === b.row) mark(positions, reasons, 'row', a, b);
    if (a.column === b.column) mark(positions, reasons, 'column', a, b);
    if (board.regionMap[cellIndex(board.size, a)] === board.regionMap[cellIndex(board.size, b)]) mark(positions, reasons, 'region', a, b);
    if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.column - b.column) <= 1) mark(positions, reasons, 'adjacent', a, b);
  }
  return { positions, reasons };
}

export function validateCompletedBoard(board: BoardSnapshot): boolean {
  const queens = positionsWithState(board, 'queen');
  if (queens.length !== board.size || findRuleConflicts(board).positions.size > 0) return false;
  const rows = new Set(queens.map((queen) => queen.row));
  const columns = new Set(queens.map((queen) => queen.column));
  const regions = new Set(queens.map((queen) => board.regionMap[cellIndex(board.size, queen)]));
  return rows.size === board.size && columns.size === board.size && regions.size === board.size;
}

export function hasCompleteQueenCount(board: BoardSnapshot): boolean {
  return positionsWithState(board, 'queen').length === board.size;
}
