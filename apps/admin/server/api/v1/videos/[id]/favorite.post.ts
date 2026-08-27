import { favorites } from '@douyin/db';
import { and, eq } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';
import { readVideoIdParam, requireApprovedVideo } from '~/server/utils/video-api';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const videoId = readVideoIdParam(event);
    await requireApprovedVideo(videoId);

    await useDb()
      .insert(favorites)
      .values({ userId: user.id, videoId })
      .onConflictDoNothing();

    const [favorite] = await useDb()
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.videoId, videoId)))
      .limit(1);

    return { favorited: true, favorite };
  } catch (err) {
    return sendAppError(event, err);
  }
});
