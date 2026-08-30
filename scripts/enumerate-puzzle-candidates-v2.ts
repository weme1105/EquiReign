import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BoardSize } from '../src/game-core/types.ts';

/** Phase 1 only: deterministic Queen enumeration + symmetry reduction + brute-force region enumeration.
 * No solver, uniqueness check, connectivity validation, or difficulty classification.
 * Large pools are written one symmetry-reduced solution per shard to avoid a monolithic JSON/RAM workload.
 */
const size = positiveInteger(arg('--size', '6'), 'size') as BoardSize;
const target = positiveInteger(arg('--target-per-solution', '1000000'), 'target-per-solution');
const solutionIndex = nonNegativeInteger(arg('--solution-index', '0'), 'solution-index');
const outputDir = resolve(arg('--output-dir', 'artifacts/puzzle-candidates'));

const started = performance.now();
const allSolutions = enumerateQueens(size);
const reduced = dedupeSymmetricSolutions(allSolutions, size);
if (solutionIndex >= reduced.length) throw new Error(`solution-index ${solutionIndex} is out of range; ${reduced.length} reduced solutions exist for ${size}.`);
const solution = reduced[solutionIndex]!;
const result = enumerateRegionMaps(size, solution, target);
const sizeDir = resolve(outputDir, `${size}x${size}`);
await mkdir(sizeDir, { recursive: true });
const outputPath = resolve(sizeDir, `solution-${String(solutionIndex + 1).padStart(3, '0')}.jsonl`);
await writeFile(outputPath, result.maps.map((regionMap, i) => JSON.stringify({
  id: `${size}x${size}-solution-${String(solutionIndex + 1).padStart(3, '0')}-candidate-${String(i + 1).padStart(9, '0')}`,
  size,
  solution,
  regionMap,
})).join('\n') + (result.maps.length ? '\n' : ''), 'utf8');

const report = {
  version: 3,
  phase: 'enumerate-candidates',
  size,
  allSolutions: allSolutions.length,
  symmetryReducedSolutions: reduced.length,
  solutionIndex,
  targetPerSolution: target,
  candidates: result.maps.length,
  completeAssignmentsVisited: result.completeAssignmentsVisited,
  elapsedMs: performance.now() - started,
  policy: { randomGeneration: false, solverDuringGeneration: false, uniquenessCheck: 'deferred', difficultyClassification: 'deferred', regionConnectivityCheck: 'deferred' },
  outputPath,
};
await writeFile(resolve(sizeDir, `solution-${String(solutionIndex + 1).padStart(3, '0')}.report.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${size}x${size} solution ${solutionIndex + 1}/${reduced.length}: ${result.maps.length} candidates; ${result.completeAssignmentsVisited} complete assignments; ${(report.elapsedMs / 1000).toFixed(2)}s; ${outputPath}\n`);

function enumerateQueens(n: number): number[][] {
  const result: number[][] = [];
  const cols = new Set<number>(); const down = new Set<number>(); const up = new Set<number>(); const solution = Array(n).fill(-1);
  const visit = (row: number) => {
    if (row === n) { result.push([...solution]); return; }
    for (let col = 0; col < n; col += 1) {
      if (cols.has(col) || down.has(row - col) || up.has(row + col)) continue;
      solution[row] = col; cols.add(col); down.add(row - col); up.add(row + col);
      visit(row + 1);
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

function enumerateRegionMaps(n: number, solution: readonly number[], targetCount: number) {
  const total = n * n; const regions = Array(total).fill(-1); const queens = new Set<number>();
  for (let r = 0; r < n; r += 1) { const cell = r * n + solution[r]!; regions[cell] = r; queens.add(cell); }
  const maps: number[][] = []; let completeAssignmentsVisited = 0;
  const visit = (index: number) => {
    if (maps.length >= targetCount) return;
    if (index === total) { completeAssignmentsVisited += 1; maps.push(canonicalRegionMap(regions)); return; }
    if (queens.has(index)) { visit(index + 1); return; }
    for (let region = 0; region < n; region += 1) { regions[index] = region; visit(index + 1); if (maps.length >= targetCount) return; }
    regions[index] = -1;
  };
  visit(0); return { maps, completeAssignmentsVisited };
}

function canonicalRegionMap(regionMap: readonly number[]): number[] {
  const remap = new Map<number, number>(); let next = 0;
  return regionMap.map((region) => { const existing = remap.get(region); if (existing !== undefined) return existing; remap.set(region, next); return next++; });
}

function arg(name: string, fallback: string): string { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback; }
function positiveInteger(value: string, name: string): number { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer.`); return n; }
function nonNegativeInteger(value: string, name: string): number { const n = Number(value); if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer.`); return n; }
