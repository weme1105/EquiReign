import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Metrics {
  readonly nodesVisited: number;
  readonly branchesTried: number;
  readonly backtracks: number;
  readonly memoHits: number;
}

interface Candidate {
  readonly id?: string;
  readonly size: number;
  readonly solution: number[];
  readonly regionMap: number[];
  readonly singletonRegionCount: number;
  readonly solverMetrics: Metrics;
}

interface RankedCandidate extends Candidate {
  readonly difficultyScore: number;
  readonly difficultyPercentile: number;
  readonly difficultyBand: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'king';
}

const input = argument('--input');
const output = argument('--output', 'puzzle-ranked.jsonl');
if (!input) throw new Error('Usage: --input <jsonl> [--output <jsonl>]');

const candidates = readFileSync(resolve(input), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line) as Candidate);

const bySize = new Map<number, Candidate[]>();
for (const candidate of candidates) {
  const group = bySize.get(candidate.size) ?? [];
  group.push(candidate);
  bySize.set(candidate.size, group);
}

const ranked: RankedCandidate[] = [];
for (const [size, group] of bySize) {
  const search = group.map((candidate) => Math.log2(1 + candidate.solverMetrics.nodesVisited));
  const branch = group.map((candidate) => Math.log2(1 + candidate.solverMetrics.branchesTried));
  const backtrack = group.map((candidate) => Math.log2(1 + candidate.solverMetrics.backtracks));
  const singleton = group.map((candidate) => candidate.singletonRegionCount);

  const searchPercentiles = percentiles(search);
  const branchPercentiles = percentiles(branch);
  const backtrackPercentiles = percentiles(backtrack);
  const singletonPercentiles = percentiles(singleton);

  group.forEach((candidate, index) => {
    const score =
      0.45 * searchPercentiles[index]! +
      0.25 * backtrackPercentiles[index]! +
      0.20 * branchPercentiles[index]! +
      0.10 * singletonPercentiles[index]!;
    const percentile = scorePercentile(score, [
      ...searchPercentiles.map((value, i) =>
        0.45 * value + 0.25 * backtrackPercentiles[i]! + 0.20 * branchPercentiles[i]! + 0.10 * singletonPercentiles[i]!),
    ]);
    ranked.push({
      ...candidate,
      difficultyScore: round(score),
      difficultyPercentile: round(percentile),
      difficultyBand: bandFor(percentile),
    });
  });

  console.log(JSON.stringify({ size, candidates: group.length, minScore: Math.min(...searchPercentiles), maxScore: Math.max(...searchPercentiles) }));
}

ranked.sort((a, b) => a.size - b.size || a.difficultyScore - b.difficultyScore || (a.id ?? '').localeCompare(b.id ?? ''));
writeFileSync(resolve(output), `${ranked.map((candidate) => JSON.stringify(candidate)).join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ ranked: ranked.length, output: resolve(output) }, null, 2));

function percentiles(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return [0.5];
  return values.map((value) => {
    let lower = 0;
    for (const other of sorted) if (other < value) lower += 1;
    let equal = 0;
    for (const other of sorted) if (other === value) equal += 1;
    return (lower + (equal - 1) / 2) / (sorted.length - 1);
  });
}

function scorePercentile(score: number, scores: readonly number[]): number {
  const sorted = [...scores].sort((a, b) => a - b);
  if (sorted.length === 1) return 0.5;
  let lower = 0;
  for (const other of sorted) if (other < score) lower += 1;
  let equal = 0;
  for (const other of sorted) if (other === score) equal += 1;
  return (lower + (equal - 1) / 2) / (sorted.length - 1);
}

function bandFor(percentile: number): RankedCandidate['difficultyBand'] {
  if (percentile < 0.20) return 'beginner';
  if (percentile < 0.45) return 'intermediate';
  if (percentile < 0.70) return 'advanced';
  if (percentile < 0.90) return 'expert';
  return 'king';
}

function round(value: number): number { return Math.round(value * 10000) / 10000; }

function argument(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}
