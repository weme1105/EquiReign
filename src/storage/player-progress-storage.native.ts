import { File, Paths } from 'expo-file-system';
import type { PlayerProgress } from '../game-core/progression.ts';
import { persistenceStore } from './persistence-store';
import { decodeProgress, encodeProgress } from './progress-codec.ts';

const STORAGE_KEY = 'equireign.player-progress.v1';
const legacyFile = new File(Paths.document, 'equireign-player-progress-v1.json');

async function readLegacyValue(): Promise<string | null> {
  try {
    return legacyFile.exists ? await legacyFile.text() : null;
  } catch {
    return null;
  }
}

async function removeLegacyFile(): Promise<void> {
  try {
    if (legacyFile.exists) legacyFile.delete();
  } catch {
    // Migration cleanup is best-effort.
  }
}

async function writeLegacyFallback(value: string): Promise<void> {
  try {
    if (!legacyFile.exists) legacyFile.create({ intermediates: true });
    legacyFile.write(value);
  } catch {
    // Progress save failure must not interrupt play.
  }
}

export async function loadPlayerProgress(): Promise<PlayerProgress> {
  try {
    const persistedValue = await persistenceStore.getItem(STORAGE_KEY);
    if (persistedValue !== null) return decodeProgress(persistedValue);

    const legacyValue = await readLegacyValue();
    if (legacyValue === null) return decodeProgress(null);

    await persistenceStore.setItem(STORAGE_KEY, legacyValue);
    await removeLegacyFile();
    return decodeProgress(legacyValue);
  } catch {
    return decodeProgress(await readLegacyValue());
  }
}

export async function savePlayerProgress(progress: PlayerProgress): Promise<void> {
  const value = encodeProgress(progress);

  try {
    await persistenceStore.setItem(STORAGE_KEY, value);
    await removeLegacyFile();
  } catch {
    await writeLegacyFallback(value);
  }
}
