import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { InboxItem } from '@douyin/api-client';

import { mobileApi } from '@/lib/api';

function typeLabel(type: InboxItem['type']) {
  if (type === 'like') return '赞';
  if (type === 'favorite') return '收藏';
  if (type === 'comment') return '评论';
  return '粉丝';
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.getInbox();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>消息</Text>
      <Text style={styles.subtitle}>赞与收藏、评论、新粉丝会汇总在这里</Text>

      {loading && !items.length ? (
        <ActivityIndicator color="#fe2c55" style={{ marginTop: 40 }} />
      ) : error && !items.length ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retry}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#fe2c55" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>暂无互动消息</Text>
              <Text style={styles.emptyHint}>别人赞/评/收藏你的作品，或关注你后会出现</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.actor.avatarUrl ? (
                <Image source={{ uri: item.actor.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{item.actor.displayName.slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.msgTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{typeLabel(item.type)}</Text>
                  </View>
                </View>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#161823' },
  subtitle: { marginTop: 6, marginBottom: 12, color: '#8a8a8a', fontSize: 13 },
  center: { alignItems: 'center', marginTop: 48, gap: 8, paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#161823' },
  avatarText: { color: '#fff', fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#161823' },
  tag: {
    backgroundColor: '#fff0f3',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { color: '#fe2c55', fontSize: 11, fontWeight: '700' },
  body: { marginTop: 4, color: '#8a8a8a', fontSize: 13, lineHeight: 18 },
  empty: { color: '#161823', fontWeight: '600' },
  emptyHint: { color: '#8a8a8a', textAlign: 'center' },
  error: { color: '#fe2c55' },
  retry: {
    backgroundColor: '#fe2c55',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
