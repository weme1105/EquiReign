import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BoardSize } from '../src/game-core/types.ts';

/**
 * Phase 1 puzzle research tool.
 *
 * Deterministic only: no randomness and no solver calls.
 * 1. Enumerate every N-Queens solution for N=6,7.
 * 2. Collapse the 8 rotational/reflectional symmetries.
 * 3. For each reduced solution, brute-force every non-queen cell's region/color.
 *
 * Uniqueness, region-connectivity validation, and difficulty classification are
 * deliberately deferred to later phases. This is a candidate-pool enumerator.
 */
const sizes = parseSizes(arg('--sizes', '6,7'));
const targetPerSolution = positiveInteger(arg('--target-per-solution', '10000'), 'target-per-solution');
const outputPath = resolve(arg('--output', 'src/puzzles/enumerated-candidates.json'));

interface Candidate {
  readonly id: string;
  readonly size: BoardSize;
  readonly solution: readonly number[];
  readonly regionMap: readonly number[];
}

interface SizeStats {
  readonly size: BoardSize;
  readonly allSolutions: number;
  readonly symmetryReducedSolutions: number;
  readonly candidates: number;
  readonly completeAssignmentsVisited: number;
  readonly elapsedMs: number;
}

const candidates: Candidate[] = [];
const stats: SizeStats[] = [];

for (const size of sizes) {
  const started = performance.now();
  const allSolutions = enumerateQueens(size);
  const reducedSolutions = dedupeSymmetricSolutions(allSolutions, size);
  const seen = new Set<string>();
  let generated = 0;
  let completeAssignmentsVisited = 0;

  for (const solution of reducedSolutions) {
    if (generated >= targetPerSolution * reducedSolutions.length) break;
    const remaining = targetPerSolution * reducedSolutions.length - generated;
    const result = enumerateRegionMaps(size, solution, Math.min(targetPerSolution, remaining), seen);
    completeAssignmentsVisited += result.completeAssignmentsVisited;

    for (const regionMap of result.maps) {
      generated += 1;
      candidates.push({
        id: `${size}x${size}-candidate-${String(generated).padStart(7, '0')}`,
        size,
        solution,
        regionMap,
      });
    }
  }

  stats.push({
    size,
    allSolutions: allSolutions.length,
    symmetryReducedSolutions: reducedSolutions.length,
    candidates: generated,
    completeAssignmentsVisited,
    elapsedMs: performance.now() - started,
  });
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  version: 2,
  phase: 'enumerate-candidates',
  generatedAt: new Date().toISOString(),
  policy: {
    randomGeneration: false,
    solverDuringGeneration: false,
    uniquenessCheck: 'deferred',
    difficultyClassification: 'deferred',
    regionConnectivityCheck: 'deferred',
  },
  sizes: stats,
  candidates,
}, null, 2)}\n`, 'utf8');

process.stdout.write(`Enumerated ${candidates.length} candidate boards.\n`);
for (const item of stats) {
  process.stdout.write(`${item.size}x${item.size}: ${item.allSolutions} solutions -> ${item.symmetryReducedSolutions} symmetry-reduced -> ${item.candidates} candidates; ${item.completeAssignmentsVisited} complete assignments; ${(item.elapsedMs / 1000).toFixed(2)}s.\n`);
}
process.stdout.write(`Candidates: ${outputPath}\n`);

function enumerateQueens(size: number): number[][] {
  const result: number[][] = [];
  const columns = new Set<number>();
  const down = new Set<number>();
  const up = new Set<number>();
  const solution = Array<number>(size).fill(-1);

  const visit = (row: number) => {
    if (row === size) {
      result.push([...solution]);
      return;
    }
    for (let column = 0; column < size; column += 1) {
      if (columns.has(column) || down.has(row - column) || up.has(row + column)) continue;
      solution[row] = column;
      columns.add(column);
      down.add(row - column);
      up.add(row + column);
      visit(row + 1);
      columns.delete(column);
      down.delete(row - column);
      up.delete(row + column);
    }
  };

  visit(0);
  return result;
}

function dedupeSymmetricSolutions(solutions: readonly number[][], size: number): number[][] {
  const seen = new Set<string>();
  const result: number[][] = [];
  for (const solution of solutions) {
    const key = symmetryVariants(solution, size).map((item) => item.join(',')).sort()[0]!;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(solution);
  }
  return result;
}

function symmetryVariants(solution: readonly number[], size: number): number[][] {
  const transforms = [
    (r: number, c: number) => [r, c],
    (r: number, c: number) => [c, size - 1 - r],
    (r: number, c: number) => [size - 1 - r, size - 1 - c],
    (r: number, c: number) => [size - 1 - c, r],
    (r: number, c: number) => [r, size - 1 - c],
    (r: number, c: number) => [size - 1 - r, c],
    (r: number, c: number) => [c, r],
    (r: number, c: number) => [size - 1 - c, size - 1 - r],
  ] as const;

  return transforms.map((transform) => {
    const output = Array<number>(size).fill(-1);
    for (let row = 0; row < size; row += 1) {
      const [nextRow, nextColumn] = transform(row, solution[row]!);
      output[nextRow!] = nextColumn!;
    }
    return output;
  });
}

function enumerateRegionMaps(
  size: number,
  solution: readonly number[],
  target: number,
  globalSeen: Set<string>,
): { maps: number[][]; completeAssignmentsVisited: number } {
  const total = size * size;
  const regions = Array<number>(total).fill(-1);
  const queenCells = new Set<number>();

  for (let row = 0; row < size; row += 1) {
    const index = row * size + solution[row]!;
    regions[index] = row;
    queenCells.add(index);
  }

  const maps: number[][] = [];
  let completeAssignmentsVisited = 0;

  // Pure lexicographic brute force: every non-queen cell tries every color.
  const visit = (index: number) => {
    if (maps.length >= target) return;
    if (index === total) {
      completeAssignmentsVisited += 1;
      const canonical = canonicalRegionMap(regions);
      const key = canonical.join(',');
      if (!globalSeen.has(key)) {
        globalSeen.add(key);
        maps.push(canonical);
      }
      return;
    }

    if (queenCells.has(index)) {
      visit(index + 1);
      return;
    }

    for (let region = 0; region < size; region += 1) {
      regions[index] = region;
      visit(index + 1);
      regions[index] = -1;
      if (maps.length >= target) return;
    }
  };

  visit(0);
  return { maps, completeAssignmentsVisited };
}

function canonicalRegionMap(regionMap: readonly number[]): number[] {
  const remap = new Map<number, number>();
  let next = 0;
  return regionMap.map((region) => {
    const existing = remap.get(region);
    if (existing !== undefined) return existing;
    remap.set(region, next);
    return next++;
  });
}

function parseSizes(value: string): BoardSize[] {
  const values = value.split(',').map((item) => Number(item.trim()));
  if (!values.length || values.some((value) => ![6, 7].includes(value))) throw new Error('--sizes currently supports only 6,7.');
  return [...new Set(values)] as BoardSize[];
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
