export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'king';
export type BoardSize = 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type CellState = 'empty' | 'excluded' | 'queen';
export type GameStatus = 'ready' | 'playing' | 'completed';

export interface Position { readonly row: number; readonly column: number }

export interface PuzzleDefinition {
  readonly id: string;
  readonly difficulty: Difficulty;
  readonly size: number;
  /** Row-major region id. Exactly size regions numbered 0..size-1. */
  readonly regionMap: readonly number[];
  /** Fixed queens are puzzle metadata, never a distinct cell state. */
  readonly givenQueens: readonly Position[];
}

export interface BoardSnapshot {
  readonly size: number;
  readonly regionMap: readonly number[];
  readonly cells: readonly CellState[];
}

export interface DifficultyPolicy {
  readonly label: string;
  readonly givenQueenCount: number;
  readonly realtimeQueenValidation: boolean;
  readonly hintLimit: number;
  readonly completionValidation: 'full-board';
  readonly accent: string;
}

export interface BoardHistoryEntry {
  readonly cells: readonly CellState[];
  readonly completionError: boolean;
}

export interface GameSession {
  readonly puzzle: PuzzleDefinition;
  readonly difficulty: Difficulty;
  readonly boardState: BoardSnapshot;
  readonly history: readonly BoardHistoryEntry[];
  readonly hintsUsed: number;
  readonly hintTarget: Position | null;
  readonly startedAtMs: number;
  readonly completedAtMs: number | null;
  readonly status: GameStatus;
  readonly completionError: boolean;
}

export interface PuzzleResult {
  readonly puzzleId: string;
  readonly difficulty: Difficulty;
  readonly size: number;
  readonly elapsedTimeMs: number;
  readonly hintsUsed: number;
  readonly completed: boolean;
}

export type ConflictReason = 'row' | 'column' | 'region' | 'adjacent';
export interface ConflictMap {
  readonly positions: ReadonlySet<string>;
  readonly reasons: ReadonlySet<ConflictReason>;
}

export interface GeneratedPuzzle {
  readonly size: number;
  readonly regionMap: readonly number[];
  readonly solution: readonly Position[];
}

export interface PuzzleGenerator {
  generate(size: number, seed?: number): GeneratedPuzzle;
}
