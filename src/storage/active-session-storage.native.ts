import { File, Paths } from 'expo-file-system';
import type { GameSession } from '../game-core/types.ts';
import { decodeSession, encodeSession } from './session-codec.ts';

const saveFile = new File(Paths.document, 'equireign-active-session-v1.json');

export async function loadActiveSession(): Promise<GameSession | null> {
  try { return saveFile.exists ? decodeSession(await saveFile.text()) : null; } catch { return null; }
}

export async function saveActiveSession(session: GameSession): Promise<void> {
  try { if (!saveFile.exists) saveFile.create({ intermediates: true }); saveFile.write(encodeSession(session)); } catch { /* A save failure must not interrupt play. */ }
}

export async function clearActiveSession(): Promise<void> {
  try { if (saveFile.exists) saveFile.delete(); } catch { /* A cleanup failure is safe to retry later. */ }
}
