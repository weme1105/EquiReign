import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { createGame, placeQueen, requestHint, toggleExclusion } from '../src/game-core/game';
import { DIFFICULTIES } from '../src/game-core/difficulty';
import type { Difficulty } from '../src/game-core/types';
import { GameBoard } from '../src/features/game/GameBoard';
import { getPuzzle } from '../src/puzzles/catalog';

function parseDifficulty(value: string | string[] | undefined): Difficulty {
  return value === 'beginner'
    || value === 'intermediate'
    || value === 'advanced'
    || value === 'expert'
    || value === 'king'
    ? value
    : 'beginner';
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ difficulty?: string }>();
  const difficulty = parseDifficulty(params.difficulty);
  const puzzle = useMemo(() => getPuzzle(difficulty), [difficulty]);
  const [state, setState] = useState(() => createGame(puzzle));
  const config = DIFFICULTIES[difficulty];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Levels</Text></Pressable>
        <Text style={[styles.level, { color: config.accent }]}>{config.label}</Text>
        <Text style={styles.moves}>{state.moves} moves</Text>
      </View>
      <View style={styles.content}>
        {state.status === 'completed' ? (
          <View style={styles.completed}>
            <Text style={styles.crown}>♛</Text>
            <Text style={styles.completedTitle}>The board is yours.</Text>
            <Text style={styles.completedMeta}>Completed in {state.moves} moves</Text>
            <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Choose another court</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <GameBoard
              state={state}
              onCellPress={(row, column) => setState((current) => placeQueen(current, row, column))}
              onCellLongPress={(row, column) => setState((current) => toggleExclusion(current, row, column))}
            />
            <Text style={styles.instruction}>Tap for a queen · Hold for X · Gold queens are fixed</Text>
            {config.maxHints > 0 && (
              <Pressable
                disabled={state.hintsRemaining === 0}
                onPress={() => setState(requestHint)}
                style={[styles.hintButton, state.hintsRemaining === 0 && styles.disabled]}
              >
                <Text style={styles.hintText}>Highlight next logical cell · {state.hintsRemaining} left</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  back: { color: '#aaa4bc', fontSize: 16 },
  level: { fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  moves: { color: '#aaa4bc', fontSize: 14 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 16 },
  instruction: { color: '#aaa4bc', fontSize: 13, marginTop: 22, textAlign: 'center' },
  hintButton: { backgroundColor: '#292441', borderRadius: 14, marginTop: 18, paddingHorizontal: 22, paddingVertical: 14 },
  hintText: { color: '#fffaf1', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  completed: { alignItems: 'center' },
  crown: { color: '#d6b870', fontSize: 76 },
  completedTitle: { color: '#fffaf1', fontSize: 30, fontWeight: '800', marginTop: 12 },
  completedMeta: { color: '#aaa4bc', marginTop: 8 },
  primaryButton: { backgroundColor: '#d6b870', borderRadius: 14, marginTop: 32, paddingHorizontal: 24, paddingVertical: 15 },
  primaryText: { color: '#17142a', fontWeight: '800' },
});
