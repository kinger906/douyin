import { comments, likes, users, videos } from '@douyin/db';
import { AppError, ErrorCode, VIDEO_STATUS } from '@douyin/shared';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { defineEventHandler, getQuery } from 'h3';
import { decodeCursor, encodeCursor } from '~/server/utils/feed-query';
import { getOptionalUser } from '~/server/utils/video-api';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

const FEED_PAGE_SIZE = 10;

export default defineEventHandler(async (event) => {
  try {
    const viewer = await getOptionalUser(event);
    const query = getQuery(event);
    const cursorParam = Array.isArray(query.cursor) ? query.cursor[0] : query.cursor;

    let whereClause = eq(videos.status, VIDEO_STATUS.APPROVED);
    if (cursorParam !== undefined) {
      if (typeof cursorParam !== 'string' || !cursorParam) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid cursor', 400);
      }

      const cursor = decodeCursor(cursorParam);
      whereClause = and(
        whereClause,
        or(
          lt(videos.createdAt, cursor.createdAt),
          and(eq(videos.createdAt, cursor.createdAt), lt(videos.id, cursor.id)),
        ),
      )!;
    }

    const rows = await useDb()
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        blobUrl: videos.blobUrl,
        coverUrl: videos.coverUrl,
        durationMs: videos.durationMs,
        createdAt: videos.createdAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
        likeCount: sql<number>`(
          select count(*)::int
          from ${likes}
          where ${likes.videoId} = ${videos.id}
        )`,
        commentCount: sql<number>`(
          select count(*)::int
          from ${comments}
          where ${comments.videoId} = ${videos.id}
            and ${comments.status} = 'visible'
        )`,
        likedByMe: viewer
          ? sql<boolean>`exists(
              select 1
              from ${likes}
              where ${likes.videoId} = ${videos.id}
                and ${likes.userId} = ${viewer.id}::uuid
            )`
          : sql<boolean>`false`,
      })
      .from(videos)
      .leftJoin(users, eq(users.id, videos.authorId))
      .where(whereClause)
      .orderBy(desc(videos.createdAt), desc(videos.id))
      .limit(FEED_PAGE_SIZE + 1);

    const pageRows = rows.slice(0, FEED_PAGE_SIZE);
    const lastRow = pageRows.at(-1);

    return {
      items: pageRows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        blobUrl: row.blobUrl,
        coverUrl: row.coverUrl,
        durationMs: row.durationMs,
        author: {
          id: row.authorId ?? '',
          displayName: row.authorDisplayName ?? 'Unknown',
          avatarUrl: row.authorAvatarUrl ?? null,
        },
        likeCount: Number(row.likeCount ?? 0),
        commentCount: Number(row.commentCount ?? 0),
        likedByMe: Boolean(row.likedByMe),
      })),
      nextCursor:
        rows.length > FEED_PAGE_SIZE && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid cursor') {
      return sendAppError(event, new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid cursor', 400));
    }

    return sendAppError(event, err);
  }
});
