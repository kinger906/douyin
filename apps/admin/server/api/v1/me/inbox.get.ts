import { comments, favorites, follows, likes, users, videos } from '@douyin/db';
import { and, desc, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const me = await requireUser(event);
    const db = useDb();

    const likeRows = await db
      .select({
        actorId: users.id,
        actorName: users.displayName,
        actorAvatar: users.avatarUrl,
        videoId: videos.id,
        videoTitle: videos.title,
        createdAt: likes.createdAt,
      })
      .from(likes)
      .innerJoin(videos, eq(videos.id, likes.videoId))
      .innerJoin(users, eq(users.id, likes.userId))
      .where(and(eq(videos.authorId, me.id)))
      .orderBy(desc(likes.createdAt))
      .limit(30);

    const favoriteRows = await db
      .select({
        actorId: users.id,
        actorName: users.displayName,
        actorAvatar: users.avatarUrl,
        videoId: videos.id,
        videoTitle: videos.title,
        createdAt: favorites.createdAt,
      })
      .from(favorites)
      .innerJoin(videos, eq(videos.id, favorites.videoId))
      .innerJoin(users, eq(users.id, favorites.userId))
      .where(eq(videos.authorId, me.id))
      .orderBy(desc(favorites.createdAt))
      .limit(30);

    const commentRows = await db
      .select({
        actorId: users.id,
        actorName: users.displayName,
        actorAvatar: users.avatarUrl,
        videoId: videos.id,
        videoTitle: videos.title,
        body: comments.body,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(videos, eq(videos.id, comments.videoId))
      .innerJoin(users, eq(users.id, comments.userId))
      .where(and(eq(videos.authorId, me.id), eq(comments.status, 'visible')))
      .orderBy(desc(comments.createdAt))
      .limit(30);

    const followRows = await db
      .select({
        actorId: users.id,
        actorName: users.displayName,
        actorAvatar: users.avatarUrl,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .where(eq(follows.followingId, me.id))
      .orderBy(desc(follows.createdAt))
      .limit(30);

    const items = [
      ...likeRows.map((row) => ({
        id: `like-${row.actorId}-${row.videoId}-${row.createdAt}`,
        type: 'like' as const,
        title: `${row.actorName} 赞了你的作品`,
        body: row.videoTitle,
        actor: { id: row.actorId, displayName: row.actorName, avatarUrl: row.actorAvatar },
        videoId: row.videoId,
        createdAt: row.createdAt,
      })),
      ...favoriteRows.map((row) => ({
        id: `fav-${row.actorId}-${row.videoId}-${row.createdAt}`,
        type: 'favorite' as const,
        title: `${row.actorName} 收藏了你的作品`,
        body: row.videoTitle,
        actor: { id: row.actorId, displayName: row.actorName, avatarUrl: row.actorAvatar },
        videoId: row.videoId,
        createdAt: row.createdAt,
      })),
      ...commentRows.map((row) => ({
        id: `comment-${row.actorId}-${row.videoId}-${row.createdAt}`,
        type: 'comment' as const,
        title: `${row.actorName} 评论了你`,
        body: row.body,
        actor: { id: row.actorId, displayName: row.actorName, avatarUrl: row.actorAvatar },
        videoId: row.videoId,
        createdAt: row.createdAt,
      })),
      ...followRows.map((row) => ({
        id: `follow-${row.actorId}-${row.createdAt}`,
        type: 'follow' as const,
        title: `${row.actorName} 关注了你`,
        body: '成为你的新粉丝',
        actor: { id: row.actorId, displayName: row.actorName, avatarUrl: row.actorAvatar },
        videoId: null as string | null,
        createdAt: row.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return { items };
  } catch (err) {
    return sendAppError(event, err);
  }
});
