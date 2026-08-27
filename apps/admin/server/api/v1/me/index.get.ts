import { comments, follows, likes, users, videos } from '@douyin/db';
import { VIDEO_STATUS } from '@douyin/shared';
import { and, count, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const db = useDb();

    const [profile] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const [worksRow] = await db
      .select({ value: count() })
      .from(videos)
      .where(eq(videos.authorId, user.id));

    const [approvedRow] = await db
      .select({ value: count() })
      .from(videos)
      .where(and(eq(videos.authorId, user.id), eq(videos.status, VIDEO_STATUS.APPROVED)));

    const [likesReceivedRow] = await db
      .select({ value: count() })
      .from(likes)
      .innerJoin(videos, eq(videos.id, likes.videoId))
      .where(eq(videos.authorId, user.id));

    const [commentsReceivedRow] = await db
      .select({ value: count() })
      .from(comments)
      .innerJoin(videos, eq(videos.id, comments.videoId))
      .where(and(eq(videos.authorId, user.id), eq(comments.status, 'visible')));

    const [followingRow] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followerId, user.id));

    const [followersRow] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    const id = profile?.id ?? user.id;

    return {
      id,
      email: profile?.email ?? null,
      displayName: profile?.displayName ?? '用户',
      avatarUrl: profile?.avatarUrl ?? null,
      role: profile?.role ?? user.role,
      douyinId: id.replace(/-/g, '').slice(0, 9),
      stats: {
        likesReceived: Number(likesReceivedRow?.value ?? 0),
        commentsReceived: Number(commentsReceivedRow?.value ?? 0),
        works: Number(worksRow?.value ?? 0),
        approvedWorks: Number(approvedRow?.value ?? 0),
        following: Number(followingRow?.value ?? 0),
        followers: Number(followersRow?.value ?? 0),
        mutualFollows: 0,
      },
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
