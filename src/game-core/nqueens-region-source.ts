import { areAllRegionsConnected, singletonRegionLimit } from './puzzle-candidate-validation.ts';
import { countSolutions, extractFirstSolution } from './solver.ts';
import type { BoardSize, BoardSnapshot, Position } from './types.ts';

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
  validateInputs(size, solution, strategy);
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

/**
 * Deterministically refines boundaries by repeatedly eliminating a concrete
 * non-target solution while preserving the seeded target solution.
 *
 * A moved cell is never a target Queen seed. Each accepted move changes the
 * Region of a Queen used by the current alternative solution, so that exact
 * alternative becomes invalid. Connectivity and singleton limits are checked
 * after every move. The search is bounded and may still return a multi-solution
 * candidate; the formal validator remains the final admission gate.
 */
export function refineNQueensRegionCandidate(
  candidate: NQueensRegionGrowthCandidate,
  maxMoves = candidate.size * candidate.size * 2,
): NQueensRegionGrowthCandidate {
  const { size, solution, strategy } = candidate;
  validateInputs(size, solution, strategy);
  if (!Number.isInteger(maxMoves) || maxMoves < 0) throw new Error('maxMoves must be a non-negative integer.');

  let regionMap = [...candidate.regionMap];
  const seedIndexes = new Set(solution.map((column, row) => row * size + column));
  const seen = new Set<string>([regionMap.join(',')]);

  for (let move = 0; move < maxMoves; move += 1) {
    const board = emptyBoard(size, regionMap);
    if (countSolutions(board, 2) <= 1) break;
    const alternative = findAlternativeSolution(board, solution);
    if (!alternative) break;

    const mutations: { index: number; region: number; order: number }[] = [];
    for (const position of alternative) {
      const index = position.row * size + position.column;
      if (seedIndexes.has(index)) continue;
      const currentRegion = regionMap[index]!;
      for (const region of adjacentRegions(regionMap, index, size)) {
        if (region === currentRegion) continue;
        mutations.push({ index, region, order: stableMix(index, region, strategy + move * 131) });
      }
    }
    mutations.sort((a, b) => a.order - b.order || a.index - b.index || a.region - b.region);

    let accepted: number[] | null = null;
    for (const mutation of mutations) {
      const next = [...regionMap];
      next[mutation.index] = mutation.region;
      const key = next.join(',');
      if (seen.has(key)) continue;
      if (countSingletons(next, size) > singletonRegionLimit(size)) continue;
      if (!areAllRegionsConnected(next, size)) continue;
      accepted = next;
      seen.add(key);
      break;
    }
    if (!accepted) break;
    regionMap = accepted;
  }

  return { ...candidate, regionMap };
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

function findAlternativeSolution(board: BoardSnapshot, target: readonly number[]): readonly Position[] | null {
  for (let row = 0; row < board.size; row += 1) {
    const cells = [...board.cells];
    cells[row * board.size + target[row]!] = 'excluded';
    const alternative = extractFirstSolution({ ...board, cells });
    if (alternative) return alternative;
  }
  return null;
}

function emptyBoard(size: number, regionMap: readonly number[]): BoardSnapshot {
  return { size, regionMap, cells: Array.from({ length: size * size }, () => 'empty') };
}

function countSingletons(regionMap: readonly number[], size: number): number {
  const counts = Array<number>(size).fill(0);
  for (const region of regionMap) counts[region] = counts[region]! + 1;
  return counts.filter((count) => count === 1).length;
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

function validateInputs(size: number, solution: readonly number[], strategy: number): void {
  if (solution.length !== size
    || new Set(solution).size !== size
    || solution.some((column) => !Number.isInteger(column) || column < 0 || column >= size)) {
    throw new Error('solution must contain one distinct in-range column per row.');
  }
  if (!Number.isInteger(strategy) || strategy < 0) throw new Error('strategy must be a non-negative integer.');
}

function stableMix(index: number, region: number, strategy: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(region + 1, 0x85ebca6b) ^ Math.imul(strategy + 1, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}
