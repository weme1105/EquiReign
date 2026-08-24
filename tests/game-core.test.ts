import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoard, withCell } from '../src/game-core/board.ts';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { costTier, rankSolverCosts } from '../src/game-core/complexity.ts';
import { rankPuzzlePool, selectLevel, type PuzzlePoolCandidate } from '../src/game-core/levels.ts';
import { createInfinitePresentation, isLostCell } from '../src/game-core/infinite.ts';
import { campaignDifficulty, campaignStage, challengeNextLevel, completeCampaignLevel, completeChallengeLevel, createPlayerProgress, isChallengeUnlocked, PUZZLE_POOL_TARGETS, recordFirstClear, resolveChallengeSelection } from '../src/game-core/progression.ts';
import { RegionPuzzleGenerator } from '../src/game-core/generator.ts';
import { validatePuzzle } from '../src/game-core/puzzle.ts';
import { findRuleConflicts, validateCompletedBoard } from '../src/game-core/rules.ts';
import { createGameSession, cycleCell, isGivenQueen, placeQueen, queenFeasibilityErrors, requestHint, restart, toPuzzleResult, toggleExcluded, undo } from '../src/game-core/session.ts';
import { analyzeSolutions, countSolutions, extractFirstSolution, findLogicalHint } from '../src/game-core/solver.ts';
import type { BoardSnapshot, Difficulty, PuzzleDefinition } from '../src/game-core/types.ts';
import { BOARD_SIZES, DIFFICULTY_ORDER, getPuzzle } from '../src/puzzles/catalog.ts';
import { decodeSession, encodeSession } from '../src/storage/session-codec.ts';
import { decodeProgress, encodeProgress } from '../src/storage/progress-codec.ts';

test('campaign advances every 200 levels and becomes infinite after level 1000', () => {
  assert.equal(campaignStage(1), 'beginner');
  assert.equal(campaignStage(200), 'beginner');
  assert.equal(campaignStage(201), 'intermediate');
  assert.equal(campaignStage(401), 'advanced');
  assert.equal(campaignStage(601), 'expert');
  assert.equal(campaignStage(801), 'king');
  assert.equal(campaignStage(1001), 'infinite');
  assert.equal(campaignDifficulty(1001), 'king');
  assert.equal(campaignDifficulty(1005), 'king');
  assert.equal(campaignDifficulty(1006), 'king');
  assert.deepEqual(PUZZLE_POOL_TARGETS, { beginner: 100, intermediate: 200, advanced: 300, expert: 400, king: 500, infinite: 1000 });
});

test('infinite lost cells remain presentation-only and may contain a correct crown', () => {
  const puzzle = getPuzzle('king', 6);
  const solution = extractFirstSolution(createBoard(puzzle))!;
  const crown = solution[0]!;
  const crownIndex = crown.row * puzzle.size + crown.column;
  const randomValues = Array.from({ length: 36 }, (_, index) => index === crownIndex ? 0 : .5);
  const presentation = createInfinitePresentation(6, 1, randomValues);
  assert.equal(isLostCell(presentation, 6, crown), true);
  assert.equal(countSolutions(createBoard(puzzle), 2), 1, 'presentation loss must not alter the solver board');
});

test('challenge unlocks after beginner campaign and tracks every difficulty-size pair independently', () => {
  let progress = createPlayerProgress();
  assert.equal(isChallengeUnlocked(progress), false);
  for (let level = 1; level <= 200; level += 1) progress = completeCampaignLevel(progress, level);
  assert.equal(isChallengeUnlocked(progress), true);
  const expert8 = { difficulty: 'expert', size: 8 } as const;
  const expert9 = { difficulty: 'expert', size: 9 } as const;
  progress = completeChallengeLevel(progress, expert8, 1);
  assert.equal(challengeNextLevel(progress, expert8), 2);
  assert.equal(challengeNextLevel(progress, expert9), 1);
  assert.deepEqual(decodeProgress(encodeProgress(progress)), progress);
});

