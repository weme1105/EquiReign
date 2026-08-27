import { analyzeSolutions, extractFirstSolution } from './solver.ts';
import type { BoardSnapshot, GeneratedPuzzle, PuzzleGenerator } from './types.ts';

export class RegionPuzzleGenerator implements PuzzleGenerator {
  generate(size: number, seed = Date.now()): GeneratedPuzzle {
    if (!Number.isInteger(size) || size < 4 || size > 12) throw new Error('Generator supports size 4..12.');
    const random = mulberry32(seed >>> 0);

    for (let attempt = 0; attempt < 200; attempt += 1) {
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
      if (verifiedSolution) return { size, regionMap, solution: verifiedSolution, solverMetrics: analysis.metrics };
    }

    throw new Error(`Unable to generate a unique ${size}x${size} puzzle.`);
  }
}

/** Generate a valid N-Queens placement first; regions are generated around it afterwards. */
function generateNQueensSolution(size: number, random: () => number): { row: number; column: number }[] | null {
  const columns = Array<number>(size).fill(-1);
  const usedColumns = new Set<number>();
  const usedDownDiagonals = new Set<number>();
  const usedUpDiagonals = new Set<number>();

  function place(row: number): boolean {
    if (row === size) return true;
    const options: number[] = [];
    for (let column = 0; column < size; column += 1) {
      if (usedColumns.has(column) || usedDownDiagonals.has(row - column) || usedUpDiagonals.has(row + column)) continue;
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

/** Partition the board into exactly N orthogonally connected regions, each containing one solution queen. */
function colorSolutionIntoConnectedRegions(
  size: number,
  solution: readonly { row: number; column: number }[],
  random: () => number,
): number[] | null {
  const regions = Array<number>(size * size).fill(-1);
  const frontier: number[][] = Array.from({ length: size }, () => []);
  const regionSizes = Array<number>(size).fill(1);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  for (let region = 0; region < size; region += 1) {
    const queen = solution[region]!;
    regions[queen.row * size + queen.column] = region;
  }

  for (let region = 0; region < size; region += 1) {
    const queen = solution[region]!;
    addFrontier(queen.row, queen.column, region);
  }

  function addFrontier(row: number, column: number, region: number): void {
    for (const [dr, dc] of directions) {
      const r = row + dr;
      const c = column + dc;
      if (r >= 0 && c >= 0 && r < size && c < size && regions[r * size + c] === -1) frontier[region]!.push(r * size + c);
    }
  }

  while (regions.includes(-1)) {
    const options: { index: number; region: number; score: number }[] = [];
    for (let region = 0; region < size; region += 1) {
      const unique = [...new Set(frontier[region]!)].filter((index) => regions[index] === -1);
      frontier[region] = unique;
      for (const index of unique) {
        const row = Math.floor(index / size);
        const column = index % size;
        const queen = solution[region]!;
        const touchesOtherRegion = directions.some(([dr, dc]) => {
          const r = row + dr;
          const c = column + dc;
          return r >= 0 && c >= 0 && r < size && c < size && regions[r * size + c] >= 0 && regions[r * size + c] !== region;
        });
        // Prefer compact regions and avoid accidental early bridges between regions.
        const score = regionSizes[region]! * 3 + Math.abs(row - queen.row) + Math.abs(column - queen.column) + (touchesOtherRegion ? 5 : 0) + random();
        options.push({ index, region, score });
      }
    }
    if (!options.length) return null;
    options.sort((a, b) => a.score - b.score);

    // Pick from the best few candidates to keep deterministic seeds varied without making generation expensive.
    const best = options.slice(0, Math.min(8, options.length));
    const selected = best[Math.floor(random() * best.length)]!;
    regions[selected.index] = selected.region;
    regionSizes[selected.region] = regionSizes[selected.region]! + 1;
    for (let region = 0; region < size; region += 1) {
      const row = Math.floor(selected.index / size);
      const column = selected.index % size;
      addFrontier(row, column, region);
    }
  }

  // Every region remains connected by construction and still contains exactly one solution queen.
  const queenCounts = Array<number>(size).fill(0);
  for (const queen of solution) queenCounts[regions[queen.row * size + queen.column]!] += 1;
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
