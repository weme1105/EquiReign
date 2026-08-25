import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTIES } from '../src/game-core/difficulty.ts';
import { CAMPAIGN_FINITE_LEVELS, CAMPAIGN_LEVELS_PER_STAGE, DIFFICULTY_ORDER, campaignBoardSize, campaignDifficulty, campaignStage, createPlayerProgress, type CampaignStage, type PlayerProgress } from '../src/game-core/progression.ts';
import { loadPlayerProgress } from '../src/storage/player-progress-storage';

const LEVELS_PER_PAGE = 20;
const STAGES: readonly CampaignStage[] = [...DIFFICULTY_ORDER, 'infinite'];

function stageLabel(stage: CampaignStage): string { return stage === 'infinite' ? '無限' : DIFFICULTIES[stage].label; }
function stageStart(stage: CampaignStage): number {
  if (stage === 'infinite') return CAMPAIGN_FINITE_LEVELS + 1;
  return DIFFICULTY_ORDER.indexOf(stage) * CAMPAIGN_LEVELS_PER_STAGE + 1;
}
function stageEnd(stage: CampaignStage, maxUnlocked: number): number {
  if (stage === 'infinite') return Math.max(CAMPAIGN_FINITE_LEVELS + 1, maxUnlocked);
  return stageStart(stage) + CAMPAIGN_LEVELS_PER_STAGE - 1;
}

