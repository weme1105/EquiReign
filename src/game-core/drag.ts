import { cellIndex } from './board.ts';
import { isGivenQueen, toggleExcluded } from './session.ts';
import type { GameSession, Position } from './types.ts';

export type DragMode = 'paint-excluded' | 'erase-excluded';

/**
 * Applies one drag gesture as one logical board operation.
 *
 * Empty/Queen start => paint only traversed Empty cells as X.
 * X start => erase only traversed X cells to Empty.
 * A cell is applied at most once during the gesture.
 */
export function applyDrag(session: GameSession, positions: readonly Position[], mode: DragMode, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || positions.length === 0) return session;

  const unique: Position[] = [];
  const seen = new Set<string>();
  for (const position of positions) {
    const key = `${position.row}:${position.column}`;
    if (seen.has(key) || isGivenQueen(session, position)) continue;
    seen.add(key);
    unique.push(position);
  }

  const historyLength = session.history.length;
  let current = session;
  for (const position of unique) {
    if (current.status === 'completed') break;
    const index = cellIndex(current.puzzle.size, position);
    const state = current.boardState.cells[index];
    if (mode === 'paint-excluded' && state === 'empty') {
      current = toggleExcluded(current, position, nowMs);
    } else if (mode === 'erase-excluded' && state === 'excluded') {
      current = toggleExcluded(current, position, nowMs);
    }
  }

  if (current === session) return session;

  return {
    ...current,
    history: [
      ...session.history.slice(0, historyLength),
      { cells: session.boardState.cells, completionError: session.completionError },
    ],
  };
}
