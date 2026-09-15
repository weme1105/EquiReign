import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { analyzeSolutions, extractFirstSolution } from '../src/game-core/solver.ts';
import type { BoardSnapshot } from '../src/game-core/types.ts';

const inputDir = resolve(arg('--input-dir', 'artifacts/puzzle-candidates'));
const files = (await readdir(inputDir, { recursive: true })).filter((file) => String(file).endsWith('.jsonl'));
if (!files.length) throw new Error(`No JSONL candidate files found under ${inputDir}`);

let candidates = 0;
let invalid = 0;
let maxSingletons = 0;
let disconnectedRegions = 0;
let zeroSolutions = 0;
let uniqueSolutions = 0;
let multipleSolutions = 0;
let solutionMismatches = 0;
let solverNodesVisited = 0;
let solverBranchesTried = 0;
let solverBacktracks = 0;
let solverMemoHits = 0;
const bySize = new Map<number, { candidates: number; unique: number; zero: number; multiple: number; solutionMismatches: number }>();

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
    if (solution.some((column) => !Number.isInteger(column) || column < 0 || column >= size)) {
      invalid += 1;
      continue;
    }
    const limit = Math.ceil(size * size * 0.01);
    const counts = new Map<number, number>();
    for (const region of regionMap) counts.set(region, (counts.get(region) ?? 0) + 1);
    const singletonCount = [...counts.values()].filter((count) => count === 1).length;
    maxSingletons = Math.max(maxSingletons, singletonCount);
    const sizeStats = bySize.get(size) ?? { candidates: 0, unique: 0, zero: 0, multiple: 0, solutionMismatches: 0 };
    sizeStats.candidates += 1;
    bySize.set(size, sizeStats);
    if (singletonCount > limit) { invalid += 1; continue; }
    if (!areAllRegionsConnected(regionMap, size)) {
      disconnectedRegions += 1;
      invalid += 1;
      continue;
    }

    const board: BoardSnapshot = { size, regionMap, cells: Array(size * size).fill('empty') };
    const analysis = analyzeSolutions(board, 2);
    solverNodesVisited += analysis.metrics.nodesVisited;
    solverBranchesTried += analysis.metrics.branchesTried;
    solverBacktracks += analysis.metrics.backtracks;
    solverMemoHits += analysis.metrics.memoHits;
    if (analysis.solutionCount === 0) {
      zeroSolutions += 1;
      sizeStats.zero += 1;
      invalid += 1;
    } else if (analysis.solutionCount === 1) {
      uniqueSolutions += 1;
      sizeStats.unique += 1;
      const resolved = extractFirstSolution(board);
      const resolvedColumns = resolved?.map(({ column }) => column) ?? null;
      if (!resolvedColumns || !resolvedColumns.every((column, row) => column === solution[row])) {
        solutionMismatches += 1;
        sizeStats.solutionMismatches += 1;
        invalid += 1;
      }
    } else {
      multipleSolutions += 1;
      sizeStats.multiple += 1;
      invalid += 1;
    }
  }
}

const result = {
  candidates,
  invalid,
  validUniqueCandidates: uniqueSolutions - solutionMismatches,
  zeroSolutions,
  multipleSolutions,
  solutionMismatches,
  maxSingletons,
  solutionStatsBySize: Object.fromEntries([...bySize].map(([size, stats]) => [size, stats])),
  disconnectedRegions,
  solverMetrics: { nodesVisited: solverNodesVisited, branchesTried: solverBranchesTried, backtracks: solverBacktracks, memoHits: solverMemoHits },
  regionConnectivityPolicy: 'every region must form one orthogonally connected component',
  uniquenessPolicy: 'exactly one solution under row, column, region, and 8-neighbor constraints',
  storedSolutionPolicy: 'candidate.solution must match the solver-resolved queen column for every row',
  inputDir,
};
console.log(JSON.stringify(result, null, 2));
if (invalid > 0 || candidates === 0) process.exit(1);

function areAllRegionsConnected(map: readonly number[], n: number): boolean {
  for (let region = 0; region < n; region += 1) {
    const cells: number[] = [];
    for (let index = 0; index < map.length; index += 1) if (map[index] === region) cells.push(index);
    if (!cells.length) return false;
    const visited = new Set<number>([cells[0]!]);
    const queue = [cells[0]!];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor]!;
      const row = Math.floor(index / n);
      const col = index % n;
      const neighbors = [row > 0 ? index - n : -1, row + 1 < n ? index + n : -1, col > 0 ? index - 1 : -1, col + 1 < n ? index + 1 : -1];
      for (const neighbor of neighbors) if (neighbor >= 0 && map[neighbor] === region && !visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
    }
    if (visited.size !== cells.length) return false;
  }
  return true;
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}
