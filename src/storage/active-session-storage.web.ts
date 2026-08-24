import type { GameSession } from '../game-core/types.ts';
import { decodeSession, encodeSession } from './session-codec.ts';

const STORAGE_KEY = 'equireign.active-session.v1';

export async function loadActiveSession(): Promise<GameSession | null> {
  return decodeSession(globalThis.localStorage?.getItem(STORAGE_KEY) ?? null);
}

export async function saveActiveSession(session: GameSession): Promise<void> {
  globalThis.localStorage?.setItem(STORAGE_KEY, encodeSession(session));
}

export async function clearActiveSession(): Promise<void> {
  globalThis.localStorage?.removeItem(STORAGE_KEY);
}
