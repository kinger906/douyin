import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { CommentItem, FeedItem } from '@douyin/api-client';

import { mobileApi } from '@/lib/api';
import { formatCount } from '@/lib/format';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function FeedVideo({
  item,
  active,
  height,
  onOpenComments,
  onToggleLike,
}: {
  item: FeedItem;
  active: boolean;
  height: number;
  onOpenComments: () => void;
  onToggleLike: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(item.blobUrl, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  const authorName = item.author?.displayName || '用户';
  const initial = authorName.slice(0, 1).toUpperCase();

  return (
    <View style={[styles.page, { height }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.gradient} pointerEvents="none" />

      <View style={[styles.rightRail, { bottom: 88 + insets.bottom }]}>
        <Pressable style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.followPlus}>
            <Text style={styles.followPlusText}>+</Text>
          </View>
        </Pressable>

        <Pressable style={styles.action} onPress={onToggleLike}>
          <Text style={[styles.actionIcon, item.likedByMe && styles.liked]}>♥</Text>
          <Text style={styles.actionCount}>{formatCount(item.likeCount)}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={onOpenComments}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Text style={styles.actionIcon}>★</Text>
          <Text style={styles.actionCount}>收藏</Text>
        </Pressable>

        <Pressable style={styles.action}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionCount}>分享</Text>
        </Pressable>
      </View>

      <View style={[styles.meta, { bottom: 24 + insets.bottom }]}>
        <Text style={styles.author}>@{authorName}</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {item.description || item.title}
        </Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<'following' | 'recommend'>('recommend');
  const [pageHeight, setPageHeight] = useState(SCREEN_HEIGHT);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.getFeed();
      setItems(res.items);
      setActiveId(res.items[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openComments = useCallback(async (videoId: string) => {
    setCommentsVideoId(videoId);
    setCommentsOpen(true);
    setCommentsLoading(true);
    setCommentDraft('');
    try {
      const res = await mobileApi.listComments(videoId);
      setComments(res.items);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const toggleLike = useCallback(async (item: FeedItem) => {
    const nextLiked = !item.likedByMe;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              likedByMe: nextLiked,
              likeCount: Math.max(0, row.likeCount + (nextLiked ? 1 : -1)),
            }
          : row,
      ),
    );
    try {
      if (nextLiked) await mobileApi.like(item.id);
      else await mobileApi.unlike(item.id);
    } catch {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                likedByMe: item.likedByMe,
                likeCount: item.likeCount,
              }
            : row,
        ),
      );
    }
  }, []);

  const sendComment = useCallback(async () => {
    if (!commentsVideoId || !commentDraft.trim() || sending) return;
    setSending(true);
    try {
      const created = await mobileApi.createComment(commentsVideoId, { body: commentDraft.trim() });
      const sessionName = '我';
      setComments((prev) => [
        {
          ...created,
          author: {
            id: created.userId,
            displayName: sessionName,
            avatarUrl: null,
          },
        },
        ...prev,
      ]);
      setCommentDraft('');
      setItems((prev) =>
        prev.map((row) =>
          row.id === commentsVideoId ? { ...row, commentCount: row.commentCount + 1 } : row,
        ),
      );
    } catch {
      // keep draft
    } finally {
      setSending(false);
    }
  }, [commentDraft, commentsVideoId, sending]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.item && typeof first.item === 'object' && 'id' in first.item) {
      setActiveId((first.item as FeedItem).id);
    }
  }).current;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fe2c55" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => void load()} style={styles.retry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>暂无推荐视频</Text>
        <Text style={styles.emptyHint}>去「+」发布，或在后台审核通过后再刷新</Text>
        <Pressable onPress={() => void load()} style={styles.retry}>
          <Text style={styles.retryText}>刷新</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setPageHeight(h);
      }}
    >
      <View style={[styles.topTabs, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        <Pressable onPress={() => setTab('following')}>
          <Text style={[styles.topTab, tab === 'following' && styles.topTabActive]}>关注</Text>
        </Pressable>
        <Pressable onPress={() => setTab('recommend')}>
          <Text style={[styles.topTab, tab === 'recommend' && styles.topTabActive]}>推荐</Text>
          {tab === 'recommend' ? <View style={styles.topUnderline} /> : null}
        </Pressable>
      </View>

      {tab === 'following' ? (
        <View style={styles.center}>
          <Text style={styles.empty}>关注流稍后开放</Text>
          <Text style={styles.emptyHint}>先刷「推荐」看看吧</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedVideo
              item={item}
              active={activeId === item.id && !commentsOpen}
              height={pageHeight}
              onOpenComments={() => void openComments(item.id)}
              onToggleLike={() => void toggleLike(item)}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: pageHeight,
            offset: pageHeight * index,
            index,
          })}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            // keep for potential progress later
            void e;
          }}
        />
      )}

      <Modal visible={commentsOpen} animationType="slide" transparent onRequestClose={() => setCommentsOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setCommentsOpen(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {formatCount(items.find((i) => i.id === commentsVideoId)?.commentCount ?? comments.length)} 条评论
          </Text>
          {commentsLoading ? (
            <ActivityIndicator color="#fe2c55" style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={styles.commentList}
              ListEmptyComponent={<Text style={styles.emptyHint}>抢首评吧</Text>}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {(item.author?.displayName || '用').slice(0, 1)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>{item.author?.displayName || '用户'}</Text>
                    <Text style={styles.commentBody}>{item.body}</Text>
                  </View>
                </View>
              )}
            />
          )}
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder="善语结善缘，恶言伤人心"
              placeholderTextColor="#999"
              value={commentDraft}
              onChangeText={setCommentDraft}
            />
            <Pressable onPress={() => void sendComment()} style={styles.sendBtn} disabled={sending}>
              <Text style={styles.sendText}>{sending ? '...' : '发送'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  page: { width: '100%', backgroundColor: '#000' },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  topTabs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  topTab: { color: 'rgba(255,255,255,0.55)', fontSize: 17, fontWeight: '600', paddingBottom: 6 },
  topTabActive: { color: '#fff' },
  topUnderline: {
    alignSelf: 'center',
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  rightRail: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    gap: 18,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  followPlus: {
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fe2c55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followPlusText: { color: '#fff', fontWeight: '800', fontSize: 14, marginTop: -1 },
  action: { alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 32, color: '#fff', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4 },
  liked: { color: '#fe2c55' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  meta: { position: 'absolute', left: 12, right: 88 },
  author: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20 },
  error: { color: '#fe2c55', marginBottom: 12, textAlign: 'center' },
  empty: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#8a8a8a', textAlign: 'center', marginBottom: 16 },
  retry: {
    backgroundColor: '#fe2c55',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '55%',
    minHeight: '45%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#161823', textAlign: 'center', marginBottom: 8 },
  commentList: { flexGrow: 0, maxHeight: 280 },
  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { fontWeight: '700', color: '#666' },
  commentAuthor: { color: '#888', fontSize: 13, marginBottom: 2 },
  commentBody: { color: '#161823', fontSize: 14, lineHeight: 20 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 4,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#161823',
  },
  sendBtn: {
    backgroundColor: '#fe2c55',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendText: { color: '#fff', fontWeight: '700' },
});
