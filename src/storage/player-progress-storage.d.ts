import type { PlayerProgress } from '../game-core/progression.ts';

export function loadPlayerProgress(): Promise<PlayerProgress>;
export function savePlayerProgress(progress: PlayerProgress): Promise<void>;