test('challenge selection supports independently random difficulty and board size', () => {
  assert.deepEqual(resolveChallengeSelection({ difficulty: 'random', size: 'random', difficultyRandomValue: .99, sizeRandomValue: 0 }), { difficulty: 'king', size: 6 });
  assert.deepEqual(resolveChallengeSelection({ difficulty: 'advanced', size: 'random', sizeRandomValue: .99 }), { difficulty: 'advanced', size: 12 });
});

test('a successful replay never overwrites the first clear result', () => {
  const initial = createPlayerProgress();
  const first = { elapsedTimeMs: 12_000, hintsUsed: 2, completedAtMs: 100_000 };
  const saved = recordFirstClear(initial, 'campaign:10', first);
  const replayed = recordFirstClear(saved, 'campaign:10', { elapsedTimeMs: 8_000, hintsUsed: 0, completedAtMs: 200_000 });
  assert.equal(replayed, saved);
  assert.deepEqual(replayed.firstClearResults['campaign:10'], first);
});

test('difficulty and board size combine independently into valid unique puzzles', () => {
  for (const difficulty of DIFFICULTY_ORDER) for (const size of BOARD_SIZES) {
    const puzzle = getPuzzle(difficulty, size);
    assert.equal(puzzle.size, size);
    assert.doesNotThrow(() => validatePuzzle(puzzle));
    assert.equal(puzzle.givenQueens.length, DIFFICULTIES[difficulty].givenQueenCount);
    assert.equal(countSolutions(createBoard(puzzle), 2), 1);
  }
});

test('rule conflicts use row, column, region and adjacency, not full diagonals', () => {
  const puzzle = getPuzzle('advanced');
  let board = createBoard(puzzle);
  board = withCell(board, { row: 0, column: 0 }, 'queen');
  board = withCell(board, { row: 2, column: 2 }, 'queen');
  assert.equal(findRuleConflicts(board).reasons.has('adjacent'), false, 'distant diagonal is legal');

  board = withCell(createBoard(puzzle), { row: 0, column: 0 }, 'queen');
  board = withCell(board, { row: 1, column: 1 }, 'queen');
  assert.equal(findRuleConflicts(board).reasons.has('adjacent'), true);

  const sameRegion = puzzle.regionMap.findIndex((region, index) => index > 0 && region === puzzle.regionMap[0]);
  board = withCell(createBoard(puzzle), { row: 0, column: 0 }, 'queen');
  board = withCell(board, { row: Math.floor(sameRegion / puzzle.size), column: sameRegion % puzzle.size }, 'queen');
  assert.equal(findRuleConflicts(board).reasons.has('region'), true);
});

test('solution counter respects player X and forced queens', () => {
  const puzzle = getPuzzle('advanced');
  const board = createBoard(puzzle);
  const solution = extractFirstSolution(board)!;
  assert.equal(solution.length, puzzle.size);
  const queen = solution[0]!;
  assert.equal(countSolutions(withCell(board, queen, 'excluded'), 1), 0);
  assert.equal(countSolutions(withCell(board, queen, 'queen'), 1), 1);
});

test('solution analysis reports deterministic DFS operation costs', () => {
  const puzzle = getPuzzle('expert', 8); const board = createBoard(puzzle);
  const first = analyzeSolutions(board, 2); const second = analyzeSolutions(board, 2);
  assert.deepEqual(first, second);
  assert.equal(first.solutionCount, 1);
  assert.ok(first.metrics.nodesVisited > 0);
  assert.ok(first.metrics.branchesTried > 0);
  assert.ok(first.metrics.backtracks > 0);
});

