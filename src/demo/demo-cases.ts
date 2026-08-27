import { createBoard } from '../game-core/board.ts';
import { findRuleConflicts } from '../game-core/rules.ts';
import { extractFirstSolution } from '../game-core/solver.ts';
import type { PuzzleDefinition } from '../game-core/types.ts';
import { getBundledCampaignPuzzle } from '../puzzles/bundled-campaign.ts';

export type DemoVariant = 'frozen' | 'lost' | 'frozen-lost' | 'frozen-lost-dual';

export interface DemoCase {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly variant: DemoVariant;
  readonly puzzle: PuzzleDefinition;
  readonly frozenCellIndexes: readonly number[];
  readonly lostCellIndexes: readonly number[];
  /** Presentation-only cells used to inspect the proposed two-color-region visual treatment. */
  readonly dualColorCellIndexes: readonly number[];
}

function assertDemoPuzzleIntegrity(puzzle: PuzzleDefinition): void {
  const { size, regionMap } = puzzle;
  if (regionMap.length !== size * size) throw new Error(`Demo puzzle ${puzzle.id} must contain exactly ${size * size} cells.`);

  const regions = new Set(regionMap);
  if (regions.size !== size) throw new Error(`Demo puzzle ${puzzle.id} must contain exactly ${size} regions.`);

  for (const region of regions) {
    const cells = regionMap.flatMap((value, index) => value === region ? [index] : []);
    const pending = [cells[0]!];
    const visited = new Set<number>();
    while (pending.length) {
      const index = pending.pop()!;
      if (visited.has(index)) continue;
      visited.add(index);
      const row = Math.floor(index / size); const column = index % size;
      const neighbors = [
        row > 0 ? index - size : -1,
        row < size - 1 ? index + size : -1,
        column > 0 ? index - 1 : -1,
        column < size - 1 ? index + 1 : -1,
      ];
      for (const neighbor of neighbors) if (neighbor >= 0 && regionMap[neighbor] === region && !visited.has(neighbor)) pending.push(neighbor);
    }
    if (visited.size !== cells.length) throw new Error(`Demo puzzle ${puzzle.id} contains a disconnected region ${region}.`);
  }

  const givenBoard = createBoard(puzzle);
  if (findRuleConflicts(givenBoard).positions.size > 0) throw new Error(`Demo puzzle ${puzzle.id} contains conflicting given queens.`);
}

function buildCase(
  id: string,
  title: string,
  description: string,
  variant: DemoVariant,
  bundledLevel: number,
  ordinal: number,
): DemoCase {
  const puzzle = getBundledCampaignPuzzle(bundledLevel);
  if (!puzzle) throw new Error(`Missing bundled demo puzzle at level ${bundledLevel}.`);
  assertDemoPuzzleIntegrity(puzzle);
  const solution = extractFirstSolution(createBoard(puzzle));
  if (!solution) throw new Error(`Demo puzzle ${puzzle.id} has no solution.`);

  const size = puzzle.size;
  const solutionIndexes = solution.map(({ row, column }) => row * size + column);
  const solutionSet = new Set(solutionIndexes);
  const givenSet = new Set(puzzle.givenQueens.map(({ row, column }) => row * size + column));
  const crownCandidates = solutionIndexes.filter((index) => !givenSet.has(index));
  const nonCrownCandidates = Array.from({ length: size * size }, (_, index) => index)
    .filter((index) => !solutionSet.has(index) && !givenSet.has(index));
  const pick = (values: readonly number[], offset: number) => values[(ordinal * 5 + offset) % values.length]!;

  const frozenCellIndexes: number[] = [];
  const lostCellIndexes: number[] = [];
  const dualColorCellIndexes: number[] = [];

  if (variant === 'frozen') {
    frozenCellIndexes.push(ordinal % 2 === 0 ? pick(crownCandidates, 0) : pick(nonCrownCandidates, 1));
    if (ordinal === 2) frozenCellIndexes.push(pick(nonCrownCandidates, 7));
  }
  if (variant === 'lost') {
    lostCellIndexes.push(ordinal % 2 === 0 ? pick(nonCrownCandidates, 2) : pick(crownCandidates, 1));
    if (ordinal === 2) lostCellIndexes.push(pick(nonCrownCandidates, 8));
  }
  if (variant === 'frozen-lost' || variant === 'frozen-lost-dual') {
    frozenCellIndexes.push(pick(crownCandidates, 2), pick(nonCrownCandidates, 3));
    lostCellIndexes.push(pick(nonCrownCandidates, 5));
    if (ordinal >= 1) lostCellIndexes.push(pick(crownCandidates, 4));
  }
  if (variant === 'frozen-lost-dual') {
    const blocked = new Set([...frozenCellIndexes, ...lostCellIndexes]);
    const visible = nonCrownCandidates.filter((index) => !blocked.has(index));
    dualColorCellIndexes.push(pick(visible, 6), pick(visible, 11));
    if (ordinal === 2) dualColorCellIndexes.push(pick(visible, 16));
  }

  return { id, title, description, variant, puzzle, frozenCellIndexes, lostCellIndexes, dualColorCellIndexes };
}

export const DEMO_CASES: readonly DemoCase[] = [
  buildCase('frozen-1', '單冰封 A', '1 個冰封格，測試基本揭示流程。', 'frozen', 4, 0),
  buildCase('frozen-2', '單冰封 B', '1 個非皇冠冰封格，測試行列完成後揭示。', 'frozen', 7, 1),
  buildCase('frozen-3', '單冰封 C', '2 個冰封格，測試連續揭示。', 'frozen', 10, 2),
  buildCase('lost-1', '單遺失 A', '1 個遺失格，不含其他特殊格。', 'lost', 13, 0),
  buildCase('lost-2', '單遺失 B', '包含皇冠遺失情境。', 'lost', 16, 1),
  buildCase('lost-3', '單遺失 C', '2 個遺失格，測試結算判定。', 'lost', 19, 2),
  buildCase('frozen-lost-1', '冰封＋遺失 A', '冰封與遺失同盤並存。', 'frozen-lost', 22, 0),
  buildCase('frozen-lost-2', '冰封＋遺失 B', '加入遺失皇冠，測試混合完成判定。', 'frozen-lost', 25, 1),
  buildCase('frozen-lost-3', '冰封＋遺失 C', '較多特殊格，測試混合揭示流程。', 'frozen-lost', 28, 2),
  buildCase('frozen-lost-dual-1', '冰封＋遺失＋雙色 A', '混合特殊格；雙色域遊戲中隱藏、結算揭示。', 'frozen-lost-dual', 31, 0),
  buildCase('frozen-lost-dual-2', '冰封＋遺失＋雙色 B', '混合特殊格並含遺失皇冠。', 'frozen-lost-dual', 34, 1),
  buildCase('frozen-lost-dual-3', '冰封＋遺失＋雙色 C', '3 個雙色展示格，供結算視覺測試。', 'frozen-lost-dual', 37, 2),
];

export function getDemoCase(id: string | string[] | undefined): DemoCase | null {
  const value = Array.isArray(id) ? id[0] : id;
  return value ? DEMO_CASES.find((item) => item.id === value) ?? null : null;
}
