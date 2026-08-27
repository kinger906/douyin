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
import type { FollowingUser } from '@douyin/api-client';

import { mobileApi } from '@/lib/api';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ following: 0, followers: 0 });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.getFollowing();
      setItems(res.items);
      setCounts({ following: res.followingCount, followers: res.followerCount });
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

  async function unfollow(userId: string) {
    setItems((prev) => prev.filter((row) => row.id !== userId));
    try {
      await mobileApi.unfollow(userId);
      void load(true);
    } catch {
      void load(true);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>朋友</Text>
      <Text style={styles.subtitle}>
        关注 {counts.following} · 粉丝 {counts.followers}
      </Text>
      <Text style={styles.hint}>在推荐页点头像旁「+」可关注创作者，朋友作品会出现在首页「关注」。</Text>

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
              <Text style={styles.empty}>还没有关注的人</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{item.displayName.slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.meta}>{item.works} 个作品</Text>
              </View>
              <Pressable onPress={() => void unfollow(item.id)} style={styles.unfollowBtn}>
                <Text style={styles.unfollowText}>取消关注</Text>
              </Pressable>
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
  subtitle: { marginTop: 4, color: '#161823', fontWeight: '600' },
  hint: { marginTop: 8, marginBottom: 12, color: '#8a8a8a', fontSize: 13, lineHeight: 18 },
  center: { alignItems: 'center', marginTop: 48, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#161823' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { fontSize: 16, fontWeight: '700', color: '#161823' },
  meta: { marginTop: 2, color: '#8a8a8a', fontSize: 12 },
  unfollowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f2f2f2',
  },
  unfollowText: { color: '#161823', fontWeight: '600', fontSize: 13 },
  empty: { color: '#8a8a8a' },
  error: { color: '#fe2c55' },
  retry: {
    backgroundColor: '#fe2c55',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