test('same-size solver costs receive weighted percentile tiers', () => {
  const ranked = rankSolverCosts([
    { nodesVisited: 10, branchesTried: 10, backtracks: 1, memoHits: 0 },
    { nodesVisited: 20, branchesTried: 20, backtracks: 2, memoHits: 0 },
    { nodesVisited: 30, branchesTried: 30, backtracks: 3, memoHits: 0 },
    { nodesVisited: 40, branchesTried: 40, backtracks: 4, memoHits: 0 },
    { nodesVisited: 50, branchesTried: 50, backtracks: 5, memoHits: 0 },
  ]);
  assert.deepEqual(ranked.map((item) => item.score), [0, 25, 50, 75, 100]);
  assert.deepEqual(ranked.map((item) => item.tier), ['beginner', 'intermediate', 'advanced', 'expert', 'king']);
  assert.equal(costTier(85), 'king');
});

test('level selection fixes every tenth level and randomizes the others without immediate repeats', () => {
  const source = getPuzzle('expert', 8);
  const candidates: PuzzlePoolCandidate[] = [10, 20, 30, 40, 50, 60].map((cost, index) => ({
    id: `candidate-${index}`, size: 8, regionMap: source.regionMap, solution: extractFirstSolution(createBoard(source))!,
    solverMetrics: { nodesVisited: cost, branchesTried: cost, backtracks: cost, memoHits: 0 },
  }));
  const ranked = rankPuzzlePool(candidates);
  const random = selectLevel(ranked, { level: 1, size: 8, difficulty: 'expert', randomValue: 0 });
  const next = selectLevel(ranked, { level: 2, size: 8, difficulty: 'expert', randomValue: 0, previousPuzzleId: random.puzzle.id });
  assert.notEqual(next.puzzle.id, random.puzzle.id);
  assert.equal(random.replayAllowed, false);
  const bossA = selectLevel(ranked, { level: 10, size: 8, difficulty: 'king' });
  const bossB = selectLevel(ranked, { level: 10, size: 8, difficulty: 'king', randomValue: .99 });
  assert.equal(bossA.puzzle.id, bossB.puzzle.id);
  assert.equal(bossA.isFixed, true);
  assert.equal(bossA.replayAllowed, true);
});

test('given queens are immutable and never enter history', () => {
  const session = createGameSession(getPuzzle('beginner'), 100);
  const given = session.puzzle.givenQueens[0]!;
  assert.equal(isGivenQueen(session, given), true);
  assert.equal(cycleCell(session, given), session);
  assert.equal(session.history.length, 0);
});

test('tap cycles Empty to X to Queen to Empty and undo restores the board', () => {
  const position = { row: 0, column: 0 };
  let session = createGameSession(getPuzzle('advanced'), 100);
  session = cycleCell(session, position, 101);
  assert.equal(session.boardState.cells[0], 'excluded');
  session = cycleCell(session, position, 102);
  assert.equal(session.boardState.cells[0], 'queen');
  session = cycleCell(session, position, 103);
  assert.equal(session.boardState.cells[0], 'empty');
  session = undo(session);
  assert.equal(session.boardState.cells[0], 'queen');
});

test('restart removes player state and retains given queens', () => {
  let session = createGameSession(getPuzzle('beginner'), 100);
  session = toggleExcluded(session, { row: 0, column: 0 }, 101);
  const reset = restart(session, 200);
  assert.equal(reset.history.length, 0);
  assert.equal(reset.hintsUsed, 0);
  assert.equal(reset.startedAtMs, 200);
  for (const given of reset.puzzle.givenQueens) assert.equal(reset.boardState.cells[given.row * reset.puzzle.size + given.column], 'queen');
});

