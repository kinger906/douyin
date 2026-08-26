import { likes } from '@douyin/db';
import { defineEventHandler } from 'h3';
import { and, eq } from 'drizzle-orm';
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
      .insert(likes)
      .values({
        userId: user.id,
        videoId,
      })
      .onConflictDoNothing();

    const [like] = await useDb()
      .select()
      .from(likes)
      .where(and(eq(likes.userId, user.id), eq(likes.videoId, videoId)))
      .limit(1);

    return {
      liked: true,
      like,
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
