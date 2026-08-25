import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { campaignBoardSize, campaignDifficulty, campaignStage, createPlayerProgress, type PlayerProgress } from '../src/game-core/progression.ts';
import { loadPlayerProgress } from '../src/storage/player-progress-storage';

export default function CampaignScreen() {
  const [progress, setProgress] = useState<PlayerProgress>(createPlayerProgress());
  const [selectedLevel, setSelectedLevel] = useState(1);
  useFocusEffect(useCallback(() => {
    let active = true;
    void loadPlayerProgress().then((value) => {
      if (!active) return;
      setProgress(value);
      setSelectedLevel(value.completedCampaignLevel + 1);
    });
    return () => { active = false; };
  }, []));

  const maxUnlockedLevel = progress.completedCampaignLevel + 1;
  const level = Math.min(selectedLevel, maxUnlockedLevel);
  const difficulty = campaignDifficulty(level); const size = campaignBoardSize(level); const stage = campaignStage(level);
  const replaying = level <= progress.completedCampaignLevel;
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable>
    <Text style={styles.kicker}>CAMPAIGN</Text><Text style={styles.title}>第 {level} 關</Text>
    <Text style={[styles.stage, { color: DIFFICULTIES[difficulty].accent }]}>{stage === 'infinite' ? '無限' : DIFFICULTIES[difficulty].label} · {size}×{size}</Text>
    <Text style={styles.description}>固定關卡 · 所有玩家相同 · 完成後可重玩</Text>
    <View style={styles.levelPicker}>
      <Pressable accessibilityRole="button" disabled={level <= 1} onPress={() => setSelectedLevel((current) => Math.max(1, current - 1))} style={[styles.levelButton, level <= 1 && styles.disabled]} testID="campaign-previous-level"><Text style={styles.levelButtonText}>‹ 上一關</Text></Pressable>
      <Text style={styles.levelStatus}>{replaying ? '已完成 · 可重玩' : '目前進度'}</Text>
      <Pressable accessibilityRole="button" disabled={level >= maxUnlockedLevel} onPress={() => setSelectedLevel((current) => Math.min(maxUnlockedLevel, current + 1))} style={[styles.levelButton, level >= maxUnlockedLevel && styles.disabled]} testID="campaign-next-level"><Text style={styles.levelButtonText}>下一關 ›</Text></Pressable>
    </View>
    <Pressable onPress={() => router.push({ pathname: '/game', params: { mode: 'campaign', level: String(level), difficulty, size: String(size) } })} style={styles.start} testID="campaign-start"><Text style={styles.startText}>{replaying ? '重玩此關' : '開始闖關'}</Text></Pressable>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 520, padding: 28, width: '100%' }, back: { color: '#aaa4bc', fontSize: 16, marginBottom: 40 }, kicker: { color: '#d6b870', fontSize: 11, fontWeight: '800', letterSpacing: 3 }, title: { color: '#fffaf1', fontSize: 44, fontWeight: '900', marginTop: 8 }, stage: { fontSize: 22, fontWeight: '800', marginTop: 12 }, description: { color: '#aaa4bc', fontSize: 15, marginTop: 10 }, levelPicker: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }, levelButton: { borderColor: '#514a70', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 }, levelButtonText: { color: '#ddd6e8', fontSize: 13, fontWeight: '800' }, levelStatus: { color: '#aaa4bc', fontSize: 12, fontWeight: '700' }, disabled: { opacity: .35 }, start: { alignItems: 'center', backgroundColor: '#d6b870', borderRadius: 14, marginTop: 24, padding: 15 }, startText: { color: '#17142a', fontSize: 17, fontWeight: '900' } });
