import { cellIndex, createBoard, isInside, positionKey, positionsWithState, withCell } from './board.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { validatePuzzle } from './puzzle.ts';
import { hasCompleteQueenCount, validateCompletedBoard } from './rules.ts';
import { canCompleteWithQueen, findLogicalHint } from './solver.ts';
import type { BoardHistoryEntry, CellState, GameSession, Position, PuzzleDefinition, PuzzleResult } from './types.ts';

const NEXT_STATE: Readonly<Record<CellState, CellState>> = { empty: 'excluded', excluded: 'queen', queen: 'empty' };

export function createGameSession(puzzle: PuzzleDefinition, nowMs = Date.now()): GameSession {
  validatePuzzle(puzzle);
  return {
    puzzle,
    difficulty: puzzle.difficulty,
    boardState: createBoard(puzzle),
    history: [],
    hintsUsed: 0,
    hintTarget: null,
    startedAtMs: nowMs,
    completedAtMs: null,
    status: 'ready',
    completionError: false,
  };
}

export function isGivenQueen(session: GameSession, position: Position): boolean {
  return session.puzzle.givenQueens.some((given) => given.row === position.row && given.column === position.column);
}

function withPlayerBoard(session: GameSession, boardState: GameSession['boardState'], nowMs: number): GameSession {
  const completeCount = hasCompleteQueenCount(boardState);
  const completed = completeCount && validateCompletedBoard(boardState);
  return {
    ...session,
    boardState,
    history: [...session.history, { cells: session.boardState.cells, completionError: session.completionError }],
    hintTarget: null,
    status: completed ? 'completed' : 'playing',
    completedAtMs: completed ? nowMs : null,
    completionError: completeCount && !completed,
  };
}

export function cycleCell(session: GameSession, position: Position, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position)) return session;
  const index = cellIndex(session.puzzle.size, position);
  return withPlayerBoard(session, withCell(session.boardState, position, NEXT_STATE[session.boardState.cells[index]!] ), nowMs);
}

export function placeQueen(session: GameSession, position: Position, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position)) return session;
  const next = session.boardState.cells[cellIndex(session.puzzle.size, position)] === 'queen' ? 'empty' : 'queen';
  return withPlayerBoard(session, withCell(session.boardState, position, next), nowMs);
}

export function toggleExcluded(session: GameSession, position: Position, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position)) return session;
  const current = session.boardState.cells[cellIndex(session.puzzle.size, position)];
  const next = current === 'excluded' ? 'empty' : 'excluded';
  return withPlayerBoard(session, withCell(session.boardState, position, next), nowMs);
}

export function undo(session: GameSession): GameSession {
  const previous = session.history.at(-1);
  if (!previous || session.status === 'completed') return session;
  return {
    ...session,
    boardState: { ...session.boardState, cells: previous.cells },
    history: session.history.slice(0, -1),
    hintTarget: null,
    status: session.history.length === 1 ? 'ready' : 'playing',
    completedAtMs: null,
    completionError: previous.completionError,
  };
}

export function restart(session: GameSession, nowMs = Date.now()): GameSession {
  return { ...createGameSession(session.puzzle, nowMs) };
}

export function requestHint(session: GameSession): GameSession {
  const limit = DIFFICULTIES[session.difficulty].hintLimit;
  if (session.status === 'completed' || session.hintsUsed >= limit || session.hintTarget) return session;
  const target = findLogicalHint(session.boardState);
  if (!target) return session;
  return { ...session, hintTarget: target, hintsUsed: session.hintsUsed + 1 };
}

export function queenFeasibilityErrors(session: GameSession): ReadonlySet<string> {
  if (!DIFFICULTIES[session.difficulty].realtimeQueenValidation) return new Set();
  const errors = new Set<string>();
  const givens = new Set(session.puzzle.givenQueens.map(positionKey));
  for (const queen of positionsWithState(session.boardState, 'queen')) {
    if (!givens.has(positionKey(queen)) && !canCompleteWithQueen(session.boardState, queen)) errors.add(positionKey(queen));
  }
  return errors;
}

export function toPuzzleResult(session: GameSession, nowMs = Date.now()): PuzzleResult {
  const end = session.completedAtMs ?? nowMs;
  return {
    puzzleId: session.puzzle.id,
    difficulty: session.difficulty,
    size: session.puzzle.size,
    elapsedTimeMs: Math.max(0, end - session.startedAtMs),
    hintsUsed: session.hintsUsed,
    completed: session.status === 'completed',
  };
}
