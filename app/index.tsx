import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import type { BoardSize, Difficulty } from '../src/game-core/types.ts';
import { BOARD_SIZES, DIFFICULTY_ORDER } from '../src/puzzles/catalog.ts';

export default function HomeScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty>('advanced');
  const [size, setSize] = useState<BoardSize>(8);
  const selectedPolicy = DIFFICULTIES[difficulty];
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}><View><Text style={styles.eyebrow}>A QUEEN'S LOGIC</Text><Text style={styles.title}>EquiReign</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.settings} testID="settings-button"><Text style={styles.settingsText}>設定</Text></Pressable>
      </View>
      <Text style={styles.subtitle}>每列、每行與每個色區都只能有一位皇后。</Text>
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
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/game', params: { difficulty, size: String(size) } })}
        style={[styles.start, { backgroundColor: selectedPolicy.accent }]} testID="start-game"><Text style={styles.startText}>開始遊戲</Text></Pressable>
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
  sectionTitle: { color: '#ddd6e8', fontSize: 13, fontWeight: '800', marginBottom: 9, marginTop: 24 }, options: { gap: 9 }, option: { alignItems: 'center', backgroundColor: '#211d38', borderColor: '#312b4b', borderRadius: 14, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  optionTitle: { fontSize: 20, fontWeight: '800' }, optionCode: { color: '#777087', fontSize: 9, letterSpacing: 1.5, marginTop: 2 }, optionMeta: { color: '#aaa4bc', fontSize: 12 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, size: { alignItems: 'center', borderColor: '#4b4560', borderRadius: 10, borderWidth: 1, flexBasis: '22%', flexGrow: 1, paddingVertical: 11 }, sizeText: { color: '#c8c1d5', fontSize: 12, fontWeight: '800' }, sizeTextSelected: { color: '#17142a' },
  start: { alignItems: 'center', borderRadius: 13, marginTop: 22, paddingVertical: 14 }, startText: { color: '#17142a', fontSize: 16, fontWeight: '900' },
  pressed: { opacity: .7, transform: [{ scale: .99 }] }, helpRow: { flexDirection: 'row', gap: 24, justifyContent: 'center', marginTop: 22 }, help: { color: '#bdb4cf', textDecorationLine: 'underline' },
});
