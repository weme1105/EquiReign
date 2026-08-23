export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'king';

export interface Position {
  readonly row: number;
  readonly column: number;
}

export interface PuzzleDefinition {
  readonly id: string;
  readonly difficulty: Difficulty;
  readonly size: number;
  readonly solution: readonly number[];
  readonly givens: readonly Position[];
}

export type GameStatus = 'playing' | 'completed';

export interface GameState {
  readonly puzzle: PuzzleDefinition;
  readonly queens: readonly (number | null)[];
  readonly hintTarget: Position | null;
  readonly hintsRemaining: number;
  readonly status: GameStatus;
  readonly moves: number;
}

export interface ConflictMap {
  readonly rows: ReadonlySet<number>;
  readonly positions: readonly Position[];
}
