import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enumerateEquiReignSolutions } from '../src/game-core/equireign-solutions.ts';

const outputPath = resolve(process.argv[2] ?? 'artifacts/equireign-solutions/equireign-6x6.json');
const started = performance.now();
const result = enumerateEquiReignSolutions(6);

if (result.solutions.length !== 90) {
  throw new Error(`EquiReign 6x6 enumeration invariant failed: expected 90, got ${result.solutions.length}.`);
}

await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  version: 1,
  purpose: 'complete-equireign-6x6-queen-layout-enumeration',
  rule: 'one queen per row/column; adjacent row queen columns differ by more than one; no global diagonal restriction',
  size: 6,
  solutionCount: result.solutions.length,
  fundamentalSolutionCount: result.fundamentalSolutions.length,
  solutions: result.solutions,
  fundamentalSolutions: result.fundamentalSolutions,
  elapsedMs: performance.now() - started,
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  solutionCount: result.solutions.length,
  fundamentalSolutionCount: result.fundamentalSolutions.length,
  elapsedMs: performance.now() - started,
}));
