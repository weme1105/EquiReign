import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { clearCampaignPuzzleCache } from '../src/storage/campaign-puzzle-cache.ts';

export default function SettingsScreen() {
  const [sound, setSound] = useState(true); const [music, setMusic] = useState(true);
  const [clearing, setClearing] = useState(false); const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const clearDownloadedLevels = async () => {
    setClearing(true); setCacheMessage(null);
    try { await clearCampaignPuzzleCache(); setCacheMessage('已清除下載的關卡資料；遊戲進度與紀錄不受影響。'); }
    catch { setCacheMessage('清除失敗，請稍後再試。'); }
    finally { setClearing(false); }
  };
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable><Text style={styles.title}>設定</Text>
    <View style={styles.card}><Setting label="音效" value={sound} onChange={setSound} /><Setting label="音樂" value={music} onChange={setMusic} />
      <View style={styles.section}><Text style={styles.sectionTitle}>離線關卡</Text><Text style={styles.sectionText}>已下載的關卡會永久保留。清除後不會刪除通關進度，需要時會重新下載。</Text>
        <Pressable accessibilityRole="button" disabled={clearing} onPress={() => void clearDownloadedLevels()} style={[styles.cacheButton, clearing && styles.disabled]} testID="clear-campaign-cache"><Text style={styles.cacheButtonText}>{clearing ? '清除中…' : '清除下載的關卡資料'}</Text></Pressable>
        {cacheMessage && <Text style={styles.cacheMessage}>{cacheMessage}</Text>}
      </View>
      <View style={styles.future}><Text style={styles.futureTitle}>帳號與連結</Text><Text style={styles.futureText}>登入與跨裝置同步將於 Account 階段接入。</Text></View></View>
  </View></SafeAreaView>;
}
function Setting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.row}><Text style={styles.label}>{label}</Text><Switch value={value} onValueChange={onChange} /></View>; }
const styles = StyleSheet.create({ screen: { backgroundColor: '#fff7cf', flex: 1 }, content: { alignSelf: 'center', maxWidth: 560, padding: 28, width: '100%' }, back: { color: '#4f806f', fontSize: 17 }, title: { color: '#36566f', fontSize: 32, fontWeight: '800', marginTop: 28 }, card: { backgroundColor: '#ffffff', borderColor: '#9fd8c0', borderRadius: 18, borderWidth: 2, marginTop: 24, padding: 22 }, row: { alignItems: 'center', borderBottomColor: '#d7e9e2', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15 }, label: { color: '#36566f', fontSize: 17 }, section: { borderBottomColor: '#d7e9e2', borderBottomWidth: 1, paddingVertical: 22 }, sectionTitle: { color: '#3e6b63', fontSize: 17, fontWeight: '700' }, sectionText: { color: '#61767d', lineHeight: 20, marginTop: 6 }, cacheButton: { alignSelf: 'flex-start', backgroundColor: '#e5f5ff', borderColor: '#7ebfd8', borderRadius: 10, borderWidth: 1, marginTop: 14, paddingHorizontal: 14, paddingVertical: 10 }, cacheButtonText: { color: '#35617a', fontWeight: '700' }, cacheMessage: { color: '#4f806f', marginTop: 10 }, disabled: { opacity: .4 }, future: { paddingTop: 24 }, futureTitle: { color: '#5f887d', fontWeight: '700' }, futureText: { color: '#718287', lineHeight: 20, marginTop: 5 } });