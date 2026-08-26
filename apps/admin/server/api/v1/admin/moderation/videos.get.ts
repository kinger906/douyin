import { users, videos } from '@douyin/db';
import { AppError, ErrorCode, VIDEO_STATUS } from '@douyin/shared';
import { desc, eq } from 'drizzle-orm';
import { defineEventHandler, getQuery } from 'h3';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function readLimit(event: Parameters<typeof getQuery>[0]) {
  const query = getQuery(event);
  const rawLimit = Array.isArray(query.limit) ? query.limit[0] : query.limit;

  if (rawLimit === undefined) {
    return DEFAULT_LIMIT;
  }

  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid limit', 400);
  }

  return limit;
}

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);
    const limit = readLimit(event);

    const rows = await useDb()
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        blobUrl: videos.blobUrl,
        coverUrl: videos.coverUrl,
        durationMs: videos.durationMs,
        status: videos.status,
        createdAt: videos.createdAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
      })
      .from(videos)
      .leftJoin(users, eq(users.id, videos.authorId))
      .where(eq(videos.status, VIDEO_STATUS.PENDING))
      .orderBy(desc(videos.createdAt), desc(videos.id))
      .limit(limit);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        blobUrl: row.blobUrl,
        coverUrl: row.coverUrl,
        durationMs: row.durationMs,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        author: {
          id: row.authorId ?? '',
          displayName: row.authorDisplayName ?? 'Unknown',
        },
      })),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
