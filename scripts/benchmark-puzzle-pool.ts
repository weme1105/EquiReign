import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { rankPuzzlePool, type PuzzlePoolCandidate } from '../src/game-core/levels.ts';
import type { BoardSize } from '../src/game-core/types.ts';
import { RegionPuzzleGenerator } from '../src/game-core/generator.ts';

const sizes: readonly BoardSize[] = [6, 7, 8, 9, 10, 11, 12];
const targetPerSize = positiveInteger(arg('--target-per-size', '100'), 'target-per-size');
const maxSeedsPerPuzzle = positiveInteger(arg('--max-seeds-per-puzzle', '500'), 'max-seeds-per-puzzle');
const outputPath = resolve(arg('--output', 'src/puzzles/generated-pool.json'));
const reportPath = resolve(arg('--report', 'src/puzzles/pool-benchmark.json'));
const generator = new RegionPuzzleGenerator();
const candidates: PuzzlePoolCandidate[] = [];
const sizeStats: SizeBenchmark[] = [];
const startedAt = performance.now();

for (const size of sizes) {
  const sizeStartedAt = performance.now();
  const hashes = new Set<string>();
  const firstSeed = size * 1_000_000;
  const maximumSeeds = targetPerSize * maxSeedsPerPuzzle;
  let attemptedSeeds = 0;
  let failedGenerations = 0;
  let duplicatePuzzles = 0;
  let generationMs = 0;

  for (let seed = firstSeed; hashes.size < targetPerSize && seed < firstSeed + maximumSeeds; seed += 1) {
    attemptedSeeds += 1;
    const attemptStartedAt = performance.now();
    try {
      const generated = generator.generate(size, seed);
      generationMs += performance.now() - attemptStartedAt;
      const hash = generated.regionMap.join(',');
      if (hashes.has(hash)) {
        duplicatePuzzles += 1;
        continue;
      }
      hashes.add(hash);
      candidates.push({
        id: `${size}x${size}-seed-${seed}`,
        size,
        regionMap: generated.regionMap,
        solution: generated.solution,
        solverMetrics: generated.solverMetrics,
      });
      process.stdout.write(`\r${size}x${size}: ${hashes.size}/${targetPerSize} | attempts ${attemptedSeeds}`);
    } catch {
      generationMs += performance.now() - attemptStartedAt;
      failedGenerations += 1;
    }
  }
  process.stdout.write('\n');

  const elapsedMs = performance.now() - sizeStartedAt;
  if (hashes.size < targetPerSize) {
    throw new Error(`Only generated ${hashes.size}/${targetPerSize} unique ${size}x${size} puzzles after ${attemptedSeeds} seeds.`);
  }

  sizeStats.push({
    size,
    target: targetPerSize,
    uniqueGenerated: hashes.size,
    attemptedSeeds,
    failedGenerations,
    duplicatePuzzles,
    successRate: hashes.size / attemptedSeeds,
    averageGenerationMs: generationMs / Math.max(1, attemptedSeeds),
    elapsedMs,
  });
}

const ranked = rankPuzzlePool(candidates);
const difficultyCounts = Object.fromEntries(
  sizes.map((size) => [size, countDifficulties(ranked.filter((puzzle) => puzzle.size === size))]),
);
const totalElapsedMs = performance.now() - startedAt;
const report: BenchmarkReport = {
  version: 1,
  generatedAt: new Date().toISOString(),
  targetPerSize,
  totalPuzzles: ranked.length,
  totalElapsedMs,
  puzzlesPerSecond: ranked.length / (totalElapsedMs / 1000),
  sizes: sizeStats,
  difficultyCounts,
};

await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ version: 1, generatedAt: report.generatedAt, puzzles: ranked }, null, 2)}\n`, 'utf8');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

process.stdout.write(`Generated ${ranked.length} unique puzzles in ${(totalElapsedMs / 1000).toFixed(2)}s (${report.puzzlesPerSecond.toFixed(2)} puzzles/s).\n`);
process.stdout.write(`Pool: ${outputPath}\nReport: ${reportPath}\n`);

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function countDifficulties(items: readonly { costTier: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.costTier] = (counts[item.costTier] ?? 0) + 1;
  return counts;
}

interface SizeBenchmark {
  readonly size: BoardSize;
  readonly target: number;
  readonly uniqueGenerated: number;
  readonly attemptedSeeds: number;
  readonly failedGenerations: number;
  readonly duplicatePuzzles: number;
  readonly successRate: number;
  readonly averageGenerationMs: number;
  readonly elapsedMs: number;
}

interface BenchmarkReport {
  readonly version: 1;
  readonly generatedAt: string;
  readonly targetPerSize: number;
  readonly totalPuzzles: number;
  readonly totalElapsedMs: number;
  readonly puzzlesPerSecond: number;
  readonly sizes: readonly SizeBenchmark[];
  readonly difficultyCounts: Record<string, Record<string, number>>;
}
