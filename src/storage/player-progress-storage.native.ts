import { File, Paths } from 'expo-file-system';
import type { PlayerProgress } from '../game-core/progression.ts';
import { decodeProgress, encodeProgress } from './progress-codec.ts';

const progressFile = new File(Paths.document, 'equireign-player-progress-v1.json');

export async function loadPlayerProgress(): Promise<PlayerProgress> {
  try { return progressFile.exists ? decodeProgress(await progressFile.text()) : decodeProgress(null); } catch { return decodeProgress(null); }
}

export async function savePlayerProgress(progress: PlayerProgress): Promise<void> {
  try {
    if (!progressFile.exists) progressFile.create({ intermediates: true });
    progressFile.write(encodeProgress(progress));
  } catch { /* Progress save failure must not interrupt play. */ }
}
