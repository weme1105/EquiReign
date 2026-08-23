import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { DIFFICULTY_ORDER } from '../src/puzzles/catalog.ts';

export default function HomeScreen() {
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}><View><Text style={styles.eyebrow}>A QUEEN'S LOGIC</Text><Text style={styles.title}>EquiReign</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.settings} testID="settings-button"><Text style={styles.settingsText}>設定</Text></Pressable>
      </View>
      <Text style={styles.subtitle}>每列、每行與每個色區都只能有一位皇后。</Text>
      <View style={styles.options}>{DIFFICULTY_ORDER.map((difficulty) => {
        const policy = DIFFICULTIES[difficulty];
        return <Pressable accessibilityRole="button" key={difficulty} onPress={() => router.push({ pathname: '/game', params: { difficulty } })}
          style={({ pressed }) => [styles.option, { borderColor: policy.accent }, pressed && styles.pressed]} testID={`difficulty-${difficulty}`}>
          <View><Text style={[styles.optionTitle, { color: policy.accent }]}>{policy.label}</Text><Text style={styles.optionCode}>{difficulty.toUpperCase()}</Text></View>
          <Text style={styles.optionMeta}>{policy.boardSize}×{policy.boardSize} · 預置 {policy.givenQueenCount} · 提示 {policy.hintLimit}</Text>
        </Pressable>;
      })}</View>
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
  options: { gap: 12, marginTop: 34 }, option: { alignItems: 'center', backgroundColor: '#211d38', borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 18 },
  optionTitle: { fontSize: 20, fontWeight: '800' }, optionCode: { color: '#777087', fontSize: 9, letterSpacing: 1.5, marginTop: 2 }, optionMeta: { color: '#aaa4bc', fontSize: 12 },
  pressed: { opacity: .7, transform: [{ scale: .99 }] }, helpRow: { flexDirection: 'row', gap: 24, justifyContent: 'center', marginTop: 28 }, help: { color: '#bdb4cf', textDecorationLine: 'underline' },
});