export default function CampaignScreen() {
  const [progress, setProgress] = useState<PlayerProgress>(createPlayerProgress());
  const [selectedStage, setSelectedStage] = useState<CampaignStage>('beginner');
  const [page, setPage] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadPlayerProgress().then((value) => {
      if (!active) return;
      const currentLevel = value.completedCampaignLevel + 1;
      const currentStage = campaignStage(currentLevel);
      const offset = currentLevel - stageStart(currentStage);
      setProgress(value);
      setSelectedStage(currentStage);
      setPage(Math.floor(offset / LEVELS_PER_PAGE));
    });
    return () => { active = false; };
  }, []));

  const maxUnlockedLevel = progress.completedCampaignLevel + 1;
  const availableStages = useMemo(() => STAGES.filter((stage) => stageStart(stage) <= maxUnlockedLevel || stage === 'beginner'), [maxUnlockedLevel]);
  const start = stageStart(selectedStage);
  const end = stageEnd(selectedStage, maxUnlockedLevel);
  const pageCount = Math.max(1, Math.ceil((end - start + 1) / LEVELS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = start + safePage * LEVELS_PER_PAGE;
  const pageEnd = Math.min(end, pageStart + LEVELS_PER_PAGE - 1);
  const levels = Array.from({ length: pageEnd - pageStart + 1 }, (_, index) => pageStart + index);

  const chooseStage = (stage: CampaignStage) => {
    setSelectedStage(stage);
    const current = maxUnlockedLevel;
    setPage(campaignStage(current) === stage ? Math.floor((current - stageStart(stage)) / LEVELS_PER_PAGE) : 0);
  };

  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable>
    <Text style={styles.kicker}>CAMPAIGN</Text><Text style={styles.title}>選擇關卡</Text>
    <Text style={styles.description}>固定關卡 · 所有玩家相同 · 完成後可重玩</Text>

    <Text style={styles.sectionTitle}>區域</Text>
    <View style={styles.stageGrid}>
      {availableStages.map((stage) => {
        const active = stage === selectedStage;
        return <Pressable key={stage} onPress={() => chooseStage(stage)} style={[styles.stageButton, active && styles.stageButtonActive]} testID={`campaign-stage-${stage}`}>
          <Text style={[styles.stageText, active && styles.stageTextActive]}>{stageLabel(stage)}</Text>
          <Text style={styles.stageRange}>{stage === 'infinite' ? `${stageStart(stage)}+` : `${stageStart(stage)}–${stageEnd(stage, maxUnlockedLevel)}`}</Text>
        </Pressable>;
      })}
    </View>

    <View style={styles.pageHeader}>
      <Pressable accessibilityRole="button" disabled={safePage <= 0} onPress={() => setPage((value) => Math.max(0, value - 1))} style={[styles.pageButton, safePage <= 0 && styles.disabled]} testID="campaign-previous-page"><Text style={styles.pageButtonText}>‹ 上一頁</Text></Pressable>
      <Text style={styles.pageText}>{pageStart}–{pageEnd}</Text>
      <Pressable accessibilityRole="button" disabled={safePage >= pageCount - 1} onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))} style={[styles.pageButton, safePage >= pageCount - 1 && styles.disabled]} testID="campaign-next-page"><Text style={styles.pageButtonText}>下一頁 ›</Text></Pressable>
    </View>

    <View style={styles.levelGrid}>
      {levels.map((level) => {
        const locked = level > maxUnlockedLevel;
        const completed = level <= progress.completedCampaignLevel;
        const current = level === maxUnlockedLevel;
        const difficulty = campaignDifficulty(level);
        const size = campaignBoardSize(level);
        return <Pressable accessibilityRole="button" disabled={locked} key={level} onPress={() => router.push({ pathname: '/game', params: { mode: 'campaign', level: String(level), difficulty, size: String(size) } })} style={[styles.levelCell, current && styles.currentCell, locked && styles.disabled]} testID={`campaign-level-${level}`}>
          <Text style={[styles.levelNumber, { color: DIFFICULTIES[difficulty].accent }]}>{level}</Text>
          <Text style={styles.levelState}>{completed ? '✓ 已完成' : current ? '● 目前進度' : locked ? '🔒' : '○ 可遊玩'}</Text>
          <Text style={styles.levelSize}>{size}×{size}</Text>
        </Pressable>;
      })}
    </View>

    <Pressable onPress={() => {
      const level = maxUnlockedLevel; const difficulty = campaignDifficulty(level); const size = campaignBoardSize(level);
      router.push({ pathname: '/game', params: { mode: 'campaign', level: String(level), difficulty, size: String(size) } });
    }} style={styles.currentButton} testID="campaign-current-level"><Text style={styles.currentButtonText}>回到目前進度 · 第 {maxUnlockedLevel} 關</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', maxWidth: 720, padding: 28, paddingBottom: 48, width: '100%' }, back: { color: '#aaa4bc', fontSize: 16, marginBottom: 30 },
  kicker: { color: '#d6b870', fontSize: 11, fontWeight: '800', letterSpacing: 3 }, title: { color: '#fffaf1', fontSize: 40, fontWeight: '900', marginTop: 8 }, description: { color: '#aaa4bc', fontSize: 15, marginTop: 8 },
  sectionTitle: { color: '#ddd6e8', fontSize: 14, fontWeight: '800', marginTop: 26, marginBottom: 10 }, stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stageButton: { borderColor: '#514a70', borderRadius: 12, borderWidth: 1, minWidth: 96, paddingHorizontal: 14, paddingVertical: 10 }, stageButtonActive: { backgroundColor: '#2f2948', borderColor: '#d6b870' }, stageText: { color: '#aaa4bc', fontSize: 14, fontWeight: '800' }, stageTextActive: { color: '#fffaf1' }, stageRange: { color: '#777087', fontSize: 11, marginTop: 3 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }, pageButton: { borderColor: '#514a70', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 }, pageButtonText: { color: '#ddd6e8', fontSize: 13, fontWeight: '800' }, pageText: { color: '#aaa4bc', fontSize: 13, fontWeight: '800' },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, levelCell: { backgroundColor: '#211d35', borderColor: '#3d3759', borderRadius: 12, borderWidth: 1, flexBasis: '18%', flexGrow: 1, minWidth: 105, padding: 12 }, currentCell: { borderColor: '#d6b870', borderWidth: 2 }, levelNumber: { fontSize: 18, fontWeight: '900' }, levelState: { color: '#aaa4bc', fontSize: 11, fontWeight: '700', marginTop: 5 }, levelSize: { color: '#777087', fontSize: 11, marginTop: 3 }, disabled: { opacity: .35 },
  currentButton: { alignItems: 'center', backgroundColor: '#d6b870', borderRadius: 14, marginTop: 24, padding: 15 }, currentButtonText: { color: '#17142a', fontSize: 15, fontWeight: '900' },
});
