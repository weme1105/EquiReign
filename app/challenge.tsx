import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { BOARD_SIZE_ORDER, DIFFICULTY_ORDER, resolveChallengeSelection } from '../src/game-core/progression.ts';
import type { BoardSize, Difficulty } from '../src/game-core/types.ts';

export default function ChallengeScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty | 'random'>('random'); const [size, setSize] = useState<BoardSize | 'random'>('random');
  const start = () => { const selected = resolveChallengeSelection({ difficulty, size }); router.push({ pathname: '/game', params: { mode: 'challenge', difficulty: selected.difficulty, size: String(selected.size) } }); };
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable><Text style={styles.title}>難度挑戰</Text>
    <Text style={styles.label}>難度</Text><View style={styles.wrap}>{(['random', ...DIFFICULTY_ORDER] as const).map((item) => <Pressable key={item} onPress={() => setDifficulty(item)} style={[styles.choice, difficulty === item && styles.selected]}><Text style={styles.choiceText}>{item === 'random' ? '隨機' : DIFFICULTIES[item].label}</Text></Pressable>)}</View>
    <Text style={styles.label}>尺寸</Text><View style={styles.wrap}>{(['random', ...BOARD_SIZE_ORDER] as const).map((item) => <Pressable key={item} onPress={() => setSize(item)} style={[styles.choice, size === item && styles.selected]}><Text style={styles.choiceText}>{item === 'random' ? '隨機' : `${item}×${item}`}</Text></Pressable>)}</View>
    <Pressable onPress={start} style={styles.start} testID="challenge-start"><Text style={styles.startText}>開始挑戰</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', maxWidth: 560, padding: 28, width: '100%' }, back: { color: '#aaa4bc', fontSize: 16, marginBottom: 28 }, title: { color: '#fffaf1', fontSize: 36, fontWeight: '900' }, label: { color: '#ddd6e8', fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 26 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { borderColor: '#514a70', borderRadius: 11, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 11 }, selected: { backgroundColor: '#806d36', borderColor: '#d6b870' }, choiceText: { color: '#fffaf1', fontWeight: '800' }, start: { alignItems: 'center', backgroundColor: '#d6b870', borderRadius: 14, marginTop: 34, padding: 15 }, startText: { color: '#17142a', fontSize: 17, fontWeight: '900' } });
