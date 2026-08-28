import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useMemo, useRef, useState } from 'react';
import { cellIndex, createBoard, positionKey } from '../../game-core/board.ts';
import { findRuleConflicts } from '../../game-core/rules.ts';
import { isGivenQueen } from '../../game-core/session.ts';
import { extractFirstSolution } from '../../game-core/solver.ts';
import type { GameSession } from '../../game-core/types.ts';

interface Props {
  readonly session: GameSession;
  readonly onPress: (row: number, column: number) => void;
  readonly onDoublePress: (row: number, column: number) => void;
  readonly dualColorCellIndexes?: readonly number[];
  readonly showDualRegions?: boolean;
}
interface DragMemory { lastIndex: number; readonly startIndex: number; readonly startX: number; readonly startY: number; readonly mode: 'fill-x' | 'erase-x'; dragging: boolean; readonly visited: Set<number> }
interface PendingTap { readonly index: number; readonly timestamp: number; readonly timer: ReturnType<typeof setTimeout> }
const REGION_COLORS = ['#e8d7b7','#b7d9d0','#c8c0e1','#e2bcbc','#d5d7a9','#b9cfe2','#dfc3df','#c8d7bd','#e4c9aa','#bfc1d9','#d6c2ac','#b8d8c9'];
const BOARD_BORDER_WIDTH = 3; const DRAG_THRESHOLD_PX = 8; const DOUBLE_TAP_WINDOW_MS = 1000;

