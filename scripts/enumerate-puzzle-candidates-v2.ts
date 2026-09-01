import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BoardSize } from '../src/game-core/types.ts';

/** Phase 1 only: deterministic Queen enumeration + symmetry reduction + brute-force region enumeration.
 * No solver, uniqueness check, connectivity validation, or difficulty classification.
 * Each symmetry-reduced Queen solution is an independent resumable shard.
 * Singleton regions are allowed, but capped at ceil(total board cells * 1%).
 */
const size = positiveInteger(arg('--size', '6'), 'size') as BoardSize;
const target = positiveInteger(arg('--target-per-solution', '1000000'), 'target-per-solution');
const solutionIndex = nonNegativeInteger(arg('--solution-index', '0'), 'solution-index');
const outputDir = resolve(arg('--output-dir', 'artifacts/puzzle-candidates'));
const batchSize = positiveInteger(arg('--batch-size', '10000'), 'batch-size');

const started = performance.now();
const allSolutions = enumerateQueens(size);
const reduced = dedupeSymmetricSolutions(allSolutions, size);
if (solutionIndex >= reduced.length) throw new Error(`solution-index ${solutionIndex} is out of range; ${reduced.length} reduced solutions exist for ${size}.`);
const solution = reduced[solutionIndex]!;
const sizeDir = resolve(outputDir, `${size}x${size}`);
await mkdir(sizeDir, { recursive: true });
const outputPath = resolve(sizeDir, `solution-${String(solutionIndex + 1).padStart(3, '0')}.jsonl`);
await writeFile(outputPath, '', 'utf8');

const result = await enumerateRegionMaps(size, solution, target, batchSize, outputPath);
const report = {
  version: 5,
  phase: 'enumerate-candidates',
  size,
  allSolutions: allSolutions.length,
  symmetryReducedSolutions: reduced.length,
  solutionIndex,
  targetPerSolution: target,
  batchSize,
  candidates: result.candidates,
  completeAssignmentsVisited: result.completeAssignmentsVisited,
  rejectedBySingletonLimit: result.rejectedBySingletonLimit,
  singletonRegionLimit: result.singletonRegionLimit,
  singletonRegionPolicy: 'ceil(totalCells * 1%) as an upper bound',
  elapsedMs: performance.now() - started,
  policy: { randomGeneration: false, solverDuringGeneration: false, uniquenessCheck: 'deferred', difficultyClassification: 'deferred', regionConnectivityCheck: 'deferred', singletonRegionLimit: `ceil(${size * size} * 1%)` },
  outputPath,
};
await writeFile(resolve(sizeDir, `solution-${String(solutionIndex + 1).padStart(3, '0')}.report.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${size}x${size} solution ${solutionIndex + 1}/${reduced.length}: ${result.candidates} candidates; ${result.completeAssignmentsVisited} complete assignments; ${result.rejectedBySingletonLimit} rejected by singleton limit; singleton limit ${result.singletonRegionLimit}; ${(report.elapsedMs / 1000).toFixed(2)}s; ${outputPath}\n`);

function enumerateQueens(n: number): number[][] {
  const result: number[][] = [];
  const cols = new Set<number>(); const down = new Set<number>(); const up = new Set<number>(); const solution = Array(n).fill(-1);
  const visit = (row: number) => {
    if (row === n) { result.push([...solution]); return; }
    for (let col = 0; col < n; col += 1) {
      if (cols.has(col) || down.has(row - col) || up.has(row + col)) continue;
      solution[row] = col; cols.add(col); down.add(row - col); up.add(row + col); visit(row + 1);
      cols.delete(col); down.delete(row - col); up.delete(row + col);
    }
  };
  visit(0); return result;
}

function dedupeSymmetricSolutions(solutions: readonly number[][], n: number): number[][] {
  const seen = new Set<string>(); const result: number[][] = [];
  for (const solution of solutions) {
    const key = symmetryVariants(solution, n).map((v) => v.join(',')).sort()[0]!;
    if (!seen.has(key)) { seen.add(key); result.push(solution); }
  }
  return result;
}

function symmetryVariants(solution: readonly number[], n: number): number[][] {
  const transforms = [
    (r: number, c: number) => [r, c], (r: number, c: number) => [c, n - 1 - r],
    (r: number, c: number) => [n - 1 - r, n - 1 - c], (r: number, c: number) => [n - 1 - c, r],
    (r: number, c: number) => [r, n - 1 - c], (r: number, c: number) => [n - 1 - r, c],
    (r: number, c: number) => [c, r], (r: number, c: number) => [n - 1 - c, n - 1 - r],
  ] as const;
  return transforms.map((transform) => {
    const output = Array(n).fill(-1);
    for (let r = 0; r < n; r += 1) { const [nr, nc] = transform(r, solution[r]!); output[nr!] = nc!; }
    return output;
  });
}

async function enumerateRegionMaps(n: number, solution: readonly number[], targetCount: number, batchSize: number, outputPath: string) {
  const total = n * n;
  const singletonRegionLimit = Math.ceil(total * 0.01);
  const regions = Array(total).fill(-1); const queens = new Set<number>();
  for (let r = 0; r < n; r += 1) { const cell = r * n + solution[r]!; regions[cell] = r; queens.add(cell); }
  let batch: string[] = []; let candidates = 0; let completeAssignmentsVisited = 0; let rejectedBySingletonLimit = 0;
  const flush = async () => { if (!batch.length) return; await appendFile(outputPath, batch.join('\n') + '\n', 'utf8'); batch = []; };
  const visit = async (index: number): Promise<void> => {
    if (candidates >= targetCount) return;
    if (index === total) {
      completeAssignmentsVisited += 1;
      if (countSingletonRegions(regions) > singletonRegionLimit) { rejectedBySingletonLimit += 1; return; }
      const regionMap = canonicalRegionMap(regions);
      candidates += 1;
      batch.push(JSON.stringify({ id: `${n}x${n}-solution-${String(solutionIndex + 1).padStart(3, '0')}-candidate-${String(candidates).padStart(9, '0')}`, size: n, solution, regionMap }));
      if (batch.length >= batchSize) await flush();
      return;
    }
    if (queens.has(index)) { await visit(index + 1); return; }
    for (let region = 0; region < n; region += 1) {
      if (candidates >= targetCount) break;
      regions[index] = region;
      await visit(index + 1);
    }
    regions[index] = -1;
  };
  await visit(0); await flush();
  return { candidates, completeAssignmentsVisited, rejectedBySingletonLimit, singletonRegionLimit };
}

function countSingletonRegions(regionMap: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const region of regionMap) counts.set(region, (counts.get(region) ?? 0) + 1);
  let singletonCount = 0;
  for (const count of counts.values()) if (count === 1) singletonCount += 1;
  return singletonCount;
}

function canonicalRegionMap(regionMap: readonly number[]): number[] {
  const remap = new Map<number, number>(); let next = 0;
  return regionMap.map((region) => { const existing = remap.get(region); if (existing !== undefined) return existing; remap.set(region, next); return next++; });
}
function arg(name: string, fallback: string): string { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback; }
function positiveInteger(value: string, name: string): number { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer.`); return n; }
function nonNegativeInteger(value: string, name: string): number { const n = Number(value); if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer.`); return n; }
