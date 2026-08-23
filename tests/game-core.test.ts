import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoard, withCell } from '../src/game-core/board.ts';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { RegionPuzzleGenerator } from '../src/game-core/generator.ts';
import { validatePuzzle } from '../src/game-core/puzzle.ts';
import { findRuleConflicts, validateCompletedBoard } from '../src/game-core/rules.ts';
import { createGameSession, cycleCell, isGivenQueen, placeQueen, queenFeasibilityErrors, requestHint, restart, toPuzzleResult, toggleExcluded, undo } from '../src/game-core/session.ts';
import { countSolutions, extractFirstSolution, findLogicalHint } from '../src/game-core/solver.ts';
import type { BoardSnapshot, Difficulty, PuzzleDefinition } from '../src/game-core/types.ts';
import { DIFFICULTY_ORDER, getPuzzle } from '../src/puzzles/catalog.ts';

test('catalog puzzles have valid regions, policy givens, and exactly one solution', () => {
  for (const difficulty of DIFFICULTY_ORDER) {
    const puzzle = getPuzzle(difficulty);
    assert.doesNotThrow(() => validatePuzzle(puzzle));
    assert.equal(puzzle.givenQueens.length, DIFFICULTIES[difficulty].givenQueenCount);
    assert.equal(countSolutions(createBoard(puzzle), 2), 1);
  }
});

test('rule conflicts use row, column, region and adjacency, not full diagonals', () => {
  const puzzle = getPuzzle('advanced');
  let board = createBoard(puzzle);
  board = withCell(board, { row: 0, column: 0 }, 'queen');
  board = withCell(board, { row: 2, column: 2 }, 'queen');
  assert.equal(findRuleConflicts(board).reasons.has('adjacent'), false, 'distant diagonal is legal');

  board = withCell(createBoard(puzzle), { row: 0, column: 0 }, 'queen');
  board = withCell(board, { row: 1, column: 1 }, 'queen');
  assert.equal(findRuleConflicts(board).reasons.has('adjacent'), true);

  const sameRegion = puzzle.regionMap.findIndex((region, index) => index > 0 && region === puzzle.regionMap[0]);
  board = withCell(createBoard(puzzle), { row: 0, column: 0 }, 'queen');
  board = withCell(board, { row: Math.floor(sameRegion / puzzle.size), column: sameRegion % puzzle.size }, 'queen');
  assert.equal(findRuleConflicts(board).reasons.has('region'), true);
});

test('solution counter respects player X and forced queens', () => {
  const puzzle = getPuzzle('advanced');
  const board = createBoard(puzzle);
  const solution = extractFirstSolution(board)!;
  assert.equal(solution.length, puzzle.size);
  const queen = solution[0]!;
  assert.equal(countSolutions(withCell(board, queen, 'excluded'), 1), 0);
  assert.equal(countSolutions(withCell(board, queen, 'queen'), 1), 1);
});

test('given queens are immutable and never enter history', () => {
  const session = createGameSession(getPuzzle('beginner'), 100);
  const given = session.puzzle.givenQueens[0]!;
  assert.equal(isGivenQueen(session, given), true);
  assert.equal(cycleCell(session, given), session);
  assert.equal(session.history.length, 0);
});

test('tap cycles Empty to X to Queen to Empty and undo restores the board', () => {
  const position = { row: 0, column: 0 };
  let session = createGameSession(getPuzzle('advanced'), 100);
  session = cycleCell(session, position, 101);
  assert.equal(session.boardState.cells[0], 'excluded');
  session = cycleCell(session, position, 102);
  assert.equal(session.boardState.cells[0], 'queen');
  session = cycleCell(session, position, 103);
  assert.equal(session.boardState.cells[0], 'empty');
  session = undo(session);
  assert.equal(session.boardState.cells[0], 'queen');
});

