import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enumerateNQueens } from '../src/game-core/nqueens.ts';
import { growRegionsFromNQueensSolution, refineNQueensRegionCandidate } from '../src/game-core/nqueens-region-source.ts';
import { assertDatasetShardSpec, type DatasetShardSpec } from '../src/game-core/puzzle-dataset.ts';
import type { BoardSize } from '../src/game-core/types.ts';

const outputDir = resolve(arg('--output-dir', 'artifacts/formal-region-candidates'));
const strategiesPerSolution = intArg('--strategies', 8);
if (strategiesPerSolution < 1) throw new Error('--strategies must be a positive integer.');
const shard: DatasetShardSpec = {
  shardIndex: intArg('--shard-index', 0),
  shardCount: intArg('--shard-count', 1),
};
assertDatasetShardSpec(shard);

const sizes: readonly BoardSize[] = [6, 7, 8, 9, 10, 11, 12];
const records: string[] = [];
let sourceOrdinal = 0;
const bySize: Record<string, number> = {};

for (const size of sizes) {
  const { solutions } = enumerateNQueens(size);
  for (const solution of solutions) {
    for (let strategy = 0; strategy < strategiesPerSolution; strategy += 1) {
      const ordinal = sourceOrdinal;
      sourceOrdinal += 1;
      if (ordinal % shard.shardCount !== shard.shardIndex) continue;
      const grown = growRegionsFromNQueensSolution(size, solution, strategy);
      const candidate = refineNQueensRegionCandidate(grown);
      records.push(JSON.stringify({
        source: 'nqueens-seeded-growth-v1',
        sourceOrdinal: ordinal,
        nQueensSolution: solution,
        strategy,
        refinement: 'alternative-elimination-v1',
        size,
        solution: candidate.solution,
        regionMap: candidate.regionMap,
      }));
      bySize[String(size)] = (bySize[String(size)] ?? 0) + 1;
    }
  }
}

await mkdir(outputDir, { recursive: true });
const shardLabel = `${String(shard.shardIndex).padStart(4, '0')}-of-${String(shard.shardCount).padStart(4, '0')}`;
const outputPath = resolve(outputDir, `nqueens-seeded-${shardLabel}.jsonl`);
await writeFile(outputPath, records.join('\n') + (records.length ? '\n' : ''), 'utf8');
console.log(JSON.stringify({
  purpose: 'bounded-deterministic-region-candidate-source',
  source: 'nqueens-seeded-growth-v1',
  refinement: 'alternative-elimination-v1',
  coverage: 'all-standard-nqueens-solutions-times-configured-growth-strategies',
  strategiesPerSolution,
  shard,
  candidateCount: records.length,
  bySize,
  outputPath,
}, null, 2));

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

function intArg(name: string, fallback: number): number {
  const value = Number(arg(name, String(fallback)));
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  return value;
}
