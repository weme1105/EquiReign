import type { PlayerProgress } from '../game-core/progression.ts';
import { persistenceStore } from './persistence-store';
import { decodeProgress, encodeProgress } from './progress-codec.ts';

const STORAGE_KEY = 'equireign.player-progress.v1';

export async function loadPlayerProgress(): Promise<PlayerProgress> {
  return decodeProgress(await persistenceStore.getItem(STORAGE_KEY));
}

export async function savePlayerProgress(progress: PlayerProgress): Promise<void> {
  await persistenceStore.setItem(STORAGE_KEY, encodeProgress(progress));
}
