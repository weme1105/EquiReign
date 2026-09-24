import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useMemo, useRef, useState } from 'react';
import { cellIndex, createBoard, positionKey } from '../../game-core/board.ts';
import { findRuleConflicts } from '../../game-core/rules.ts';
import { isGivenQueen } from '../../game-core/session.ts';
import { extractFirstSolution } from '../../game-core/solver.ts';
import type { CellState, GameSession } from '../../game-core/types.ts';
import { WebCellInput } from './input/WebCellInput.tsx';

interface Props { readonly session: GameSession; readonly onPress: (row: number, column: number) => void; readonly onDoublePress: (row: number, column: number) => void; readonly onDragToggleExcluded?: (row: number, column: number) => void; readonly dualColorCellIndexes?: readonly number[]; readonly showDualRegions?: boolean; }
interface DragMemory { lastIndex: number; readonly startIndex: number; readonly startState: CellState; readonly mode: 'fill-x' | 'erase-x'; readonly startPageX: number; readonly startPageY: number; dragging: boolean; readonly visited: Set<number>; }
const REGION_COLORS = ['#e8d7b7','#b7d9d0','#c8c0e1','#e2bcbc','#d5d7a9','#b9cfe2','#dfc3df','#c8d7bd','#e4c9aa','#bfc1d9','#d6c2ac','#b8d8c9'];
const BOARD_BORDER_WIDTH = 3; const DRAG_ACTIVATION_TOLERANCE = 0.35;

