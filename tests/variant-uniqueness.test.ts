import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoard } from '../src/game-core/board.ts';
import { getPuzzle } from '../src/puzzles/catalog.ts';
import { acceptUniqueVariant, resolveVariantEffectiveBoard, verifyVariantUniqueness } from '../src/game-core/variant-uniqueness.ts';
import { EMPTY_PUZZLE_VARIANTS } from '../src/game-core/variants.ts';

const basePuzzle = getPuzzle('advanced', 6);
const baseBoard = createBoard(basePuzzle);


test('6x6 bundled base remains independently unique through the Phase 3 gate', () => {
  assert.equal(verifyVariantUniqueness(baseBoard), 1);
  assert.deepEqual(acceptUniqueVariant(baseBoard, EMPTY_PUZZLE_VARIANTS), {
    variants: EMPTY_PUZZLE_VARIANTS,
    solutionCount: 1,
  });
});

test('presentation-only Frozen and Lost layers preserve the effective solver board', () => {
  const frozen = { ...EMPTY_PUZZLE_VARIANTS, frozenCellIndexes: [0] };
  const lost = { ...EMPTY_PUZZLE_VARIANTS, lostCellIndexes: [1] };

  const frozenEffective = resolveVariantEffectiveBoard(baseBoard, frozen);
  const lostEffective = resolveVariantEffectiveBoard(baseBoard, lost);

  assert.equal(frozenEffective.changesSolverConstraints, false);
  assert.equal(lostEffective.changesSolverConstraints, false);
  assert.strictEqual(frozenEffective.board, baseBoard);
  assert.strictEqual(lostEffective.board, baseBoard);
  assert.equal(verifyVariantUniqueness(frozenEffective.board), 1);
  assert.equal(verifyVariantUniqueness(lostEffective.board), 1);
});

test('non-unique effective boards are rejected instead of inheriting base uniqueness', () => {
  const nonUniqueBoard = {
    size: 6,
    regionMap: Array.from({ length: 36 }, (_, index) => Math.floor(index / 6)),
    cells: Array.from({ length: 36 }, () => 'empty' as const),
  };

  assert.ok(verifyVariantUniqueness(nonUniqueBoard) > 1);
  assert.equal(acceptUniqueVariant(nonUniqueBoard, EMPTY_PUZZLE_VARIANTS), null);
});

test('Dual-region candidates fail closed until formal solver semantics are implemented', () => {
  const dual = {
    ...EMPTY_PUZZLE_VARIANTS,
    dualRegionCells: [{ index: 0, regions: [1, 0] as const }],
  };
  assert.throws(() => resolveVariantEffectiveBoard(baseBoard, dual), /Dual-region solver semantics/);
});

test('invalid variant metadata is rejected before uniqueness verification', () => {
  const invalid = { ...EMPTY_PUZZLE_VARIANTS, frozenCellIndexes: [36] };
  assert.throws(() => resolveVariantEffectiveBoard(baseBoard, invalid), /Invalid frozen cell index/);
});
