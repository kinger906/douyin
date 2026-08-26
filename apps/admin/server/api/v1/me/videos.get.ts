import { likes, videos } from '@douyin/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { defineEventHandler, getQuery } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const query = getQuery(event);
    const statusFilter = Array.isArray(query.status) ? query.status[0] : query.status;

    const whereClause =
      typeof statusFilter === 'string' && statusFilter.length > 0
        ? and(eq(videos.authorId, user.id), eq(videos.status, statusFilter as 'pending' | 'approved' | 'rejected'))
        : eq(videos.authorId, user.id);

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
      })
      .from(videos)
      .where(whereClause)
      .orderBy(desc(videos.createdAt), desc(videos.id))
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
      })),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
