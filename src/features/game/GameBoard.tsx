import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { cellIndex, positionKey } from '../../game-core/board.ts';
import { findRuleConflicts } from '../../game-core/rules.ts';
import { isGivenQueen, queenFeasibilityErrors } from '../../game-core/session.ts';
import type { GameSession } from '../../game-core/types.ts';

interface Props { readonly session: GameSession; readonly onPress: (row: number, column: number) => void; readonly onLongPress: (row: number, column: number) => void }
const REGION_COLORS = ['#e8d7b7','#b7d9d0','#c8c0e1','#e2bcbc','#d5d7a9','#b9cfe2','#dfc3df','#c8d7bd','#e4c9aa','#bfc1d9','#d6c2ac','#b8d8c9'];

export function GameBoard({ session, onPress, onLongPress }: Props) {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - 24, height * .58, 560);
  const cellSize = boardSize / session.puzzle.size;
  const conflicts = findRuleConflicts(session.boardState).positions;
  const feasibility = queenFeasibilityErrors(session);

  return <View accessibilityLabel="game-board" style={[styles.board, { height: boardSize, width: boardSize }]} testID="game-board">
    {session.boardState.cells.map((state, index) => {
      const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; const position = { row, column };
      const key = positionKey(position); const given = isGivenQueen(session, position); const error = conflicts.has(key) || feasibility.has(key);
      const hinted = session.hintTarget?.row === row && session.hintTarget.column === column;
      const region = session.puzzle.regionMap[cellIndex(session.puzzle.size, position)]!;
      return <Pressable key={key} accessibilityRole="button" accessibilityState={{ disabled: given }}
        accessibilityLabel={`第 ${row + 1} 列第 ${column + 1} 行，${state === 'queen' ? '皇后' : state === 'excluded' ? '叉號' : '空白'}${given ? '，預置' : ''}${error ? '，錯誤' : ''}`}
        disabled={given} onPress={() => onPress(row, column)} onLongPress={() => onLongPress(row, column)} delayLongPress={320}
        testID={hinted ? 'hint-target' : `cell-${row}-${column}`} style={[styles.cell, { backgroundColor: REGION_COLORS[region % REGION_COLORS.length], height: cellSize, width: cellSize }, error && styles.error, hinted && styles.hinted]}>
        {state === 'queen' && <Text style={[styles.queen, given && styles.given]} testID={`queen-${row}-${column}`}>♛</Text>}
        {state === 'excluded' && <Text style={styles.excluded}>×</Text>}
        {hinted && <View style={styles.hintDot} />}
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  board: { borderColor: '#d6b870', borderRadius: 10, borderWidth: 3, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  cell: { alignItems: 'center', borderColor: 'rgba(23,20,42,.12)', borderWidth: .5, justifyContent: 'center', position: 'relative' },
  error: { backgroundColor: '#d86470' }, hinted: { borderColor: '#fff29d', borderWidth: 4 }, queen: { color: '#17142a', fontSize: 29, lineHeight: 35 },
  given: { color: '#9b6a08', textShadowColor: 'rgba(255,255,255,.7)', textShadowRadius: 2 }, excluded: { color: '#514b67', fontSize: 23, fontWeight: '500' },
  hintDot: { backgroundColor: '#fff29d', borderRadius: 5, height: 9, position: 'absolute', right: 3, top: 3, width: 9 },
});
