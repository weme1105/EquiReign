import { createBoard, isInside, positionKey } from './board.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { countSolutions } from './solver.ts';
import type { PuzzleDefinition } from './types.ts';

export function validatePuzzle(puzzle: PuzzleDefinition, requireUnique = true): void {
  if (!Number.isInteger(puzzle.size) || puzzle.size < 4 || puzzle.size > 12) throw new Error(`Puzzle ${puzzle.id}: size must be 4..12.`);
  if (puzzle.regionMap.length !== puzzle.size * puzzle.size) throw new Error(`Puzzle ${puzzle.id}: invalid regionMap length.`);
  const regions = new Set(puzzle.regionMap);
  if (regions.size !== puzzle.size || [...regions].some((region) => !Number.isInteger(region) || region < 0 || region >= puzzle.size))
    throw new Error(`Puzzle ${puzzle.id}: region ids must be exactly 0..size-1.`);
  const keys = new Set<string>();
  for (const given of puzzle.givenQueens) {
    if (!isInside(puzzle.size, given) || keys.has(positionKey(given))) throw new Error(`Puzzle ${puzzle.id}: invalid given queen.`);
    keys.add(positionKey(given));
  }
  const expected = DIFFICULTIES[puzzle.difficulty].givenQueenCount;
  if (puzzle.givenQueens.length !== expected) throw new Error(`Puzzle ${puzzle.id}: ${puzzle.difficulty} requires ${expected} given queens.`);
  const count = countSolutions(createBoard(puzzle), 2);
  if (count === 0) throw new Error(`Puzzle ${puzzle.id}: no legal solution.`);
  if (requireUnique && count !== 1) throw new Error(`Puzzle ${puzzle.id}: expected a unique solution.`);
}
