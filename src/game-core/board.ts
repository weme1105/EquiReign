import type { BoardSnapshot, CellState, Position, PuzzleDefinition } from './types.ts';

export const positionKey = ({ row, column }: Position): string => `${row},${column}`;
export const cellIndex = (size: number, position: Position): number => position.row * size + position.column;
export const isInside = (size: number, position: Position): boolean =>
  Number.isInteger(position.row) && Number.isInteger(position.column)
  && position.row >= 0 && position.column >= 0 && position.row < size && position.column < size;

export function createBoard(puzzle: PuzzleDefinition): BoardSnapshot {
  const cells: CellState[] = Array.from({ length: puzzle.size * puzzle.size }, () => 'empty');
  for (const position of puzzle.givenQueens) cells[cellIndex(puzzle.size, position)] = 'queen';
  return { size: puzzle.size, regionMap: puzzle.regionMap, cells };
}

export function withCell(board: BoardSnapshot, position: Position, state: CellState): BoardSnapshot {
  if (!isInside(board.size, position)) return board;
  const cells = [...board.cells];
  cells[cellIndex(board.size, position)] = state;
  return { ...board, cells };
}

export function positionsWithState(board: BoardSnapshot, state: CellState): Position[] {
  const positions: Position[] = [];
  board.cells.forEach((value, index) => {
    if (value === state) positions.push({ row: Math.floor(index / board.size), column: index % board.size });
  });
  return positions;
}
