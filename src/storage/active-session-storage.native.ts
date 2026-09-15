import { File, Paths } from 'expo-file-system';
import type { GameSession } from '../game-core/types.ts';
import { persistenceStore } from './persistence-store';
import { decodeSession, encodeSession } from './session-codec.ts';

const STORAGE_KEY = 'equireign.active-session.v1';
const legacyFile = new File(Paths.document, 'equireign-active-session-v1.json');

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
    // A save failure must not interrupt play.
  }
}

export async function loadActiveSession(): Promise<GameSession | null> {
  try {
    const persistedValue = await persistenceStore.getItem(STORAGE_KEY);
    if (persistedValue !== null) return decodeSession(persistedValue);

    const legacyValue = await readLegacyValue();
    if (legacyValue === null) return null;

    await persistenceStore.setItem(STORAGE_KEY, legacyValue);
    await removeLegacyFile();
    return decodeSession(legacyValue);
  } catch {
    return decodeSession(await readLegacyValue());
  }
}

export async function saveActiveSession(session: GameSession): Promise<void> {
  const value = encodeSession(session);

  try {
    await persistenceStore.setItem(STORAGE_KEY, value);
    await removeLegacyFile();
  } catch {
    await writeLegacyFallback(value);
  }
}

export async function clearActiveSession(): Promise<void> {
  try {
    await persistenceStore.removeItem(STORAGE_KEY);
  } catch {
    // Continue with legacy cleanup so clear remains best-effort.
  }

  await removeLegacyFile();
}
