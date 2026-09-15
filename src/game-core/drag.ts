import { cellIndex } from './board.ts';
import { isGivenQueen, toggleExcluded } from './session.ts';
import type { GameSession, Position } from './types.ts';

export type DragMode = 'paint-excluded' | 'erase-excluded';

export function applyDrag(session: GameSession, positions: readonly Position[], mode: DragMode, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || positions.length === 0) return session;
  const seen = new Set<string>();
  let current = session;
  const originalHistory = session.history;
  for (const position of positions) {
    const key = `${position.row}:${position.column}`;
    if (seen.has(key) || isGivenQueen(current, position)) continue;
    seen.add(key);
    const index = cellIndex(current.puzzle.size, position);
    if (current.lostCellIndexes.includes(index) || (current.frozenCellIndexes.includes(index) && !current.revealedFrozenCellIndexes.includes(index))) continue;
    const state = current.boardState.cells[index];
    if (mode === 'paint-excluded' && state === 'empty') current = toggleExcluded(current, position, nowMs);
    if (mode === 'erase-excluded' && state === 'excluded') current = toggleExcluded(current, position, nowMs);
  }
  if (current === session) return session;
  return { ...current, history: [...originalHistory, { cells: session.boardState.cells, completionError: session.completionError }] };
}
