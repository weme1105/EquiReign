  const regions = Array<number>(total).fill(-1);
  const cellsByRegion = Array.from({ length: size }, () => new Set<number>());
  const queenRegionAt = Array<number>(total).fill(-1);
  for (let row = 0; row < size; row += 1) {
    const index = row * size + solution[row]!;
    regions[index] = row;
    queenRegionAt[index] = row;
    cellsByRegion[row]!.add(index);
  }

  const maps: number[][] = [];
  let attempts = 0;
  const nextUnassigned = () => {
    for (let index = 0; index < total; index += 1) if (regions[index] < 0) return index;
    return -1;
  };
  const neighbors = (index: number): number[] => {
    const row = Math.floor(index / size); const column = index % size;
    const result: number[] = [];
    if (row > 0) result.push(index - size);
    if (row + 1 < size) result.push(index + size);
    if (column > 0) result.push(index - 1);
    if (column + 1 < size) result.push(index + 1);
    return result;
  };
  const connected = (region: Set<number>): boolean => {
    if (region.size === 0) return false;
    const start = region.values().next().value;
    if (start === undefined) return false;
    const queue = [start]; const visited = new Set<number>([start]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const next of neighbors(queue[cursor]!)) if (region.has(next) && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
    return visited.size === region.size;
  };

  const visit = () => {
    if (maps.length >= target) return;
    const index = nextUnassigned();
    if (index < 0) {
      attempts += 1;
      if (!cellsByRegion.every((region) => region.size > 0 && connected(region))) return;
      const canonical = canonicalRegionMap(regions);
      const key = canonical.join(',');
      if (globalSeen.has(key)) return;
      globalSeen.add(key);
      maps.push(canonical);
      return;
    }

    // Lexicographic enumeration: try every region that touches this cell.
    const candidates = new Set<number>();
    for (const neighbor of neighbors(index)) if (regions[neighbor]! >= 0) candidates.add(regions[neighbor]!);
    for (const region of [...candidates].sort((a, b) => a - b)) {
      const queenIndex = solution[region]! + region * size;
      if (queenIndex === index || cellsByRegion[region]!.has(queenIndex)) continue;
      regions[index] = region;
      cellsByRegion[region]!.add(index);
      // A region may never absorb another queen.
      const row = Math.floor(index / size);
      if (solution[row] === index % size) {
        regions[index] = -1;
        cellsByRegion[region]!.delete(index);
        continue;
      }
      visit();
      cellsByRegion[region]!.delete(index);
      regions[index] = -1;
      if (maps.length >= target) return;
    }
  };

  visit();
  return { maps, attempts };
}