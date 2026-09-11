import type { BoardSize } from './types.ts';

export interface EquiReignRegionEnumerationOptions {
  /** Stop after this many emitted maps; omitted means exhaustive. */
  readonly limit?: number;
  /** Optional deterministic starting count for audit/checkpoint consumers. */
  readonly skip?: number;
}

/**
 * Exhaustively enumerates connected Region Maps for one fixed EquiReign Queen
 * layout. Each region is rooted at exactly one target Queen, so a region can
 * never acquire a second target Queen. The expansion order is deterministic:
 * always assign the lowest-index currently reachable unassigned cell. This
 * removes assignment-order duplicates while retaining every connected map.
 */
export function* enumerateEquiReignRegionMaps(
  size: BoardSize,
  solution: readonly number[],
  options: EquiReignRegionEnumerationOptions = {},
): Generator<readonly number[]> {
  validateInputs(size, solution, options);
  const regionMap = Array<number>(size * size).fill(-1);
  const regionSizes = Array<number>(size).fill(1);
  for (let row = 0; row < size; row += 1) regionMap[row * size + solution[row]!] = row;

  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const skip = options.skip ?? 0;
  let emitted = 0;
  let skipped = 0;

  function* visit(): Generator<readonly number[]> {
    const nextIndex = chooseNextBoundaryCell(regionMap, size);
    if (nextIndex < 0) {
      if (skipped < skip) {
        skipped += 1;
        return;
      }
      if (emitted >= limit) return;
      emitted += 1;
      yield [...regionMap];
      return;
    }

    const candidates = adjacentRegions(regionMap, nextIndex, size);
    for (const region of candidates) {
      regionMap[nextIndex] = region;
      regionSizes[region] = regionSizes[region]! + 1;
      if (canStillRespectSingletonLimit(regionSizes, regionMap, size)) {
        yield* visit();
      }
      regionSizes[region] = regionSizes[region]! - 1;
      regionMap[nextIndex] = -1;
      if (emitted >= limit) return;
    }
  }

  yield* visit();
}

function chooseNextBoundaryCell(regionMap: readonly number[], size: number): number {
  for (let index = 0; index < regionMap.length; index += 1) {
    if (regionMap[index] !== -1) continue;
    const row = Math.floor(index / size);
    const column = index % size;
    if ((row > 0 && regionMap[index - size] !== -1)
      || (row + 1 < size && regionMap[index + size] !== -1)
      || (column > 0 && regionMap[index - 1] !== -1)
      || (column + 1 < size && regionMap[index + 1] !== -1)) return index;
  }
  return -1;
}

function adjacentRegions(regionMap: readonly number[], index: number, size: number): readonly number[] {
  const row = Math.floor(index / size);
  const column = index % size;
  const labels = new Set<number>();
  if (row > 0 && regionMap[index - size] !== -1) labels.add(regionMap[index - size]!);
  if (row + 1 < size && regionMap[index + size] !== -1) labels.add(regionMap[index + size]!);
  if (column > 0 && regionMap[index - 1] !== -1) labels.add(regionMap[index - 1]!);
  if (column + 1 < size && regionMap[index + 1] !== -1) labels.add(regionMap[index + 1]!);
  return [...labels].sort((a, b) => a - b);
}

function canStillRespectSingletonLimit(regionSizes: readonly number[], regionMap: readonly number[], size: number): boolean {
  const singletonLimit = Math.ceil(size * size * 0.01);
  let singletonCount = 0;
  for (let region = 0; region < size; region += 1) {
    if (regionSizes[region] === 1) {
      singletonCount += 1;
      if (singletonCount > singletonLimit) return false;
    }
  }
  // A region with size 1 can still grow only if one of its orthogonal cells is unassigned.
  // If too many rooted regions have become permanently sealed singletons, prune safely.
  for (let region = 0; region < size; region += 1) {
    if (regionSizes[region] !== 1) continue;
    const queenRow = region;
    const queenColumn = findQueenColumn(regionMap, size, region, queenRow);
    if (queenColumn < 0) return false;
    if (!hasUnassignedNeighbor(regionMap, queenRow * size + queenColumn, size)) return false;
  }
  return true;
}

function findQueenColumn(regionMap: readonly number[], size: number, region: number, fallbackRow: number): number {
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (regionMap[row * size + column] === region) return column;
    }
  }
  return fallbackRow >= 0 ? -1 : -1;
}

function hasUnassignedNeighbor(regionMap: readonly number[], index: number, size: number): boolean {
  const row = Math.floor(index / size);
  const column = index % size;
  return (row > 0 && regionMap[index - size] === -1)
    || (row + 1 < size && regionMap[index + size] === -1)
    || (column > 0 && regionMap[index - 1] === -1)
    || (column + 1 < size && regionMap[index + 1] === -1);
}

function validateInputs(size: BoardSize, solution: readonly number[], options: EquiReignRegionEnumerationOptions): void {
  if (solution.length !== size || new Set(solution).size !== size
    || solution.some((column) => !Number.isInteger(column) || column < 0 || column >= size)) {
    throw new Error('solution must contain one distinct in-range column per row.');
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('limit must be a positive integer when supplied.');
  }
  if (options.skip !== undefined && (!Number.isInteger(options.skip) || options.skip < 0)) {
    throw new Error('skip must be a non-negative integer when supplied.');
  }
}
