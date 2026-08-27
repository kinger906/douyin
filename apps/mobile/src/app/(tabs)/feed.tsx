import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { CommentItem, FeedItem } from '@douyin/api-client';

import { mobileApi } from '@/lib/api';
import { formatCount } from '@/lib/format';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

function FeedVideo({
  item,
  active,
  height,
  onOpenComments,
  onToggleLike,
  onLikeOnly,
}: {
  item: FeedItem;
  active: boolean;
  height: number;
  onOpenComments: () => void;
  onToggleLike: () => void;
  onLikeOnly: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(item.blobUrl, (p) => {
    p.loop = true;
  });
  const [pausedByUser, setPausedByUser] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0.4);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useEffect(() => {
    if (active && !pausedByUser) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, pausedByUser, player]);

  useEffect(() => {
    if (!active) {
      setPausedByUser(false);
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTx.value = 0;
      savedTy.value = 0;
    }
  }, [active, scale, savedScale, translateX, translateY, savedTx, savedTy]);

  const flashHeart = useCallback(() => {
    setShowHeart(true);
    heartOpacity.value = 1;
    heartScale.value = 0.4;
    heartScale.value = withSpring(1.15, { damping: 12 });
    heartOpacity.value = withTiming(0, { duration: 700 }, (finished) => {
      if (finished) runOnJS(setShowHeart)(false);
    });
  }, [heartOpacity, heartScale]);

  const togglePlay = useCallback(() => {
    setPausedByUser((prev) => !prev);
  }, []);

  const handleDoubleLike = useCallback(() => {
    flashHeart();
    onLikeOnly();
  }, [flashHeart, onLikeOnly]);

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(togglePlay)();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      runOnJS(handleDoubleLike)();
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = Math.min(3, Math.max(1, savedScale.value * e.scale));
      scale.value = next;
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .minPointers(2)
    .onUpdate((e) => {
      if (scale.value <= 1.01) return;
      translateX.value = savedTx.value + e.translationX;
      translateY.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  const taps = Gesture.Exclusive(doubleTap, singleTap);
  const composed = Gesture.Simultaneous(taps, Gesture.Simultaneous(pinch, pan));

  const videoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const authorName = item.author?.displayName || '用户';
  const initial = authorName.slice(0, 1).toUpperCase();

  return (
    <View style={[styles.page, { height }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[StyleSheet.absoluteFill, videoStyle]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        </Animated.View>
      </GestureDetector>

      {pausedByUser && active ? (
        <View style={styles.pauseBadge} pointerEvents="none">
          <Text style={styles.pauseBadgeText}>❚❚</Text>
        </View>
      ) : null}

      {showHeart ? (
        <Animated.View style={[styles.heartBurst, heartStyle]} pointerEvents="none">
          <Text style={styles.heartBurstText}>♥</Text>
        </Animated.View>
      ) : null}

      <View style={[styles.rightRail, { bottom: 88 + insets.bottom }]} pointerEvents="box-none">
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

      <View style={[styles.meta, { bottom: 24 + insets.bottom }]} pointerEvents="none">
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
  const listRef = useRef<FlatList<FeedItem>>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<'following' | 'recommend'>('recommend');
  const [pageHeight, setPageHeight] = useState(SCREEN_HEIGHT);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await mobileApi.getFeed();
      setItems(res.items);
      setActiveId(res.items[0]?.id ?? null);
      setActiveIndex(0);
      if (isRefresh && res.items[0]) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const applyLikeState = useCallback((item: FeedItem, nextLiked: boolean) => {
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
  }, []);

  const toggleLike = useCallback(
    async (item: FeedItem) => {
      const nextLiked = !item.likedByMe;
      applyLikeState(item, nextLiked);
      try {
        if (nextLiked) await mobileApi.like(item.id);
        else await mobileApi.unlike(item.id);
      } catch {
        applyLikeState(item, item.likedByMe);
      }
    },
    [applyLikeState],
  );

  const likeOnly = useCallback(
    async (item: FeedItem) => {
      if (item.likedByMe) return;
      applyLikeState(item, true);
      try {
        await mobileApi.like(item.id);
      } catch {
        applyLikeState(item, false);
      }
    },
    [applyLikeState],
  );

  const sendComment = useCallback(async () => {
    if (!commentsVideoId || !commentDraft.trim() || sending) return;
    setSending(true);
    try {
      const created = await mobileApi.createComment(commentsVideoId, { body: commentDraft.trim() });
      setComments((prev) => [
        {
          ...created,
          author: {
            id: created.userId,
            displayName: '我',
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
      if (typeof first.index === 'number' && first.index >= 0) {
        setActiveIndex(first.index);
      }
    }
  }).current;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  const onScrollEndDrag = useCallback(
    (e: { nativeEvent: NativeScrollEvent }) => {
      const y = e.nativeEvent.contentOffset.y;
      // Pull down past the first page → refresh when already at top
      if (activeIndex <= 0 && y < -48) {
        void load(true);
        return;
      }
      // Soft pull while not at first item: snap to previous page
      if (activeIndex > 0 && y < activeIndex * pageHeight - 40) {
        const prev = Math.max(0, activeIndex - 1);
        listRef.current?.scrollToIndex({ index: prev, animated: true });
      }
    },
    [activeIndex, load, pageHeight],
  );

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
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedVideo
              item={item}
              active={activeId === item.id && !commentsOpen}
              height={pageHeight}
              onOpenComments={() => void openComments(item.id)}
              onToggleLike={() => void toggleLike(item)}
              onLikeOnly={() => void likeOnly(item)}
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
          onScrollEndDrag={onScrollEndDrag}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor="#fe2c55"
              progressViewOffset={insets.top + 48}
              enabled={activeIndex === 0}
            />
          }
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
  page: { width: SCREEN_WIDTH, backgroundColor: '#000', overflow: 'hidden' },
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
  pauseBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 42,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 8,
  },
  heartBurst: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    left: SCREEN_WIDTH / 2 - 48,
  },
  heartBurstText: {
    fontSize: 96,
    color: '#fe2c55',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 10,
  },
  rightRail: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    gap: 18,
    zIndex: 5,
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
  meta: { position: 'absolute', left: 12, right: 88, zIndex: 5 },
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
