import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { countSolutions, analyzeSolutions } from '../src/game-core/solver.ts';
import type { BoardSnapshot } from '../src/game-core/types.ts';

type Candidate = { id: string; size: number; solution: number[]; regionMap: number[] };

function findJsonlFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...findJsonlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) result.push(path);
  }
  return result.sort();
}

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const outputIndex = args.indexOf('--output');
const input = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
const output = outputIndex >= 0 ? args[outputIndex + 1] ?? 'puzzle-analysis.jsonl' : 'puzzle-analysis.jsonl';
if (!input) throw new Error('Usage: --input <directory> [--output <jsonl>]');

const files = findJsonlFiles(input);
if (!files.length) throw new Error(`No JSONL files found under: ${input}`);

const outputLines: string[] = [];
let candidates = 0;
let unique = 0;
let unsolved = 0;
let multiple = 0;
const started = performance.now();

for (const file of files) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const candidate = JSON.parse(line) as Candidate;
    const board: BoardSnapshot = {
      size: candidate.size,
      regionMap: candidate.regionMap,
      cells: Array.from({ length: candidate.size * candidate.size }, () => 'empty'),
    };
    candidates++;
    const solutionCount = countSolutions(board, 2);
    const metrics = analyzeSolutions(board, 2);
    if (solutionCount === 0) unsolved++;
    else if (solutionCount === 1) unique++;
    else multiple++;
    outputLines.push(JSON.stringify({ ...candidate, solutionCount, metrics }));
  }
}

writeFileSync(output, `${outputLines.join('\n')}\n`);
const elapsedSeconds = (performance.now() - started) / 1000;
const summary = { candidates, unique, unsolved, multiple, uniqueRate: candidates ? unique / candidates : 0, elapsedSeconds, candidatesPerSecond: elapsedSeconds ? candidates / elapsedSeconds : 0, inputFiles: files.length };
writeFileSync(`${output}.summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
