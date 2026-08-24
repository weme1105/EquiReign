import type { BoardSize, Difficulty } from './types.ts';

export type CampaignStage = Difficulty | 'infinite';

export interface PlayerProgress {
  /** Highest campaign level completed. Level 1 is available when this is zero. */
  readonly completedCampaignLevel: number;
  /** Successful clears for every independently tracked challenge combination. */
  readonly challengeSuccessCounts: Readonly<Record<string, number>>;
  /** Immutable first-success results. Replays never overwrite an existing key. */
  readonly firstClearResults: Readonly<Record<string, FirstClearResult>>;
}

export interface FirstClearResult {
  readonly elapsedTimeMs: number;
  readonly hintsUsed: number;
  readonly completedAtMs: number;
}

export interface ChallengeSelection {
  readonly difficulty: Difficulty;
  readonly size: BoardSize;
}

export const CAMPAIGN_LEVELS_PER_STAGE = 200;
export const CAMPAIGN_FINITE_LEVELS = 1_000;
export const CHALLENGE_UNLOCK_LEVEL = 200;
export const DIFFICULTY_ORDER: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert', 'king'];
export const BOARD_SIZE_ORDER: readonly BoardSize[] = [6, 7, 8, 9, 10, 11, 12];
export const PUZZLE_POOL_TARGETS: Readonly<Record<CampaignStage, number>> = {
  beginner: 100,
  intermediate: 200,
  advanced: 300,
  expert: 400,
  king: 500,
  infinite: 1_000,
};

export function createPlayerProgress(): PlayerProgress {
  return { completedCampaignLevel: 0, challengeSuccessCounts: {}, firstClearResults: {} };
}

export function campaignStage(level: number): CampaignStage {
  assertLevel(level);
  if (level > CAMPAIGN_FINITE_LEVELS) return 'infinite';
  return DIFFICULTY_ORDER[Math.floor((level - 1) / CAMPAIGN_LEVELS_PER_STAGE)]!;
}

export function campaignDifficulty(level: number): Difficulty {
  const stage = campaignStage(level);
  if (stage !== 'infinite') return stage;
  return 'king';
}

/** Beginner introduces sizes gradually; later stages use a stable level-based shuffle. */
export function campaignBoardSize(level: number): BoardSize {
  assertLevel(level);
  if (level <= CAMPAIGN_LEVELS_PER_STAGE) {
    const index = Math.floor((level - 1) * BOARD_SIZE_ORDER.length / CAMPAIGN_LEVELS_PER_STAGE);
    return BOARD_SIZE_ORDER[Math.min(index, BOARD_SIZE_ORDER.length - 1)]!;
  }
  const mixed = Math.imul(level ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return BOARD_SIZE_ORDER[mixed % BOARD_SIZE_ORDER.length]!;
}

export function isChallengeUnlocked(progress: PlayerProgress): boolean {
  return progress.completedCampaignLevel >= CHALLENGE_UNLOCK_LEVEL;
}

export function completeCampaignLevel(progress: PlayerProgress, level: number): PlayerProgress {
  assertLevel(level);
  if (level > progress.completedCampaignLevel + 1) throw new Error('Campaign levels must be completed in order.');
  return level <= progress.completedCampaignLevel
    ? progress
    : { ...progress, completedCampaignLevel: level };
}

export function challengeKey(selection: ChallengeSelection): string {
  return `${selection.difficulty}:${selection.size}`;
}

export function challengeSuccessCount(progress: PlayerProgress, selection: ChallengeSelection): number {
  return progress.challengeSuccessCounts[challengeKey(selection)] ?? 0;
}

export function recordChallengeSuccess(progress: PlayerProgress, selection: ChallengeSelection): PlayerProgress {
  const key = challengeKey(selection);
  const count = challengeSuccessCount(progress, selection) + 1;
  return { ...progress, challengeSuccessCounts: { ...progress.challengeSuccessCounts, [key]: count } };
}

export function recordFirstClear(progress: PlayerProgress, key: string, result: FirstClearResult): PlayerProgress {
  if (!key || progress.firstClearResults[key]) return progress;
  if (!Number.isFinite(result.elapsedTimeMs) || result.elapsedTimeMs < 0
    || !Number.isInteger(result.hintsUsed) || result.hintsUsed < 0
    || !Number.isFinite(result.completedAtMs)) throw new Error('Invalid first-clear result.');
  return { ...progress, firstClearResults: { ...progress.firstClearResults, [key]: result } };
}

/** Resolves fixed or random challenge filters without coupling Domain logic to Math.random. */
export function resolveChallengeSelection(request: {
  readonly difficulty: Difficulty | 'random';
  readonly size: BoardSize | 'random';
  readonly difficultyRandomValue?: number;
  readonly sizeRandomValue?: number;
}): ChallengeSelection {
  return {
    difficulty: request.difficulty === 'random'
      ? pick(DIFFICULTY_ORDER, request.difficultyRandomValue ?? Math.random())
      : request.difficulty,
    size: request.size === 'random'
      ? pick(BOARD_SIZE_ORDER, request.sizeRandomValue ?? Math.random())
      : request.size,
  };
}

function pick<T>(items: readonly T[], randomValue: number): T {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) throw new Error('randomValue must be in [0, 1).');
  return items[Math.floor(randomValue * items.length)]!;
}

function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer.');
}
