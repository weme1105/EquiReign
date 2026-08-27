import { analyzeSolutions, extractFirstSolution } from './solver.ts';
import type { BoardSnapshot, GeneratedPuzzle, PuzzleGenerator } from './types.ts';

export class RegionPuzzleGenerator implements PuzzleGenerator {
  generate(size: number, seed = Date.now()): GeneratedPuzzle {
    if (!Number.isInteger(size) || size < 4 || size > 12) throw new Error('Generator supports size 4..12.');
    const random = mulberry32(seed >>> 0);

    // The expensive solver is only used after a complete candidate has been built.
    // Generation itself starts from a valid N-Queens solution and grows connected
    // regions around those fixed queen seeds.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const solution = generateNQueensSolution(size, random);
      if (!solution) continue;

      const regionMap = colorSolutionIntoConnectedRegions(size, solution, random);
      if (!regionMap) continue;

      const board: BoardSnapshot = {
        size,
        regionMap,
        cells: Array.from({ length: size * size }, () => 'empty'),
      };
      const analysis = analyzeSolutions(board, 2);
      if (analysis.solutionCount !== 1) continue;
      const verifiedSolution = extractFirstSolution(board);
      if (verifiedSolution) {
        return {
          size,
          regionMap,
          solution: verifiedSolution,
          solverMetrics: analysis.metrics,
        };
      }
    }

    throw new Error(`Unable to generate a unique ${size}x${size} puzzle.`);
  }
}

/** Generate the queen placement first. Every generated region must contain exactly one seed queen. */
function generateNQueensSolution(
  size: number,
  random: () => number,
): { row: number; column: number }[] | null {
  const columns = Array<number>(size).fill(-1);
  const usedColumns = new Set<number>();
  const usedDownDiagonals = new Set<number>();
  const usedUpDiagonals = new Set<number>();

  function place(row: number): boolean {
    if (row === size) return true;

    const options: number[] = [];
    for (let column = 0; column < size; column += 1) {
      if (
        usedColumns.has(column)
        || usedDownDiagonals.has(row - column)
        || usedUpDiagonals.has(row + column)
      ) continue;
      options.push(column);
    }
    shuffleInPlace(options, random);

    for (const column of options) {
      columns[row] = column;
      usedColumns.add(column);
      usedDownDiagonals.add(row - column);
      usedUpDiagonals.add(row + column);
      if (place(row + 1)) return true;
      usedColumns.delete(column);
      usedDownDiagonals.delete(row - column);
      usedUpDiagonals.delete(row + column);
      columns[row] = -1;
    }
    return false;
  }

  return place(0) ? columns.map((column, row) => ({ row, column })) : null;
}

/**
 * Partition the board from the solution queens outward.
 *
 * Each region starts at exactly one solution queen and only claims cells adjacent
 * to that region. This makes connectivity a construction invariant instead of a
 * property that must be repaired afterwards.
 */
function colorSolutionIntoConnectedRegions(
  size: number,
  solution: readonly { row: number; column: number }[],
  random: () => number,
): number[] | null {
  const total = size * size;
  const regions = Array<number>(total).fill(-1);
  const frontiers = Array.from({ length: size }, () => new Set<number>());
  const regionSizes = Array<number>(size).fill(1);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  for (let region = 0; region < size; region += 1) {
    const queen = solution[region]!;
    regions[queen.row * size + queen.column] = region;
  }

  function addFrontier(index: number, region: number): void {
    const row = Math.floor(index / size);
    const column = index % size;
    for (const [dr, dc] of directions) {
      const r = row + dr;
      const c = column + dc;
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      const next = r * size + c;
      if (regions[next] === -1) frontiers[region]!.add(next);
    }
  }

  for (let region = 0; region < size; region += 1) {
    const queen = solution[region]!;
    addFrontier(queen.row * size + queen.column, region);
  }

  while (regions.includes(-1)) {
    const candidates: { index: number; region: number; score: number }[] = [];

    for (let region = 0; region < size; region += 1) {
      const frontier = frontiers[region]!;
      for (const index of frontier) {
        if (regions[index] !== -1) {
          frontier.delete(index);
          continue;
        }

        const row = Math.floor(index / size);
        const column = index % size;
        const queen = solution[region]!;
        let neighbouringRegions = 0;
        for (const [dr, dc] of directions) {
          const r = row + dr;
          const c = column + dc;
          if (r >= 0 && c >= 0 && r < size && c < size && regions[r * size + c]! >= 0) {
            neighbouringRegions += 1;
          }
        }

        // Prefer compact growth while giving cells touching multiple regions a
        // small penalty. The random term creates varied, deterministic topologies.
        const distance = Math.abs(row - queen.row) + Math.abs(column - queen.column);
        const score = regionSizes[region]! * 0.35 + distance * 0.1 + neighbouringRegions * 0.8 + random() * 0.5;
        candidates.push({ index, region, score });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.score - b.score);

    // Choosing among the best candidates avoids a deterministic Voronoi pattern
    // while keeping the expansion inexpensive.
    const sampleSize = Math.min(12, candidates.length);
    const selected = candidates[Math.floor(random() * sampleSize)]!;
    regions[selected.index] = selected.region;
    frontiers[selected.region]!.delete(selected.index);
    regionSizes[selected.region] = regionSizes[selected.region]! + 1;
    addFrontier(selected.index, selected.region);
  }

  const queenCounts = Array<number>(size).fill(0);
  for (const queen of solution) {
    const region = regions[queen.row * size + queen.column]!;
    queenCounts[region]! += 1;
  }
  if (queenCounts.some((count) => count !== 1)) return null;
  return regions;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
}
