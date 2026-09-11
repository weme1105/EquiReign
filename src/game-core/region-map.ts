import type { BoardSize } from './types.ts';

export interface RegionMapValidation {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Validates the structural contract required by the EquiReign solver:
 * exactly `size` region labels, each used at least once, and every region is
 * 4-neighbor connected. This deliberately does not test puzzle uniqueness.
 */
export function validateEquiReignRegionMap(size: BoardSize, regionMap: readonly number[]): RegionMapValidation {
  if (regionMap.length !== size * size) return { valid: false, reason: 'regionMap length must equal size².' };
  const counts = Array<number>(size).fill(0);
  for (const region of regionMap) {
    if (!Number.isInteger(region) || region < 0 || region >= size) return { valid: false, reason: 'region labels must be integers in [0, size).' };
    counts[region] = counts[region]! + 1;
  }
  if (counts.some((count) => count === 0)) return { valid: false, reason: 'every region label must be used.' };

  for (let region = 0; region < size; region += 1) {
    const root = regionMap.indexOf(region);
    if (root < 0) return { valid: false, reason: `region ${region} is missing.` };
    const seen = new Set<number>([root]);
    const queue = [root];
    while (queue.length > 0) {
      const index = queue.shift()!;
      const row = Math.floor(index / size);
      const column = index % size;
      const neighbors = [
        row > 0 ? index - size : -1,
        row + 1 < size ? index + size : -1,
        column > 0 ? index - 1 : -1,
        column + 1 < size ? index + 1 : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && regionMap[neighbor] === region && !seen.has(neighbor)) {
          seen.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    if (seen.size !== counts[region]) return { valid: false, reason: `region ${region} is not 4-neighbor connected.` };
  }
  return { valid: true };
}

export function isValidEquiReignRegionMap(size: BoardSize, regionMap: readonly number[]): boolean {
  return validateEquiReignRegionMap(size, regionMap).valid;
}
