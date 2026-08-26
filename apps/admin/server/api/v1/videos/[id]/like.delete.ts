import { likes } from '@douyin/db';
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
      .delete(likes)
      .where(and(eq(likes.userId, user.id), eq(likes.videoId, videoId)));

    return {
      liked: false,
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
