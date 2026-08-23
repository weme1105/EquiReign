import { router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty';
import type { Difficulty } from '../src/game-core/types';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>A QUEEN'S LOGIC</Text>
        <Text style={styles.title}>EquiReign</Text>
        <Text style={styles.subtitle}>Place every queen. Rule every line.</Text>
        <View style={styles.options}>
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((difficulty) => {
            const config = DIFFICULTIES[difficulty];
            return (
              <Pressable
                key={difficulty}
                onPress={() => router.push({ pathname: '/game', params: { difficulty } })}
                style={({ pressed }) => [styles.option, { borderColor: config.accent }, pressed && styles.pressed]}
              >
                <Text style={[styles.optionTitle, { color: config.accent }]}>{config.label}</Text>
                <Text style={styles.optionMeta}>{config.boardSize} × {config.boardSize} · {config.maxHints} hints</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 },
  content: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 520, padding: 28, width: '100%' },
  eyebrow: { color: '#d6b870', fontSize: 12, fontWeight: '700', letterSpacing: 4, textAlign: 'center' },
  title: { color: '#fffaf1', fontSize: 52, fontWeight: '800', letterSpacing: -2, textAlign: 'center' },
  subtitle: { color: '#aaa4bc', fontSize: 16, marginTop: 8, textAlign: 'center' },
  options: { gap: 14, marginTop: 48 },
  option: { backgroundColor: '#211d38', borderRadius: 16, borderWidth: 1, padding: 20 },
  optionTitle: { fontSize: 21, fontWeight: '700' },
  optionMeta: { color: '#aaa4bc', marginTop: 4 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});

