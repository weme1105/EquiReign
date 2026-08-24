import type { Difficulty, SolverMetrics } from './types.ts';

export interface RankedSolverCost {
  readonly metrics: SolverMetrics;
  readonly nodePercentile: number;
  readonly branchPercentile: number;
  readonly backtrackPercentile: number;
  readonly score: number;
  readonly tier: Difficulty;
}

/** Rank only puzzles of the same board size; cross-size raw costs are not comparable. */
export function rankSolverCosts(items: readonly SolverMetrics[]): readonly RankedSolverCost[] {
  const nodeRanks = percentileRanks(items.map((item) => item.nodesVisited));
  const branchRanks = percentileRanks(items.map((item) => item.branchesTried));
  const backtrackRanks = percentileRanks(items.map((item) => item.backtracks));
  return items.map((metrics, index) => {
    const nodePercentile = nodeRanks[index]!; const branchPercentile = branchRanks[index]!; const backtrackPercentile = backtrackRanks[index]!;
    const score = nodePercentile * .5 + branchPercentile * .3 + backtrackPercentile * .2;
    return { metrics, nodePercentile, branchPercentile, backtrackPercentile, score, tier: costTier(score) };
  });
}

export function costTier(percentileScore: number): Difficulty {
  if (!Number.isFinite(percentileScore) || percentileScore < 0 || percentileScore > 100) throw new Error('Cost percentile must be 0..100.');
  if (percentileScore < 20) return 'beginner';
  if (percentileScore < 40) return 'intermediate';
  if (percentileScore < 60) return 'advanced';
  if (percentileScore < 85) return 'expert';
  return 'king';
}

function percentileRanks(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [50];
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((value) => {
    const first = sorted.indexOf(value); const last = sorted.lastIndexOf(value);
    return ((first + last) / 2) / (values.length - 1) * 100;
  });
}
