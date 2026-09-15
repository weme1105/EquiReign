import { analyzeSolutions, extractFirstSolution } from './solver.ts';
import type { BoardSnapshot, GeneratedPuzzle, PuzzleGenerator } from './types.ts';

const MAX_ATTEMPTS = 2_000;

/**
 * Color-first generator: create the complete connected region coloring first,
 * then fit the queen solution to that coloring.
 */
export class ColorFirstRegionPuzzleGenerator implements PuzzleGenerator {
  generate(size: number, seed = Date.now()): GeneratedPuzzle {
    if (!Number.isInteger(size) || size < 4 || size > 12) throw new Error('Generator supports size 4..12.');
    const random = mulberry32(seed >>> 0);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const regionMap = randomConnectedRegions(size, random);
      const board: BoardSnapshot = { size, regionMap, cells: Array.from({ length: size * size }, () => 'empty') };
      const analysis = analyzeSolutions(board, 2);
      if (analysis.solutionCount !== 1) continue;
      const solution = extractFirstSolution(board);
      if (solution) return { size, regionMap, solution, solverMetrics: analysis.metrics };
    }
    throw new Error(`Unable to generate a unique ${size}x${size} puzzle after ${MAX_ATTEMPTS} color-first attempts.`);
  }
}

function randomConnectedRegions(size: number, random: () => number): number[] {
  const regions = Array<number>(size * size).fill(-1);
  const frontier: number[] = [];
  const seeds = shuffle(Array.from({ length: size * size }, (_, index) => index), random).slice(0, size);

  for (let region = 0; region < size; region += 1) {
    regions[seeds[region]!] = region;
    frontier.push(seeds[region]!);
  }

  while (frontier.length > 0) {
    const frontierIndex = Math.floor(random() * frontier.length);
    const index = frontier[frontierIndex]!;
    const row = Math.floor(index / size);
    const column = index % size;
    const options: number[] = [];

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextRow = row + dr;
      const nextColumn = column + dc;
      if (nextRow >= 0 && nextColumn >= 0 && nextRow < size && nextColumn < size) {
        const next = nextRow * size + nextColumn;
        if (regions[next] === -1) options.push(next);
      }
    }

    if (options.length === 0) {
      frontier.splice(frontierIndex, 1);
      continue;
    }

    const next = options[Math.floor(random() * options.length)]!;
    regions[next] = regions[index]!;
    frontier.push(next);
  }

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

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
