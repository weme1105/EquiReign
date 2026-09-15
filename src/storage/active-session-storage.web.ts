import type { GameSession } from '../game-core/types.ts';
import { persistenceStore } from './persistence-store';
import { decodeSession, encodeSession } from './session-codec.ts';

const STORAGE_KEY = 'equireign.active-session.v1';

export async function loadActiveSession(): Promise<GameSession | null> {
  return decodeSession(await persistenceStore.getItem(STORAGE_KEY));
}

export async function saveActiveSession(session: GameSession): Promise<void> {
  await persistenceStore.setItem(STORAGE_KEY, encodeSession(session));
}

export async function clearActiveSession(): Promise<void> {
  await persistenceStore.removeItem(STORAGE_KEY);
}
