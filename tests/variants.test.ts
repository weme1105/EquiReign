import assert from 'node:assert/strict';
import test from 'node:test';
import { countVariantCells, validateInfiniteVariantLimits, validateVariantCells, validateVariantLimits } from '../src/game-core/variants.ts';
import type { PuzzleVariants } from '../src/game-core/types.ts';

const empty: PuzzleVariants = { frozenCellIndexes: [], lostCellIndexes: [], dualRegionCells: [] };

function variants(frozen: number[], lost: number[], dual: number[] = []): PuzzleVariants {
  return {
    frozenCellIndexes: frozen,
    lostCellIndexes: lost,
    dualRegionCells: dual.map((index) => ({ index, regions: [0, 1] as const })),
  };
}

test('variant limits are inclusive', () => {
  assert.doesNotThrow(() => validateVariantLimits('intermediate', 6, variants([0], [])));
  assert.doesNotThrow(() => validateVariantLimits('advanced', 6, variants([0, 1, 2, 3, 4], [5])));
  assert.doesNotThrow(() => validateVariantLimits('expert', 6, variants([0, 1, 2], [3, 4, 5])));
  assert.doesNotThrow(() => validateVariantLimits('king', 6, variants([0, 1, 2, 3], [4], [5])));
  assert.doesNotThrow(() => validateInfiniteVariantLimits(6, variants([0, 1], [2, 3], [4, 5])));
});

test('variant limits reject values above the inclusive caps', () => {
  assert.throws(() => validateVariantLimits('intermediate', 6, variants([0, 1], [])));
  assert.throws(() => validateVariantLimits('advanced', 6, variants([0, 1, 2, 3, 4, 5], [])));
  assert.throws(() => validateVariantLimits('expert', 6, variants([0, 1, 2, 3, 4], [5, 6])));
  assert.throws(() => validateVariantLimits('king', 6, variants([0, 1, 2, 3, 4], [5], [6, 7])));
  assert.throws(() => validateInfiniteVariantLimits(6, variants([0, 1], [2, 3], [4, 5, 6])));
});

test('special cells are mutually exclusive on the same cell', () => {
  const base = Array(36).fill(0); for (let i = 6; i < 12; i += 1) base[i] = 1; for (let i = 12; i < 18; i += 1) base[i] = 2; for (let i = 18; i < 24; i += 1) base[i] = 3; for (let i = 24; i < 30; i += 1) base[i] = 4; for (let i = 30; i < 36; i += 1) base[i] = 5;
  assert.throws(() => validateVariantCells(6, base, { ...empty, frozenCellIndexes: [0], lostCellIndexes: [0] }));
  assert.throws(() => validateVariantCells(6, base, { ...empty, lostCellIndexes: [0], dualRegionCells: [{ index: 0, regions: [0, 1] }] }));
  assert.throws(() => validateVariantCells(6, base, { ...empty, frozenCellIndexes: [0], dualRegionCells: [{ index: 0, regions: [0, 1] }] }));
});

test('dual region cells require exactly two valid candidate regions and include the base region', () => {
  const base = Array.from({ length: 36 }, (_, index) => Math.floor(index / 6));
  assert.doesNotThrow(() => validateVariantCells(6, base, { ...empty, dualRegionCells: [{ index: 0, regions: [0, 1] }] }));
  assert.throws(() => validateVariantCells(6, base, { ...empty, dualRegionCells: [{ index: 0, regions: [0, 0] }] }));
  assert.throws(() => validateVariantCells(6, base, { ...empty, dualRegionCells: [{ index: 0, regions: [1, 2] }] }));
  assert.throws(() => validateVariantCells(6, base, { ...empty, dualRegionCells: [{ index: 0, regions: [0, 6] }] }));
  assert.deepEqual(countVariantCells({ ...empty, frozenCellIndexes: [1], lostCellIndexes: [2], dualRegionCells: [{ index: 3, regions: [0, 1] }] }), { frozen: 1, lost: 1, dual: 1 });
});
