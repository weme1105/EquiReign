import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { rankSolverCosts } from '../src/game-core/complexity.ts';
import type { FormalPuzzleDatasetRecord } from '../src/game-core/puzzle-dataset.ts';

interface RankedFormalPuzzleDatasetRecord extends FormalPuzzleDatasetRecord {
  readonly globalDifficultyScore: number;
  readonly globalDifficultyTier: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'king';
  readonly nodePercentile: number;
  readonly branchPercentile: number;
  readonly backtrackPercentile: number;
}

const inputDir = resolve(arg('--input-dir', 'artifacts/formal-puzzle-dataset'));
const outputDir = resolve(arg('--output-dir', 'artifacts/formal-puzzle-ranked'));
const files = (await readdir(inputDir, { recursive: true }))
  .map(String)
  .filter((file) => file.startsWith('validated-') && file.endsWith('.jsonl'))
  .sort();
if (files.length === 0) throw new Error(`No validated JSONL shards found under ${inputDir}`);

const records: FormalPuzzleDatasetRecord[] = [];
const seenIds = new Set<string>();
for (const relative of files) {
  const text = await readFile(join(inputDir, relative), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as FormalPuzzleDatasetRecord;
    if (!record.id || seenIds.has(record.id)) continue;
    seenIds.add(record.id);
    records.push(record);
  }
}
if (records.length === 0) throw new Error('Validated dataset is empty.');

const rankedCosts = rankSolverCosts(records.map((record) => record.solverMetrics));
const ranked: RankedFormalPuzzleDatasetRecord[] = records.map((record, index) => {
  const cost = rankedCosts[index]!;
  return {
    ...record,
    globalDifficultyScore: cost.score,
    globalDifficultyTier: cost.tier,
    nodePercentile: cost.nodePercentile,
    branchPercentile: cost.branchPercentile,
    backtrackPercentile: cost.backtrackPercentile,
  };
});
ranked.sort((a, b) => a.globalDifficultyScore - b.globalDifficultyScore || a.id.localeCompare(b.id));

const byTier = { beginner: 0, intermediate: 0, advanced: 0, expert: 0, king: 0 };
const bySize: Record<string, number> = {};
for (const record of ranked) {
  byTier[record.globalDifficultyTier] += 1;
  bySize[String(record.size)] = (bySize[String(record.size)] ?? 0) + 1;
}

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'global-ranked-6-12.jsonl'), `${ranked.map((record) => JSON.stringify(record)).join('\n')}\n`);
await writeFile(join(outputDir, 'global-ranked-6-12.manifest.json'), `${JSON.stringify({
  schemaVersion: 1,
  purpose: 'global-solver-cost-ranked-formal-puzzle-dataset',
  rankingScope: 'combined-standard-sizes-6-through-12',
  recordCount: ranked.length,
  byTier,
  bySize,
}, null, 2)}\n`);
console.log(JSON.stringify({ recordCount: ranked.length, byTier, bySize }, null, 2));

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}
