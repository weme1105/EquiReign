import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateEquiReignSolutions } from '../src/game-core/equireign-solutions.ts';
import { extendEquiReignSolutions } from '../src/game-core/equireign-extension-experiment.ts';

test('6x6 direct enumeration and 6-to-7 extension produce the same solution set', () => {
  const source = enumerateEquiReignSolutions(6);
  const direct = enumerateEquiReignSolutions(7);
  const grown = extendEquiReignSolutions(source.solutions);

  assert.equal(source.solutions.length, 90);
  assert.equal(direct.solutions.length, 646);
  assert.equal(grown.extensionEdges.length, 2250);
  assert.equal(grown.solutions.length, 646);

  const directKeys = new Set(direct.solutions.map((solution) => solution.join(',')));
  const grownKeys = new Set(grown.solutions.map((solution) => solution.join(',')));
  assert.deepEqual([...grownKeys].sort(), [...directKeys].sort());
});

test('every 6x6 solution has exactly 25 valid insertion extensions', () => {
  const source = enumerateEquiReignSolutions(6);
  const grown = extendEquiReignSolutions(source.solutions);
  const counts = new Map<string, number>();

  for (const [sourceSolution] of grown.extensionEdges) {
    const key = sourceSolution.join(',');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  assert.equal(counts.size, 90);
  assert.deepEqual([...new Set(counts.values())], [25]);
});
