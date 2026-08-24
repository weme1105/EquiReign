import { BOARD_SIZE_ORDER, createPlayerProgress, DIFFICULTY_ORDER, type PlayerProgress } from '../game-core/progression.ts';

const PROGRESS_VERSION = 1;
const VALID_KEYS = new Set(DIFFICULTY_ORDER.flatMap((difficulty) => BOARD_SIZE_ORDER.map((size) => `${difficulty}:${size}`)));

export function encodeProgress(progress: PlayerProgress): string {
  return JSON.stringify({ version: PROGRESS_VERSION, progress });
}

export function decodeProgress(value: string | null): PlayerProgress {
  if (!value) return createPlayerProgress();
  try {
    const saved = JSON.parse(value) as { version?: unknown; progress?: unknown };
    return saved.version === PROGRESS_VERSION && isPlayerProgress(saved.progress)
      ? saved.progress
      : createPlayerProgress();
  } catch {
    return createPlayerProgress();
  }
}

function isPlayerProgress(value: unknown): value is PlayerProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as PlayerProgress;
  if (!Number.isInteger(progress.completedCampaignLevel) || progress.completedCampaignLevel < 0) return false;
  if (!progress.challengeNextLevels || typeof progress.challengeNextLevels !== 'object' || Array.isArray(progress.challengeNextLevels)) return false;
  if (!Object.entries(progress.challengeNextLevels).every(([key, level]) => VALID_KEYS.has(key) && Number.isInteger(level) && level >= 1)) return false;
  if (!progress.firstClearResults || typeof progress.firstClearResults !== 'object' || Array.isArray(progress.firstClearResults)) return false;
  return Object.entries(progress.firstClearResults).every(([key, result]) => {
    if (!key || !result || typeof result !== 'object') return false;
    const item = result as { elapsedTimeMs?: unknown; hintsUsed?: unknown; completedAtMs?: unknown };
    return typeof item.elapsedTimeMs === 'number' && Number.isFinite(item.elapsedTimeMs) && item.elapsedTimeMs >= 0
      && typeof item.hintsUsed === 'number' && Number.isInteger(item.hintsUsed) && item.hintsUsed >= 0
      && typeof item.completedAtMs === 'number' && Number.isFinite(item.completedAtMs);
  });
}
