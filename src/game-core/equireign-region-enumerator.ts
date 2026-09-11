import type { BoardSize } from './types.ts';

export interface EquiReignRegionEnumerationOptions {
  readonly limit?: number;
  readonly skip?: number;
}

/**
 * Exhaustively enumerates connected Region Maps for one fixed EquiReign Queen
 * layout. Every region is rooted at exactly one target Queen. The lowest-index
 * reachable unassigned cell is always expanded next, removing assignment-order
 * duplicates while retaining every connected map.
 */
export function* enumerateEquiReignRegionMaps(size: BoardSize, solution: readonly number[], options: EquiReignRegionEnumerationOptions = {}): Generator<readonly number[]> {
  validateInputs(size, solution, options);
  const regionMap = Array<number>(size * size).fill(-1);
  const regionSizes = Array<number>(size).fill(1);
  const roots = solution.map((column, row) => row * size + column);
  for (let region = 0; region < size; region += 1) regionMap[roots[region]!] = region;

  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const skip = options.skip ?? 0;
  let emitted = 0;
  let skipped = 0;

  function* visit(): Generator<readonly number[]> {
    if (emitted >= limit) return;
    const nextIndex = chooseNextBoundaryCell(regionMap, size);
    if (nextIndex < 0) {
      if (skipped < skip) { skipped += 1; return; }
      emitted += 1;
      yield [...regionMap];
      return;
    }
    for (const region of adjacentRegions(regionMap, nextIndex, size)) {
      regionMap[nextIndex] = region;
      regionSizes[region] = regionSizes[region]! + 1;
      if (canStillRespectSingletonLimit(regionSizes, regionMap, roots, size)) yield* visit();
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
    if ((row > 0 && regionMap[index - size] !== -1) || (row + 1 < size && regionMap[index + size] !== -1) || (column > 0 && regionMap[index - 1] !== -1) || (column + 1 < size && regionMap[index + 1] !== -1)) return index;
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

function canStillRespectSingletonLimit(regionSizes: readonly number[], regionMap: readonly number[], roots: readonly number[], size: number): boolean {
  const singletonLimit = Math.ceil(size * size * 0.01);
  let singletonCount = 0;
  for (let region = 0; region < size; region += 1) {
    if (regionSizes[region] !== 1) continue;
    singletonCount += 1;
    if (singletonCount > singletonLimit) return false;
    if (!hasUnassignedNeighbor(regionMap, roots[region]!, size) && hasUnassignedCells(regionMap)) return false;
  }
  return true;
}

function hasUnassignedCells(regionMap: readonly number[]): boolean { return regionMap.some((region) => region === -1); }

function hasUnassignedNeighbor(regionMap: readonly number[], index: number, size: number): boolean {
  const row = Math.floor(index / size);
  const column = index % size;
  return (row > 0 && regionMap[index - size] === -1) || (row + 1 < size && regionMap[index + size] === -1) || (column > 0 && regionMap[index - 1] === -1) || (column + 1 < size && regionMap[index + 1] === -1);
}

function validateInputs(size: BoardSize, solution: readonly number[], options: EquiReignRegionEnumerationOptions): void {
  if (solution.length !== size || new Set(solution).size !== size || solution.some((column) => !Number.isInteger(column) || column < 0 || column >= size)) throw new Error('solution must contain one distinct in-range column per row.');
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('limit must be a positive integer when supplied.');
  if (options.skip !== undefined && (!Number.isInteger(options.skip) || options.skip < 0)) throw new Error('skip must be a non-negative integer when supplied.');
}
