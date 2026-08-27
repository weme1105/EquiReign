import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRef, useState } from 'react';
import { cellIndex, positionKey } from '../../game-core/board.ts';
import { findRuleConflicts } from '../../game-core/rules.ts';
import { isGivenQueen } from '../../game-core/session.ts';
import { extractFirstSolution } from '../../game-core/solver.ts';
import type { CellState, GameSession } from '../../game-core/types.ts';

interface Props {
  readonly session: GameSession;
  readonly onPress: (row: number, column: number) => void;
  readonly onLongPress: (row: number, column: number) => void;
  readonly dualColorCellIndexes?: readonly number[];
  readonly showDualRegions?: boolean;
}
interface TapMemory { readonly index: number; readonly atMs: number; readonly originalState: CellState }
interface DragMemory { readonly startIndex: number; lastIndex: number; readonly startX: number; readonly startY: number; readonly mode: 'fill-x' | 'erase-x'; dragging: boolean; readonly visited: Set<number> }

const REGION_COLORS = ['#e8d7b7','#b7d9d0','#c8c0e1','#e2bcbc','#d5d7a9','#b9cfe2','#dfc3df','#c8d7bd','#e4c9aa','#bfc1d9','#d6c2ac','#b8d8c9'];
const BOARD_BORDER_WIDTH = 3;
const DOUBLE_TAP_WINDOW_MS = 1_000;
const DRAG_THRESHOLD_PX = 8;

