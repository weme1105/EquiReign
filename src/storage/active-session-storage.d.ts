import type { GameSession } from '../game-core/types.ts';

export function loadActiveSession(): Promise<GameSession | null>;
export function saveActiveSession(session: GameSession): Promise<void>;
export function clearActiveSession(): Promise<void>;
