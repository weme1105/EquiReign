import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validatePuzzleCandidate } from '../src/game-core/puzzle-candidate-validation.ts';
import { assertDatasetShardSpec, belongsToDatasetShard, puzzleCandidateId, puzzleCandidateKey, type DatasetShardSpec, type FormalPuzzleDatasetManifest, type FormalPuzzleDatasetRecord } from '../src/game-core/puzzle-dataset.ts';
import type { BoardSize, SolverMetrics } from '../src/game-core/types.ts';

interface CandidateEnvelope {
  readonly source?: string;
  readonly sourceOrdinal?: number;
  readonly size?: number;
  readonly solution?: number[];
  readonly regionMap?: number[];
}

const inputDir = resolve(arg('--input-dir', 'artifacts/formal-region-candidates'));
const outputDir = resolve(arg('--output-dir', 'artifacts/formal-puzzle-dataset'));
const shard: DatasetShardSpec = {
  shardIndex: intArg('--shard-index', 0),
  shardCount: intArg('--shard-count', 1),
};
assertDatasetShardSpec(shard);

const files = (await readdir(inputDir, { recursive: true }))
  .map(String)
  .filter((file) => file.endsWith('.jsonl'))
  .sort();
if (files.length === 0) throw new Error(`No JSONL candidate files found under ${inputDir}`);

const accepted: FormalPuzzleDatasetRecord[] = [];
const seen = new Set<string>();
let rejectedRecordCount = 0;
const solverMetricTotals: SolverMetrics = { nodesVisited: 0, branchesTried: 0, backtracks: 0, memoHits: 0 };

for (const relative of files) {
  const text = await readFile(join(inputDir, relative), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as CandidateEnvelope;
    if (parsed.source !== 'canonical-diagonal-growth-v1'
      || !Number.isInteger(parsed.sourceOrdinal)
      || !isBoardSize(parsed.size)
      || !Array.isArray(parsed.solution)
      || !Array.isArray(parsed.regionMap)) {
      rejectedRecordCount += 1;
      continue;
    }

    const key = puzzleCandidateKey(parsed.size, parsed.solution, parsed.regionMap);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!belongsToDatasetShard(key, shard)) continue;

    const validation = validatePuzzleCandidate({ size: parsed.size, solution: parsed.solution, regionMap: parsed.regionMap });
    if (!validation.valid) {
      rejectedRecordCount += 1;
      continue;
    }

    const record: FormalPuzzleDatasetRecord = {
      ...validation.candidate,
      id: puzzleCandidateId(parsed.size, parsed.solution, parsed.regionMap),
      source: 'canonical-diagonal-growth-v1',
      sourceOrdinal: parsed.sourceOrdinal!,
    };
    accepted.push(record);
    solverMetricTotals.nodesVisited += record.solverMetrics.nodesVisited;
    solverMetricTotals.branchesTried += record.solverMetrics.branchesTried;
    solverMetricTotals.backtracks += record.solverMetrics.backtracks;
    solverMetricTotals.memoHits += record.solverMetrics.memoHits;
  }
}

accepted.sort((a, b) => a.size - b.size || a.sourceOrdinal - b.sourceOrdinal || a.id.localeCompare(b.id));
await mkdir(outputDir, { recursive: true });
const shardLabel = `${String(shard.shardIndex).padStart(4, '0')}-of-${String(shard.shardCount).padStart(4, '0')}`;
await writeFile(join(outputDir, `validated-${shardLabel}.jsonl`), accepted.map((record) => JSON.stringify(record)).join('\n') + (accepted.length ? '\n' : ''));

const manifest: FormalPuzzleDatasetManifest = {
  schemaVersion: 1,
  purpose: 'formal-region-puzzle-candidate-dataset',
  coverage: 'bounded-deterministic-candidate-search',
  standardSizes: [6, 7, 8, 9, 10, 11, 12],
  shard,
  generatedRecordCount: accepted.length,
  rejectedRecordCount,
  solverMetricTotals,
};
await writeFile(join(outputDir, `manifest-${shardLabel}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

function isBoardSize(value: number | undefined): value is BoardSize {
  return value === 6 || value === 7 || value === 8 || value === 9 || value === 10 || value === 11 || value === 12;
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

function intArg(name: string, fallback: number): number {
  const value = Number(arg(name, String(fallback)));
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  return value;
}
