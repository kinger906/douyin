import { follows, users, videos } from '@douyin/db';
import { count, desc, eq, sql } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const me = await requireUser(event);
    const db = useDb();

    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        followedAt: follows.createdAt,
        works: sql<number>`(
          select count(*)::int from ${videos}
          where ${videos.authorId} = ${users.id}
            and ${videos.status} = 'approved'
        )`,
      })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followingId))
      .where(eq(follows.followerId, me.id))
      .orderBy(desc(follows.createdAt))
      .limit(100);

    const [followingCount] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followerId, me.id));

    const [followerCount] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followingId, me.id));

    return {
      followingCount: Number(followingCount?.value ?? 0),
      followerCount: Number(followerCount?.value ?? 0),
      items: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        followedAt: row.followedAt,
        works: Number(row.works ?? 0),
      })),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
