import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { CHALLENGE_UNLOCK_LEVEL, createPlayerProgress, isChallengeUnlocked, type PlayerProgress } from '../src/game-core/progression.ts';
import type { BoardSize, Difficulty } from '../src/game-core/types.ts';
import { BOARD_SIZES, DIFFICULTY_ORDER } from '../src/puzzles/catalog.ts';
import { loadActiveSession } from '../src/storage/active-session-storage';
import { loadPlayerProgress } from '../src/storage/player-progress-storage';

export default function HomeScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty>('advanced');
  const [size, setSize] = useState<BoardSize>(8);
  const [savedSession, setSavedSession] = useState<Awaited<ReturnType<typeof loadActiveSession>>>(null);
  const [progress, setProgress] = useState<PlayerProgress>(createPlayerProgress());
  const selectedPolicy = DIFFICULTIES[difficulty];
  useFocusEffect(useCallback(() => { let active = true; void Promise.all([loadActiveSession(), loadPlayerProgress()]).then(([saved, nextProgress]) => { if (active) { setSavedSession(saved); setProgress(nextProgress); } }); return () => { active = false; }; }, []));
  const challengeUnlocked = isChallengeUnlocked(progress);
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}><View><Text style={styles.eyebrow}>A QUEEN'S LOGIC</Text><Text style={styles.title}>EquiReign</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.settings} testID="settings-button"><Text style={styles.settingsText}>設定</Text></Pressable>
      </View>
      <Text style={styles.subtitle}>每列、每行與每個色區都只能有一位皇后。</Text>
      {savedSession && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/game', params: { difficulty: savedSession.difficulty, size: String(savedSession.puzzle.size), resume: '1' } })}
        style={styles.continueCard} testID="continue-game"><View><Text style={styles.continueTitle}>繼續遊戲</Text><Text style={styles.continueMeta}>{DIFFICULTIES[savedSession.difficulty].label} · {savedSession.puzzle.size}×{savedSession.puzzle.size} · {savedSession.history.length} 步</Text></View><Text style={styles.continueArrow}>›</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={() => router.push('/campaign')} style={[styles.modeCard, styles.campaignCard]} testID="campaign-mode"><Text style={styles.modeCode}>CAMPAIGN</Text><Text style={styles.modeTitle}>闖關</Text><Text style={styles.modeMeta}>下一關：第 {progress.completedCampaignLevel + 1} 關</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={!challengeUnlocked} onPress={() => router.push('/challenge')} style={[styles.modeCard, !challengeUnlocked && styles.disabledMode]} testID="challenge-mode"><Text style={styles.modeCode}>CHALLENGE</Text><Text style={styles.modeTitle}>難度挑戰</Text><Text style={styles.modeMeta}>{challengeUnlocked ? '選擇或隨機難度與尺寸' : `完成初級第 ${CHALLENGE_UNLOCK_LEVEL} 關後解鎖`}</Text></Pressable>
      {challengeUnlocked && false && <>
      <Text style={styles.sectionTitle}>選擇難度</Text>
      <View style={styles.options}>{DIFFICULTY_ORDER.map((option) => {
        const policy = DIFFICULTIES[option]; const selected = option === difficulty;
        return <Pressable accessibilityRole="button" key={option} onPress={() => setDifficulty(option)}
          style={({ pressed }) => [styles.option, selected && { borderColor: policy.accent }, pressed && styles.pressed]} testID={`difficulty-${option}`}>
          <View><Text style={[styles.optionTitle, { color: policy.accent }]}>{policy.label}</Text><Text style={styles.optionCode}>{option.toUpperCase()}</Text></View>
          <Text style={styles.optionMeta}>預置 {policy.givenQueenCount} · 即時驗證 {policy.realtimeQueenValidation ? '開' : '關'} · 提示 {policy.hintLimit}</Text>
        </Pressable>;
      })}</View>
      <Text style={styles.sectionTitle}>選擇棋盤尺寸</Text>
      <View style={styles.sizes}>{BOARD_SIZES.map((option) => <Pressable accessibilityRole="button" key={option} onPress={() => setSize(option)}
        style={[styles.size, size === option && { backgroundColor: selectedPolicy.accent, borderColor: selectedPolicy.accent }]} testID={`size-${option}`}>
        <Text style={[styles.sizeText, size === option && styles.sizeTextSelected]}>{option}×{option}</Text>
      </Pressable>)}</View>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/game', params: { mode: 'challenge', difficulty, size: String(size) } })}
        style={[styles.start, { backgroundColor: selectedPolicy.accent }]} testID="start-game"><Text style={styles.startText}>開始遊戲</Text></Pressable>
      </>}
      <View style={styles.helpRow}>
        <Pressable onPress={() => router.push({ pathname: '/help', params: { tab: 'operation' } })} testID="operation-tip"><Text style={styles.help}>操作方式</Text></Pressable>
        <Pressable onPress={() => router.push({ pathname: '/help', params: { tab: 'rules' } })} testID="rule-tip"><Text style={styles.help}>遊戲規則</Text></Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', flexGrow: 1, justifyContent: 'center', maxWidth: 560, padding: 28, width: '100%' },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, eyebrow: { color: '#d6b870', fontSize: 11, fontWeight: '700', letterSpacing: 3 },
  title: { color: '#fffaf1', fontSize: 46, fontWeight: '800', letterSpacing: -2 }, subtitle: { color: '#aaa4bc', fontSize: 15, marginTop: 8 },
  settings: { borderColor: '#625b78', borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 }, settingsText: { color: '#ddd6e8', fontWeight: '700' },
  continueCard: { alignItems: 'center', backgroundColor: '#302941', borderColor: '#d6b870', borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, padding: 16 }, continueTitle: { color: '#f0d58e', fontSize: 17, fontWeight: '900' }, continueMeta: { color: '#aaa4bc', fontSize: 12, marginTop: 4 }, continueArrow: { color: '#d6b870', fontSize: 30 },
  modeCard: { backgroundColor: '#211d38', borderColor: '#514a70', borderRadius: 16, borderWidth: 2, marginTop: 14, padding: 18 }, campaignCard: { borderColor: '#d6b870' }, disabledMode: { opacity: .45 }, modeCode: { color: '#777087', fontSize: 9, fontWeight: '800', letterSpacing: 2 }, modeTitle: { color: '#fffaf1', fontSize: 23, fontWeight: '900', marginTop: 4 }, modeMeta: { color: '#aaa4bc', fontSize: 12, marginTop: 5 },
  sectionTitle: { color: '#ddd6e8', fontSize: 13, fontWeight: '800', marginBottom: 9, marginTop: 24 }, options: { gap: 9 }, option: { alignItems: 'center', backgroundColor: '#211d38', borderColor: '#312b4b', borderRadius: 14, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  optionTitle: { fontSize: 20, fontWeight: '800' }, optionCode: { color: '#777087', fontSize: 9, letterSpacing: 1.5, marginTop: 2 }, optionMeta: { color: '#aaa4bc', fontSize: 12 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, size: { alignItems: 'center', borderColor: '#4b4560', borderRadius: 10, borderWidth: 1, flexBasis: '22%', flexGrow: 1, paddingVertical: 11 }, sizeText: { color: '#c8c1d5', fontSize: 12, fontWeight: '800' }, sizeTextSelected: { color: '#17142a' },
  start: { alignItems: 'center', borderRadius: 13, marginTop: 22, paddingVertical: 14 }, startText: { color: '#17142a', fontSize: 16, fontWeight: '900' },
  pressed: { opacity: .7, transform: [{ scale: .99 }] }, helpRow: { flexDirection: 'row', gap: 24, justifyContent: 'center', marginTop: 22 }, help: { color: '#bdb4cf', textDecorationLine: 'underline' },
});
