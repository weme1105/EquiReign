import { cellIndex, createBoard, isInside, positionKey, positionsWithState, withCell } from './board.ts';
import { DIFFICULTIES } from './difficulty.ts';
import { validatePuzzle } from './puzzle.ts';
import { hasCompleteQueenCount, validateCompletedBoard } from './rules.ts';
import { findLogicalHint, extractFirstSolution, canCompleteWithQueen } from './solver.ts';
import { createInfinitePresentation } from './infinite.ts';
import { createFrozenPresentation, resolveFrozenCells } from './frozen.ts';
import type { CellState, GameSession, Position, PuzzleDefinition, PuzzleResult } from './types.ts';

const NEXT_STATE: Readonly<Record<CellState, CellState>> = { empty: 'excluded', excluded: 'queen', queen: 'empty' };

export function createGameSession(puzzle: PuzzleDefinition, nowMs = Date.now(), context: { readonly playMode?: GameSession['playMode']; readonly campaignLevel?: number | null } = {}): GameSession {
  validatePuzzle(puzzle);
  return { puzzle, difficulty: puzzle.difficulty, boardState: createBoard(puzzle), history: [], hintsUsed: 0, hintTarget: null, startedAtMs: nowMs, completedAtMs: null, status: 'ready', completionError: false, excludedPositionKeysUsed: [], playMode: context.playMode ?? 'free', campaignLevel: context.campaignLevel ?? null, lostCellIndexes: [], frozenCellIndexes: [], revealedFrozenCellIndexes: [] };
}

export function configureInfiniteSession(session: GameSession): GameSession {
  const solution = extractFirstSolution(session.boardState); if (!solution) throw new Error('Infinite mode requires a solvable puzzle.');
  const size = session.puzzle.size as 6 | 7 | 8 | 9 | 10 | 11 | 12; const random = seededRandom((session.campaignLevel ?? 1001) * 1009 + size); const variant = Math.floor(random() * 3); const total = variant === 2 ? 2 + Math.floor(random() * (size - 1)) : 1 + Math.floor(random() * size); const lostCount = variant === 1 ? 0 : variant === 0 ? total : 1 + Math.floor(random() * (total - 1)); const frozenCount = variant === 0 ? 0 : total - lostCount; const values = () => Array.from({ length: size * size }, random); const lost = lostCount ? createInfinitePresentation(size, solution, { lostCellCount: lostCount, randomValues: values() }) : { lostCellIndexes: new Set<number>() }; const frozen = frozenCount ? createFrozenPresentation(size, solution, lost.lostCellIndexes, { frozenCellCount: frozenCount, randomValues: values() }) : { frozenCellIndexes: new Set<number>(), revealedCellIndexes: new Set<number>() }; return { ...session, lostCellIndexes: [...lost.lostCellIndexes], frozenCellIndexes: [...frozen.frozenCellIndexes], revealedFrozenCellIndexes: [] };
}

