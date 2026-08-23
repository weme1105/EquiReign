import type { ConflictMap, Position, PuzzleDefinition } from './types.ts';

export function attacks(a: Position, b: Position): boolean {
  return a.row === b.row
    || a.column === b.column
    || Math.abs(a.row - b.row) === Math.abs(a.column - b.column);
}

export function findConflicts(queens: readonly (number | null)[]): ConflictMap {
  const positions = queens.flatMap((column, row) =>
    column === null ? [] : [{ row, column }],
  );
  const rows = new Set<number>();

  for (let left = 0; left < positions.length; left += 1) {
    for (let right = left + 1; right < positions.length; right += 1) {
      const a = positions[left];
      const b = positions[right];
      if (a && b && attacks(a, b)) {
        rows.add(a.row);
        rows.add(b.row);
      }
    }
  }

  return { rows, positions };
}

export function isSolved(queens: readonly (number | null)[], size: number): boolean {
  return queens.length === size
    && queens.every((column) => column !== null)
    && findConflicts(queens).rows.size === 0;
}

export function validatePuzzle(puzzle: PuzzleDefinition): void {
  if (puzzle.solution.length !== puzzle.size || !isSolved(puzzle.solution, puzzle.size)) {
    throw new Error(`Puzzle ${puzzle.id} has an invalid solution.`);
  }

  const givenRows = new Set<number>();
  for (const given of puzzle.givens) {
    if (
      given.row < 0
      || given.row >= puzzle.size
      || given.column !== puzzle.solution[given.row]
      || givenRows.has(given.row)
    ) {
      throw new Error(`Puzzle ${puzzle.id} has an invalid given queen.`);
    }
    givenRows.add(given.row);
  }

  for (const step of puzzle.hintSequence) {
    const { row, column } = step.position;
    const expected = puzzle.solution[row] === column ? 'queen' : 'excluded';
    if (row < 0 || row >= puzzle.size || column < 0 || column >= puzzle.size || step.expected !== expected) {
      throw new Error(`Puzzle ${puzzle.id} has an invalid hint step.`);
    }
  }
}
