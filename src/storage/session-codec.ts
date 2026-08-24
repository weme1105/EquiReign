import { cellIndex } from '../game-core/board.ts';
import { DIFFICULTIES } from '../game-core/difficulty.ts';
import { validatePuzzle } from '../game-core/puzzle.ts';
import { validateCompletedBoard } from '../game-core/rules.ts';
import type { CellState, GameSession } from '../game-core/types.ts';

const SAVE_VERSION = 1;
const CELL_STATES: readonly CellState[] = ['empty', 'excluded', 'queen'];

interface SavedSession {
  readonly version: number;
  readonly savedAtMs: number;
  readonly session: GameSession;
}

export function encodeSession(session: GameSession, savedAtMs = Date.now()): string {
  return JSON.stringify({ version: SAVE_VERSION, savedAtMs, session } satisfies SavedSession);
}

export function decodeSession(value: string | null): GameSession | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value) as Partial<SavedSession>;
    if (saved.version !== SAVE_VERSION || !Number.isFinite(saved.savedAtMs) || !isValidSession(saved.session)) return null;
    return saved.session;
  } catch {
    return null;
  }
}

function isValidSession(value: unknown): value is GameSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as GameSession;
  try { validatePuzzle(session.puzzle); } catch { return false; }
  const size = session.puzzle.size; const cellCount = size * size;
  if (session.difficulty !== session.puzzle.difficulty || session.boardState?.size !== size) return false;
  if (!sameNumbers(session.boardState.regionMap, session.puzzle.regionMap) || !validCells(session.boardState.cells, cellCount)) return false;
  if (!Array.isArray(session.history) || session.history.some((entry) => !validCells(entry?.cells, cellCount) || typeof entry.completionError !== 'boolean')) return false;
  if (!Number.isInteger(session.hintsUsed) || session.hintsUsed < 0 || session.hintsUsed > DIFFICULTIES[session.difficulty].hintLimit) return false;
  if (session.hintTarget && (!Number.isInteger(session.hintTarget.row) || !Number.isInteger(session.hintTarget.column)
    || session.hintTarget.row < 0 || session.hintTarget.column < 0 || session.hintTarget.row >= size || session.hintTarget.column >= size)) return false;
  if (!Number.isFinite(session.startedAtMs) || (session.completedAtMs !== null && !Number.isFinite(session.completedAtMs))) return false;
  if (session.status !== 'ready' && session.status !== 'playing' && session.status !== 'completed') return false;
  if (typeof session.completionError !== 'boolean') return false;
  for (const given of session.puzzle.givenQueens) if (session.boardState.cells[cellIndex(size, given)] !== 'queen') return false;
  return session.status !== 'completed' || (session.completedAtMs !== null && validateCompletedBoard(session.boardState));
}

function validCells(value: readonly CellState[] | undefined, expectedLength: number): boolean {
  return Array.isArray(value) && value.length === expectedLength && value.every((cell) => CELL_STATES.includes(cell));
}

function sameNumbers(left: readonly number[] | undefined, right: readonly number[]): boolean {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}
