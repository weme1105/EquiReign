import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { campaignBoardSize, campaignDifficulty, campaignStage, createPlayerProgress, type PlayerProgress } from '../src/game-core/progression.ts';
import { loadPlayerProgress } from '../src/storage/player-progress-storage';

export default function CampaignScreen() {
  const [progress, setProgress] = useState<PlayerProgress>(createPlayerProgress());
  useFocusEffect(useCallback(() => { let active = true; void loadPlayerProgress().then((value) => { if (active) setProgress(value); }); return () => { active = false; }; }, []));
  const level = progress.completedCampaignLevel + 1; const difficulty = campaignDifficulty(level); const size = campaignBoardSize(level); const stage = campaignStage(level);
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable>
    <Text style={styles.kicker}>CAMPAIGN</Text><Text style={styles.title}>第 {level} 關</Text>
    <Text style={[styles.stage, { color: DIFFICULTIES[difficulty].accent }]}>{stage === 'infinite' ? '無限' : DIFFICULTIES[difficulty].label} · {size}×{size}</Text>
    <Text style={styles.description}>固定關卡 · 所有玩家相同 · 完成後可重玩</Text>
    <Pressable onPress={() => router.push({ pathname: '/game', params: { mode: 'campaign', level: String(level), difficulty, size: String(size) } })} style={styles.start} testID="campaign-start"><Text style={styles.startText}>開始闖關</Text></Pressable>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 520, padding: 28, width: '100%' }, back: { color: '#aaa4bc', fontSize: 16, marginBottom: 40 }, kicker: { color: '#d6b870', fontSize: 11, fontWeight: '800', letterSpacing: 3 }, title: { color: '#fffaf1', fontSize: 44, fontWeight: '900', marginTop: 8 }, stage: { fontSize: 22, fontWeight: '800', marginTop: 12 }, description: { color: '#aaa4bc', fontSize: 15, marginTop: 10 }, start: { alignItems: 'center', backgroundColor: '#d6b870', borderRadius: 14, marginTop: 34, padding: 15 }, startText: { color: '#17142a', fontSize: 17, fontWeight: '900' } });
