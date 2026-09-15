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
const styles = StyleSheet.create({ screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', maxWidth: 560, padding: 28, width: '100%' }, back: { color: '#aaa4bc', fontSize: 17 }, title: { color: '#fffaf1', fontSize: 32, fontWeight: '800', marginTop: 28 }, card: { backgroundColor: '#211d38', borderRadius: 18, marginTop: 24, padding: 22 }, row: { alignItems: 'center', borderBottomColor: '#373148', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15 }, label: { color: '#fffaf1', fontSize: 17 }, section: { borderBottomColor: '#373148', borderBottomWidth: 1, paddingVertical: 22 }, sectionTitle: { color: '#fffaf1', fontSize: 17, fontWeight: '700' }, sectionText: { color: '#aaa4bc', lineHeight: 20, marginTop: 6 }, cacheButton: { alignSelf: 'flex-start', borderColor: '#777087', borderRadius: 10, borderWidth: 1, marginTop: 14, paddingHorizontal: 14, paddingVertical: 10 }, cacheButtonText: { color: '#ddd6e8', fontWeight: '700' }, cacheMessage: { color: '#aaa4bc', marginTop: 10 }, disabled: { opacity: .4 }, future: { paddingTop: 24 }, futureTitle: { color: '#777087', fontWeight: '700' }, futureText: { color: '#777087', lineHeight: 20, marginTop: 5 } });
