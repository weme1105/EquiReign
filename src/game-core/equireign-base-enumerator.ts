import type { BoardSize } from './types.ts';
import { analyzeSolutions } from './solver.ts';
import { enumerateEquiReignRegionMaps } from './equireign-region-enumerator.ts';
import { enumerateEquiReignSolutions } from './equireign-enumerator.ts';
import { isValidEquiReignRegionMap } from './region-map.ts';

export interface EquiReignBaseEnumerationOptions {
  /** Skip this many Queen layouts before enumeration begins. */
  readonly skipSolutions?: number;
  /** Skip this many connected Region Maps globally before the uniqueness gate. */
  readonly skipRegionMaps?: number;
  /** Optional hard cap for accepted unique Base puzzles; omitted means exhaustive. */
  readonly limitUnique?: number;
}

export interface EquiReignBaseCandidate {
  readonly solution: readonly number[];
  readonly regionMap: readonly number[];
  readonly nodesVisited: number;
  readonly branchesTried: number;
  readonly backtracks: number;
  readonly memoHits: number;
}

/**
 * Research-only Base pool: every legal Queen layout -> every connected Region
 * Map rooted at those queens -> solver uniqueness gate. No product difficulty
 * filter is applied. `limitUnique` is only a traversal stop, never a validity rule.
 * `skipRegionMaps` is global so a checkpoint can resume inside a Queen layout.
 */
export function* enumerateUniqueEquiReignBasePuzzles(size: BoardSize, options: EquiReignBaseEnumerationOptions = {}): Generator<EquiReignBaseCandidate> {
  validateOptions(options);
  const solutions = enumerateEquiReignSolutions(size).solutions;
  let uniqueCount = 0;
  let regionMapsSeen = 0;
  const skipRegionMaps = options.skipRegionMaps ?? 0;

  for (let solutionIndex = options.skipSolutions ?? 0; solutionIndex < solutions.length; solutionIndex += 1) {
    const solution = solutions[solutionIndex]!;
    for (const regionMap of enumerateEquiReignRegionMaps(size, solution)) {
      if (regionMapsSeen < skipRegionMaps) {
        regionMapsSeen += 1;
        continue;
      }
      regionMapsSeen += 1;
      if (!isValidEquiReignRegionMap(size, regionMap)) throw new Error('Region enumerator emitted an invalid map.');
      const analysis = analyzeSolutions({ size, regionMap, cells: Array(size * size).fill('empty') }, 2);
      if (analysis.solutionCount !== 1) continue;
      uniqueCount += 1;
      yield {
        solution: [...solution],
        regionMap: [...regionMap],
        ...analysis.metrics,
      };
      if (options.limitUnique !== undefined && uniqueCount >= options.limitUnique) return;
    }
  }
}

function validateOptions(options: EquiReignBaseEnumerationOptions): void {
  if (options.skipSolutions !== undefined && (!Number.isInteger(options.skipSolutions) || options.skipSolutions < 0)) throw new Error('skipSolutions must be a non-negative integer when supplied.');
  if (options.skipRegionMaps !== undefined && (!Number.isInteger(options.skipRegionMaps) || options.skipRegionMaps < 0)) throw new Error('skipRegionMaps must be a non-negative integer when supplied.');
  if (options.limitUnique !== undefined && (!Number.isInteger(options.limitUnique) || options.limitUnique < 1)) throw new Error('limitUnique must be a positive integer when supplied.');
}
