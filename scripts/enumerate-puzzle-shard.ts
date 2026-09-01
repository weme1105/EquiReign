import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

type BoardSize = 6 | 7;

const size = parseSize(arg('--size', '6'));
const solutionIndex = positiveInteger(arg('--solution-index', '1'), 'solution-index') - 1;
const target = positiveInteger(arg('--target-per-solution', '1000000'), 'target-per-solution');
const outputDir = resolve(arg('--output-dir', 'artifacts/puzzle-candidates'));
const batchSize = positiveInteger(arg('--batch-size', '10000'), 'batch-size');

const allSolutions = enumerateQueens(size);
const reduced = dedupeSymmetricSolutions(allSolutions, size);
const solution = reduced[solutionIndex];
if (!solution) throw new Error(`No symmetry-reduced solution ${solutionIndex + 1} for ${size}x${size}. Available: ${reduced.length}`);

const sizeDir = join(outputDir, `${size}x${size}`);
await mkdir(sizeDir, { recursive: true });
const prefix = join(sizeDir, `solution-${String(solutionIndex + 1).padStart(3, '0')}`);
const manifestPath = `${prefix}.report.json`;

const started = performance.now();
let generated = 0;
let completeAssignmentsVisited = 0;
let rejectedBySingletonLimit = 0;
let part = 0;
let buffer: string[] = [];
const totalCells = size * size;
const singletonRegionLimit = Math.ceil(totalCells * 0.01);
const regionMap = Array<number>(totalCells).fill(-1);
const queenCells = new Set<number>();
for (let row = 0; row < size; row += 1) {
  const index = row * size + solution[row]!;
  regionMap[index] = row;
  queenCells.add(index);
}

const flush = async () => {
  if (!buffer.length) return;
  part += 1;
  const path = `${prefix}.part-${String(part).padStart(6, '0')}.jsonl`;
  await writeFile(path, buffer.join(''), 'utf8');
  buffer = [];
};

const visit = async (index: number): Promise<void> => {
  if (generated >= target) return;
  if (index === regionMap.length) {
    completeAssignmentsVisited += 1;
    if (countSingletonRegions(regionMap) > singletonRegionLimit) {
      rejectedBySingletonLimit += 1;
      return;
    }
    const candidate = {
      id: `${size}x${size}-s${String(solutionIndex + 1).padStart(3, '0')}-c${String(generated + 1).padStart(8, '0')}`,
      size,
      solution,
      regionMap: canonicalRegionMap(regionMap),
    };
    buffer.push(`${JSON.stringify(candidate)}\n`);
    generated += 1;
    if (buffer.length >= batchSize) await flush();
    return;
  }
  if (queenCells.has(index)) {
    await visit(index + 1);
    return;
  }
  for (let region = 0; region < size && generated < target; region += 1) {
    regionMap[index] = region;
    await visit(index + 1);
  }
  regionMap[index] = -1;
};

await visit(0);
await flush();

const elapsedMs = performance.now() - started;
const report = {
  version: 2,
  phase: 'enumerate-candidate-shard',
  size,
  solutionIndex: solutionIndex + 1,
  allSolutions: allSolutions.length,
  symmetryReducedSolutions: reduced.length,
  solution,
  targetPerSolution: target,
  candidates: generated,
  completeAssignmentsVisited,
  rejectedBySingletonLimit,
  singletonRegionLimit,
  singletonRegionPolicy: 'ceil(totalCells * 1%) as an upper bound',
  batchSize,
  elapsedMs,
  elapsedSeconds: elapsedMs / 1000,
};
await writeFile(manifestPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report));

function enumerateQueens(n: number): number[][] {
  const result: number[][] = [];
  const cols = new Set<number>();
  const down = new Set<number>();
  const up = new Set<number>();
  const solution = Array<number>(n).fill(-1);
  const visit = (row: number) => {
    if (row === n) { result.push([...solution]); return; }
    for (let col = 0; col < n; col += 1) {
      if (cols.has(col) || down.has(row - col) || up.has(row + col)) continue;
      solution[row] = col; cols.add(col); down.add(row - col); up.add(row + col);
      visit(row + 1);
      cols.delete(col); down.delete(row - col); up.delete(row + col);
    }
  };
  visit(0);
  return result;
}

function dedupeSymmetricSolutions(solutions: readonly number[][], n: number): number[][] {
  const seen = new Set<string>();
  const result: number[][] = [];
  for (const solution of solutions) {
    const key = symmetryVariants(solution, n).map((x) => x.join(',')).sort()[0]!;
    if (!seen.has(key)) { seen.add(key); result.push(solution); }
  }
  return result;
}

function symmetryVariants(solution: readonly number[], n: number): number[][] {
  const transforms = [
    (r: number, c: number) => [r, c],
    (r: number, c: number) => [c, n - 1 - r],
    (r: number, c: number) => [n - 1 - r, n - 1 - c],
    (r: number, c: number) => [n - 1 - c, r],
    (r: number, c: number) => [r, n - 1 - c],
    (r: number, c: number) => [n - 1 - r, c],
    (r: number, c: number) => [c, r],
    (r: number, c: number) => [n - 1 - c, n - 1 - r],
  ];
  return transforms.map((transform) => {
    const out = Array<number>(n).fill(-1);
    for (let r = 0; r < n; r += 1) { const [nr, nc] = transform(r, solution[r]!); out[nr!] = nc!; }
    return out;
  });
}

function countSingletonRegions(map: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const region of map) counts.set(region, (counts.get(region) ?? 0) + 1);
  let singletonCount = 0;
  for (const count of counts.values()) if (count === 1) singletonCount += 1;
  return singletonCount;
}

function canonicalRegionMap(map: readonly number[]): number[] {
  const remap = new Map<number, number>();
  let next = 0;
  return map.map((region) => {
    if (!remap.has(region)) remap.set(region, next++);
    return remap.get(region)!;
  });
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}
function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
function parseSize(value: string): BoardSize {
  const parsed = Number(value);
  if (parsed !== 6 && parsed !== 7) throw new Error('--size currently supports only 6 or 7.');
  return parsed;
}