function seededRandom(seed: number): () => number { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4_294_967_296; }; }
export function isGivenQueen(session: GameSession, position: Position): boolean { return session.puzzle.givenQueens.some((given) => given.row === position.row && given.column === position.column); }
export function queenFeasibilityErrors(session: GameSession): ReadonlySet<string> {
  const policy = DIFFICULTIES[session.difficulty];
  if (!policy.realtimeQueenValidation) return new Set<string>();
  const errors = new Set<string>();
  for (const position of positionsWithState(session.boardState, 'queen')) {
    if (isGivenQueen(session, position)) continue;
    if (!canCompleteWithQueen(createBoard(session.puzzle), position)) errors.add(positionKey(position));
  }
  return errors;
}
function withPlayerBoard(session: GameSession, boardState: GameSession['boardState'], nowMs: number): GameSession {
  let revealedFrozenCellIndexes = session.revealedFrozenCellIndexes; let completed: boolean; let completionError = false;
  if (session.lostCellIndexes.length || session.frozenCellIndexes.length) {
    const solution = extractFirstSolution(createBoard(session.puzzle));
    if (!solution) completed = false;
    else { const frozen = resolveFrozenCells(session.puzzle.size as 6 | 7 | 8 | 9 | 10 | 11 | 12, solution, boardState.cells, { frozenCellIndexes: new Set(session.frozenCellIndexes), revealedCellIndexes: new Set(session.revealedFrozenCellIndexes) }, new Set(session.lostCellIndexes)); revealedFrozenCellIndexes = [...frozen.revealedCellIndexes]; const solutionIndexes = new Set(solution.map(({ row, column }) => row * session.puzzle.size + column)); const implicitCrowns = new Set(revealedFrozenCellIndexes.filter((index) => solutionIndexes.has(index))); const visibleExpected = new Set([...solutionIndexes].filter((index) => !session.lostCellIndexes.includes(index))); const visiblePlaced = new Set(boardState.cells.flatMap((cell, index) => cell === 'queen' ? [index] : []).filter((index) => !session.lostCellIndexes.includes(index))); implicitCrowns.forEach((index) => visiblePlaced.add(index)); completed = visiblePlaced.size === visibleExpected.size && [...visiblePlaced].every((index) => visibleExpected.has(index)); }
  } else { const completeCount = hasCompleteQueenCount(boardState); completed = completeCount && validateCompletedBoard(boardState); completionError = completeCount && !completed; }
  return { ...session, boardState, history: [...session.history, { cells: session.boardState.cells, completionError: session.completionError }], hintTarget: null, status: completed ? 'completed' : 'playing', completedAtMs: completed ? nowMs : null, completionError, revealedFrozenCellIndexes };
}
function withExcludedUsage(session: GameSession, position: Position, nextState: CellState): GameSession { if (nextState !== 'excluded') return session; const key = positionKey(position); return session.excludedPositionKeysUsed.includes(key) ? session : { ...session, excludedPositionKeysUsed: [...session.excludedPositionKeysUsed, key] }; }
export function cycleCell(session: GameSession, position: Position, nowMs = Date.now()): GameSession { if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session; const index = cellIndex(session.puzzle.size, position); const nextState = NEXT_STATE[session.boardState.cells[index]!]!; return withPlayerBoard(withExcludedUsage(session, position, nextState), withCell(session.boardState, position, nextState), nowMs); }
export function doubleTapCell(session: GameSession, position: Position, nowMs = Date.now()): GameSession { if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session; const index = cellIndex(session.puzzle.size, position); const current = session.boardState.cells[index]!; const nextState: CellState = current === 'queen' ? 'excluded' : 'queen'; const nextSession = withPlayerBoard(session, withCell(session.boardState, position, nextState), nowMs); return nextState === 'excluded' ? withExcludedUsage(nextSession, position, nextState) : nextSession; }
export function placeQueen(session: GameSession, position: Position, nowMs = Date.now()): GameSession { if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session; const next = session.boardState.cells[cellIndex(session.puzzle.size, position)] === 'queen' ? 'empty' : 'queen'; return withPlayerBoard(session, withCell(session.boardState, position, next), nowMs); }
export function toggleExcluded(session: GameSession, position: Position, nowMs = Date.now()): GameSession { if (session.status === 'completed' || !isInside(session.puzzle.size, position) || isGivenQueen(session, position) || isHiddenSpecialCell(session, position)) return session; const current = session.boardState.cells[cellIndex(session.puzzle.size, position)]; const next = current === 'excluded' ? 'empty' : 'excluded'; return withPlayerBoard(withExcludedUsage(session, position, next), withCell(session.boardState, position, next), nowMs); }
export function undo(session: GameSession): GameSession { const previous = session.history.at(-1); if (!previous) return session; const cells = previous.cells; return { ...session, boardState: { ...session.boardState, cells }, history: session.history.slice(0, -1), status: 'playing', completedAtMs: null, completionError: previous.completionError, hintTarget: null }; }
export function restart(session: GameSession, nowMs = Date.now()): GameSession { return { ...createGameSession(session.puzzle, nowMs, { playMode: session.playMode, campaignLevel: session.campaignLevel }), lostCellIndexes: session.lostCellIndexes, frozenCellIndexes: session.frozenCellIndexes }; }
export function requestHint(session: GameSession, nowMs = Date.now()): GameSession { const policy = DIFFICULTIES[session.difficulty]; if (session.hintsUsed >= policy.hintLimit || session.hintTarget) return session; const result = findLogicalHint(session.boardState); if (!result) return session; return { ...session, hintsUsed: session.hintsUsed + 1, hintTarget: result, status: 'playing', startedAtMs: session.startedAtMs || nowMs }; }
export function isHiddenSpecialCell(session: GameSession, position: Position): boolean { const index = cellIndex(session.puzzle.size, position); return session.lostCellIndexes.includes(index) || (session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index)); }
export function toPuzzleResult(session: GameSession, nowMs = Date.now()): PuzzleResult { const end = session.completedAtMs ?? nowMs; const elapsedTimeMs = Math.max(0, end - session.startedAtMs); const excludedCount = positionsWithState(session.boardState, 'excluded').length; const effectiveExcludedCount = session.excludedPositionKeysUsed.filter((key) => { const [row, column] = key.split(',').map(Number); return Number.isInteger(row) && Number.isInteger(column) && session.boardState.cells[cellIndex(session.puzzle.size, { row, column })] === 'excluded'; }).length; return { puzzleId: session.puzzle.id, difficulty: session.difficulty, size: session.puzzle.size, elapsedTimeMs, hintsUsed: session.hintsUsed, effectiveExcludedCount, limitedXClear: excludedCount === 0, completed: session.status === 'completed' }; }
