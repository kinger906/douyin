import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>朋友</Text>
      <Text style={styles.hint}>朋友动态稍后开放</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#161823', marginBottom: 8 },
  hint: { color: '#8a8a8a', fontSize: 14 },
});
