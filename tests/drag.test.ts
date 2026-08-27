import assert from 'node:assert/strict';
import test from 'node:test';
import { cellIndex } from '../src/game-core/board.ts';
import { applyDrag } from '../src/game-core/drag.ts';
import { createGameSession, cycleCell } from '../src/game-core/session.ts';
import { getPuzzle } from '../src/puzzles/catalog.ts';

const puzzle = getPuzzle('advanced', 8);

function stateAt(session: ReturnType<typeof createGameSession>, row: number, column: number) {
  return session.boardState.cells[cellIndex(session.puzzle.size, { row, column })];
}

test('drag from Empty paints traversed Empty cells as X once', () => {
  const session = createGameSession(puzzle, 1);
  const next = applyDrag(session, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }, { row: 0, column: 1 }], 'paint-excluded', 2);
  assert.equal(stateAt(next, 0, 0), 'excluded');
  assert.equal(stateAt(next, 0, 1), 'excluded');
  assert.equal(stateAt(next, 0, 2), 'excluded');
  assert.equal(next.history.length, 1);
});

test('drag from X erases traversed X cells to Empty', () => {
  let session = createGameSession(puzzle, 1);
  session = cycleCell(session, { row: 0, column: 0 }, 2);
  session = cycleCell(session, { row: 0, column: 1 }, 3);
  const next = applyDrag(session, [{ row: 0, column: 0 }, { row: 0, column: 1 }], 'erase-excluded', 4);
  assert.equal(stateAt(next, 0, 0), 'empty');
  assert.equal(stateAt(next, 0, 1), 'empty');
});

test('drag starting on Queen keeps the Queen and paints only Empty cells', () => {
  let session = createGameSession(puzzle, 1);
  session = cycleCell(session, { row: 0, column: 0 }, 2);
  session = cycleCell(session, { row: 0, column: 0 }, 3);
  const next = applyDrag(session, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }], 'paint-excluded', 4);
  assert.equal(stateAt(next, 0, 0), 'queen');
  assert.equal(stateAt(next, 0, 1), 'excluded');
  assert.equal(stateAt(next, 0, 2), 'excluded');
});