export function GameBoard({ session, onPress, onDoublePress, onDragToggleExcluded, dualColorCellIndexes = [], showDualRegions = false }: Props) {
  const { width, height } = useWindowDimensions(); const boardSize = Math.min(width - 24, height * .58, 560); const innerBoardSize = boardSize - BOARD_BORDER_WIDTH * 2; const cellSize = innerBoardSize / session.puzzle.size;
  const conflicts = useMemo(() => findRuleConflicts(session.boardState).positions, [session.boardState]);
  const solutionCrowns = useMemo(() => { if (session.revealedFrozenCellIndexes.length === 0) return new Set<number>(); const solution = extractFirstSolution(createBoard(session.puzzle)); return new Set((solution ?? []).map(({ row, column }) => row * session.puzzle.size + column)); }, [session.puzzle, session.revealedFrozenCellIndexes]);
  const dualSet = useMemo(() => new Set(dualColorCellIndexes), [dualColorCellIndexes]);
  const drag = useRef<DragMemory | null>(null); const [lastInteractedIndex, setLastInteractedIndex] = useState<number | null>(null);
  const isProtected = (index: number): boolean => { const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; return isGivenQueen(session, { row, column }) || session.lostCellIndexes.includes(index) || (session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index)); };
  const invokeForIndex = (index: number, action: 'click' | 'doubleClick') => { if (isProtected(index)) return; const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; setLastInteractedIndex(index); if (action === 'click') onPress(row, column); else onDoublePress(row, column); };
  const applyDragIndex = (memory: DragMemory, index: number) => { if (memory.visited.has(index) || isProtected(index)) return; memory.visited.add(index); const state = session.boardState.cells[index]!; if (memory.mode === 'fill-x' && state === 'empty') invokeForIndex(index, 'click'); if (memory.mode === 'erase-x' && state === 'excluded') { const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; setLastInteractedIndex(index); onDragToggleExcluded?.(row, column); } };
  const applyDragLine = (memory: DragMemory, fromIndex: number, toIndex: number) => { const size = session.puzzle.size; const fromRow = Math.floor(fromIndex / size); const fromColumn = fromIndex % size; const toRow = Math.floor(toIndex / size); const toColumn = toIndex % size; const steps = Math.max(Math.abs(toRow - fromRow), Math.abs(toColumn - fromColumn)); if (!steps) return; for (let step = 1; step <= steps; step += 1) { const row = Math.round(fromRow + (toRow - fromRow) * step / steps); const column = Math.round(fromColumn + (toColumn - fromColumn) * step / steps); applyDragIndex(memory, row * size + column); } };
  const unitHasNoQueenAndAllX = (index: number): boolean => { const size = session.puzzle.size; const row = Math.floor(index / size); const column = index % size; const region = session.puzzle.regionMap[index]!; const rowIndexes = Array.from({ length: size }, (_, value) => row * size + value); const columnIndexes = Array.from({ length: size }, (_, value) => value * size + column); const regionIndexes = session.puzzle.regionMap.flatMap((value, cell) => value === region ? [cell] : []); return [rowIndexes, columnIndexes, regionIndexes].some((indexes) => { const states = indexes.map((cell) => session.boardState.cells[cell]!); return !states.includes('queen') && states.every((state) => state === 'excluded'); }); };
  const startDrag = (index: number, pageX: number, pageY: number) => { if (isProtected(index)) return; const state = session.boardState.cells[index]!; const mode = state === 'excluded' ? 'erase-x' : 'fill-x'; drag.current = { lastIndex: index, startIndex: index, startState: state, mode, startPageX: pageX, startPageY: pageY, dragging: false, visited: new Set<number>() }; };
  const moveDrag = (pageX: number, pageY: number) => {
    const memory = drag.current;
    if (!memory) return;
    if (!memory.dragging) {
      memory.dragging = true;
      if (memory.startState !== 'queen') applyDragIndex(memory, memory.startIndex);
    }
    const size = session.puzzle.size;
    const startColumn = memory.startIndex % size;
    const startRow = Math.floor(memory.startIndex / size);
    const boardX = (startColumn + 0.5) * cellSize + pageX - memory.startPageX;
    const boardY = (startRow + 0.5) * cellSize + pageY - memory.startPageY;
    const column = Math.floor(boardX / cellSize);
    const row = Math.floor(boardY / cellSize);
    if (row < 0 || row >= size || column < 0 || column >= size) return;
    const localX = boardX - column * cellSize;
    const localY = boardY - row * cellSize;
    const nearCenter = Math.abs(localX / cellSize - 0.5) <= DRAG_ACTIVATION_TOLERANCE && Math.abs(localY / cellSize - 0.5) <= DRAG_ACTIVATION_TOLERANCE;
    if (!nearCenter) return;
    const index = row * size + column;
    applyDragLine(memory, memory.lastIndex, index);
    memory.lastIndex = index;
  };
  const endDrag = () => { drag.current = null; };
  const wrapCellInput = (index: number, cell: React.ReactNode, protectedCell: boolean) => {
    const singleTap = () => invokeForIndex(index, 'click');
    const doubleTap = () => invokeForIndex(index, 'doubleClick');
    const dragBegin = (pageX: number, pageY: number) => startDrag(index, pageX, pageY);
    const dragUpdate = (pageX: number, pageY: number) => moveDrag(pageX, pageY);
    const dragEnd = () => endDrag();
    return <WebCellInput enabled={!protectedCell} onSingleTap={singleTap} onDoubleTap={doubleTap} onDragBegin={dragBegin} onDragUpdate={dragUpdate} onDragEnd={dragEnd}>{cell}</WebCellInput>
     ;
  };
  return <View accessibilityLabel="game-board" style={[styles.board, { height: boardSize, width: boardSize }]} testID="game-board">{session.boardState.cells.map((state, index) => { const row = Math.floor(index / session.puzzle.size); const column = index % session.puzzle.size; const position = { row, column }; const key = positionKey(position); const given = isGivenQueen(session, position); const error = lastInteractedIndex === index && (conflicts.has(key) || unitHasNoQueenAndAllX(index)); const hinted = session.hintTarget?.row === row && session.hintTarget?.column === column; const region = session.puzzle.regionMap[cellIndex(session.puzzle.size, position)]!; const lost = session.lostCellIndexes.includes(index); const frozen = session.frozenCellIndexes.includes(index) && !session.revealedFrozenCellIndexes.includes(index); const revealedCrown = session.revealedFrozenCellIndexes.includes(index) && solutionCrowns.has(index); const dual = showDualRegions && session.status !== 'completed' && dualSet.has(index); const protectedCell = given || lost || frozen; return wrapCellInput(index, <Pressable key={key} accessibilityRole="button" accessibilityState={{ disabled: protectedCell }} accessibilityLabel={`第 ${row + 1} 列第 ${column + 1} 行，${lost ? '遺失' : frozen ? '冰封' : state === 'queen' || revealedCrown ? '皇后' : state === 'excluded' ? '叉號' : '空白'}${given ? '，預置' : ''}${dual ? '，雙色域' : ''}${error ? '，錯誤' : ''}`} testID={lost ? `lost-${row}-${column}` : frozen ? `frozen-${row}-${column}` : hinted ? 'hint-target' : `cell-${row}-${column}`} style={[styles.cell, { backgroundColor: REGION_COLORS[region % REGION_COLORS.length], height: cellSize, width: cellSize }, lost && styles.lost, frozen && styles.frozen, error && styles.error, hinted && styles.hinted]} disabled={protectedCell} >{dual && <><View pointerEvents="none" style={[styles.dualTriangleTop, { borderBottomColor: REGION_COLORS[(region + 1) % REGION_COLORS.length] }]} testID={`dual-region-a-${row}-${column}`} /><View pointerEvents="none" style={[styles.dualTriangleBottom, { borderTopColor: REGION_COLORS[(region + 1) % REGION_COLORS.length] }]} testID={`dual-region-b-${row}-${column}`} /></>}{frozen && <Text style={styles.ice}>❄</Text>}{(state === 'queen' || revealedCrown) && <Text style={[styles.queen, given && styles.given]} testID={`queen-${row}-${column}`}>♛</Text>}{state === 'excluded' && <Text style={styles.excluded}>×</Text>}{hinted && <View pointerEvents="none" style={styles.hintDot} />}</Pressable>, protectedCell); })}</View>;
}
const styles = StyleSheet.create({ board: { borderColor: '#d6b870', borderRadius: 10, borderWidth: BOARD_BORDER_WIDTH, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' }, cell: { alignItems: 'center', borderColor: 'rgba(23,20,42,.12)', borderWidth: .5, justifyContent: 'center', position: 'relative' }, dualTriangleTop: { borderLeftColor: 'transparent', borderLeftWidth: 999, borderRightColor: 'transparent', borderRightWidth: 0, borderStyle: 'solid', borderTopWidth: 0, borderBottomWidth: 999, bottom: 0, height: 0, left: 0, position: 'absolute', width: 0 }, dualTriangleBottom: { borderLeftColor: 'transparent', borderLeftWidth: 0, borderRightColor: 'transparent', borderRightWidth: 999, borderStyle: 'solid', borderBottomWidth: 0, borderTopWidth: 999, height: 0, position: 'absolute', right: 0, top: 0, width: 0 }, error: { backgroundColor: '#d86470', borderColor: '#ffabb3', borderWidth: 3 }, hinted: { borderColor: '#fff29d', borderWidth: 4 }, queen: { color: '#17142a', fontSize: 29, lineHeight: 35 }, given: { color: '#9b6a08' }, excluded: { color: '#514b67', fontSize: 23, fontWeight: '500' }, hintDot: { backgroundColor: '#fff29d', borderRadius: 5, height: 9, position: 'absolute', right: 3, top: 3, width: 9 }, lost: { backgroundColor: '#17142a', borderColor: '#514a70', borderStyle: 'dashed', borderWidth: 1.5 }, frozen: { backgroundColor: '#b9dce8', borderColor: '#eefbff', borderWidth: 2 }, ice: { color: '#f5fdff', fontSize: 18 } });