export function GameBoard({ session, onPress, onDoublePress, dualColorCellIndexes = [], showDualRegions = false }: Props) {
  const { width, height } = useWindowDimensions(); const boardSize = Math.min(width - 24, height * .58, 560); const innerBoardSize = boardSize - BOARD_BORDER_WIDTH * 2; const cellSize = innerBoardSize / session.puzzle.size;
  const conflicts = useMemo(() => findRuleConflicts(session.boardState).positions, [session.boardState]);
  const solutionCrowns = useMemo(() => {
    if (session.revealedFrozenCellIndexes.length === 0) return new Set<number>();
    const solution = extractFirstSolution(createBoard(session.puzzle));
    return new Set((solution ?? []).map(({ row, column }) => row * session.puzzle.size + column));
  }, [session.puzzle, session.revealedFrozenCellIndexes]);
  const dualSet = useMemo(() => new Set(dualColorCellIndexes), [dualColorCellIndexes]);
  const drag = useRef<DragMemory | null>(null); const pendingTap = useRef<PendingTap | null>(null); const [lastInteractedIndex, setLastInteractedIndex] = useState<number | null>(null);
  const isProtected = (index: number): boolean => { const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; return isGivenQueen(session, { row, column }) || session.lostCellIndexes.includes(index) || (session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index)); };
  const invokeForIndex = (index: number, action: 'press' | 'double') => { if (isProtected(index)) return; const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; setLastInteractedIndex(index); if (action === 'press') onPress(row, column); else onDoublePress(row, column); };
  const clearPendingTap = () => { const pending = pendingTap.current; if (!pending) return; clearTimeout(pending.timer); pendingTap.current = null; };
  const applyDragIndex = (memory: DragMemory, index: number) => { if (memory.visited.has(index) || isProtected(index)) return; memory.visited.add(index); const state = session.boardState.cells[index]!; if (memory.mode === 'fill-x' && state === 'empty') invokeForIndex(index, 'press'); if (memory.mode === 'erase-x' && state === 'excluded') invokeForIndex(index, 'press'); };
  const applyDragLine = (memory: DragMemory, fromIndex: number, toIndex: number) => { const size = session.puzzle.size; const fromRow = Math.floor(fromIndex / size); const fromColumn = fromIndex % size; const toRow = Math.floor(toIndex / size); const toColumn = toIndex % size; const steps = Math.max(Math.abs(toRow - fromRow), Math.abs(toColumn - fromColumn)); if (!steps) return; for (let step = 1; step <= steps; step += 1) { const row = Math.round(fromRow + (toRow - fromRow) * step / steps); const column = Math.round(fromColumn + (toColumn - fromColumn) * step / steps); applyDragIndex(memory, row * size + column); } };
  const unitHasNoQueenAndAllX = (index: number): boolean => { const size = session.puzzle.size; const row = Math.floor(index / size); const column = index % size; const region = session.puzzle.regionMap[index]!; const rowIndexes = Array.from({ length: size }, (_, value) => row * size + value); const columnIndexes = Array.from({ length: size }, (_, value) => value * size + column); const regionIndexes = session.puzzle.regionMap.flatMap((value, cell) => value === region ? [cell] : []); return [rowIndexes, columnIndexes, regionIndexes].some((indexes) => { const states = indexes.map((cell) => session.boardState.cells[cell]!); return !states.includes('queen') && states.every((state) => state === 'excluded'); }); };
  const startDrag = (index: number, x: number, y: number) => { if (isProtected(index)) return; const state = session.boardState.cells[index]!; drag.current = { lastIndex: index, startIndex: index, startX: x, startY: y, mode: state === 'excluded' ? 'erase-x' : 'fill-x', dragging: false, visited: new Set<number>() }; };
  const moveDrag = (x: number, y: number) => { const memory = drag.current; if (!memory) return; if (!memory.dragging) { if (Math.hypot(x - memory.startX, y - memory.startY) < DRAG_THRESHOLD_PX) return; clearPendingTap(); memory.dragging = true; applyDragIndex(memory, memory.lastIndex); } const size = session.puzzle.size; const startRow = Math.floor(memory.startIndex / size); const startColumn = memory.startIndex % size; const rowOffset = Math.round((y - memory.startY) / cellSize); const columnOffset = Math.round((x - memory.startX) / cellSize); const row = startRow + rowOffset; const column = startColumn + columnOffset; if (row < 0 || row >= size || column < 0 || column >= size) return; const index = row * size + column; applyDragLine(memory, memory.lastIndex, index); memory.lastIndex = index; };
  const endDrag = () => { const memory = drag.current; if (memory?.dragging) clearPendingTap(); drag.current = null; };
  const handlePress = (index: number) => {
    if (isProtected(index)) return;
    const now = Date.now(); const pending = pendingTap.current;
    if (pending && pending.index === index && now - pending.timestamp <= DOUBLE_TAP_WINDOW_MS) {
      clearPendingTap(); invokeForIndex(index, 'double'); return;
    }
    if (pending) { clearPendingTap(); invokeForIndex(pending.index, 'press'); }
    const timer = setTimeout(() => { if (pendingTap.current?.index === index) { pendingTap.current = null; invokeForIndex(index, 'press'); } }, DOUBLE_TAP_WINDOW_MS);
    pendingTap.current = { index, timestamp: now, timer };
  };
  return <View accessibilityLabel="game-board" style={[styles.board, { height: boardSize, width: boardSize }]} testID="game-board">
    {session.boardState.cells.map((state, index) => { const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; const position = { row, column }; const key = positionKey(position); const given = isGivenQueen(session, position); const error = lastInteractedIndex === index && (conflicts.has(key) || unitHasNoQueenAndAllX(index)); const hinted = session.hintTarget?.row === row && session.hintTarget.column === column; const region = session.puzzle.regionMap[cellIndex(session.puzzle.size, position)]!; const lost = session.lostCellIndexes.includes(index); const frozen = session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index); const revealedCrown = session.revealedFrozenCellIndexes.includes(index) && solutionCrowns.has(index); const dual = showDualRegions && dualSet.has(index); const protectedCell = given || lost || frozen;
      return <Pressable key={key} accessibilityRole="button" accessibilityState={{ disabled: protectedCell }} accessibilityLabel={`第 ${row + 1} 列第 ${column + 1} 行，${lost ? '遺失' : frozen ? '冰封' : state === 'queen' || revealedCrown ? '皇后' : state === 'excluded' ? '叉號' : '空白'}${given ? '，預置' : ''}${dual ? '，雙色域' : ''}${error ? '，錯誤' : ''}`} testID={lost ? `lost-${row}-${column}` : frozen ? `frozen-${row}-${column}` : hinted ? 'hint-target' : `cell-${row}-${column}`} style={[styles.cell, { backgroundColor: REGION_COLORS[region % REGION_COLORS.length], height: cellSize, width: cellSize }, lost && styles.lost, frozen && styles.frozen, error && styles.error, hinted && styles.hinted]} disabled={protectedCell}
        onPress={() => handlePress(index)}
        onPressIn={(event) => startDrag(index, event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onPressMove={(event) => moveDrag(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onPressOut={() => endDrag()}>
        {dual && <View pointerEvents="none" style={[styles.dualHalf, { backgroundColor: REGION_COLORS[(region + 1) % REGION_COLORS.length] }]} testID={`dual-region-${row}-${column}`} />}{frozen && <Text style={styles.ice}>❄</Text>}{(state === 'queen' || revealedCrown) && <Text style={[styles.queen, given && styles.given]} testID={`queen-${row}-${column}`}>♛</Text>}{state === 'excluded' && <Text style={styles.excluded}>×</Text>}{hinted && <View pointerEvents="none" style={styles.hintDot} />}
      </Pressable>; })}
  </View>;
}
const styles = StyleSheet.create({ board: { borderColor: '#d6b870', borderRadius: 10, borderWidth: BOARD_BORDER_WIDTH, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' }, cell: { alignItems: 'center', borderColor: 'rgba(23,20,42,.12)', borderWidth: .5, justifyContent: 'center', position: 'relative' }, dualHalf: { bottom: 0, opacity: .92, position: 'absolute', right: 0, top: 0, width: '50%' }, error: { backgroundColor: '#d86470', borderColor: '#ffabb3', borderWidth: 3 }, hinted: { borderColor: '#fff29d', borderWidth: 4 }, queen: { color: '#17142a', fontSize: 29, lineHeight: 35 }, given: { color: '#9b6a08' }, excluded: { color: '#514b67', fontSize: 23, fontWeight: '500' }, hintDot: { backgroundColor: '#fff29d', borderRadius: 5, height: 9, position: 'absolute', right: 3, top: 3, width: 9 }, lost: { backgroundColor: '#17142a', borderColor: '#514a70', borderStyle: 'dashed', borderWidth: 1.5 }, frozen: { backgroundColor: '#b9dce8', borderColor: '#eefbff', borderWidth: 2 }, ice: { color: '#f5fdff', fontSize: 18 } });
