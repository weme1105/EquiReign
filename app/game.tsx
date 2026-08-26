import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getDemoCase } from '../src/demo/demo-cases.ts';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { completeCampaignLevel, recordChallengeSuccess, recordFirstClear } from '../src/game-core/progression.ts';
import { createGameSession, cycleCell, requestHint, restart, toPuzzleResult, toggleExcluded, undo } from '../src/game-core/session.ts';
import type { BoardSize, Difficulty, GameSession, PuzzleDefinition } from '../src/game-core/types.ts';
import { GameBoard } from '../src/features/game/GameBoard.tsx';
import { getBundledCampaignPuzzle } from '../src/puzzles/bundled-campaign.ts';
import { ensureDownloadedCampaignPuzzle } from '../src/puzzles/campaign-puzzle-source.ts';
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
  const params = useLocalSearchParams<{ difficulty?: string; size?: string; resume?: string; mode?: string; level?: string; demo?: string }>();
  const difficulty = parseDifficulty(params.difficulty); const size = parseSize(params.size); const resumeSaved = params.resume === '1';
  const demoCase = useMemo(() => getDemoCase(params.demo), [params.demo]); const isDemo = !!demoCase;
  const requestedMode = isDemo ? 'free' : params.mode === 'campaign' || params.mode === 'challenge' ? params.mode : 'free'; const requestedLevel = Number(params.level);
  const bundledPuzzle = useMemo<PuzzleDefinition | null>(() => {
    if (demoCase) return demoCase.puzzle;
    if (requestedMode !== 'campaign') return getPuzzle(difficulty, size);
    if (!Number.isInteger(requestedLevel) || requestedLevel < 1) return null;
    return requestedLevel < 100 ? getBundledCampaignPuzzle(requestedLevel) : null;
  }, [demoCase, difficulty, requestedLevel, requestedMode, size]);
  const context = { playMode: requestedMode, campaignLevel: requestedMode === 'campaign' && Number.isInteger(requestedLevel) ? requestedLevel : null } as const;
  const createSession = (definition: PuzzleDefinition): GameSession => {
    const base = createGameSession(definition, Date.now(), context);
    return demoCase ? { ...base, frozenCellIndexes: demoCase.frozenCellIndexes, lostCellIndexes: demoCase.lostCellIndexes } : base;
  };
  const [puzzle, setPuzzle] = useState<PuzzleDefinition | null>(bundledPuzzle);
  const [session, setSession] = useState<GameSession | null>(() => bundledPuzzle ? createSession(bundledPuzzle) : null);
  const [isReady, setIsReady] = useState(false); const [loadError, setLoadError] = useState(false); const [now, setNow] = useState(Date.now());
  const recordedCompletion = useRef<string | null>(null); const replayedCompletion = useRef<string | null>(null); const [persistedCompletionKey, setPersistedCompletionKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true; setIsReady(false); setLoadError(false);
    void (async () => {
      let resolved = bundledPuzzle;
      if (!isDemo && requestedMode === 'campaign' && Number.isInteger(requestedLevel) && requestedLevel >= 100) {
        try { resolved = await ensureDownloadedCampaignPuzzle(requestedLevel); } catch { resolved = null; }
      }
      if (!active) return;
      if (!resolved) { setPuzzle(null); setSession(null); setLoadError(true); return; }
      const saved = !isDemo && resumeSaved ? await loadActiveSession() : null;
      if (!active) return;
      const next = saved?.puzzle.id === resolved.id && saved.status !== 'completed' ? saved : createSession(resolved);
      setPuzzle(resolved); setSession(next); setNow(Date.now()); setIsReady(true);
    })();
    return () => { active = false; };
  }, [bundledPuzzle, isDemo, resumeSaved, requestedMode, requestedLevel]);

  useEffect(() => { if (isDemo || !isReady || !session) return; if (session.status === 'completed') void clearActiveSession(); else void saveActiveSession(session); }, [isDemo, isReady, session]);
  useEffect(() => { if (!session || session.status === 'completed') return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [session]);

  const policy = DIFFICULTIES[session?.difficulty ?? difficulty];
  const result = session ? toPuzzleResult(session, now) : null;
  const hintsLeft = session ? policy.hintLimit - session.hintsUsed : 0;
  const completionKey = session?.status === 'completed' ? `${session.playMode}:${session.campaignLevel ?? session.puzzle.id}:${session.completedAtMs}` : null;

  useEffect(() => {
    if (!session || !result || session.status !== 'completed' || !completionKey) return;
    if (recordedCompletion.current === completionKey) return;
    recordedCompletion.current = completionKey; setPersistedCompletionKey(null);
    if (isDemo) { setPersistedCompletionKey(completionKey); return; }
    let active = true;
    void (async () => {
      const current = await loadPlayerProgress();
      const wasCampaignReplay = session.playMode === 'campaign' && !!session.campaignLevel && session.campaignLevel <= current.completedCampaignLevel;
      let next = current;
      if (session.playMode === 'campaign' && session.campaignLevel) next = completeCampaignLevel(next, session.campaignLevel);
      if (session.playMode === 'challenge') next = recordChallengeSuccess(next, { difficulty: session.difficulty, size: session.puzzle.size as BoardSize });
      const recordKey = session.playMode === 'campaign' ? `campaign:${session.campaignLevel}` : `${session.playMode}:${session.puzzle.id}`;
      next = recordFirstClear(next, recordKey, { elapsedTimeMs: result.elapsedTimeMs, hintsUsed: result.hintsUsed, completedAtMs: session.completedAtMs! });
      await savePlayerProgress(next);
      if (active && recordedCompletion.current === completionKey) { replayedCompletion.current = wasCampaignReplay ? completionKey : null; setPersistedCompletionKey(completionKey); }
    })();
    return () => { active = false; };
  }, [completionKey, isDemo, result, session]);

  if (loadError) return <SafeAreaView accessibilityLabel="關卡資料無法讀取" style={styles.screen} testID="game-screen"><View style={styles.loading}><Text style={styles.loadingText}>這批關卡尚未下載，請連線後再試。</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/campaign')} style={styles.secondary}><Text style={styles.secondaryText}>返回闖關</Text></Pressable></View></SafeAreaView>;
  if (!isReady || !session || !puzzle || !result) return <SafeAreaView accessibilityLabel="遊戲載入中" style={styles.screen} testID="game-screen"><View style={styles.loading}><Text style={styles.loadingText}>讀取棋局…</Text></View></SafeAreaView>;

  if (session.status === 'completed') {
    const completionPersisted = persistedCompletionKey === completionKey; const campaignWasReplay = replayedCompletion.current === completionKey;
    return <SafeAreaView accessibilityLabel="遊戲已就緒" style={styles.screen} testID="game-screen"><View style={styles.completed} testID="completion-screen">
      <Text style={styles.crown}>♛</Text><Text style={styles.completedTitle}>{isDemo ? 'Demo 通關' : '王冠歸位'}</Text><Text style={styles.completedMeta}>{formatTime(result.elapsedTimeMs)} · {session.history.length} 步 · 提示 {result.hintsUsed}</Text>
      {demoCase?.dualColorCellIndexes.length ? <View style={styles.demoReveal}><Text style={styles.demoRevealTitle}>結算揭示：雙色域</Text><GameBoard session={session} onPress={() => {}} onLongPress={() => {}} dualColorCellIndexes={demoCase.dualColorCellIndexes} showDualRegions /></View> : null}
      {result.limitedXClear && <Text style={styles.badge}>無 X 挑戰達成 · 有效 X {result.effectiveExcludedCount}/{session.puzzle.size}</Text>}
      {isDemo
        ? <Pressable accessibilityRole="button" onPress={() => setSession(createSession(puzzle))} style={styles.primary} testID="play-again"><Text style={styles.primaryText}>再測一次</Text></Pressable>
        : session.playMode === 'campaign' && session.campaignLevel
          ? <Pressable accessibilityRole="button" disabled={!completionPersisted} onPress={() => router.replace('/campaign')} style={[styles.primary, !completionPersisted && styles.disabled]} testID={campaignWasReplay ? 'return-campaign' : 'next-level'}><Text style={styles.primaryText}>{completionPersisted ? (campaignWasReplay ? '返回闖關' : '下一關') : '儲存中…'}</Text></Pressable>
          : <Pressable accessibilityRole="button" disabled={!completionPersisted} onPress={() => setSession(restart(session))} style={[styles.primary, !completionPersisted && styles.disabled]} testID="play-again"><Text style={styles.primaryText}>{completionPersisted ? '再玩一次' : '儲存中…'}</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={() => router.replace(isDemo ? '/demo' : '/')} style={styles.secondary}><Text style={styles.secondaryText}>{isDemo ? '返回 Demo 列表' : '選擇其他選項'}</Text></Pressable>
    </View></SafeAreaView>;
  }

  return <SafeAreaView accessibilityLabel="遊戲已就緒" style={styles.screen} testID="game-screen"><View style={styles.header}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ 選項</Text></Pressable><View style={styles.headerCenter}><Text style={[styles.level, { color: policy.accent }]}>{demoCase ? demoCase.title : `${policy.label} · ${session.puzzle.size}×${session.puzzle.size}`}</Text><Text style={styles.timer} testID="timer">{formatTime(result.elapsedTimeMs)}</Text></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} testID="game-settings"><Text style={styles.back}>設定</Text></Pressable>
  </View><View style={styles.content}>
    <GameBoard session={session} onPress={(row, column) => setSession((current) => current ? cycleCell(current, { row, column }) : current)} onLongPress={(row, column) => setSession((current) => current ? toggleExcluded(current, { row, column }) : current)} dualColorCellIndexes={demoCase?.dualColorCellIndexes} />
    <Text style={styles.instruction}>{demoCase ? demoCase.description : '點擊：空白 → × → 皇后 · 金色皇后不可修改'}</Text>
    {demoCase?.dualColorCellIndexes.length ? <Text style={styles.demoNote}>雙色域目前依正式規則在遊戲中隱藏，通關結算才揭示。</Text> : null}
    {session.completionError && <Text style={styles.errorText} testID="completion-error">盤面尚未正確完成，請檢查紅色衝突。</Text>}
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" disabled={!session.history.length} onPress={() => setSession((current) => current ? undo(current) : current)} style={[styles.action, !session.history.length && styles.disabled]} testID="undo-button"><Text style={styles.actionText}>Undo</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setSession((current) => current ? restart(current) : current)} style={styles.action} testID="restart-button"><Text style={styles.actionText}>Restart</Text></Pressable>
      {policy.hintLimit > 0 && <Pressable accessibilityRole="button" disabled={!hintsLeft || !!session.hintTarget} onPress={() => setSession((current) => current ? requestHint(current) : current)} style={[styles.hint, (!hintsLeft || !!session.hintTarget) && styles.disabled]} testID="hint-button"><Text style={styles.hintText}>提示 {hintsLeft}</Text></Pressable>}
    </View>
    <View style={styles.help}><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/help', params: { tab: 'operation' } })}><Text style={styles.helpText}>操作</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/help', params: { tab: 'rules' } })}><Text style={styles.helpText}>規則</Text></Pressable></View>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  back: { color: '#aaa4bc', fontSize: 15 }, headerCenter: { alignItems: 'center' }, level: { fontSize: 16, fontWeight: '800' }, timer: { color: '#777087', fontVariant: ['tabular-nums'], marginTop: 2 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 12 }, instruction: { color: '#aaa4bc', fontSize: 12, marginTop: 15, textAlign: 'center' }, demoNote: { color: '#f0d58e', fontSize: 12, marginTop: 7, textAlign: 'center' },
  errorText: { color: '#f58a94', fontWeight: '700', marginTop: 10 }, actions: { flexDirection: 'row', gap: 10, marginTop: 16 }, action: { backgroundColor: '#292441', borderRadius: 11, paddingHorizontal: 17, paddingVertical: 11 },
  actionText: { color: '#ddd6e8', fontWeight: '700' }, hint: { backgroundColor: '#3a3424', borderColor: '#d6b870', borderRadius: 11, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 10 }, hintText: { color: '#f0d58e', fontWeight: '800' },
  disabled: { opacity: .35 }, help: { flexDirection: 'row', gap: 22, marginTop: 15 }, helpText: { color: '#777087', textDecorationLine: 'underline' },
  completed: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 }, crown: { color: '#d6b870', fontSize: 58 }, completedTitle: { color: '#fffaf1', fontSize: 30, fontWeight: '800', marginTop: 6 },
  completedMeta: { color: '#aaa4bc', marginTop: 7 }, demoReveal: { alignItems: 'center', marginTop: 12, maxHeight: 430 }, demoRevealTitle: { color: '#f0d58e', fontWeight: '800', marginBottom: 8 },
  primary: { backgroundColor: '#d6b870', borderRadius: 13, marginTop: 20, paddingHorizontal: 26, paddingVertical: 14 }, primaryText: { color: '#17142a', fontWeight: '800' },
  badge: { color: '#f0d58e', fontWeight: '800', marginTop: 12 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28 }, loadingText: { color: '#aaa4bc', textAlign: 'center' },
  secondary: { marginTop: 12, padding: 8 }, secondaryText: { color: '#aaa4bc' },
});
