import type { BoardSize } from './types.ts';

export interface NQueensRegionGrowthCandidate {
  readonly size: BoardSize;
  readonly solution: readonly number[];
  readonly regionMap: readonly number[];
  readonly strategy: number;
}

/**
 * Deterministically grows one connected Region from each N-Queens position.
 *
 * This is a bounded candidate source, not an exhaustive Region Map enumerator.
 * Every assignment grows from an already-owned orthogonal neighbour, so Region
 * connectivity is preserved by construction. Different strategy numbers only
 * alter deterministic tie-breaking and balancing priorities.
 */
export function growRegionsFromNQueensSolution(
  size: BoardSize,
  solution: readonly number[],
  strategy: number,
): NQueensRegionGrowthCandidate {
  if (solution.length !== size
    || new Set(solution).size !== size
    || solution.some((column) => !Number.isInteger(column) || column < 0 || column >= size)) {
    throw new Error('solution must contain one distinct in-range column per row.');
  }
  if (!Number.isInteger(strategy) || strategy < 0) throw new Error('strategy must be a non-negative integer.');

  const regionMap = Array<number>(size * size).fill(-1);
  const regionSizes = Array<number>(size).fill(1);
  for (let region = 0; region < size; region += 1) regionMap[region * size + solution[region]!] = region;

  while (regionMap.includes(-1)) {
    const next = chooseGrowth(regionMap, regionSizes, size, solution, strategy);
    if (!next) throw new Error('Unable to grow connected regions to cover the board.');
    regionMap[next.index] = next.region;
    regionSizes[next.region] = regionSizes[next.region]! + 1;
  }

  return { size, solution: [...solution], regionMap, strategy };
}

interface GrowthChoice {
  readonly index: number;
  readonly region: number;
  readonly score: readonly [number, number, number, number];
}

function chooseGrowth(
  regionMap: readonly number[],
  regionSizes: readonly number[],
  size: number,
  solution: readonly number[],
  strategy: number,
): GrowthChoice | null {
  let best: GrowthChoice | null = null;
  for (let index = 0; index < regionMap.length; index += 1) {
    if (regionMap[index] !== -1) continue;
    const row = Math.floor(index / size);
    const column = index % size;
    const adjacent = adjacentRegions(regionMap, index, size);
    for (const region of adjacent) {
      const distance = Math.abs(row - region) + Math.abs(column - solution[region]!);
      const variation = stableMix(index, region, strategy) % (size + 3);
      const directionBias = ((strategy & 1) === 0 ? row * size + column : (size - 1 - row) * size + (size - 1 - column));
      const score = strategy % 3 === 0
        ? [regionSizes[region]!, distance, variation, directionBias] as const
        : strategy % 3 === 1
          ? [distance, regionSizes[region]!, variation, directionBias] as const
          : [variation, regionSizes[region]!, distance, directionBias] as const;
      const choice = { index, region, score } as const;
      if (!best || compareScore(choice.score, best.score) < 0) best = choice;
    }
  }
  return best;
}

function adjacentRegions(regionMap: readonly number[], index: number, size: number): readonly number[] {
  const row = Math.floor(index / size);
  const column = index % size;
  const labels = new Set<number>();
  if (row > 0 && regionMap[index - size]! >= 0) labels.add(regionMap[index - size]!);
  if (row + 1 < size && regionMap[index + size]! >= 0) labels.add(regionMap[index + size]!);
  if (column > 0 && regionMap[index - 1]! >= 0) labels.add(regionMap[index - 1]!);
  if (column + 1 < size && regionMap[index + 1]! >= 0) labels.add(regionMap[index + 1]!);
  return [...labels].sort((a, b) => a - b);
}

function compareScore(a: readonly number[], b: readonly number[]): number {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index]! !== b[index]!) return a[index]! - b[index]!;
  }
  return a.length - b.length;
}

function stableMix(index: number, region: number, strategy: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(region + 1, 0x85ebca6b) ^ Math.imul(strategy + 1, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}
