import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

import { countSolutions, analyzeSolutions } from '../src/game-core/solver.ts';

type Candidate = { id: string; size: number; solution: number[]; regionMap: number[] };

type Result = Candidate & { solutionCount: number; metrics: ReturnType<typeof analyzeSolutions> };

const args = process.argv.slice(2);
const input = args[args.indexOf('--input') + 1];
const output = args[args.indexOf('--output') + 1] ?? 'puzzle-analysis.jsonl';
if (!input) throw new Error('Usage: --input <jsonl-or-glob> [--output <jsonl>]');

const files = globSync(input, { nodir: true }).sort();
if (!files.length) throw new Error(`No input files matched: ${input}`);

const out: string[] = [];
let candidates = 0, unique = 0, unsolved = 0, multiple = 0;
const started = performance.now();

for (const file of files) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const candidate = JSON.parse(line) as Candidate;
    candidates++;
    const solutionCount = countSolutions(candidate.regionMap, candidate.size);
    const metrics = analyzeSolutions(candidate.regionMap, candidate.size);
    if (solutionCount === 0) unsolved++;
    else if (solutionCount === 1) unique++;
    else multiple++;
    out.push(JSON.stringify({ ...candidate, solutionCount, metrics } satisfies Result));
  }
}

writeFileSync(output, `${out.join('\n')}\n`);
const elapsed = (performance.now() - started) / 1000;
const summary = {
  candidates, unique, unsolved, multiple,
  uniqueRate: candidates ? unique / candidates : 0,
  elapsedSeconds: elapsed,
  candidatesPerSecond: elapsed ? candidates / elapsed : 0,
  inputFiles: files.length,
};
writeFileSync(`${output}.summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
