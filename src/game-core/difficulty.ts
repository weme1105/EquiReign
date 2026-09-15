import type { Difficulty, DifficultyPolicy } from './types.ts';

export const DIFFICULTIES: Readonly<Record<Difficulty, DifficultyPolicy>> = {
  beginner: { label: '初級', givenQueenCount: 2, realtimeQueenValidation: true, hintLimit: 0, completionValidation: 'full-board', accent: '#70d6b2' },
  intermediate: { label: '中級', givenQueenCount: 1, realtimeQueenValidation: true, hintLimit: 0, completionValidation: 'full-board', accent: '#8cb9e8' },
  advanced: { label: '高級', givenQueenCount: 0, realtimeQueenValidation: true, hintLimit: 0, completionValidation: 'full-board', accent: '#d6b870' },
  expert: { label: '進階', givenQueenCount: 0, realtimeQueenValidation: false, hintLimit: 3, completionValidation: 'full-board', accent: '#d69070' },
  king: { label: '王者', givenQueenCount: 0, realtimeQueenValidation: false, hintLimit: 3, completionValidation: 'full-board', accent: '#c47ad9' },
};
