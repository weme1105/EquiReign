import assert from 'node:assert/strict';
import test from 'node:test';
import { enumerateEquiReignRegionMaps } from '../src/game-core/equireign-region-enumerator.ts';
import { isValidEquiReignRegionMap } from '../src/game-core/region-map.ts';

const solution = [1, 3, 0, 2, 5, 4] as const;

test('region enumerator emits only structurally valid connected maps', () => {
  const maps = [...enumerateEquiReignRegionMaps(6, solution, { limit: 250 })];
  assert.equal(maps.length, 250);
  assert.equal(new Set(maps.map((map) => map.join(','))).size, maps.length);
  for (const map of maps) assert.equal(isValidEquiReignRegionMap(6, map), true);
});

test('region enumerator skip resumes at the same deterministic leaf', () => {
  const first = [...enumerateEquiReignRegionMaps(6, solution, { limit: 20 })];
  const resumed = [...enumerateEquiReignRegionMaps(6, solution, { skip: 10, limit: 10 })];
  assert.deepEqual(resumed, first.slice(10, 20));
});

test('region enumerator keeps one region root at each solution queen', () => {
  const [map] = enumerateEquiReignRegionMaps(6, solution, { limit: 1 });
  assert.ok(map);
  for (let row = 0; row < 6; row += 1) assert.equal(map[row * 6 + solution[row]!], row);
});
