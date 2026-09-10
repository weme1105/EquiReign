import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Research/catalogue asset builder for the observed 4k irreducible family.
 *
 * This intentionally generates solution-board artwork, not playable region
 * puzzles. The family is exhaustively matched at 8, 12, 16 and 20 in the
 * research branch; the all-N claim remains a computational hypothesis.
 */
const size = positiveInteger(process.argv[2] ?? '20', 'size');
const outputDir = resolve(process.argv[3] ?? `artifacts/irreducible-${size}x${size}`);
if (size % 4 !== 0) throw new Error('The 4-block family exists only for size divisible by 4.');

const blockCount = size / 4;
const A = [1, 3, 0, 2] as const;
const B = [2, 0, 3, 1] as const;
const solutions: number[][] = [];
const bandPermutation = Array<number>(blockCount);
const usedBands = new Set<number>();
const blockChoices = Array<number>(blockCount);

await mkdir(outputDir, { recursive: true });
enumerateBandPermutations(0);

const manifest = {
  version: 1,
  family: '4x4-block-ab',
  size,
  solutionCount: solutions.length,
  generatedAt: new Date().toISOString(),
  solutions: solutions.map((solution, index) => {
    const id = solutionId(solution);
    const file = `${String(index + 1).padStart(4, '0')}-${id}.svg`;
    return { index: index + 1, id, file, solution };
  }),
};

for (const entry of manifest.solutions) {
  await writeFile(resolve(outputDir, entry.file), renderSvg(size, entry.solution), 'utf8');
}
await writeFile(resolve(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${solutions.length} solution images and manifest to ${outputDir}\n`);

function enumerateBandPermutations(rowBlock: number): void {
  if (rowBlock === blockCount) {
    for (let choiceMask = 0; choiceMask < (1 << blockCount); choiceMask += 1) {
      for (let block = 0; block < blockCount; block += 1) blockChoices[block] = (choiceMask >>> block) & 1;
      const solution = buildSolution();
      validateSolution(solution);
      solutions.push(solution);
    }
    return;
  }

  for (let band = 0; band < blockCount; band += 1) {
    if (usedBands.has(band)) continue;
    usedBands.add(band);
    bandPermutation[rowBlock] = band;
    enumerateBandPermutations(rowBlock + 1);
    usedBands.delete(band);
  }
}

function buildSolution(): number[] {
  const solution = Array<number>(size);
  for (let rowBlock = 0; rowBlock < blockCount; rowBlock += 1) {
    const band = bandPermutation[rowBlock];
    const baseColumn = band * 4;
    const primitive = blockChoices[rowBlock] === 0 ? A : B;
    for (let offset = 0; offset < 4; offset += 1) {
      solution[rowBlock * 4 + offset] = baseColumn + primitive[offset]!;
    }
  }
  return solution;
}

function validateSolution(solution: readonly number[]): void {
  if (solution.length !== size) throw new Error('Invalid solution length.');
  const seen = new Set(solution);
  if (seen.size !== size) throw new Error('Solution repeats a column.');
  for (let row = 1; row < size; row += 1) {
    if (Math.abs(solution[row]! - solution[row - 1]!) <= 1) throw new Error(`Adjacent-row conflict at row ${row}.`);
  }
}

function solutionId(solution: readonly number[]): string {
  return createHash('sha256').update(solution.join(',')).digest('hex').slice(0, 16);
}

function renderSvg(boardSize: number, solution: readonly number[]): string {
  const cell = 32;
  const margin = 12;
  const board = boardSize * cell;
  const width = board + margin * 2;
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${width}" role="img" aria-label="EquiReign ${boardSize} by ${boardSize} solution">`);
  lines.push(`<rect width="${width}" height="${width}" fill="#ffffff"/>`);
  lines.push(`<g transform="translate(${margin} ${margin})">`);
  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
      const x = column * cell;
      const y = row * cell;
      const fill = (row + column) % 2 === 0 ? '#f4f4f5' : '#e4e4e7';
      lines.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${fill}"/>`);
    }
  }
  lines.push(`<g fill="none" stroke="#18181b" stroke-width="1">`);
  for (let i = 0; i <= boardSize; i += 1) {
    const p = i * cell;
    lines.push(`<path d="M ${p} 0 V ${board}"/>`);
    lines.push(`<path d="M 0 ${p} H ${board}"/>`);
  }
  lines.push(`</g>`);
  for (let row = 0; row < boardSize; row += 1) {
    const column = solution[row]!;
    const cx = column * cell + cell / 2;
    const cy = row * cell + cell / 2;
    lines.push(`<circle cx="${cx}" cy="${cy}" r="${cell * 0.27}" fill="#18181b"/>`);
    lines.push(`<path d="M ${cx - cell * 0.34} ${cy + cell * 0.25} H ${cx + cell * 0.34}" stroke="#ffffff" stroke-width="${cell * 0.07}" stroke-linecap="round"/>`);
  }
  lines.push(`</g>`);
  lines.push(`</svg>`);
  return `${lines.join('\n')}\n`;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
