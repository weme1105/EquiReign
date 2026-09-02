import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const inputDir = resolve(arg('--input-dir', 'artifacts/puzzle-candidates'));
const files = (await readdir(inputDir, { recursive: true })).filter((file) => String(file).endsWith('.jsonl'));
if (!files.length) throw new Error(`No JSONL candidate files found under ${inputDir}`);

let candidates = 0;
let invalid = 0;
let maxSingletons = 0;
const bySize = new Map<number, number>();

for (const relative of files) {
  const text = await readFile(join(inputDir, String(relative)), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    candidates += 1;
    const candidate = JSON.parse(line) as { size?: number; solution?: number[]; regionMap?: number[] };
    const size = candidate.size;
    const solution = candidate.solution;
    const regionMap = candidate.regionMap;
    if (!Number.isInteger(size) || !Array.isArray(solution) || !Array.isArray(regionMap) || solution.length !== size || regionMap.length !== size * size) {
      invalid += 1;
      continue;
    }
    const limit = Math.ceil(size * size * 0.01);
    const counts = new Map<number, number>();
    for (const region of regionMap) counts.set(region, (counts.get(region) ?? 0) + 1);
    const singletonCount = [...counts.values()].filter((count) => count === 1).length;
    maxSingletons = Math.max(maxSingletons, singletonCount);
    bySize.set(size, Math.max(bySize.get(size) ?? 0, singletonCount));
    if (singletonCount > limit) invalid += 1;
  }
}

const result = { candidates, invalid, maxSingletons, maxSingletonsBySize: Object.fromEntries([...bySize].map(([size, count]) => [size, count])), inputDir };
console.log(JSON.stringify(result, null, 2));
if (invalid > 0 || candidates === 0) process.exit(1);

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}