export function GameBoard({ session, onPress, onLongPress, dualColorCellIndexes = [], showDualRegions = false }: Props) {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - 24, height * .58, 560);
  const innerBoardSize = boardSize - BOARD_BORDER_WIDTH * 2;
  const cellSize = innerBoardSize / session.puzzle.size;
  const conflicts = findRuleConflicts(session.boardState).positions;
  const solutionCrowns = new Set((extractFirstSolution({ ...session.boardState, cells: session.boardState.cells.map(() => 'empty') }) ?? []).map(({ row, column }) => row * session.puzzle.size + column));
  const dualSet = new Set(dualColorCellIndexes);
  const lastTap = useRef<TapMemory | null>(null);
  const drag = useRef<DragMemory | null>(null);
  const touchStart = useRef<{ x: number; y: number; index: number } | null>(null);
  const [lastInteractedIndex, setLastInteractedIndex] = useState<number | null>(null);

  const isProtected = (index: number): boolean => {
    const row = Math.floor(index / session.puzzle.size);
    const column = index % session.puzzle.size;
    return isGivenQueen(session, { row, column }) || session.lostCellIndexes.includes(index) || (session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index));
  };

  const indexFromPoint = (x: number, y: number): number | null => {
    const localX = x - BOARD_BORDER_WIDTH;
    const localY = y - BOARD_BORDER_WIDTH;
    if (localX < 0 || localY < 0 || localX >= innerBoardSize || localY >= innerBoardSize) return null;
    const column = Math.min(session.puzzle.size - 1, Math.floor(localX / cellSize));
    const row = Math.min(session.puzzle.size - 1, Math.floor(localY / cellSize));
    return row * session.puzzle.size + column;
  };

  const invokeForIndex = (index: number, action: 'press' | 'toggle-x') => {
    if (isProtected(index)) return;
    const row = Math.floor(index / session.puzzle.size);
    const column = index % session.puzzle.size;
    setLastInteractedIndex(index);
    if (action === 'press') onPress(row, column);
    else onLongPress(row, column);
  };

  const handleTap = (index: number) => {
    if (isProtected(index)) { lastTap.current = null; return; }
    const now = Date.now();
    const state = session.boardState.cells[index]!;
    const previous = lastTap.current;
    if (previous && previous.index === index && now - previous.atMs <= DOUBLE_TAP_WINDOW_MS) {
      if (previous.originalState === 'empty') invokeForIndex(index, 'press');
      else if (previous.originalState === 'excluded') { invokeForIndex(index, 'press'); invokeForIndex(index, 'press'); }
      else invokeForIndex(index, 'toggle-x');
      lastTap.current = null;
      return;
    }
    if (state === 'queen') invokeForIndex(index, 'press');
    else invokeForIndex(index, 'toggle-x');
    lastTap.current = { index, atMs: now, originalState: state };
  };

  const applyDragIndex = (memory: DragMemory, index: number) => {
    if (memory.visited.has(index) || isProtected(index)) return;
    memory.visited.add(index);
    const state = session.boardState.cells[index]!;
    if (memory.mode === 'fill-x' && state === 'empty') invokeForIndex(index, 'toggle-x');
    if (memory.mode === 'erase-x' && state === 'excluded') invokeForIndex(index, 'toggle-x');
  };

  const applyDragLine = (memory: DragMemory, fromIndex: number, toIndex: number) => {
    const size = session.puzzle.size;
    const fromRow = Math.floor(fromIndex / size); const fromColumn = fromIndex % size;
    const toRow = Math.floor(toIndex / size); const toColumn = toIndex % size;
    const steps = Math.max(Math.abs(toRow - fromRow), Math.abs(toColumn - fromColumn));
    if (!steps) { applyDragIndex(memory, toIndex); return; }
    for (let step = 1; step <= steps; step += 1) {
      const row = Math.round(fromRow + (toRow - fromRow) * step / steps);
      const column = Math.round(fromColumn + (toColumn - fromColumn) * step / steps);
      applyDragIndex(memory, row * size + column);
    }
  };

  const unitHasNoQueenAndAllX = (index: number): boolean => {
    const size = session.puzzle.size;
    const row = Math.floor(index / size); const column = index % size; const region = session.puzzle.regionMap[index]!;
    const rowIndexes = Array.from({ length: size }, (_, value) => row * size + value);
    const columnIndexes = Array.from({ length: size }, (_, value) => value * size + column);
    const regionIndexes = session.puzzle.regionMap.flatMap((value, cell) => value === region ? [cell] : []);
    return [rowIndexes, columnIndexes, regionIndexes].some((indexes) => {
      const states = indexes.map((cell) => session.boardState.cells[cell]!);
      return !states.includes('queen') && states.every((state) => state === 'excluded');
    });
  };

  const handleBoardTouchStart = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const index = indexFromPoint(locationX, locationY);
    if (index === null || isProtected(index)) { touchStart.current = null; return; }
    touchStart.current = { x: locationX, y: locationY, index };
  };

  const shouldCaptureMove = (event: any) => {
    const start = touchStart.current;
    if (!start) return false;
    const { locationX, locationY } = event.nativeEvent;
    return Math.hypot(locationX - start.x, locationY - start.y) >= DRAG_THRESHOLD_PX;
  };

  const beginDrag = (event: any) => {
    const start = touchStart.current;
    if (!start) return;
    const state = session.boardState.cells[start.index]!;
    drag.current = { startIndex: start.index, lastIndex: start.index, startX: start.x, startY: start.y, mode: state === 'excluded' ? 'erase-x' : 'fill-x', dragging: true, visited: new Set<number>() };
    lastTap.current = null;
    applyDragIndex(drag.current, start.index);
    const { locationX, locationY } = event.nativeEvent;
    const index = indexFromPoint(locationX, locationY);
    if (index !== null) { applyDragLine(drag.current, start.index, index); drag.current.lastIndex = index; }
  };

  const moveDrag = (event: any) => {
    const memory = drag.current;
    if (!memory) return;
    const { locationX, locationY } = event.nativeEvent;
    const index = indexFromPoint(locationX, locationY);
    if (index === null) return;
    applyDragLine(memory, memory.lastIndex, index);
    memory.lastIndex = index;
  };

  const finishDrag = () => { drag.current = null; touchStart.current = null; };

  return <View accessibilityLabel="game-board" style={[styles.board, { height: boardSize, width: boardSize }]} testID="game-board" onTouchStart={handleBoardTouchStart} onMoveShouldSetResponder={shouldCaptureMove} onResponderGrant={beginDrag} onResponderMove={moveDrag} onResponderRelease={finishDrag} onResponderTerminate={finishDrag}>
    {session.boardState.cells.map((state, index) => {
      const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; const position = { row, column }; const key = positionKey(position);
      const given = isGivenQueen(session, position); const error = lastInteractedIndex === index && (conflicts.has(key) || unitHasNoQueenAndAllX(index));
      const hinted = session.hintTarget?.row === row && session.hintTarget.column === column; const region = session.puzzle.regionMap[cellIndex(session.puzzle.size, position)]!;
      const lost = session.lostCellIndexes.includes(index); const frozen = session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index); const revealedCrown = session.revealedFrozenCellIndexes.includes(index) && solutionCrowns.has(index); const dual = showDualRegions && dualSet.has(index); const protectedCell = given || lost || frozen;
      return <Pressable key={key} accessibilityRole="button" accessibilityState={{ disabled: protectedCell }} aria-disabled={protectedCell ? true : undefined} accessibilityLabel={`第 ${row + 1} 列第 ${column + 1} 行，${lost ? '遺失' : frozen ? '冰封' : state === 'queen' || revealedCrown ? '皇后' : state === 'excluded' ? '叉號' : '空白'}${given ? '，預置' : ''}${dual ? '，雙色域' : ''}${error ? '，錯誤' : ''}`} testID={lost ? `lost-${row}-${column}` : frozen ? `frozen-${row}-${column}` : hinted ? 'hint-target' : `cell-${row}-${column}`} style={[styles.cell, { backgroundColor: REGION_COLORS[region % REGION_COLORS.length], height: cellSize, width: cellSize }, lost && styles.lost, frozen && styles.frozen, error && styles.error, hinted && styles.hinted]} disabled={protectedCell} onPress={() => handleTap(index)} onLongPress={() => invokeForIndex(index, 'toggle-x')}>
        {dual && <View pointerEvents="none" style={[styles.dualHalf, { backgroundColor: REGION_COLORS[(region + 1) % REGION_COLORS.length] }]} testID={`dual-region-${row}-${column}`} />}
        {frozen && <Text style={styles.ice}>❄</Text>}
        {(state === 'queen' || revealedCrown) && <Text style={[styles.queen, given && styles.given]} testID={`queen-${row}-${column}`}>♛</Text>}
        {state === 'excluded' && <Text style={styles.excluded}>×</Text>}
        {hinted && <View pointerEvents="none" style={styles.hintDot} />}
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({ board: { borderColor: '#d6b870', borderRadius: 10, borderWidth: BOARD_BORDER_WIDTH, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' }, cell: { alignItems: 'center', borderColor: 'rgba(23,20,42,.12)', borderWidth: .5, justifyContent: 'center', position: 'relative' }, dualHalf: { bottom: 0, opacity: .92, position: 'absolute', right: 0, top: 0, width: '50%' }, error: { backgroundColor: '#d86470', borderColor: '#ffabb3', borderWidth: 3 }, hinted: { borderColor: '#fff29d', borderWidth: 4 }, queen: { color: '#17142a', fontSize: 29, lineHeight: 35 }, given: { color: '#9b6a08' }, excluded: { color: '#514b67', fontSize: 23, fontWeight: '500' }, hintDot: { backgroundColor: '#fff29d', borderRadius: 5, height: 9, position: 'absolute', right: 3, top: 3, width: 9 }, lost: { backgroundColor: '#17142a', borderColor: '#514a70', borderStyle: 'dashed', borderWidth: 1.5 }, frozen: { backgroundColor: '#b9dce8', borderColor: '#eefbff', borderWidth: 2 }, ice: { color: '#f5fdff', fontSize: 18 } });