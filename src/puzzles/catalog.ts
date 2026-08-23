import type { Difficulty, PuzzleDefinition } from '../game-core/types.ts';

const PUZZLES: Readonly<Record<Difficulty, PuzzleDefinition>> = {
  beginner: {
    id: 'beginner-001',
    difficulty: 'beginner',
    size: 6,
    solution: [1, 3, 5, 0, 2, 4],
    givens: [{ row: 0, column: 1 }, { row: 3, column: 0 }],
  },
  intermediate: {
    id: 'intermediate-001',
    difficulty: 'intermediate',
    size: 7,
    solution: [0, 2, 4, 6, 1, 3, 5],
    givens: [{ row: 3, column: 6 }],
  },
  advanced: {
    id: 'advanced-001',
    difficulty: 'advanced',
    size: 8,
    solution: [0, 4, 7, 5, 2, 6, 1, 3],
    givens: [],
  },
  expert: {
    id: 'expert-001',
    difficulty: 'expert',
    size: 9,
    solution: [0, 2, 5, 7, 1, 3, 8, 6, 4],
    givens: [],
  },
  king: {
    id: 'king-001',
    difficulty: 'king',
    size: 10,
    solution: [0, 2, 5, 7, 9, 4, 8, 1, 3, 6],
    givens: [],
  },
};

export function getPuzzle(difficulty: Difficulty): PuzzleDefinition {
  return PUZZLES[difficulty];
}
