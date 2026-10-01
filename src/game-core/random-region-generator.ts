import { analyzeSolutions, extractFirstSolution } from './solver.ts';
import type { GeneratedPuzzle } from './types.ts';

interface FrontierCell {
  readonly index: number;
  readonly region: number;
}

/**
 * Generates region layouts without looking at a solution.
 * Regions are grown from random seeds until every cell is assigned.
 */
export class RandomRegionPuzzleGenerator {
  generate(size: number, seed = Date.now()): GeneratedPuzzle {
    if (!Number.isInteger(size) || size < 4 || size > 12) {
      throw new Error('Generator supports size 4..12.');
    }

    const random = mulberry32(seed >>> 0);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const regionMap = randomRegionMap(size, random);
      if (!regionMap || !passesCheapChecks(size, regionMap)) continue;

      const board = {
        size,
        regionMap,
        cells: Array.from({ length: size * size }, () => 'empty' as const),
      };
      const analysis = analyzeSolutions(board, 2);
      if (analysis.solutionCount !== 1) continue;

      const solution = extractFirstSolution(board);
      if (solution) return { size, regionMap, solution, solverMetrics: analysis.metrics };
    }

    throw new Error(`Unable to generate a unique random ${size}x${size} puzzle.`);
  }
}

/**
 * Region labels are identities, not colors. Relabeling a layout must not create
 * another puzzle candidate, so the first-seen label is normalized to 0, 1, 2...
 */
export function canonicalizeRegionMap(regionMap: readonly number[]): number[] {
  const labels = new Map<number, number>();
  let nextLabel = 0;
  return regionMap.map((label) => {
    let canonical = labels.get(label);
    if (canonical === undefined) {
      canonical = nextLabel;
      labels.set(label, canonical);
      nextLabel += 1;
    }
    return canonical;
  });
}

function randomRegionMap(size: number, random: () => number): number[] | null {
  const total = size * size;
  const regions = Array<number>(total).fill(-1);
  const seeds = shuffle(Array.from({ length: total }, (_, index) => index), random).slice(0, size);
  const frontier: FrontierCell[] = [];

  seeds.forEach((index, region) => {
    regions[index] = region;
    addFrontier(index, region, size, regions, frontier);
  });

  while (frontier.length) {
    const choiceIndex = Math.floor(random() * frontier.length);
    const [choice] = frontier.splice(choiceIndex, 1);
    if (!choice || regions[choice.index] !== -1) continue;
    regions[choice.index] = choice.region;
    addFrontier(choice.index, choice.region, size, regions, frontier);
  }

  return regions.every((region) => region >= 0) ? canonicalizeRegionMap(regions) : null;
}

function addFrontier(index: number, region: number, size: number, regions: readonly number[], frontier: FrontierCell[]): void {
  const row = Math.floor(index / size);
  const column = index % size;
  for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nextRow = row + dr;
    const nextColumn = column + dc;
    if (nextRow < 0 || nextColumn < 0 || nextRow >= size || nextColumn >= size) continue;
    const nextIndex = nextRow * size + nextColumn;
    if (regions[nextIndex] === -1) frontier.push({ index: nextIndex, region });
  }
}

function passesCheapChecks(size: number, regionMap: readonly number[]): boolean {
  const counts = Array<number>(size).fill(0);
  for (const region of regionMap) {
    if (!Number.isInteger(region) || region < 0 || region >= size) return false;
    counts[region] = (counts[region] ?? 0) + 1;
  }
  return counts.every((count) => count > 0);
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
