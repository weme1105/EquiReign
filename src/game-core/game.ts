import { DIFFICULTIES } from './difficulty.ts';
import { isSolved, validatePuzzle } from './rules.ts';
import type { GameState, PuzzleDefinition } from './types.ts';

export function createGame(puzzle: PuzzleDefinition): GameState {
  validatePuzzle(puzzle);
  const queens: (number | null)[] = Array.from({ length: puzzle.size }, () => null);
  for (const given of puzzle.givens) queens[given.row] = given.column;

  return {
    puzzle,
    queens,
    exclusions: Array.from({ length: puzzle.size }, () => Array.from({ length: puzzle.size }, () => false)),
    hintTarget: null,
    hintsRemaining: DIFFICULTIES[puzzle.difficulty].maxHints,
    status: isSolved(queens, puzzle.size) ? 'completed' : 'playing',
    moves: 0,
  };
}

export function isLockedRow(state: GameState, row: number): boolean {
  return state.puzzle.givens.some((given) => given.row === row);
}

export function placeQueen(state: GameState, row: number, column: number): GameState {
  if (
    state.status === 'completed'
    || isLockedRow(state, row)
    || row < 0
    || row >= state.puzzle.size
    || column < 0
    || column >= state.puzzle.size
  ) return state;

  const queens = [...state.queens];
  queens[row] = queens[row] === column ? null : column;
  const exclusions = state.exclusions.map((cells, index) => {
    if (index !== row) return cells;
    const next = [...cells];
    next[column] = false;
    return next;
  });
  return {
    ...state,
    queens,
    exclusions,
    hintTarget: null,
    moves: state.moves + 1,
    status: isSolved(queens, state.puzzle.size) ? 'completed' : 'playing',
  };
}

export function toggleExclusion(state: GameState, row: number, column: number): GameState {
  if (
    state.status === 'completed'
    || isLockedRow(state, row)
    || state.queens[row] === column
    || row < 0
    || row >= state.puzzle.size
    || column < 0
    || column >= state.puzzle.size
  ) return state;

  const exclusions = state.exclusions.map((cells, index) => {
    if (index !== row) return cells;
    const next = [...cells];
    next[column] = !next[column];
    return next;
  });
  return { ...state, exclusions, hintTarget: null, moves: state.moves + 1 };
}

export function requestHint(state: GameState): GameState {
  if (state.status === 'completed' || state.hintsRemaining <= 0) return state;

  const step = state.puzzle.hintSequence.find(({ position, expected }) => {
    if (expected === 'queen') return state.queens[position.row] !== position.column;
    return !state.exclusions[position.row]?.[position.column];
  });
  if (!step) return state;
  return {
    ...state,
    hintTarget: step.position,
    hintsRemaining: state.hintsRemaining - 1,
  };
}
