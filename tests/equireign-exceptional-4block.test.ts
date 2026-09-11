import assert from 'node:assert/strict';
import test from 'node:test';

const A = [1, 3, 0, 2] as const;
const B = [2, 0, 3, 1] as const;

function generateExceptionalSolutions(blockCount: number): readonly number[][] {
  const results: number[][] = [];

  for (const order of permutations(blockCount)) {
    for (const choices of binaryChoices(blockCount)) {
      const solution: number[] = [];
      for (let rowBlock = 0; rowBlock < blockCount; rowBlock += 1) {
        const band = order[rowBlock]!;
        const block = choices[rowBlock] === 0 ? A : B;
        for (const column of block) solution.push(column + band * 4);
      }
      if (isLegal(solution)) results.push(solution);
    }
  }

  return results;
}

test('4k exceptional family has the predicted size', () => {
  assert.equal(generateExceptionalSolutions(2).length, 8);
  assert.equal(generateExceptionalSolutions(3).length, 48);
  assert.equal(generateExceptionalSolutions(4).length, 384);
  assert.equal(generateExceptionalSolutions(5).length, 3840);
});

test('4k exceptional family solutions have no legal N-1 reduction', () => {
  for (const blockCount of [2, 3, 4, 5]) {
    for (const solution of generateExceptionalSolutions(blockCount)) {
      assert.equal(hasLegalReduction(solution), false, `unexpected reduction: ${solution.join(',')}`);
    }
  }
});

function hasLegalReduction(solution: readonly number[]): boolean {
  for (let removedRow = 0; removedRow < solution.length; removedRow += 1) {
    const removedColumn = solution[removedRow]!;
    const reduced = solution
      .filter((_, row) => row !== removedRow)
      .map((column) => column - (column > removedColumn ? 1 : 0));
    if (isLegal(reduced)) return true;
  }
  return false;
}

function isLegal(solution: readonly number[]): boolean {
  if (new Set(solution).size !== solution.length) return false;
  return solution.every((column, row) =>
    column >= 0 && column < solution.length &&
    (row === 0 || Math.abs(solution[row - 1]! - column) > 1),
  );
}

function permutations(size: number): readonly number[][] {
  const result: number[][] = [];
  const values = Array.from({ length: size }, (_, index) => index);
  const visit = (index: number): void => {
    if (index === size) {
      result.push([...values]);
      return;
    }
    for (let next = index; next < size; next += 1) {
      [values[index], values[next]] = [values[next]!, values[index]!];
      visit(index + 1);
      [values[index], values[next]] = [values[next]!, values[index]!];
    }
  };
  visit(0);
  return result;
}

function binaryChoices(size: number): readonly number[][] {
  const result: number[][] = [];
  const choices = Array<number>(size).fill(0);
  const visit = (index: number): void => {
    if (index === size) {
      result.push([...choices]);
      return;
    }
    choices[index] = 0;
    visit(index + 1);
    choices[index] = 1;
    visit(index + 1);
  };
  visit(0);
  return result;
}
