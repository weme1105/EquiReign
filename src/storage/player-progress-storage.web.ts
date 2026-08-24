import type { PlayerProgress } from '../game-core/progression.ts';
import { decodeProgress, encodeProgress } from './progress-codec.ts';

const STORAGE_KEY = 'equireign.player-progress.v1';

export async function loadPlayerProgress(): Promise<PlayerProgress> {
  return decodeProgress(globalThis.localStorage?.getItem(STORAGE_KEY) ?? null);
}

export async function savePlayerProgress(progress: PlayerProgress): Promise<void> {
  globalThis.localStorage?.setItem(STORAGE_KEY, encodeProgress(progress));
}
