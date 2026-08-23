import type { Difficulty } from './types.ts';

export interface DifficultyConfig {
  readonly label: string;
  readonly boardSize: number;
  readonly maxHints: number;
  readonly realtimeAnswerValidation: boolean;
  readonly accent: string;
}

export const DIFFICULTIES: Readonly<Record<Difficulty, DifficultyConfig>> = {
  beginner: { label: 'Beginner', boardSize: 6, maxHints: 0, realtimeAnswerValidation: true, accent: '#70d6b2' },
  intermediate: { label: 'Intermediate', boardSize: 7, maxHints: 0, realtimeAnswerValidation: true, accent: '#8cb9e8' },
  advanced: { label: 'Advanced', boardSize: 8, maxHints: 0, realtimeAnswerValidation: true, accent: '#d6b870' },
  expert: { label: 'Expert', boardSize: 9, maxHints: 3, realtimeAnswerValidation: false, accent: '#d69070' },
  king: { label: 'King', boardSize: 10, maxHints: 3, realtimeAnswerValidation: false, accent: '#c47ad9' },
};
