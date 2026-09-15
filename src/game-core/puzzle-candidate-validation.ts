import { analyzeSolutions, extractFirstSolution } from './solver.ts';
import type { BoardSize, BoardSnapshot, SolverMetrics } from './types.ts';

export interface PuzzleCandidateInput {
  readonly size: BoardSize;
  readonly solution: readonly number[];
  readonly regionMap: readonly number[];
}

export interface ValidatedPuzzleCandidate extends PuzzleCandidateInput {
  readonly singletonRegionCount: number;
  readonly solverMetrics: SolverMetrics;
}

export type PuzzleCandidateValidationFailure =
  | 'invalid-solution'
  | 'invalid-region-map'
  | 'singleton-limit-exceeded'
  | 'disconnected-region'
  | 'zero-solutions'
  | 'multiple-solutions'
  | 'stored-solution-mismatch';

export type PuzzleCandidateValidationResult =
  | { readonly valid: true; readonly candidate: ValidatedPuzzleCandidate }
  | { readonly valid: false; readonly reason: PuzzleCandidateValidationFailure };

/** Formal admission gate for base Region Puzzle datasets. */
export function validatePuzzleCandidate(candidate: PuzzleCandidateInput): PuzzleCandidateValidationResult {
  const { size, solution, regionMap } = candidate;
  if (solution.length !== size || solution.some((column) => !Number.isInteger(column) || column < 0 || column >= size)) {
    return { valid: false, reason: 'invalid-solution' };
  }
  if (regionMap.length !== size * size || regionMap.some((region) => !Number.isInteger(region) || region < 0 || region >= size)) {
    return { valid: false, reason: 'invalid-region-map' };
  }

  const counts = Array<number>(size).fill(0);
  for (const region of regionMap) counts[region] = counts[region]! + 1;
  if (counts.some((count) => count === 0)) return { valid: false, reason: 'invalid-region-map' };

  const singletonRegionCount = counts.filter((count) => count === 1).length;
  if (singletonRegionCount > singletonRegionLimit(size)) return { valid: false, reason: 'singleton-limit-exceeded' };
  if (!areAllRegionsConnected(regionMap, size)) return { valid: false, reason: 'disconnected-region' };

  const board: BoardSnapshot = { size, regionMap, cells: Array(size * size).fill('empty') };
  const analysis = analyzeSolutions(board, 2);
  if (analysis.solutionCount === 0) return { valid: false, reason: 'zero-solutions' };
  if (analysis.solutionCount > 1) return { valid: false, reason: 'multiple-solutions' };

  const resolved = extractFirstSolution(board);
  if (!resolved || resolved.length !== size || resolved.some(({ column }, row) => column !== solution[row])) {
    return { valid: false, reason: 'stored-solution-mismatch' };
  }

  return {
    valid: true,
    candidate: { ...candidate, singletonRegionCount, solverMetrics: analysis.metrics },
  };
}

export function singletonRegionLimit(size: number): number {
  return Math.ceil(size * size * 0.01);
}

export function areAllRegionsConnected(regionMap: readonly number[], size: number): boolean {
  for (let region = 0; region < size; region += 1) {
    const cells: number[] = [];
    for (let index = 0; index < regionMap.length; index += 1) if (regionMap[index] === region) cells.push(index);
    if (cells.length === 0) return false;

    const visited = new Set<number>([cells[0]!]);
    const queue = [cells[0]!];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor]!;
      const row = Math.floor(index / size);
      const column = index % size;
      const neighbors = [
        row > 0 ? index - size : -1,
        row + 1 < size ? index + size : -1,
        column > 0 ? index - 1 : -1,
        column + 1 < size ? index + 1 : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && regionMap[neighbor] === region && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    if (visited.size !== cells.length) return false;
  }
  return true;
}
