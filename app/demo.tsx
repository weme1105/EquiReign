import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEMO_CASES, type DemoVariant } from '../src/demo/demo-cases.ts';

const GROUPS: readonly { variant: DemoVariant; title: string; description: string }[] = [
  { variant: 'frozen', title: '單冰封', description: '只測試冰封格與揭示流程。' },
  { variant: 'lost', title: '單遺失', description: '只測試遺失格與完成判定。' },
  { variant: 'frozen-lost', title: '冰封＋遺失', description: '兩種特殊格同盤並存。' },
  { variant: 'frozen-lost-dual', title: '冰封＋遺失＋雙色域', description: '雙色域遊戲中隱藏，通關後於結算棋盤揭示。' },
];

export default function DemoScreen() {
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>VARIANT TEST LAB</Text><Text style={styles.title}>特殊規則 Demo</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')}><Text style={styles.back}>返回首頁</Text></Pressable>
      </View>
      <Text style={styles.note}>共 12 關。Demo 不寫入 Campaign 進度，可反覆測試。</Text>
      {GROUPS.map((group) => <View key={group.variant} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text><Text style={styles.groupMeta}>{group.description}</Text>
        {DEMO_CASES.filter((item) => item.variant === group.variant).map((item) => <Pressable key={item.id} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/game', params: { demo: item.id } })} style={styles.card} testID={`demo-${item.id}`}>
          <View><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.description}</Text></View><Text style={styles.arrow}>›</Text>
        </Pressable>)}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#17142a', flex: 1 }, content: { alignSelf: 'center', maxWidth: 680, padding: 24, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, eyebrow: { color: '#d6b870', fontSize: 10, fontWeight: '800', letterSpacing: 2.5 },
  title: { color: '#fffaf1', fontSize: 30, fontWeight: '900', marginTop: 4 }, back: { color: '#aaa4bc', textDecorationLine: 'underline' },
  note: { color: '#bdb4cf', lineHeight: 20, marginTop: 12 }, group: { marginTop: 28 }, groupTitle: { color: '#f0d58e', fontSize: 20, fontWeight: '900' }, groupMeta: { color: '#8f879f', marginTop: 4 },
  card: { alignItems: 'center', backgroundColor: '#211d38', borderColor: '#514a70', borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, padding: 16 },
  cardTitle: { color: '#fffaf1', fontSize: 16, fontWeight: '800' }, cardMeta: { color: '#aaa4bc', fontSize: 12, marginTop: 4, maxWidth: 520 }, arrow: { color: '#d6b870', fontSize: 28 },
});
