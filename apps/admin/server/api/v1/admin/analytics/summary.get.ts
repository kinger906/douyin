import { comments, likes, users, videos } from '@douyin/db';
import { VIDEO_STATUS } from '@douyin/shared';
import { eq, sql } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

async function countAll(table: typeof users | typeof videos | typeof likes | typeof comments) {
  const [row] = await useDb()
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(table);

  return Number(row?.count ?? 0);
}

async function countVideosByStatus(status: string) {
  const [row] = await useDb()
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(videos)
    .where(eq(videos.status, status as 'pending' | 'approved' | 'rejected'));

  return Number(row?.count ?? 0);
}

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);

    const [usersCount, videosPending, videosApproved, videosRejected, likesCount, commentsCount] =
      await Promise.all([
        countAll(users),
        countVideosByStatus(VIDEO_STATUS.PENDING),
        countVideosByStatus(VIDEO_STATUS.APPROVED),
        countVideosByStatus(VIDEO_STATUS.REJECTED),
        countAll(likes),
        countAll(comments),
      ]);

    return {
      users: usersCount,
      videosPending,
      videosApproved,
      videosRejected,
      likes: likesCount,
      comments: commentsCount,
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
