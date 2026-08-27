import { favorites, likes, users, videos } from '@douyin/db';
import { VIDEO_STATUS } from '@douyin/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);

    const rows = await useDb()
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        blobUrl: videos.blobUrl,
        coverUrl: videos.coverUrl,
        durationMs: videos.durationMs,
        status: videos.status,
        viewCount: videos.viewCount,
        createdAt: videos.createdAt,
        likeCount: sql<number>`(
          select count(*)::int from ${likes} where ${likes.videoId} = ${videos.id}
        )`,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(likes)
      .innerJoin(videos, eq(videos.id, likes.videoId))
      .leftJoin(users, eq(users.id, videos.authorId))
      .where(and(eq(likes.userId, user.id), eq(videos.status, VIDEO_STATUS.APPROVED)))
      .orderBy(desc(likes.createdAt))
      .limit(60);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        blobUrl: row.blobUrl,
        coverUrl: row.coverUrl,
        durationMs: row.durationMs,
        status: row.status,
        viewCount: Number(row.viewCount ?? 0),
        likeCount: Number(row.likeCount ?? 0),
        createdAt: row.createdAt,
        author: {
          id: row.authorId ?? '',
          displayName: row.authorDisplayName ?? '用户',
          avatarUrl: row.authorAvatarUrl ?? null,
        },
      })),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
