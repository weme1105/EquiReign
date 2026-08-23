import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, placeQueen, requestHint, toggleExclusion } from '../src/game-core/game.ts';
import { findConflicts, isSolved, validatePuzzle } from '../src/game-core/rules.ts';
import type { Difficulty } from '../src/game-core/types.ts';
import { getPuzzle } from '../src/puzzles/catalog.ts';

test('all catalog puzzles contain a valid solution and valid givens', () => {
  for (const difficulty of ['beginner', 'intermediate', 'advanced', 'expert', 'king'] as Difficulty[]) {
    assert.doesNotThrow(() => validatePuzzle(getPuzzle(difficulty)));
  }
});

test('given queens are present and cannot be changed', () => {
  const state = createGame(getPuzzle('beginner'));
  assert.equal(state.queens[0], 1);
  assert.equal(placeQueen(state, 0, 4), state);
});

test('placing a queen toggles it and reports conflicts', () => {
  let state = createGame(getPuzzle('beginner'));
  state = placeQueen(state, 1, 1);
  assert.deepEqual([...findConflicts(state.queens).rows].sort(), [0, 1]);
  state = placeQueen(state, 1, 1);
  assert.equal(state.queens[1], null);
});

test('hint highlights one cell without revealing or placing its value', () => {
  const initial = createGame(getPuzzle('expert'));
  const hinted = requestHint(initial);
  assert.notEqual(hinted.hintTarget, null);
  assert.deepEqual(hinted.queens, initial.queens);
  assert.equal(hinted.hintsRemaining, initial.hintsRemaining - 1);
  const acted = toggleExclusion(hinted, hinted.hintTarget!.row, hinted.hintTarget!.column);
  assert.equal(acted.hintTarget, null);
});

test('long-press exclusion is independent from queen placement', () => {
  const initial = createGame(getPuzzle('advanced'));
  const excluded = toggleExclusion(initial, 0, 1);
  assert.equal(excluded.exclusions[0]?.[1], true);
  const queen = placeQueen(excluded, 0, 1);
  assert.equal(queen.exclusions[0]?.[1], false);
  assert.equal(queen.queens[0], 1);
});

test('completion is based on rules rather than exact solution identity', () => {
  const puzzle = getPuzzle('beginner');
  assert.equal(isSolved(puzzle.solution, puzzle.size), true);
  let state = createGame(puzzle);
  puzzle.solution.forEach((column, row) => {
    state = placeQueen(state, row, column);
  });
  assert.equal(state.status, 'completed');
});
