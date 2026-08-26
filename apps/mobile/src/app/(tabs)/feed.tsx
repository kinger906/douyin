import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';

import type { CommentItem, FeedItem } from '@douyin/api-client';

import { mobileApi } from '@/lib/api';

const FALLBACK_COVER = 'https://placehold.co/720x1280/111111/ffffff?text=Douyin+Feed';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load data right now.';
}

type FeedCardProps = {
  item: FeedItem;
  height: number;
  isActive: boolean;
  isNeighbor: boolean;
  onToggleLike: (item: FeedItem) => void;
};

function FeedCard({ item, height, isActive, isNeighbor, onToggleLike }: FeedCardProps) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [draftComment, setDraftComment] = useState('');
  const shouldMountVideo = isActive || isNeighbor;

  const commentsQuery = useQuery({
    queryKey: ['comments', item.id],
    queryFn: () => mobileApi.listComments(item.id),
    enabled: showComments,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!draftComment.trim()) {
        throw new Error('Enter a comment before sending.');
      }

      return mobileApi.createComment(item.id, { body: draftComment.trim() });
    },
    onSuccess: async () => {
      setDraftComment('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['comments', item.id] }),
      ]);
    },
  });

  const comments = commentsQuery.data?.items ?? [];

  return (
    <View style={[styles.slide, { height }]}>
      <View style={styles.mediaSurface}>
        {shouldMountVideo ? (
          <Video
            isLooping
            isMuted={false}
            posterSource={item.coverUrl ? { uri: item.coverUrl } : undefined}
            posterStyle={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive}
            source={{ uri: item.blobUrl }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Image contentFit="cover" source={item.coverUrl ?? FALLBACK_COVER} style={StyleSheet.absoluteFill} />
        )}
      </View>

      <View style={styles.overlay}>
        <View style={styles.metaBlock}>
          <Text style={styles.authorText}>@{item.author.displayName}</Text>
          <Text style={styles.titleText}>{item.title}</Text>
          {item.description ? <Text style={styles.bodyText}>{item.description}</Text> : null}
          <Text style={styles.captionText}>
            {item.likeCount} likes • {item.commentCount} comments
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => onToggleLike(item)} style={styles.actionButton}>
            <Text style={styles.actionText}>{item.likedByMe ? 'Unlike' : 'Like'}</Text>
          </Pressable>
          <Pressable onPress={() => setShowComments((value) => !value)} style={styles.actionButton}>
            <Text style={styles.actionText}>{showComments ? 'Hide comments' : 'Comments'}</Text>
          </Pressable>
        </View>

        {showComments ? (
          <View style={styles.commentSheet}>
            <Text style={styles.commentTitle}>Comments</Text>
            {commentsQuery.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                {comments.length === 0 ? (
                  <Text style={styles.commentEmpty}>No comments yet.</Text>
                ) : (
                  comments.slice(0, 3).map((comment: CommentItem) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{comment.author.displayName}</Text>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    </View>
                  ))
                )}
              </>
            )}

            {commentsQuery.isError ? (
              <Text style={styles.commentError}>{getErrorMessage(commentsQuery.error)}</Text>
            ) : null}

            <View style={styles.commentComposer}>
              <TextInput
                onChangeText={setDraftComment}
                placeholder="Write a comment"
                placeholderTextColor="#878787"
                style={styles.commentInput}
                value={draftComment}
              />
              <Pressable
                disabled={commentMutation.isPending}
                onPress={() => commentMutation.mutate()}
                style={styles.commentButton}
              >
                <Text style={styles.commentButtonText}>
                  {commentMutation.isPending ? 'Sending...' : 'Send'}
                </Text>
              </Pressable>
            </View>

            {commentMutation.isError ? (
              <Text style={styles.commentError}>{getErrorMessage(commentMutation.error)}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { height } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => mobileApi.getFeed(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const likeMutation = useMutation({
    mutationFn: async (item: FeedItem) => {
      if (item.likedByMe) {
        return mobileApi.unlike(item.id);
      }

      return mobileApi.like(item.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const items = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<FeedItem>> }) => {
      const nextIndex = viewableItems[0]?.index;
      if (typeof nextIndex === 'number') {
        setActiveIndex(nextIndex);
      }
    },
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.y / Math.max(height, 1));
      setActiveIndex(nextIndex);
    },
    [height],
  );

  if (feedQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fe2c55" size="large" />
      </View>
    );
  }

  if (feedQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorHeadline}>Feed unavailable</Text>
        <Text style={styles.errorCopy}>{getErrorMessage(feedQuery.error)}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyHeadline}>No approved videos yet</Text>
        <Text style={styles.emptyCopy}>Upload one from the next tab, then approve it in admin.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      decelerationRate="fast"
      keyExtractor={(item) => item.id}
      onEndReached={() => {
        if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
          void feedQuery.fetchNextPage();
        }
      }}
      onMomentumScrollEnd={handleMomentumEnd}
      onViewableItemsChanged={onViewableItemsChanged.current}
      pagingEnabled
      renderItem={({ item, index }) => (
        <FeedCard
          height={height}
          isActive={index === activeIndex}
          isNeighbor={Math.abs(index - activeIndex) === 1}
          item={item}
          onToggleLike={(current) => likeMutation.mutate(current)}
        />
      )}
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      style={styles.list}
      viewabilityConfig={{ itemVisiblePercentThreshold: 75 }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  slide: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaSurface: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#111',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  metaBlock: {
    gap: 8,
  },
  authorText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  titleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  bodyText: {
    color: '#f0f0f0',
    fontSize: 15,
    lineHeight: 20,
  },
  captionText: {
    color: '#c8c8c8',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentSheet: {
    gap: 10,
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  commentTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  commentEmpty: {
    color: '#cfcfcf',
  },
  commentItem: {
    gap: 4,
    paddingBottom: 6,
  },
  commentAuthor: {
    color: '#fff',
    fontWeight: '700',
  },
  commentBody: {
    color: '#e6e6e6',
  },
  commentComposer: {
    flexDirection: 'row',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: '#121212',
  },
  commentButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fe2c55',
  },
  commentButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentError: {
    color: '#ff9c9c',
    fontSize: 12,
  },
  errorHeadline: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  errorCopy: {
    color: '#b7b7b7',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyHeadline: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#b7b7b7',
    marginTop: 8,
    textAlign: 'center',
  },
});
