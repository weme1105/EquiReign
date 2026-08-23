import { countSolutions, extractFirstSolution } from './solver.ts';
import type { BoardSnapshot, GeneratedPuzzle, PuzzleGenerator } from './types.ts';

export class RegionPuzzleGenerator implements PuzzleGenerator {
  generate(size: number, seed = Date.now()): GeneratedPuzzle {
    if (!Number.isInteger(size) || size < 4 || size > 12) throw new Error('Generator supports size 4..12.');
    const random = mulberry32(seed >>> 0);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const columns = randomLayout(size, random);
      if (!columns) continue;
      const regionMap = growUniqueRegions(size, columns, random);
      if (!regionMap) continue;
      const board: BoardSnapshot = { size, regionMap, cells: Array.from({ length: size * size }, () => 'empty') };
      if (countSolutions(board, 2) !== 1) continue;
      const solution = extractFirstSolution(board);
      if (solution) return { size, regionMap, solution };
    }
    throw new Error(`Unable to generate a unique ${size}x${size} puzzle.`);
  }
}

function randomLayout(size: number, random: () => number): number[] | null {
  const base = Array.from({ length: size }, (_, index) => index);
  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const columns = shuffle(base, random);
    if (columns.slice(1).every((column, row) => Math.abs(column - columns[row]!) > 1)) return columns;
  }
  return null;
}

function growUniqueRegions(size: number, queens: readonly number[], random: () => number): number[] | null {
  const regions = Array<number>(size * size).fill(-1);
  const sizes = Array<number>(size).fill(1);
  const frontier = new Set<number>();
  const directions = [[1,0],[-1,0],[0,1],[0,-1]] as const;
  const addFrontier = (row: number, column: number) => {
    for (const [dr, dc] of directions) { const r = row + dr; const c = column + dc; if (r >= 0 && c >= 0 && r < size && c < size && regions[r * size + c] === -1) frontier.add(r * size + c); }
  };
  for (let region = 0; region < size; region += 1) regions[region * size + queens[region]!] = region;
  for (let region = 0; region < size; region += 1) addFrontier(region, queens[region]!);

  while (regions.includes(-1)) {
    const options: { index: number; region: number; score: number }[] = [];
    for (const index of frontier) {
      if (regions[index] !== -1) { frontier.delete(index); continue; }
      const row = Math.floor(index / size); const column = index % size; const adjacent = new Set<number>();
      for (const [dr, dc] of directions) { const r = row + dr; const c = column + dc; if (r >= 0 && c >= 0 && r < size && c < size && regions[r * size + c]! >= 0) adjacent.add(regions[r * size + c]!); }
      for (const region of adjacent) options.push({ index, region, score: sizes[region]! * 2 + Math.abs(row - region) + Math.abs(column - queens[region]!) + random() });
    }
    options.sort((a, b) => a.score - b.score);
    let accepted: typeof options[number] | null = null;
    for (const option of options) {
      regions[option.index] = option.region;
      const cells = Array.from({ length: size * size }, () => 'empty' as const);
      cells[option.index] = 'queen';
      if (countSolutions({ size, regionMap: regions, cells }, 1) === 0) { accepted = option; break; }
      regions[option.index] = -1;
    }
    if (!accepted) return null;
    sizes[accepted.region]! += 1; frontier.delete(accepted.index); addFrontier(Math.floor(accepted.index / size), accepted.index % size);
  }
  return regions;
}

function mulberry32(seed: number): () => number { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle<T>(items: readonly T[], random: () => number): T[] { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j]!, result[i]!]; } return result; }
