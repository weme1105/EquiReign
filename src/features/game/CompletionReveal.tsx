import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

import type { GameSession } from '../../game-core/types.ts';

const REGION_COLORS = ['#e8d7b7','#b7d9d0','#c8c0e1','#e2bcbc','#d5d7a9','#b9cfe2','#dfc3df','#c8d7bd','#e4c9aa','#bfc1d9','#d6c2ac','#b8d8c9'];

interface Props {
  readonly session: GameSession;
  readonly stars: number;
}

function RevealCrown({ delay, children }: { readonly delay: number; readonly children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, scale]);
  return <Animated.View style={{ opacity, transform: [{ scale }] }}>{children}</Animated.View>;
}

function RevealStar({ delay, visible }: { readonly delay: number; readonly visible: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 130, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, scale, visible]);
  return <Animated.Text style={[styles.star, { opacity, transform: [{ scale }] }]}>★</Animated.Text>;
}

export function CompletionReveal({ session, stars }: Props) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width - 56, height * 0.38, 330);
  const cellSize = size / session.puzzle.size;
  const crowns = useMemo(
    () => session.boardState.cells.map((state, index) => state === 'queen' ? index : null).filter((index): index is number => index !== null),
    [session.boardState.cells],
  );
  const crownOrder = useMemo(() => new Map(crowns.map((index, order) => [index, order])), [crowns]);

  return (
    <View style={styles.wrap} testID="completion-reveal">
      <View style={[styles.board, { width: size, height: size }]}>
        {session.boardState.cells.map((state, index) => {
          const row = Math.floor(index / session.puzzle.size);
          const column = index % session.puzzle.size;
          const region = session.puzzle.regionMap[index]!;
          const order = crownOrder.get(index);
          return (
            <View key={`${row}:${column}`} style={[styles.cell, { width: cellSize, height: cellSize, left: column * cellSize, top: row * cellSize, backgroundColor: REGION_COLORS[region % REGION_COLORS.length] }]}>
              {state === 'queen' && order !== undefined && (
                <RevealCrown delay={order * 115}>
                  <Text style={[styles.crown, { color: REGION_COLORS[region % REGION_COLORS.length] }]}>♛</Text>
                </RevealCrown>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.stars} accessibilityLabel={'獲得 ' + stars + ' 顆星'}>
        {[0, 1, 2].map((index) => <RevealStar key={index} delay={crowns.length * 115 + index * 180} visible={index < stars} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  board: { borderColor: '#d6b870', borderRadius: 10, borderWidth: 3, overflow: 'hidden', position: 'relative' },
  cell: { alignItems: 'center', borderColor: 'rgba(23,20,42,.12)', borderWidth: 0.5, justifyContent: 'center', position: 'absolute' },
  crown: { color: '#17142a', fontSize: 22, lineHeight: 27 },
  stars: { flexDirection: 'row', gap: 10, height: 38, marginTop: 10 },
  star: { color: '#f0d58e', fontSize: 30, lineHeight: 34 },
});
