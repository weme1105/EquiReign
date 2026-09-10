/**
 * Research-only exhaustive search for irreducible EquiReign placements.
 *
 * The search works directly on the permutation p[row] = column.
 * Legal adjacency is |p[r] - p[r+1]| > 1.
 *
 * An irreducible placement must have a deletion obstruction for every row.
 * Under the EquiReign adjacency rule, each obstruction is represented by a
 * local witness: either values c-1 and c+1 are consecutive in the row path,
 * or the two neighbors of c differ by exactly one. Endpoint rows can only
 * use the first kind of witness.
 *
 * The DFS uses two important optimizations:
 * - legal-next candidates are maintained as a precomputed bitset;
 * - if an unresolved midpoint witness has exactly one endpoint already used,
 *   that endpoint must be the current tail, so the other endpoint is forced as
 *   the next candidate.
 *
 * By default a D4-safe symmetry reduction is used. `--no-symmetry` disables
 * it so that the returned irreducible count is the full count. `--first=N`
 * can be used to shard the search by first-row column.
 *
 * This deliberately stays outside production Game Core.
 */

const sizeArg = Number(process.argv.find((arg) => /^--size=\d+$/.test(arg))?.split('=')[1] ?? 19);
const countAll = process.argv.includes('--count');
const noSymmetry = process.argv.includes('--no-symmetry');
const firstArg = process.argv.find((arg) => /^--first=\d+$/.test(arg));
const firstFilter = firstArg === undefined ? undefined : Number(firstArg.split('=')[1]);

if (!Number.isInteger(sizeArg) || sizeArg < 1 || sizeArg > 20) {
  throw new Error('--size must be an integer in 1..20');
}
if (firstFilter !== undefined && (!Number.isInteger(firstFilter) || firstFilter < 0 || firstFilter >= sizeArg)) {
  throw new Error('--first must be an integer in 0..size-1');
}

interface SearchStats {
  nodes: number;
  irreducible: number;
  firstValues: readonly number[];
}

function search(size: number, enumerateAll: boolean, symmetryReduction: boolean, requestedFirst?: number): SearchStats {
  const path = Array<number>(size);
  const firstValues: number[] = [];
  let nodes = 0;
  let irreducible = 0;

  const legalNextMask = Array<number>(size).fill(0);
  const allMask = (1 << size) - 1;
  for (let value = 0; value < size; value += 1) {
    let mask = allMask & ~(1 << value);
    if (value > 0) mask &= ~(1 << (value - 1));
    if (value + 1 < size) mask &= ~(1 << (value + 1));
    legalNextMask[value] = mask;
  }

  // Returns -1 for an impossible state, null when no witness is currently
  // forced, or the unique next value that must be appended.
  const forcedCandidate = (
    needMask: number,
    witnessMask: number,
    usedMask: number,
    tail: number,
  ): number | null => {
    let unresolved = needMask & ~witnessMask;
    let forced = -1;

    while (unresolved !== 0) {
      const bit = unresolved & -unresolved;
      const center = 31 - Math.clz32(bit);
      unresolved ^= bit;

      if (center === 0 || center === size - 1) return -1;

      const endpoints = (1 << (center - 1)) | (1 << (center + 1));
      const usedEndpoints = usedMask & endpoints;
      if (usedEndpoints === endpoints) return -1;

      if (usedEndpoints !== 0) {
        // Exactly one endpoint is used. It has to be the tail, and the other
        // endpoint must be a legal immediate successor.
        if ((usedEndpoints & (1 << tail)) === 0) return -1;
        const remaining = endpoints & ~usedEndpoints;
        const remainingValue = 31 - Math.clz32(remaining);
        if ((legalNextMask[tail] & (1 << remainingValue)) === 0) return -1;
        if (forced >= 0 && forced !== remainingValue) return -1;
        forced = remainingValue;
      }
    }

    return forced >= 0 ? forced : null;
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

    const forced = forcedCandidate(needMask, witnessMask, usedMask, previous);
    if (forced === -1) return;

    let candidates = forced === null
      ? legalNextMask[previous] & ~usedMask
      : 1 << forced;

    while (candidates !== 0) {
      const candidateBit = candidates & -candidates;
      candidates ^= candidateBit;
      const candidate = 31 - Math.clz32(candidateBit);

      if (symmetryReduction) {
        // D4 symmetry breaking. If the first value is f, transposition maps
        // it to position(0), and reflection maps each coordinate to size-1-x.
        // A representative exists with f <= position(0) <= size-1-f.
        const first = path[0]!;
        if (candidate === 0 && (depth < first || depth > size - 1 - first)) continue;
      }

      let nextWitnessMask = witnessMask;
      if (candidate - previous === 2 || previous - candidate === 2) {
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

      const nextUsedMask = usedMask | candidateBit;
      path[depth] = candidate;

      if (forcedCandidate(nextNeedMask, nextWitnessMask, nextUsedMask, candidate) !== -1) {
        visit(
          nextUsedMask,
          nextWitnessMask,
          nextNeedMask,
          previous,
          candidate,
          depth + 1,
        );
      }
    }
  };

  const minFirst = requestedFirst ?? (symmetryReduction ? 0 : 0);
  const maxFirst = requestedFirst ?? (symmetryReduction ? Math.floor((size - 1) / 2) : size - 1);
  for (let first = minFirst; first <= maxFirst; first += 1) {
    firstValues.push(first);
    path[0] = first;
    try {
      visit(1 << first, 0, 0, -1, first, 1);
    } catch (error) {
      if (error instanceof FoundSolution && !enumerateAll) {
        console.log(JSON.stringify({ size, solution: error.solution, nodes, first }));
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

const result = search(sizeArg, countAll, !noSymmetry, firstFilter);
console.log(JSON.stringify(result));