test('easy difficulties expose feasibility errors while Expert and King do not', () => {
  for (const difficulty of ['beginner', 'intermediate', 'advanced'] as Difficulty[]) {
    let session = createGameSession(getPuzzle(difficulty));
    const solution = extractFirstSolution(session.boardState)!;
    const target = solution.find(({ row, column }) => !isGivenQueen(session, { row, column }))!;
    const wrongColumn = (target.column + 1) % session.puzzle.size;
    session = placeQueen(session, { row: target.row, column: wrongColumn });
    assert.ok(queenFeasibilityErrors(session).size > 0);
  }
  for (const difficulty of ['expert', 'king'] as Difficulty[]) {
    const session = placeQueen(createGameSession(getPuzzle(difficulty)), { row: 0, column: 0 });
    assert.equal(queenFeasibilityErrors(session).size, 0);
  }
});

test('hint is solver-derived, non-revealing, limited to three and cleared by board action', () => {
  let session = createGameSession(getPuzzle('expert'));
  assert.ok(findLogicalHint(session.boardState));
  session = requestHint(session);
  assert.ok(session.hintTarget);
  assert.equal(session.boardState.cells.every((state) => state === 'empty'), true);
  const firstTarget = session.hintTarget!;
  session = cycleCell(session, firstTarget);
  assert.equal(session.hintTarget, null);
  session = requestHint(session);
  session = cycleCell(session, session.hintTarget!);
  session = requestHint(session);
  assert.equal(session.hintsUsed, 3);
  assert.equal(requestHint(session), session);
});

test('hint is not charged when current board has no solution', () => {
  let session = createGameSession(getPuzzle('expert'));
  session = placeQueen(session, { row: 0, column: 0 });
  session = placeQueen(session, { row: 0, column: 1 });
  const hinted = requestHint(session);
  assert.equal(hinted.hintsUsed, 0);
  assert.equal(hinted.hintTarget, null);
});

test('completion requires a full legal Region board and produces a timed result', () => {
  let session = createGameSession(getPuzzle('advanced'), 1000);
  const solution = extractFirstSolution(session.boardState)!;
  solution.forEach((position, index) => { session = placeQueen(session, position, 1100 + index); });
  assert.equal(validateCompletedBoard(session.boardState), true);
  assert.equal(session.status, 'completed');
  const result = toPuzzleResult(session, 9999);
  assert.equal(result.completed, true);
  assert.equal(result.elapsedTimeMs, session.completedAtMs! - 1000);
});

test('a full but invalid board stays playing and exposes completion error', () => {
  let session = createGameSession(getPuzzle('advanced'));
  for (let row = 0; row < session.puzzle.size; row += 1) session = placeQueen(session, { row, column: row });
  assert.equal(session.status, 'playing');
  assert.equal(session.completionError, true);
});

test('deterministic generator fulfills the PuzzleGenerator contract', () => {
  const generated = new RegionPuzzleGenerator().generate(6, 20260824);
  const board: BoardSnapshot = { size: 6, regionMap: generated.regionMap, cells: Array.from({ length: 36 }, () => 'empty') };
  assert.equal(new Set(generated.regionMap).size, 6);
  assert.equal(countSolutions(board, 2), 1);
  assert.equal(generated.solution.length, 6);
  assert.deepEqual(generated.solverMetrics, analyzeSolutions(board, 2).metrics);
});

test('invalid region definitions are rejected', () => {
  const invalid: PuzzleDefinition = { ...getPuzzle('advanced'), regionMap: Array.from({ length: 64 }, () => 0) };
  assert.throws(() => validatePuzzle(invalid), /region ids/);
});

test('active sessions survive a versioned local save round trip', () => {
  let session = createGameSession(getPuzzle('expert', 12), 1234);
  session = cycleCell(session, { row: 0, column: 0 }, 2000);
  session = requestHint(session);
  assert.deepEqual(decodeSession(encodeSession(session, 3000)), session);
});

test('corrupt or structurally invalid local saves are ignored', () => {
  assert.equal(decodeSession('{not-json'), null);
  const session = createGameSession(getPuzzle('beginner', 6));
  const invalid = JSON.stringify({ version: 1, savedAtMs: Date.now(), session: { ...session, hintsUsed: 99 } });
  assert.equal(decodeSession(invalid), null);
});
