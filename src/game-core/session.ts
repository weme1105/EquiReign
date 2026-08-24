import { cellIndex, createBoard, isInside, positionKey, positionsWithState, withCell } from './board.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { validatePuzzle } from './puzzle.ts';
import { hasCompleteQueenCount, validateCompletedBoard } from './rules.ts';
import { canCompleteWithQueen, findLogicalHint } from './solver.ts';
import { extractFirstSolution } from './solver.ts';
import { createInfinitePresentation } from './infinite.ts';
import { createFrozenPresentation, resolveFrozenCells } from './frozen.ts';
import type { CellState, GameSession, Position, PuzzleDefinition, PuzzleResult } from './types.ts';

const NEXT_STATE: Readonly<Record<CellState, CellState>> = { empty: 'excluded', excluded: 'queen', queen: 'empty' };

export function createGameSession(puzzle: PuzzleDefinition, nowMs = Date.now(), context: { readonly playMode?: GameSession['playMode']; readonly campaignLevel?: number | null } = {}): GameSession {
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
    excludedPositionKeysUsed: [],
    playMode: context.playMode ?? 'free',
    campaignLevel: context.campaignLevel ?? null,
    lostCellIndexes: [],
    frozenCellIndexes: [],
    revealedFrozenCellIndexes: [],
  };
}

export function configureInfiniteSession(session: GameSession): GameSession {
  const solution = extractFirstSolution(session.boardState); if (!solution) throw new Error('Infinite mode requires a solvable puzzle.');
  const lost = createInfinitePresentation(session.puzzle.size as 6 | 7 | 8 | 9 | 10 | 11 | 12, solution);
  const frozen = createFrozenPresentation(session.puzzle.size as 6 | 7 | 8 | 9 | 10 | 11 | 12, solution, lost.lostCellIndexes);
  return { ...session, lostCellIndexes: [...lost.lostCellIndexes], frozenCellIndexes: [...frozen.frozenCellIndexes], revealedFrozenCellIndexes: [] };
}

export function isGivenQueen(session: GameSession, position: Position): boolean {
  return session.puzzle.givenQueens.some((given) => given.row === position.row && given.column === position.column);
}

function withPlayerBoard(session: GameSession, boardState: GameSession['boardState'], nowMs: number): GameSession {
  let revealedFrozenCellIndexes = session.revealedFrozenCellIndexes;
  let completed: boolean; let completionError = false;
  if (session.lostCellIndexes.length || session.frozenCellIndexes.length) {
    const solution = extractFirstSolution(createBoard(session.puzzle));
    if (!solution) { completed = false; }
    else {
      const frozen = resolveFrozenCells(session.puzzle.size as 6 | 7 | 8 | 9 | 10 | 11 | 12, solution, boardState.cells, { frozenCellIndexes: new Set(session.frozenCellIndexes), revealedCellIndexes: new Set(session.revealedFrozenCellIndexes) }, new Set(session.lostCellIndexes));
      revealedFrozenCellIndexes = [...frozen.revealedCellIndexes];
      const solutionIndexes = new Set(solution.map(({ row, column }) => row * session.puzzle.size + column));
      const implicitCrowns = new Set(revealedFrozenCellIndexes.filter((index) => solutionIndexes.has(index)));
      const visibleExpected = new Set([...solutionIndexes].filter((index) => !session.lostCellIndexes.includes(index)));
      const visiblePlaced = new Set(boardState.cells.flatMap((cell, index) => cell === 'queen' ? [index] : []).filter((index) => !session.lostCellIndexes.includes(index)));
      implicitCrowns.forEach((index) => visiblePlaced.add(index));
      completed = visiblePlaced.size === visibleExpected.size && [...visiblePlaced].every((index) => visibleExpected.has(index));
    }
  } else {
    const completeCount = hasCompleteQueenCount(boardState); completed = completeCount && validateCompletedBoard(boardState); completionError = completeCount && !completed;
  }
  return {
    ...session,
    boardState,
    history: [...session.history, { cells: session.boardState.cells, completionError: session.completionError }],
    hintTarget: null,
    status: completed ? 'completed' : 'playing',
    completedAtMs: completed ? nowMs : null,
    completionError,
    revealedFrozenCellIndexes,
  };
}

function withExcludedUsage(session: GameSession, position: Position, nextState: CellState): GameSession {
  if (nextState !== 'excluded') return session;
  const key = positionKey(position);
  return session.excludedPositionKeysUsed.includes(key)
    ? session
    : { ...session, excludedPositionKeysUsed: [...session.excludedPositionKeysUsed, key] };
}

export function cycleCell(session: GameSession, position: Position, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session;
  const index = cellIndex(session.puzzle.size, position);
  const nextState = NEXT_STATE[session.boardState.cells[index]!]!;
  return withPlayerBoard(withExcludedUsage(session, position, nextState), withCell(session.boardState, position, nextState), nowMs);
}

export function placeQueen(session: GameSession, position: Position, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session;
  const next = session.boardState.cells[cellIndex(session.puzzle.size, position)] === 'queen' ? 'empty' : 'queen';
  return withPlayerBoard(session, withCell(session.boardState, position, next), nowMs);
}

export function toggleExcluded(session: GameSession, position: Position, nowMs = Date.now()): GameSession {
  if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session;
  const current = session.boardState.cells[cellIndex(session.puzzle.size, position)];
  const next = current === 'excluded' ? 'empty' : 'excluded';
  return withPlayerBoard(withExcludedUsage(session, position, next), withCell(session.boardState, position, next), nowMs);
}

function isHiddenSpecialCell(session: GameSession, position: Position): boolean {
  const index = cellIndex(session.puzzle.size, position);
  return session.lostCellIndexes.includes(index) || (session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index));
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
  return { ...createGameSession(session.puzzle, nowMs, { playMode: session.playMode, campaignLevel: session.campaignLevel }), lostCellIndexes: session.lostCellIndexes, frozenCellIndexes: session.frozenCellIndexes, revealedFrozenCellIndexes: [] };
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
  const finalQueens = new Set(positionsWithState(session.boardState, 'queen').map(positionKey));
  const effectiveExcludedCount = session.excludedPositionKeysUsed.filter((key) => !finalQueens.has(key)).length;
  return {
    puzzleId: session.puzzle.id,
    difficulty: session.difficulty,
    size: session.puzzle.size,
    elapsedTimeMs: Math.max(0, end - session.startedAtMs),
    hintsUsed: session.hintsUsed,
    completed: session.status === 'completed',
    effectiveExcludedCount,
    limitedXClear: session.status === 'completed' && effectiveExcludedCount <= session.puzzle.size,
  };
}
