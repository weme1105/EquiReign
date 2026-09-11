import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateEquiReignSolutions } from '../src/game-core/equireign-solutions.ts';
import { extendEquiReignSolutions } from '../src/game-core/equireign-extension-experiment.ts';

test('7x7 to 8x8 extension can be compared directly with enumeration', () => {
  const source = enumerateEquiReignSolutions(7);
  const direct = enumerateEquiReignSolutions(8);
  const grown = extendEquiReignSolutions(source.solutions);

  assert.equal(source.solutions.length, 646);
  assert.equal(direct.solutions.length, 5242);
  assert.equal(grown.extensionEdges.length, 23256);
  assert.equal(grown.solutions.length, 5234);

  const directKeys = new Set(direct.solutions.map((solution) => solution.join(',')));
  const grownKeys = new Set(grown.solutions.map((solution) => solution.join(',')));
  const missing = [...directKeys].filter((key) => !grownKeys.has(key));

  assert.equal(missing.length, 8);
  assert.equal(new Set(missing.map((key) => key)).size, 8);
});

test('the 7-to-8 insertion extension misses exactly two D4 symmetry classes', () => {
  const source = enumerateEquiReignSolutions(7);
  const direct = enumerateEquiReignSolutions(8);
  const grown = extendEquiReignSolutions(source.solutions);

  const grownKeys = new Set(grown.solutions.map((solution) => solution.join(',')));
  const missing = direct.solutions.filter((solution) => !grownKeys.has(solution.join(',')));

  assert.equal(missing.length, 8);
  assert.equal(new Set(missing.map((solution) => canonical(solution))).size, 2);
});

function canonical(solution: readonly number[]): string {
  const size = solution.length;
  const transforms = [
    (r: number, c: number) => [r, c],
    (r: number, c: number) => [c, size - 1 - r],
    (r: number, c: number) => [size - 1 - r, size - 1 - c],
    (r: number, c: number) => [size - 1 - c, r],
    (r: number, c: number) => [r, size - 1 - c],
    (r: number, c: number) => [size - 1 - r, c],
    (r: number, c: number) => [c, r],
    (r: number, c: number) => [size - 1 - c, size - 1 - r],
  ];

  return transforms.map((transform) => {
    const variant = Array<number>(size).fill(-1);
    solution.forEach((column, row) => {
      const [nextRow, nextColumn] = transform(row, column);
      variant[nextRow!] = nextColumn!;
    });
    return variant.join(',');
  }).sort()[0]!;
}
