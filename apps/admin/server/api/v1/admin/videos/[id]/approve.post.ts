import { moderationLogs, videos } from '@douyin/db';
import { AppError, ErrorCode, VIDEO_STATUS, moderationActionBodySchema } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, readBody } from 'h3';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';
import { readVideoIdParam } from '~/server/utils/video-api';

export default defineEventHandler(async (event) => {
  try {
    const admin = await requireAdmin(event);
    const videoId = readVideoIdParam(event);
    const parsedBody = moderationActionBodySchema.safeParse(await readBody(event));

    if (!parsedBody.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    const [existingVideo] = await useDb()
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!existingVideo) {
      throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found', 404);
    }

    const [updatedVideo] = await useDb()
      .update(videos)
      .set({
        status: VIDEO_STATUS.APPROVED,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning({
        id: videos.id,
        status: videos.status,
      });

    await useDb().insert(moderationLogs).values({
      videoId,
      adminId: admin.id,
      action: 'approve',
      reason: parsedBody.data.reason ?? null,
    });

    return updatedVideo;
  } catch (err) {
    return sendAppError(event, err);
  }
});
