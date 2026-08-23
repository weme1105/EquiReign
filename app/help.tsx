import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HelpScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const rules = tab === 'rules';
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ 返回</Text></Pressable>
    <Text style={styles.title}>{rules ? '遊戲規則' : '操作方式'}</Text>
    {rules ? <View style={styles.card}>
      <Text style={styles.line}>每一列恰好一位皇后</Text><Text style={styles.line}>每一行恰好一位皇后</Text><Text style={styles.line}>每個色區恰好一位皇后</Text>
      <Text style={styles.line}>皇后彼此不可相鄰</Text><Text style={styles.note}>遠距離斜線可以共存；這不是傳統西洋棋皇后規則。</Text>
    </View> : <View style={styles.card}>
      <Text style={styles.line}>點擊格子：空白 → × → 皇后 → 空白</Text><Text style={styles.line}>長按格子：快速切換 ×</Text><Text style={styles.line}>金色皇后為題目給定，不能修改</Text>
      <Text style={styles.line}>Undo 可復原玩家操作；Restart 會保留給定皇后</Text><Text style={styles.note}>提示只標示可推理的位置，不會揭露要放皇后或 ×。</Text>
    </View>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', maxWidth: 560, padding: 28, width: '100%' }, back: { color: '#aaa4bc', fontSize: 17 }, title: { color: '#fffaf1', fontSize: 32, fontWeight: '800', marginTop: 28 }, card: { backgroundColor: '#211d38', borderRadius: 18, gap: 16, marginTop: 24, padding: 24 }, line: { color: '#fffaf1', fontSize: 17 }, note: { color: '#d6b870', lineHeight: 22, marginTop: 8 } });
