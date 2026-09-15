import type { BoardSize, SolverMetrics } from './types.ts';
import type { ValidatedPuzzleCandidate } from './puzzle-candidate-validation.ts';

export interface DatasetShardSpec {
  readonly shardIndex: number;
  readonly shardCount: number;
}

export type FormalPuzzleDatasetSource = 'nqueens-seeded-growth-v1';

export interface FormalPuzzleDatasetRecord extends ValidatedPuzzleCandidate {
  readonly id: string;
  readonly source: FormalPuzzleDatasetSource;
  readonly sourceOrdinal: number;
}

export interface FormalPuzzleDatasetManifest {
  readonly schemaVersion: 1;
  readonly purpose: 'formal-region-puzzle-candidate-dataset';
  readonly coverage: 'bounded-deterministic-candidate-search';
  readonly standardSizes: readonly BoardSize[];
  readonly shard: DatasetShardSpec;
  readonly generatedRecordCount: number;
  readonly rejectedRecordCount: number;
  readonly solverMetricTotals: SolverMetrics;
}

export function assertDatasetShardSpec(spec: DatasetShardSpec): void {
  if (!Number.isInteger(spec.shardCount) || spec.shardCount < 1) throw new Error('shardCount must be a positive integer.');
  if (!Number.isInteger(spec.shardIndex) || spec.shardIndex < 0 || spec.shardIndex >= spec.shardCount) {
    throw new Error('shardIndex must be an integer in [0, shardCount).');
  }
}

/**
 * Stable sharding independent from process count and execution order.
 * The same candidate key always belongs to the same shard for a given shardCount.
 */
export function belongsToDatasetShard(key: string, spec: DatasetShardSpec): boolean {
  assertDatasetShardSpec(spec);
  return stableHash32(key) % spec.shardCount === spec.shardIndex;
}

export function puzzleCandidateKey(size: BoardSize, solution: readonly number[], regionMap: readonly number[]): string {
  return `${size}|${solution.join(',')}|${regionMap.join(',')}`;
}

export function puzzleCandidateId(size: BoardSize, solution: readonly number[], regionMap: readonly number[]): string {
  return `p${size}-${stableHash32(puzzleCandidateKey(size, solution, regionMap)).toString(16).padStart(8, '0')}`;
}

/** FNV-1a 32-bit hash, implemented with Math.imul for deterministic JS integer semantics. */
export function stableHash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
