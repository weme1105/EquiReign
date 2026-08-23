import type { Difficulty, Position, PuzzleDefinition } from '../game-core/types.ts';

interface CatalogSource { readonly size: number; readonly regionMap: readonly number[]; readonly solution: readonly Position[] }

const SOURCES: Readonly<Record<Difficulty, CatalogSource>> = {
  beginner: {
    size: 6,
    regionMap: [1,0,0,2,3,3, 1,1,0,2,3,3, 1,1,2,2,2,3, 4,2,2,3,3,3, 4,4,5,5,5,3, 4,4,4,5,5,5],
    solution: [{row:0,column:2},{row:1,column:0},{row:2,column:3},{row:3,column:5},{row:4,column:1},{row:5,column:4}],
  },
  intermediate: {
    size: 7,
    regionMap: [3,3,2,2,0,0,1, 3,2,2,2,1,1,1, 3,3,2,2,2,6,6, 3,3,2,4,4,4,6, 3,5,4,4,4,4,6, 5,5,5,4,6,4,6, 5,5,5,4,6,6,6],
    solution: [{row:0,column:4},{row:1,column:6},{row:2,column:2},{row:3,column:0},{row:4,column:3},{row:5,column:1},{row:6,column:5}],
  },
  advanced: {
    size: 8,
    regionMap: [1,1,0,0,0,0,0,0, 1,1,1,1,2,2,0,3, 1,1,2,2,2,4,3,3, 1,1,4,4,2,4,3,3, 1,1,4,4,4,4,3,3, 5,7,6,6,6,4,4,3, 5,7,7,6,6,4,4,3, 7,7,6,6,4,4,3,3],
    solution: [{row:0,column:6},{row:1,column:2},{row:2,column:4},{row:3,column:7},{row:4,column:5},{row:5,column:0},{row:6,column:3},{row:7,column:1}],
  },
  expert: {
    size: 9,
    regionMap: [3,3,3,3,0,0,0,0,1, 3,3,2,2,0,0,1,1,1, 3,3,2,2,2,0,2,6,6, 8,3,3,3,2,2,2,4,6, 8,3,5,5,4,4,4,4,6, 8,5,5,5,7,4,4,6,6, 8,5,7,7,7,7,7,7,6, 8,8,8,8,7,8,8,7,7, 8,8,8,8,8,8,8,8,7],
    solution: [{row:0,column:5},{row:1,column:7},{row:2,column:3},{row:3,column:1},{row:4,column:6},{row:5,column:2},{row:6,column:8},{row:7,column:4},{row:8,column:0}],
  },
  king: {
    size: 10,
    regionMap: [2,2,2,2,0,0,0,0,0,0, 2,2,2,2,0,0,0,1,0,1, 2,2,2,2,2,0,0,1,1,1, 2,2,2,2,2,2,2,3,3,1, 4,6,5,5,2,3,3,3,3,1, 4,6,5,5,2,3,3,3,3,1, 6,6,5,5,5,5,5,3,3,7, 6,6,8,9,9,5,5,3,7,7, 8,8,8,8,9,7,7,7,7,7, 8,8,8,9,9,9,7,7,7,7],
    solution: [{row:0,column:6},{row:1,column:9},{row:2,column:4},{row:3,column:7},{row:4,column:0},{row:5,column:3},{row:6,column:1},{row:7,column:8},{row:8,column:2},{row:9,column:5}],
  },
};

const GIVEN_INDEXES: Readonly<Record<Difficulty, readonly number[]>> = {
  beginner: [1, 4], intermediate: [3], advanced: [], expert: [], king: [],
};

export function getPuzzle(difficulty: Difficulty): PuzzleDefinition {
  const source = SOURCES[difficulty];
  return {
    id: `${difficulty}-001`,
    difficulty,
    size: source.size,
    regionMap: source.regionMap,
    givenQueens: GIVEN_INDEXES[difficulty].map((index) => source.solution[index]!),
  };
}

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert', 'king'];
