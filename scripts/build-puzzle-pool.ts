import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { rankPuzzlePool, type PuzzlePoolCandidate } from '../src/game-core/levels.ts';
import type { BoardSize } from '../src/game-core/types.ts';
import { RegionPuzzleGenerator } from '../src/game-core/generator.ts';

const sizes: readonly BoardSize[] = [6, 7, 8, 9, 10, 11, 12];
const targetPerSize = positiveInteger(process.argv[2] ?? '30', 'targetPerSize');
const outputPath = resolve(process.argv[3] ?? 'src/puzzles/generated-pool.json');
const generator = new RegionPuzzleGenerator();
const candidates: PuzzlePoolCandidate[] = [];

for (const size of sizes) {
  const hashes = new Set<string>();
  const firstSeed = size * 1_000_000;
  const maximumSeeds = targetPerSize * 500;
  for (let seed = firstSeed; hashes.size < targetPerSize && seed < firstSeed + maximumSeeds; seed += 1) {
    try {
      const generated = generator.generate(size, seed);
      const hash = generated.regionMap.join(',');
      if (hashes.has(hash)) continue;
      hashes.add(hash);
      candidates.push({
        id: `${size}x${size}-seed-${seed}`,
        size,
        regionMap: generated.regionMap,
        solution: generated.solution,
        solverMetrics: generated.solverMetrics,
      });
      process.stdout.write(`\r${size}x${size}: ${hashes.size}/${targetPerSize}`);
    } catch { /* A failed deterministic seed is skipped. */ }
  }
  process.stdout.write('\n');
  if (hashes.size < targetPerSize) {
    throw new Error(`Only generated ${hashes.size}/${targetPerSize} unique ${size}x${size} puzzles after ${maximumSeeds} seeds.`);
  }
}

const ranked = rankPuzzlePool(candidates);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), puzzles: ranked }, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${ranked.length} puzzles to ${outputPath}\n`);

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
