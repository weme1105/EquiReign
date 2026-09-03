import { createBoard, isInside, positionKey } from './board.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { countSolutions } from './solver.ts';
import { EMPTY_PUZZLE_VARIANTS, validateVariantCells, validateVariantLimits } from './variants.ts';
import type { PuzzleDefinition } from './types.ts';

export function validatePuzzle(puzzle: PuzzleDefinition, requireUnique = true): void {
  if (!Number.isInteger(puzzle.size) || puzzle.size < 4 || puzzle.size > 12) throw new Error(`Puzzle ${puzzle.id}: size must be 4..12.`);
  if (puzzle.regionMap.length !== puzzle.size * puzzle.size) throw new Error(`Puzzle ${puzzle.id}: invalid regionMap length.`);
  const regions = new Set(puzzle.regionMap);
  if (regions.size !== puzzle.size || [...regions].some((region) => !Number.isInteger(region) || region < 0 || region >= puzzle.size))
    throw new Error(`Puzzle ${puzzle.id}: region ids must be exactly 0..size-1.`);
  validateRegionConnectivity(puzzle);
  const keys = new Set<string>();
  for (const given of puzzle.givenQueens) {
    if (!isInside(puzzle.size, given) || keys.has(positionKey(given))) throw new Error(`Puzzle ${puzzle.id}: invalid given queen.`);
    keys.add(positionKey(given));
  }
  const expected = DIFFICULTIES[puzzle.difficulty].givenQueenCount;
  if (puzzle.givenQueens.length !== expected) throw new Error(`Puzzle ${puzzle.id}: ${puzzle.difficulty} requires ${expected} given queens.`);
  const variants = puzzle.variants ?? EMPTY_PUZZLE_VARIANTS;
  validateVariantCells(puzzle.size, puzzle.regionMap, variants);
  validateVariantLimits(puzzle.difficulty, puzzle.size, variants);
  const count = countSolutions(createBoard(puzzle), 2);
  if (count === 0) throw new Error(`Puzzle ${puzzle.id}: no legal solution.`);
  if (requireUnique && count !== 1) throw new Error(`Puzzle ${puzzle.id}: expected a unique solution.`);
}

function validateRegionConnectivity(puzzle: PuzzleDefinition): void {
  for (const region of new Set(puzzle.regionMap)) {
    const cells = puzzle.regionMap.reduce<number[]>((indexes, value, index) => value === region ? [...indexes, index] : indexes, []);
    const visited = new Set<number>([cells[0]!]);
    const queue = [cells[0]!];
    while (queue.length) {
      const current = queue.shift()!;
      const row = Math.floor(current / puzzle.size);
      const column = current % puzzle.size;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = row + dr; const nc = column + dc;
        if (nr < 0 || nr >= puzzle.size || nc < 0 || nc >= puzzle.size) continue;
        const next = nr * puzzle.size + nc;
        if (puzzle.regionMap[next] === region && !visited.has(next)) { visited.add(next); queue.push(next); }
      }
    }
    if (visited.size !== cells.length) throw new Error(`Puzzle ${puzzle.id}: region ${region} must be orthogonally connected.`);
  }
}
