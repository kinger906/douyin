import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import type { MeProfile, MyVideoItem, SavedVideoItem } from '@douyin/api-client';

import { mobileApi } from '@/lib/api';
import { formatCount } from '@/lib/format';
import { useSessionStore } from '@/store/session';

const COLS = 3;
const GAP = 1;
const TILE = Math.floor((Dimensions.get('window').width - GAP * (COLS - 1)) / COLS);

function statusLabel(status: string) {
  if (status === 'approved') return null;
  if (status === 'pending') return '审核中';
  if (status === 'rejected') return '未通过';
  return status;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const sessionUser = useSessionStore((state) => state.user);
  const patchUser = useSessionStore((state) => state.patchUser);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [videos, setVideos] = useState<MyVideoItem[]>([]);
  const [liked, setLiked] = useState<SavedVideoItem[]>([]);
  const [favorites, setFavorites] = useState<SavedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'works' | 'private' | 'liked' | 'collections'>('works');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [me, mine, myLikes, myFavorites] = await Promise.all([
        mobileApi.getMe(),
        mobileApi.getMyVideos(),
        mobileApi.getMyLikes(),
        mobileApi.getMyFavorites(),
      ]);
      setProfile(me);
      setVideos(mine.items);
      setLiked(myLikes.items);
      setFavorites(myFavorites.items);
      await patchUser({
        displayName: me.displayName,
        avatarUrl: me.avatarUrl,
        email: me.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patchUser]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logoutMutation = useMutation({
    mutationFn: () => mobileApi.logout(),
    onSuccess: () => {
      router.replace('/(auth)/login');
    },
  });

  async function changeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要权限', '请允许访问相册以更换头像');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const ticket = await mobileApi.requestUpload('avatar');
      let avatarUrl = asset.uri;
      if (!ticket.mock) {
        avatarUrl = (
          await mobileApi.uploadImage(ticket, {
            uri: asset.uri,
            fileName: asset.fileName ?? 'avatar.jpg',
            mimeType: asset.mimeType ?? 'image/jpeg',
          })
        ).url;
      } else {
        avatarUrl = 'https://picsum.photos/seed/douyin-avatar/200';
      }

      const me = await mobileApi.updateMe({ avatarUrl });
      setProfile(me);
      await patchUser({ avatarUrl: me.avatarUrl, displayName: me.displayName });
    } catch (err) {
      Alert.alert('上传失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setAvatarUploading(false);
    }
  }

  const name = profile?.displayName ?? sessionUser?.displayName ?? '用户';
  const initial = name.slice(0, 1).toUpperCase();
  const douyinId = profile?.douyinId ?? '--------';
  const stats = profile?.stats;
  const avatarUrl = profile?.avatarUrl ?? sessionUser?.avatarUrl;

  const gridItems: Array<MyVideoItem | SavedVideoItem> =
    tab === 'works' ? videos : tab === 'liked' ? liked : tab === 'collections' ? favorites : [];

  const emptyTitle =
    tab === 'works'
      ? '还没有作品'
      : tab === 'liked'
        ? '还没有喜欢'
        : tab === 'collections'
          ? '还没有收藏'
          : '暂无私密内容';

  const emptyHint =
    tab === 'works'
      ? '点底部「+」发布第一条视频'
      : tab === 'liked'
        ? '在首页双击或点赞后会出现在这里'
        : tab === 'collections'
          ? '在首页点「收藏」后会出现在这里'
          : '该能力稍后开放';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable hitSlop={12}>
          <Text style={styles.topIcon}>＋</Text>
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Pressable onPress={() => logoutMutation.mutate()} disabled={logoutMutation.isPending} hitSlop={12}>
          <Text style={styles.topIcon}>☰</Text>
        </Pressable>
      </View>

      {loading && !profile ? (
        <ActivityIndicator color="#fe2c55" style={{ marginTop: 40 }} />
      ) : error && !profile ? (
        <View style={styles.centerBlock}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retry}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(item) => `${tab}-${item.id}`}
          numColumns={COLS}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#fe2c55" />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.identityRow}>
                <Pressable onPress={() => void changeAvatar()} style={styles.avatarPress}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                  )}
                  <View style={styles.cameraBadge}>
                    {avatarUploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.cameraBadgeText}>✎</Text>
                    )}
                  </View>
                </Pressable>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{formatCount(stats?.likesReceived ?? 0)}</Text>
                    <Text style={styles.statLabel}>获赞</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{formatCount(stats?.following ?? 0)}</Text>
                    <Text style={styles.statLabel}>关注</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{formatCount(stats?.followers ?? 0)}</Text>
                    <Text style={styles.statLabel}>粉丝</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.name}>{name}</Text>
              <Text style={styles.douyinId}>抖音号：{douyinId}</Text>
              <Text style={styles.bio}>点击头像可更换个人形象</Text>

              <View style={styles.actionsRow}>
                <Pressable style={styles.editBtn}>
                  <Text style={styles.editBtnText}>编辑主页</Text>
                </Pressable>
                <Pressable style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>▢</Text>
                </Pressable>
                <Pressable style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>☆</Text>
                </Pressable>
              </View>

              <View style={styles.segment}>
                {(
                  [
                    ['works', `作品 ${stats?.works ?? videos.length}`],
                    ['private', '私密'],
                    ['collections', `收藏 ${favorites.length}`],
                    ['liked', `喜欢 ${liked.length}`],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable key={key} onPress={() => setTab(key)} style={styles.segmentItem}>
                    <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>{label}</Text>
                    {tab === key ? <View style={styles.segmentUnderline} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyHint}>{emptyHint}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = tab === 'works' ? statusLabel(item.status) : null;
            return (
              <View style={styles.tile}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.tileCover} />
                ) : (
                  <View style={styles.tileFallback}>
                    <Text style={styles.tileFallbackText}>无封面</Text>
                  </View>
                )}
                <View style={styles.tileOverlay}>
                  <Text style={styles.tileMeta}>▶ {formatCount(item.viewCount || item.likeCount)}</Text>
                </View>
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 44,
  },
  topCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  topName: { fontSize: 16, fontWeight: '700', color: '#161823' },
  topIcon: { fontSize: 22, color: '#161823', width: 28, textAlign: 'center' },
  centerBlock: { alignItems: 'center', marginTop: 48, gap: 12 },
  header: { paddingBottom: 4 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 18,
  },
  avatarPress: { position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#161823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#eee' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fe2c55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161823',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  douyinId: { fontSize: 13, color: '#8a8a8a', paddingHorizontal: 16, marginBottom: 6 },
  bio: { fontSize: 13, color: '#161823', paddingHorizontal: 16, marginBottom: 14 },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', minWidth: 56 },
  statNum: { fontSize: 17, fontWeight: '700', color: '#161823' },
  statLabel: { fontSize: 12, color: '#8a8a8a', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  editBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 4,
    backgroundColor: '#f2f2f2',
  },
  editBtnText: { fontWeight: '600', color: '#161823' },
  iconBtn: {
    width: 40,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16, color: '#161823', fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  segmentText: { color: '#8a8a8a', fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: '#161823' },
  segmentUnderline: {
    marginTop: 8,
    width: 28,
    height: 2,
    backgroundColor: '#161823',
    borderRadius: 1,
  },
  row: { gap: GAP },
  tile: {
    width: TILE,
    height: TILE * 1.35,
    marginBottom: GAP,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  tileCover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  tileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  tileFallbackText: { color: '#888', fontSize: 12 },
  tileOverlay: {
    position: 'absolute',
    left: 6,
    bottom: 6,
  },
  tileMeta: { color: '#fff', fontSize: 11, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10 },
  emptyBlock: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#161823' },
  emptyHint: { fontSize: 13, color: '#8a8a8a' },
  error: { color: '#fe2c55' },
  retry: {
    backgroundColor: '#fe2c55',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
