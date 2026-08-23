import type { BoardSize, Difficulty, Position, PuzzleDefinition } from '../game-core/types.ts';

interface CatalogSource { readonly size: number; readonly regionMap: readonly number[]; readonly solution: readonly Position[] }

const SOURCES: Readonly<Record<BoardSize, CatalogSource>> = {
  6: {
    size: 6,
    regionMap: [1,0,0,2,3,3, 1,1,0,2,3,3, 1,1,2,2,2,3, 4,2,2,3,3,3, 4,4,5,5,5,3, 4,4,4,5,5,5],
    solution: [{row:0,column:2},{row:1,column:0},{row:2,column:3},{row:3,column:5},{row:4,column:1},{row:5,column:4}],
  },
  7: {
    size: 7,
    regionMap: [3,3,2,2,0,0,1, 3,2,2,2,1,1,1, 3,3,2,2,2,6,6, 3,3,2,4,4,4,6, 3,5,4,4,4,4,6, 5,5,5,4,6,4,6, 5,5,5,4,6,6,6],
    solution: [{row:0,column:4},{row:1,column:6},{row:2,column:2},{row:3,column:0},{row:4,column:3},{row:5,column:1},{row:6,column:5}],
  },
  8: {
    size: 8,
    regionMap: [1,1,0,0,0,0,0,0, 1,1,1,1,2,2,0,3, 1,1,2,2,2,4,3,3, 1,1,4,4,2,4,3,3, 1,1,4,4,4,4,3,3, 5,7,6,6,6,4,4,3, 5,7,7,6,6,4,4,3, 7,7,6,6,4,4,3,3],
    solution: [{row:0,column:6},{row:1,column:2},{row:2,column:4},{row:3,column:7},{row:4,column:5},{row:5,column:0},{row:6,column:3},{row:7,column:1}],
  },
  9: {
    size: 9,
    regionMap: [3,3,3,3,0,0,0,0,1, 3,3,2,2,0,0,1,1,1, 3,3,2,2,2,0,2,6,6, 8,3,3,3,2,2,2,4,6, 8,3,5,5,4,4,4,4,6, 8,5,5,5,7,4,4,6,6, 8,5,7,7,7,7,7,7,6, 8,8,8,8,7,8,8,7,7, 8,8,8,8,8,8,8,8,7],
    solution: [{row:0,column:5},{row:1,column:7},{row:2,column:3},{row:3,column:1},{row:4,column:6},{row:5,column:2},{row:6,column:8},{row:7,column:4},{row:8,column:0}],
  },
  10: {
    size: 10,
    regionMap: [2,2,2,2,0,0,0,0,0,0, 2,2,2,2,0,0,0,1,0,1, 2,2,2,2,2,0,0,1,1,1, 2,2,2,2,2,2,2,3,3,1, 4,6,5,5,2,3,3,3,3,1, 4,6,5,5,2,3,3,3,3,1, 6,6,5,5,5,5,5,3,3,7, 6,6,8,9,9,5,5,3,7,7, 8,8,8,8,9,7,7,7,7,7, 8,8,8,9,9,9,7,7,7,7],
    solution: [{row:0,column:6},{row:1,column:9},{row:2,column:4},{row:3,column:7},{row:4,column:0},{row:5,column:3},{row:6,column:1},{row:7,column:8},{row:8,column:2},{row:9,column:5}],
  },
  11: {
    size: 11,
    regionMap: [0,0,0,0,1,1,1,1,3,3,4, 0,0,2,2,1,1,1,3,3,3,4, 0,0,0,2,2,1,1,3,3,3,4, 5,5,3,3,3,3,3,3,3,4,4, 5,5,3,3,3,3,5,5,3,4,4, 5,5,5,5,5,5,5,5,3,4,4, 6,7,7,7,5,7,5,5,5,5,4, 6,6,7,7,7,7,7,5,10,5,4, 6,6,6,7,7,7,8,10,10,4,4, 9,9,6,8,8,8,8,8,10,4,10, 9,9,9,9,9,8,8,10,10,10,10],
    solution: [{row:0,column:2},{row:1,column:5},{row:2,column:3},{row:3,column:8},{row:4,column:10},{row:5,column:7},{row:6,column:0},{row:7,column:4},{row:8,column:6},{row:9,column:1},{row:10,column:9}],
  },
  12: {
    size: 12,
    regionMap: [0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,1,1,1,0,0,0,0,0, 7,3,2,2,2,2,1,1,1,1,0,0, 7,3,3,3,2,4,4,1,1,1,0,0, 7,5,3,4,4,4,4,6,1,1,0,0, 7,5,3,4,4,4,6,6,1,1,1,0, 7,5,5,5,5,4,6,6,6,8,1,1, 7,7,7,4,4,4,6,6,6,8,1,1, 7,7,7,9,9,9,9,9,8,8,8,1, 7,7,11,9,11,9,9,9,10,10,10,1, 7,11,11,11,11,9,9,9,10,1,10,1, 11,11,11,11,11,11,9,9,10,1,1,1],
    solution: [{row:0,column:11},{row:1,column:6},{row:2,column:4},{row:3,column:2},{row:4,column:5},{row:5,column:1},{row:6,column:8},{row:7,column:0},{row:8,column:9},{row:9,column:7},{row:10,column:10},{row:11,column:3}],
  },
};

function givenIndexes(difficulty: Difficulty, size: BoardSize): readonly number[] {
  if (difficulty === 'beginner') return [1, size - 2];
  if (difficulty === 'intermediate') return [Math.floor(size / 2)];
  return [];
}

export function getPuzzle(difficulty: Difficulty, size: BoardSize = 8): PuzzleDefinition {
  const source = SOURCES[size];
  return {
    id: `${size}x${size}-${difficulty}-001`,
    difficulty,
    size: source.size,
    regionMap: source.regionMap,
    givenQueens: givenIndexes(difficulty, size).map((index) => source.solution[index]!),
  };
}

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert', 'king'];
export const BOARD_SIZES: readonly BoardSize[] = [6, 7, 8, 9, 10, 11, 12];
