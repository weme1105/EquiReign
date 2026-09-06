import type { BoardSize } from './types.ts';

export interface RegionCandidate {
  readonly size: BoardSize;
  readonly regionMap: readonly number[];
}

export interface RegionEnumerationOptions {
  readonly maxCandidates: number;
  readonly singletonRegionLimit?: number;
}

/**
 * Enumerate connected region maps from a canonical growth process.
 *
 * Each region starts at one distinct anchor cell. Unassigned cells are added
 * only to an already-present orthogonal neighbour, which guarantees that every
 * completed region is connected. This is deliberately deterministic: the
 * candidate order is row-major and contains no RNG.
 *
 * This is a candidate-space primitive, not a uniqueness validator. Candidates
 * must still be checked by the game solver before entering the formal pool.
 */
export function enumerateConnectedRegionCandidates(
  size: BoardSize,
  options: RegionEnumerationOptions,
): readonly RegionCandidate[] {
  if (!Number.isInteger(options.maxCandidates) || options.maxCandidates < 1) {
    throw new Error('maxCandidates must be a positive integer.');
  }

  const totalCells = size * size;
  const singletonLimit = options.singletonRegionLimit ?? Math.ceil(totalCells * 0.01);
  const map = Array<number>(totalCells).fill(-1);
  const results: RegionCandidate[] = [];

  // Seed one anchor for each region on the main diagonal. Region labels are
  // canonical by construction; the search therefore avoids label permutations.
  for (let region = 0; region < size; region += 1) map[region * size + region] = region;

  const visit = (index: number): void => {
    if (results.length >= options.maxCandidates) return;
    if (index === totalCells) {
      if (countSingletonRegions(map, size) > singletonLimit) return;
      results.push({ size, regionMap: [...map] });
      return;
    }
    if (map[index] !== -1) {
      visit(index + 1);
      return;
    }

    const candidates = adjacentRegionLabels(map, index, size);
    for (const region of candidates) {
      map[index] = region;
      visit(index + 1);
      map[index] = -1;
      if (results.length >= options.maxCandidates) return;
    }
  };

  visit(0);
  return results;
}

function adjacentRegionLabels(map: readonly number[], index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const column = index % size;
  const labels = new Set<number>();
  if (row > 0 && map[index - size] >= 0) labels.add(map[index - size]!);
  if (row + 1 < size && map[index + size] >= 0) labels.add(map[index + size]!);
  if (column > 0 && map[index - 1] >= 0) labels.add(map[index - 1]!);
  if (column + 1 < size && map[index + 1] >= 0) labels.add(map[index + 1]!);
  return [...labels].sort((a, b) => a - b);
}

function countSingletonRegions(map: readonly number[], size: number): number {
  const counts = Array<number>(size).fill(0);
  for (const region of map) if (region >= 0 && region < size) counts[region] += 1;
  return counts.filter((count) => count === 1).length;
}
