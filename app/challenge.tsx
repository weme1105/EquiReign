import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { BOARD_SIZE_ORDER, challengeSuccessCount, createPlayerProgress, DIFFICULTY_ORDER, isChallengeUnlocked, resolveChallengeSelection, type PlayerProgress } from '../src/game-core/progression.ts';
import type { BoardSize, Difficulty } from '../src/game-core/types.ts';
import { loadPlayerProgress } from '../src/storage/player-progress-storage';

const DEMO_CHALLENGE_ALWAYS_UNLOCKED = true;
const DEMO_CHALLENGE_TARGET = 50;

export default function ChallengeScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty | 'random'>('random'); const [size, setSize] = useState<BoardSize | 'random'>('random');
  const [progress, setProgress] = useState<PlayerProgress>(createPlayerProgress());
  useFocusEffect(useCallback(() => { let active = true; void loadPlayerProgress().then((value) => { if (active) setProgress(value); }); return () => { active = false; }; }, []));
  const start = () => { const selected = resolveChallengeSelection({ difficulty, size }); router.push({ pathname: '/game', params: { mode: 'challenge', difficulty: selected.difficulty, size: String(selected.size) } }); };
  if (!DEMO_CHALLENGE_ALWAYS_UNLOCKED && !isChallengeUnlocked(progress)) return <SafeAreaView style={styles.screen}><View style={styles.locked}><Text style={styles.title}>難度挑戰尚未解鎖</Text><Text style={styles.lockedText}>完成初級第 200 關後開放。</Text><Pressable onPress={() => router.replace('/campaign')} style={styles.start}><Text style={styles.startText}>前往闖關</Text></Pressable></View></SafeAreaView>;
  const selectedCount = difficulty !== 'random' && size !== 'random' ? challengeSuccessCount(progress, { difficulty, size }) : null;
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable><Text style={styles.title}>難度挑戰</Text>
    <Text style={styles.demoMeta}>Demo 階段直接開放 · 先驗證 50 次挑戰流程</Text>
    <Text style={styles.label}>難度</Text><View style={styles.wrap}>{(['random', ...DIFFICULTY_ORDER] as const).map((item) => <Pressable key={item} onPress={() => setDifficulty(item)} style={[styles.choice, difficulty === item && styles.selected]}><Text style={styles.choiceText}>{item === 'random' ? '隨機' : DIFFICULTIES[item].label}</Text></Pressable>)}</View>
    <Text style={styles.label}>尺寸</Text><View style={styles.wrap}>{(['random', ...BOARD_SIZE_ORDER] as const).map((item) => <Pressable key={item} onPress={() => setSize(item)} style={[styles.choice, size === item && styles.selected]}><Text style={styles.choiceText}>{item === 'random' ? '隨機' : `${item}×${item}`}</Text></Pressable>)}</View>
    {selectedCount !== null && <Text style={styles.count}>此組合已成功 {Math.min(selectedCount, DEMO_CHALLENGE_TARGET)}/{DEMO_CHALLENGE_TARGET} 次</Text>}
    <Pressable onPress={start} style={styles.start} testID="challenge-start"><Text style={styles.startText}>開始挑戰</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', maxWidth: 560, padding: 28, width: '100%' }, locked: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 480, padding: 28, width: '100%' }, lockedText: { color: '#aaa4bc', marginTop: 12 }, back: { color: '#aaa4bc', fontSize: 16, marginBottom: 28 }, title: { color: '#fffaf1', fontSize: 36, fontWeight: '900' }, demoMeta: { color: '#f0d58e', fontSize: 12, marginTop: 10 }, label: { color: '#ddd6e8', fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 26 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { borderColor: '#514a70', borderRadius: 11, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 11 }, selected: { backgroundColor: '#806d36', borderColor: '#d6b870' }, choiceText: { color: '#fffaf1', fontWeight: '800' }, count: { color: '#f0d58e', fontWeight: '800', marginTop: 18 }, start: { alignItems: 'center', backgroundColor: '#d6b870', borderRadius: 14, marginTop: 34, padding: 15 }, startText: { color: '#17142a', fontSize: 17, fontWeight: '900' } });
