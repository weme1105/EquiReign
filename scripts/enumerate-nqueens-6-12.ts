import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enumerateNQueens } from '../src/game-core/nqueens.ts';
import type { BoardSize } from '../src/game-core/types.ts';

const sizes: readonly BoardSize[] = [6, 7, 8, 9, 10, 11, 12];
const outputPath = resolve(process.argv[2] ?? 'artifacts/nqueens/nqueens-6-12.json');

const started = performance.now();
const enumerations = sizes.map((size) => enumerateNQueens(size));
const payload = {
  version: 1,
  purpose: 'complete-nqueens-enumeration',
  sizes: enumerations.map(({ size, solutions, fundamentalSolutions }) => ({
    size,
    solutionCount: solutions.length,
    fundamentalSolutionCount: fundamentalSolutions.length,
    solutions,
    fundamentalSolutions,
  })),
  elapsedMs: performance.now() - started,
};

await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outputPath,
  elapsedMs: payload.elapsedMs,
  counts: payload.sizes.map(({ size, solutionCount, fundamentalSolutionCount }) => ({ size, solutionCount, fundamentalSolutionCount })),
}));
