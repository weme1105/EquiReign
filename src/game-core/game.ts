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
  return {
    ...state,
    queens,
    hintTarget: null,
    moves: state.moves + 1,
    status: isSolved(queens, state.puzzle.size) ? 'completed' : 'playing',
  };
}

export function requestHint(state: GameState): GameState {
  if (state.status === 'completed' || state.hintsRemaining <= 0) return state;

  const row = state.queens.findIndex((column, index) => column !== state.puzzle.solution[index]);
  if (row === -1) return state;
  return {
    ...state,
    hintTarget: { row, column: state.puzzle.solution[row] ?? 0 },
    hintsRemaining: state.hintsRemaining - 1,
  };
}
