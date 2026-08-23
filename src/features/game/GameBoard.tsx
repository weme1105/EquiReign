import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { findConflicts } from '../../game-core/rules';
import { isLockedRow } from '../../game-core/game';
import { DIFFICULTIES } from '../../game-core/difficulty';
import type { GameState } from '../../game-core/types';

interface GameBoardProps {
  readonly state: GameState;
  readonly onCellPress: (row: number, column: number) => void;
}

export function GameBoard({ state, onCellPress }: GameBoardProps) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 520);
  const cellSize = boardSize / state.puzzle.size;
  const conflicts = findConflicts(state.queens).rows;
  const realtimeValidation = DIFFICULTIES[state.puzzle.difficulty].realtimeAnswerValidation;

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {Array.from({ length: state.puzzle.size }, (_, row) =>
        Array.from({ length: state.puzzle.size }, (_, column) => {
          const hasQueen = state.queens[row] === column;
          const locked = isLockedRow(state, row);
          const conflicted = hasQueen && conflicts.has(row);
          const wrongAnswer = hasQueen && realtimeValidation && state.puzzle.solution[row] !== column;
          const hinted = state.hintTarget?.row === row && state.hintTarget.column === column;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Row ${row + 1}, column ${column + 1}${hasQueen ? ', queen' : ''}`}
              key={`${row}-${column}`}
              onPress={() => onCellPress(row, column)}
              style={[
                styles.cell,
                { width: cellSize, height: cellSize },
                (row + column) % 2 === 0 ? styles.light : styles.dark,
                (conflicted || wrongAnswer) && styles.conflict,
                hinted && styles.hinted,
              ]}
            >
              {hasQueen && <Text style={[styles.queen, locked && styles.locked]}>♛</Text>}
            </Pressable>
          );
        }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { borderColor: '#d6b870', borderRadius: 12, borderWidth: 2, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  light: { backgroundColor: '#eee8dc' },
  dark: { backgroundColor: '#6d6682' },
  conflict: { backgroundColor: '#c95867' },
  hinted: { borderColor: '#fff2a8', borderWidth: 3 },
  queen: { color: '#17142a', fontSize: 30, lineHeight: 36 },
  locked: { color: '#d6a827' },
});