test('restart removes player state and retains given queens', () => {
  let session = createGameSession(getPuzzle('beginner'), 100);
  session = toggleExcluded(session, { row: 0, column: 0 }, 101);
  const reset = restart(session, 200);
  assert.equal(reset.history.length, 0);
  assert.equal(reset.hintsUsed, 0);
  assert.equal(reset.startedAtMs, 200);
  for (const given of reset.puzzle.givenQueens) assert.equal(reset.boardState.cells[given.row * reset.puzzle.size + given.column], 'queen');
});

test('easy difficulties expose feasibility errors while Expert and King do not', () => {
  for (const difficulty of ['beginner', 'intermediate', 'advanced'] as Difficulty[]) {
    let session = createGameSession(getPuzzle(difficulty));
    const solution = extractFirstSolution(session.boardState)!;
    const target = solution.find(({ row, column }) => !isGivenQueen(session, { row, column }))!;
    const wrongColumn = (target.column + 1) % session.puzzle.size;
    session = placeQueen(session, { row: target.row, column: wrongColumn });
    assert.ok(queenFeasibilityErrors(session).size > 0);
  }
  for (const difficulty of ['expert', 'king'] as Difficulty[]) {
    const session = placeQueen(createGameSession(getPuzzle(difficulty)), { row: 0, column: 0 });
    assert.equal(queenFeasibilityErrors(session).size, 0);
  }
});

test('hint is solver-derived, non-revealing, limited to three and cleared by board action', () => {
  let session = createGameSession(getPuzzle('expert'));
  assert.ok(findLogicalHint(session.boardState));
  session = requestHint(session);
  assert.ok(session.hintTarget);
  assert.equal(session.boardState.cells.every((state) => state === 'empty'), true);
  const firstTarget = session.hintTarget!;
  session = cycleCell(session, firstTarget);
  assert.equal(session.hintTarget, null);
  session = requestHint(session);
  session = cycleCell(session, session.hintTarget!);
  session = requestHint(session);
  assert.equal(session.hintsUsed, 3);
  assert.equal(requestHint(session), session);
});

test('hint is not charged when current board has no solution', () => {
  let session = createGameSession(getPuzzle('expert'));
  session = placeQueen(session, { row: 0, column: 0 });
  session = placeQueen(session, { row: 0, column: 1 });
  const hinted = requestHint(session);
  assert.equal(hinted.hintsUsed, 0);
  assert.equal(hinted.hintTarget, null);
});

test('completion requires a full legal Region board and produces a timed result', () => {
  let session = createGameSession(getPuzzle('advanced'), 1000);
  const solution = extractFirstSolution(session.boardState)!;
  solution.forEach((position, index) => { session = placeQueen(session, position, 1100 + index); });
  assert.equal(validateCompletedBoard(session.boardState), true);
  assert.equal(session.status, 'completed');
  const result = toPuzzleResult(session, 9999);
  assert.equal(result.completed, true);
  assert.equal(result.elapsedTimeMs, session.completedAtMs! - 1000);
});

test('a full but invalid board stays playing and exposes completion error', () => {
  let session = createGameSession(getPuzzle('advanced'));
  for (let row = 0; row < session.puzzle.size; row += 1) session = placeQueen(session, { row, column: row });
  assert.equal(session.status, 'playing');
  assert.equal(session.completionError, true);
});

test('deterministic generator fulfills the PuzzleGenerator contract', () => {
  const generated = new RegionPuzzleGenerator().generate(6, 20260824);
  const board: BoardSnapshot = { size: 6, regionMap: generated.regionMap, cells: Array.from({ length: 36 }, () => 'empty') };
  assert.equal(new Set(generated.regionMap).size, 6);
  assert.equal(countSolutions(board, 2), 1);
  assert.equal(generated.solution.length, 6);
});

test('invalid region definitions are rejected', () => {
  const invalid: PuzzleDefinition = { ...getPuzzle('advanced'), regionMap: Array.from({ length: 64 }, () => 0) };
  assert.throws(() => validatePuzzle(invalid), /region ids/);
});
