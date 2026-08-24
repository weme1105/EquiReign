import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { completeCampaignLevel, recordChallengeSuccess, recordFirstClear } from '../src/game-core/progression.ts';
import { configureInfiniteSession, createGameSession, cycleCell, requestHint, restart, toPuzzleResult, toggleExcluded, undo } from '../src/game-core/session.ts';
import type { BoardSize, Difficulty } from '../src/game-core/types.ts';
import { GameBoard } from '../src/features/game/GameBoard.tsx';
import { getPuzzle } from '../src/puzzles/catalog.ts';
import { clearActiveSession, loadActiveSession, saveActiveSession } from '../src/storage/active-session-storage';
import { loadPlayerProgress, savePlayerProgress } from '../src/storage/player-progress-storage';

function parseDifficulty(value: string | string[] | undefined): Difficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' || value === 'expert' || value === 'king' ? value : 'beginner';
}
function parseSize(value: string | string[] | undefined): BoardSize {
  const parsed = Number(value); return parsed === 6 || parsed === 7 || parsed === 8 || parsed === 9 || parsed === 10 || parsed === 11 || parsed === 12 ? parsed : 8;
}
function formatTime(ms: number): string { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

export default function GameScreen() {
  const params = useLocalSearchParams<{ difficulty?: string; size?: string; resume?: string; mode?: string; level?: string }>(); const difficulty = parseDifficulty(params.difficulty); const size = parseSize(params.size); const resumeSaved = params.resume === '1';
  const requestedMode = params.mode === 'campaign' || params.mode === 'challenge' ? params.mode : 'free'; const requestedLevel = Number(params.level);
  const puzzle = useMemo(() => getPuzzle(difficulty, size), [difficulty, size]);
  const [isReady, setIsReady] = useState(false);
  const context = { playMode: requestedMode, campaignLevel: requestedMode === 'campaign' && Number.isInteger(requestedLevel) ? requestedLevel : null } as const;
  const newSession = () => { const created = createGameSession(puzzle, Date.now(), context); return requestedMode === 'campaign' && requestedLevel > 1000 ? configureInfiniteSession(created) : created; };
  const [session, setSession] = useState(newSession); const [now, setNow] = useState(Date.now());
  const recordedCompletion = useRef<string | null>(null);
  useEffect(() => {
    let active = true; setIsReady(false);
    void (async () => {
      const saved = resumeSaved ? await loadActiveSession() : null;
      const next = saved?.puzzle.id === puzzle.id && saved.status !== 'completed' ? saved : newSession();
      if (!active) return;
      setSession(next); setNow(Date.now()); setIsReady(true);
    })();
    return () => { active = false; };
  }, [puzzle, resumeSaved, requestedMode, requestedLevel]);
  useEffect(() => { if (!isReady) return; if (session.status === 'completed') void clearActiveSession(); else void saveActiveSession(session); }, [isReady, session]);
  useEffect(() => { if (session.status === 'completed') return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [session.status]);
  const policy = DIFFICULTIES[difficulty]; const result = toPuzzleResult(session, now); const hintsLeft = policy.hintLimit - session.hintsUsed;
  useEffect(() => {
    if (session.status !== 'completed') return;
    const completionKey = `${session.playMode}:${session.campaignLevel ?? session.puzzle.id}:${session.completedAtMs}`;
    if (recordedCompletion.current === completionKey) return; recordedCompletion.current = completionKey;
    void loadPlayerProgress().then((current) => {
      let next = current;
      if (session.playMode === 'campaign' && session.campaignLevel) next = completeCampaignLevel(next, session.campaignLevel);
      if (session.playMode === 'challenge') next = recordChallengeSuccess(next, { difficulty: session.difficulty, size: session.puzzle.size as BoardSize });
      const recordKey = session.playMode === 'campaign' ? `campaign:${session.campaignLevel}` : `${session.playMode}:${session.puzzle.id}`;
      next = recordFirstClear(next, recordKey, { elapsedTimeMs: result.elapsedTimeMs, hintsUsed: result.hintsUsed, completedAtMs: session.completedAtMs! });
      return savePlayerProgress(next);
    });
  }, [result.elapsedTimeMs, result.hintsUsed, session]);

  if (!isReady) return <SafeAreaView accessibilityLabel="遊戲載入中" style={styles.screen} testID="game-screen"><View style={styles.loading}><Text style={styles.loadingText}>讀取棋局…</Text></View></SafeAreaView>;

  if (session.status === 'completed') return <SafeAreaView accessibilityLabel="遊戲已就緒" style={styles.screen} testID="game-screen"><View style={styles.completed} testID="completion-screen">
    <Text style={styles.crown}>♛</Text><Text style={styles.completedTitle}>王冠歸位</Text><Text style={styles.completedMeta}>{formatTime(result.elapsedTimeMs)} · {session.history.length} 步 · 提示 {result.hintsUsed}</Text>
    {result.limitedXClear && <Text style={styles.badge}>無 X 挑戰達成 · 有效 X {result.effectiveExcludedCount}/{session.puzzle.size}</Text>}
    <Pressable accessibilityRole="button" onPress={() => setSession(restart(session))} style={styles.primary} testID="play-again"><Text style={styles.primaryText}>再玩一次</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.secondary}><Text style={styles.secondaryText}>選擇其他選項</Text></Pressable>
  </View></SafeAreaView>;

  return <SafeAreaView accessibilityLabel={isReady ? '遊戲已就緒' : '遊戲載入中'} style={styles.screen} testID="game-screen"><View style={styles.header}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ 選項</Text></Pressable><View style={styles.headerCenter}><Text style={[styles.level, { color: policy.accent }]}>{policy.label} · {size}×{size}</Text><Text style={styles.timer} testID="timer">{formatTime(result.elapsedTimeMs)}</Text></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} testID="game-settings"><Text style={styles.back}>設定</Text></Pressable>
  </View><View style={styles.content}>
    <GameBoard session={session} onPress={(row, column) => setSession((current) => cycleCell(current, { row, column }))} onLongPress={(row, column) => setSession((current) => toggleExcluded(current, { row, column }))} />
    <Text style={styles.instruction}>點擊：空白 → × → 皇后 · 金色皇后不可修改</Text>
    {session.completionError && <Text style={styles.errorText} testID="completion-error">盤面尚未正確完成，請檢查紅色衝突。</Text>}
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" disabled={!session.history.length} onPress={() => setSession(undo)} style={[styles.action, !session.history.length && styles.disabled]} testID="undo-button"><Text style={styles.actionText}>Undo</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setSession((current) => restart(current))} style={styles.action} testID="restart-button"><Text style={styles.actionText}>Restart</Text></Pressable>
      {policy.hintLimit > 0 && <Pressable accessibilityRole="button" disabled={!hintsLeft || !!session.hintTarget} onPress={() => setSession(requestHint)} style={[styles.hint, (!hintsLeft || !!session.hintTarget) && styles.disabled]} testID="hint-button"><Text style={styles.hintText}>提示 {hintsLeft}</Text></Pressable>}
    </View>
    <View style={styles.help}><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/help', params: { tab: 'operation' } })}><Text style={styles.helpText}>操作</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/help', params: { tab: 'rules' } })}><Text style={styles.helpText}>規則</Text></Pressable></View>
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
  badge: { color: '#f0d58e', fontWeight: '800', marginTop: 12 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' }, loadingText: { color: '#aaa4bc' },
  secondary: { marginTop: 16, padding: 8 }, secondaryText: { color: '#aaa4bc' },
});
