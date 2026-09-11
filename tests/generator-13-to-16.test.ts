import test from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions } from '../src/game-core/solver.ts';
import { RegionPuzzleGenerator } from '../src/game-core/generator.ts';
import type { BoardSize } from '../src/game-core/types.ts';

test('RegionPuzzleGenerator accepts Campaign sizes 13..16', () => {
  const generator = new RegionPuzzleGenerator();
  const sizes: readonly BoardSize[] = [13, 14, 15, 16];

  for (const size of sizes) {
    const puzzle = generator.generate(size, size * 1_000_000);
    assert.equal(puzzle.size, size);
    assert.equal(puzzle.regionMap.length, size * size);
    assert.equal(puzzle.solution.length, size);
    assert.equal(
      countSolutions({
        size,
        regionMap: puzzle.regionMap,
        cells: Array.from({ length: size * size }, () => 'empty'),
      }, 2),
      1,
    );
  }
});
