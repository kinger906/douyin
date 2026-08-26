import { comments, users } from '@douyin/db';
import { and, asc, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';
import { readVideoIdParam, requireApprovedVideo } from '~/server/utils/video-api';

export default defineEventHandler(async (event) => {
  try {
    const videoId = readVideoIdParam(event);
    await requireApprovedVideo(videoId);

    const rows = await useDb()
      .select({
        id: comments.id,
        videoId: comments.videoId,
        userId: comments.userId,
        body: comments.body,
        parentId: comments.parentId,
        status: comments.status,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(and(eq(comments.videoId, videoId), eq(comments.status, 'visible')))
      .orderBy(asc(comments.createdAt), asc(comments.id));

    return {
      items: rows.map((row) => ({
        id: row.id,
        videoId: row.videoId,
        userId: row.userId,
        body: row.body,
        parentId: row.parentId,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        author: {
          id: row.authorId ?? '',
          displayName: row.authorDisplayName ?? 'Unknown',
          avatarUrl: row.authorAvatarUrl ?? null,
        },
      })),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
