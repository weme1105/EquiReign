import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { createGameSession, cycleCell, requestHint, restart, toPuzzleResult, toggleExcluded, undo } from '../src/game-core/session.ts';
import type { Difficulty } from '../src/game-core/types.ts';
import { GameBoard } from '../src/features/game/GameBoard.tsx';
import { getPuzzle } from '../src/puzzles/catalog.ts';

function parseDifficulty(value: string | string[] | undefined): Difficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' || value === 'expert' || value === 'king' ? value : 'beginner';
}
function formatTime(ms: number): string { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

export default function GameScreen() {
  const params = useLocalSearchParams<{ difficulty?: string }>(); const difficulty = parseDifficulty(params.difficulty);
  const puzzle = useMemo(() => getPuzzle(difficulty), [difficulty]);
  const [session, setSession] = useState(() => createGameSession(puzzle)); const [now, setNow] = useState(Date.now());
  useEffect(() => { if (session.status === 'completed') return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [session.status]);
  const policy = DIFFICULTIES[difficulty]; const result = toPuzzleResult(session, now); const hintsLeft = policy.hintLimit - session.hintsUsed;

  if (session.status === 'completed') return <SafeAreaView style={styles.screen}><View style={styles.completed} testID="completion-screen">
    <Text style={styles.crown}>♛</Text><Text style={styles.completedTitle}>王冠歸位</Text><Text style={styles.completedMeta}>{formatTime(result.elapsedTimeMs)}　{session.history.length} 步　提示 {result.hintsUsed}</Text>
    <Pressable onPress={() => setSession(restart(session))} style={styles.primary} testID="play-again"><Text style={styles.primaryText}>再玩一次</Text></Pressable>
    <Pressable onPress={() => router.replace('/')} style={styles.secondary}><Text style={styles.secondaryText}>選擇其他難度</Text></Pressable>
  </View></SafeAreaView>;

  return <SafeAreaView style={styles.screen}><View style={styles.header}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 難度</Text></Pressable><View style={styles.headerCenter}><Text style={[styles.level, { color: policy.accent }]}>{policy.label}</Text><Text style={styles.timer} testID="timer">{formatTime(result.elapsedTimeMs)}</Text></View>
    <Pressable onPress={() => router.push('/settings')} testID="game-settings"><Text style={styles.back}>設定</Text></Pressable>
  </View><View style={styles.content}>
    <GameBoard session={session} onPress={(row, column) => setSession((current) => cycleCell(current, { row, column }))} onLongPress={(row, column) => setSession((current) => toggleExcluded(current, { row, column }))} />
    <Text style={styles.instruction}>點擊：空白 → × → 皇后　金色皇后不可修改</Text>
    {session.completionError && <Text style={styles.errorText} testID="completion-error">盤面尚未正確完成，請檢查紅色衝突。</Text>}
    <View style={styles.actions}>
      <Pressable disabled={!session.history.length} onPress={() => setSession(undo)} style={[styles.action, !session.history.length && styles.disabled]} testID="undo-button"><Text style={styles.actionText}>Undo</Text></Pressable>
      <Pressable onPress={() => setSession((current) => restart(current))} style={styles.action} testID="restart-button"><Text style={styles.actionText}>Restart</Text></Pressable>
      {policy.hintLimit > 0 && <Pressable disabled={!hintsLeft || !!session.hintTarget} onPress={() => setSession(requestHint)} style={[styles.hint, (!hintsLeft || !!session.hintTarget) && styles.disabled]} testID="hint-button"><Text style={styles.hintText}>提示 {hintsLeft}</Text></Pressable>}
    </View>
    <View style={styles.help}><Pressable onPress={() => router.push({ pathname: '/help', params: { tab: 'operation' } })}><Text style={styles.helpText}>操作</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/help', params: { tab: 'rules' } })}><Text style={styles.helpText}>規則</Text></Pressable></View>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  back: { color: '#aaa4bc', fontSize: 15 }, headerCenter: { alignItems: 'center' }, level: { fontSize: 16, fontWeight: '800' }, timer: { color: '#777087', fontVariant: ['tabular-nums'], marginTop: 2 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 12 }, instruction: { color: '#aaa4bc', fontSize: 12, marginTop: 15 },
  errorText: { color: '#f58a94', fontWeight: '700', marginTop: 10 }, actions: { flexDirection: 'row', gap: 10, marginTop: 16 }, action: { backgroundColor: '#292441', borderRadius: 11, paddingHorizontal: 17, paddingVertical: 11 },
  actionText: { color: '#ddd6e8', fontWeight: '700' }, hint: { backgroundColor: '#3a3424', borderColor: '#d6b870', borderRadius: 11, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 10 }, hintText: { color: '#f0d58e', fontWeight: '800' },
  disabled: { opacity: .35 }, help: { flexDirection: 'row', gap: 22, marginTop: 15 }, helpText: { color: '#777087', textDecorationLine: 'underline' },
  completed: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 }, crown: { color: '#d6b870', fontSize: 76 }, completedTitle: { color: '#fffaf1', fontSize: 32, fontWeight: '800', marginTop: 10 },
  completedMeta: { color: '#aaa4bc', marginTop: 9 }, primary: { backgroundColor: '#d6b870', borderRadius: 13, marginTop: 30, paddingHorizontal: 26, paddingVertical: 14 }, primaryText: { color: '#17142a', fontWeight: '800' },
  secondary: { marginTop: 16, padding: 8 }, secondaryText: { color: '#aaa4bc' },
});
