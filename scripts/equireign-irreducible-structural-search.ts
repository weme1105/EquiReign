/**
 * Research-only exhaustive search for irreducible EquiReign placements.
 *
 * The search works directly on the permutation p[row] = column.
 * Legal adjacency is |p[r] - p[r+1]| > 1.
 *
 * For a row whose queen is value c, deleting that row/column is obstructed iff:
 * - the values c-1 and c+1 occur in adjacent rows (value-midpoint witness), or
 * - the two neighboring row values become consecutive after compression.
 *
 * Under the legal-adjacency rule, the second condition is equivalent to the
 * two neighboring values differing by exactly one.  Thus every value must be
 * covered by at least one witness edge (with endpoint exceptions handled at
 * the two ends of the row path).
 *
 * The important pruning rule is that an unresolved midpoint witness can only
 * be created by placing its two endpoint values consecutively. If one endpoint
 * is already placed and is no longer the current tail, that witness can never
 * be created later. Likewise, if both endpoints are already placed and the
 * witness edge was not used, the branch is impossible.
 *
 * This is deliberately kept as a script instead of production Game Core.
 */

const sizeArg = Number(process.argv.find((arg) => /^--size=\d+$/.test(arg))?.split('=')[1] ?? 19);
const countAll = process.argv.includes('--count');

if (!Number.isInteger(sizeArg) || sizeArg < 1 || sizeArg > 20) {
  throw new Error('--size must be an integer in 1..20');
}

interface SearchStats {
  nodes: number;
  irreducible: number;
  firstValues: readonly number[];
}

function search(size: number, enumerateAll: boolean): SearchStats {
  const path = Array<number>(size);
  const firstValues: number[] = [];
  let nodes = 0;
  let irreducible = 0;

  const feasibleNeeds = (
    needMask: number,
    witnessMask: number,
    usedMask: number,
    tail: number,
  ): boolean => {
    let unresolved = needMask & ~witnessMask;
    while (unresolved !== 0) {
      const bit = unresolved & -unresolved;
      const c = 31 - Math.clz32(bit);
      unresolved ^= bit;

      if (c === 0 || c === size - 1) return false;
      const requiredEndpoints = (1 << (c - 1)) | (1 << (c + 1));
      const endpointCount = popcount(usedMask & requiredEndpoints);

      // Both endpoints are already behind the tail: their adjacency can no
      // longer be introduced, so this witness can never be satisfied.
      if (endpointCount === 2) return false;

      // Exactly one endpoint is already used. The only way to complete the
      // witness is to put the other endpoint immediately after the current
      // tail, and therefore the used endpoint must itself be the tail.
      if (endpointCount === 1 && (requiredEndpoints & (1 << tail)) === 0) return false;
    }
    return true;
  };

  const visit = (
    usedMask: number,
    witnessMask: number,
    needMask: number,
    previousPrevious: number,
    previous: number,
    depth: number,
  ): void => {
    nodes += 1;

    if (depth === size) {
      const finalNeed = needMask | (1 << path[0]!) | (1 << path[size - 1]!);
      if ((finalNeed & ~witnessMask) === 0) {
        irreducible += 1;
        if (!enumerateAll) throw new FoundSolution(path.slice());
      }
      return;
    }

    for (let candidate = 0; candidate < size; candidate += 1) {
      if ((usedMask & (1 << candidate)) !== 0) continue;
      if (Math.abs(previous - candidate) <= 1) continue;

      let nextWitnessMask = witnessMask;
      if (Math.abs(previous - candidate) === 2) {
        const center = Math.min(previous, candidate) + 1;
        if (center > 0 && center < size - 1) nextWitnessMask |= 1 << center;
      }

      let nextNeedMask = needMask & ~nextWitnessMask;

      if (depth === 1) {
        const first = path[0]!;
        if ((nextWitnessMask & (1 << first)) === 0) nextNeedMask |= 1 << first;
      } else {
        const center = previous;
        if (Math.abs(previousPrevious - candidate) !== 1 && (nextWitnessMask & (1 << center)) === 0) {
          nextNeedMask |= 1 << center;
        }
      }

      const nextUsedMask = usedMask | (1 << candidate);
      if (!feasibleNeeds(nextNeedMask, nextWitnessMask, nextUsedMask, candidate)) continue;

      path[depth] = candidate;
      visit(
        nextUsedMask,
        nextWitnessMask,
        nextNeedMask,
        previous,
        candidate,
        depth + 1,
      );
    }
  };

  // Column reflection maps p to (size-1-p), preserving legality and
  // irreducibility. Therefore first-column <= its reflection is a complete
  // symmetry-breaking condition.
  for (let first = 0; first <= Math.floor((size - 1) / 2); first += 1) {
    firstValues.push(first);
    path[0] = first;
    try {
      visit(1 << first, 0, 0, -1, first, 1);
    } catch (error) {
      if (error instanceof FoundSolution && !enumerateAll) {
        console.log(JSON.stringify({ size, solution: error.solution, nodes }));
        return { nodes, irreducible: 1, firstValues };
      }
      throw error;
    }
  }

  return { nodes, irreducible, firstValues };
}

class FoundSolution extends Error {
  constructor(readonly solution: readonly number[]) {
    super('found irreducible solution');
  }
}

function popcount(value: number): number {
  let count = 0;
  let remaining = value >>> 0;
  while (remaining !== 0) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
}

const result = search(sizeArg, countAll);
console.log(JSON.stringify(result));
