import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BoardSize, Position } from '../src/game-core/types.ts';

/**
 * Phase 1 puzzle research tool.
 *
 * No randomness and no solver call. It first enumerates N-Queens solutions,
 * removes the 8-way board symmetries, then lexicographically enumerates
 * connected N-region colour boards with exactly one queen per region.
 *
 * This intentionally produces CANDIDATES only. Uniqueness and difficulty are
 * later pipeline stages.
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

const allCandidates: Candidate[] = [];
const stats: SizeStats[] = [];

for (const size of sizes) {
  const started = performance.now();
  const allSolutions = enumerateQueens(size);
  const canonicalSolutions = dedupeSymmetricSolutions(allSolutions, size);
  const seen = new Set<string>();
  let generated = 0;
  let attempts = 0;

  for (const solution of canonicalSolutions) {
    if (generated >= targetPerSolution * canonicalSolutions.length) break;
    const localTarget = Math.min(targetPerSolution, targetPerSolution * canonicalSolutions.length - generated);
    const regions = enumerateRegionMaps(size, solution, localTarget, seen);
    attempts += regions.attempts;
    for (const regionMap of regions.maps) {
      generated += 1;
      allCandidates.push({
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
    symmetryReducedSolutions: canonicalSolutions.length,
    candidates: generated,
    enumerationAttempts: attempts,
    elapsedMs: performance.now() - started,
  });
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ version: 1, phase: 'enumerate-candidates', generatedAt: new Date().toISOString(), sizes: stats, candidates: allCandidates }, null, 2)}\n`, 'utf8');

process.stdout.write(`Enumerated ${allCandidates.length} candidate boards.\n`);
for (const item of stats) {
  process.stdout.write(`${item.size}x${item.size}: ${item.allSolutions} solutions -> ${item.symmetryReducedSolutions} symmetry-reduced -> ${item.candidates} candidates in ${(item.elapsedMs / 1000).toFixed(2)}s.\n`);
}
process.stdout.write(`Candidates: ${outputPath}\n`);

function enumerateQueens(size: number): number[][] {
  const result: number[][] = [];
  const columns = new Set<number>();
  const diagonalsDown = new Set<number>();
  const diagonalsUp = new Set<number>();
  const solution = Array<number>(size).fill(-1);

  const visit = (row: number) => {
    if (row === size) {
      result.push([...solution]);
      return;
    }
    for (let column = 0; column < size; column += 1) {
      const down = row - column;
      const up = row + column;
      if (columns.has(column) || diagonalsDown.has(down) || diagonalsUp.has(up)) continue;
      solution[row] = column;
      columns.add(column); diagonalsDown.add(down); diagonalsUp.add(up);
      visit(row + 1);
      columns.delete(column); diagonalsDown.delete(down); diagonalsUp.delete(up);
    }
  };
  visit(0);
  return result;
}

function dedupeSymmetricSolutions(solutions: readonly number[][], size: number): number[][] {
  const seen = new Set<string>();
  const result: number[][] = [];
  for (const solution of solutions) {
    const variants = symmetryVariants(solution, size);
    const key = variants.map((item) => item.join(',')).sort()[0]!;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(solution);
  }
  return result;
}

function symmetryVariants(solution: readonly number[], size: number): number[][] {
  const points: Position[] = solution.map((column, row) => ({ row, column }));
  const transforms = [
    (p: Position) => ({ row: p.row, column: p.column }),
    (p: Position) => ({ row: p.column, column: size - 1 - p.row }),
    (p: Position) => ({ row: size - 1 - p.row, column: size - 1 - p.column }),
    (p: Position) => ({ row: size - 1 - p.column, column: p.row }),
    (p: Position) => ({ row: p.row, column: size - 1 - p.column }),
    (p: Position) => ({ row: size - 1 - p.row, column: p.column }),
    (p: Position) => ({ row: p.column, column: p.row }),
    (p: Position) => ({ row: size - 1 - p.column, column: size - 1 - p.row }),
  ];
  return transforms.map((transform) => {
    const output = Array<number>(size).fill(-1);
    for (const point of points) {
      const next = transform(point);
      output[next.row] = next.column;
    }
    return output;
  });
}

function enumerateRegionMaps(size: number, solution: readonly number[], target: number, globalSeen: Set<string>): { maps: number[][]; attempts: number } {
  const total = size * size;
  const regions = Array<number>(total).fill(-1);
  const cellsByRegion = Array.from({ length: size }, () => new Set<number>());
  const queenRegionAt = Array<number>(total).fill(-1);
  for (let row = 0; row < size; row += 1) {
    const index = row * size + solution[row]!;
    regions[index] = row;
    queenRegionAt[index] = row;
    cellsByRegion[row]!.add(index);
  }

  const maps: number[][] = [];
  let attempts = 0;
  const nextUnassigned = () => {
    for (let index = 0; index < total; index += 1) if (regions[index] < 0) return index;
    return -1;
  };
  const neighbors = (index: number): number[] => {
    const row = Math.floor(index / size); const column = index % size;
    const result: number[] = [];
    if (row > 0) result.push(index - size);
    if (row + 1 < size) result.push(index + size);
    if (column > 0) result.push(index - 1);
    if (column + 1 < size) result.push(index + 1);
    return result;
  };
  const connected = (region: Set<number>): boolean => {
    if (region.size === 0) return false;
    const start = region.values().next().value as number;
    const queue = [start]; const visited = new Set<number>([start]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const next of neighbors(queue[cursor]!)) if (region.has(next) && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
    return visited.size === region.size;
  };

  const visit = () => {
    if (maps.length >= target) return;
    const index = nextUnassigned();
    if (index < 0) {
      attempts += 1;
      if (!cellsByRegion.every((region) => region.size > 0 && connected(region))) return;
      const canonical = canonicalRegionMap(regions);
      const key = canonical.join(',');
      if (globalSeen.has(key)) return;
      globalSeen.add(key);
      maps.push(canonical);
      return;
    }

    // Lexicographic enumeration: try every region that touches this cell.
    const candidates = new Set<number>();
    for (const neighbor of neighbors(index)) if (regions[neighbor]! >= 0) candidates.add(regions[neighbor]!);
    for (const region of [...candidates].sort((a, b) => a - b)) {
      const queenIndex = solution[region]! + region * size;
      if (queenIndex === index || cellsByRegion[region]!.has(queenIndex)) continue;
      regions[index] = region;
      cellsByRegion[region]!.add(index);
      // A region may never absorb another queen.
      const row = Math.floor(index / size);
      if (solution[row] === index % size) {
        regions[index] = -1;
        cellsByRegion[region]!.delete(index);
        continue;
      }
      visit();
      cellsByRegion[region]!.delete(index);
      regions[index] = -1;
      if (maps.length >= target) return;
    }
  };

  visit();
  return { maps, attempts };
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

interface SizeStats {
  readonly size: BoardSize;
  readonly allSolutions: number;
  readonly symmetryReducedSolutions: number;
  readonly candidates: number;
  readonly enumerationAttempts: number;
  readonly elapsedMs: number;
}
